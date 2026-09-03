# 设计方案：「智汇知识库」企业级 RAG 智能问答与效果评估平台

## 一、岗位要求 → 应用能力映射（为什么做这个应用）

| JD 要求 | 应用落点 |
|---|---|
| 大模型应用开发、集成与迭代优化 | OpenAI 兼容模型接入层，可切换 DeepSeek/Qwen/Ollama/Mock |
| 需求分析、模型微调、RAG 检索 | RAG 全链路（解析→分块→向量化→混合检索→重排→生成）+ 微调实验室 |
| 向量数据库、主流大模型框架 | ChromaDB + LangChain + BGE 中文 embedding |
| 效果评估、数据分析、持续优化 | 自动化评估模块（hit-rate/MRR/忠实度/答案相关性）+ 数据看板 |
| Python 编程能力 | 后端全 Python（FastAPI） |

## 二、产品功能（6 个模块）

1. **知识库管理**：上传 PDF/DOCX/MD/TXT → 解析 → 分块 → 向量化入库；文档/分块浏览删除
2. **智能问答（RAG）**：混合检索（向量 + BM25）→ 重排 → DeepSeek 生成；流式输出（SSE）、引用溯源、多轮对话、点赞点踩反馈
3. **效果评估**：评估测试集管理（问题/标准答案/预期出处）→ 一键跑评估（检索命中率 Hit-Rate、MRR、忠实度、答案相关性，参考 RAGAS 方法）→ 评估报告
4. **数据分析看板**：查询量、响应延迟、检索得分分布、反馈统计、指标趋势图（ECharts）
5. **模型管理**：模型配置（base_url/api_key/model 可配）、连接测试、Mock 模式（无 Key 可演示全链路）
6. **微调实验室（scaffold）**：将问答对导出为微调 JSONL 数据集、生成 LLaMA-Factory LoRA 训练配置与对接说明

## 三、技术栈

- **前端**：React 18 + Vite + TypeScript + Tailwind CSS + React Router + TanStack Query + ECharts（设计走 impeccable）
- **后端**：Python FastAPI + SQLAlchemy + SQLite + SSE 流式接口
- **RAG**：LangChain（loaders/splitters）+ ChromaDB + rank-bm25 + sentence-transformers（BAAI/bge-small-zh-v1.5，CPU 可跑）
- **LLM**：deepseek-chat（OpenAI 兼容客户端），.env 配置，内置 Mock 实现保底
- **测试**：pytest（后端 TDD）+ Vitest（前端）+ web-gui-tester（端到端黑盒）

## 四、GitHub 软件清单（按 JD 经验检索的开源软件）

**技能类（通过 skill-installer 安装）：**
- `obra/superpowers` — 14 个开发流程技能：brainstorming、writing-plans、executing-plans、test-driven-development、systematic-debugging、verification-before-completion、requesting/receiving-code-review、finishing-a-development-branch 等
- 前端设计用已安装的 **`impeccable`**（即你说的 "inprocess"，本地已就绪，无需下载）

**框架/参考类（作为依赖与架构参考）：**
- `langchain-ai/langchain`（大模型应用框架）、`chroma-core/chroma`（向量库）、`hiyouga/LLaMA-Factory`（微调，配置格式对齐）、`explodinggradients/ragas`（RAG 评估方法）、`infiniflow/ragflow`（RAG 产品架构参考）

## 五、Skills 全栈流水线（每个开发环节必调技能）

| 阶段 | 环节 | 调用的 Skill | 来源 |
|---|---|---|---|
| 0 | 技能准备 | skill-installer 安装 superpowers 全部 14 个技能到 `~/.agents/skills` | GitHub |
| 1 | 需求分析与产品设计 | `superpowers:brainstorming` → 产出需求/产品设计文档 | superpowers |
| 2 | 技术方案与任务拆解 | `superpowers:writing-plans` → 技术设计 + 实施计划 | superpowers |
| 3 | 前端设计 | `impeccable`（init → shape → craft → critique/polish，产出 PRODUCT.md/DESIGN.md） | 本地 |
| 4 | 后端 + RAG 核心开发 | `superpowers:executing-plans` + `superpowers:test-driven-development`（pytest 先行） | superpowers |
| 5 | 前后端联调与端到端验证 | `browser-use:web-gui-tester`（真实 GUI 黑盒测试全流程） | 本地插件 |
| 6 | 缺陷定位 | `superpowers:systematic-debugging` | superpowers |
| 7 | 验收评审 | `superpowers:verification-before-completion` + `requesting-code-review` + `receiving-code-review` | superpowers |
| 8 | 收尾交付 | `superpowers:finishing-a-development-branch` + `document-skills:docx`（项目文档，可选 pptx 汇报） | superpowers + 本地 |
| 9 | 经验沉淀（可选） | `kwai`（AI 应用经验上传助手）、`jd-resume-tailor`（项目写入简历） | 本地 |

## 六、项目结构（D:\AI_app）

```
AI_app/
├── frontend/          # React 18 + Vite + TS + Tailwind
│   └── src/{pages,components,api,stores,styles}
├── backend/
│   ├── app/
│   │   ├── api/       # routers: documents, chat, eval, analytics, models
│   │   ├── rag/       # loader, chunker, embedder, vectorstore, retriever, reranker, generator
│   │   ├── eval/      # dataset, metrics, runner
│   │   ├── models/    # SQLAlchemy 模型
│   │   └── core/      # 配置(.env)、LLM 客户端(DeepSeek/Mock)
│   └── tests/         # pytest（TDD）
├── docs/              # 每个环节的产出文档
├── data/              # sqlite、chroma、uploads
└── README.md
```

## 七、实施顺序

1. **M0**：git init + 安装 superpowers 技能 + 检查 python/node 环境 + 目录骨架
2. **M1**：brainstorming 需求文档 → writing-plans 技术方案（docs/）
3. **M2**：后端骨架 + 文档解析入库链路（TDD）
4. **M3**：RAG 问答链路（检索/重排/生成/引用/流式，TDD，DeepSeek + Mock 双实现）
5. **M4**：评估模块 + 数据看板接口（TDD）
6. **M5**：impeccable 前端设计与实现（知识库/问答/评估/看板/设置 5 个页面）
7. **M6**：web-gui-tester 端到端黑盒联调 + systematic-debugging 修缺陷
8. **M7**：verification-before-completion 验收 + code review + docx 文档交付 + 收尾

## 八、验收标准

- 上传文档 → 入库 → 提问 → 流式返回带引用的回答，全链路可演示
- 无 API Key 时 Mock 模式可跑通全部流程；配置 DeepSeek Key 后切换真实模型
- 对内置示例测试集一键评估，产出 Hit-Rate/MRR/忠实度报告并在看板可视化
- 后端 pytest 全绿、前端 build 通过、GUI 黑盒测试通过
- docs/ 中留有每个环节对应 skill 的产出文档

需要你准备的唯一外部依赖：**DeepSeek API Key**（放入 `backend/.env`，没有也可先用 Mock 开发，最后再填）。