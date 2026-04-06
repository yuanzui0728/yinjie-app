use std::time::{SystemTime, UNIX_EPOCH};

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    routing::{get, patch, post},
    Json, Router,
};

use crate::{
    app_state::AppState,
    auth_support::{require_session, require_session_user},
    error::{ApiError, ApiResult},
    models::{
        AuthSession, AuthSessionRecord, AuthSessionSummary, InitUserRequest, LoginRequest,
        RegisterRequest, SuccessResponse,
        UpdateUserRequest, UserRecord,
    },
};

const SESSION_TTL_MS: u128 = 1000_u128 * 60 * 60 * 24 * 30;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/init", post(init_user))
        .route("/sessions", get(list_sessions))
        .route("/sessions/:session_id/revoke", post(revoke_session))
        .route("/logout", post(logout))
        .route("/logout-all", post(logout_all))
        .route("/users/:id/onboarding-complete", patch(complete_onboarding))
        .route("/users/:id", patch(update_user).delete(delete_user))
}

async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> ApiResult<Json<AuthSession>> {
    let username = payload.username.trim();
    let password = payload.password.trim();

    if username.is_empty() || password.is_empty() {
        return Err(ApiError::bad_request("username and password are required"));
    }

    let mut runtime = state.runtime.write().expect("runtime lock poisoned");

    if runtime.users.values().any(|user| user.username == username) {
        return Err(ApiError::conflict("username already exists"));
    }

    let user = UserRecord {
        id: generate_user_id(),
        username: username.into(),
        password_hash: password.into(),
        onboarding_completed: true,
        avatar: None,
        signature: None,
        location_lat: None,
        location_lng: None,
        location_name: None,
        created_at: now_token(),
    };

    runtime.users.insert(user.id.clone(), user.clone());
    drop(runtime);
    let session = create_session(&state, &user);
    state.request_persist("auth-register");

    Ok(Json(session))
}

async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> ApiResult<Json<AuthSession>> {
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    let username = payload.username.trim();
    let password = payload.password.trim();

    let user = runtime
        .users
        .values()
        .find(|user| user.username == username)
        .cloned()
        .ok_or_else(|| ApiError::unauthorized("invalid username or password"))?;

    if user.password_hash != password {
        return Err(ApiError::unauthorized("invalid username or password"));
    }

    drop(runtime);

    Ok(Json(create_session(&state, &user)))
}

async fn init_user(
    State(state): State<AppState>,
    Json(payload): Json<InitUserRequest>,
) -> ApiResult<Json<AuthSession>> {
    let username = payload.username.trim();

    if username.is_empty() {
        return Err(ApiError::bad_request("username is required"));
    }

    let mut runtime = state.runtime.write().expect("runtime lock poisoned");

    if let Some(existing_user) = runtime
        .users
        .values()
        .find(|user| user.username == username)
        .cloned()
    {
        drop(runtime);
        let session = create_session(&state, &existing_user);
        return Ok(Json(session));
    }

    let user = UserRecord {
        id: generate_user_id(),
        username: username.into(),
        password_hash: format!("onboarding_{}", now_token()),
        onboarding_completed: false,
        avatar: None,
        signature: None,
        location_lat: None,
        location_lng: None,
        location_name: None,
        created_at: now_token(),
    };

    runtime.users.insert(user.id.clone(), user.clone());
    drop(runtime);
    let session = create_session(&state, &user);
    state.request_persist("auth-init-user");

    Ok(Json(session))
}

async fn complete_onboarding(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<SuccessResponse>> {
    require_session_user(&headers, &state, &user_id)?;
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    let user = runtime
        .users
        .get_mut(&user_id)
        .ok_or_else(|| ApiError::not_found("user not found"))?;
    user.onboarding_completed = true;
    drop(runtime);
    state.request_persist("auth-complete-onboarding");

    Ok(Json(SuccessResponse { success: true }))
}

async fn list_sessions(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<Vec<AuthSessionSummary>>> {
    let session = require_session(&headers, &state)?;
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    runtime.prune_expired_sessions();

    let mut sessions = runtime
        .auth_sessions
        .values()
        .filter(|existing| existing.user_id == session.user_id)
        .map(|existing| AuthSessionSummary {
            session_id: existing.token.clone(),
            token_label: token_label(&existing.token),
            created_at: existing.created_at.clone(),
            last_seen_at: existing.last_seen_at.clone(),
            expires_at: existing.expires_at.clone(),
            current: existing.token == session.token,
        })
        .collect::<Vec<_>>();
    sessions.sort_by(|left, right| right.last_seen_at.cmp(&left.last_seen_at));

    Ok(Json(sessions))
}

async fn revoke_session(
    Path(session_id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<SuccessResponse>> {
    let session = require_session(&headers, &state)?;

    if session.token == session_id {
        return Err(ApiError::bad_request(
            "current session should use /api/auth/logout",
        ));
    }

    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    let target = runtime
        .auth_sessions
        .get(&session_id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("session not found"))?;

    if target.user_id != session.user_id {
        return Err(ApiError::unauthorized("session user mismatch"));
    }

    runtime.auth_sessions.remove(&session_id);
    drop(runtime);
    state.request_persist("auth-revoke-session");

    Ok(Json(SuccessResponse { success: true }))
}

async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<SuccessResponse>> {
    let session = require_session(&headers, &state)?;
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    runtime.auth_sessions.remove(&session.token);
    drop(runtime);
    state.request_persist("auth-logout");

    Ok(Json(SuccessResponse { success: true }))
}

async fn logout_all(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<SuccessResponse>> {
    let session = require_session(&headers, &state)?;
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    runtime
        .auth_sessions
        .retain(|_, existing| existing.user_id != session.user_id);
    drop(runtime);
    state.request_persist("auth-logout-all");

    Ok(Json(SuccessResponse { success: true }))
}

async fn update_user(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UpdateUserRequest>,
) -> ApiResult<Json<SuccessResponse>> {
    require_session_user(&headers, &state, &user_id)?;
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");

    if let Some(username) = payload.username.as_ref() {
        let normalized = username.trim();

        if normalized.is_empty() {
            return Err(ApiError::bad_request("username cannot be empty"));
        }

        let duplicated = runtime
            .users
            .values()
            .any(|user| user.id != user_id && user.username == normalized);

        if duplicated {
            return Err(ApiError::conflict("username already exists"));
        }
    }

    let user = runtime
        .users
        .get_mut(&user_id)
        .ok_or_else(|| ApiError::not_found("user not found"))?;
    if let Some(username) = payload.username {
        user.username = username.trim().into();
    }
    if let Some(avatar) = payload.avatar {
        let normalized = avatar.trim().to_string();
        user.avatar = if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        };
    }
    if let Some(signature) = payload.signature {
        let normalized = signature.trim().to_string();
        user.signature = if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        };
    }
    drop(runtime);
    state.request_persist("auth-update-user");

    Ok(Json(SuccessResponse { success: true }))
}

async fn delete_user(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<SuccessResponse>> {
    require_session_user(&headers, &state, &user_id)?;
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");

    if runtime.users.remove(&user_id).is_none() {
        return Err(ApiError::not_found("user not found"));
    }

    runtime
        .auth_sessions
        .retain(|_, session| session.user_id != user_id);
    runtime
        .friend_requests
        .retain(|_, request| request.user_id != user_id);
    runtime
        .friendships
        .retain(|_, friendship| friendship.user_id != user_id);
    runtime
        .blocked_characters
        .retain(|_, item| item.user_id != user_id);
    runtime
        .moderation_reports
        .retain(|_, report| report.user_id != user_id);

    let deleted_conversation_ids = runtime
        .conversations
        .values()
        .filter(|conversation| {
            conversation.user_id == user_id
                || conversation
                    .participants
                    .iter()
                    .any(|participant| participant == &user_id)
        })
        .map(|conversation| conversation.id.clone())
        .collect::<Vec<_>>();
    for conversation_id in deleted_conversation_ids {
        runtime.conversations.remove(&conversation_id);
        runtime.messages.remove(&conversation_id);
    }

    let owned_group_ids = runtime
        .groups
        .values()
        .filter(|group| group.creator_id == user_id)
        .map(|group| group.id.clone())
        .collect::<Vec<_>>();

    for group_id in owned_group_ids {
        runtime.groups.remove(&group_id);
        runtime.group_members.remove(&group_id);
        runtime.group_messages.remove(&group_id);
    }

    let affected_group_ids = runtime
        .group_members
        .iter()
        .filter(|(_, members)| members.iter().any(|member| member.member_id == user_id))
        .map(|(group_id, _)| group_id.clone())
        .collect::<Vec<_>>();
    for group_id in affected_group_ids {
        if let Some(members) = runtime.group_members.get_mut(&group_id) {
            members.retain(|member| member.member_id != user_id);
        }
        if let Some(messages) = runtime.group_messages.get_mut(&group_id) {
            messages.retain(|message| !(message.sender_type == "user" && message.sender_id == user_id));
        }
        let should_delete_group = runtime
            .group_members
            .get(&group_id)
            .is_none_or(|members| members.is_empty());
        if should_delete_group {
            runtime.groups.remove(&group_id);
            runtime.group_members.remove(&group_id);
            runtime.group_messages.remove(&group_id);
        }
    }

    let deleted_moment_post_ids = runtime
        .moment_posts
        .values()
        .filter(|post| post.author_id == user_id)
        .map(|post| post.id.clone())
        .collect::<Vec<_>>();
    for post_id in deleted_moment_post_ids {
        runtime.moment_posts.remove(&post_id);
        runtime.moment_comments.remove(&post_id);
        runtime.moment_likes.remove(&post_id);
    }
    for comments in runtime.moment_comments.values_mut() {
        comments.retain(|comment| comment.author_id != user_id);
    }
    for likes in runtime.moment_likes.values_mut() {
        likes.retain(|like| like.author_id != user_id);
    }
    let moment_post_ids = runtime.moment_posts.keys().cloned().collect::<Vec<_>>();
    for post_id in moment_post_ids {
        let comment_count = runtime
            .moment_comments
            .get(&post_id)
            .map(|comments| comments.len())
            .unwrap_or(0);
        let like_count = runtime
            .moment_likes
            .get(&post_id)
            .map(|likes| likes.len())
            .unwrap_or(0);
        if let Some(post) = runtime.moment_posts.get_mut(&post_id) {
            post.comment_count = comment_count;
            post.like_count = like_count;
        }
    }

    let deleted_feed_post_ids = runtime
        .feed_posts
        .values()
        .filter(|post| post.author_id == user_id)
        .map(|post| post.id.clone())
        .collect::<Vec<_>>();
    for post_id in deleted_feed_post_ids {
        runtime.feed_posts.remove(&post_id);
        runtime.feed_comments.remove(&post_id);
        runtime.feed_interactions.retain(|_, interactions| {
            interactions.retain(|interaction| interaction.user_id != user_id && interaction.post_id != post_id);
            !interactions.is_empty()
        });
    }
    for comments in runtime.feed_comments.values_mut() {
        comments.retain(|comment| comment.author_id != user_id);
    }
    runtime.feed_interactions.retain(|_, interactions| {
        interactions.retain(|interaction| interaction.user_id != user_id);
        !interactions.is_empty()
    });
    let feed_post_ids = runtime.feed_posts.keys().cloned().collect::<Vec<_>>();
    for post_id in feed_post_ids {
        let comment_count = runtime
            .feed_comments
            .get(&post_id)
            .map(|comments| comments.len())
            .unwrap_or(0);
        let like_count = runtime
            .feed_interactions
            .get(&post_id)
            .map(|interactions| {
                interactions
                    .iter()
                    .filter(|interaction| interaction.r#type == "like")
                    .count()
            })
            .unwrap_or(0);
        if let Some(post) = runtime.feed_posts.get_mut(&post_id) {
            post.comment_count = comment_count;
            post.like_count = like_count;
        }
    }

    runtime
        .narrative_arcs
        .retain(|_, arc| arc.user_id != user_id);
    drop(runtime);
    state.request_persist("auth-delete-user");

    Ok(Json(SuccessResponse { success: true }))
}

fn create_session(state: &AppState, user: &UserRecord) -> AuthSession {
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    runtime.prune_expired_sessions();

    let created_at = now_millis();
    let token = format!(
        "yj.{}.{}.{}",
        user.id,
        created_at,
        runtime.auth_sessions.len() + 1
    );
    let session_record = AuthSessionRecord {
        token: token.clone(),
        user_id: user.id.clone(),
        created_at: created_at.to_string(),
        last_seen_at: created_at.to_string(),
        expires_at: (created_at + SESSION_TTL_MS).to_string(),
    };

    runtime.auth_sessions.insert(token.clone(), session_record);
    let user_session_count = runtime
        .auth_sessions
        .values()
        .filter(|session| session.user_id == user.id)
        .count();
    if user_session_count > 8 {
        let mut stale_tokens = runtime
            .auth_sessions
            .values()
            .filter(|session| session.user_id == user.id)
            .map(|session| (session.last_seen_at.clone(), session.token.clone()))
            .collect::<Vec<_>>();
        stale_tokens.sort();
        let overflow = user_session_count - 8;
        for (_, token) in stale_tokens.into_iter().take(overflow) {
            runtime.auth_sessions.remove(&token);
        }
    }
    drop(runtime);
    state.request_persist("auth-create-session");

    AuthSession {
        token,
        user_id: user.id.clone(),
        username: user.username.clone(),
        onboarding_completed: user.onboarding_completed,
    }
}

fn generate_user_id() -> String {
    format!("user_{}", now_token())
}

fn token_label(token: &str) -> String {
    let trimmed = token.trim();
    let suffix_start = trimmed.len().saturating_sub(8);
    format!("session-{}", &trimmed[suffix_start..])
}

fn now_token() -> String {
    now_millis().to_string()
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or(0)
}
