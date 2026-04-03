use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, RwLock},
};

use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
use tokio::sync::mpsc;
use tracing::warn;
use yinjie_inference_gateway::{InferenceGateway, ProviderConfig as GatewayProviderConfig};

use crate::{
    models::{
        AppConfigStore, CharacterRecord, ConversationRecord, FeedCommentRecord,
        FeedInteractionRecord, FeedPostRecord, FriendRequestRecord, FriendshipRecord,
        GroupMemberRecord, GroupMessageRecord, GroupRecord, MessageRecord, MomentCommentRecord,
        MomentLikeRecord, MomentPostRecord, ProviderConfigRecord, UserRecord, WorldContextRecord,
    },
    persistence,
    seed::{seeded_characters, seeded_feed_stream, seeded_moments, seeded_world_context},
};

#[derive(Clone)]
pub struct AppState {
    pub port: u16,
    pub database_path: PathBuf,
    pub runtime: Arc<RwLock<RuntimeState>>,
    pub realtime: Arc<RwLock<RealtimeState>>,
    pub realtime_events: broadcast::Sender<RealtimeCommand>,
    pub scheduler: Arc<RwLock<SchedulerState>>,
    pub inference_gateway: Arc<InferenceGateway>,
    persistence: mpsc::UnboundedSender<PersistenceCommand>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RuntimeState {
    pub users: HashMap<String, UserRecord>,
    pub characters: HashMap<String, CharacterRecord>,
    pub conversations: HashMap<String, ConversationRecord>,
    pub messages: HashMap<String, Vec<MessageRecord>>,
    pub groups: HashMap<String, GroupRecord>,
    pub group_members: HashMap<String, Vec<GroupMemberRecord>>,
    pub group_messages: HashMap<String, Vec<GroupMessageRecord>>,
    pub moment_posts: HashMap<String, MomentPostRecord>,
    pub moment_comments: HashMap<String, Vec<MomentCommentRecord>>,
    pub moment_likes: HashMap<String, Vec<MomentLikeRecord>>,
    pub feed_posts: HashMap<String, FeedPostRecord>,
    pub feed_comments: HashMap<String, Vec<FeedCommentRecord>>,
    pub feed_interactions: HashMap<String, Vec<FeedInteractionRecord>>,
    pub friend_requests: HashMap<String, FriendRequestRecord>,
    pub friendships: HashMap<String, FriendshipRecord>,
    pub world_contexts: Vec<WorldContextRecord>,
    pub config: AppConfigStore,
}

#[derive(Default)]
pub struct RealtimeState {
    pub connected_clients: usize,
    pub room_subscribers: HashMap<String, usize>,
    pub recent_events: Vec<String>,
    pub last_event_at: Option<String>,
    pub last_message_at: Option<String>,
}

#[derive(Clone, Default, Serialize, Deserialize)]
pub struct SchedulerJobRuntimeState {
    pub run_count: usize,
    pub running: bool,
    pub last_run_at: Option<String>,
    pub last_duration_ms: Option<u64>,
    pub last_result: Option<String>,
}

#[derive(Clone, Default, Serialize, Deserialize)]
pub struct SchedulerState {
    pub mode: String,
    pub started_at: Option<String>,
    pub recent_runs: Vec<String>,
    pub jobs: HashMap<String, SchedulerJobRuntimeState>,
}

#[derive(Clone)]
pub enum RealtimeCommand {
    EmitConversationMessage {
        conversation_id: String,
        message: MessageRecord,
        source: String,
    },
}

#[derive(Clone)]
pub struct PersistenceCommand {
    pub reason: String,
}

impl AppState {
    pub fn new(
        port: u16,
        database_path: PathBuf,
    ) -> (Self, mpsc::UnboundedReceiver<PersistenceCommand>) {
        let (realtime_events, _) = broadcast::channel(64);
        let (persistence, persistence_receiver) = mpsc::unbounded_channel();
        let (mut runtime, scheduler) = match persistence::load_persisted_state(&database_path) {
            Ok(Some((runtime, scheduler))) => (runtime, scheduler),
            Ok(None) => (
                RuntimeState::seeded(),
                SchedulerState {
                    mode: "scaffolded".into(),
                    ..SchedulerState::default()
                },
            ),
            Err(error) => {
                warn!("failed to load runtime snapshot: {}", error);
                (
                    RuntimeState::seeded(),
                    SchedulerState {
                        mode: "scaffolded".into(),
                        ..SchedulerState::default()
                    },
                )
            }
        };
        runtime.normalize_config();
        let inference_gateway = Arc::new(InferenceGateway::new(4));
        inference_gateway.configure_provider(runtime.config.provider.to_gateway_provider());

        (
            Self {
                port,
                database_path,
                runtime: Arc::new(RwLock::new(runtime)),
                realtime: Arc::new(RwLock::new(RealtimeState::default())),
                realtime_events,
                scheduler: Arc::new(RwLock::new(scheduler)),
                inference_gateway,
                persistence,
            },
            persistence_receiver,
        )
    }

    pub fn request_persist(&self, reason: impl Into<String>) {
        let _ = self.persistence.send(PersistenceCommand {
            reason: reason.into(),
        });
    }
}

impl RuntimeState {
    fn seeded() -> Self {
        let seeded_characters = seeded_characters();
        let (moment_posts, moment_comments, moment_likes) = seeded_moments(&seeded_characters);
        let (feed_posts, feed_comments, feed_interactions) = seeded_feed_stream(&seeded_characters);

        let characters = seeded_characters
            .into_iter()
            .map(|character| (character.id.clone(), character))
            .collect();

        Self {
            users: HashMap::new(),
            characters,
            conversations: HashMap::new(),
            messages: HashMap::new(),
            groups: HashMap::new(),
            group_members: HashMap::new(),
            group_messages: HashMap::new(),
            moment_posts,
            moment_comments,
            moment_likes,
            feed_posts,
            feed_comments,
            feed_interactions,
            friend_requests: HashMap::new(),
            friendships: HashMap::new(),
            world_contexts: vec![seeded_world_context()],
            config: AppConfigStore::default(),
        }
    }

    fn normalize_config(&mut self) {
        let default_provider = ProviderConfigRecord::default();
        let resolved_model = if self.config.ai_model.trim().is_empty() {
            self.config.provider.model.trim().to_string()
        } else {
            self.config.ai_model.trim().to_string()
        };

        self.config.provider.endpoint = normalize_or_default(
            &self.config.provider.endpoint,
            &default_provider.endpoint,
        );
        self.config.provider.mode =
            normalize_or_default(&self.config.provider.mode, &default_provider.mode);
        self.config.provider.model = if resolved_model.is_empty() {
            default_provider.model.clone()
        } else {
            resolved_model.clone()
        };
        self.config.ai_model = self.config.provider.model.clone();

        self.config.provider.api_key = self.config.provider.api_key.take().and_then(|value| {
            let normalized = value.trim().to_string();
            if normalized.is_empty() {
                None
            } else {
                Some(normalized)
            }
        });
    }
}

impl ProviderConfigRecord {
    pub fn to_gateway_provider(&self) -> GatewayProviderConfig {
        GatewayProviderConfig {
            endpoint: self.endpoint.clone(),
            model: self.model.clone(),
            api_key: self.api_key.clone(),
            mode: self.mode.clone(),
        }
    }
}

fn normalize_or_default(value: &str, fallback: &str) -> String {
    let normalized = value.trim();
    if normalized.is_empty() {
        fallback.to_string()
    } else {
        normalized.to_string()
    }
}
