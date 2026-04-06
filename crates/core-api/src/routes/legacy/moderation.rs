use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};

use crate::{
    app_state::AppState,
    auth_support::require_session_user,
    error::{ApiError, ApiResult},
    models::{CreateModerationReportPayload, ModerationReportRecord, UserScopedRequest},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/reports", get(list_reports))
        .route("/reports", post(create_report))
}

async fn list_reports(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<UserScopedRequest>,
) -> ApiResult<Json<Vec<ModerationReportRecord>>> {
    require_session_user(&headers, &state, &query.user_id)?;
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    let mut reports = runtime
        .moderation_reports
        .values()
        .filter(|report| report.user_id == query.user_id)
        .cloned()
        .collect::<Vec<_>>();

    reports.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    Ok(Json(reports))
}

async fn create_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateModerationReportPayload>,
) -> ApiResult<Json<ModerationReportRecord>> {
    require_session_user(&headers, &state, &payload.user_id)?;
    let target_type = payload.target_type.trim();
    let target_id = payload.target_id.trim();
    let reason = payload.reason.trim();

    if target_type.is_empty() || target_id.is_empty() || reason.is_empty() {
      return Err(ApiError::bad_request("targetType, targetId and reason are required"));
    }

    let valid_target = matches!(
        target_type,
        "character" | "message" | "moment" | "feedPost" | "comment"
    );
    if !valid_target {
        return Err(ApiError::bad_request("unsupported moderation target type"));
    }

    {
        let runtime = state.runtime.read().expect("runtime lock poisoned");
        let target_exists = match target_type {
            "character" => runtime.characters.contains_key(target_id),
            "message" => {
                runtime
                    .messages
                    .values()
                    .any(|messages| messages.iter().any(|message| message.id == target_id))
                    || runtime
                        .group_messages
                        .values()
                        .any(|messages| messages.iter().any(|message| message.id == target_id))
            }
            "moment" => runtime.moment_posts.contains_key(target_id),
            "feedPost" => runtime.feed_posts.contains_key(target_id),
            "comment" => {
                runtime
                    .moment_comments
                    .values()
                    .any(|comments| comments.iter().any(|comment| comment.id == target_id))
                    || runtime
                        .feed_comments
                        .values()
                        .any(|comments| comments.iter().any(|comment| comment.id == target_id))
            }
            _ => false,
        };

        if !target_exists {
            return Err(ApiError::not_found(format!(
                "moderation target {}:{} not found",
                target_type, target_id
            )));
        }
    }

    let details = payload
        .details
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    let record = ModerationReportRecord {
        id: format!("report_{}", now_token()),
        user_id: payload.user_id,
        target_type: target_type.to_string(),
        target_id: target_id.to_string(),
        reason: reason.to_string(),
        details,
        status: "open".into(),
        created_at: now_token(),
    };

    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    runtime
        .moderation_reports
        .insert(record.id.clone(), record.clone());
    drop(runtime);
    state.request_persist("moderation-create-report");

    Ok(Json(record))
}

fn now_token() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_millis().to_string())
        .unwrap_or_else(|_| "0".into())
}
