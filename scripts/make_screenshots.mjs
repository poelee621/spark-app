// 闪写 Spark · App Store 截图自动生成
// 用法（在 spark-app 根目录）:
//   npm i -D playwright && npx playwright install chromium
//   node scripts/make_screenshots.mjs
// 脚本用 Playwright 无头浏览器在 iPhone 视口渲染真实 App 界面并截图，
// 输出到 fastlane/screenshots/zh-Hans/
//
// 说明:
// - 纯前端 SPA（Capacitor WebView 内容等同网页端），直接渲染 app/ 即可
// - 生成内容走内置 DeepSeek Key（llm.js BUILTIN_KEY），无需任何交互
// - 视口精确匹配 App Store 要求:
//   6.7"=1290x2796, 6.5"=1242x2688, iPad Pro 12.9"=2048x2732 (deviceScaleFactor=1)
// - 6 张: 创作首页 / 公众号结果 / 小红书图文 / 短视频封面 / 会员 / 关于

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.resolve(process.cwd(), 'app');
const OUT = path.resolve(process.cwd(), 'fastlane/screenshots/zh-Hans');
const PORT = 8777;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.json':'application/json', '.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(APP_DIR, p);
  if (!fp.startsWith(APP_DIR) || !fs.existsSync(fp)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function hideSplash(page) {
  await page.evaluate(() => {
    const s = document.querySelector('#splash');
    if (s) s.style.display = 'none';
  });
}

async function shot(page, file) {
  await page.screenshot({ path: path.join(OUT, file) });
  console.log('  ✓', file);
}

async function genAndWait(page, platform, topic, styleIdx = 0) {
  await page.click(`#platRow .chip[data-v="${platform}"]`);
  const styles = await page.$$('#styleRow .chip');
  if (styles[styleIdx]) await styles[styleIdx].click();
  await page.fill('#topic', topic);
  await page.click('#genBtn');
  await page.waitForFunction(() => {
    const wc = document.querySelector('#wcCard');
    const xhs = document.querySelector('#xhsGrid .xhs-item');
    const v = document.querySelector('#videoCard');
    return (wc && wc.style.display !== 'none' && wc.innerHTML.trim()) ||
           (xhs) || (v && v.style.display !== 'none');
  }, null, { timeout: 90000, polling: 500 });
  await sleep(1800); // 等封面图渲染/画廊预生成
}

async function setupViewport(page, w, h) {
  await page.setViewportSize({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await sleep(900);
  await hideSplash(page);
  await sleep(300);
}

async function captureSet(browser, w, h, suffix) {
  const page = await browser.newPage();
  await setupViewport(page, w, h);

  await shot(page, `01_home_${suffix}.png`);

  await genAndWait(page, 'wechat', '三十岁，我退掉了那套学区房', 1);
  await shot(page, `02_wechat_${suffix}.png`);

  await genAndWait(page, 'xhs', '年轻人为什么存不下钱', 0);
  await shot(page, `03_xhs_${suffix}.png`);

  await genAndWait(page, 'video', '三分钟看懂折叠屏值不值得买', 2);
  await shot(page, `04_video_${suffix}.png`);

  await page.click('.tab[data-p="vip"]'); await sleep(700);
  await shot(page, `05_vip_${suffix}.png`);

  await page.click('.tab[data-p="about"]'); await sleep(700);
  await shot(page, `06_about_${suffix}.png`);

  await page.close();
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => server.listen(PORT, r));
  console.log('static server on', PORT);

  const sizes = (process.env.SIZES || '6.7,6.5,12.9').split(',').map(s => s.trim()).filter(Boolean);
  const map = { '6.7': [1290, 2796], '6.5': [1242, 2688], '12.9': [2048, 2732] };

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    for (const s of sizes) {
      if (!map[s]) { console.warn('未知尺寸', s, '跳过'); continue; }
      await captureSet(browser, map[s][0], map[s][1], s);
    }
    console.log('全部截图完成 ->', OUT);
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(e => { console.error('截图失败:', e); process.exit(1); });
