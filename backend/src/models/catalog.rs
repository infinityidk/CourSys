use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/bindings/CatalogRequest.ts")]
pub struct CatalogRequest {
    pub semester: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RawCourse {
    #[serde(rename = "kxh")]
    pub seq: String,
    #[serde(rename = "pylx")]
    pub level: String,
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
    #[serde(rename = "kcid")]
    pub course_id: String,
    #[serde(rename = "dgjsmc")]
    pub teacher: Option<String>,
    #[serde(rename = "pkjgmx")]
    pub slots: String,
    #[serde(rename = "skyymc")]
    pub language: String,
    #[serde(rename = "mxdx")]
    pub allowed: Option<String>,
    #[serde(rename = "jzdx")]
    pub denied: Option<String>,
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
    #[serde(rename = "jszws")]
    pub seats: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Leaf {
    #[serde(rename = "kzdm")]
    pub group_code: String,
    #[serde(rename = "kcdm")]
    pub code: String,
    #[serde(rename = "kcmc")]
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct Node {
    #[serde(rename = "kzdm")]
    pub group_code: String,
    #[serde(rename = "yqzkzs")]
    pub relation: Option<String>,
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
    pub slots: Vec<Slot>,
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
    pub slots: Vec<Slot>,
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
    pub nature: Option<String>,
    pub department: String,
    pub dependencies: Option<Vec<Vec<Dependency>>>,
    pub classes: Vec<Class>,
    #[serde(skip_serializing)]
    pub id: String,
}
