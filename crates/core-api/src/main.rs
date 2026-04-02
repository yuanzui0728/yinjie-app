use std::{net::SocketAddr, path::PathBuf};

use anyhow::Context;
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;

#[derive(Clone)]
struct AppState {
    port: u16,
    database_path: PathBuf,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceHealth {
    name: String,
    healthy: bool,
    version: String,
    message: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseStatus {
    path: String,
    wal_enabled: bool,
    connected: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InferenceStatus {
    healthy: bool,
    active_provider: Option<String>,
    queue_depth: u32,
    max_concurrency: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemStatus {
    core_api: ServiceHealth,
    desktop_shell: ServiceHealth,
    database: DatabaseStatus,
    inference_gateway: InferenceStatus,
    app_mode: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderTestRequest {
    endpoint: String,
    model: String,
    api_key: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderTestResult {
    success: bool,
    message: String,
    normalized_endpoint: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OperationResult {
    success: bool,
    message: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let port = std::env::var("YINJIE_CORE_API_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(39091);

    let database_path = std::env::var("YINJIE_DATABASE_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./runtime-data/yinjie.sqlite"));

    let state = AppState { port, database_path };

    let router = Router::new()
        .route("/health", get(health))
        .route("/system/status", get(system_status))
        .route("/system/provider/test", post(provider_test))
        .route("/system/logs", get(log_index))
        .route("/system/diag/export", post(export_diag))
        .route("/system/backup/create", post(create_backup))
        .route("/system/backup/restore", post(restore_backup))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let address = SocketAddr::from(([127, 0, 0, 1], port));
    info!("starting yinjie-core-api on {}", address);

    let listener = tokio::net::TcpListener::bind(address)
        .await
        .with_context(|| format!("failed to bind core api on {address}"))?;

    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("core api server error")?;

    Ok(())
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

async fn system_status(State(state): State<AppState>) -> Json<SystemStatus> {
    Json(SystemStatus {
        core_api: ServiceHealth {
            name: "yinjie-core-api".into(),
            healthy: true,
            version: env!("CARGO_PKG_VERSION").into(),
            message: Some(format!(
                "Phase 1 skeleton online on 127.0.0.1:{}; legacy /api parity migration pending.",
                state.port
            )),
        },
        desktop_shell: ServiceHealth {
            name: "yinjie-desktop".into(),
            healthy: false,
            version: "0.1.0".into(),
            message: Some("Desktop shell scaffolded; Rust toolchain is required for runtime validation.".into()),
        },
        database: DatabaseStatus {
            path: state.database_path.display().to_string(),
            wal_enabled: true,
            connected: false,
        },
        inference_gateway: InferenceStatus {
            healthy: false,
            active_provider: None,
            queue_depth: 0,
            max_concurrency: 4,
        },
        app_mode: std::env::var("YINJIE_APP_MODE").unwrap_or_else(|_| "development".into()),
    })
}

async fn provider_test(Json(payload): Json<ProviderTestRequest>) -> Json<ProviderTestResult> {
    let normalized = payload.endpoint.trim().trim_end_matches('/').to_string();
    let success = normalized.starts_with("http://") || normalized.starts_with("https://");
    let auth_mode = if payload.api_key.as_deref().unwrap_or_default().is_empty() {
        "no key provided"
    } else {
        "key provided"
    };

    Json(ProviderTestResult {
        success,
        message: if success {
            format!(
                "Provider endpoint accepted for phase-2 migration. model={}, auth={}",
                payload.model, auth_mode
            )
        } else {
            "Endpoint must start with http:// or https://".into()
        },
        normalized_endpoint: Some(normalized),
    })
}

async fn log_index() -> Json<Vec<String>> {
    Json(vec![
        "runtime/logs/core-api.log".into(),
        "runtime/logs/inference-gateway.log".into(),
        "runtime/logs/desktop-shell.log".into(),
    ])
}

async fn export_diag() -> Json<OperationResult> {
    Json(OperationResult {
        success: true,
        message: "Diagnostics export scaffolded. Archive generation will be wired in phase 5.".into(),
    })
}

async fn create_backup() -> Json<OperationResult> {
    Json(OperationResult {
        success: true,
        message: "Backup workflow scaffolded. SQLite snapshot pipeline will be added during production hardening.".into(),
    })
}

async fn restore_backup() -> Json<OperationResult> {
    Json(OperationResult {
        success: true,
        message: "Restore workflow scaffolded. User-facing recovery guardrails will be added before release.".into(),
    })
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

fn init_tracing() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "info,tower_http=info".into());

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .compact()
        .init();
}
