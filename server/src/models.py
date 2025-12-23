from collections import defaultdict


def get_fp(s):
    return (tuple(s["weeks"]), s["day"], tuple(s["periods"]), s["room"])


def match(rule, info):
    return any(
        all(
            (
                (
                    info["level"] == "2"
                    if v in ["硕士", "博士"]
                    else info["level"] == "1"
                )
                if k == "层次"
                else (v == info["grade"])
                if k == "年级"
                else (v == info["department"])
                if k == "学院"
                else (v == info["major"])
                if k == "专业"
                else True
            )
            for k, v in (s.split(":", 1) for s in g.split(";") if ":" in s)
        )
        for g in rule.split(",")
        if g.strip()
    )


def build_hierarchy(data, info):
    parents = {d["id"]: d for d in data if not d.get("parentId")}
    children_map = defaultdict(list)
    [children_map[d["parentId"]].append(d) for d in data if d.get("parentId")]
    courses = defaultdict(dict)
    for p in parents.values():
        code = p["code"]
        if not courses[code]:
            courses[code] = {
                k: p[k]
                for k in [
                    "code",
                    "courseId",
                    "name",
                    "credits",
                    "era",
                    "dept",
                    "category",
                    "type",
                    "req",
                ]
            } | {"tasks": []}
        theory_slots = [{**s, "kind": "THEORY"} for s in p["slots"]]
        theory_fps = {get_fp(s) for s in p["slots"]}
        options = []
        is_grad = info["level"] == "2"
        if kids := children_map.get(p["id"]):
            for k in kids:
                lab_slots = [
                    {**s, "kind": "LAB"}
                    for s in k["slots"][::-1]
                    if get_fp(s) not in theory_fps
                ]
                options.append(
                    {
                        "name": k["className"].split("-")[-1],
                        "teacher": k["teacher"],
                        "capacity": k.get("graduateCapacity")
                        if is_grad
                        else k.get("bachelorCapacity"),
                        "seats": k["seats"],
                        "slots": theory_slots + lab_slots,
                    }
                )
        else:
            options.append(
                {
                    "name": "STD",
                    "capacity": p.get("graduateCapacity")
                    if is_grad
                    else p.get("bachelorCapacity"),
                    "seats": p["seats"],
                    "slots": theory_slots,
                }
            )
        m, j = p.get("allowedTarget"), p.get("deniedTarget")
        courses[code]["tasks"].append(
            {
                "className": p["className"],
                "teacher": p["teacher"],
                "forbidden": (
                    is_grad
                    and p.get("era") != "G"
                    or (m and not match(m, info))
                    or (j and match(j, info))
                ),
                "allowedTarget": m,
                "deniedTarget": j,
                "options": options,
            }
        )
    for c in courses.values():
        if all(t["forbidden"] for t in c["tasks"]):
            c["forbidden"] = True
    return list(courses.values())
