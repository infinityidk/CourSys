use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};
use axum_extra::extract::cookie::CookieJar;

use crate::{models::session::UserSession, state::AppState};

pub struct AuthSession {
    pub token: String,
    pub session: UserSession,
}

impl FromRequestParts<AppState> for AuthSession {
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let jar = CookieJar::from_headers(&parts.headers);
        let token = jar
            .get("token")
            .map(|c| c.value().to_string())
            .ok_or(StatusCode::UNAUTHORIZED)?;

        let session = crate::services::session_manager::get_session(state, &token)
            .map_err(|_| StatusCode::UNAUTHORIZED)?;

        Ok(Self { token, session })
    }
}
