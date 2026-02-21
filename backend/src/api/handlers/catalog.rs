use crate::{
    api::extractor::AuthSession,
    models::catalog::{CatalogRequest, Course},
    services::catalog_service::get_catalog,
    state::AppState,
};
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use std::sync::Arc;

pub async fn catalog_handler(
    State(state): State<Arc<AppState>>,
    auth: AuthSession,
    Query(payload): Query<CatalogRequest>,
) -> Result<Json<Vec<Course>>, StatusCode> {
    let catalog = get_catalog(
        &state,
        &auth.session.tis_cookie,
        &auth.token,
        &payload.semester,
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(catalog))
}
