use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Deserialize)]
pub struct UserInfoRequest {
    #[serde(rename = "PYLX")]
    pub level: String,
    #[serde(rename = "NJMC")]
    pub grade: String,
    #[serde(rename = "YXMC")]
    pub department: String,
    #[serde(rename = "ZYMC")]
    pub major: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/UserInfoResponse.ts")]
pub struct UserInfoResponse {
    pub level: String,
    pub grade: String,
    pub department: String,
    pub major: String,
}
