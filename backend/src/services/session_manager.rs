use crate::models::session::UserSession;
use crate::state::AppState;
use redis::AsyncCommands;
use std::sync::Arc;
use uuid::Uuid;

pub async fn get_session(state: &Arc<AppState>, token: &str) -> Result<UserSession, anyhow::Error> {
    let mut valkey_conn = state.valkey_pool.clone();
    let session_json: Option<String> = valkey_conn.get(token).await?;

    let session_json = session_json.ok_or_else(|| anyhow::anyhow!("Session not found"))?;
    let session: UserSession = serde_json::from_str(&session_json)?;

    Ok(session)
}

pub async fn create_session(
    state: &Arc<AppState>,
    session: UserSession,
) -> Result<String, anyhow::Error> {
    let my_token = Uuid::new_v4().to_string();
    let session_json = serde_json::to_string(&session)?;

    let mut valkey_conn = state.valkey_pool.clone();
    let _: () = valkey_conn.set_ex(&my_token, session_json, 28800).await?;

    Ok(my_token)
}

pub async fn renew_session_ttl(state: &Arc<AppState>, token: &str) -> Result<(), anyhow::Error> {
    let mut valkey_conn = state.valkey_pool.clone();
    let _: () = valkey_conn.expire(token, 28800).await?;

    Ok(())
}

pub async fn delete_session(state: &Arc<AppState>, token: &str) -> Result<(), anyhow::Error> {
    let mut valkey_conn = state.valkey_pool.clone();
    let _: () = valkey_conn.del(token).await.unwrap_or(());
    Ok(())
}
