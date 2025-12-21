import re
import asyncio
from itertools import product

M_SCHE = {
    "id": "id",
    "rwmc": "className",
    "kcdm": "code",
    "kcmc": "name",
    "bksrl": "capacity",
    "kclbmc": "category",
    "kcxzmc": "type",
    "kkyxmc": "dept",
    "kcid": "courseId",
    "zhurwid": "parentId",
    "mxdx": "target",
    "jszws": "seats",
}

M_GRADE = {
    "kcdm": "code",
    "kcmc": "name",
    "zzcj": "score",
    "xscj": "grade",
}

M_TIMETABLE = {
    "kcdm": "code",
    "rwmc": "className",
    "kcxzmc": "type",
    "kclbmc": "category",
    "kkyxmc": "dept",
    "jfzlbmc": "grading",
}

LOGIC_CACHE = {}


def get_era(code, pylx):
    if not pylx:
        return ""
    if str(pylx) != "1":
        return "G"
    return (
        n[0][0] if (n := re.findall(r"\d+", code or "")) and n[0][0] in "1234" else "O"
    )


def get_semester(xn, xq):
    return f"{xn.split('-')[0] if str(xq) == '1' else xn.split('-')[1]}-{xq}"


def parse_slots(html):
    res = []
    for w_str, d_str, p_str, room in re.findall(
        r"([\d\-,，]+(?:周|单周|双周)),星期([一二三四五六日])第(\d+(?:-\d+)?)节\s+([^<]+)",
        html or "",
    ):
        mode = 1 if "单周" in w_str else 2 if "双周" in w_str else 0
        weeks = []
        for p in [
            x.strip()
            for x in w_str.replace("单周", "")
            .replace("双周", "")
            .replace("周", "")
            .replace("，", ",")
            .split(",")
            if x.strip()
        ]:
            if "-" in p:
                try:
                    s, e = map(int, p.split("-"))
                    weeks.extend(
                        w for w in range(s, e + 1) if mode == 0 or w % 2 == mode % 2
                    )
                except ValueError:
                    continue
            else:
                try:
                    weeks.append(int(p))
                except ValueError:
                    continue
        ps = [int(x) for x in p_str.split("-")]
        res.append(
            {
                "weeks": sorted(set(weeks)),
                "day": "一二三四五六日".find(d_str) + 1,
                "periods": [ps[0], ps[-1]],
                "room": room.strip(),
            }
        )
    return res


async def fetch_prereq_logic(client, courseId):
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

    return await build("", 999)


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
        "req": (re.search(r"选课要求:([\s\S]*?)</p>", d.get("kcxx") or "") or [0, ""])[
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
        "slots": [
            {
                **s,
                "kind": "THEORY",
            }
            for s in parse_slots(d.get("pkjgmx"))
        ],
    }
