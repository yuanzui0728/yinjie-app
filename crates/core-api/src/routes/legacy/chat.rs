use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use tokio::time::sleep;

use crate::{
    app_state::AppState,
    auth_support::{require_any_session_user, require_session_user},
    error::{ApiError, ApiResult},
    generation::generate_chat_reply_text,
    models::{
        AddGroupMemberPayload, ConversationListItemRecord, ConversationRecord, CreateGroupPayload,
        GetOrCreateConversationPayload, GroupMemberRecord, GroupMessageRecord, GroupRecord,
        MessageRecord, SendGroupMessagePayload, UserScopedRequest,
    },
    runtime_paths,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .nest("/conversations", conversations_router())
        .nest("/groups", groups_router())
}

fn conversations_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_conversations).post(get_or_create_conversation))
        .route("/:id/messages", get(get_conversation_messages))
        .route("/:id/read", post(mark_conversation_read))
}

fn groups_router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_group))
        .route("/:id", get(get_group))
        .route(
            "/:id/members",
            get(get_group_members).post(add_group_member),
        )
        .route(
            "/:id/messages",
            get(get_group_messages).post(send_group_message),
        )
}

async fn get_conversations(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<UserScopedRequest>,
) -> ApiResult<Json<Vec<ConversationListItemRecord>>> {
    require_session_user(&headers, &state, &query.user_id)?;
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    let mut items = runtime
        .conversations
        .values()
        .filter(|conversation| conversation.user_id == query.user_id)
        .filter(|conversation| {
            conversation.r#type != "direct"
                || !conversation
                    .participants
                    .iter()
                    .any(|participant| is_character_blocked(&runtime, &query.user_id, participant))
        })
        .map(|conversation| {
            let mut messages = runtime
                .messages
                .get(&conversation.id)
                .cloned()
                .unwrap_or_default();
            messages.sort_by(|left, right| {
                parse_timestamp(&left.created_at).cmp(&parse_timestamp(&right.created_at))
            });
            let last_message = messages
                .iter()
                .max_by_key(|message| parse_timestamp(&message.created_at))
                .cloned();
            let unread_count = messages
                .iter()
                .filter(|message| {
                    message.sender_type == "character"
                        && message.r#type != "system"
                        && match conversation.last_read_at.as_ref() {
                            Some(last_read) => {
                                parse_timestamp(&message.created_at) > parse_timestamp(last_read)
                            }
                            None => true,
                        }
                })
                .count();

            ConversationListItemRecord {
                id: conversation.id.clone(),
                user_id: conversation.user_id.clone(),
                r#type: conversation.r#type.clone(),
                title: conversation.title.clone(),
                participants: conversation.participants.clone(),
                messages: messages.clone(),
                created_at: conversation.created_at.clone(),
                updated_at: conversation.updated_at.clone(),
                last_read_at: conversation.last_read_at.clone(),
                last_message,
                unread_count,
            }
        })
        .collect::<Vec<_>>();

    items.sort_by(|left, right| {
        parse_timestamp(&right.updated_at).cmp(&parse_timestamp(&left.updated_at))
    });
    Ok(Json(items))
}

async fn get_or_create_conversation(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<GetOrCreateConversationPayload>,
) -> ApiResult<Json<ConversationRecord>> {
    require_session_user(&headers, &state, &payload.user_id)?;
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    let conversation_id = format!("{}_{}", payload.user_id, payload.character_id);

    if let Some(existing) = runtime.conversations.get(&conversation_id) {
        return Ok(Json(existing.clone()));
    }

    let character = runtime
        .characters
        .get(&payload.character_id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Character not found"))?;
    if is_character_blocked(&runtime, &payload.user_id, &payload.character_id) {
        return Err(ApiError::conflict(format!("{} is blocked", character.name)));
    }
    let title = character.name.clone();

    let conversation = ConversationRecord {
        id: conversation_id.clone(),
        user_id: payload.user_id,
        r#type: "direct".into(),
        title,
        participants: vec![character.id],
        messages: Vec::new(),
        created_at: now_token(),
        updated_at: now_token(),
        last_read_at: None,
    };

    runtime
        .conversations
        .insert(conversation_id.clone(), conversation.clone());
    runtime.messages.insert(conversation_id, Vec::new());
    drop(runtime);
    state.request_persist("chat-create-conversation");

    Ok(Json(conversation))
}

async fn get_conversation_messages(
    Path(id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<Vec<MessageRecord>>> {
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    let conversation = runtime
        .conversations
        .get(&id)
        .cloned()
        .ok_or_else(|| ApiError::not_found(format!("Conversation {} not found", id)))?;
    let mut messages = runtime.messages.get(&id).cloned().unwrap_or_default();
    if conversation.r#type == "direct"
        && conversation
            .participants
            .iter()
            .any(|participant| is_character_blocked(&runtime, &conversation.user_id, participant))
    {
        return Err(ApiError::conflict("conversation participant is blocked"));
    }
    messages.sort_by(|left, right| {
        parse_timestamp(&left.created_at).cmp(&parse_timestamp(&right.created_at))
    });
    drop(runtime);
    require_session_user(&headers, &state, &conversation.user_id)?;
    Ok(Json(messages))
}

async fn mark_conversation_read(
    Path(id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<StatusCode> {
    let expected_user_id = {
        let runtime = state.runtime.read().expect("runtime lock poisoned");
        runtime
            .conversations
            .get(&id)
            .map(|conversation| conversation.user_id.clone())
            .ok_or_else(|| ApiError::not_found(format!("Conversation {} not found", id)))?
    };
    require_session_user(&headers, &state, &expected_user_id)?;
    {
        let mut runtime = state.runtime.write().expect("runtime lock poisoned");
        let conversation = runtime
            .conversations
            .get_mut(&id)
            .ok_or_else(|| ApiError::not_found(format!("Conversation {} not found", id)))?;

        conversation.last_read_at = Some(now_token());
    }
    state.request_persist("chat-mark-read");

    Ok(StatusCode::OK)
}

async fn create_group(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateGroupPayload>,
) -> ApiResult<Json<GroupRecord>> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(ApiError::bad_request("group name is required"));
    }
    if payload.creator_type == "user" {
        require_session_user(&headers, &state, &payload.creator_id)?;
    }
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    let (creator_name, creator_avatar) = match payload.creator_type.as_str() {
        "user" => {
            let user = runtime
                .users
                .get(&payload.creator_id)
                .ok_or_else(|| ApiError::not_found("Creator not found"))?;
            (Some(user.username.clone()), user.avatar.clone())
        }
        "character" => {
            let character = runtime
                .characters
                .get(&payload.creator_id)
                .ok_or_else(|| ApiError::not_found("Creator not found"))?;
            (Some(character.name.clone()), Some(character.avatar.clone()))
        }
        _ => return Err(ApiError::bad_request("unsupported creator type")),
    };
    let group_id = format!("group_{}", now_token());
    let group = GroupRecord {
        id: group_id.clone(),
        name: name.into(),
        avatar: None,
        creator_id: payload.creator_id.clone(),
        creator_type: payload.creator_type.clone(),
        created_at: now_token(),
    };

    runtime.groups.insert(group_id.clone(), group.clone());

    let mut members = vec![GroupMemberRecord {
        id: format!("member_{}", now_token()),
        group_id: group_id.clone(),
        member_id: payload.creator_id.clone(),
        member_type: payload.creator_type.clone(),
        member_name: creator_name,
        member_avatar: creator_avatar,
        role: "owner".into(),
        joined_at: now_token(),
    }];

    let mut seen_member_ids = members
        .iter()
        .map(|member| member.member_id.clone())
        .collect::<std::collections::HashSet<_>>();
    for member_id in payload.member_ids {
        if !seen_member_ids.insert(member_id.clone()) {
            continue;
        }
        let character = runtime
            .characters
            .get(&member_id)
            .cloned()
            .ok_or_else(|| ApiError::not_found(format!("Character {} not found", member_id)))?;
        members.push(GroupMemberRecord {
            id: format!("member_{}", now_token()),
            group_id: group_id.clone(),
            member_id,
            member_type: "character".into(),
            member_name: Some(character.name),
            member_avatar: Some(character.avatar),
            role: "member".into(),
            joined_at: now_token(),
        });
    }

    runtime.group_members.insert(group_id.clone(), members);
    runtime.group_messages.insert(group_id, Vec::new());
    drop(runtime);
    state.request_persist("chat-create-group");

    Ok(Json(group))
}

async fn get_group(
    Path(id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<GroupRecord>> {
    let group = {
        let runtime = state.runtime.read().expect("runtime lock poisoned");
        runtime
            .groups
            .get(&id)
            .cloned()
            .ok_or_else(|| ApiError::not_found(format!("Group {} not found", id)))?
    };
    ensure_group_user_membership(&headers, &state, &id)?;

    Ok(Json(group))
}

async fn get_group_members(
    Path(id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<Vec<GroupMemberRecord>>> {
    let members = {
        let runtime = state.runtime.read().expect("runtime lock poisoned");
        runtime
            .groups
            .get(&id)
            .cloned()
            .ok_or_else(|| ApiError::not_found(format!("Group {} not found", id)))?;
        runtime.group_members.get(&id).cloned().unwrap_or_default()
    };
    ensure_group_user_membership(&headers, &state, &id)?;
    Ok(Json(members))
}

async fn add_group_member(
    Path(id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<AddGroupMemberPayload>,
) -> ApiResult<Json<GroupMemberRecord>> {
    let _provided_member_profile = (
        payload.member_name.as_deref().map(str::trim),
        payload.member_avatar.as_deref(),
    );
    let group = {
        let runtime = state.runtime.read().expect("runtime lock poisoned");
        runtime
            .groups
            .get(&id)
            .cloned()
            .ok_or_else(|| ApiError::not_found(format!("Group {} not found", id)))?
    };
    ensure_group_owner_access(&headers, &state, &group)?;
    let member = {
        let mut runtime = state.runtime.write().expect("runtime lock poisoned");
        let (member_name, member_avatar) = match payload.member_type.as_str() {
            "user" => {
                let user = runtime
                    .users
                    .get(&payload.member_id)
                    .ok_or_else(|| ApiError::not_found("Group member not found"))?;
                (Some(user.username.clone()), user.avatar.clone())
            }
            "character" => {
                let character = runtime
                    .characters
                    .get(&payload.member_id)
                    .ok_or_else(|| ApiError::not_found("Group member not found"))?;
                (Some(character.name.clone()), Some(character.avatar.clone()))
            }
            _ => return Err(ApiError::bad_request("unsupported member type")),
        };
        let members = runtime.group_members.entry(id.clone()).or_default();

        if let Some(existing) = members
            .iter()
            .find(|member| member.member_id == payload.member_id && member.member_type == payload.member_type)
        {
            return Ok(Json(existing.clone()));
        }

        let member = GroupMemberRecord {
            id: format!("member_{}", now_token()),
            group_id: id,
            member_id: payload.member_id,
            member_type: payload.member_type,
            member_name,
            member_avatar,
            role: "member".into(),
            joined_at: now_token(),
        };

        members.push(member.clone());
        member
    };

    state.request_persist("chat-add-group-member");
    Ok(Json(member))
}

async fn get_group_messages(
    Path(id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Json<Vec<GroupMessageRecord>>> {
    let mut messages = {
        let runtime = state.runtime.read().expect("runtime lock poisoned");
        runtime
            .groups
            .get(&id)
            .cloned()
            .ok_or_else(|| ApiError::not_found(format!("Group {} not found", id)))?;
        runtime.group_messages.get(&id).cloned().unwrap_or_default()
    };
    ensure_group_user_membership(&headers, &state, &id)?;
    messages.sort_by(|left, right| {
        parse_timestamp(&right.created_at).cmp(&parse_timestamp(&left.created_at))
    });
    Ok(Json(messages))
}

async fn send_group_message(
    Path(id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SendGroupMessagePayload>,
) -> ApiResult<Json<GroupMessageRecord>> {
    let _provided_sender_profile = (
        payload.sender_name.as_deref().map(str::trim),
        payload.sender_avatar.as_deref(),
    );
    let text = payload.text.trim().to_string();
    if text.is_empty() {
        return Err(ApiError::bad_request("group message text is required"));
    }
    let should_trigger_ai_replies = payload.sender_type == "user";
    let trigger_text = text.clone();
    if payload.sender_type == "user" {
        require_session_user(&headers, &state, &payload.sender_id)?;
    }
    {
        let runtime = state.runtime.read().expect("runtime lock poisoned");
        let group = runtime
            .groups
            .get(&id)
            .ok_or_else(|| ApiError::not_found(format!("Group {} not found", id)))?;

        let sender_in_group = runtime
            .group_members
            .get(&id)
            .is_some_and(|members| {
                members.iter().any(|member| {
                    member.member_id == payload.sender_id && member.member_type == payload.sender_type
                })
            });

        if !sender_in_group {
            return Err(ApiError::unauthorized(format!(
                "{} is not a member of group {}",
                payload.sender_id, group.id
            )));
        }
    }
    let message = {
        let mut runtime = state.runtime.write().expect("runtime lock poisoned");
        let (sender_name, sender_avatar) = match payload.sender_type.as_str() {
            "user" => {
                let user = runtime
                    .users
                    .get(&payload.sender_id)
                    .ok_or_else(|| ApiError::not_found("Group sender not found"))?;
                (user.username.clone(), user.avatar.clone())
            }
            "character" => {
                let character = runtime
                    .characters
                    .get(&payload.sender_id)
                    .ok_or_else(|| ApiError::not_found("Group sender not found"))?;
                (character.name.clone(), Some(character.avatar.clone()))
            }
            _ => return Err(ApiError::bad_request("unsupported sender type")),
        };
        let messages = runtime.group_messages.entry(id.clone()).or_default();

        let message = GroupMessageRecord {
            id: format!("group_message_{}", now_token()),
            group_id: id.clone(),
            sender_id: payload.sender_id,
            sender_type: payload.sender_type,
            sender_name,
            sender_avatar,
            text,
            r#type: "text".into(),
            created_at: now_token(),
        };

        messages.push(message.clone());
        message
    };

    state.request_persist("chat-send-group-message");
    if should_trigger_ai_replies {
        spawn_group_ai_replies(state.clone(), id, message.sender_name.clone(), trigger_text);
    }
    Ok(Json(message))
}

fn spawn_group_ai_replies(
    state: AppState,
    group_id: String,
    sender_name: String,
    user_text: String,
) {
    let plans = build_group_reply_plans(&state, &group_id, &sender_name, &user_text);

    for plan in plans {
        let state = state.clone();
        let group_id = group_id.clone();
        let sender_name = sender_name.clone();
        let user_text = user_text.clone();
        tokio::spawn(async move {
            sleep(Duration::from_millis(plan.delay_ms)).await;

            let reply_text = generate_chat_reply_text(
                &state,
                &plan.character,
                &plan.conversation,
                &plan.history,
            )
            .await
            .unwrap_or_else(|| fallback_group_reply_text(&plan.character, &sender_name, &user_text));

            {
                let mut runtime = state.runtime.write().expect("runtime lock poisoned");
                let group_still_exists = runtime.groups.contains_key(&group_id);
                let character_still_in_group = runtime
                    .group_members
                    .get(&group_id)
                    .is_some_and(|members| {
                        members.iter().any(|member| {
                            member.member_id == plan.character.id && member.member_type == "character"
                        })
                    });

                if !group_still_exists || !character_still_in_group {
                    return;
                }

                let messages = runtime.group_messages.entry(group_id.clone()).or_default();
                messages.push(GroupMessageRecord {
                    id: format!("group_message_{}", now_token()),
                    group_id: group_id.clone(),
                    sender_id: plan.character.id.clone(),
                    sender_type: "character".into(),
                    sender_name: plan.character.name.clone(),
                    sender_avatar: Some(plan.character.avatar.clone()),
                    text: reply_text,
                    r#type: "text".into(),
                    created_at: now_token(),
                });
            }

            runtime_paths::append_core_api_log(
                &state.database_path,
                "INFO",
                &format!(
                    "group {} generated async reply from {} after user message",
                    group_id, plan.character.id
                ),
            );
            state.append_behavior_log(
                plan.character.id.clone(),
                "comment",
                Some(group_id.clone()),
                Some("group-async-reply".into()),
                Some(json!({
                    "groupId": group_id,
                    "characterName": plan.character.name,
                    "source": "group-reply",
                })),
            );
            state.request_persist("chat-group-ai-reply");
        });
    }
}

fn build_group_reply_plans(
    state: &AppState,
    group_id: &str,
    sender_name: &str,
    user_text: &str,
) -> Vec<GroupReplyPlan> {
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    let Some(group) = runtime.groups.get(group_id) else {
        return Vec::new();
    };

    let character_members = runtime
        .group_members
        .get(group_id)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|member| member.member_type == "character")
        .collect::<Vec<_>>();
    if character_members.is_empty() {
        return Vec::new();
    }

    let participants = character_members
        .iter()
        .map(|member| member.member_id.clone())
        .collect::<Vec<_>>();
    let conversation = ConversationRecord {
        id: group_id.to_string(),
        user_id: group.creator_id.clone(),
        r#type: "group".into(),
        title: group.name.clone(),
        participants,
        messages: Vec::new(),
        created_at: group.created_at.clone(),
        updated_at: now_token(),
        last_read_at: None,
    };
    let history = runtime
        .group_messages
        .get(group_id)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .rev()
        .take(10)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(group_message_to_conversation_message)
        .collect::<Vec<_>>();

    character_members
        .into_iter()
        .filter_map(|member| {
            let character = runtime.characters.get(&member.member_id)?.clone();
            if !should_emit_group_reply(&character, group_id, sender_name, user_text) {
                return None;
            }

            Some(GroupReplyPlan {
                character,
                conversation: conversation.clone(),
                history: history.clone(),
                delay_ms: reply_delay_ms(group_id, &member.member_id, sender_name, user_text),
            })
        })
        .collect()
}

fn group_message_to_conversation_message(message: GroupMessageRecord) -> MessageRecord {
    MessageRecord {
        id: message.id,
        conversation_id: message.group_id,
        sender_type: message.sender_type,
        sender_id: message.sender_id,
        sender_name: message.sender_name,
        r#type: message.r#type,
        text: message.text,
        created_at: message.created_at,
    }
}

fn should_emit_group_reply(
    character: &crate::models::CharacterRecord,
    group_id: &str,
    sender_name: &str,
    user_text: &str,
) -> bool {
    let threshold = match character.activity_frequency.as_str() {
        "high" => 0.7,
        "low" => 0.2,
        _ => 0.4,
    };

    deterministic_roll(&[
        group_id,
        &character.id,
        sender_name,
        user_text,
        &now_token(),
    ]) <= threshold
}

fn deterministic_roll(parts: &[&str]) -> f64 {
    let mut hasher = DefaultHasher::new();
    for part in parts {
        part.hash(&mut hasher);
    }
    (hasher.finish() % 10_000) as f64 / 10_000.0
}

fn reply_delay_ms(group_id: &str, character_id: &str, sender_name: &str, user_text: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    group_id.hash(&mut hasher);
    character_id.hash(&mut hasher);
    sender_name.hash(&mut hasher);
    user_text.hash(&mut hasher);
    5_000 + (hasher.finish() % 25_001)
}

fn fallback_group_reply_text(
    character: &crate::models::CharacterRecord,
    sender_name: &str,
    user_text: &str,
) -> String {
    format!(
        "{}看到{}提到“{}”，也补充了一句自己的看法。",
        character.name, sender_name, user_text
    )
}

#[derive(Clone)]
struct GroupReplyPlan {
    character: crate::models::CharacterRecord,
    conversation: ConversationRecord,
    history: Vec<MessageRecord>,
    delay_ms: u64,
}

fn ensure_group_user_membership(headers: &HeaderMap, state: &AppState, group_id: &str) -> ApiResult<String> {
    let user_id = require_any_session_user(headers, state)?;
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    let is_member = runtime
        .group_members
        .get(group_id)
        .is_some_and(|members| {
            members
                .iter()
                .any(|member| member.member_type == "user" && member.member_id == user_id)
        });

    if !is_member {
        return Err(ApiError::unauthorized(format!(
            "{} is not a member of group {}",
            user_id, group_id
        )));
    }

    Ok(user_id)
}

fn ensure_group_owner_access(headers: &HeaderMap, state: &AppState, group: &GroupRecord) -> ApiResult<String> {
    if group.creator_type != "user" {
        return Err(ApiError::unauthorized("character-owned groups are read-only via legacy API"));
    }

    require_session_user(headers, state, &group.creator_id)
}

fn parse_timestamp(value: &str) -> u128 {
    value.parse::<u128>().unwrap_or_default()
}

fn is_character_blocked(
    runtime: &crate::app_state::RuntimeState,
    user_id: &str,
    character_id: &str,
) -> bool {
    runtime
        .blocked_characters
        .values()
        .any(|item| item.user_id == user_id && item.character_id == character_id)
}

fn now_token() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis().to_string())
        .unwrap_or_else(|_| "0".into())
}
