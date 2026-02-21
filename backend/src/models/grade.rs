use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Deserialize)]
pub struct GradeRequest {
    pub level: String,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/GradeItem.ts")]
pub struct GradeItem {
    #[serde(alias = "kcdm")]
    pub code: String,
    #[serde(alias = "kcmc")]
    pub name: String,
    #[serde(alias = "zzcj")]
    pub score: String,
    #[serde(alias = "xscj")]
    pub grade: String,
    #[serde(alias = "xnxq")]
    pub semester: String,
    #[serde(alias = "kcxz")]
    pub nature: String,
    #[serde(alias = "kclb")]
    pub category: String,
    #[serde(alias = "xf")]
    pub credits: f64,
    #[serde(alias = "yxmc")]
    pub department: String,
    #[serde(alias = "pm")]
    pub ranking: Option<String>,
    #[serde(alias = "zrs")]
    pub students: String,
}
