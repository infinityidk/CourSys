import re

M = {
    "id": "id",
    "rwmc": "className",
    "kcdm": "code",
    "kcmc": "name",
    "bksrl": "capacity",
    "xf": "credits",
    "dgjsmc": "teacher",
    "kclbmc": "category",
    "kcxzmc": "type",
    "kkyxmc": "dept",
    "kcid": "courseId",
    "zhurwid": "parentId",
    "skyymc": "lang",
    "mxdx": "target",
    "jszws": "seats",
    "zzcj": "score",
    "xscj": "grade",
}


def get_era(code, pylx):
    if not pylx:
        return ""
    if str(pylx) != "1":
        return "G"
    return (
        n[0][0] if (n := re.findall(r"\d+", code or "")) and n[0][0] in "1234" else "O"
    )


def get_semester(s):
    return f"{s[:4] if s[-1] == '1' else s[5:9]}-{s[-1]}"


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


def parse_item(d):
    return {
        **{v: d.get(k) for k, v in M.items() if k in d},
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
