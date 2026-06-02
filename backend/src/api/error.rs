use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

pub struct AppError {
    status: StatusCode,
    error: anyhow::Error,
}

impl AppError {
    pub fn with_status(status: StatusCode, error: impl Into<anyhow::Error>) -> Self {
        Self {
            status,
            error: error.into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let error_detail = format!("{:#}", self.error);
        if self.status.is_server_error() {
            tracing::error!(
                status = %self.status,
                error = %error_detail,
                "Internal server error"
            );
            (self.status, "Internal Server Error").into_response()
        } else {
            tracing::warn!(
                status = %self.status,
                error = %error_detail,
                "Client error"
            );
            (self.status, error_detail).into_response()
        }
    }
}

impl<E> From<E> for AppError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            error: err.into(),
        }
    }
}
