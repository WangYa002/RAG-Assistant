# 「智汇知识库」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans（本会话选择 Inline Execution）逐任务执行。步骤用 checkbox 跟踪。

**Goal:** 构建企业级 RAG 问答与效果评估平台（DeepSeek + ChromaDB + FastAPI + React）。

**Architecture:** FastAPI 单体后端（rag/eval/core 分层）+ SQLite 元数据 + ChromaDB 向量库；React SPA 经 REST/SSE 访问；LLM/Embedding 均为可注入抽象（DeepSeek、BGE、Mock 三实现）。

**Tech Stack:** Python 3.12、FastAPI、SQLAlchemy、chromadb、fastembed(BGE)、rank-bm25、openai SDK、pytest；React18+Vite+TS+Tailwind、TanStack Query、ECharts。

**Spec:** docs/superpowers/specs/2026-09-03-zhihui-knowledge-base-design.md

## Global Constraints

- Python 用 3.12（`py -3.12`）建 venv；Node ≥ 20。
- LLM/Embedding 全部经工厂获取，测试注入 Mock，不出网。
- 所有业务错误抛 `AppError(code, message)`，路由层统一转 4xx JSON。
- 中文 UI 文案；代码标识符英文。
- 数据目录：`data/`（sqlite.db、chroma/、uploads/），git 忽略。
- 检索默认：CHUNK_SIZE=500, CHUNK_OVERLAP=80, TOP_K=8, FINAL_K=4。

---

### Task 1: 后端骨架 + 配置 + 健康检查

**Files:** Create `backend/requirements.txt`、`backend/app/__init__.py`、`backend/app/main.py`、`backend/app/core/config.py`、`backend/app/core/errors.py`、`backend/tests/conftest.py`、`backend/tests/test_health.py`
**Interfaces (Produces):** `get_settings() -> Settings`（缓存）；`AppError(code: str, message: str, status: int = 400)`；app 工厂 `create_app()`。

- [x] Step 1: 写失败测试 `test_health.py`：`GET /api/health` 返回 `{"status":"ok","mock":bool}`，并测 `AppError` 处理器返回 `{code,message}`。
- [x] Step 2: venv + `pip install -r requirements.txt`（fastapi uvicorn[standard] sqlalchemy pydantic-settings chromadb rank-bm25 fastembed pypdf python-docx openai python-multipart pytest httpx），运行 `pytest`，期望 FAIL。
- [x] Step 3: 实现 `config.py`（字段：llm_base_url=DeepSeek 默认、llm_api_key=''、llm_model='deepseek-chat'、embedding_provider='auto'、data_dir、chunk/top_k 参数；`mock_mode` = api_key 为空）、`errors.py`、`main.py`（CORS、异常处理器、/api/health）。
- [x] Step 4: `pytest` PASS → commit `feat: backend skeleton`。

### Task 2: SQLAlchemy 模型 + 建库

**Files:** Create `backend/app/models/entities.py`、`backend/app/core/db.py`、`backend/tests/test_models.py`
**Interfaces (Produces):** `Base`、`get_session()`、`init_db()`；实体：`Document(id, filename, ext, size, status, chunk_count, created_at)`、`Chunk(id, doc_id, idx, text)`、`Conversation(id, title, created_at)`、`Message(id, conversation_id, role, content, citations_json, rating, created_at)`、`QueryLog(id, question, latency_ms, top_score, created_at)`、`EvalRun(id, dataset_name, metrics_json, per_item_json, created_at)`、`Setting(key, value)`。

- [x] Step 1: 失败测试：`init_db()` 后能插入并回读一条 Document/Message（内存 SQLite）。
- [x] Step 2: 运行 FAIL → 实现 → PASS → commit。

### Task 3: LLM 客户端工厂（Mock + DeepSeek）

**Files:** Create `backend/app/core/llm.py`、`backend/tests/test_llm.py`
**Interfaces (Produces):** `class BaseLLM: chat(messages: list[dict], stream: bool) -> Iterator[str]`；`MockLLM`（按问题关键词回显知识片段的确定性文案）；`DeepSeekLLM(base_url, api_key, model)`（openai SDK，`stream=True`）；`get_llm(settings) -> BaseLLM`（api_key 为空→Mock，打 info 日志）。

- [x] Step 1: 失败测试：Mock 流式返回多块 str 且包含固定标记；工厂在空 key 时返回 MockLLM。
- [x] Step 2: FAIL → 实现 → PASS → commit。

### Task 4: Embedding 客户端（Mock + fastembed/BGE）

**Files:** Create `backend/app/core/embedding.py`、`backend/tests/test_embedding.py`
**Interfaces (Produces):** `class BaseEmbedder: embed(texts: list[str]) -> list[list[float]]; name: str`；`MockEmbedder`（确定性哈希 256 维，归一化）；`BGEEmbedder(model="BAAI/bge-small-zh-v1.5")`（fastembed，懒加载，ImportError/下载失败时由工厂降级）；`get_embedder(settings)`：settings.embedding_provider: auto|mock|bge。

- [x] Step 1: 失败测试：Mock 同文本向量一致、异文本不同、维度 256；工厂 provider=mock 返回 MockEmbedder。
- [x] Step 2: FAIL → 实现（BGE 用 try/import 懒加载）→ PASS → commit。

### Task 5: loader + chunker

**Files:** Create `backend/app/rag/loader.py`、`backend/app/rag/chunker.py`、`backend/tests/test_loader_chunker.py`
**Interfaces (Produces):** `load_text(path: Path, ext: str) -> str`（txt/md 直读 utf-8；pdf→pypdf；docx→python-docx；不支持→AppError）；`chunk_text(text: str, size=500, overlap=80) -> list[str]`（langchain_text_splitters.RecursiveCharacterTextSplitter，中文分隔符优先）。

- [x] Step 1: 失败测试：含已知句子的 .md 切块后所有文本可拼接还原关键句；短文本返回单块；`.xyz` 抛 AppError。
- [x] Step 2: FAIL → 实现 → PASS → commit。

### Task 6: vectorstore（Chroma 封装）

**Files:** Create `backend/app/rag/vectorstore.py`、`backend/tests/test_vectorstore.py`
**Interfaces (Produces):** `class VectorStore: add(chunks: list[dict])  # {id, doc_id, idx, text}; query(embedding, top_k) -> list[dict]; delete_doc(doc_id); count() -> int`；构造 `VectorStore(persist_dir, embedder)`，query 内部 embed。

- [x] Step 1: 失败测试（tmp 目录 + MockEmbedder）：add→query 返回含 text/doc_id/idx 且分数域正确；delete_doc 后 count 减少。
- [x] Step 2: FAIL → 实现（chromadb PersistentClient，cosine space）→ PASS → commit。

### Task 7: retriever（混合检索 + RRF）

**Files:** Create `backend/app/rag/retriever.py`、`backend/tests/test_retriever.py`
**Interfaces (Produces):** `class Retriever(vector_store, chunks_provider)  # chunks_provider() -> list[{id,text,doc_id}] 供 BM25；search(question, top_k=8, final_k=4) -> list[hit]`；hit=`{chunk_id, doc_id, idx, text, score, source:"vector|bm25|rrf"}`；`rrf_fuse(list_a, list_b, k=60)` 模块级函数可单测。

- [x] Step 1: 失败测试：构造 5 段固定语料，MockEmbedder 下含关键词段落经 RRF 排前；空库返回 []。
- [x] Step 2: FAIL → 实现（rank_bm25.BM25Okapi + jieba 分词? 否——用字符 bigram 分词避免新依赖）→ PASS → commit。

### Task 8: 入库流水线 + documents API

**Files:** Create `backend/app/rag/ingest.py`、`backend/app/api/documents.py`；Modify `app/main.py`（挂路由、app 级单例容器）
**Interfaces (Produces):** `ingest_document(session, settings, vector_store, tmp_path, filename) -> Document`（load→chunk→SQLite→Chroma，status=ready）；路由：`POST /api/documents/upload`(multipart)、`GET /api/documents`、`DELETE /api/documents/{id}`（同时删向量）、`POST /api/index/rebuild`。单例容器 `app.state.kb = KnowledgeBundle(vector_store, retriever, ...)`。

- [x] Step 1: 失败测试（TestClient + tmp 数据目录 + mock embedder）：上传 .md → 200 且 status=ready、chunk_count>0；GET 列表含之；DELETE 后列表为空且 vector count=0。
- [x] Step 2: FAIL → 实现 → PASS → commit。

### Task 9: generator + chat API（SSE + 会话 + 反馈）

**Files:** Create `backend/app/rag/generator.py`、`backend/app/api/chat.py`；Modify `app/main.py`
**Interfaces (Produces):** `build_prompt(question, hits) -> (system, user)`（模板要求回答附 [n] 引用标注；无命中文本时声明知识库无资料）；`POST /api/chat/stream` body=`{conversation_id?, question}` → SSE 事件序列：`event: citations`（data=json hits）→ 多个 `event: delta`（data={"text"}）→ `event: done`（data={"message_id","conversation_id"}）；`GET /api/conversations`、`GET /api/conversations/{id}/messages`、`POST /api/messages/{id}/rating`。每次问答写 Message + QueryLog(latency, top_score)。

- [x] Step 1: 失败测试：stream 接口（MockLLM）响应 content-type 为 text/event-stream，按行解析出 citations/delta/done 事件；rating 落库。
- [x] Step 2: FAIL → 实现 → PASS → commit。

### Task 10: 评估模块 + 内置数据集

**Files:** Create `backend/app/eval/metrics.py`、`backend/app/eval/runner.py`、`backend/data_seed/eval_dataset.json`、`backend/app/api/eval.py`
**Interfaces (Produces):** `hit_rate(items), mrr(items)  # items: list[list[retrieved_doc_ids]], expected: list[doc_id]` → 实际签名 `compute_retrieval_metrics(ranked_ids: list[list[str]], expected_ids: list[str]) -> {hit_rate, mrr}`；`faithfulness(answer, hits, llm) -> float`（LLM 判断 0/1 打分，Mock 有关键词重叠时 1）；`answer_relevance(question, answer, llm) -> float`；`run_eval(session, settings, kb, dataset) -> EvalRun`（逐条 search→generate→metrics）。数据集格式 `[{question, ground_truth, expected_chunk_ids}]`，内置数据集 6 条（基于 seed 语料）。路由：`GET /api/eval/datasets`（返回内置+说明）、`POST /api/eval/runs`、`GET /api/eval/runs`。

- [x] Step 1: 失败测试：compute_retrieval_metrics 对手工样例给出精确值（如 [[1,2],[3,4],[9,1]] expected [1,3,9] → hit_rate=1.0, mrr=(1+0.5+0.5)/3）；runner 在 seed 语料 + Mock 下 hit_rate≥0.5。
- [x] Step 2: FAIL → 实现 → PASS → commit。

### Task 11: analytics + settings + finetune API

**Files:** Create `backend/app/api/analytics.py`、`backend/app/api/settings.py`
**Interfaces (Produces):** `GET /api/analytics/overview` → `{total_queries, avg_latency_ms, feedback:{up,down}, doc_count, chunk_count}`；`GET /api/analytics/trends?days=7` → 按日 `{date, queries, avg_latency}`；`GET/PUT /api/settings/model`（读写 Setting 表，PUT 后重建 app.state 单例；api_key 脱敏返回）；`POST /api/settings/model/test` → `{ok, detail}`（真实模式发 1 次最小补全）；`POST /api/finetune/export` → 从问答记录导出 OpenAI 格式 JSONL + LLaMA-Factory lora yaml（返回文件内容 JSON：{jsonl, yaml}）。

- [x] Step 1: 失败测试：造 3 条 QueryLog + 反馈 → overview 数值正确；settings PUT 后 GET 脱敏（key 只留后 4 位）。
- [x] Step 2: FAIL → 实现 → PASS → commit。

### Task 12: 前端脚手架（impeccable: init/shape）

**Files:** Create `frontend/`（Vite react-ts 模板 + tailwindcss + react-router-dom + @tanstack/react-query + echarts + 自研 api client `src/api/client.ts`）
**Interfaces (Consumes):** Task 8-11 全部 REST/SSE 契约。

- [x] Step 1: `npm create vite` + 依赖安装 + Tailwind 配置；`src/api/client.ts` 封装 fetch（base `/api`，SSE 用 ReadableStream 解析）。
- [x] Step 2: 路由骨架 5 页（知识库/问答/评估/看板/设置）+ 侧边栏布局；`npm run build` 通过 → commit。
- [x] Step 3: 运行 impeccable init 产出 PRODUCT.md/DESIGN.md（设计系统：色彩/字体/间距 token）。

### Task 13: 前端页面实现（impeccable: craft）

**Files:** Create `frontend/src/pages/{Knowledge,Chat,Eval,Dashboard,Settings}.tsx` 及组件
- [x] Step 1: 知识库页：拖拽上传 + 文档列表 + 删除 + 重建索引。
- [x] Step 2: 问答页：会话列表 + 消息流（SSE 增量渲染）+ 引用折叠面板 + 点赞点踩。
- [x] Step 3: 评估页：数据集选择 + 一键评估 + 指标卡片 + 历史报告表。
- [x] Step 4: 看板页：overview 指标卡 + 7 日趋势折线 + 反馈环形图（ECharts）。
- [x] Step 5: 设置页：模型配置表单 + 连接测试 + 微调实验室（导出 JSONL/yaml）。
- [x] Step 6: impeccable critique/polish 一轮 → `npm run build` 通过 → commit。

### Task 14: 端到端联调（web-gui-tester）+ 验收

- [x] Step 1: 启动 backend(uvicorn:8000) + frontend(vite:5173，proxy /api)。
- [x] Step 2: browser-use:web-gui-tester 黑盒走查：上传→提问（断言引用与流式）→评估→看板→设置。
- [x] Step 3: 缺陷走 superpowers:systematic-debugging 修复。
- [x] Step 4: 全量 `pytest` + `npm run build` 复核；impeccable polish；docs/ 交付文档（docx 技能）；finishing-a-development-branch 收尾。
