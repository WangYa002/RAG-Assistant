# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: React 18 + Vite + TypeScript + Tailwind CSS + TanStack Query + ECharts（用户在需求澄清中选定 React；后端为 FastAPI，已在技术方案中确认）

## Users

企业知识库管理员与业务用户：他们上传内部文档（PDF/DOCX/MD/TXT），向知识库提问并获得带引用的回答，用评估集量化回答质量，用看板追踪使用情况。 secondary：工程/算法团队，通过设置页切换模型、检索参数，并导出微调数据。

## Product Purpose

「智汇知识库」是一个企业级 RAG（检索增强生成）问答与效果评估平台。它让团队把散落的文档变成可问答、可溯源、可度量的知识资产。成功的标志：上传→提问→带引用回答的闭环可演示；评估集能产出 Hit-Rate/MRR/忠实度等指标；看板可视化运行状况。

## Positioning

评估与检索质量透明化：不同于只做对话的问答产品，本平台内建混合检索（向量+BM25+RRF）、引用溯源与自动化评估流水线，每次回答的质量都可量化、可追踪。

## Operating Context

本地/内网部署（FastAPI + SQLite + ChromaDB 单机即可运行）；无 API Key 时以 Mock 模式完整演示；示例语料位于 backend/data_seed/sample_docs，配套内置评估集 builtin_smoke。

## Capabilities and Constraints

- 五个界面：知识库、问答、评估、看板、设置
- 问答为 SSE 流式输出，回答附 [n] 引用编号，可点赞点踩
- 知识库：拖拽/选择上传、列表、删除、重建索引
- 评估：选择数据集一键运行，展示指标卡与逐条明细
- 设置：模型接入（DeepSeek 兼容 API）、连接测试、检索参数、微调数据导出（JSONL + LLaMA-Factory YAML）
- 约束：单管理员使用场景（无登录/多租户）；中文界面；Mock 模式必须可完整走通

## Brand Commitments

产品名「智汇知识库」（Zhihui Knowledge Base）。无既定视觉资产，无锁定色彩/字体承诺。

## Evidence on Hand

后端 API 已实现并有 36 个 pytest 用例覆盖（backend/）；设计 spec 见 docs/superpowers/specs/。无真实用户数据、无客户证言——不得虚构。

## Product Principles

1. 可信优先：每个回答都能看到出处，每次评估都有可复现的数字
2. 状态诚实：空状态、加载、失败都要说清当前发生了什么
3. 密度服务于扫描：看板与列表是 Operate 场景，信息优先于装饰
4. 零配置可演示：Mock 模式下全链路可用，不强迫用户先懂配置
