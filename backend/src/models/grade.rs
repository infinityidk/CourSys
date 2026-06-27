use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/GradeRequest.ts")]
pub struct GradeRequest {
    pub level: String,
}

#[derive(Debug, Deserialize)]
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
    pub nature: Option<String>,
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

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/GradeResponse.ts")]
pub struct GradeResponse {
    pub code: String,
    pub name: String,
    pub score: String,
    pub grade: String,
    pub semester: String,
    pub nature: Option<String>,
    pub category: String,
    pub credits: f64,
    pub department: String,
    pub ranking: Option<String>,
    pub students: String,
}

#[derive(Debug, Deserialize)]
pub struct RawGpaOverall {
    #[serde(rename = "PJXFJ")]
    pub gpa: f64,
    #[serde(rename = "PM")]
    pub ranking: String,
}

#[derive(Debug, Deserialize)]
pub struct RawGpaSemester {
    #[serde(rename = "XN")]
    pub year: String,
    #[serde(rename = "XNXFJ")]
    pub year_gpa: f64,
    #[serde(rename = "XNXQ")]
    pub full_name: String,
    #[serde(rename = "XQXFJ")]
    pub season_gpa: f64,
}

#[derive(Debug, Deserialize)]
pub struct RawGpaResponse {
    #[serde(rename = "xfjandpm")]
    pub overall: RawGpaOverall,
    #[serde(rename = "xnanxqxfj")]
    pub semesters: Vec<RawGpaSemester>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/SeasonGpa.ts")]
pub struct SeasonGpa {
    pub season_name: String,
    pub season_gpa: f64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/YearGpa.ts")]
pub struct YearGpa {
    pub year: String,
    pub year_gpa: f64,
    pub seasons: Vec<SeasonGpa>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/GradesResponse.ts")]
pub struct GradesResponse {
    pub gpa: f64,
    pub ranking: String,
    pub years: Vec<YearGpa>,
    pub grades: Vec<GradeResponse>,
}
