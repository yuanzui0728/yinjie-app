use axum::Router;

use crate::app_state::AppState;

pub mod auth;
pub mod characters;
pub mod config;

pub fn router() -> Router<AppState> {
  Router::new()
    .nest("/auth", auth::router())
    .nest("/characters", characters::router())
    .nest("/config", config::router())
}
