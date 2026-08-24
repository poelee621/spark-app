// wechat_cover.js —— 公众号封面图生成器（Canvas 绘制，900×383 头条标准尺寸 2.35:1）
// 风格：轻量「AI 插画风」——柔和渐变天空 + 简单山丘剪影 + 月亮 + 星点，绘制同步、毫秒级
// 根据文章结果 result {titles, golden} 产出 1 张封面：品牌条 + 大标题 + 副标题/金句

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

  // 生成 1 张封面 dataURL（轻量插画风，不做复杂叠绘）
  generate(r) {
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';

    // 背景：梦幻天空渐变（AI 插画常见柔紫橙调）
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, '#3a2f7a');   // 顶部深紫
    g.addColorStop(.5, '#7b5bb0');  // 中段紫
    g.addColorStop(1, '#f0a36b');   // 底部暖橙（地平线光）
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);

    // 月亮：右上角柔光圆（简单）
    ctx.fillStyle = 'rgba(255,247,224,.95)';
    ctx.beginPath(); ctx.arc(770, 92, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,247,224,.18)';
    ctx.beginPath(); ctx.arc(770, 92, 70, 0, Math.PI * 2); ctx.fill();

    // 星点：几颗小圆（固定位置，轻量）
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    [[120,70],[210,48],[330,90],[470,60],[560,110],[640,52]].forEach(p => {
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, Math.PI * 2); ctx.fill();
    });

    // 远山剪影：2 层简单贝塞尔（轻量）
    ctx.fillStyle = 'rgba(58,42,110,.55)';
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.bezierCurveTo(180, 250, 320, 320, 520, 280);
    ctx.bezierCurveTo(700, 245, 820, 300, 900, 270);
    ctx.lineTo(900, 383); ctx.lineTo(0, 383); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(28,20,64,.7)';
    ctx.beginPath();
    ctx.moveTo(0, 340);
    ctx.bezierCurveTo(200, 300, 380, 360, 580, 320);
    ctx.bezierCurveTo(740, 290, 840, 345, 900, 320);
    ctx.lineTo(900, 383); ctx.lineTo(0, 383); ctx.closePath(); ctx.fill();

    // 暗化层：下半部加深，保证文字清晰可读
    const vg = ctx.createLinearGradient(0, 120, 0, this.H);
    vg.addColorStop(0, 'rgba(20,16,46,0)');
    vg.addColorStop(1, 'rgba(20,16,46,.62)');
    ctx.fillStyle = vg; ctx.fillRect(0, 120, this.W, this.H - 120);

    // 顶部品牌条
    ctx.fillStyle = 'rgba(255,255,255,.16)';
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
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = '500 27px ' + this.FONT;
      ctx.fillText('『 ' + sub.replace(/^“|”$/g, '') + ' 』', 60, y + 8);
    }

    // 底部角标：日期
    const now = new Date();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '400 20px ' + this.FONT;
    ctx.fillText(now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日', 60, this.H - 46);
    // 底部右：渐变圆角 Logo + 闪电符号
    const lg = ctx.createLinearGradient(0, 0, 44, 44);
    lg.addColorStop(0, this.BLUE); lg.addColorStop(1, this.PURPLE);
    ctx.fillStyle = lg;
    this._rrect(ctx, this.W - 92, this.H - 62, 44, 44, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(this.W - 72, this.H - 49);
    ctx.lineTo(this.W - 66, this.H - 41);
    ctx.lineTo(this.W - 70, this.H - 41);
    ctx.lineTo(this.W - 66, this.H - 33);
    ctx.lineTo(this.W - 76, this.H - 43);
    ctx.lineTo(this.W - 72, this.H - 43);
    ctx.closePath(); ctx.fill();

    // JPEG 输出（无透明需求，编码更快）
    return c.toDataURL('image/jpeg', 0.92);
  }
};
