// 封面主题引擎 v1.0 —— 按主题渲染有设计感的封面/卡片（HTML → html2canvas → PNG）
// 不依赖任何外部 CSS；所有样式内联，确保 html2canvas 可稳定转图。
// 主题配色随主题切换，不再是单一红白；每类含渐变底 + 光晕 + 主题水印 + 装饰 SVG。
(function (global) {
  'use strict';

  // 10 类主题：label 中文名 / g 渐变(深→浅) / accent 点缀色 / ink 暗底上的字色
  //            / tint 亮卡第二色 / icon 主题图标 / motif 装饰 SVG
  var THEMES = {
    tech: {
      label: '科技', g: ['#0b1f3a', '#1b6ca8'], accent: '#38e8ff', ink: '#eafaff', tint: '#e8f6ff',
      icon: '🤖',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#38e8ff" stroke-width="1.2" opacity="0.5"><circle cx="40" cy="40" r="2.5"/><circle cx="80" cy="40" r="2.5"/><circle cx="120" cy="40" r="2.5"/><circle cx="40" cy="80" r="2.5"/><circle cx="80" cy="80" r="2.5"/><circle cx="120" cy="80" r="2.5"/><circle cx="40" cy="120" r="2.5"/><circle cx="80" cy="120" r="2.5"/><circle cx="120" cy="120" r="2.5"/></g><path d="M150 150 L175 150 L175 125" stroke="#38e8ff" stroke-width="2.5" fill="none" opacity="0.6"/></svg>'
    },
    finance: {
      label: '财经', g: ['#06281f', '#0f7a52'], accent: '#ffd166', ink: '#eafff5', tint: '#e9fbf2',
      icon: '💰',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g fill="#ffd166" opacity="0.55"><rect x="60" y="120" width="18" height="50" rx="3"/><rect x="91" y="95" width="18" height="75" rx="3"/><rect x="122" y="70" width="18" height="100" rx="3"/><rect x="153" y="48" width="18" height="122" rx="3"/></g></svg>'
    },
    emotion: {
      label: '情感', g: ['#3a1c4f', '#b03a6e'], accent: '#ffb3d1', ink: '#fff0f6', tint: '#fdeef5',
      icon: '💗',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#ffb3d1" stroke-width="2" opacity="0.5"><circle cx="80" cy="90" r="38"/><circle cx="130" cy="90" r="38"/></g></svg>'
    },
    food: {
      label: '美食', g: ['#3c1a08', '#d2691e'], accent: '#ffd27a', ink: '#fff6ec', tint: '#fdf1e3',
      icon: '🍜',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#ffd27a" stroke-width="2" opacity="0.5"><circle cx="100" cy="100" r="56"/><circle cx="100" cy="100" r="36"/><circle cx="100" cy="100" r="16"/></g></svg>'
    },
    travel: {
      label: '旅行', g: ['#06324a', '#1f9e8f'], accent: '#8be9ff', ink: '#eafcff', tint: '#e6f8f6',
      icon: '✈️',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g fill="#8be9ff" opacity="0.5"><path d="M10 170 L70 110 L100 130 L150 80 L190 110 L190 170 Z"/></g></svg>'
    },
    career: {
      label: '职场', g: ['#1a1a40', '#4b3fbb'], accent: '#b6a8ff', ink: '#f1efff', tint: '#efeefc',
      icon: '💼',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#b6a8ff" stroke-width="2.5" opacity="0.55"><path d="M55 140 L100 95 L145 140"/><path d="M100 95 L100 55"/><path d="M88 67 L100 55 L112 67"/></g></svg>'
    },
    knowledge: {
      label: '知识', g: ['#1c2b4a', '#3b5bdb'], accent: '#8fb6ff', ink: '#eef3ff', tint: '#eaefff',
      icon: '📚',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g stroke="#8fb6ff" stroke-width="3" opacity="0.5"><line x1="50" y1="70" x2="150" y2="70"/><line x1="50" y1="90" x2="150" y2="90"/><line x1="50" y1="110" x2="150" y2="110"/><line x1="50" y1="130" x2="120" y2="130"/></g></svg>'
    },
    health: {
      label: '健康', g: ['#0d3a2e', '#2faa6a'], accent: '#b8ffd9', ink: '#eafff2', tint: '#e7fbf0',
      icon: '🌿',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g fill="#b8ffd9" opacity="0.5"><path d="M100 60 C70 90 70 140 100 160 C130 140 130 90 100 60 Z"/></g></svg>'
    },
    fashion: {
      label: '时尚', g: ['#3a1530', '#c94f7c'], accent: '#ffc2dd', ink: '#fff0f6', tint: '#fdebf2',
      icon: '👜',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#ffc2dd" stroke-width="2" opacity="0.5"><rect x="70" y="70" width="60" height="60" rx="6" transform="rotate(45 100 100)"/></g></svg>'
    },
    life: {
      label: '生活', g: ['#3a2a1a', '#c98a4a'], accent: '#ffe0b8', ink: '#fff6ec', tint: '#fbf1e4',
      icon: '🏠',
      motif: '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#ffe0b8" stroke-width="2" opacity="0.5"><rect x="55" y="80" width="40" height="40" rx="4"/><rect x="105" y="80" width="40" height="40" rx="4"/><rect x="80" y="130" width="40" height="40" rx="4"/></g></svg>'
    }
  };

  var DEFAULT_THEME = 'life';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function themeOf(key) { return THEMES[key] || THEMES[DEFAULT_THEME]; }

  // 主题识别：优先用 AI 返回的 theme，否则按关键词兜底
  function detectTheme(topic) {
    var t = (topic || '').toLowerCase();
    var map = [
      ['tech', /(科技|数码|ai|人工智能|软件|代码|程序|互联网|芯片|新能源|电池|算法|app|应用|数码|电脑|手机|机器|智能)/],
      ['finance', /(财经|理财|存钱|股票|基金|投资|创业|副业|赚钱|省钱|工资|收入|房贷|房价|经济|消费|信用卡|通胀|财富)/],
      ['emotion', /(情感|爱情|恋爱|婚姻|关系|前任|心态|治愈|孤独|焦虑|emo|委屈|原生|家庭|婆媳|异地)/],
      ['food', /(美食|吃|餐厅|做菜|探店|菜品|料理|烘焙|咖啡|奶茶|减脂餐|火锅|小吃|食谱|胃|饭)/],
      ['travel', /(旅行|旅游|风景|攻略|露营|自驾|徒步|民宿|机票|签证|打卡|出片|海岛|雪山|云南|西藏|新疆|海南|青海|贵州|川西|丽江|大理|西湖|故宫|环球影城|迪士尼|出去玩|去.*游|去.*玩)/],
      ['career', /(职场|工作|上班|面试|晋升|跳槽|简历|效率|副业|同事|老板|述职|考证|考公|考研|offer)/],
      ['knowledge', /(知识|学习|读书|认知|思维|成长|干货|方法论|逻辑|原理|概念|科普|历史|心理|哲学)/],
      ['health', /(健康|健身|养生|睡眠|减肥|运动|跑步|瑜伽|体检|营养|护眼|颈椎|免疫力|情绪)/],
      ['fashion', /(穿搭|时尚|美妆|护肤|妆容|口红|香水|包包|显瘦|气质|ootd|发型)/],
      ['life', /(生活|日常|家居|收纳|好物|母婴|育儿|宠物|租房|装修|笔记|手帐|仪式感|断舍离)/]
    ];
    for (var i = 0; i < map.length; i++) { if (map[i][1].test(t)) return map[i][0]; }
    return DEFAULT_THEME;
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  // 公共暗底包装：渐变 + 光晕 + 主题水印 + 装饰 SVG（无品牌条/无 chip，直接突出内容）
  function darkWrap(t, inner, opts) {
    opts = opts || {};
    var deco = opts.deco || '';
    return '' +
      '<section style="position:relative;width:100%;height:100%;overflow:hidden;' +
      'background:linear-gradient(135deg,' + t.g[0] + ' 0%,' + t.g[1] + ' 100%);' +
      'font-family:-apple-system,BlinkMacSystemFont,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;' +
      'box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">' +
      // 光晕
      '<div style="position:absolute;top:-30%;right:-15%;width:60%;height:60%;border-radius:50%;' +
      'background:radial-gradient(circle,' + t.accent + ' 0%,rgba(0,0,0,0) 70%);opacity:.22;"></div>' +
      '<div style="position:absolute;bottom:-25%;left:-10%;width:55%;height:55%;border-radius:50%;' +
      'background:radial-gradient(circle,rgba(255,255,255,.9) 0%,rgba(0,0,0,0) 70%);opacity:.10;"></div>' +
      // 装饰 SVG
      '<div style="position:absolute;right:0;bottom:0;width:62%;height:62%;opacity:.9;pointer-events:none;">' + t.motif + '</div>' +
      // 主题水印
      '<div style="position:absolute;top:6%;right:5%;font-size:84px;line-height:1;opacity:.12;filter:none;">' + t.icon + '</div>' +
      // 主体由调用方注入（内容区整体垂直居中，突出核心）
      '<div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;padding:18px;">' + inner + '</div>' +
      deco +
      '</section>';
  }

  // 亮底卡片包装（痛点/干货），主题点缀色，无头部提示词，直接段落
  function lightWrap(t, inner) {
    return '' +
      '<section style="position:relative;width:100%;height:100%;overflow:hidden;' +
      'background:linear-gradient(160deg,#ffffff 0%,' + t.tint + ' 100%);' +
      'font-family:-apple-system,BlinkMacSystemFont,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;' +
      'box-sizing:border-box;display:flex;flex-direction:column;">' +
      // 左上角点缀块
      '<div style="position:absolute;top:0;left:0;width:6px;height:100%;background:' + t.accent + ';"></div>' +
      '<div style="position:relative;flex:1;padding:18px 16px 16px 24px;display:flex;flex-direction:column;justify-content:center;">' + inner + '</div>' +
      '</section>';
  }

  // ===== 公众号头条封面 900×383 =====
  function wechat(o) {
    var t = themeOf(o.theme);
    var inner =
      '<div style="font-size:30px;font-weight:900;line-height:1.28;color:' + t.ink + ';' +
      'letter-spacing:.5px;max-width:78%;text-shadow:0 2px 12px rgba(0,0,0,.25);">' + esc(o.title) + '</div>' +
      (o.sub ? '<div style="margin-top:14px;width:46px;height:3px;background:' + t.accent + ';border-radius:3px;"></div>' +
        '<div style="margin-top:12px;font-size:15px;line-height:1.6;color:' + t.ink + ';opacity:.82;max-width:74%;">' + esc(o.sub) + '</div>' : '');
    var deco = '<div style="position:relative;padding:14px 22px 16px;display:flex;align-items:center;justify-content:space-between;">' +
      '<span style="font-size:11px;color:' + t.ink + ';opacity:.6;">' + esc(t.label + ' · 深度内容') + '</span>' +
      '<span style="font-size:12px;color:' + t.ink + ';opacity:.7;font-weight:600;">' + today() + '</span></div>';
    return darkWrap(t, inner, { deco: deco, chip: t.label });
  }

  // 把短文案渲染为大字海报：大字为主、精简、绝不裁切
  // 设计约束：每张最多 3 个视觉行，每行最多 8 字；超过 8 字硬断，超过 3 行截断
  function shortPoster(t, text) {
    var W = 1028; // 1080 画布 - 左右各 26px padding
    var raw = String(text == null ? '' : text).replace(/\r/g, '').trim();
    if (!raw) raw = '闪写Spark'; // 绝对兜底，杜绝空白页
    // 1) 模型意图的行（按 \n 拆分）
    var intent = raw.split(/\n/).map(function (s) {
      return s.trim().replace(/^["“”'']+|["“”'']+$/g, '');
    }).filter(function (s) { return s; });
    if (!intent.length) intent = ['闪写Spark'];
    // 2) 每个意图行超过 8 字则按 8 字硬断（保证大字且不错位/裁切）
    var lines = [];
    intent.forEach(function (s) {
      while (s.length > 8) { lines.push(s.slice(0, 8)); s = s.slice(8); }
      if (s.length) lines.push(s);
    });
    if (lines.length > 3) lines = lines.slice(0, 3); // 每张严格 ≤3 行
    if (!lines.length) lines = ['闪写Spark'];
    var maxLen = Math.max.apply(null, lines.map(function (s) { return s.length; }));
    // 3) 字号：按行数 + 最长行，整体放大让文字在卡片里占主导（网格缩略图也清晰可见）
    var fs;
    if (lines.length === 1) {
      fs = maxLen <= 4 ? 110 : maxLen <= 6 ? 92 : maxLen <= 8 ? 76 : 60;
    } else if (lines.length === 2) {
      fs = maxLen <= 4 ? 86 : maxLen <= 6 ? 72 : maxLen <= 8 ? 60 : 50;
    } else {
      fs = maxLen <= 4 ? 70 : maxLen <= 6 ? 60 : maxLen <= 8 ? 52 : 44;
    }
    // 4) 双保险：按容器宽度收缩，确保最长行不溢出
    var fit = Math.floor(W / Math.max(1, maxLen) * 0.94);
    if (fs > fit) fs = Math.max(13, fit);
    var lh = lines.length === 1 ? 1.25 : 1.42;
    var html = lines.map(function (s) {
      return '<div style="font-size:' + fs + 'px;font-weight:900;line-height:' + lh + ';color:' + t.ink +
        ';text-shadow:0 3px 16px rgba(0,0,0,.28);white-space:normal;word-break:break-all;overflow-wrap:break-word;">' + esc(s) + '</div>';
    }).join('');
    return '<div style="text-align:center;">' + html + '</div>';
  }

  // ===== 小红书 4 张 3:4 卡片 =====
  // 4 张统一大字海报：大字为主、精简凝练、每行不超过 8 字、每张不超过 3 行
  // 4 张卡片背景各不相同（渐变方向/装饰/构图各异），仅文字不同，保证系列感又不雷同
  function xhsWrap(idx, t, inner) {
    var bg;
    if (idx === 0) {
      // 封面：主色对角渐变 + 右上光晕 + 左下白光 + 右下装饰 + 右上图标水印
      bg =
        '<div style="position:absolute;inset:0;background:linear-gradient(135deg,' + t.g[0] + ' 0%,' + t.g[1] + ' 100%);"></div>' +
        '<div style="position:absolute;top:-30%;right:-15%;width:60%;height:60%;border-radius:50%;background:radial-gradient(circle,' + t.accent + ' 0%,rgba(0,0,0,0) 70%);opacity:.22;"></div>' +
        '<div style="position:absolute;bottom:-25%;left:-10%;width:55%;height:55%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9) 0%,rgba(0,0,0,0) 70%);opacity:.10;"></div>' +
        '<div style="position:absolute;right:0;bottom:0;width:62%;height:62%;opacity:.9;pointer-events:none;">' + t.motif + '</div>' +
        '<div style="position:absolute;top:6%;right:5%;font-size:84px;line-height:1;opacity:.12;">' + t.icon + '</div>';
    } else if (idx === 1) {
      // 反向竖向渐变 + 左上大光斑 + 左上装饰 + 右下图标
      bg =
        '<div style="position:absolute;inset:0;background:linear-gradient(160deg,' + t.g[1] + ' 0%,' + t.g[0] + ' 100%);"></div>' +
        '<div style="position:absolute;top:-20%;left:-15%;width:65%;height:65%;border-radius:50%;background:radial-gradient(circle,' + t.accent + ' 0%,rgba(0,0,0,0) 70%);opacity:.26;"></div>' +
        '<div style="position:absolute;top:0;left:0;width:62%;height:62%;opacity:.85;pointer-events:none;">' + t.motif + '</div>' +
        '<div style="position:absolute;bottom:7%;right:6%;font-size:80px;line-height:1;opacity:.12;">' + t.icon + '</div>';
    } else if (idx === 2) {
      // 聚光：纯主色底 + 中心径向光 + 双环 + 右上装饰 + 左下图标
      bg =
        '<div style="position:absolute;inset:0;background:' + t.g[0] + ';"></div>' +
        '<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,' + t.accent + ' 0%,rgba(0,0,0,0) 60%);opacity:.30;"></div>' +
        '<div style="position:absolute;left:50%;top:42%;width:62%;height:62%;transform:translate(-50%,-50%);border-radius:50%;border:2px solid ' + t.accent + ';opacity:.25;"></div>' +
        '<div style="position:absolute;left:50%;top:42%;width:40%;height:40%;transform:translate(-50%,-50%);border-radius:50%;border:2px solid ' + t.accent + ';opacity:.16;"></div>' +
        '<div style="position:absolute;right:0;top:0;width:46%;height:46%;opacity:.5;pointer-events:none;">' + t.motif + '</div>' +
        '<div style="position:absolute;bottom:6%;left:6%;font-size:76px;line-height:1;opacity:.10;">' + t.icon + '</div>';
    } else {
      // 斜切：对角渐变 + 斜向强调光带 + 右下白光 + 左上翻转装饰 + 右下图标
      bg =
        '<div style="position:absolute;inset:0;background:linear-gradient(135deg,' + t.g[0] + ' 0%,' + t.g[1] + ' 100%);"></div>' +
        '<div style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(0,0,0,0) 44%,' + t.accent + ' 44%,' + t.accent + ' 58%,rgba(0,0,0,0) 58%);opacity:.16;"></div>' +
        '<div style="position:absolute;bottom:-20%;right:-12%;width:55%;height:55%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9) 0%,rgba(0,0,0,0) 70%);opacity:.10;"></div>' +
        '<div style="position:absolute;left:0;top:0;width:55%;height:55%;opacity:.7;pointer-events:none;transform:rotate(180deg);">' + t.motif + '</div>' +
        '<div style="position:absolute;bottom:7%;right:6%;font-size:78px;line-height:1;opacity:.12;">' + t.icon + '</div>';
    }
    return '' +
      '<section style="position:relative;width:100%;height:100%;overflow:hidden;' +
      'font-family:-apple-system,BlinkMacSystemFont,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;' +
      'box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">' +
      bg +
      '<div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;padding:26px;">' + inner + '</div>' +
      '</section>';
  }

  function xhsCard(o, idx) {
    var t = themeOf(o.theme);
    var linesArr = Array.isArray(o.cardLines) && o.cardLines.length === 4 ? o.cardLines : [];
    var text;
    if (linesArr[idx]) {
      text = linesArr[idx];
    } else if (idx === 0) {
      text = o.title;
    } else if (idx === 3) {
      text = o.golden;
    } else {
      // 旧数据回退：从痛点/干货里挑
      text = (idx === 1 ? (o.painPoints || []) : (o.tips || []))[0] || '';
    }
    // 兜底救场：本项为空时，用同主题其他字段补，确保 4 张都不空白（覆盖 8 文风任何一项缺失）
    if (!text || !String(text).trim()) {
      var rescue = [o.title, (o.painPoints || [])[0], (o.tips || [])[0], o.golden]
        .filter(function (s) { return s && String(s).trim(); });
      text = rescue.length ? rescue[Math.min(idx, rescue.length - 1)] : '闪写Spark';
    }
    return xhsWrap(idx, t, shortPoster(t, text));
  }

  // ===== 短视频 9:16 封面 =====
  function video(o) {
    var t = themeOf(o.theme);
    var inner =
      '<div style="font-size:13px;font-weight:800;color:' + t.accent + ';letter-spacing:1px;margin-bottom:14px;">🎬 短视频封面</div>' +
      '<div style="font-size:28px;font-weight:900;line-height:1.32;color:' + t.ink + ';text-shadow:0 2px 12px rgba(0,0,0,.3);">' + esc(o.title) + '</div>' +
      (o.sub ? '<div style="margin-top:16px;font-size:15px;line-height:1.6;color:' + t.ink + ';opacity:.85;max-width:88%;">' + esc(o.sub) + '</div>' : '');
    var deco = '<div style="position:relative;padding:14px 22px 18px;display:flex;align-items:center;justify-content:space-between;">' +
      '<span style="font-size:11px;color:' + t.ink + ';opacity:.6;">' + esc(t.label) + '</span>' +
      '<span style="font-size:11px;color:' + t.ink + ';opacity:.65;font-weight:600;">' + today() + '</span></div>';
    return darkWrap(t, inner, { deco: deco, chip: '🔥 必看' });
  }

  global.CoverEngine = {
    THEMES: THEMES,
    detectTheme: detectTheme,
    wechat: wechat,
    xhsCard: xhsCard,
    video: video
  };
})(typeof window !== 'undefined' ? window : this);
