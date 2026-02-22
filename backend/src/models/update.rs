use serde::Deserialize;
use ts_rs::TS;

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/UpdateRequest.ts")]
pub struct UpdateRequest {
    pub code: String,
}
