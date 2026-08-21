// 规则引擎生成器（离线、零成本）。正式版可由 LLM 模块替换。
const Generator = {
  TITLES: {
    sharp: t => [`别再被「${t}」洗脑了`, `关于${t}，我有一些不合时宜的真话`, `${t}越大，越要警惕`, `谁在靠${t}割韭菜？`],
    warm: t => [`${t}里，藏着被忽略的温柔`, `谢谢你，曾为${t}较过真`, `${t}教会我的事`, `慢一点，${t}会给你答案`],
    practical: t => [`搞定${t}，只需这 3 步`, `${t}实操手册（建议收藏）`, `新手做${t}最常踩的 5 个坑`, `一张表讲清${t}`],
    suspense: t => [`关于${t}，有个被隐瞒的真相`, `${t}背后，是一盘大棋`, `如果${t}是假的呢？`, `${t}的水，比你想的深`]
  },
  HOOK: {
    sharp: ['我们先把道德滤镜摘了，谈点实在的。', '很多人不敢说的话，今天我来说。', '共识未必正确，质疑才是起点。'],
    warm: ['有些事，只有经历过的人才懂。', '不是矫情，是真的很在意。', '那天晚上，我突然想通了。'],
    practical: ['直接上方法，废话不多。', '收藏这一篇，照着做就行。', '我把踩过的坑都标红了。'],
    suspense: ['你以为你看到的是全部？', '真相往往藏在反面。', '这个故事，结局我先不说。']
  },
  BODY: {
    sharp: ['「${t}」从来不是一个单纯的问题，它背后是利益、是叙事、是被人替你写好的剧本。', '当所有人都在喊“要理性”的时候，恰恰最该问一句：谁定义的理性？', '我不确定我的判断全对，但“不跪着接收结论”这件事，值得。'],
    warm: ['关于「${f}」……', '关于「${t}」，我们总急着要结果，却忘了过程里那些细小的光。', '后来才明白，真正重要的不是${t}本身，而是它让我们成为谁。', '愿你在${t}里，也能被温柔以待。'],
    practical: ['做「${t}」第一步，先搞清楚你的目标人群是谁，别一上来就铺量。', '第二步，把流程拆成可复制的 checklist，每天执行一点点。', '第三步，复盘数据，留下有效的，砍掉自嗨的。'],
    suspense: ['表面上看，「${t}」是 A，但顺着钱和权力的流向看，答案可能是 B。', '别急着反驳，先把时间线拉到三年前，你会发现伏笔早就埋下。', '所以下次再听到「${t}」，不妨多问一句：谁受益？']
  },
  GOLD: {
    sharp: ['“共识是最便宜的麻醉剂。”', '“我不确定的时候，宁愿先闭嘴，也不点头。”'],
    warm: ['“温柔不是软弱，是看清后仍选择善意。”'],
    practical: ['“执行比完美重要，先跑起来再优化。”'],
    suspense: ['“你看到的真相，往往只是别人想让你看到的。”']
  },
  OUTLINE: {
    wechat: ['引子（钩子）', '现象 / 冲突', '质疑前提', '拆解分析', '反讽收尾 + 互动'],
    xhs: ['吸睛标题', '痛点共鸣', '方法 / 清单', 'emoji 排版', '评论区钩子'],
    video: ['3 秒钩子', '反转设定', '干货输出', '金句沉淀', '引导关注']
  },
  styleName: { sharp: '犀利', warm: '温情', practical: '干货', suspense: '悬念' },
  platName: { wechat: '公众号', xhs: '小红书', video: '短视频' },
  generate(plat, style, topic) {
    const t = (topic || '').trim() || '这件事';
    const titles = this.TITLES[style](t);
    const outline = this.OUTLINE[plat] || this.OUTLINE.wechat;
    let body = pick(this.HOOK[style]) + '\n\n';
    (this.BODY[style] || this.BODY.practical).forEach(p => {
      body += p.replace(/\$\{t\}/g, t).replace(/\$\{f\}/g, t) + '\n\n';
    });
    const golden = pick(this.GOLD[style]);
    return { topic: t, titles, outline, body: body.trim(), golden };
  }
};
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
