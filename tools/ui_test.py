import asyncio, subprocess, time, sys
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3","-m","http.server","8765","-d","/home/claude/fm/site"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width":390,"height":844}, device_scale_factor=2)
        errs=[]
        pg.on("console", lambda m: errs.append(m.type+": "+m.text) if m.type in ("error","warning") else None)
        pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
        await pg.goto("http://localhost:8765/index.html"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path="/tmp/s1_start.png", full_page=True)
        await pg.click("text=Investor werden"); await pg.wait_for_timeout(1500)
        await pg.select_option("select[data-sel=buyLevel]", "6"); await pg.wait_for_timeout(800)
        await pg.screenshot(path="/tmp/s2_buy.png")
        btns = await pg.query_selector_all("button[data-act=buy]:not([disabled])")
        print("kaufbar:", len(btns))
        await btns[2].click(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path="/tmp/s3_home0.png", full_page=True)
        await pg.evaluate("window.__fm.backend.shift(40)"); await pg.reload(); await pg.wait_for_timeout(3000)
        await pg.screenshot(path="/tmp/s4_home40.png", full_page=True)
        for tab in ["Kader","Transfers","Verein","Finanzen","Ligen","Pokale","Mitspieler"]:
            await pg.click(f"nav button:has-text('{tab}')"); await pg.wait_for_timeout(700)
            await pg.screenshot(path=f"/tmp/s5_{tab}.png", full_page=True)
        print("\n".join(errs[:20]) or "keine Fehler")
        await b.close()
asyncio.run(main()); srv.terminate()
