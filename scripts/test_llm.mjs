// Node 侧 LLM 连通性测试（避开浏览器 CORS，验证 Key/提示词/质量）
// 用法： SPARK_API_KEY=sk-xxx SPARK_PROVIDER=deepseek node scripts/test_llm.mjs
import process from 'node:process';

const PROVIDERS = {
  deepseek: { base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  qwen:     { base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  zhipu:    { base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  openai:   { base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
};

const provider = process.env.SPARK_PROVIDER || 'deepseek';
const apiKey = process.env.SPARK_API_KEY;
const p = PROVIDERS[provider];
if (!apiKey || !p) { console.error('缺少 SPARK_API_KEY 或未知 SPARK_PROVIDER'); process.exit(1); }

const prompt = `你是一名资深中文新媒体编辑。请围绕主题「年轻人为什么不爱存钱」，为微信公众号创作一篇犀利质疑风格的内容包。
严格只返回 JSON：{"titles":["3个标题"],"outline":["步骤1","步骤2"],"body":"正文","golden":"金句"}`;

const res = await fetch(p.base + '/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
  body: JSON.stringify({ model: p.model, messages: [{ role: 'user', content: prompt }], temperature: 0.9 })
});
console.log('HTTP', res.status);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
