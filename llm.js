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
    // 小红书/短视频：返回可直接发布的内容，不是"如何写"的元教程
    const isXhs = plat === 'xhs';
    const isVideo = plat === 'video';
    if (isVideo) {
      return `你是一名资深短视频编导。请围绕主题「${topic}」，创作一条${sname}风格的短视频口播脚本（总时长约60秒）。
要求：必须围绕主题写真实口播内容，绝不能写成"如何拍短视频"的教程。每句话都要口语化、有镜头感、适合直接对着镜头念。
硬性要求：
1. 开场钩子必须直接点出「${topic}」的具体矛盾或反常识点，禁止用"大家好今天我们来聊..."这类废话开头。
2. 干货部分要给出围绕主题的具体信息、案例或观点，不能是"要努力""要坚持"这类空泛口号。
3. 每个镜头台词都必须出现主题关键词或与主题直接相关的内容，禁止脱离主题讲通用人生道理。
4. 严禁使用模板化鸡汤，例如："你比自己以为的更有力量"、"你不需要很厉害才能开始"、"把目标拆小"等。
严格只返回一个 JSON 对象，不要任何解释或 markdown 代码块：
{
  "titles": ["3个短视频爆款标题，口语化、短、有冲击"],
  "hook": "3秒开场钩子（直接抓眼球，禁止废话问候）",
  "script": [
    {"shot": "【钩子 0-3s】", "text": "开场台词，直击主题具体矛盾"},
    {"shot": "【冲突/反转 3-15s】", "text": "制造冲突或抛出反常识观点，紧扣主题"},
    {"shot": "【干货 15-40s】", "text": "核心内容，具体、有信息量、围绕主题"},
    {"shot": "【金句 40-50s】", "text": "一句围绕主题的总结"},
    {"shot": "【引导 50-60s】", "text": "引导点赞/关注/评论"}
  ],
  "golden": "一句可做封面或字幕的金句，禁止空泛口号"
}`;
    }
    // 主题语义判断，用于指导 LLM 按类型生成
    const topicLower = topic.toLowerCase();
    const isComparison = /(区别|差异|异同|不同|比较|对比|versus|和.+还是|与.+的区别|的不同|的异同|vs\s+[^\s]+|[^\s]+\s+vs)/.test(topicLower);
    const isConcept = /(是什么|什么是|怎么理解|科普|介绍|含义|概念|定义|由来|历史|原理|机制|结构|演变|为什么|如何形成|指的是)/.test(topicLower);
    const isOpinion = /(怎么看|如何评价|如何看待|观点|看法|态度|意义|价值|评论|分析|是不是|应不应该|要不要)/.test(topicLower);
    const isScene = /(故事|经历|体验|感受|瞬间|时刻|那天|一次|遇到|想起|回忆|走过|记得|那年)/.test(topicLower);
    let typeGuide = '';
    if (isComparison) {
      typeGuide = `主题类型：「对比型」。请先识别出主题中的两个核心实体A和B，所有内容必须围绕A和B的真实差异生成。标题禁止使用"别被X洗脑""X没你想的那么难""99%的人搞错X""X背后是一盘大棋"等万能句式。干货必须给出具体对比维度，例如"核心问题/核心主张/关键概念/适用场景/历史来源"，不能只是"A和B都好"这种空话。`;
    } else if (isConcept) {
      typeGuide = `主题类型：「概念型」。请先回答这个概念最初是为了解决什么问题，再解释它的核心机制。标题禁止使用"X的真相""X的底层逻辑""三分钟搞懂X"等万能句式。干货必须给出定义、关键概念、例子、常见误解。`;
    } else if (isOpinion) {
      typeGuide = `主题类型：「观点型」。请先梳理事实、观点、利益方，再给出你的判断。标题禁止使用"X没你想的那么难""普通人也能搞定X""X教会我的事"等万能句式。干货必须给出判断框架和反例检验。`;
    } else if (isScene) {
      typeGuide = `主题类型：「场景/经历型」。请从一个具体画面、动作、对话开始写。标题禁止使用"X是一场修行""X教会我的事""慢下来，X会给你答案"等万能句式。干货必须给出如何用细节还原场景的方法。`;
    } else {
      typeGuide = `主题类型：「行动型」。请给出具体可执行步骤。标题禁止使用"搞定X只需3步""X实操手册""新手做X最常踩的5个坑"等万能句式。干货必须是可验证的具体动作，不能是"坚持""努力""相信自己"。`;
    }
    return `你是一名资深中文新媒体编辑。请围绕主题「${topic}」，为${pname}创作一篇${sname}风格的内容包。
${isXhs ? '这是小红书笔记：必须围绕主题写真实、有洞察、有信息量的内容，绝对不能写成"如何写小红书"的教程。' : ''}
${typeGuide}
硬性要求：
1. 标题必须根据主题的具体内容生成，严禁使用任何可以套在任何主题上的万能句式，例如："别再被X洗脑了""X没你想的那么难""99%的人搞错了X""X背后是一盘大棋""普通人也能搞定X""从0到1，X其实就差这一步""X教会我的事""X是一场修行""谢谢你，曾为X停留"。
2. 每个段落、每条痛点、每条干货都必须紧扣主题「${topic}」，要包含具体场景、真实矛盾、可执行动作或知识细节。内容不能通过简单替换主题词就适用于其他主题。
3. 严禁使用任何空泛鸡汤口号，例如但不限于："你比自己以为的更有力量"、"你不需要很厉害才能开始"、"把目标拆小"、"别和别人比，只和昨天的自己比"、"每完成一个小动作都是给未来的自己铺路"、"温柔不是软弱"、"慢，不是落后，是另一种抵达"。
4. 痛点要写出真实困境（带场景或后果），不要写人人都懂的废话。
5. 干货要给出围绕主题的具体内容：知识型给框架/维度/概念，行动型给步骤/动作/反馈方法，不能是"坚持""努力""相信自己"这类抽象词。
6. 正文要有观点、有细节、有信息量，不能只是情绪的重复堆砌。
严格只返回一个 JSON 对象，不要任何解释或 markdown 代码块：
{
  "titles": ["3个吸睛标题"],
  ${isXhs ? '"painPoints": ["3个围绕主题的具体痛点/共鸣点，带真实场景"],\n  "tips": ["4条围绕主题的具体干货（知识型给框架/维度/概念，行动型给步骤/动作）"],' : '"outline": ["提纲步骤1","步骤2","步骤3"],'}
  "body": "正文，用\\n\\n分段，${isXhs ? '300-500字、口语化、可带emoji、必须有观点和细节' : '300-600字'}",
  "golden": "一句围绕主题的金句，禁止空泛口号"
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
      if (plat === 'xhs') {
        return {
          topic, titles: obj.titles,
          painPoints: obj.painPoints || [],
          tips: obj.tips || [],
          body: obj.body || '',
          golden: obj.golden || '',
          plat: 'xhs'
        };
      }
      if (plat === 'video') {
        const hook = obj.hook || '';
        const script = Array.isArray(obj.script) ? obj.script : [];
        const body = hook + '\n\n' + script.map(s => s.shot + ' ' + s.text).join('\n\n');
        return { topic, titles: obj.titles, hook, script, body, golden: obj.golden || '', plat: 'video' };
      }
      return { topic, titles: obj.titles, outline: obj.outline || [], body: obj.body || '', golden: obj.golden || '' };
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error('请求超时，请检查网络或关闭 AI 用规则引擎');
      throw e;
    }
  }
};
