# 在场笔记

一个面向 GitHub Pages 的中文个人主页，收纳写作、项目、求职旅程、每日输入与投资复盘。

## 本地运行

```bash
npm install
npm run dev
```

静态构建：

```bash
npm run build
```

完整验收：

```bash
npm run check
```

构建结果位于 `out/`。构建前会依次检查内容审批、公开投资数据与整个仓库的隐私边界；静态产物还会检查关键路由、免责声明可见性、敏感值与禁用文件。任一门禁失败都会阻止发布。

## 内容发布门禁

所有 `src/app/**/page.mdx` 必须在 `src/content/publications.json` 中恰好登记一次。明确的演示页使用 `publicationStatus: placeholder`、`placeholder: true` 和可见的占位说明；真实发布使用 `publicationStatus: approved`、非未来的北京时间日期，以及与 MDX 原始字节一致的 SHA-256。`pending-review`、未来日期、漏登记页面、哈希不匹配或敏感信息都会让 `npm run content:validate` 和 `prebuild` 失败。投资周报同样受此门禁约束。

求职时间轴从 `src/content/journey-public.json` 加载。公开记录不接受 `pending-review`，`href` 必须是 `/journey/<slug>/`，批准记录还必须通过规范字段的内容哈希校验。私有的 `eventAt` 和审核记录不属于公开 schema，因此无法混入构建。

```bash
npm run content:validate
npm run test:content
```

分享图经过人工可见性检查后，其尺寸、免责声明文案与 SHA-256 会登记在 `scripts/share-image-manifest.json`。替换图片时必须重新确认“仅个人复盘，非投资建议”清晰可读并更新清单，否则构建会失败。

## GitHub Pages

本项目的正式仓库是 `StayOnTable.github.io`，网址为 `https://stayontable.github.io/`。普通项目仓库的网址则是 `https://username.github.io/repository-name/`。

一个 GitHub 账号只能有一个根级用户站点，但可以同时拥有多个项目站点；每个仓库只发布一个 Pages 站点。这个项目按独立用户站点准备，不会把现有私有投资仓库作为发布源。

工作流会从 GitHub Pages 自动读取正式网址与 `basePath`，无需手工维护部署变量。只需在仓库 Pages 设置中选择 GitHub Actions 作为发布源。

若要开启 Giscus 留言区，请在仓库 Settings → Secrets and variables → Actions 中配置以下 Repository variables：

- `GISCUS_REPO`
- `GISCUS_REPO_ID`
- `GISCUS_CATEGORY`
- `GISCUS_CATEGORY_ID`

未配置时页面会显示明确的“留言区待开启”占位，不会加载第三方脚本，也不会收集输入。

## 上线前清单

- 确认 `StayOnTable/StayOnTable.github.io` 的 Pages 工作流首次部署成功。
- 替换姓名简介、小红书账号与真实帖子链接、社群二维码及联系方式占位。
- 配置 Giscus 的四个公开仓库变量。
- 人工预览并批准第一次 IBKR 历史回填；在此之前不启用周六任务，也不展示真实数据。
- 真实投资正文必须针对精确 revision 单独批准；数值与正文不是同一个发布权限。

## 内容与许可

站点代码采用 MIT License。文章、图片、投资数据与个人内容不包含在 MIT 授权范围内，详见 `CONTENT-LICENSE.md`。
