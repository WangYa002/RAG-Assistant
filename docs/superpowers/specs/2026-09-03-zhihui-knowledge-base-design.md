# 设计文档：「智汇知识库」企业级 RAG 智能问答与效果评估平台

- 日期：2026-09-03
- 状态：已批准（经 AskUserQuestion 需求澄清 + ExitPlanMode 设计评审通过）
- 技能流程：superpowers:brainstorming（Architectural 路径）
- 岗位对标：AI 大模型应用开发工程师（大模型应用开发 / 模型微调 / RAG 检索 / 效果评估 / 数据分析）

## 1. 目的与成功标准

构建一个可直接演示、可量化评估的企业级 RAG（检索增强生成）问答平台，
完整覆盖岗位 JD 的四项核心经验：

1. 大模型应用开发与集成（OpenAI 兼容接入层，可切换 DeepSeek/Qwen/Ollama/Mock）
2. RAG 检索（解析 → 分块 → 向量化 → 混合检索 → 重排 → 生成 → 引用溯源）
3. 效果评估（测试集管理 + Hit-Rate/MRR/忠实度/答案相关性自动化评估）
4. 数据分析（查询量/延迟/反馈/指标趋势看板）

**成功标准（验收）**：上传文档 → 入库 → 提问 → 流式返回带引用的回答；
无 API Key 时 Mock 模式跑通全链路；一键评估产出报告并可视化；
后端 pytest 全绿；前端 build 通过；GUI 黑盒测试通过。

## 2. 需求澄清记录（已确认）

- LLM 服务：**DeepSeek API**（OpenAI 兼容），Key 由用户提供，写入 `backend/.env`；必须内置 Mock 实现保证无 Key 可演示。
- 前端栈：**React 18 + Vite + TypeScript + Tailwind CSS**；后端 Python FastAPI。
- 范围裁剪（YAGNI）：无多租户/权限系统；无在线训练（微调实验室只做数据导出 + LLaMA-Factory 配置生成）；向量库用单机 ChromaDB，不引入 Milvus；数据库用 SQLite。

## 3. 架构

```
浏览器 (React SPA)
   │  REST + SSE
   ▼
FastAPI 后端
   ├── api/        documents, chat, eval, analytics, models 五组路由
   ├── services/   业务编排（入库流水线、问答流水线、评估流水线）
   ├── rag/        loader → chunker → embedder → vectorstore → retriever → reranker → generator
   ├── eval/       dataset, metrics(hit_rate/mrr/faithfulness/relevance), runner
   ├── models/     SQLAlchemy: Document, Chunk, Conversation, Message, QueryLog, EvalRun, ModelConfig
   └── core/       配置(.env)、LLM 客户端工厂(DeepSeek/Mock)、Embedding 客户端(BGE/Mock)
   ▼
SQLite (元数据) + ChromaDB (向量, data/chroma) + 本地文件 (data/uploads)
```

数据流（问答）：用户提问 → retriever 并行取向量 Top-K 与 BM25 Top-K → RRF 融合 →
（可选）重排截断 Top-N → 组装带来源的提示词 → LLM 流式生成（SSE）→ 落库
QueryLog/Message → 前端渲染回答与引用。

## 4. 组件边界（每个单元一句话职责）

| 单元 | 职责 | 依赖 |
|---|---|---|
| `core/config.py` | 读取 .env：模型 base_url/key/model、路径、检索参数 | — |
| `core/llm.py` | LLM 抽象 + DeepSeek(OpenAI兼容) 与 Mock 两实现 + 工厂 | config |
| `core/embedding.py` | Embedding 抽象 + BGE 本地实现 + Mock(哈希向量) + 工厂 | config |
| `rag/loader.py` | PDF/DOCX/MD/TXT → 纯文本 | pypdf, python-docx |
| `rag/chunker.py` | 递归字符分块（500 字，重叠 80），返回 ChunkMeta | langchain text-splitter |
| `rag/vectorstore.py` | ChromaDB 封装：upsert/query/delete，metadata 过滤 | chromadb |
| `rag/retriever.py` | 混合检索：向量 + BM25 + RRF 融合 | vectorstore, rank-bm25 |
| `rag/generator.py` | 提示词模板组装 + 流式生成 + 引用标注 | core/llm |
| `eval/metrics.py` | hit_rate、mrr、faithfulness(LLM 判断)、answer_relevance | core/llm |
| `eval/runner.py` | 读测试集 → 逐条跑问答流水线 → 计算指标 → 存 EvalRun | rag, eval/metrics |
| `api/*` | 五组 REST/SSE 路由，参数校验，错误响应 | services |

## 5. 错误处理策略

- LLM/Embedding 调用失败：统一 `AppError(code, message)`；聊天接口返回 SSE error 事件；Mock 模式永不失败。
- 上传非法类型/超大小（>20MB）：422 带中文提示。
- 空知识库提问：正常返回并声明"知识库暂无资料"。
- Chroma 与 SQLite 一致性：入库先写 SQLite 再写 Chroma，删除反之；孤儿向量启动时不清理（YAGNI），提供重建索引接口。

## 6. 测试策略

- 后端 TDD（superpowers:test-driven-development）：pytest + FastAPI TestClient；
  LLM/Embedding 全部走 Mock 注入，不依赖网络；检索/评估指标用固定小语料断言精确值。
- 前端：Vitest 组件冒烟 + `npm run build` 通过。
- 端到端：browser-use:web-gui-tester 黑盒走查 上传→提问→评估→看板。

## 7. 里程碑

M0 环境/技能 → M1 spec+plan → M2 后端骨架+入库 → M3 RAG 问答 →
M4 评估+看板 → M5 前端(impeccable) → M6 GUI 联调(systematic-debugging) →
M7 验收(verification-before-completion)+交付(docx)。
