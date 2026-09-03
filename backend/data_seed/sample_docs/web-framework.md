# Web 开发框架知识

## FastAPI 简介

FastAPI 是一个用于构建 API 的现代、高性能 Python Web 框架，基于标准 Python 类型提示。
FastAPI 的主要特点包括：快速开发、减少人为错误、编辑器智能提示、原生支持异步。
FastAPI 基于 Starlette 提供异步能力，基于 Pydantic 提供数据校验，自动生成 OpenAPI 文档。

FastAPI 适合构建 RESTful API 与微服务，性能可与 Node.js 和 Go 相当，
是 Python 生态中最流行的现代 Web 框架之一，被广泛用于大模型应用的推理服务编排层。
企业使用 FastAPI 可以快速把大模型、向量数据库等组件封装成标准的 HTTP 接口。

FastAPI 支持依赖注入、中间件、后台任务与 WebSocket，社区生态完善。
FastAPI 与 uvicorn 搭配部署是当前大模型服务的主流方案。
