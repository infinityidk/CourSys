use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/GradeRequest.ts")]
pub struct GradeRequest {
    pub level: String,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/GradeItem.ts")]
pub struct GradeItem {
    #[serde(rename = "kcdm")]
    pub code: String,
    #[serde(rename = "kcmc")]
    pub name: String,
    #[serde(rename = "zzcj")]
    pub score: String,
    #[serde(rename = "xscj")]
    pub grade: String,
    #[serde(rename = "xnxq")]
    pub semester: String,
    #[serde(rename = "kcxz")]
    pub nature: String,
    #[serde(rename = "kclb")]
    pub category: String,
    #[serde(rename = "xf")]
    pub credits: f64,
    #[serde(rename = "yxmc")]
    pub department: String,
    #[serde(rename = "pm")]
    pub ranking: Option<String>,
    #[serde(rename = "zrs")]
    pub students: String,
}
