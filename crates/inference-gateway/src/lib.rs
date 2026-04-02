use serde::{Deserialize, Serialize};
use tokio::sync::Semaphore;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub endpoint: String,
    pub model: String,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueMetrics {
    pub queue_depth: usize,
    pub max_concurrency: usize,
}

pub struct InferenceGateway {
    semaphore: Semaphore,
    max_concurrency: usize,
    active_provider: Option<ProviderConfig>,
}

impl InferenceGateway {
    pub fn new(max_concurrency: usize) -> Self {
        Self {
            semaphore: Semaphore::new(max_concurrency),
            max_concurrency,
            active_provider: None,
        }
    }

    pub fn configure_provider(&mut self, provider: ProviderConfig) {
        self.active_provider = Some(provider);
    }

    pub fn metrics(&self) -> QueueMetrics {
        QueueMetrics {
            queue_depth: 0,
            max_concurrency: self.max_concurrency,
        }
    }

    pub fn active_provider(&self) -> Option<&ProviderConfig> {
        self.active_provider.as_ref()
    }
}
