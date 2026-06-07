use crate::models::catalog::{Class, Course, Dependency, Group, Leaf, Node, RawCourse, Slot};
use crate::state::AppState;
use crate::utils::compress::compress_catalog;
use crate::utils::parser::{get_era, parse_info, parse_slots};
use crate::utils::tis::{query_catalog_page, send_request};
use anyhow::Context;
use async_recursion::async_recursion;
use futures::{StreamExt, TryStreamExt, stream};
use itertools::Itertools;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
type CatalogInfo = HashMap<String, (String, Option<Vec<Vec<Dependency>>>)>;
struct BuildCnfContext<'a> {
    state: &'a AppState,
    cookie: &'a str,
    token: &'a str,
    leaves: &'a HashMap<String, HashSet<Dependency>>,
    list_type: &'a str,
}

fn from_list(list: &[Value], by_code: &mut HashMap<String, Vec<RawCourse>>) -> anyhow::Result<()> {
    for item in list {
        let code = item
            .get("kcdm")
            .and_then(|v| v.as_str())
            .unwrap_or("?")
            .to_string();
        let raw: RawCourse = serde_path_to_error::deserialize(item.clone())
            .map_err(|e| anyhow::anyhow!("course {}: {}", code, e))?;
        by_code.entry(raw.code.clone()).or_default().push(raw);
    }
    Ok(())
}

async fn fetch_leaves(
    state: &AppState,
    cookie: &str,
    token: &str,
    course_id: &str,
) -> Result<HashMap<String, HashSet<Dependency>>, anyhow::Error> {
    let url = "https://tis.sustech.edu.cn/kck/xxxxkzkc/queryXxkc";
    let payload = serde_json::json!({ "kcid": course_id });
    let json: Value = send_request(
        state
            .http_client
            .post(url)
            .header(reqwest::header::COOKIE, cookie)
            .json(&payload),
        token,
        state,
    )
    .await?;
    let list = json["list"].as_array().unwrap();
    let mut leaves = HashMap::new();
    for item in list {
        let raw: Leaf = serde_json::from_value(item.clone()).context("Failed to parse Leaf")?;
        leaves
            .entry(raw.group_code)
            .or_insert_with(HashSet::new)
            .insert(Dependency {
                code: raw.code,
                name: raw.name,
            });
    }
    Ok(leaves)
}

#[async_recursion]
async fn build_cnf(
    ctx: &BuildCnfContext<'_>,
    group_code: Option<&str>,
    root_course_id: Option<&str>,
    relation: Option<&str>,
) -> Result<Vec<Vec<Dependency>>, anyhow::Error> {
    if relation.is_none() {
        let code = group_code.ok_or_else(|| anyhow::anyhow!("Leaf node missing group_code"))?;
        let courses = ctx
            .leaves
            .get(code)
            .ok_or_else(|| anyhow::anyhow!("Leaf group_code {} not found in leaves", code))?;
        return Ok(vec![courses.iter().cloned().collect()]);
    }
    let params = if let Some(code) = group_code {
        vec![("kzdm", code)]
    } else {
        let cid =
            root_course_id.ok_or_else(|| anyhow::anyhow!("No group_code and no root_course_id"))?;
        vec![("kzdm", ""), ("kcid", cid), ("kzlx", ctx.list_type)]
    };

    let json: Value = send_request(
        ctx.state
            .http_client
            .post("https://tis.sustech.edu.cn/kck/xxxxkzkc/queryKzxx")
            .header(reqwest::header::COOKIE, ctx.cookie)
            .form(&params),
        ctx.token,
        ctx.state,
    )
    .await?;
    let raw_nodes: Vec<Node> = json["kzList1"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| serde_json::from_value(v.clone()).ok())
                .collect()
        })
        .unwrap_or_default();

    let child_futures = raw_nodes.into_iter().map(|node| {
        let group_code = node.group_code;
        let relation = node.relation;
        async move { build_cnf(ctx, Some(&group_code), None, relation.as_deref()).await }
    });
    let children_cnf: Vec<Vec<Vec<Dependency>>> = futures::stream::iter(child_futures)
        .buffer_unordered(10)
        .try_collect()
        .await?;

    if relation.unwrap() == "1" {
        let product = children_cnf.into_iter().multi_cartesian_product();
        let mut result = Vec::new();
        for combination in product {
            let merged = combination.into_iter().flatten().collect();
            result.push(merged);
        }
        Ok(result)
    } else {
        let mut result = Vec::new();
        for child in children_cnf {
            result.extend(child);
        }
        Ok(result)
    }
}

pub async fn fetch_dependency_tree(
    state: &AppState,
    cookie: &str,
    token: &str,
    course_id: &str,
) -> Result<Vec<Vec<Dependency>>, anyhow::Error> {
    let leaves = fetch_leaves(state, cookie, token, course_id).await?;
    if leaves.is_empty() {
        return Ok(vec![]);
    }
    let ctx = BuildCnfContext {
        state,
        cookie,
        token,
        leaves: &leaves,
        list_type: "1",
    };
    match build_cnf(&ctx, None, Some(course_id), Some("2")).await {
        Ok(result) => Ok(result),
        Err(e) => {
            tracing::warn!(
                "First attempt with list_type=1 failed: {}, trying list_type=2",
                e
            );
            let ctx2 = BuildCnfContext {
                list_type: "2",
                ..ctx
            };
            build_cnf(&ctx2, None, Some(course_id), Some("2")).await
        }
    }
}

async fn fetch_catalog_full(
    state: &AppState,
    cookie: &str,
    token: &str,
    semester: &str,
) -> Result<HashMap<String, Course>, anyhow::Error> {
    let (year, season) = semester.split_at(9);
    let first = query_catalog_page(state, cookie, token, year, season, 1, 500).await?;
    let mut by_code = HashMap::new();
    let pages = first["rwList"]["pages"].as_i64().unwrap();
    from_list(first["rwList"]["list"].as_array().unwrap(), &mut by_code)?;
    let page_futures =
        (2..=pages).map(|page| query_catalog_page(state, cookie, token, year, season, page, 500));
    let mut st = stream::iter(page_futures).buffer_unordered(8);
    while let Some(result) = st.next().await {
        let json = result?;
        from_list(json["rwList"]["list"].as_array().unwrap(), &mut by_code)?;
    }

    let mut courses = HashMap::new();
    for (_, raws) in by_code {
        let mut by_class_num: HashMap<String, Vec<&RawCourse>> = HashMap::new();
        for raw in &raws {
            by_class_num
                .entry(raw.seq[1..3].to_string())
                .or_default()
                .push(raw);
        }

        let mut classes = Vec::new();

        for (class_num, items) in by_class_num {
            let mut class_raw = None;
            let mut group_raws = Vec::new();
            for raw in items {
                if raw.seq.len() == 3 {
                    class_raw = Some(raw);
                } else {
                    group_raws.push(raw);
                }
            }

            let class_raw = class_raw.unwrap();
            let class_slots = parse_slots(class_raw.slots.as_deref());
            let class_slots_set: HashSet<Slot> = class_slots.iter().cloned().collect();

            let mut groups = Vec::new();
            for raw in group_raws {
                let group_seq = (raw.seq.as_bytes()[3] - b'A' + 1).to_string();
                let group_all = parse_slots(raw.slots.as_deref());
                let group_slots = group_all
                    .into_iter()
                    .filter(|slot| !class_slots_set.contains(slot))
                    .collect();

                groups.push(Group {
                    id: raw.id.clone(),
                    seq: group_seq,
                    teacher: raw.teacher.clone(),
                    undergraduate_number: raw.undergraduate_number.clone(),
                    graduate_number: raw.graduate_number.clone(),
                    male_number: raw.male_number.clone(),
                    female_number: raw.female_number.clone(),
                    undergraduate_capacity: raw.undergraduate_capacity.clone(),
                    graduate_capacity: raw.graduate_capacity.clone(),
                    seats: raw.seats.clone(),
                    slots: group_slots,
                });
            }
            if groups.is_empty() {
                groups.push(Group {
                    id: class_raw.id.clone(),
                    seq: "0".to_string(),
                    teacher: None,
                    undergraduate_number: class_raw.undergraduate_number.clone(),
                    graduate_number: class_raw.graduate_number.clone(),
                    male_number: class_raw.male_number.clone(),
                    female_number: class_raw.female_number.clone(),
                    undergraduate_capacity: class_raw.undergraduate_capacity.clone(),
                    graduate_capacity: class_raw.graduate_capacity.clone(),
                    seats: class_raw.seats.clone(),
                    slots: Vec::new(),
                });
            }
            let class = Class {
                seq: class_num.clone(),
                teacher: class_raw.teacher.clone(),
                language: class_raw.language.clone(),
                allowed: class_raw.allowed.clone(),
                denied: class_raw.denied.clone(),
                info: class_raw.info.as_deref().and_then(parse_info),
                slots: class_slots,
                groups,
            };
            classes.push(class);
        }
        let first_raw = &raws[0];
        let era = get_era(Some(&first_raw.code), Some(&first_raw.level));
        courses.insert(
            first_raw.code.clone(),
            Course {
                era,
                code: first_raw.code.clone(),
                name: first_raw.name.clone(),
                credits: first_raw.credits.clone(),
                category: first_raw.category.clone(),
                nature: first_raw.nature.clone(),
                department: first_raw.department.clone(),
                dependencies: None,
                classes,
                id: first_raw.course_id.clone(),
            },
        );
    }
    Ok(courses)
}

pub async fn get_catalog(
    state: &AppState,
    cookie: &str,
    token: &str,
    semester: &str,
) -> Result<Vec<u8>, anyhow::Error> {
    let is_latest = {
        let cache_lock = state.semester_cache.read().await;
        let valid = cache_lock
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Semester cache not initialized"))?
            .valid
            .clone();
        if !valid.contains(&semester.to_string()) {
            return Err(anyhow::anyhow!("Invalid semester"));
        }
        valid.first() == Some(&semester.to_string())
    };

    // fast path cache read
    {
        let cache = &state.compressed_catalog;
        if let Some(r) = cache.get(semester) {
            let (ts, data) = r.value();
            if !is_latest || ts.elapsed() < Duration::from_millis(500) {
                return Ok(data.clone());
            }
        }
    }

    let lock = state
        .semester_locks
        .entry(semester.to_string())
        .or_insert_with(|| Arc::new(Mutex::new(())))
        .clone();
    let _guard = lock.lock().await;

    // double check cache
    {
        let cache = &state.compressed_catalog;
        if let Some(r) = cache.get(semester) {
            let (ts, data) = r.value();
            if !is_latest || ts.elapsed() < Duration::from_millis(500) {
                return Ok(data.clone());
            }
        }
    }

    if !state.catalog_info_cache.contains_key(semester) {
        match load_deps_file(semester).await {
            Ok(file_deps) if !file_deps.is_empty() => {
                let converted = file_deps
                    .into_iter()
                    .map(|(k, v)| (k, (String::new(), v)))
                    .collect();
                state
                    .catalog_info_cache
                    .insert(semester.to_string(), converted);
                tracing::info!("Loaded deps from file for {semester}");
            }
            Err(e) => tracing::warn!("Failed to load deps file: {e}"),
            _ => {}
        }
    }

    let mut raw_data = fetch_catalog_full(state, cookie, token, semester).await?;
    let old_data = state
        .catalog_info_cache
        .get(semester)
        .map(|v| v.clone())
        .unwrap_or_default();

    let mut new_info: CatalogInfo = HashMap::new();

    let mut tasks = Vec::new();
    for course in raw_data.values_mut() {
        if let Some((_, Some(old_deps))) = old_data.get(&course.code) {
            course.dependencies = Some(old_deps.clone());
            new_info.insert(
                course.code.clone(),
                (course.id.clone(), course.dependencies.clone()),
            );
            continue;
        }
        let id = course.id.clone();
        let code = course.code.clone();
        tasks.push(async move {
            let deps = fetch_dependency_tree(state, cookie, token, &id).await;
            (code, deps)
        });
    }
    if !tasks.is_empty() {
        let mut stream = futures::stream::iter(tasks).buffer_unordered(10);
        while let Some((code, result)) = stream.next().await {
            match result {
                Ok(deps) => {
                    if let Some(course) = raw_data.get_mut(&code) {
                        course.dependencies = Some(deps);
                        new_info.insert(code, (course.id.clone(), course.dependencies.clone()));
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to fetch dependency tree for course {}: {}", code, e);
                }
            }
        }
    }

    state
        .catalog_info_cache
        .insert(semester.to_string(), new_info.clone());
    let deps_only: HashMap<String, Option<Vec<Vec<Dependency>>>> = new_info
        .iter()
        .map(|(code, (_, deps))| (code.clone(), deps.clone()))
        .collect();
    let sem = semester.to_string();
    tokio::spawn(async move {
        if let Err(e) = save_deps_file(&sem, &deps_only).await {
            tracing::warn!("Failed to save deps file for {sem}: {e}");
        }
    });
    let compressed = tokio::task::spawn_blocking(move || compress_catalog(raw_data))
        .await
        .unwrap();
    let comp_cache = state.compressed_catalog.clone();
    comp_cache.insert(semester.to_string(), (Instant::now(), compressed.clone()));

    Ok(compressed)
}

pub fn deps_path(semester: &str) -> PathBuf {
    PathBuf::from("data").join(format!("deps_{semester}.json"))
}

async fn load_deps_file(
    semester: &str,
) -> Result<HashMap<String, Option<Vec<Vec<Dependency>>>>, anyhow::Error> {
    let path = deps_path(semester);
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let data = tokio::fs::read_to_string(&path).await?;
    if data.trim().is_empty() {
        return Ok(HashMap::new());
    }
    let deps = serde_json::from_str(&data)?;
    Ok(deps)
}

async fn save_deps_file(
    semester: &str,
    deps: &HashMap<String, Option<Vec<Vec<Dependency>>>>,
) -> Result<(), anyhow::Error> {
    tokio::fs::create_dir_all("data").await?;
    let path = deps_path(semester);
    let tmp = path.with_extension("tmp");
    let ordered: BTreeMap<_, _> = deps
        .iter()
        .map(|(k, v)| {
            (
                k.clone(),
                v.as_ref().map(|clauses| {
                    let mut clauses = clauses.clone();
                    clauses.iter_mut().for_each(|c| c.sort());
                    clauses.sort();
                    clauses
                }),
            )
        })
        .collect();
    let json = serde_json::to_string(&ordered)?;
    tokio::fs::write(&tmp, &json).await?;
    tokio::fs::rename(&tmp, &path).await?;
    Ok(())
}
