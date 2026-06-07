use std::time::{Duration, Instant};

use crate::models::session::UserSession;
use crate::state::AppState;
use uuid::Uuid;

pub fn get_session(state: &AppState, token: &str) -> Result<UserSession, anyhow::Error> {
    state
        .session_store
        .get(token)
        .filter(|r| r.0 > Instant::now())
        .map(|r| r.1.clone())
        .ok_or_else(|| {
            state.session_store.remove(token);
            anyhow::anyhow!("Session not found or expired")
        })
}

pub fn create_session(state: &AppState, session: UserSession) -> String {
    let token = Uuid::new_v4().to_string();
    state.session_store.insert(
        token.clone(),
        (Instant::now() + Duration::from_hours(8), session),
    );
    token
}

pub fn renew_session_ttl(state: &AppState, token: &str) -> Result<(), anyhow::Error> {
    let mut entry = state
        .session_store
        .get_mut(token)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;
    entry.0 = Instant::now() + Duration::from_hours(8);
    Ok(())
}

pub fn delete_session(state: &AppState, token: &str) {
    state.session_store.remove(token);
}
