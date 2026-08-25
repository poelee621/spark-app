# 闪写 Spark · 上架操作手册（UPSTORE CHECKLIST）

> 坡哥专属操作清单。全部步骤可在 **Windows + 浏览器** 完成（除打包环节，见 §6 双路径）。
> 时间预估：网页操作 1-2 小时；云构建 30 分钟；App 审核 1-2 天（首审可能更久）。

---

## ✅ 当前进度
- [x] Apple Developer Program 注册（$99/年）
- [x] 创建 App 记录（Bundle ID: `com.coldtank.spark`）
- [x] 证书 + 描述文件（已入 GitHub Secrets）
- [x] GitHub Actions 云构建 + TestFlight 自动分发（`ios-build.yml`，App Store Connect API Key 已升 **App Manager** 角色）
- [x] 隐私政策托管（gh-pages：https://poelee621.github.io/spark-app/privacy.html）
- [x] 中文元数据 + 分级（`fastlane/metadata/zh-Hans/` + `rating.json`）
- [x] 截图 12 张（6.7" + 6.5" 各 6，`fastlane/screenshots/zh-Hans/`，`scripts/make_screenshots.mjs` 可重生成）
- [x] 一键提交审核（`appstore-submit.yml`，手动触发）
- [ ] **替换 `review_information.json` 占位联系信息（提交前必做）**
- [ ] push → 跑 `App Store Submit` workflow → 提交审核

---

## §1 注册 Bundle ID（10 分钟）
1. 打开 https://developer.apple.com/account → 登录 → **Certificates, Identifiers & Profiles**
2. **Identifiers** → `+` → 选 **App IDs** → 继续
3. Description: `Spark`；Bundle ID: 选 Explicit → 填 **`com.coldtank.spark`**
4. Capabilities 保持默认（内购 In-App Purchase 默认勾选）→ Register

## §2 在 App Store Connect 创建 App（15 分钟）
1. https://appstoreconnect.apple.com → **我的 App** → `+` → **新建 App**
2. 平台：iOS；名称：**闪写 Spark - 创作灵感助手**；主要语言：简体中文
3. Bundle ID：选刚注册的 `com.coldtank.spark`；SKU：`spark001`
4. 继续 → 进入 App 页面后，按 `STORE_LISTING.md` 填：
   - 副标题 / 关键词 / 描述（直接复制）
   - 隐私政策 URL：先用占位（§5 托管好后再替换）
   - 定价：免费 + 应用内购买（订阅商品见 §5）

## §3 生成证书与描述文件（30 分钟，网页操作，无需 Mac）
> 全程在 Certificates, Identifiers & Profiles 页面完成。

1. **生成密钥对（Windows Git Bash 或 PowerShell）**：
   ```bash
   openssl req -new -newkey rsa:2048 -nodes -keyout spark_key.pem -out spark_cert.csr -subj "/CN=Spark Distribution"
   ```
2. **签发证书**：Certificates → `+` → **Apple Distribution**（App Store and Ad Hoc 通用）→ 上传 `spark_cert.csr` → 下载 `distribution.cer`
3. **转成 .p12（含私钥，才可签名）**：
   ```bash
   openssl pkcs12 -export -out dist.p12 -inkey spark_key.pem -in distribution.cer
   # 设一个密码，记住它（第 4 步要用）
   ```
4. **编码为 base64（填 GitHub Secret 用）**：
   ```bash
   base64 -w0 dist.p12
   # 输出一整行字符串，复制保存
   ```
5. **创建描述文件**：Profiles → `+` → **App Store Connect** → 选 App ID `com.coldtank.spark` → 选刚签发的证书 → 命名为 **`Spark Distribution Profile`**（名字必须一致！）→ 下载 `.mobileprovision`
   ```bash
   base64 -w0 Spark_Distribution_Profile.mobileprovision
   ```

## §4 创建 App Store Connect API Key（10 分钟）
> 用于 GitHub Actions 自动上传 IPA 到 TestFlight。
1. App Store Connect → **用户和访问** → **集成** → **App Store Connect API** → `+` 生成
2. 下载 `.p8` 文件（只能下载一次），记录 **Key ID** 和 **Issuer ID**
   ```bash
   base64 -w0 AuthKey_XXXX.p8
   ```
3. **Team ID**：developer.apple.com/account → 页面右上角公司名旁（10 位大写字母数字）

## §5 并行配置（网页操作，2 个服务）
### 5.1 Cloudflare（后端 + 隐私政策托管）
1. 注册 https://dash.cloudflare.com/sign-up（免费）
2. 部署订阅后端：本机执行
   ```bash
   cd spark-app/worker
   npm install
   npx wrangler login   # 浏览器授权
   npx wrangler deploy  # 得到 *.workers.dev 公网 URL
   npx wrangler secret put RC_WEBHOOK_SECRET
   npx wrangler secret put APPLE_SHARED_SECRET
   ```
3. 托管隐私政策：Cloudflare → **Workers & Pages** → Create → **Pages** → 连接 GitHub 仓库或直传 `app/` 目录（`privacy.html` 在里面）→ 得到 `https://xxx.pages.dev/privacy.html`
4. 把隐私政策 URL 回填 App Store Connect

### 5.2 RevenueCat（内购商品）
1. 注册 https://app.revenuecat.com
2. Apps → + → 选 **App Store** → 填 Apple 相关凭据（自动从 App Store Connect 同步）
3. Products → + 创建两个**非消耗型订阅**：
   - `spark_pro_monthly` ¥18/月
   - `spark_pro_yearly` ¥98/年
4. 把 **RevenueCat Public SDK Key** 填进 `app/iap.js` 的 `API_KEY`
5. Webhooks → 填 Cloudflare Worker 地址 `https://<你的>.workers.dev/webhook/revenuecat` + 共享密钥（= 5.1 里设置的 RC_WEBHOOK_SECRET）
6. 在 App Store Connect 创建同名 **App 内购买项目** 订阅组（名称要一致）

## §6 打包上传（二选一）

### 路径 A：有 Mac（本地，最省事）
```bash
cd spark-app
npm install
npx cap add ios
npx cap sync ios
npx cap open ios     # Xcode 打开
```
- Xcode → 选 Team（你的 Apple 账号）→ 自动签名（Auto Signing）
- 改 Bundle ID 为 `com.coldtank.spark`（若自动生成了别的）
- Product → Archive → Distribute → App Store Connect → Upload
- 上传后进 TestFlight 等处理

### 路径 B：没有 Mac（GitHub Actions 云构建，推荐，当前在用）
1. 把 `spark-app` 推到 **GitHub 仓库**（Actions 免费额度：公开仓库 macOS runner 免费）
2. 仓库 → Settings → Secrets and variables → Actions → **以下 Secret 已全部配置（iOS 构建在跑，勿删）**：

| Secret | 值 | 用途 |
|--------|-----|------|
| `IOS_P12_BASE64` | §3.4 的 base64 | 签名证书 |
| `IOS_P12_PASSWORD` | p12 密码 | 签名证书 |
| `IOS_PROFILE_BASE64` | §3.5 的 base64 | 描述文件 |
| `TEAM_ID` | §4.3 | 团队 |
| `APPLE_API_KEY_ID` | §4.2 Key ID | API Key |
| `APPLE_API_ISSUER_ID` | §4.2 Issuer ID | API Key |
| `APPLE_API_KEY_B64` | §4.2 .p8 的 base64 | API Key |

> 💡 **上架提交（appstore-submit.yml）只复用其中 4 个**（APPLE_API_KEY_* 与 TEAM_ID），无需新增任何 Secret。
3. 推 main 自动触发 **iOS Build & Upload to TestFlight**；跑完 TestFlight 自动收到新版。
4. 提交审核：仓库 → Actions → **App Store Submit（上架审核）** → Run workflow（默认用已提交的截图；若 UI 大改可勾选 `regenerate_screenshots` 重新生成，会调 DeepSeek 生成真实内容，约 5 分钟）。

## §7 截图 / 提交审核（已自动化）
1. 截图已自动生成（`scripts/make_screenshots.mjs`：Playwright 渲染真实界面 + DeepSeek 生成内容，6.7" 1290×2796 与 6.5" 1242×2688 各 6 张）。
2. 本机重新生成：
   ```bash
   npm ci
   npx playwright install chromium
   SIZES=6.7,6.5 node scripts/make_screenshots.mjs
   ```
3. 提交前必改：`fastlane/metadata/zh-Hans/review_information.json` 的邮箱/电话为真实信息。
4. 审核注意：内购商品必须先「批准」；沙盒测试账号建议先建（用户和访问 → 沙盒）。
5. 提交后 1-2 天出结果；审核可能询问 AI 内容合规（已在 review notes 说明：不采集身份、无社区、无广告）。

## §8 审核通过后（护城河路线，见 PRODUCT_ROADMAP.md）
- [ ] 验证 RevenueCat Webhook 落库（用沙盒购买测试）
- [ ] 4-6 周内上线 v1.1 素材库（数据粘性）
- [ ] v1.2 模板社区 + 积分经济（网络效应）
- [ ] 按硬指标复盘：D7 留存 ≥15% / 素材沉淀率 ≥30% / 付费转化 2-5%
- [ ] 止损线：6 个月未达 1000 下载 / 30 付费 → 停更复盘
