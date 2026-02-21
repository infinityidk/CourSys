use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/UserInfoResponse.ts")]
pub struct UserInfoResponse {
    #[serde(alias = "PYLX")]
    pub level: String,
    #[serde(alias = "NJMC")]
    pub grade: String,
    #[serde(alias = "YXMC")]
    pub department: String,
    #[serde(alias = "ZYMC")]
    pub major: String,
}
