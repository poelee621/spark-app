const $ = s => document.querySelector(s);
let plat = 'wechat', style = 'sharp', used = 0;
const LIMIT = 10; // 免费版每日次数（v0.3 起 3 → 10）

// ---- 每日计数（按本地日期重置） ----
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function getUsed() {
  if (localStorage.getItem('spark_used_date') !== todayStr()) return 0;
  return parseInt(localStorage.getItem('spark_used') || '0', 10) || 0;
}
function setUsed(n) {
  localStorage.setItem('spark_used_date', todayStr());
  localStorage.setItem('spark_used', String(n));
}

// tabs
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(x => x.classList.remove('on'));
  t.classList.add('on'); $('#' + t.dataset.p).classList.add('on');
});

// chips
const rowClick = (row, key) => e => {
  const el = e.target.closest('.chip');   // 点到 emoji/文字都能命中父芯片
  if (!el || !el.dataset.v) return;
  sel(row, el);
  if (key === 'plat') plat = el.dataset.v; else style = el.dataset.v;
};
$('#platRow').onclick = rowClick('#platRow', 'plat');
$('#styleRow').onclick = rowClick('#styleRow', 'style');
function sel(row, el) { document.querySelectorAll(row + ' .chip').forEach(c => c.classList.remove('on')); el.classList.add('on'); }

// VIP state
function isVIP() { return localStorage.getItem('spark_vip') === '1'; }
function refreshCounter() {
  if (isVIP()) { $('#counter').textContent = 'Pro 会员 · 无限生成'; return; }
  $('#counter').textContent = `今日免费生成 ${used}/${LIMIT} 次（每日重置）`;
}
used = getUsed();
refreshCounter();

// render unified result {titles, outline, body, golden}
function render(r, source) {
  const src = source === 'ai'
    ? '<span class="srcbadge src-ai">AI</span>'
    : '<span class="srcbadge src-rule">规则</span>';
  let h = '<div class="sec"><h4><span class="dot"></span>标题（' + Generator.platName[plat] + ' · ' + Generator.styleName[style] + '）' + src + '</h4>';
  (r.titles || []).forEach(x => {
    h += '<div class="titleItem"><span>' + x + '</span><div class="copy" onclick="copyTxt(this)">复制</div></div>';
  });
  h += '</div>';
  // 公众号：完整文章（引言 + 小节 + 结尾）
  if (r.sections) {
    h += '<div class="sec"><h4><span class="dot"></span>完整文章（可直接复制发布）<span class="copy" onclick="copyArticle(this)">复制全文</span></h4>';
    if (r.intro) h += '<div class="bodyText">' + r.intro + '</div><div style="height:10px"></div>';
    r.sections.forEach(s => {
      h += '<div class="sec-sub">' + s.h + '</div><div class="bodyText">' + s.p + '</div><div style="height:10px"></div>';
    });
    if (r.outro) h += '<div class="bodyText">' + r.outro + '</div>';
    if (r.golden) h += '<div class="golden" style="margin-top:10px">' + r.golden + '</div>';
    h += '</div>';
  } else if (plat === 'video' || r.plat === 'video') {
    // 短视频：显示分镜头口播脚本，可照着拍
    h += '<div class="sec"><h4><span class="dot"></span>口播文案（可照着拍）<span class="copy" onclick="copyArticle(this)">复制全文</span></h4>';
    h += '<div class="bodyText" style="font-size:15px;line-height:1.7">';
    h += '<b style="color:var(--acc)">开场钩子：</b>' + (r.hook || '') + '<br><br>';
    (r.script || []).forEach(s => {
      h += '<b style="color:var(--acc)">' + s.shot + '</b>' + s.text + '<br><br>';
    });
    h += '</div></div>';
    if (r.golden) h += '<div class="sec"><h4><span class="dot"></span>金句（可做封面/字幕）</h4><div class="golden">' + r.golden + '</div></div>';
  } else if (plat === 'xhs' || r.plat === 'xhs') {
    // 小红书：显示可直接发布的笔记内容（痛点+干货+正文+金句），不再显示元教程大纲
    h += '<div class="sec"><h4><span class="dot"></span>正文（可直接发笔记）</h4><div class="bodyText">' + (r.body || '').replace(/\n/g, '<br>') + '</div></div>';
    if (r.painPoints && r.painPoints.length) {
      h += '<div class="sec"><h4><span class="dot"></span>痛点共鸣</h4><div class="bodyText">' + r.painPoints.map((x, i) => (i + 1) + '. ' + x).join('\n') + '</div></div>';
    }
    if (r.tips && r.tips.length) {
      h += '<div class="sec"><h4><span class="dot"></span>干货清单</h4><div class="bodyText">' + r.tips.map((x, i) => (i + 1) + '. ' + x).join('\n') + '</div></div>';
    }
    if (r.golden) h += '<div class="sec"><h4><span class="dot"></span>金句</h4><div class="golden">' + r.golden + '</div></div>';
  } else {
    h += '<div class="sec"><h4><span class="dot"></span>内容提纲</h4><div class="bodyText">';
    (r.outline || []).forEach((s, i) => { h += (i + 1) + '. ' + s + '\n'; });
    h += '</div></div>';
    h += '<div class="sec"><h4><span class="dot"></span>正文</h4><div class="bodyText">' + (r.body || '') + '</div></div>';
    if (r.golden) h += '<div class="sec"><h4><span class="dot"></span>金句（可直接做封面）</h4><div class="golden">' + r.golden + '</div></div>';
  }
  $('#out').innerHTML = h;
}
// 复制公众号全文（Markdown 风格）
function copyArticle(el) {
  const secs = document.querySelectorAll('#out .sec-sub');
  const paras = document.querySelectorAll('#out .sec .bodyText');
  let md = '';
  if (secs.length && paras.length) {
    const bodyParts = document.querySelectorAll('#out .sec .bodyText');
    let idx = 0;
    // 引言
    if (paras.length >= secs.length + 2) md += paras[0].textContent + '\n\n';
    let pi = paras.length >= secs.length + 2 ? 1 : 0;
    secs.forEach((s, i) => {
      md += '## ' + s.textContent + '\n\n' + (paras[pi + i] ? paras[pi + i].textContent : '') + '\n\n';
    });
    pi += secs.length;
    if (pi < paras.length) md += paras[pi].textContent + '\n\n';
  } else {
    md = document.querySelector('#out') ? document.querySelector('#out').innerText : '';
  }
  navigator.clipboard && navigator.clipboard.writeText(md);
  toast('全文已复制（Markdown 格式）✓');
}

// ---- 小红书图文：生成 4 张 3:4 卡片并展示（分帧绘制，避免卡 UI） ----
function renderXhsCards(r) {
  const card = $('#xhsCard'), grid = $('#xhsGrid');
  card.style.display = 'block';
  grid.innerHTML = '<div class="xhs-loading"><span class="spin"></span>正在绘制图文卡片 ' + 0 + '/4 …</div>';
  const urls = [];
  let i = 0;
  const next = () => {
    if (i >= 4) {
      grid.innerHTML = urls.map((u, n) =>
        '<div class="xhs-item" onclick="showViewer(this)">' +
        '<img src="' + u + '" alt="图文卡 ' + (n + 1) + '" />' +
        '<span class="no">' + (n + 1) + '/4</span></div>').join('');
      return;
    }
    grid.innerHTML = '<div class="xhs-loading"><span class="spin"></span>正在绘制图文卡片 ' + (i + 1) + '/4 …</div>';
    try { urls.push(XhsCards.generateOne(r, i)); i++; }
    catch (e) { grid.innerHTML = '<div class="xhs-loading">图片生成失败：' + e.message + '</div>'; return; }
    requestAnimationFrame(next); // 每张间隔一帧，UI 保持响应
  };
  requestAnimationFrame(next);
}

// ---- 公众号封面：生成 900×383 头条封面（同步、瞬时） ----
function renderWechatCover(r) {
  const card = $('#wcCard');
  card.style.display = 'block';
  try {
    const url = WechatCover.generate(r);
    $('#wcImg').src = url;
  } catch (e) {
    card.style.display = 'none';
    toast('封面生成失败：' + e.message);
  }
}

// ---- 大模型 HTML 视觉渲染（DeepSeek 出 HTML，非位图） ----
function renderWechatCoverHTML(r) {
  const card = $('#wcCard');
  card.style.display = 'block';
  $('#wcCover').innerHTML = '<div class="html-box">' + (r.coverHtml || '') + '</div>';
}
function renderXhsCardsHTML(r) {
  const card = $('#xhsCard'), grid = $('#xhsGrid');
  card.style.display = 'block';
  const arr = (r.cardsHtml || []).slice(0, 4);
  if (!arr.length) { renderXhsCards(r); return; }
  grid.innerHTML = arr.map((h, i) =>
    '<div class="xhs-item"><div class="html-box" id="xhsHtml' + i + '">' + h + '</div>' +
    '<button class="btn ghost xs" onclick="saveAsImage(document.getElementById(\'xhsHtml' + i + '\'))">保存第' + (i + 1) + '张</button></div>'
  ).join('');
}
function renderVideoThumbHTML(r) {
  const card = $('#wcCard'); // 复用封面卡片位置展示视频缩略
  card.style.display = 'block';
  $('#wcCover').innerHTML = '<div class="html-box">' + (r.thumbHtml || '') + '</div>';
  $('#wcSave').textContent = '保存封面为图片';
}

// 把 HTML 视觉节点转成图片（html2canvas），供长按保存到相册
function saveAsImage(el) {
  if (!el) return;
  if (!window.html2canvas) { toast('未加载截图库，请直接长按截图保存'); return; }
  toast('正在生成图片…');
  window.html2canvas(el, { backgroundColor: null, scale: 2 }).then(canvas => {
    const url = canvas.toDataURL('image/png');
    $('#viewerImg').src = url;
    $('#viewer').classList.add('on');
    toast('已生成图片，长按可保存 ✓');
  }).catch(e => toast('生成失败：' + e.message));
}
$('#wcSave').onclick = () => saveAsImage($('#wcCover').firstElementChild);

// 全屏预览（长按/点击查看大图，iOS 上长按图片可保存到相册）
function showViewer(item) {
  const img = item.querySelector('img');
  $('#viewerImg').src = img.src;
  $('#viewer').classList.add('on');
}

// 清洗主题：去掉首尾空格、前缀"关于"、末尾标点，避免正文出现"关于「关于...」"
function normalizeTopic(raw) {
  let t = (raw || '').trim();
  if (t.toLowerCase().startsWith('关于')) t = t.slice(2).trim();
  t = t.replace(/[。！？?！.!]+$/, '').trim();
  return t || '这件事';
}

// generate orchestration
async function generate() {
  if (!isVIP()) {
    if (used >= LIMIT) { toast('今日免费次数已用完（' + LIMIT + ' 次），明天再来或去「会员」解锁无限生成 🚀'); return; }
    used++; setUsed(used); refreshCounter();
  }
  const topic = normalizeTopic($('#topic').value);
  $('#out').innerHTML = '<div class="empty"><span class="spin"></span>正在生成内容…</div>';
  $('#xhsCard').style.display = 'none';
  $('#wcCard').style.display = 'none';
  let result = null;
  try {
    if (LLM.enabled()) {
      $('#out').innerHTML = '<div class="empty"><span class="spin"></span>正在调用大模型…（约 3~8 秒）</div>';
      try {
        result = await LLM.call(plat, style, topic);
        render(result, 'ai');
      } catch (e) {
        toast('AI 调用失败，已降级规则引擎：' + e.message);
        result = null;
      }
    }
    if (!result) {
      $('#out').innerHTML = '<div class="empty"><span class="spin"></span>正在用规则引擎生成…</div>';
      // 公众号 → 完整文章；其他平台 → 内容包
      result = plat === 'wechat'
        ? Generator.generateArticle(style, topic)
        : Generator.generate(plat, style, topic);
      render(result, 'rule');
    }
    // 平台专属：小红书 4 图 / 公众号封面 / 视频封面
    // 大模型返回 HTML 视觉时优先用 HTML；否则回退规则引擎的 Canvas 绘制
    if (plat === 'xhs') {
      if (result.cardsHtml && result.cardsHtml.length) renderXhsCardsHTML(result);
      else renderXhsCards(result);
    }
    if (plat === 'wechat') {
      if (result.coverHtml) renderWechatCoverHTML(result);
      else renderWechatCover(result);
    }
    if (plat === 'video' && result.thumbHtml) renderVideoThumbHTML(result);
  } catch (e) {
    $('#out').innerHTML = '<div class="empty">生成失败：' + e.message + '<br>建议检查网络或清除 AI Key 用规则引擎重试</div>';
    toast('生成失败：' + e.message);
  }
}
$('#genBtn').onclick = generate;

function copyTxt(el) {
  const t = el.parentElement.querySelector('span').textContent;
  navigator.clipboard && navigator.clipboard.writeText(t);
  toast('已复制 ✓');
}
function toast(m) {
  const t = $('#toast'); t.textContent = m; t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 1800);
}

// ---- 会员套餐选择 ----
let selectedPlan = 'yearly';
function refreshPlanUI() {
  document.querySelectorAll('#planRow .plan').forEach(el => el.classList.toggle('on', el.dataset.plan === selectedPlan));
  $('#subBtn').textContent = '订阅闪写 Pro · ' + (selectedPlan === 'monthly' ? '¥9.9/月' : '¥98/年');
}
$('#planRow').onclick = e => {
  const el = e.target.closest('.plan');
  if (!el || el.dataset.plan === selectedPlan) return;
  selectedPlan = el.dataset.plan;
  refreshPlanUI();
};
refreshPlanUI();

// subscribe —— 优先真实内购(RevenueCat)，未配置/失败均降级演示，保证点击一定有反馈
$('#subBtn').onclick = async (ev) => {
  ev && ev.preventDefault();
  if (isVIP()) { toast('已是 Pro 会员 🎉'); return; }
  const btn = $('#subBtn');
  const oldText = btn.textContent;
  btn.textContent = '处理中…';
  btn.disabled = true;
  try {
    if (IAP.isConfigured()) {
      const ok = await IAP.purchase(selectedPlan);
      if (ok) { applyVIP(); return; }
      // 真实购买未成功（无商品/未配置/取消）→ 降级演示，确保有反馈
      localStorage.setItem('spark_vip', '1');
      toast('已解锁（演示模式）· 正式发布将走 App Store 内购');
      applyVIP(); return;
    }
  } catch (e) {
    console.warn('purchase failed, fallback to demo', e);
  }
  // 兜底：演示模式解锁
  localStorage.setItem('spark_vip', '1');
  toast('订阅成功（演示模式）· 已解锁无限生成 🚀');
  applyVIP();
};
function applyVIP() {
  if (!isVIP()) return;
  $('#vipState').textContent = 'Pro 会员';
  $('#subBtn').textContent = '已开通 ✓';
  $('#subBtn').classList.add('ghost');
  refreshCounter();
}
applyVIP();

// ---- AI settings ----
function loadAI() {
  const c = LLM.cfg();
  $('#aiProvider').value = c.provider || 'deepseek';
  $('#aiKey').value = c.apiKey || '';
  $('#aiModel').value = c.model || '';
  $('#aiBase').value = c.baseUrl || '';
  if (LLM.proxyOn()) {
    $('#aiStatus').innerHTML = '<b style="color:var(--ok)">● 平台 AI 已启用</b>（默认 DeepSeek，所有用户共用，无需填 Key）';
  } else if (LLM.enabled()) {
    $('#aiStatus').innerHTML = '<b style="color:var(--ok)">● 已启用你自带的大模型</b>（' + (LLM.PROVIDERS[c.provider]?.name || '') + '）';
  } else {
    $('#aiStatus').innerHTML = '<span style="color:var(--sub)">○ 平台代理未部署，也未填 Key，当前为规则引擎</span>';
  }
}
loadAI();
$('#aiSave').onclick = () => {
  LLM.save({
    provider: $('#aiProvider').value,
    apiKey: $('#aiKey').value.trim(),
    model: $('#aiModel').value.trim(),
    baseUrl: $('#aiBase').value.trim()
  });
  loadAI();
  toast(LLM.proxyOn() ? '已保存（自带 Key 将覆盖平台 AI）🤖' : (LLM.enabled() ? '已保存，下次生成走你自带的大模型 🤖' : '未填 Key，仍用规则引擎'));
};
$('#aiClear').onclick = () => { LLM.clear(); loadAI(); toast('已清除自带 Key，改回平台 AI'); };
