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

pub fn create_session(state: &AppState, session: UserSession) -> Result<String, anyhow::Error> {
    let token = Uuid::new_v4().to_string();
    state.session_store.insert(
        token.clone(),
        (Instant::now() + Duration::from_secs(28800), session),
    );
    Ok(token)
}

pub fn renew_session_ttl(state: &AppState, token: &str) -> Result<(), anyhow::Error> {
    let mut entry = state
        .session_store
        .get_mut(token)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;
    entry.0 = Instant::now() + Duration::from_secs(28800);
    Ok(())
}

pub fn delete_session(state: &AppState, token: &str) -> Result<(), anyhow::Error> {
    state.session_store.remove(token);
    Ok(())
}
