from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from httpx import AsyncClient
from bs4 import BeautifulSoup

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
c = AsyncClient(
    follow_redirects=True, verify=False, headers={"User-Agent": "Mozilla/5.0"}
)


@app.post("/login")
async def login(u: str = Form(...), p: str = Form(...)):
    url = "https://cas.sustech.edu.cn/cas/login?service=https%3A%2F%2Ftis.sustech.edu.cn%2Fcas"
    if "JSESSIONID" in c.cookies:
        return {"status": 1}
    if not (
        s := BeautifulSoup((await c.get(url)).text, "html.parser").find(
            "input", {"name": "execution"}
        )
    ):
        raise HTTPException(500)
    await c.post(
        url,
        data={
            "username": u,
            "password": p,
            "execution": s["value"],
            "_eventId": "submit",
            "geolocation": "",
        },
    )
    if "JSESSIONID" in c.cookies:
        return {"status": 1}
    raise HTTPException(401)


@app.get("/sync")
async def sync():
    if "JSESSIONID" not in c.cookies:
        raise HTTPException(401)
    r = await c.get("")  # TODO: Add the sync URL here
    return r.json()
