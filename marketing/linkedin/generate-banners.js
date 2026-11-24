// Renders 1200x627 LinkedIn banners for each topic in topics.json.
// Output: next-public/public/linkedin/day-XX.png (served at https://kwickbot.in/linkedin/day-XX.png)
// Run: node marketing/linkedin/generate-banners.js
const fs = require('fs');
const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../../backend/node_modules/puppeteer'));

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'next-public/public/linkedin');
const topics = JSON.parse(fs.readFileSync(path.join(__dirname, 'topics.json'), 'utf8'));
const logo = fs.readFileSync(path.join(ROOT, 'next-public/public/kwickbot-logo.png')).toString('base64');
const logoRev = fs.readFileSync(path.join(ROOT, 'next-public/public/logo-reversed.png')).toString('base64');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function html(t) {
  const dark = t.theme === 'dark';
  const c = dark
    ? { bg: '#2B3D1A', ink: '#FFFFFF', accent: '#B9DB97', sub: '#DCE8CF', kicker: '#8DBF64', phone: '#F5F8EF', grid: 'rgba(185,219,151,0.07)' }
    : { bg: '#EDF2E5', ink: '#1F2E12', accent: '#4F8A2B', sub: '#4A5A3C', kicker: '#4F8A2B', phone: '#FFFFFF', grid: 'rgba(79,138,43,0.08)' };
  const logoSrc = dark ? logoRev : logo;
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:627px;background:${c.bg};font-family:'Plus Jakarta Sans',sans-serif;overflow:hidden;position:relative}
.grid{position:absolute;inset:0;background-image:radial-gradient(${c.grid} 2px,transparent 2px);background-size:28px 28px}
.blob{position:absolute;right:-120px;top:-120px;width:620px;height:620px;border-radius:50%;background:${dark ? 'rgba(143,191,100,0.12)' : 'rgba(141,191,100,0.22)'}}
.left{position:absolute;left:72px;top:64px;bottom:64px;width:640px;display:flex;flex-direction:column}
.logo{height:44px;object-fit:contain;object-position:left;width:200px}
.kicker{margin-top:auto;font-size:18px;font-weight:700;letter-spacing:3px;color:${c.kicker}}
h1{margin-top:14px;font-size:62px;line-height:1.04;font-weight:800;letter-spacing:-2px;color:${c.ink}}
h1 span{color:${c.accent};display:block}
.sub{margin-top:22px;font-size:24px;line-height:1.35;font-weight:500;color:${c.sub};max-width:600px}
.url{margin-top:26px;font-size:20px;font-weight:700;color:${c.ink};opacity:.85}
.phone{position:absolute;right:72px;top:78px;width:340px;height:470px;border-radius:36px;background:${c.phone};box-shadow:0 30px 60px rgba(0,0,0,.25);overflow:hidden;display:flex;flex-direction:column}
.bar{background:#2B3D1A;color:#fff;padding:18px 20px;display:flex;align-items:center;gap:12px;font-weight:700;font-size:17px}
.av{width:36px;height:36px;border-radius:50%;background:#8DBF64;display:flex;align-items:center;justify-content:center;font-weight:800;color:#1F2E12}
.bar small{display:block;font-weight:500;font-size:12px;color:#B9DB97}
.chat{flex:1;background:#ECE5DA;padding:22px 16px;display:flex;flex-direction:column;gap:14px;justify-content:flex-end}
.b{max-width:85%;padding:12px 14px;border-radius:14px;font-size:16px;line-height:1.35;font-weight:500;color:#1F2E12;box-shadow:0 1px 1px rgba(0,0,0,.08)}
.in{align-self:flex-start;background:#fff;border-top-left-radius:4px}
.out{align-self:flex-end;background:#D9FDD3;border-top-right-radius:4px}
.tag{font-size:11px;font-weight:700;color:#4F8A2B;margin-bottom:4px;letter-spacing:.5px}
</style></head><body>
<div class="grid"></div><div class="blob"></div>
<div class="left">
  <img class="logo" src="data:image/png;base64,${logoSrc}">
  <div class="kicker">${esc(t.kicker)}</div>
  <h1>${esc(t.h1)}<span>${esc(t.h2)}</span></h1>
  <div class="sub">${esc(t.sub)}</div>
  <div class="url">kwickbot.in</div>
</div>
<div class="phone">
  <div class="bar"><div class="av">K</div><div>Your Store<small>AI assistant · online</small></div></div>
  <div class="chat">
    ${t.chatIn ? `<div class="b in">${esc(t.chatIn)}</div>` : ''}
    <div class="b out"><div class="tag">KWICKBOT AI</div>${esc(t.chatOut)}</div>
  </div>
</div>
</body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 627, deviceScaleFactor: 1 });
  const only = process.argv[2] ? Number(process.argv[2]) : null;
  for (const t of topics) {
    if (only && t.day !== only) continue;
    await page.setContent(html(t), { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, `day-${String(t.day).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, type: 'png' });
    console.log('wrote', path.relative(ROOT, file));
  }
  await browser.close();
})();
