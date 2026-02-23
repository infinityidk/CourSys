use serde::Deserialize;
use ts_rs::TS;

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/SelectRequest.ts")]
pub struct SelectRequest {
    pub id: String,
    pub coin: i32,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/QuitRequest.ts")]
pub struct QuitRequest {
    pub id: String,
    pub level: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/ModifyRequest.ts")]
pub struct ModifyRequest {
    pub id: String,
    pub coin: i32,
    pub level: String,
}
