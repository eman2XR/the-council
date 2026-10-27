"""Browser smoke check for the public site under a project URL prefix."""
import json
import tempfile
from pathlib import Path
from .pipeline import ROOT
from .render import ORIGIN, launch, route_files


def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
            browser=launch(p)
            page=browser.new_page(viewport={'width':1440,'height':1100})
            route_files(page,ROOT/'web','/web/')
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            url=ORIGIN+'/web/'
            page.goto(url,wait_until='networkidle')
            page.wait_for_function("document.getElementById('beat-title').textContent.length>0")
            assert page.locator('#run').is_disabled(), 'Static site must not expose a live run button'
            assert page.locator('#dashboard-status').inner_text()!='Checking status…'
            assert page.evaluate('Array.from(document.querySelectorAll(".revision img")).every(i=>i.complete && i.naturalWidth>0)'), 'Revision images must resolve under a subpath'
            index=ROOT/'web'/'published'/'index.json'
            if index.exists():
                entries=json.loads(index.read_text())
                assert page.locator('#archive a[data-guide]').count()==len(entries)
                for entry in entries:
                    page.goto(url+'?guide='+entry['id'],wait_until='networkidle')
                    page.wait_for_function('(id)=>JSON.parse(document.getElementById("record").textContent).id===id',arg=entry['id'])
            path=Path(tempfile.gettempdir())/'council-dashboard-desktop.png'
            page.screenshot(path=str(path))
            page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Mobile overflow'
            mobile=path.with_name('council-dashboard-mobile.png');page.screenshot(path=str(mobile))
            assert not errors, errors
            print(json.dumps({'status':'passed','desktop':str(path),'mobile':str(mobile)}))
            browser.close()

if __name__=='__main__':main()
