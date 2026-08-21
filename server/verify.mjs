// server/verify.mjs —— 极薄后端：Apple 收据校验 + RevenueCat Webhook 落库
// 零依赖（仅 Node 内置模块）。启动： node server/verify.mjs
// 环境变量： PORT(默认8787) / RC_WEBHOOK_SECRET / APPLE_SHARED_SECRET
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;
const RC_SECRET = process.env.RC_WEBHOOK_SECRET || 'REPLACE_ME';
const STORE = path.join(__dirname, 'entitlements.json');

const load = () => { try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch { return {}; } };
const save = d => fs.writeFileSync(STORE, JSON.stringify(d, null, 2));

async function readBody(req) {
  let b = ''; for await (const c of req) b += c;
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}

// 转发 Apple verifyReceipt（先生产，若返回 21007 沙盒收据则转沙盒）
async function appleVerify(receipt) {
  const body = JSON.stringify({ 'receipt-data': receipt, password: process.env.APPLE_SHARED_SECRET || '' });
  for (const url of ['https://buy.itunes.apple.com/verifyReceipt', 'https://sandbox.itunes.apple.com/verifyReceipt']) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const j = await r.json();
      if (j.status === 0) return { ok: true, raw: j };
      if (j.status === 21007) continue;
      return { ok: false, raw: j };
    } catch (e) { return { ok: false, error: String(e) }; }
  }
  return { ok: false };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // 1) Apple 收据校验（客户端或后端发起）
  if (req.method === 'POST' && url.pathname === '/apple/verify') {
    const { receipt } = await readBody(req);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(await appleVerify(receipt)));
  }

  // 2) RevenueCat 服务端 Webhook：鉴权后写入会员状态
  if (req.method === 'POST' && url.pathname === '/webhook/revenuecat') {
    if (req.headers['authorization'] !== RC_SECRET) { res.statusCode = 401; return res.end('unauthorized'); }
    const evt = await readBody(req);
    const d = evt.event?.data || {};
    const uid = d.app_user_id || d.subscriber?.app_user_id;
    const active = d.entitlements?.pro?.is_active ?? false;
    if (uid) {
      const store = load();
      store[uid] = { active, updated: Date.now(), type: evt.event?.type };
      save(store);
    }
    res.statusCode = 200; return res.end('ok');
  }

  // 3) 查询用户会员状态
  if (req.method === 'GET' && url.pathname.startsWith('/entitlements/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop());
    const store = load();
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ id, active: !!(store[id] && store[id].active) }));
  }

  res.statusCode = 404; res.end('not found');
});

server.listen(PORT, () => console.log('Spark verify server listening on', PORT));
