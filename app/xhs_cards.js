// xhs_cards.js —— 小红书图文卡片生成器（Canvas 绘制，3:4 竖版 1080×1440）
// 根据生成结果 result {titles, outline, body, golden} 产出 4 张可保存的图文卡：
//   1) 封面大标题  2) 痛点钩子  3) 干货清单  4) 金句收尾
// 设计：小红书风 = 白底 + 品牌红主色 + 大字 + emoji 装饰

const XhsCards = {
  W: 1080, H: 1440,
  RED: '#ff2442', RED_DEEP: '#e01b36', INK: '#1a1a1a', SUB: '#8a8a8a',
  FONT: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',

  // 文案换行（按字符测量，兼容中文）
  _wrap(ctx, text, maxW) {
    const lines = []; let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  },

  // 圆角矩形
  _rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // 顶部品牌条
  _brandBar(ctx) {
    const y = 74;
    ctx.fillStyle = this.RED;
    this._rrect(ctx, 64, y - 34, 150, 68, 34); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 34px ' + this.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✨ 闪写 Spark', 139, y);
  },

  // 底部引导条
  _foot(ctx) {
    ctx.fillStyle = this.SUB; ctx.font = '400 30px ' + this.FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('关注我 · 每天一个创作灵感 📌', this.W / 2, this.H - 70);
  },

  // 1) 封面：大标题卡（红底白字）
  _cover(ctx, r) {
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, this.RED); g.addColorStop(1, this.RED_DEEP);
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
    // 装饰圆点
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.arc(950, 240, 130, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath(); ctx.arc(120, 1180, 90, 0, 7); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.font = '600 32px ' + this.FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('📕 小红书爆款笔记', 84, 96);

    const title = (r.titles && r.titles[0]) || '这个主题值得一看';
    ctx.fillStyle = '#fff'; ctx.font = '800 92px ' + this.FONT;
    const lines = this._wrap(ctx, title, this.W - 168);
    const lh = 116, maxLines = 4;
    let y = 320;
    lines.slice(0, maxLines).forEach(l => { ctx.fillText(l, 84, y); y += lh; });

    if (r.titles && r.titles[1]) {
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '500 40px ' + this.FONT;
      const sub = this._wrap(ctx, r.titles[1], this.W - 168).slice(0, 2);
      y += 20;
      sub.forEach(l => { ctx.fillText(l, 84, y); y += 52; });
    }

    // 中间大 emoji
    ctx.font = '110px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('✍️', this.W / 2, y + 70);

    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '600 36px ' + this.FONT;
    ctx.fillText('文末有完整干货 👇', this.W / 2, this.H - 170);
  },

  // 2) 痛点钩子卡（白底红字大问句）
  _pain(ctx, r) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, this.W, this.H);
    this._brandBar(ctx);
    // 顶部装饰
    ctx.fillStyle = 'rgba(255,36,66,.07)';
    this._rrect(ctx, 64, 150, this.W - 128, 200, 24); ctx.fill();
    ctx.fillStyle = this.RED; ctx.font = '700 44px ' + this.FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('💡 先戳一下痛点', 100, 182);

    // 正文前 1-2 句做成大号钩子
    const body = (r.body || '').replace(/\n+/g, ' ').trim();
    const hook = body.split(/[。！？!?]/).slice(0, 2).join('。') + (body ? '。' : '');
    const short = hook.length > 90 ? hook.slice(0, 90) + '…' : hook;

    ctx.fillStyle = this.INK; ctx.font = '800 58px ' + this.FONT;
    const lines = this._wrap(ctx, short, this.W - 200);
    let y = 430;
    lines.slice(0, 8).forEach(l => { ctx.fillText(l, 100, y); y += 86; });

    // 红色强调框
    ctx.fillStyle = this.RED; ctx.font = '700 42px ' + this.FONT;
    ctx.fillText('你，中招了吗？', 100, y + 40);
    ctx.strokeStyle = this.RED; ctx.lineWidth = 5;
    const ul = this._wrap(ctx, '你，中招了吗？', this.W - 200);
    ctx.strokeRect(100, y + 40 + 52, ul.length ? ctx.measureText(ul[0]) + 20 : 400, 6);

    this._foot(ctx);
  },

  // 3) 干货清单卡（白底红字编号清单）
  _list(ctx, r) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, this.W, this.H);
    this._brandBar(ctx);
    ctx.fillStyle = this.INK; ctx.font = '800 52px ' + this.FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('📋 照着做就能上手', 100, 160);

    const items = (r.outline && r.outline.length ? r.outline : ['拆解主题', '找切入点', '搭结构', '写正文', '做封面'])
      .slice(0, 5);
    let y = 300;
    items.forEach((it, i) => {
      // 编号圆
      ctx.fillStyle = this.RED;
      ctx.beginPath(); ctx.arc(118, y + 40, 36, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '800 40px ' + this.FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), 118, y + 44);
      // 内容
      ctx.fillStyle = this.INK; ctx.font = '600 44px ' + this.FONT;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const lines = this._wrap(ctx, it, this.W - 260);
      lines.slice(0, 2).forEach(l => { ctx.fillText(l, 200, y); y += 64; });
      y += 52;
    });

    ctx.strokeStyle = 'rgba(255,36,66,.25)'; ctx.lineWidth = 3;
    ctx.strokeRect(84, 250, this.W - 168, y - 250 + 30);
    this._foot(ctx);
  },

  // 4) 金句收尾卡（红底白字居中）
  _golden(ctx, r) {
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, '#ff5c75'); g.addColorStop(1, this.RED_DEEP);
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);

    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath(); ctx.arc(180, 250, 110, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(920, 1150, 140, 0, 7); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.font = '600 32px ' + this.FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('🔥 今日金句', this.W / 2, 140);

    const quote = (r.golden || '灵感，是长期思考后的突然降临。').replace(/^“|”$/g, '');
    ctx.fillStyle = '#fff'; ctx.font = '800 66px ' + this.FONT;
    const lines = this._wrap(ctx, '“' + quote + '”', this.W - 200);
    let y = 440;
    lines.slice(0, 6).forEach(l => { ctx.fillText(l, this.W / 2, y); y += 92; });

    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '500 38px ' + this.FONT;
    ctx.fillText('—— 来自 闪写 Spark', this.W / 2, y + 60);

    this._foot(ctx);
    // 覆盖底部引导（红底上改白色）
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '400 30px ' + this.FONT;
    ctx.fillText('关注我 · 每天一个创作灵感 📌', this.W / 2, this.H - 70);
  },

  // 生成 4 张，返回 [dataURL,...]
  generate(r) {
    const makers = [this._cover.bind(this), this._pain.bind(this), this._list.bind(this), this._golden.bind(this)];
    return makers.map(mk => {
      const c = document.createElement('canvas');
      c.width = this.W; c.height = this.H;
      const ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      mk(ctx, r);
      return c.toDataURL('image/png');
    });
  }
};
