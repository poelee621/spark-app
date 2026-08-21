// 闪写 Spark · 订阅校验后端（Cloudflare Worker，零依赖、免费额度巨大）
// 部署：wrangler login && wrangler deploy  → 得到一个 *.workers.dev 公网 URL
// 用途：接 RevenueCat Webhook，把会员状态落库，供 App 查询解锁。
//
// 端点：
//   POST /apple/verify        转发 Apple verifyReceipt（沙盒+生产），做收据校验
//   POST /webhook/revenuecat  接收 RC 服务端 Webhook（Bearer 共享密钥鉴权），落库会员状态
//   GET  /entitlements/:id    查询某用户会员状态
//
// 环境变量（Dashboard / wrangler secret）：
//   APPLE_SHARED_SECRET  Apple 共享密钥
//   RC_WEBHOOK_SECRET    RevenueCat Webhook 共享密钥
// 可选 KV 绑定 SPARK_KV：持久化会员状态；未绑定时降级为内存存储（演示用，不跨实例）

const memory = new Map(); // 无 KV 时的降级存储

async function storeEntitlement(env, userId, data) {
  const key = `ent:${userId}`;
  const payload = JSON.stringify({ ...data, updatedAt: Date.now() });
  if (env.SPARK_KV) {
    await env.SPARK_KV.put(key, payload);
  } else {
    memory.set(key, payload);
  }
}

async function getEntitlement(env, userId) {
  const key = `ent:${userId}`;
  if (env.SPARK_KV) {
    const v = await env.SPARK_KV.get(key);
    return v ? JSON.parse(v) : null;
  }
  const v = memory.get(key);
  return v ? JSON.parse(v) : null;
}

async function appleVerify(receiptData, password, sandbox) {
  const endpoint = sandbox
    ? 'https://sandbox.itunes.apple.com/verifyReceipt'
    : 'https://buy.itunes.apple.com/verifyReceipt';
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'receipt-data': receiptData, password }),
  });
  return resp.json();
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      // Apple 收据校验
      if (request.method === 'POST' && path === '/apple/verify') {
        const { receiptData, sandbox } = await request.json();
        if (!receiptData) return json({ error: 'missing receiptData' }, 400, cors);
        const result = await appleVerify(receiptData, env.APPLE_SHARED_SECRET || '', !!sandbox);
        return json(result, 200, cors); // status 0 = 有效
      }

      // RevenueCat 服务端 Webhook
      if (request.method === 'POST' && path === '/webhook/revenuecat') {
        const auth = request.headers.get('Authorization') || '';
        const secret = env.RC_WEBHOOK_SECRET || '';
        if (secret && auth !== `Bearer ${secret}`) {
          return json({ error: 'unauthorized' }, 401, cors);
        }
        const event = await request.json();
        const userId = event?.event?.app_user_id || event?.app_user_id;
        if (userId) {
          await storeEntitlement(env, userId, {
            entitlements: event?.event?.entitlements || {},
            productId: event?.event?.product_id || null,
            type: event?.event?.type || null,
            raw: event,
          });
        }
        return json({ ok: true }, 200, cors);
      }

      // 查询会员状态
      if (request.method === 'GET' && path.startsWith('/entitlements/')) {
        const userId = decodeURIComponent(path.split('/')[2] || '');
        if (!userId) return json({ error: 'missing userId' }, 400, cors);
        const ent = await getEntitlement(env, userId);
        return json(ent || { found: false }, 200, cors);
      }

      return json({ error: 'not found' }, 404, cors);
    } catch (e) {
      return json({ error: String(e) }, 500, cors);
    }
  },
};
