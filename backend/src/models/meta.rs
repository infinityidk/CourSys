use serde::Serialize;
use ts_rs::TS;

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/MetaResponse.ts")]
pub struct MetaResponse {
    pub current_semester: String,
}
