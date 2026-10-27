"""Render the actual webpage at deterministic times for agent image review."""
from pathlib import Path
from urllib.parse import unquote, urlparse
import mimetypes

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'http://council.local'


def route_files(page, folder, prefix='/'):
    """Serve a folder through request interception, so no local socket or server is needed."""
    folder = folder.resolve()
    page.route('**/*', lambda route: route.abort())  # Captures never depend on outside network.
    def handle(route):
        path = unquote(urlparse(route.request.url).path)
        if not path.startswith(prefix) or '\0' in path:
            return route.fulfill(status=404, body='')
        target = (folder / path[len(prefix):]).resolve()
        if target.is_dir():
            target = target / 'index.html'
        if not target.is_relative_to(folder) or not target.is_file():
            return route.fulfill(status=404, body='')
        route.fulfill(status=200, body=target.read_bytes(), headers={'Cache-Control': 'no-store'},
                      content_type=mimetypes.guess_type(target.name)[0] or 'application/octet-stream')
    page.route(ORIGIN + '/**', handle)


def launch(p):
    """Prefer Chromium (bundled, then installed Chrome); fall back to WebKit where Chromium cannot start.
    Every launch uses a temporary profile, never the user's browser session."""
    options = []
    if Path(p.chromium.executable_path).exists():
        options.append(('chromium', None))
    if Path('/Applications/Google Chrome.app').exists():
        options.append(('chromium', 'chrome'))
    options.append(('webkit', None))
    errors = []
    for name, channel in options:
        try:
            kind = getattr(p, name)
            return kind.launch(headless=True, channel=channel) if channel else kind.launch(headless=True)
        except Exception as error:
            errors.append(f'{name}: {str(error).splitlines()[0]}')
    raise RuntimeError('No browser could start: ' + '; '.join(errors))


def capture(scene, directory, research=None, provider='fixture'):
    from playwright.sync_api import sync_playwright
    directory.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = launch(p)
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 1050}, device_scale_factor=1)
            route_files(page, ROOT / 'web')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(ORIGIN + '/', wait_until='networkidle')
            page.add_style_tag(content='html {scroll-behavior:auto!important}')
            page.wait_for_function('window.CouncilScene && document.getElementById("beat-title").textContent.length > 0')
            if research:
                page.evaluate('(record)=>show(record)', {'id':'capture', 'scene':scene, 'research':research,
                    'provider':provider, 'status':'running', 'checks':[], 'revisions':[]})
            page.evaluate('(s)=>{CouncilScene.load(s);document.getElementById("title").textContent=s.title;document.getElementById("subtitle").textContent=s.subtitle;document.getElementById("takeaway").textContent=s.takeaway;}', scene)
            checks = page.evaluate('CouncilScene.checks()')
            interaction = page.evaluate('''() => {
                const slider=document.getElementById('mass'); slider.value='0';
                slider.dispatchEvent(new Event('input'));
                const zero=CouncilScene.getState().mass===0 && parseFloat(document.getElementById('bend-value').textContent)===0;
                slider.value='1'; slider.dispatchEvent(new Event('input'));
                const full=CouncilScene.getState().mass===1 && parseFloat(document.getElementById('bend-value').textContent)>0;
                CouncilScene.seek(1,0);
                const noMass=slider.disabled && slider.value==='0' && document.getElementById('mass-value').textContent==='0.00';
                CouncilScene.seek(11,1); const first=document.getElementById('universe').toDataURL();
                CouncilScene.seek(2,0); CouncilScene.seek(11,1);
                return {zero,full,noMass:noMass && !slider.disabled && slider.value==='1',deterministic:first===document.getElementById('universe').toDataURL()};
            }''')
            checks.extend({'name':name,'pass':value} for name,value in [
                ('Zero-mass control removes the modeled effect',interaction['zero']),
                ('Mass control updates the rendered model',interaction['full']),
                ('No-mass step shows zero and restores the chosen mass afterward',interaction['noMass']),
                ('Seeking reproduces identical canvas pixels',interaction['deterministic'])])
            page.evaluate('(s)=>CouncilScene.load(s)',scene)
            frames = []
            # Ordered samples include within-beat motion and a mobile frame.
            samples = [(1,0),(9,1),(11,1),(18,2)]
            for i,(time,beat) in enumerate(samples):
                if i==3 and scene.get('kind','light-bending')!='light-bending':
                    page.evaluate("() => {const s=document.getElementById('distance');s.value='2.5';s.dispatchEvent(new Event('input'));}")
                page.evaluate('([t,b])=>CouncilScene.seek(t,b)', [time,beat])
                path = directory/f'frame-{i+1}.png'
                page.locator('.workspace').screenshot(path=str(path))
                frames.append(path)
            page.set_viewport_size({'width':390,'height':844})
            page.evaluate('CouncilScene.seek(18,2)')
            # A single viewport avoids Chromium full-page compositor tiling artifacts.
            page.set_viewport_size({'width':390,'height':1800})
            path=directory/'mobile.png'
            page.locator('.workspace').screenshot(path=str(path),animations='disabled')
            frames.append(path)
            page.set_viewport_size({'width':390,'height':844})
            page.evaluate('window.scrollTo(0,0)')
            overview=directory/'mobile-overview.png'
            page.screenshot(path=str(overview),animations='disabled')
            frames.append(overview)
            checks.append({'name':'Mobile page fits viewport', 'pass': page.evaluate('document.documentElement.scrollWidth <= innerWidth')})
            checks.append({'name':'Renderer has no JavaScript errors', 'pass':not errors})
            if errors:
                raise RuntimeError('Renderer errors: '+ '; '.join(errors))
            return frames, checks
        finally:
            browser.close()
