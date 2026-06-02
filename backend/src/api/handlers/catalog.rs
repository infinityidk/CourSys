use crate::api::error::AppError;
use crate::{
    api::extractor::AuthSession,
    models::catalog::CatalogRequest,
    services::{catalog_service::get_catalog, meta_service::get_current_semester},
    state::AppState,
};
use axum::{
    extract::{Query, State},
    response::IntoResponse,
};
use reqwest::header;

pub async fn catalog_handler(
    State(state): State<AppState>,
    auth: AuthSession,
    Query(payload): Query<CatalogRequest>,
) -> Result<impl IntoResponse, AppError> {
    let _ = get_current_semester(&state, &auth.session.tis_cookie, &auth.token).await?;
    let compress = get_catalog(
        &state,
        &auth.session.tis_cookie,
        &auth.token,
        &payload.semester,
    )
    .await?;

    let headers = [
        (header::CONTENT_TYPE, "application/json"),
        (header::CONTENT_ENCODING, "br"),
    ];

    Ok((headers, compress))
}
