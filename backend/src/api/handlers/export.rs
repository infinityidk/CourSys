use crate::api::error::AppError;
use crate::api::extractor::AuthSession;
use axum::{Json, http::StatusCode};
use base64::{Engine as _, engine::general_purpose};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct ExportImageRequest {
    pub data: String,
    pub filename: String,
}

pub async fn export_planner_handler(
    _auth: AuthSession,
    Json(payload): Json<serde_json::Value>,
) -> Result<StatusCode, AppError> {
    let filename = format!("planner-{}.json", chrono::Utc::now().format("%Y-%m-%d"));

    let file = rfd::AsyncFileDialog::new()
        .set_file_name(&filename)
        .add_filter("JSON", &["json"])
        .save_file()
        .await;

    if let Some(file) = file {
        let json_bytes = serde_json::to_vec_pretty(&payload)?;
        tokio::fs::write(file.path(), json_bytes)
            .await
            .map_err(|e| {
                tracing::error!("Failed to write planner file: {e}");
                AppError::with_status(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    anyhow::anyhow!("Write failed"),
                )
            })?;
        tracing::info!("Planner exported to {}", file.path().display());
    }

    Ok(StatusCode::OK)
}

pub async fn export_image_handler(
    _auth: AuthSession,
    Json(payload): Json<ExportImageRequest>,
) -> Result<StatusCode, AppError> {
    let b64 = payload.data.split(',').nth(1).ok_or_else(|| {
        AppError::with_status(
            StatusCode::BAD_REQUEST,
            anyhow::anyhow!("Invalid image data"),
        )
    })?;

    let bytes = general_purpose::STANDARD.decode(b64).map_err(|e| {
        AppError::with_status(
            StatusCode::BAD_REQUEST,
            anyhow::anyhow!("Base64 decode failed: {e}"),
        )
    })?;

    let file = rfd::AsyncFileDialog::new()
        .set_file_name(&payload.filename)
        .add_filter("PNG", &["png"])
        .save_file()
        .await;

    if let Some(file) = file {
        tokio::fs::write(file.path(), &bytes).await.map_err(|e| {
            tracing::error!("Failed to write image file: {e}");
            AppError::with_status(
                StatusCode::INTERNAL_SERVER_ERROR,
                anyhow::anyhow!("Write failed"),
            )
        })?;
        tracing::info!("Image exported to {}", file.path().display());
    }

    Ok(StatusCode::OK)
}
