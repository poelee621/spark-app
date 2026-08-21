const $ = s => document.querySelector(s);
let plat = 'wechat', style = 'sharp', used = 0;
const LIMIT = 3;

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
  $('#counter').textContent = `今日免费生成 ${used}/${LIMIT} 次`;
}
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
  h += '<div class="sec"><h4><span class="dot"></span>内容提纲</h4><div class="bodyText">';
  (r.outline || []).forEach((s, i) => { h += (i + 1) + '. ' + s + '\n'; });
  h += '</div></div>';
  h += '<div class="sec"><h4><span class="dot"></span>正文</h4><div class="bodyText">' + (r.body || '') + '</div></div>';
  if (r.golden) h += '<div class="sec"><h4><span class="dot"></span>金句（可直接做封面）</h4><div class="golden">' + r.golden + '</div></div>';
  $('#out').innerHTML = h;
}

// generate orchestration
async function generate() {
  if (!isVIP()) {
    if (used >= LIMIT) { toast('今日免费次数已用完，去「会员」解锁无限生成 🚀'); return; }
    used++; localStorage.setItem('spark_used', used); refreshCounter();
  }
  const topic = $('#topic').value;
  $('#out').innerHTML = '<div class="empty">生成中…</div>';
  if (LLM.enabled()) {
    try {
      const r = await LLM.call(plat, style, topic);
      render(r, 'ai'); return;
    } catch (e) {
      toast('AI 调用失败，已降级规则引擎：' + e.message);
    }
  }
  render(Generator.generate(plat, style, topic), 'rule');
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

// subscribe —— 优先真实内购(RevenueCat)，未配置时降级演示
$('#subBtn').onclick = async () => {
  if (IAP.isConfigured()) {
    const ok = await IAP.purchase();
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
