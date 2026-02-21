use axum::{
    extract::FromRequestParts,
    http::{StatusCode, header::COOKIE, request::Parts},
};
use std::sync::Arc;

use crate::{models::session::UserSession, state::AppState};

pub struct AuthSession {
    pub token: String,
    pub session: UserSession,
}

impl FromRequestParts<Arc<AppState>> for AuthSession {
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let cookie_header = parts.headers.get(COOKIE).and_then(|h| h.to_str().ok());

        let token = cookie_header
            .unwrap_or("")
            .split(';')
            .find_map(|pair| {
                let parsed = cookie::Cookie::parse(pair).ok()?;
                if parsed.name() == "token" {
                    Some(parsed.value().to_string())
                } else {
                    None
                }
            })
            .ok_or(StatusCode::UNAUTHORIZED)?;

        let session = crate::services::session_manager::get_session(state, &token)
            .await
            .map_err(|_| StatusCode::UNAUTHORIZED)?;

        Ok(AuthSession { token, session })
    }
}
