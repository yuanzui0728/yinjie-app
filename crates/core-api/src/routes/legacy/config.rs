use axum::{extract::State, routing::get, Json, Router};

use crate::{
    app_state::AppState,
    models::{AiModelResponse, AvailableModelsResponse, SuccessResponse, UpdateAiModelRequest},
    seed::AVAILABLE_AI_MODELS,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/ai-model", get(get_ai_model).put(set_ai_model))
        .route("/available-models", get(get_available_models))
}

async fn get_ai_model(State(state): State<AppState>) -> Json<AiModelResponse> {
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    Json(AiModelResponse {
        model: runtime.config.ai_model.clone(),
    })
}

async fn set_ai_model(
    State(state): State<AppState>,
    Json(payload): Json<UpdateAiModelRequest>,
) -> Json<SuccessResponse> {
    let model = payload.model.trim().to_string();
    let provider = {
        let mut runtime = state.runtime.write().expect("runtime lock poisoned");
        runtime.config.ai_model = model.clone();
        runtime.config.provider.model = model.clone();
        runtime.config.provider.clone()
    };

    state
        .inference_gateway
        .configure_provider(provider.to_gateway_provider());
    state.request_persist("config-set-ai-model");

    Json(SuccessResponse { success: true })
}

async fn get_available_models() -> Json<AvailableModelsResponse> {
    Json(AvailableModelsResponse {
        models: AVAILABLE_AI_MODELS
            .iter()
            .map(|model| (*model).to_string())
            .collect(),
    })
}
