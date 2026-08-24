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
$('#platRow').onclick = e => { if (e.target.dataset.v) { sel('#platRow', e.target); plat = e.target.dataset.v; } };
$('#styleRow').onclick = e => { if (e.target.dataset.v) { sel('#styleRow', e.target); style = e.target.dataset.v; } };
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

// 全屏预览（长按/点击查看大图，iOS 上长按图片可保存到相册）
function showViewer(item) {
  const img = item.querySelector('img');
  $('#viewerImg').src = img.src;
  $('#viewer').classList.add('on');
}

// generate orchestration
async function generate() {
  if (!isVIP()) {
    if (used >= LIMIT) { toast('今日免费次数已用完（' + LIMIT + ' 次），明天再来或去「会员」解锁无限生成 🚀'); return; }
    used++; setUsed(used); refreshCounter();
  }
  const topic = $('#topic').value;
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
    // 平台专属：小红书 4 图 / 公众号封面
    if (plat === 'xhs') renderXhsCards(result);
    if (plat === 'wechat') renderWechatCover(result);
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

// subscribe —— 优先真实内购(RevenueCat)，未配置时降级演示
$('#subBtn').onclick = async () => {
  if (IAP.isConfigured()) {
    const ok = await IAP.purchase(selectedPlan);
    if (!ok) return; // 用户取消 / 支付失败
  } else {
    localStorage.setItem('spark_vip', '1');
    toast('订阅成功（演示模式）· 已解锁无限生成');
  }
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
  $('#aiStatus').innerHTML = LLM.enabled()
    ? '<b style="color:var(--ok)">● 已启用大模型</b>（' + (LLM.PROVIDERS[c.provider]?.name || '') + '）'
    : '<span style="color:var(--sub)">○ 当前为规则引擎（未配置 Key）</span>';
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
  toast(LLM.enabled() ? '已保存，下次生成走大模型 🤖' : '未填 Key，仍用规则引擎');
};
$('#aiClear').onclick = () => { LLM.clear(); loadAI(); toast('已清除 Key'); };
