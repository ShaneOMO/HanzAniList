# HanzAniList

将 AniList 的常用界面、动画和漫画标题显示为简体中文的浏览器扩展。项目包含一个独立维护的中文译名库，以及 Bangumi 匹配、AI 候选和人工确认工具。

## 功能

- 汉化导航、按钮、筛选项、列表状态、通知分类等固定界面文案。
- 根据 AniList 作品 ID 替换标题，支持动画和漫画。
- 优先读取项目正式译名库，缺名时可按当前页面的日文原名在线匹配 Bangumi。
- 支持 `Season 2`、`シーズン２`、`第二期`、`第2期` 等季度写法归一化。
- 悬停查看原名、别名、译名级别和来源链接。
- 可选双语显示，或分别关闭界面汉化、标题汉化、Bangumi 匹配和 AI 暂译。
- 单击浏览器工具栏中的 HanzAniList 图标即可打开设置页。
- Chrome、Edge 和 Firefox 共用同一套代码。

## 安装开发版

### Chrome / Edge

```sh
pnpm install
pnpm titles:build
pnpm build
```

1. 打开 `edge://extensions` 或 `chrome://extensions`。
2. 开启“开发人员模式”。
3. 选择“加载解压缩的扩展”。
4. 选择 `.output/chrome-mv3`。

### Firefox

```sh
pnpm install
pnpm titles:build
pnpm zip:firefox
```

打开 `about:debugging#/runtime/this-firefox`，选择“临时载入附加组件”，加载：

```text
.output/hanz-anilist-0.1.0-firefox.zip
```

未签名的 Firefox 临时扩展会在浏览器重启后移除。

## 译名系统

### 数据处理顺序

```text
正式 JSON 译名库
→ 浏览器持久缓存
→ Bangumi 日文原名匹配
→ 维护命令中的 AI Web Search
→ AI 暂译
→ 人工确认
→ 正式 JSON 译名库
```

浏览页面时只执行前三步。**AI 搜索和暂译只在维护者主动运行同步命令时执行。**

### 数据文件

| 文件 | 用途 |
| --- | --- |
| `data/titles.json` | 已确认并会打包进扩展的正式译名 |
| `data/resolver-state.json` | 原名哈希、处理状态、检查时间和重试冷却 |
| `data/review-queue.json` | 等待人工确认的 AI 候选 |
| `public/titles/shards/` | 从正式库生成的 256 个运行时只读分片 |

正式记录以 AniList ID 为主键，保存中文名、别名、来源级别、来源名称和证据链接。可以直接编辑 JSON，也可以通过确认页面维护。

当前正式库是小规模自维护数据，不依赖 `soruly/anilist-chinese`。新增译名需要通过同步、确认或直接编辑正式 JSON 纳入。

## Bangumi 匹配

### 当前页面在线匹配

默认开启，不需要申请或新建 Bangumi API。扩展后台使用：

```text
POST https://api.bgm.tv/v0/search/subjects
```

- 只处理正式库和缓存均没有译名的作品。
- 使用当前页面的日文原名、AniList ID 和动画／漫画类型。
- 要求原名精确匹配，季度写法先归一化；同名候选通过年份消歧。
- 成功后按 AniList ID 写入浏览器持久缓存。
- 无结果冷却 7 天，避免翻页或重启后重复请求。
- 后台串行处理，请求间隔至少 350ms。
- 在线结果不直接修改正式 `data/titles.json`。
- 在设置页关闭“Bangumi 在线匹配”后完全离线。

### 离线维护同步

同步指定作品：

```sh
pnpm titles:sync --ids=1,20,176314,30002
```

同步 AniList 当前热门作品：

```sh
pnpm titles:sync --limit=20
```

`--limit` 默认且最大单批为 20。AniList 只在维护命令中使用，并通过单个 GraphQL 请求批量获取本批作品；遇到 `429` 时停止并显示等待时间。

Bangumi 高置信匹配会直接写入正式库，来源级别为 `community`，不会自动冒充官方译名。

## AI 搜索与暂译

只有配置了 AI 助手，才会执行 AI 搜索或暂译。未配置时，Bangumi 无结果即结束，不产生 AI 请求。

### OpenAI Responses API

```sh
OPENAI_API_KEY="你的密钥" pnpm titles:sync --limit=20
```

- `AI_BASE_URL`：默认 `https://api.openai.com/v1/responses`。
- `AI_MODEL`：默认 `gpt-5-mini`。
- Responses 适配器使用 `web_search` 工具查找中文名和证据。

### OpenAI 兼容 Chat Completions／本地助手

```sh
AI_COMPLETION_URI="http://127.0.0.1:11434/v1/chat/completions" pnpm titles:sync --limit=20
```

- `AI_COMPLETION_URI` 应为完整的 Chat Completions 请求 URI；设置后优先使用该适配器。
- 本地服务可以不设置密钥；远程服务如需 Bearer 认证，同时设置 `OPENAI_API_KEY`。
- 使用 `AI_MODEL` 指定服务实际支持的模型。
- 默认不启用联网搜索，只生成暂译。
- 只有服务明确支持 `web_search` 工具时才设置：

```sh
AI_COMPLETION_WEB_SEARCH=true
```

AI 联网结果必须带证据链接，否则降级为暂译。所有 AI 结果都进入待确认队列，不自动写入正式库。不要把密钥写入 JSON、README 或提交到仓库。

## 人工确认

```sh
pnpm titles:review
```

打开 `http://127.0.0.1:4173`。服务只监听本机，支持：

- 修改正式中文名和别名。
- 查看 AI 联网证据。
- 选择官方、民间或 AI 暂译级别。
- 确认写入 `data/titles.json`。
- 拒绝候选并冷却 90 天。

确认后重新生成扩展：

```sh
pnpm titles:build
pnpm build
```

## 请求降频与缓存

- 已入库作品跳过。
- 待确认且原名哈希未变化的作品跳过，不重复调用 AI。
- AI 搜索和暂译均无结果时冷却 30 天。
- 被拒绝候选冷却 90 天。
- Bangumi 在线无结果冷却 7 天。
- 未配置 `AI_COMPLETION_URI` 或 `OPENAI_API_KEY` 时不发出 AI 请求，也不制造 AI 冷却。
- 译名分片按 AniList ID 低字节拆分，后台按需读取。
- 多个标签页共享后台内存缓存，相同分片并发读取自动去重。
- IndexedDB 批量读写使用单事务，分片加载最多并发 4 项。
- 正式库内容哈希变化时自动清理旧 IndexedDB，避免已删除译名继续显示。
- 页面消息在微任务中合并，每条正式库消息最多携带 100 个 ID。
- DOM 监听处理元素、纯文本和必要属性变化，通过 `requestAnimationFrame` 合批。
- 所有标题提示共用一个悬浮层。

## 开发命令

```sh
pnpm dev            # 开发模式
pnpm check          # TypeScript 严格检查
pnpm test           # 单元测试
pnpm build          # Chromium 生产构建
pnpm test:e2e       # 真实浏览器扩展测试
pnpm zip            # Chromium ZIP
pnpm build:firefox  # Firefox 构建
pnpm zip:firefox    # Firefox ZIP
pnpm titles:sync    # 同步与解析译名
pnpm titles:review  # 本地人工确认页面
pnpm titles:build   # 构建译名分片
```

端到端测试优先使用本机 Edge，也可通过 `CHROME_PATH` 指定 Chromium 浏览器。

## 当前限制

- 正式译名库仍在建设初期，覆盖率需要通过同步和人工贡献逐步提升。
- Bangumi 匹配采用保守策略，跨站别名或条目结构差异可能造成漏配；宁可保留原名，也不强行匹配。
- AI 服务由维护者自行配置，项目不附带密钥。
- 固定界面词典尚未覆盖所有 AniList 页面；用户简介、评论和自定义内容不会被翻译。

## 许可

代码使用 MIT 许可证。Bangumi、AI 候选和人工确认记录保留来源信息，便于审计与纠正。
