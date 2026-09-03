# 智汇知识库 · 企业级 RAG 智能问答与效果评估平台

对标「AI 大模型应用开发工程师」岗位要求构建的全栈应用：
大模型应用集成（DeepSeek，OpenAI 兼容）· RAG 检索（BGE 向量 + BM25 混合 + RRF 融合）·
效果评估（Hit-Rate / MRR / 忠实度 / 相关性）· 数据看板 · 微调数据导出（LLaMA-Factory）。

## 快速开始

```bash
# 后端（Python 3.12）
cd backend
py -3.12 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
# （可选）配置 DeepSeek API Key；不配置则自动进入 Mock 模式，全流程可演示
echo KB_LLM_API_KEY=sk-xxx > .env
.venv\Scripts\python -m uvicorn app.main:app --port 8000

# 前端（Node 20+）
cd frontend
npm install
npm run dev        # http://localhost:5173（已代理 /api → 8000）
```

内置示例语料：`backend/data_seed/sample_docs/`（3 篇中文文档）；
配套评估集 `builtin_smoke`（6 题）随服务自动加载。

## 功能地图

| 页面 | 能力 |
|---|---|
| 知识库 · 收文台 | 拖拽上传 PDF/DOCX/MD/TXT → 解析 → 分块 → BGE 向量化入 ChromaDB；重建索引 |
| 问答 · 阅读桌 | SSE 流式回答、[n] 引用溯源（可展开原文）、多轮会话、有据/存疑批阅 |
| 评估 · 质检台 | 一键跑内置评估集：Hit-Rate / MRR / 忠实度 / 相关性 + 逐题明细 + 历史档案 |
| 看板 · 值班日志 | 累计问询 / 平均时延 / 检索分台账 + 七日趋势双轴图 + 批阅比例 |
| 设置 · 值房 | DeepSeek 兼容接入、连接测试、检索参数热更新、微调数据导出（JSONL + LoRA YAML） |

## 技术栈

- **后端** Python 3.12 · FastAPI · SQLAlchemy/SQLite · ChromaDB · fastembed(BGE bge-small-zh-v1.5) · rank-bm25 · openai SDK
- **前端** React 18 · Vite · TypeScript · Tailwind CSS v4 · TanStack Query · ECharts
- **测试** pytest 36 例（后端全离线 TDD）· Vitest 可扩展 · GUI 黑盒走查（证据见 `gui-test-screenshots/`）

## Skills 全栈流水线（每个开发环节调用对应技能）

| 环节 | 技能 | 产出 |
|---|---|---|
| 技能获取 | skill-installer ← GitHub `obra/superpowers`（14 个技能装至 `~/.agents/skills`） | 本地可调用 |
| 需求/产品设计 | `superpowers:brainstorming`（Architectural 路径） | `docs/superpowers/specs/2026-09-03-zhihui-knowledge-base-design.md` |
| 实施计划 | `superpowers:writing-plans` | `docs/superpowers/plans/2026-09-03-zhihui-knowledge-base.md` |
| 后端/RAG 开发 | `superpowers:executing-plans` + `superpowers:test-driven-development` | 36 个 pytest 用例先行 |
| 前端设计 | `impeccable`（init → new-work/concept-seed → craft → detect → finish review） | PRODUCT.md · DESIGN.md · 剪报室视觉世界 |
| 端到端测试 | `browser-use:web-gui-tester` | `gui-test-screenshots/`（t1–t10） |
| 缺陷修复 | `superpowers:systematic-debugging` | BUG-1（批阅按钮）等修复 |
| 验收 | `superpowers:verification-before-completion` | 全新验证证据（见下） |
| 交付文档 | `document-skills:docx` | `docs/智汇知识库-交付文档.docx` |

## 验收证据（2026-09-03）

- `pytest tests/` → **36 passed**（后端，全离线 Mock 注入）
- `npm run build` → **✓ built in ~3s**（tsc 严格模式 + vite，exit 0）
- GUI 黑盒：上传入库 → SSE 流式问答（引用命中正确文档）→ 评估（Hit-Rate 100%、MRR 1.000）→ 看板台账/曲线 → 设置连接测试，桌面 + 移动视口截图全通过
- 无 API Key 时 Mock 模式全链路可演示；配置 Key 后设置页保存即热切换

## 目录结构

```
AI_app/
├── backend/            # FastAPI + RAG + 评估（app/、tests/、data_seed/）
├── frontend/           # React 前端（src/pages 五页面、src/api、剪报室设计）
├── docs/superpowers/   # brainstorming spec + writing-plans 实施计划
├── gui-test-screenshots/  # GUI 黑盒测试证据
├── .impeccable/review/ # 前端 finish review 截图
├── PRODUCT.md          # 产品事实（impeccable init 产出）
└── DESIGN.md           # 设计系统记录（impeccable documenter 产出）
```
