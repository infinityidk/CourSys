use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::models::catalog::Slot;

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/ScheduleRequest.ts")]
pub struct ScheduleRequest {
    pub semester: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScheduleItem {
    #[serde(rename = "kxh")]
    pub seq: String,
    #[serde(rename = "kcdm")]
    pub code: String,
    #[serde(rename = "kcmc")]
    pub name: String,
    #[serde(rename = "xf")]
    pub credits: String,
    #[serde(rename = "kclbmc")]
    pub category: String,
    #[serde(rename = "kcxzmc")]
    pub nature: Option<String>,
    #[serde(rename = "kkyxmc")]
    pub department: String,
    #[serde(rename = "dgjsmc")]
    pub teacher: Option<String>,
    #[serde(rename = "pkjgmx")]
    pub slots: String,
    #[serde(rename = "skyymc")]
    pub language: Option<String>,
    #[serde(rename = "kcxx")]
    pub info: String,
    #[serde(rename = "id")]
    pub id: String,
    #[serde(rename = "bksyxrs")]
    pub undergraduate_number: String,
    #[serde(rename = "yjsyxrs")]
    pub graduate_number: String,
    #[serde(rename = "nansyxrs")]
    pub male_number: String,
    #[serde(rename = "nvsyxrs")]
    pub female_number: String,
    #[serde(rename = "bksrl")]
    pub undergraduate_capacity: String,
    #[serde(rename = "yjsrl")]
    pub graduate_capacity: String,
    #[serde(rename = "jfzlbmc")]
    pub grade_type: String,
    #[serde(rename = "xkxs")]
    pub coin: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/ScheduleResponse.ts")]
pub struct ScheduleResponse {
    pub class: String,
    pub group: Option<String>,
    pub code: String,
    pub name: String,
    pub credits: String,
    pub category: String,
    pub nature: Option<String>,
    pub department: String,
    pub teacher: Option<String>,
    pub slots: Vec<Slot>,
    pub language: Option<String>,
    pub info: Option<String>,
    pub id: String,
    pub undergraduate_number: String,
    pub graduate_number: String,
    pub male_number: String,
    pub female_number: String,
    pub undergraduate_capacity: String,
    pub graduate_capacity: String,
    pub grade_type: String,
    pub coin: Option<String>,
}
