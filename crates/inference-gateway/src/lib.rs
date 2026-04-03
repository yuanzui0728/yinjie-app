use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Mutex,
};

use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use tokio::sync::Semaphore;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub endpoint: String,
    pub model: String,
    pub api_key: Option<String>,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueMetrics {
    pub queue_depth: usize,
    pub max_concurrency: usize,
    pub in_flight_requests: usize,
    pub total_requests: usize,
    pub successful_requests: usize,
    pub failed_requests: usize,
    pub active_provider: Option<ProviderConfig>,
    pub last_success_at: Option<String>,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderProbeResult {
    pub success: bool,
    pub message: String,
    pub normalized_endpoint: String,
    pub status_code: Option<u16>,
}

#[derive(Default)]
struct GatewayState {
    active_provider: Option<ProviderConfig>,
    last_success_at: Option<String>,
    last_error: Option<String>,
}

pub struct InferenceGateway {
    semaphore: Semaphore,
    max_concurrency: usize,
    queue_depth: AtomicUsize,
    in_flight_requests: AtomicUsize,
    total_requests: AtomicUsize,
    successful_requests: AtomicUsize,
    failed_requests: AtomicUsize,
    state: Mutex<GatewayState>,
    client: reqwest::Client,
}

impl InferenceGateway {
    pub fn new(max_concurrency: usize) -> Self {
        Self {
            semaphore: Semaphore::new(max_concurrency),
            max_concurrency,
            queue_depth: AtomicUsize::new(0),
            in_flight_requests: AtomicUsize::new(0),
            total_requests: AtomicUsize::new(0),
            successful_requests: AtomicUsize::new(0),
            failed_requests: AtomicUsize::new(0),
            state: Mutex::new(GatewayState::default()),
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(8))
                .build()
                .expect("failed to build inference gateway client"),
        }
    }

    pub fn configure_provider(&self, provider: ProviderConfig) {
        let mut state = self.state.lock().expect("inference gateway lock poisoned");
        state.active_provider = Some(normalize_provider(provider));
    }

    pub fn active_provider(&self) -> Option<ProviderConfig> {
        let state = self.state.lock().expect("inference gateway lock poisoned");
        state.active_provider.clone()
    }

    pub fn metrics(&self) -> QueueMetrics {
        let state = self.state.lock().expect("inference gateway lock poisoned");

        QueueMetrics {
            queue_depth: self.queue_depth.load(Ordering::Relaxed),
            max_concurrency: self.max_concurrency,
            in_flight_requests: self.in_flight_requests.load(Ordering::Relaxed),
            total_requests: self.total_requests.load(Ordering::Relaxed),
            successful_requests: self.successful_requests.load(Ordering::Relaxed),
            failed_requests: self.failed_requests.load(Ordering::Relaxed),
            active_provider: state.active_provider.clone(),
            last_success_at: state.last_success_at.clone(),
            last_error: state.last_error.clone(),
        }
    }

    pub async fn probe_provider(
        &self,
        provider: ProviderConfig,
    ) -> Result<ProviderProbeResult, String> {
        let provider = normalize_provider(provider);
        if provider.endpoint.is_empty() {
            return Err("Provider endpoint is required".into());
        }

        self.queue_depth.fetch_add(1, Ordering::Relaxed);
        let permit = self
            .semaphore
            .acquire()
            .await
            .map_err(|_| "Inference queue is shutting down".to_string())?;
        self.queue_depth.fetch_sub(1, Ordering::Relaxed);
        self.in_flight_requests.fetch_add(1, Ordering::Relaxed);
        self.total_requests.fetch_add(1, Ordering::Relaxed);

        let result = self.run_probe(provider.clone()).await;

        self.in_flight_requests.fetch_sub(1, Ordering::Relaxed);
        drop(permit);

        match &result {
            Ok(probe) => {
                self.successful_requests.fetch_add(1, Ordering::Relaxed);
                let mut state = self.state.lock().expect("inference gateway lock poisoned");
                state.last_success_at = Some(now_token());
                state.last_error = None;
                if state.active_provider.is_none() {
                    state.active_provider = Some(provider);
                }
                Ok(probe.clone())
            }
            Err(message) => {
                self.failed_requests.fetch_add(1, Ordering::Relaxed);
                let mut state = self.state.lock().expect("inference gateway lock poisoned");
                state.last_error = Some(message.clone());
                Err(message.clone())
            }
        }
    }

    async fn run_probe(&self, provider: ProviderConfig) -> Result<ProviderProbeResult, String> {
        let request = self
            .client
            .get(&provider.endpoint)
            .header(CONTENT_TYPE, "application/json");

        let request = if let Some(api_key) = provider.api_key.as_ref().filter(|value| !value.is_empty()) {
            request.header(AUTHORIZATION, format!("Bearer {api_key}"))
        } else {
            request
        };

        let response = request
            .send()
            .await
            .map_err(|error| format!("Failed to reach provider endpoint: {error}"))?;

        let status_code = response.status().as_u16();
        let success = response.status().is_success()
            || matches!(status_code, 401 | 403 | 404 | 405);

        if success {
            Ok(ProviderProbeResult {
                success: true,
                message: format!(
                    "Provider endpoint responded with status {} for model {}.",
                    status_code, provider.model
                ),
                normalized_endpoint: provider.endpoint,
                status_code: Some(status_code),
            })
        } else {
            Err(format!(
                "Provider endpoint returned non-compatible status {}.",
                status_code
            ))
        }
    }
}

fn normalize_provider(mut provider: ProviderConfig) -> ProviderConfig {
    provider.endpoint = provider.endpoint.trim().trim_end_matches('/').to_string();
    provider.model = provider.model.trim().to_string();
    provider.mode = provider.mode.trim().to_string();
    provider.api_key = provider
        .api_key
        .and_then(|value| {
            let normalized = value.trim().to_string();
            if normalized.is_empty() {
                None
            } else {
                Some(normalized)
            }
        });
    provider
}

fn now_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis().to_string())
        .unwrap_or_else(|_| "0".into())
}
