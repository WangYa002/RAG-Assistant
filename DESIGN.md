# DESIGN.md — 剪报室 The Clipping Bureau

> 由 documenter 环节（degraded 内线程替代，已声明）从已构建界面记录，ground truth 为准。
> 方向契约 seed：`5a4b2d22`（concept-seed --scope direction --mode operate，code-led 构建）。

## World（一句话）

企业知识库即报社资料室：每条回答是一张带来源戳的剪报，每项评估是质检台的一次盖章评定。

## Palette（新闻纸 + 暖墨 + 印泥红）

| 令牌 | 值 | 用途 |
|---|---|---|
| `--color-paper` | `#F6F2E9` | 页面地色（暖米白，横线纸纹叠加 3% 墨线） |
| `--color-paper-deep` | `#EEE8D9` | 档案夹标签、滚动条槽、悬停面 |
| `--color-ink` | `#211D17` | 正文与标题（暖墨近黑） |
| `--color-ink-soft` | `#6B6353` | 次级文字（自纸色取灰，≥4.5:1） |
| `--color-seal` | `#BE3B2B` | 印泥红：报头通栏、活动标签底色、主按钮、命中✓、光标 |
| `--color-seal-deep` | `#96271B` | 红色按压态 |
| `--color-tea` | `#6E5F42` | 元信息小标签（编号、时间戳） |
| `--color-line` / `--color-line-dark` | `#D8CFBB` / `#B9AD93` | 栏线 / 裁切虚线 |

承诺规则：红色按"整片区域"使用（通栏报头、整枚活动标签），不做散点强调。

## Typography

- **报头/标题**：Noto Serif SC 700/900（报刊宋体传统），`.section-head` 带 0.04em 字距；报名 0.08em。
- **正文**：系统黑体栈（PingFang SC / Microsoft YaHei），15px / 1.7。
- **仪表数字**：IBM Plex Mono，`.digits`，tabular-nums——一切数字（编号、时间、指标、相似度）必须等宽。
- 层阶：报头 24px → 页标题 24px 宋体 → 区块标题 18px 宋体 → 正文 15px → 注记 12px → 仪表小签 10px 宽字距。

## Composition & Components

- **报头横栏**：通栏印泥红；左宋体报名 + 拉丁mono刊号；右当日日期戳 + 模式印章（MOCK 值机 / DEEPSEEK 在线）。
- **档案夹标签轨**：主导航为五枚立式文件夹标签（`folder-tab`），编号 01–05 + 中文名 + 工位别名；活动项红底纸色字。
- **裁切虚线**（`cut-line`）：1.5px dashed，替代一切装饰分隔线。
- **剪报条**（`clip-slip`）：引用来源卡，纸白 `#FBF8F1`，1px 线 + 双层软阴影（有偏移有模糊）。
- **印章**（`stamp`）：2.5px 红描边 + 宋体 + 噪声蒙版做印泥质感；`stamp-in` 关键帧（旋转 -14°→-4°，scale 1.7→1）为全站唯一署名动效。
- **工位流程**：`01 收文 ──▶ 02 剪裁 ──▶ 03 归档`（评估为 取样→检索→生成→评定），运行段红色。
- **台账读数**：栏线式分栏（divide-x），大号等宽数字，不做卡片、不逐项着色。
- **表格**：细栏线行分隔，编号列 mono，操作按钮 ghost 描边。

## Controls & States

- 主按钮 `btn-primary` 红底纸字；hover 深红；active 下沉 1px。
- 次按钮 `btn-ghost` 描边；禁用 45% 透明度。
- 输入 `field`：纸白底，聚焦红边 + 25% 红色 ring。
- 空态都有引导文案（如"资料室还没有文献"）；加载态用 mono「……」+ pulse。

## Browser Surfaces（一并入世界）

选区 = 红底纸字；插入光标 seal 红；滚动条暖灰圆角；focus-visible 2px 红描边。

## Motion

仅一次署名动效（盖章）；其余为 150ms ease-out 的色彩/位移过渡与加载 pulse。尊重 `prefers-reduced-motion`。

## 不要做（Refuse）

- 不用通用 SaaS 卡片栅格承载内容；读数走台账/报表。
- 不加 kicken/eyebrow；区块标题自带分量。
- 不用彩色 border-left 条纹；活动态用整枚红标签。
- 不用 ▼▲ 等字形充当图标；方向语义用文字（展开原文/收起）。
- ✓/✗ 仅作为批阅编辑符号（勾/叉传统），不扩展成图标系统。

## 证据

- 评审截图：`.impeccable/review/desktop.png`、`mobile.png` 及 desktop-{knowledge,chat,eval,dashboard,settings}。
- GUI 测试证据：`gui-test-screenshots/`（t1–t10，含修复前后对照）。
