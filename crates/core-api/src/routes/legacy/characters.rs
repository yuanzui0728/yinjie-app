use std::time::{SystemTime, UNIX_EPOCH};

use axum::routing::get;
use axum::{
    extract::{Path, State},
    Json, Router,
};

use crate::{
    app_state::AppState,
    error::{ApiError, ApiResult},
    models::{CharacterPatch, CharacterRecord, SuccessResponse},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(find_all).post(create))
        .route("/:id", get(find_one).patch(update).delete(remove))
}

async fn find_all(State(state): State<AppState>) -> Json<Vec<CharacterRecord>> {
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    let mut characters = runtime.characters.values().cloned().collect::<Vec<_>>();
    characters.sort_by(|left, right| left.id.cmp(&right.id));
    Json(characters)
}

async fn find_one(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> ApiResult<Json<CharacterRecord>> {
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    let character = runtime
        .characters
        .get(&id)
        .cloned()
        .ok_or_else(|| ApiError::not_found(format!("Character {} not found", id)))?;

    Ok(Json(character))
}

async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CharacterPatch>,
) -> Json<CharacterRecord> {
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    let id = payload
        .id
        .clone()
        .unwrap_or_else(|| format!("char_{}", now_token()));
    let character = CharacterRecord::from_patch(id, payload);

    runtime
        .characters
        .insert(character.id.clone(), character.clone());
    drop(runtime);
    state.request_persist("characters-create");

    Json(character)
}

async fn update(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<CharacterPatch>,
) -> ApiResult<Json<CharacterRecord>> {
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    let character = runtime
        .characters
        .get_mut(&id)
        .ok_or_else(|| ApiError::not_found(format!("Character {} not found", id)))?;

    character.apply_patch(payload);
    let response = character.clone();

    for request in runtime.friend_requests.values_mut() {
        if request.character_id == response.id {
            request.character_name = response.name.clone();
            request.character_avatar = response.avatar.clone();
        }
    }

    for conversation in runtime.conversations.values_mut() {
        if conversation.r#type == "direct"
            && conversation
                .participants
                .iter()
                .any(|participant| participant == &response.id)
        {
            conversation.title = response.name.clone();
        }
    }

    for members in runtime.group_members.values_mut() {
        for member in members.iter_mut() {
            if member.member_type == "character" && member.member_id == response.id {
                member.member_name = Some(response.name.clone());
                member.member_avatar = Some(response.avatar.clone());
            }
        }
    }

    for messages in runtime.group_messages.values_mut() {
        for message in messages.iter_mut() {
            if message.sender_type == "character" && message.sender_id == response.id {
                message.sender_name = response.name.clone();
                message.sender_avatar = Some(response.avatar.clone());
            }
        }
    }
    for messages in runtime.messages.values_mut() {
        for message in messages.iter_mut() {
            if message.sender_type == "character" && message.sender_id == response.id {
                message.sender_name = response.name.clone();
            }
        }
    }

    for post in runtime.moment_posts.values_mut() {
        if post.author_id == response.id {
            post.author_name = response.name.clone();
            post.author_avatar = response.avatar.clone();
        }
    }
    for comments in runtime.moment_comments.values_mut() {
        for comment in comments.iter_mut() {
            if comment.author_id == response.id {
                comment.author_name = response.name.clone();
                comment.author_avatar = response.avatar.clone();
            }
        }
    }
    for likes in runtime.moment_likes.values_mut() {
        for like in likes.iter_mut() {
            if like.author_id == response.id {
                like.author_name = response.name.clone();
                like.author_avatar = response.avatar.clone();
            }
        }
    }

    for post in runtime.feed_posts.values_mut() {
        if post.author_id == response.id {
            post.author_name = response.name.clone();
            post.author_avatar = response.avatar.clone();
        }
    }
    for comments in runtime.feed_comments.values_mut() {
        for comment in comments.iter_mut() {
            if comment.author_id == response.id {
                comment.author_name = response.name.clone();
                comment.author_avatar = response.avatar.clone();
            }
        }
    }
    drop(runtime);
    state.request_persist("characters-update");

    Ok(Json(response))
}

async fn remove(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> ApiResult<Json<SuccessResponse>> {
    let mut runtime = state.runtime.write().expect("runtime lock poisoned");
    if !runtime.characters.contains_key(&id) {
        return Err(ApiError::not_found(format!("Character {} not found", id)));
    }
    runtime.characters.remove(&id);
    runtime
        .friend_requests
        .retain(|_, request| request.character_id != id);
    runtime
        .friendships
        .retain(|_, friendship| friendship.character_id != id);
    runtime
        .narrative_arcs
        .retain(|_, arc| arc.character_id != id);
    runtime
        .ai_behavior_logs
        .retain(|record| record.character_id != id);

    for character in runtime.characters.values_mut() {
        if let Some(ai_relationships) = character.ai_relationships.as_mut() {
            ai_relationships.retain(|relationship| relationship.character_id != id);
        }
    }

    let removed_moment_post_ids = runtime
        .moment_posts
        .iter()
        .filter(|(_, post)| post.author_id == id)
        .map(|(post_id, _)| post_id.clone())
        .collect::<Vec<_>>();
    runtime.moment_posts.retain(|_, post| post.author_id != id);
    for post_id in &removed_moment_post_ids {
        runtime.moment_comments.remove(post_id);
        runtime.moment_likes.remove(post_id);
    }
    for comments in runtime.moment_comments.values_mut() {
        comments.retain(|comment| comment.author_id != id);
    }
    for likes in runtime.moment_likes.values_mut() {
        likes.retain(|like| like.author_id != id);
    }
    let moment_comment_counts = runtime
        .moment_comments
        .iter()
        .map(|(post_id, comments)| (post_id.clone(), comments.len()))
        .collect::<Vec<_>>();
    let moment_like_counts = runtime
        .moment_likes
        .iter()
        .map(|(post_id, likes)| (post_id.clone(), likes.len()))
        .collect::<Vec<_>>();
    for (post_id, count) in moment_comment_counts {
        if let Some(post) = runtime.moment_posts.get_mut(&post_id) {
            post.comment_count = count;
        }
    }
    for (post_id, count) in moment_like_counts {
        if let Some(post) = runtime.moment_posts.get_mut(&post_id) {
            post.like_count = count;
        }
    }

    let removed_feed_post_ids = runtime
        .feed_posts
        .iter()
        .filter(|(_, post)| post.author_id == id)
        .map(|(post_id, _)| post_id.clone())
        .collect::<Vec<_>>();
    runtime.feed_posts.retain(|_, post| post.author_id != id);
    for post_id in &removed_feed_post_ids {
        runtime.feed_comments.remove(post_id);
        runtime.feed_interactions.remove(post_id);
    }
    for comments in runtime.feed_comments.values_mut() {
        comments.retain(|comment| comment.author_id != id);
    }
    let feed_comment_counts = runtime
        .feed_comments
        .iter()
        .map(|(post_id, comments)| (post_id.clone(), comments.len()))
        .collect::<Vec<_>>();
    for (post_id, count) in feed_comment_counts {
        if let Some(post) = runtime.feed_posts.get_mut(&post_id) {
            post.comment_count = count;
        }
    }

    let conversations_to_remove = runtime
        .conversations
        .iter()
        .filter(|(_, conversation)| {
            conversation.r#type == "direct" && conversation.participants.iter().any(|participant| participant == &id)
        })
        .map(|(conversation_id, _)| conversation_id.clone())
        .collect::<Vec<_>>();
    for conversation_id in conversations_to_remove {
        runtime.conversations.remove(&conversation_id);
        runtime.messages.remove(&conversation_id);
    }
    for conversation in runtime.conversations.values_mut() {
        conversation.participants.retain(|participant| participant != &id);
    }
    for messages in runtime.messages.values_mut() {
        messages.retain(|message| !(message.sender_type == "character" && message.sender_id == id));
    }

    let removed_creator_group_ids = runtime
        .groups
        .iter()
        .filter(|(_, group)| group.creator_type == "character" && group.creator_id == id)
        .map(|(group_id, _)| group_id.clone())
        .collect::<Vec<_>>();

    let group_ids_to_remove = {
        for members in runtime.group_members.values_mut() {
            members.retain(|member| !(member.member_type == "character" && member.member_id == id));
        }
        for messages in runtime.group_messages.values_mut() {
            messages.retain(|message| !(message.sender_type == "character" && message.sender_id == id));
        }

        let mut group_ids = runtime
            .groups
            .iter()
            .filter(|(group_id, _)| {
                runtime
                    .group_members
                    .get(*group_id)
                    .is_none_or(|members| members.is_empty())
            })
            .map(|(group_id, _)| group_id.clone())
            .collect::<Vec<_>>();

        for group_id in removed_creator_group_ids {
            if !group_ids.contains(&group_id) {
                group_ids.push(group_id);
            }
        }

        group_ids
    };
    for group_id in group_ids_to_remove {
        runtime.groups.remove(&group_id);
        runtime.group_members.remove(&group_id);
        runtime.group_messages.remove(&group_id);
    }
    drop(runtime);
    state.request_persist("characters-remove");
    Ok(Json(SuccessResponse { success: true }))
}

fn now_token() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis().to_string())
        .unwrap_or_else(|_| "0".into())
}
