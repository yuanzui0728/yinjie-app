use axum::http::HeaderMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{
    app_state::AppState,
    error::{ApiError, ApiResult},
};

pub struct SessionPrincipal {
    pub token: String,
    pub user_id: String,
}

pub fn require_session_user(
    headers: &HeaderMap,
    state: &AppState,
    expected_user_id: &str,
) -> ApiResult<String> {
    let user_id = require_any_session_user(headers, state)?;

    if user_id != expected_user_id {
        return Err(ApiError::unauthorized("session user mismatch"));
    }

    Ok(user_id)
}

pub fn require_session_token_user(
    state: &AppState,
    token: &str,
    expected_user_id: &str,
) -> ApiResult<String> {
    let principal = require_session_token(state, token)?;

    if principal.user_id != expected_user_id {
        return Err(ApiError::unauthorized("session user mismatch"));
    }

    Ok(principal.user_id)
}

pub fn require_any_session_user(headers: &HeaderMap, state: &AppState) -> ApiResult<String> {
    Ok(require_session(headers, state)?.user_id)
}

pub fn require_session(headers: &HeaderMap, state: &AppState) -> ApiResult<SessionPrincipal> {
    let token = extract_bearer_token(headers)?;
    require_session_token(state, &token)
}

pub fn require_session_token(state: &AppState, token: &str) -> ApiResult<SessionPrincipal> {
    let normalized = token.trim();
    if normalized.is_empty() {
        return Err(ApiError::unauthorized("invalid session token"));
    }

    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    runtime.prune_expired_sessions();

    let session = runtime
        .auth_sessions
        .get_mut(normalized)
        .ok_or_else(|| ApiError::unauthorized("invalid session token"))?;

    session.last_seen_at = now_token();
    let user_id = session.user_id.clone();

    if !runtime.users.contains_key(&user_id) {
        return Err(ApiError::unauthorized("session user not found"));
    }

    Ok(SessionPrincipal {
        token: normalized.to_string(),
        user_id,
    })
}

fn extract_bearer_token(headers: &HeaderMap) -> ApiResult<String> {
    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| ApiError::unauthorized("missing authorization header"))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| ApiError::unauthorized("invalid authorization scheme"))?;

    let normalized = token.trim();
    if normalized.is_empty() {
        return Err(ApiError::unauthorized("invalid session token"));
    }

    Ok(normalized.to_string())
}

fn now_token() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis().to_string())
        .unwrap_or_else(|_| "0".into())
}
