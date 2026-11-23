# HanzAniList

将 AniList 的常用界面和动漫、漫画标题显示为简体中文的浏览器扩展。

## 第一版功能

- 导航、按钮、筛选项、状态等固定界面文案汉化。
- 根据 AniList 作品 ID 显示中文名，支持动画与漫画 URL。
- 8,731 条初始中文标题和别名，按 ID 低字节拆成 256 个分片。
- 悬停查看原名、其他译名和来源；官方、民间和 AI 暂译具有不同标记。
- 可选双语显示、禁用界面或标题汉化、禁用 AI 暂译。
- 适配动态加载和前端路由；使用 IndexedDB 与内存缓存。

**正常浏览不会调用 AniList API。** 扩展只读取随扩展打包的本地分片，数据库未收录时保留原名。

## 安装开发版

1. 执行 `npm install` 和 `npm run build`。
2. 打开 Edge 的 `edge://extensions` 或 Chrome 的 `chrome://extensions`。
3. 开启“开发人员模式”。
4. 选择“加载解压缩的扩展”，目录为 `.output/chrome-mv3`。
5. 刷新已经打开的 AniList 页面。

扩展详情页中的“扩展选项”可以修改显示设置。

## 开发

```sh
npm run dev        # 开发模式
npm run check      # TypeScript 严格检查
npm test           # 单元测试
npm run build      # 生产构建
npm run test:e2e   # 真实浏览器扩展测试
npm run zip        # 生成发布压缩包
```

端到端测试优先使用本机 Edge，也可通过 `CHROME_PATH` 指定 Chromium 浏览器。测试会启动可见浏览器窗口。

## 数据构建

```sh
npm run titles:build
```

需要更新上游数据时：

```sh
node scripts/build-titles.mjs --download
```

`data/curated-titles.json` 用于保存经过来源审核的覆盖项。官方名称需要来源名称与链接；未验证来源的常用中文名必须标记为 `community`，AI 生成名称必须标记为 `ai`。

## 性能约束

- 内容脚本不请求 `graphql.anilist.co`，也没有按标题实时搜索外部网站。
- 每个 ID 分片在一次页面会话中最多读取一次，相同 ID 使用缓存结果。
- 每个分片通过一个 IndexedDB 事务写入，避免逐条事务。
- DOM 观察只处理新增节点，并通过 `requestAnimationFrame` 合批。
- 标题查询最多并发 6 项，所有标题提示共用一个悬浮层。

## 当前限制

- 初始数据主要来自上游中文标题项目，覆盖并不完整，尤其是漫画。
- 尚未实现定时在线数据库更新、自动官方来源核验、民间译名搜索及 AI 批量暂译管线。
- 固定界面词典未覆盖所有 AniList 页面，用户简介、评论和自定义内容不会被翻译。
- 第一版针对 Chromium Manifest V3，尚未生成 Firefox 发布包。

## 数据来源与许可

代码使用 MIT 许可证。初始中文标题和别名来自 [soruly/anilist-chinese](https://github.com/soruly/anilist-chinese)，同样采用 MIT 许可证；详见 `THIRD_PARTY_NOTICES.md`。
