use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/UserInfoResponse.ts")]
pub struct UserInfoResponse {
    #[serde(rename = "PYLX")]
    pub level: String,
    #[serde(rename = "NJMC")]
    pub grade: String,
    #[serde(rename = "YXMC")]
    pub department: String,
    #[serde(rename = "ZYMC")]
    pub major: String,
}
