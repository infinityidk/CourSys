from collections import defaultdict


def get_fp(s):
    return (tuple(s["weeks"]), s["day"], tuple(s["periods"]), s["room"])


def build_hierarchy(data):
    parents = {d["id"]: d for d in data if not d.get("parentId")}
    children_map = defaultdict(list)
    [children_map[d["parentId"]].append(d) for d in data if d.get("parentId")]
    courses = defaultdict(dict)
    for pid, p in parents.items():
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
                    "target",
                    "req",
                ]
            } | {"tasks": []}
        theory_slots = [{**s, "kind": "THEORY"} for s in p["slots"]]
        theory_fps = {get_fp(s) for s in p["slots"]}
        options = []
        if kids := children_map.get(pid):
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
                        "capacity": k["capacity"],
                        "seats": k["seats"],
                        "slots": theory_slots + lab_slots,
                    }
                )
        else:
            options.append(
                {
                    "name": "STD",
                    "teacher": p["teacher"],
                    "capacity": p["capacity"],
                    "seats": p["seats"],
                    "slots": theory_slots,
                }
            )
        courses[code]["tasks"].append(
            {
                "className": p["className"],
                "teacher": p["teacher"],
                "lang": p["lang"],
                "options": options,
            }
        )
    return list(courses.values())
