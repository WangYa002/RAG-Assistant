# DESIGN.md — Codex-style Modern Minimal

> 由 documenter 环节从已构建界面记录，ground truth 为准。
> 方向契约：**brief-pinned（用户指定「仿 Codex 风格，现代化」）**，code-led，见 `frontend/index.html` 顶部注释。
> 本版完全替换 2026-09-03 的「剪报室」世界（重设计，非润色）。

## World（一句话）

安静的现代工作台：近白/近黑双主题、单色墨阶、圆角卡片与等宽数字——信任留白，让内容与数字说话。

## Palette（双主题，单色墨阶 + 克制语义色）

| 令牌 | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#212121` | 页面地色 / 主按钮（深色反转） |
| `surface` | `#F9F9F9` | `#272727` | 侧栏、卡片内表头、用户气泡 |
| `surface-2` | `#F1F1F1` | `#323232` | 悬停面、活动导航、徽章底 |
| `line` / `line-strong` | `#ECECEC` / `#D9D9D9` | `#333333` / `#454545` | 发丝边框（卡片 / 控件描边） |
| `ink` | `#0D0D0D` | `#ECECEC` | 正文与标题（即主按钮底色，互为反转） |
| `soft` / `faint` | `#6E6E6E` / `#9A9A9A` | `#A8A8A8` / `#7C7C7C` | 次级 / 注记文字 |
| `ok` `warn` `danger` | `#1A8948` `#C77C0A` `#DC2626` | `#3FD68F` `#E5A83C` `#F87171` | 仅用于状态点、chip、结果语义 |
| `datagreen` | `#10A37F`（两主题同值） | 同左 | 唯一数据强调色：时延曲线 |

规则：主按钮 = ink 反转块（浅色墨黑底白字 / 深色白底墨字）；语义色只以小点与细描边出现，不作大面积铺色。

## Typography

- **Inter**（400/500/600/700）+ 系统中文黑体栈（PingFang SC / Microsoft YaHei）。Inter 属检测器警示的常见脸，但 Codex 美学的衬线替代（Söhne 系）就是它的本色——钉定简报优先，有据保留。
- 数据一律 `.mono`：系统等宽栈 + `tabular-nums`（指标、时间、编号、相似度、代码）。
- 层阶：页标题 20px semibold → 区块标题 13.5px semibold → 正文 15px → 注记 12–13px → mono 小签 10–11px（0.14–0.16em 字距）。

## Shape & Depth

- 圆角：卡片 14px、按钮/输入 10px、气泡 16px（右下角 6px 收口）、chip 全圆。
- 边框一律 1px 发丝线；阴影仅输入卡一处 `0 1px 2px rgba(0,0,0,.04)`；无装饰性光晕、无渐变。

## Components

- **侧栏**：240px `surface` 底 + 右发丝线；品牌行（墨块 logo + 名称 + mono 刊号）；五项导航（线性图标 1.7 描边 + 文字），活动项 `surface-2` 填充 + 600 字重；底部模式状态（点 + 文案）与主题切换。
- **表格**：卡片容器内，表头 `surface` 底 12px `soft` 字，行 `border-t` 发丝线 + hover `surface`；操作为图标幽灵按钮。
- **chip / 状态**：全圆描边；状态点 `dot` 6px 圆点（ok/warn/danger 语义色）。
- **上传区**：2px 虚线圆角 16px，拖入时描边转 ink + `surface` 底。
- **流程指示**（收文→剪裁→归档 / 取样→检索→生成→评定）：chip + `h-px` 连接线，活动项 ink 描边 + 脉冲点。
- **引用条**：卡片 + mono 序号徽章 `[n]` + 文件名/片段 + 相似度 + 旋转 chevron；展开显示原文。
- **输入卡**：圆角卡片内 textarea + 墨色圆形发送钮（禁用 40% 透明度）。
- **ECharts**：主序列 = 墨色实线 + 5% 面积，时延 = `datagreen` 虚线；网格线 `line`、轴字 `soft`，随主题切换重建。

## Motion（唯一署名时刻）

- 消息/通知浮现 `rise`（6px 上移 + 淡入，240ms expo-out）。
- 评估指标 **CountUp 数位滚动**（700ms cubic-out，rAF）。
- 流式光标 `caret` 方块闪烁（1s steps）；chevron 旋转 200ms。
- 全站主题切换 180ms 颜色过渡；尊重 `prefers-reduced-motion`。

## Browser Surfaces

选区/光标 = ink 反转；滚动条圆角细条（`line-strong` 底、透明轨道）；focus-visible 2px ink 外环。

## 不要做（Refuse）

- 不用大面积语义色或渐变；墨阶承担全部层级。
- 不加 kicker/eyebrow 与装饰性图标；图标仅导航与操作。
- 不用字形符号（▲▼·）充当图标；方向语义交给旋转 chevron。
- 等宽字体只用于数据/代码/编号，不做「技术感」装饰。

## 主题机制

`data-theme` 属性驱动 CSS 变量（`@theme inline` 映射 Tailwind v4 令牌），`localStorage('kb-theme')` 持久化，`index.html` 内联脚本预置防闪烁；切换即时生效，图表按主题重建。

## 证据

`.impeccable/review/v2-*`：desktop-light（知识库）、desktop-chat（引用展开）、desktop-dark（看板）、mobile（问答）。
