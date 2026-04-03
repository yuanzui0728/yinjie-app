use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, RwLock},
};

use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
use tokio::sync::mpsc;
use tracing::warn;

use crate::{
    models::{
        AppConfigStore, CharacterRecord, ConversationRecord, FeedCommentRecord,
        FeedInteractionRecord, FeedPostRecord, FriendRequestRecord, FriendshipRecord,
        GroupMemberRecord, GroupMessageRecord, GroupRecord, MessageRecord, MomentCommentRecord,
        MomentLikeRecord, MomentPostRecord, UserRecord, WorldContextRecord,
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
        let (runtime, scheduler) = match persistence::load_persisted_state(&database_path) {
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

        (
            Self {
                port,
                database_path,
                runtime: Arc::new(RwLock::new(runtime)),
                realtime: Arc::new(RwLock::new(RealtimeState::default())),
                realtime_events,
                scheduler: Arc::new(RwLock::new(scheduler)),
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
}
