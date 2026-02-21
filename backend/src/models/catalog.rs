use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/CatalogRequest.ts")]
pub struct CatalogRequest {
    pub semester: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RawTisCourse {
    #[serde(alias = "kxh")]
    pub seq: String,
    #[serde(alias = "pylx")]
    pub level: String,
    #[serde(alias = "kcdm")]
    pub code: String,
    #[serde(alias = "kcmc")]
    pub name: String,
    #[serde(alias = "xf")]
    pub credits: String,
    #[serde(alias = "kclbmc")]
    pub category: String,
    #[serde(alias = "kcxzmc")]
    pub nature: String,
    #[serde(alias = "kkyxmc")]
    pub department: String,
    #[serde(alias = "kcid")]
    pub course_id: String,
    #[serde(alias = "dgjsmc")]
    pub teacher: Option<String>,
    #[serde(alias = "pkjgmx")]
    pub slots: String,
    #[serde(alias = "skyymc")]
    pub language: String,
    #[serde(alias = "mxdx")]
    pub allowed: Option<String>,
    #[serde(alias = "jzdx")]
    pub denied: Option<String>,
    #[serde(alias = "kcxx")]
    pub info: String,
    #[serde(alias = "id")]
    pub id: String,
    #[serde(alias = "bksyxrs")]
    pub undergraduate_number: String,
    #[serde(alias = "yjsyxrs")]
    pub graduate_number: String,
    #[serde(alias = "nansyxrs")]
    pub male_number: String,
    #[serde(alias = "nvsyxrs")]
    pub female_number: String,
    #[serde(alias = "bksrl")]
    pub undergraduate_capacity: String,
    #[serde(alias = "yjsrl")]
    pub graduate_capacity: String,
    #[serde(alias = "jszws")]
    pub seats: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq, Hash)]
#[ts(export, export_to = "../../frontend/src/bindings/Slot.ts")]
pub struct Slot {
    pub day: i32,
    pub room: String,
    pub weeks: Vec<i32>,
    pub period: (i32, i32),
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/Group.ts")]
pub struct Group {
    pub id: String,
    pub seq: String,
    pub teacher: Option<String>,
    pub undergraduate_number: String,
    pub graduate_number: String,
    pub male_number: String,
    pub female_number: String,
    pub undergraduate_capacity: String,
    pub graduate_capacity: String,
    pub seats: Option<String>,
    pub slots: Option<Vec<Slot>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/Class.ts")]
pub struct Class {
    pub seq: String,
    pub teacher: Option<String>,
    pub language: String,
    pub allowed: Option<String>,
    pub denied: Option<String>,
    pub info: Option<String>,
    pub slots: Option<Vec<Slot>>,
    pub groups: Vec<Group>,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/Dependency.ts")]
pub struct Dependency {
    pub code: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/Course.ts")]
pub struct Course {
    pub era: String,
    pub code: String,
    pub name: String,
    pub credits: String,
    pub category: String,
    pub nature: String,
    pub department: String,
    pub dependencies: Option<Vec<Vec<Dependency>>>,
    pub classes: Vec<Class>,
    #[serde(skip_serializing)]
    pub course_id: String,
}
