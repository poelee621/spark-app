# 闪写 Spark · 工程与上线指引

中文创作灵感助手 —— 公众号 / 小红书 / 短视频 一键生成标题+提纲+正文+金句。
Web MVP 采用规则引擎（零成本），配置 API Key 后切换大模型。

## 目录结构
```
spark-app/
├─ app/                 # 前端静态资源（Capacitor webDir）
│  ├─ index.html
│  ├─ privacy.html     # 隐私政策页（可作 App Store 政策 URL）
│  ├─ style.css
│  ├─ generator.js     # 规则引擎
│  ├─ llm.js           # 可插拔大模型（OpenAI 兼容）
│  ├─ iap.js           # 内购集成（RevenueCat）+ 演示降级
│  └─ app.js           # UI 与编排
├─ server/             # 极薄后端：收据校验 + RC Webhook（本地 Node 版）
│  ├─ verify.mjs
│  └─ package.json
├─ worker/             # Cloudflare Worker 订阅后端（公网部署版）
│  ├─ src/worker.js
│  ├─ wrangler.toml
│  └─ package.json
├─ content/            # 冷启动内容矩阵 + 封面 + 视频脚本
│  ├─ xiaohongshu.md   # 小红书 5 篇笔记
│  ├─ wechat_article.md# 公众号推文
│  ├─ community.md     # 社群/朋友圈话术
│  ├─ covers.html      # 小红书封面模板（4 张，截图即用）
│  └─ preview_video_script.md # 15 秒预览视频分镜
├─ screenshots/        # App Store 截图模板（浏览器截图为上架素材）
├─ scripts/test_llm.mjs # Node 侧 LLM 连通测试
├─ assets/             # 上架素材（图标/截图，生成后放入）
├─ icon.svg            # 应用图标源文件
├─ capacitor.config.ts
├─ package.json
├─ STORE_LISTING.md    # App Store 文案包
├─ UPSTORE_CHECKLIST.md # 上架操作手册（坡哥逐步清单）
├─ PRODUCT_ROADMAP.md  # 护城河路线图 + 积分经济规格
├─ .github/workflows/  # GitHub Actions iOS 云构建（无 Mac 兜底）
└─ BUSINESS_PLAN.md    # 预算/变现/路线图
```

## 1. 本地预览
直接用浏览器打开 `app/index.html` 即可；或起静态服务：
```bash
npx serve app
```

## 2. 接入大模型（可选）
- App 内切到「AI」页，选服务商、粘贴 API Key、保存即启用（Key 仅存本机）。
- 也可用 Node 验证连通性（避开浏览器 CORS）：
```bash
SPARK_API_KEY=sk-xxx SPARK_PROVIDER=deepseek node scripts/test_llm.mjs
```
支持 DeepSeek / 通义千问 / 智谱 GLM / OpenAI（均 OpenAI 兼容）。

> 生产环境建议加一个极薄后端代理转发 Key，避免浏览器暴露与 CORS 问题。

## 2.5 订阅与内购（StoreKit + 后端校验）
付费通过 **RevenueCat** 接入 App Store 内购（免费额度覆盖 $10k/月内营收，初创零额外成本）：
```bash
npm install @revenuecat/purchases-capacitor
# app/iap.js 已封装 init / purchase / restore，并在「会员」页调用
```
- `app/iap.js`：检测 RevenueCat 插件，配置 API Key 后走真实内购；未配置时降级为演示解锁（方便浏览器预览）。配置项：`API_KEY` / `PRODUCT_ID` / `ENTITLEMENT`。
- `server/verify.mjs`：零依赖 Node 服务，提供
  - `POST /apple/verify`：转发 Apple `verifyReceipt`（沙盒+生产）做收据校验；
  - `POST /webhook/revenuecat`：接收 RevenueCat 服务端 Webhook（共享密钥鉴权），写入 `entitlements.json`；
  - `GET /entitlements/:id`：查询用户会员状态。
- 启动后端：`node server/verify.mjs`（默认 8787 端口，可用 `PORT` / `RC_WEBHOOK_SECRET` / `APPLE_SHARED_SECRET` 环境变量）。

## 2.6 部署订阅后端到公网（Cloudflare Worker）
本地 `server/verify.mjs` 只能内网跑；要让 RevenueCat 的 Webhook 推得进来，需要一个公网地址。
用 Cloudflare Worker（免费额度巨大、无需绑定付费服务器）：
```bash
cd worker
npm install        # 装 wrangler
wrangler login     # 浏览器登录 Cloudflare（免费账号）
wrangler deploy    # 得到 https://spark-subscription-worker.<sub>.workers.dev
```
- 在 Cloudflare Dashboard 给 Worker 配置变量 `APPLE_SHARED_SECRET`、`RC_WEBHOOK_SECRET`（或用 `wrangler secret put`）。
- 可选：创建 KV 命名空间 `SPARK_KV` 并绑定，持久化会员状态（见 `wrangler.toml` 注释）。
- 部署后，把 `https://<你的>.workers.dev/webhook/revenuecat` 填进 RevenueCat → Webhooks。
- 同款逻辑也保留在 `server/verify.mjs`（Node 本地版），方便本机调试。

## 3. 打包 iOS（需 macOS + Xcode）
```bash
npm install
npx cap add ios      # 生成 ios/ 原生工程
npx cap sync         # 把 app/ 同步进原生工程
npx cap open ios     # 用 Xcode 打开
```
在 Xcode 选签名团队、设置 Bundle、Archive 后从 App Store Connect 提交。

## 4. 上架
见 `BUSINESS_PLAN.md`（预算/变现/路线图）与 `STORE_LISTING.md`（文案/关键词/隐私政策/素材清单）。
- 开发者账号（$99/年）由坡哥注册；内购（StoreKit）在 Xcode 工程内接入。
- 隐私政策 URL：把 `app/privacy.html` 用 Cloudflare Pages（免费）托管，填入 App Store Connect。
- 截图素材用 `screenshots/index.html` 模板生成（或上架前用真实 App 界面替换）；封面用 `content/covers.html`；预览视频按 `content/preview_video_script.md` 录制。

## 5. 下一步
- [x] 小9 完成 StoreKit 内购集成骨架（app/iap.js，RevenueCat）+ 服务端校验（server/ + worker/）
- [x] 小9 完成冷启动内容矩阵（content/：小红书5篇 + 公众号推文 + 社群话术）
- [x] 小9 完成 App Store 截图模板（screenshots/index.html）+ 1024 图标 PNG
- [x] 小9 完成隐私政策页（app/privacy.html）+ 小红书封面模板（content/covers.html）+ 预览视频脚本（content/preview_video_script.md）
- [x] 坡哥注册 Apple Developer Program（$99）✅ 2026-08-21
- [ ] 坡哥按 `UPSTORE_CHECKLIST.md` 走：Bundle ID → App Store Connect 建 App → 证书/描述文件 → 打包（本地或 Actions）→ TestFlight → 提交审核
- [ ] 坡哥注册 Cloudflare 免费账号，`wrangler login && wrangler deploy` 部署订阅后端，并在 RC 填 Webhook；用 Cloudflare Pages 托管 privacy.html
- [ ] 坡哥在 RevenueCat / App Store Connect 配置商品（spark_pro_monthly / spark_pro_yearly）并填 API Key
- [ ] 用真实 App 界面替换截图模板，录预览视频，导出上架素材
