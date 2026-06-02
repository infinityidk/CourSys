use crate::api::error::AppError;
use crate::{
    api::extractor::AuthSession, models::meta::MetaResponse,
    services::meta_service::get_current_semester, state::AppState,
};
use axum::{Json, extract::State};

pub async fn meta_handler(
    State(state): State<AppState>,
    auth: AuthSession,
) -> Result<Json<MetaResponse>, AppError> {
    let current_semester =
        get_current_semester(&state, &auth.session.tis_cookie, &auth.token).await?;

    Ok(Json(MetaResponse { current_semester }))
}
