// 可插拔大模型接口（OpenAI 兼容：DeepSeek / 通义 / 智谱 / OpenAI）
// 配置存于 localStorage('spark_llm')：{provider, apiKey, model, baseUrl}
const LLM = {
  PROVIDERS: {
    deepseek: { name: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    qwen:     { name: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
    zhipu:    { name: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
    openai:   { name: 'OpenAI',   base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
  },
  cfg() {
    try { return JSON.parse(localStorage.getItem('spark_llm') || '{}'); }
    catch (e) { return {}; }
  },
  save(c) { localStorage.setItem('spark_llm', JSON.stringify(c)); },
  clear() { localStorage.removeItem('spark_llm'); },
  enabled() {
    const c = this.cfg();
    return !!(c.apiKey && c.provider && this.PROVIDERS[c.provider]);
  },
  buildPrompt(plat, style, topic) {
    const pname = { wechat: '微信公众号', xhs: '小红书', video: '短视频口播' }[plat] || '新媒体';
    const sname = {
      sharp: '犀利质疑、带思辨锋芒，敢于质疑共识',
      warm: '温情走心、有共鸣、有画面感',
      practical: '干货实操、可直接照做、有步骤感',
      suspense: '悬念反转、勾起好奇心',
      humor: '幽默吐槽、轻松搞笑、段子化表达',
      inspiring: '励志正能量、激励人心、有行动感',
      science: '硬核科普、逻辑严谨、涨知识',
      literary: '文艺随笔、有诗意、含蓄有画面感'
    }[style] || '自然流畅';
    // 公众号：要求完整文章（带小节标题）；其他平台：轻量内容包
    if (plat === 'wechat') {
      return `你是一名资深中文新媒体编辑。请围绕主题「${topic}」，为${pname}写一篇${sname}风格的完整文章（总计不少于 1000 字）。
严格只返回一个 JSON 对象，不要任何解释或 markdown 代码块：
{
  "titles": ["3个吸睛标题"],
  "intro": "引言，2-3句，有钩子",
  "sections": [{"h": "小节小标题", "p": "小节正文，220-300字"}, {"h": "小节小标题", "p": "小节正文，220-300字"}, {"h": "小节小标题", "p": "小节正文，220-300字"}, {"h": "小节小标题", "p": "小节正文，220-300字"}],
  "outro": "结尾，2-3句",
  "golden": "一句可做封面的金句"
}`;
    }
    return `你是一名资深中文新媒体编辑。请围绕主题「${topic}」，为${pname}创作一篇${sname}风格的内容包。
严格只返回一个 JSON 对象，不要任何解释或 markdown 代码块：
{
  "titles": ["3个吸睛标题"],
  "outline": ["提纲步骤1","步骤2","步骤3"],
  "body": "正文，用\\n\\n分段，300-600字",
  "golden": "一句可做封面的金句"
}`;
  },
  async call(plat, style, topic) {
    const c = this.cfg();
    const p = this.PROVIDERS[c.provider] || this.PROVIDERS.deepseek;
    const base = c.baseUrl || p.base;
    const model = c.model || p.model;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000); // 12 秒超时，iOS 移动网络必须设上限
    try {
      const res = await fetch(base + '/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: this.buildPrompt(plat, style, topic) }],
          temperature: 0.9,
          response_format: { type: 'json_object' }
        })
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      const text = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
      const obj = JSON.parse(text);
      if (!obj.titles) throw new Error('返回格式异常');
      // 公众号完整文章结构
      if (obj.sections) {
        let body = (obj.intro || '') + '\n\n';
        obj.sections.forEach(s => { body += '## ' + s.h + '\n\n' + s.p + '\n\n'; });
        body += obj.outro || '';
        return {
          topic, titles: obj.titles,
          sections: obj.sections,
          intro: obj.intro || '', outro: obj.outro || '',
          body: body.trim(), golden: obj.golden || ''
        };
      }
      return { topic, titles: obj.titles, outline: obj.outline || [], body: obj.body || '', golden: obj.golden || '' };
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error('请求超时，请检查网络或关闭 AI 用规则引擎');
      throw e;
    }
  }
};
