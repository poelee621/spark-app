// 闪写 Spark · 平台 AI 代理（Cloudflare Worker）
// 作用：把 DeepSeek Key 藏在服务端，App 直接调本 Worker，所有用户无需填 Key。
// 安全：Key 通过 `wrangler secret put DEEPSEEK_API_KEY` 设置，绝不在代码里出现。
// 限流：按客户端 IP 每日配额（需绑定 KV 命名空间 RATE）。不绑 KV 也能跑，只是不限流。

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 预检（GitHub Pages 浏览器演示需要；原生 App WebView 不受影响）
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, authorization, x-spark-key',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed', message: 'use POST' }, 405);
    }

    // 选 Key：用户自带 key（x-spark-key 头）优先；否则用平台 key（服务端 secret）
    const userKey = request.headers.get('x-spark-key');
    const apiKey = (userKey && userKey.trim()) ? userKey.trim() : env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return json({ error: 'proxy_not_configured', message: '平台未配置 AI Key' }, 500);
    }

    // 限流：每 IP 每天上限（防止被刷爆预算）
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const day = new Date().toISOString().slice(0, 10);
    const rlKey = 'rl:' + ip + ':' + day;
    const LIMIT = 60; // 每 IP 每天调用上限，按需调整
    if (env.RATE) {
      let used = 0;
      try { used = parseInt(await env.RATE.get(rlKey) || '0', 10) || 0; } catch (e) {}
      if (used >= LIMIT) {
        return json({ error: 'rate_limited', message: '今日调用次数已达上限，明天再来' }, 429);
      }
      ctx.waitUntil(env.RATE.put(rlKey, String(used + 1), { expirationTtl: 86400 }));
    }

    // 转发到 DeepSeek（OpenAI 兼容接口）
    const upstream = 'https://api.deepseek.com/chat/completions';
    const body = await request.text();
    let upstreamResp;
    try {
      upstreamResp = await fetch(upstream, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'Accept': 'application/json'
        },
        body
      });
    } catch (e) {
      return json({ error: 'upstream_error', message: String(e) }, 502);
    }

    const respBody = await upstreamResp.text();
    return new Response(respBody, {
      status: upstreamResp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, authorization, x-spark-key'
      }
    });
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
