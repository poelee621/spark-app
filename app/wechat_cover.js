// wechat_cover.js —— 公众号封面图生成器（Canvas 绘制，900×383 头条标准尺寸 2.35:1）
// 根据文章结果 result {titles, golden} 产出 1 张封面：品牌条 + 大标题 + 副标题/金句
// 设计：深蓝紫品牌渐变 + 白色大标题 + 红/金色点缀

const WechatCover = {
  W: 900, H: 383,
  BLUE: '#6c8cff', PURPLE: '#a06bff', INK: '#1a1a2e',
  FONT: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',

  _wrap(ctx, text, maxW) {
    const lines = []; let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  },

  _rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // 生成 1 张封面 dataURL
  generate(r) {
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';

    // 背景：深蓝→紫 渐变 + 斜向光带
    const g = ctx.createLinearGradient(0, 0, this.W, this.H);
    g.addColorStop(0, '#131a3a'); g.addColorStop(.55, '#232a5e'); g.addColorStop(1, '#3a2a6e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
    // 光晕装饰
    ctx.fillStyle = 'rgba(108,140,255,.14)';
    ctx.beginPath(); ctx.arc(790, 60, 160, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(160,107,255,.12)';
    ctx.beginPath(); ctx.arc(90, 340, 120, 0, 7); ctx.fill();
    // 斜线纹理
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2;
    for (let i = -400; i < 1000; i += 46) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 260, this.H); ctx.stroke();
    }

    // 顶部品牌条
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    this._rrect(ctx, 42, 30, 170, 40, 20); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '600 24px ' + this.FONT;
    ctx.textAlign = 'left';
    ctx.fillText('✨ 闪写 Spark', 58, 38);

    // 主标题（大字号，白字，最多 2 行）
    const title = (r.titles && r.titles[0]) || '这篇文章值得一看';
    ctx.fillStyle = '#fff'; ctx.font = '800 62px ' + this.FONT;
    const lines = this._wrap(ctx, title, this.W - 130);
    let y = 118;
    lines.slice(0, 2).forEach(l => { ctx.fillText(l, 60, y); y += 76; });

    // 副标题（金句 或 第二标题）
    const sub = r.golden || (r.titles && r.titles[1]) || '';
    if (sub) {
      ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.font = '500 27px ' + this.FONT;
      ctx.fillText('『 ' + sub.replace(/^“|”$/g, '') + ' 』', 60, y + 8);
    }

    // 底部角标：日期 + 品牌
    const now = new Date();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '400 20px ' + this.FONT;
    ctx.fillText(now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日', 60, this.H - 46);
    // 底部右：渐变圆点 Logo
    const lg = ctx.createLinearGradient(0, 0, 44, 44);
    lg.addColorStop(0, this.BLUE); lg.addColorStop(1, this.PURPLE);
    ctx.fillStyle = lg;
    this._rrect(ctx, this.W - 92, this.H - 62, 44, 44, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 22px ' + this.FONT; ctx.textAlign = 'center';
    ctx.fillText('S', this.W - 70, this.H - 52);

    // JPEG 输出（无透明需求，编码更快）
    return c.toDataURL('image/jpeg', 0.92);
  }
};
