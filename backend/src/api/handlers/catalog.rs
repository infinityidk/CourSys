use crate::{
    api::extractor::AuthSession,
    models::catalog::CatalogRequest,
    services::{catalog_service::get_catalog, meta_service::get_current_semester},
    state::AppState,
};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use reqwest::header;
use std::sync::Arc;

pub async fn catalog_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
    Query(payload): Query<CatalogRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let _ = get_current_semester(&state, &auth.session.tis_cookie, &auth.token)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let compress = get_catalog(
        &state,
        &auth.session.tis_cookie,
        &auth.token,
        &payload.semester,
    )
    .await
    .map_err(|e| {
        tracing::error!("Catalog fetch failed: {:#}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let headers = [
        (header::CONTENT_TYPE, "application/json"),
        (header::CONTENT_ENCODING, "br"),
    ];

    Ok((headers, compress))
}
