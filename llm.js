// 可插拔大模型接口（OpenAI 兼容：DeepSeek / 通义 / 智谱 / OpenAI）
// 配置存于 localStorage('spark_llm')：{provider, apiKey, model, baseUrl}
// 默认：所有用户走「平台 AI 代理」（Cloudflare Worker，Key 在服务端），无需填 Key。
// 进阶：用户可在「关于」页填自带 Key，通过 x-spark-key 头传给 Worker 覆盖平台 Key。
// 代理未部署时，回退为「用户自带 Key」或规则引擎。

// ===== 内置 DeepSeek Key（默认直连，国内网络最快最稳）=====
// 直连 api.deepseek.com 在国内无需 VPN；Cloudflare workers.dev 在手机移动网络下不稳定，仅作回退。
// 发布前把下面的占位符替换为你的 DeepSeek API Key（sk-...），替换后所有用户默认走直连。
// ⚠️ 风险：Key 内置于前端可被抓包看到，请控制 DeepSeek 账户余额/用量；正式上架前建议换国内 Serverless 代理。
const BUILTIN_KEY = 'REPLACE_WITH_DEEPSEEK_KEY';

// ===== 平台 AI 代理（Cloudflare Worker，仅当未内置 Key 时作为回退）=====
const PROXY_URL = 'https://spark-deepseek-proxy.1012425851.workers.dev/v1/chat/completions';
const PROXY_PLACEHOLDER = /YOURSUB|YOUR-WORKER|example\.com/i;

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
  builtinKey() {
    return (BUILTIN_KEY && !/REPLACE_WITH/.test(BUILTIN_KEY)) ? BUILTIN_KEY : '';
  },
  proxyOn() { return !!(PROXY_URL && !PROXY_PLACEHOLDER.test(PROXY_URL)); },
  enabled() {
    if (this.builtinKey()) return true; // 内置 Key 直连，所有用户默认走大模型
    const c = this.cfg();
    return !!(c.apiKey && c.provider && this.PROVIDERS[c.provider]);
  },

  // ===== 通用「反模板」宪法（所有平台共用，作为 system 消息下发） =====
  SYSTEM: `你是一名资深中文内容主编，常年写公众号、小红书、短视频脚本。你的输出必须像真人写的、有观点、有具体信息，绝不是 AI 罐头文。

【铁律】
1. 绝不套模板。检验标准（必须执行）：把主题词换成另一个毫不相关的主题，如果某句话依然通顺且成立，那它就是模板句，必须重写。每句话都必须依赖本主题的实体、事实、场景或矛盾，换主题就不成立。
2. 观点必须有支撑：具体的人 / 事 / 数据 / 机制 / 利益链条 / 真实矛盾，禁止用「坚持、努力、相信自己、温柔、慢下来、沉淀、格局」这类抽象词填空。
3. 标题必须来自主题本身的具体矛盾或反常识点，禁止万能句式（见下方黑名单）。
4. 文风 = 语气与切入角度，不是换一批固定句式。同一主题在不同风格下，具体内容必须因风格而变，不能只是同一条结论前面加不同形容词。
5. 真诚、有锋芒、像活人写的。允许有偏见、有具体指代、有真实细节，不要四平八稳的总结。

【标题万能句式黑名单】（命中任意即判为模板，必须重写）
别再被X洗脑了 / X没你想的那么难 / 99%的人搞错了X / X背后是一盘大棋
普通人也能搞定X / 从0到1，X其实就差这一步 / X教会我的事 / X是一场修行
谢谢你，曾为X停留 / X，你不必只选一个 / 一张表讲清X / 搞定X只需3步
X实操手册(建议收藏) / 新手做X最常踩的5个坑 / X的真相 / X的底层逻辑
三分钟搞懂X / X，可能根本不重要 / 关于X，我们可能都想错了 / 为什么我不建议年轻人X
X到底有多香 / 被低估的X / 这才是X的正确打开方式

【正文 / 金句鸡汤黑名单】
你比自己以为的更有力量 / 你不需要很厉害才能开始 / 把目标拆小
别和别人比，只和昨天的自己比 / 每完成一个小动作都是给未来的自己铺路
温柔不是软弱 / 慢，不是落后，是另一种抵达 / 允许自己慢一点
你不是落后，你只是在用自己的节奏生长 / 真正的成长是… / 人生没有白走的路`,

  // ===== 主题语义分析（指导生成，避免知识型被写成行动型） =====
  _typeGuide(topic) {
    const tl = (topic || '').toLowerCase();
    const isCmp = /(区别|差异|异同|不同|比较|对比|和.+还是|与.+的区别|的不同|的异同|\bvs\b| versus )/.test(tl);
    const isCpt = /(是什么|什么是|怎么理解|科普|介绍|含义|概念|定义|由来|历史|原理|机制|结构|演变|如何形成|指的是)/.test(tl);
    const isOpinion = /(怎么看|如何评价|如何看待|观点|看法|意义|价值|评论|分析|是不是|应不应该|要不要|该不该|为什么|为何)/.test(tl);
    const isScene = /(故事|经历|体验|感受|瞬间|时刻|那天|一次|遇到|想起|回忆|走过|记得|那年|我的)/.test(tl);
    if (isCmp) return '主题类型：对比型。先识别两个核心实体 A、B，内容必须围绕 A 与 B 在「核心问题 / 核心主张 / 关键概念 / 适用场景 / 来源」上的真实差异展开，禁止只说「都好」。';
    if (isOpinion) return '主题类型：观点型。先列事实与利益方，再给带框架的判断与反例检验，不站队喊口号。';
    if (isCpt) return '主题类型：概念型。先讲这个概念最初为了解决什么问题而存在，再拆核心机制，给「定义 + 关键概念 + 例子 + 常见误解」。';
    if (isScene) return '主题类型：场景 / 经历型。从具体画面、动作、对话起笔，用细节还原，不抒情空转。';
    return '主题类型：行动型。给可验证的具体步骤与反馈方法，禁止「坚持 / 努力」填空。';
  },

  buildPrompt(plat, style, topic) {
    const pname = { wechat: '微信公众号', xhs: '小红书', video: '短视频口播' }[plat] || '新媒体';
    const sname = {
      sharp: '犀利质疑——带思辨锋芒，敢于质疑共识、戳破流行叙事',
      warm: '温情走心——有共鸣、有画面感、不说教',
      practical: '干货实操——可直接照做、有步骤感、有可验证动作',
      suspense: '悬念反转——先抛反常现象再揭底层逻辑',
      humor: '幽默吐槽——轻松搞笑、段子化、带自嘲',
      inspiring: '励志但不鸡汤——用真实路径和行动替代空喊口号',
      science: '硬核科普——逻辑严谨、有概念有机制有例子',
      literary: '文艺随笔——有诗意、含蓄有画面、不矫情'
    }[style] || '自然流畅';
    const typeGuide = this._typeGuide(topic);

    if (plat === 'wechat') {
      return `请围绕主题「${topic}」，为${pname}写一篇${sname}风格的完整文章（总计不少于 1000 字，4~5 个小节，每节 200~280 字）。
${typeGuide}
要求：开篇用具体场景或反常识钩子；每节有小标题；论点必须带本主题的具体事实 / 案例 / 数据 / 机制，禁止抽象口号；结尾给一句可做封面的金句。
严格只返回一个 JSON 对象，不要任何解释或 markdown 代码块：
{
  "theme": "从下面 10 个英文 key 里选一个最贴合本主题的：tech(科技) / finance(财经) / emotion(情感) / food(美食) / travel(旅行) / career(职场) / knowledge(知识) / health(健康) / fashion(时尚) / life(生活)",
  "titles": ["3个来自主题具体矛盾的标题，禁止万能句式黑名单里的任何句式"],
  "intro": "引言 2~3 句，有钩子",
  "sections": [
    {"h": "小节小标题（具体，非套话）", "p": "小节正文 200~280 字，带本主题具体信息"},
    {"h": "小节小标题", "p": "小节正文 200~280 字"},
    {"h": "小节小标题", "p": "小节正文 200~280 字"},
    {"h": "小节小标题", "p": "小节正文 200~280 字"}
  ],
  "outro": "结尾 2~3 句",
  "golden": "一句可做封面的金句（具体、有锋芒，禁止空泛口号）"
}
注意：不要返回任何 HTML 字段（如 coverHtml），封面由客户端按 theme 自动渲染。`;
    }
    if (plat === 'video') {
      return `请围绕主题「${topic}」，创作一条${sname}风格的短视频口播脚本（约 60 秒）。
${typeGuide}
要求：开场钩子直接点本主题的具体矛盾或反常识，禁止「大家好今天我们来聊」废话开头；干货给具体信息 / 案例 / 观点；每句都围绕主题，禁止脱离主题讲通用人生道理；禁止模板鸡汤。
严格只返回一个 JSON 对象，不要任何解释或 markdown 代码块：
{
  "theme": "从下面 10 个英文 key 里选一个最贴合本主题的：tech(科技) / finance(财经) / emotion(情感) / food(美食) / travel(旅行) / career(职场) / knowledge(知识) / health(健康) / fashion(时尚) / life(生活)",
  "titles": ["3个爆款标题，口语、短、有冲击，禁止万能句式黑名单"],
  "hook": "3秒开场钩子（直击主题具体矛盾）",
  "script": [
    {"shot": "【钩子 0-3s】", "text": "开场台词，紧扣主题"},
    {"shot": "【冲突 / 反转 3-15s】", "text": "制造冲突或抛反常识观点，紧扣主题"},
    {"shot": "【干货 15-40s】", "text": "核心内容，具体有信息量"},
    {"shot": "【金句 40-50s】", "text": "一句围绕主题的总结"},
    {"shot": "【引导 50-60s】", "text": "引导点赞 / 关注 / 评论"}
  ],
  "golden": "一句可做封面 / 字幕的金句（具体，禁止空泛）"
}
注意：不要返回任何 HTML 字段（如 thumbHtml），封面由客户端按 theme 自动渲染。`;
    }
    // 小红书
    return `请围绕主题「${topic}」，为${pname}创作一篇${sname}风格的内容包。
${typeGuide}
这是小红书笔记：必须写真实、有洞察、有信息量的内容，绝对不能写成「如何写小红书」的教程。
要求：标题来自主题具体矛盾；痛点带真实场景 / 后果；干货给围绕主题的具体动作或知识（知识型给框架 / 维度 / 概念，行动型给步骤）；正文有观点有细节；全部禁止万能句式与鸡汤黑名单。
严格只返回一个 JSON 对象，不要任何解释或 markdown 代码块：
{
  "theme": "从下面 10 个英文 key 里选一个最贴合本主题的：tech(科技) / finance(财经) / emotion(情感) / food(美食) / travel(旅行) / career(职场) / knowledge(知识) / health(健康) / fashion(时尚) / life(生活)",
  "titles": ["3个吸睛标题，禁止万能句式黑名单"],
  "painPoints": ["3个围绕主题的具体痛点 / 共鸣点，带真实场景"],
  "tips": ["3条围绕主题的具体干货（知识型给框架 / 维度 / 概念，行动型给步骤 / 动作）"],
  "body": "正文，用\\n\\n分段，300~500字，口语化可带 emoji，必须有观点和细节",
  "golden": "一句围绕主题的金句，禁止空泛口号"
}
注意：不要返回任何 HTML 字段（如 cardsHtml），4 张图文卡由客户端按 theme 自动渲染（封面卡用 titles[0]、痛点卡用 painPoints、干货卡用 tips、金句卡用 golden）。`;
  },

  async call(plat, style, topic) {
    const c = this.cfg();
    // 有内置 Key → 默认直连 api.deepseek.com（国内最快）；否则回退 Cloudflare Worker 代理
    const useProxy = this.proxyOn() && !this.builtinKey();
    const p = this.PROVIDERS[c.provider] || this.PROVIDERS.deepseek;
    const base = c.baseUrl || p.base;
    const model = c.model || p.model;

    // 单次请求尝试（独立 AbortController，便于重试时重置超时）
    const attempt = async (timeoutMs) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        let endpoint, headers = { 'Content-Type': 'application/json' };
        if (useProxy) {
          endpoint = PROXY_URL;
          // 用户若在「关于」页填了自带 key，通过 header 传给 Worker（Worker 会改用它）
          if (c.apiKey) headers['x-spark-key'] = c.apiKey;
        } else {
          endpoint = base + '/chat/completions';
          // 优先用户自带 Key，否则用内置 Key（直连 DeepSeek，国内无墙无需代理）
          const key = c.apiKey || this.builtinKey();
          if (!key) throw new Error('未配置 AI');
          headers['Authorization'] = 'Bearer ' + key;
        }
        const res = await fetch(endpoint, {
          method: 'POST',
          signal: ctrl.signal,
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: this.SYSTEM },
              { role: 'user', content: this.buildPrompt(plat, style, topic) }
            ],
            temperature: 0.85,
            response_format: { type: 'json_object' }
          })
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error('API ' + res.status);
        const data = await res.json();
        const text = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
        const obj = JSON.parse(text);
        if (!obj.titles) throw new Error('返回格式异常');
        // 统一包装
        const out = { topic, titles: obj.titles, golden: obj.golden || '', plat, source: 'ai' };
        if (obj.sections) {
          out.sections = obj.sections;
          out.intro = obj.intro || '';
          out.outro = obj.outro || '';
          let body = (obj.intro || '') + '\n\n';
          obj.sections.forEach(s => { body += '## ' + s.h + '\n\n' + s.p + '\n\n'; });
          body += obj.outro || '';
          out.body = body.trim();
        } else if (plat === 'xhs') {
          out.painPoints = obj.painPoints || [];
          out.tips = obj.tips || [];
          out.body = obj.body || '';
        } else if (plat === 'video') {
          out.hook = obj.hook || '';
          out.script = Array.isArray(obj.script) ? obj.script : [];
          out.body = out.hook + '\n\n' + out.script.map(s => s.shot + ' ' + s.text).join('\n\n');
        } else {
          out.outline = obj.outline || [];
          out.body = obj.body || '';
        }
        // 主题（封面由客户端 CoverEngine 按 theme 渲染，不再依赖大模型吐 HTML）
        if (obj.theme) out.theme = obj.theme;
        return out;
      } catch (e) {
        clearTimeout(timer);
        throw e;
      }
    };

    // 超时 60s（移动网络下长文生成需要时间）；超时或 5xx 自动重试一次（Worker 冷启动首包偏慢）
    let lastErr;
    for (let i = 0; i < 2; i++) {
      try {
        return await attempt(60000);
      } catch (e) {
        lastErr = e;
        const retryable = e.name === 'AbortError' || (e.message || '').startsWith('API 5');
        if (!retryable) break;
      }
    }
    if (lastErr && lastErr.name === 'AbortError') {
      throw new Error('请求超时，请检查网络或清除 Key 用规则引擎');
    }
    throw lastErr;
  }
};
