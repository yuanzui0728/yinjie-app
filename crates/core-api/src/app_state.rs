use std::{
  collections::HashMap,
  path::PathBuf,
  sync::{Arc, RwLock},
};

use crate::{
  models::{AppConfigStore, CharacterRecord, UserRecord},
  seed::seeded_characters,
};

#[derive(Clone)]
pub struct AppState {
  pub port: u16,
  pub database_path: PathBuf,
  pub runtime: Arc<RwLock<RuntimeState>>,
}

pub struct RuntimeState {
  pub users: HashMap<String, UserRecord>,
  pub characters: HashMap<String, CharacterRecord>,
  pub config: AppConfigStore,
}

impl AppState {
  pub fn new(port: u16, database_path: PathBuf) -> Self {
    Self {
      port,
      database_path,
      runtime: Arc::new(RwLock::new(RuntimeState::seeded())),
    }
  }
}

impl RuntimeState {
  fn seeded() -> Self {
    let characters = seeded_characters()
      .into_iter()
      .map(|character| (character.id.clone(), character))
      .collect();

    Self {
      users: HashMap::new(),
      characters,
      config: AppConfigStore::default(),
    }
  }
}
