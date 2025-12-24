import re
import asyncio
import pickle
from pathlib import Path
from itertools import product

M_SCHE = {
    "id": "id",
    "rwmc": "className",
    "kcdm": "code",
    "kcmc": "name",
    "bksrl": "bachelorCapacity",
    "yjsrl": "graduateCapacity",
    "kclbmc": "category",
    "kcxzmc": "type",
    "kkyxmc": "dept",
    "kcid": "courseId",
    "zhurwid": "parentId",
    "mxdx": "allowedTarget",
    "jzdx": "deniedTarget",
    "jszws": "seats",
}
M_GRADE = {
    "kcdm": "code",
    "kcmc": "name",
    "zzcj": "score",
    "xscj": "grade",
    "xnxq": "semester",
}
M_TIMETABLE = {
    "kcdm": "code",
    "rwmc": "className",
    "kcxzmc": "type",
    "kclbmc": "category",
    "kkyxmc": "dept",
    "jfzlbmc": "grading",
}
CACHE_FILE = Path("cache/logic.pkl")
CACHE_FILE.parent.mkdir(exist_ok=True)
LOGIC_CACHE = pickle.loads(CACHE_FILE.read_bytes()) if CACHE_FILE.exists() else {}


def clear_cache():
    LOGIC_CACHE.clear()
    CACHE_FILE.unlink(missing_ok=True)


def get_era(code, level):
    return (
        n[0][0]
        if level
        and str(level) == "1"
        and (n := re.findall(r"\d+", code or ""))
        and n[0][0] in "1234"
        else "G"
        if level
        else ""
    )


def parse_slots(html):
    raw, group, res = {}, {}, []
    for w_str, d_str, p_str, room in re.findall(
        r"([\d\-,，]+(?:周|单周|双周)),星期([一二三四五六日])第(\d+(?:-\d+)?)节\s+([^<]+)",
        html or "",
    ):
        mode = 1 if "单周" in w_str else 2 if "双周" in w_str else 0
        weeks = []
        for p in (
            w_str.replace("单周", "")
            .replace("双周", "")
            .replace("周", "")
            .replace("，", ",")
            .split(",")
        ):
            if not p.strip():
                continue
            try:
                if "-" in p:
                    s, e = map(int, p.split("-"))
                    weeks.extend(
                        w for w in range(s, e + 1) if mode == 0 or w % 2 == mode % 2
                    )
                else:
                    weeks.append(int(p))
            except ValueError:
                continue
        ps = [int(x) for x in p_str.split("-")]
        raw.setdefault(
            ("一二三四五六日".find(d_str) + 1, (ps[0], ps[-1]), room.strip()), []
        ).extend(weeks)
    for (d, p, r), w in raw.items():
        group.setdefault((d, r, tuple(sorted(set(w)))), []).append(p)
    for (d, r, w), p in group.items():
        p.sort()
        s, e = p[0]
        for ns, ne in p[1:]:
            if ns <= e + 1:
                e = max(e, ne)
            else:
                res.append({"weeks": list(w), "day": d, "periods": [s, e], "room": r})
                s, e = ns, ne
        res.append({"weeks": list(w), "day": d, "periods": [s, e], "room": r})
    return res


async def fetch_prereq_logic(client, courseId):
    start_len = len(LOGIC_CACHE)

    async def resolve_leaf(groupCode):
        if groupCode in LOGIC_CACHE:
            return LOGIC_CACHE[groupCode]
        try:
            raw = (
                (
                    await client.post(
                        "https://tis.sustech.edu.cn/kck/xxxxkzkc/queryXxkc",
                        json={"kcid": courseId},
                    )
                )
                .json()
                .get("list", [])
            )
            leaves = {}
            [
                leaves.setdefault(i["kzdm"], {}).update(
                    {i["kcdm"]: {"code": i["kcdm"], "name": i["kcmc"]}}
                )
                for i in raw
                if i.get("kzdm")
            ]
            LOGIC_CACHE.update({k: [list(v.values())] for k, v in leaves.items()})
            return LOGIC_CACHE.get(groupCode, [])
        except Exception:
            return []

    async def build(groupCode, cnt):
        if groupCode and groupCode in LOGIC_CACHE:
            return LOGIC_CACHE[groupCode]
        try:
            nodes = (
                (
                    await client.post(
                        "https://tis.sustech.edu.cn/kck/xxxxkzkc/queryKzxx",
                        data={"kzdm": groupCode}
                        if groupCode
                        else {"kzdm": "", "kcid": courseId, "kzlx": "1"},
                    )
                )
                .json()
                .get("kzList1", [])
            )
        except Exception:
            return []
        if not nodes or not (
            cnfs := [
                c
                for c in await asyncio.gather(
                    *(
                        resolve_leaf(n["kzdm"])
                        if n.get("kznkcmc")
                        else build(n["kzdm"], int(n.get("yqzkzs") or 0))
                        for n in nodes
                    )
                )
                if c
            ]
        ):
            return []
        res = (
            [sum(p, []) for p in product(*cnfs)]
            if cnt < len(nodes)
            else [x for c in cnfs for x in c]
        )
        if groupCode:
            LOGIC_CACHE[groupCode] = res
        return res

    res = await build("", 999)
    if len(LOGIC_CACHE) > start_len:
        CACHE_FILE.write_bytes(pickle.dumps(LOGIC_CACHE))
    return res


def parse_grade_item(d):
    return {
        **{v: d.get(k) for k, v in M_GRADE.items() if k in d},
        "credits": f"{float(d.get('xf', 0)):g}",
    }


def parse_sche_item(d):
    return {
        **{v: d.get(k) for k, v in M_SCHE.items() if k in d},
        "teacher": ", ".join(
            dict.fromkeys(
                [t.strip() for t in (d.get("dgjsmc") or "").split(",") if t.strip()]
            )
        ),
        "era": get_era(d.get("kcdm"), d.get("pylx")),
        "credits": f"{float(d.get('xf', 0)):g}",
        "slots": parse_slots(d.get("pkjgmx")),
        "info": (re.search(r"选课要求:([\s\S]*?)</p>", d.get("kcxx") or "") or [0, ""])[
            1
        ].strip(),
    }


def parse_timetable_item(d):
    return {
        **{v: d.get(k) for k, v in M_TIMETABLE.items() if k in d},
        "teacher": ", ".join(
            dict.fromkeys(
                [t.strip() for t in (d.get("dgjsmc") or "").split(",") if t.strip()]
            )
        ),
        "credits": f"{float(d.get('xf', 0)):g}",
        "slots": [{**s, "kind": "THEORY"} for s in parse_slots(d.get("pkjgmx"))],
    }
