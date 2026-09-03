// 「智汇知识库」项目交付文档生成脚本（docx skill: Create route / R1 recipe / DM-1 palette）
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, SectionType,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType, TableOfContents, PageBreak,
} = require("docx");
const fs = require("fs");

// ── Palette: DM-1 Deep Cyan（AI / 科技）──
const P = {
  bg: "162235", accent: "37DCF2",
  titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078",
  primary: "0F2033", body: "222A33", secondary: "5A6672",
  table: { headerBg: "1B6B7A", headerText: "FFFFFF", accentLine: "1B6B7A", innerLine: "C8DDE2", surface: "EDF3F5" },
};

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ── calcTitleLayout / splitTitleLines / calcCoverSpacing（design-system.md 规定）──
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."，。、；：！？", ..."的与和及之在于为", ..."-_—–·/", ..." \t"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) {
      breakAt = charsPerLine;
      const prevChar = remaining[breakAt - 1], nextChar = remaining[breakAt];
      if (prevChar && nextChar && !breakAfter.has(prevChar) && !breakAfter.has(nextChar) &&
          /[\u4e00-\u9fff]/.test(prevChar) && /[\u4e00-\u9fff]/.test(nextChar)) breakAt -= 1;
    }
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / (pt * 20));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0 } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const safeRemaining = Math.max(usableHeight - contentHeight, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, midSpacing: Math.max(safeRemaining - topSpacing - bottomSpacing, 0), bottomSpacing };
}

// ── R1 Pure Paragraph Cover（design-system.md 配方）──
function buildCoverR1(config) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "), size: 18, color: P.accent,
        font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titlePt * 2, bold: true, color: P.titleColor,
        font: { eastAsia: "SimHei", ascii: "Arial" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: P.subtitleColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 }, border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: P.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders, children })],
    })],
  })];
}

// ── 正文构件 ──
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: { ascii: "Calibri", eastAsia: "SimHei" } })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: P.primary, font: { ascii: "Calibri", eastAsia: "SimHei" } })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 420 },
    spacing: { line: 312, after: opts.after || 80 },
    children: [new TextRun({ text, size: 24, color: P.body })],
  });
}
function cellHead(text, width) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 21, color: P.table.headerText })] })],
    shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  });
}
function cell(text, width) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, size: 21, color: P.body })] })],
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  });
}
function tableTitle(text) {
  return new Paragraph({
    keepNext: true, spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 21, color: P.secondary })],
  });
}
function dataTable(headers, rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((t, i) => cellHead(t, widths ? widths[i] : undefined)) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, widths ? widths[i] : undefined)) })),
    ],
  });
}
function pageNumFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
    })],
  });
}
function docHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine, space: 4 } },
      children: [new TextRun({ text: "智汇知识库 · 项目交付文档", size: 18, color: "888888" })],
    })],
  });
}

// ── 正文内容 ──
const bodyChildren = [
  h1("一、项目概述"),
  body("智汇知识库是一个对标「AI 大模型应用开发工程师」岗位要求构建的企业级 RAG（检索增强生成）智能问答与效果评估平台。系统把散落的内部文档转化为可问答、可溯源、可度量的知识资产：上传文档后自动完成解析、分块与向量化入库；用户提问时系统执行混合检索与大模型生成，回答附带可展开核对的引用来源；内置评估流水线对检索与回答质量输出量化指标；值班日志看板持续记录运行状况。"),
  body("项目全程按照技能化开发流水线组织：从需求分析、实施计划、后端 TDD 开发、前端设计实现，到端到端测试与验收，每个环节均调用对应的技能并留存产出文档。"),
  tableTitle("表 1-1 岗位要求与应用能力映射"),
  dataTable(
    ["岗位要求", "应用落点"],
    [
      ["大模型应用开发、集成与迭代优化", "OpenAI 兼容模型接入层，可切换 DeepSeek/Qwen/Ollama/Mock，设置页热生效"],
      ["需求分析、模型微调、RAG 检索", "RAG 全链路（解析-分块-向量化-混合检索-融合-生成-引用）与微调数据导出"],
      ["向量数据库、主流大模型开发框架", "ChromaDB 向量库 + LangChain 文本切分 + BGE 中文嵌入（fastembed ONNX CPU）"],
      ["效果评估、数据分析、持续优化", "Hit-Rate/MRR/忠实度/相关性自动评估与值班日志看板"],
      ["扎实的 Python 编程能力", "后端全 Python（FastAPI），36 个 pytest 用例全覆盖"],
    ],
    [38, 62]
  ),

  h1("二、系统架构与技术栈"),
  body("系统采用前后端分离架构。后端为 FastAPI 单体服务，按 core（配置与模型客户端）、rag（检索流水线）、eval（评估）、api（路由）分层；元数据存于 SQLite，向量存于 ChromaDB（持久化），原始文档落盘于 data/uploads。前端为 React 18 单页应用，经 REST 与 SSE 访问后端。"),
  body("模型接入层为可注入抽象：LLM 提供 DeepSeek（OpenAI 兼容）与 Mock 两个实现，Embedding 提供 BGE（bge-small-zh-v1.5，ONNX CPU）与 Mock 两个实现，均通过工厂函数按配置装配；未配置 API Key 时自动进入 Mock 模式，保证离线可演示。"),
  tableTitle("表 2-1 技术栈清单"),
  dataTable(
    ["层次", "选型"],
    [
      ["后端框架", "Python 3.12 · FastAPI · SQLAlchemy · SQLite · SSE 流式"],
      ["RAG 组件", "ChromaDB · fastembed(BGE) · rank-bm25 · LangChain text splitters"],
      ["模型接入", "DeepSeek deepseek-chat（OpenAI 兼容）+ Mock 双实现"],
      ["前端", "React 18 · Vite · TypeScript · Tailwind CSS v4 · TanStack Query · ECharts"],
      ["测试", "pytest（36 例，全离线注入）· 前端 tsc 严格模式 · GUI 黑盒走查"],
    ],
    [30, 70]
  ),
  body("检索流水线为混合检索：向量 Top-8 与 BM25 Top-8 并行召回，经 RRF（Reciprocal Rank Fusion）融合排序后截断为 Top-4 引用；生成阶段将引用编号写入提示词，要求模型以 [n] 标注来源，实现回答可溯源。"),

  h1("三、功能模块"),
  tableTitle("表 3-1 五大功能模块"),
  dataTable(
    ["模块", "核心能力"],
    [
      ["知识库 · 收文台", "拖拽上传 PDF/DOCX/MD/TXT，解析分块向量化入库；文献总表、退卷删除、索引重建"],
      ["问答 · 阅读桌", "SSE 流式回答、[n] 引用溯源（可展开原文与相似度）、多轮会话档案、有据/存疑批阅"],
      ["评估 · 质检台", "一键运行内置评估集（6 题），输出指标读数、逐题明细与历史评定档案"],
      ["看板 · 值班日志", "累计问询、平均时延、检索分、在库文献、剪报条目台账；七日双轴趋势图；批阅比例"],
      ["设置 · 值房", "模型接入配置与连接测试、检索参数热更新、微调数据导出（SFT JSONL + LLaMA-Factory LoRA YAML）"],
    ],
    [28, 72]
  ),

  h1("四、效果评估体系"),
  body("评估模块内置 builtin_smoke 冒烟评估集（6 道中文问答，与示例语料配套）。运行时对每道题执行完整的检索与生成流水线，再逐项打分：检索侧以期望关键词是否命中召回片段计算命中率与 MRR；生成侧以词面重合为基线，配置真实大模型时升级为模型判分的忠实度与答案相关性。"),
  tableTitle("表 4-1 实测评估结果（Mock 模型 + BGE 检索，2026-09-03）"),
  dataTable(
    ["指标", "数值", "说明"],
    [
      ["来源命中率 Hit-Rate", "100.0%", "6 题全部在召回结果中命中期望来源"],
      ["首命中位次 MRR", "1.000", "全部首位命中，混合排序有效"],
      ["平均忠实度", "20.4%", "Mock 回答词面基线；接入真实模型后由模型判分"],
      ["平均答案相关性", "100.0%", "回答复现问题关键信息"],
    ],
    [34, 18, 48]
  ),

  h1("五、Skills 全栈开发流水线"),
  body("本项目要求每个开发环节调用对应技能，缺失技能从 GitHub 安装。实际执行记录如下，全部产出已随仓库交付。"),
  tableTitle("表 5-1 环节与技能映射"),
  dataTable(
    ["环节", "调用技能", "主要产出"],
    [
      ["技能获取", "skill-installer ← GitHub obra/superpowers", "14 个开发流程技能装至本地"],
      ["需求与产品设计", "superpowers:brainstorming（Architectural 路径）", "docs/superpowers/specs/ 设计文档"],
      ["实施计划", "superpowers:writing-plans", "docs/superpowers/plans/ 实施计划"],
      ["后端与 RAG 开发", "superpowers:executing-plans + test-driven-development", "36 个 pytest 用例先行，全绿"],
      ["前端设计", "impeccable（init-concept seed-craft-detect-finish review）", "PRODUCT.md、DESIGN.md、剪报室视觉体系"],
      ["端到端测试", "browser-use:web-gui-tester", "gui-test-screenshots/ 全流程证据"],
      ["缺陷定位与修复", "superpowers:systematic-debugging", "批阅按钮接线缺陷等修复"],
      ["验收", "superpowers:verification-before-completion", "全新验证证据（见第六节）"],
      ["交付文档", "document-skills:docx", "本文档"],
    ],
    [24, 40, 36]
  ),

  h1("六、测试与验收"),
  body("验收遵循 verification-before-completion 原则，以下均为全新执行的验证证据（2026-09-03）："),
  tableTitle("表 6-1 验收清单"),
  dataTable(
    ["验收项", "命令/方式", "结果"],
    [
      ["后端单元测试", "pytest tests/", "36 passed，0 failed"],
      ["前端构建", "npm run build（tsc 严格模式 + vite）", "构建成功，exit 0"],
      ["后端服务健康", "GET /api/health", "status=ok，Mock 模式正常"],
      ["GUI 黑盒主流程", "web-gui-tester 全流程走查", "上传入库-流式问答-引用命中-评估-看板-设置全部通过"],
      ["评估流水线", "运行 builtin_smoke 评估集", "Hit-Rate 100.0%，MRR 1.000"],
      ["离线可演示", "无 API Key 全链路演示", "Mock 模式全流程可用"],
    ],
    [26, 40, 34]
  ),
  body("GUI 黑盒测试中发现并修复两处问题：其一，流式回答结束后批阅按钮未随 message_id 回写而不出现，修复后已验证；其二，移动端视口下工位流程条横向溢出，已改为可换行布局。修复均经浏览器回归确认，截图证据存于 gui-test-screenshots/。"),

  h1("七、部署与使用"),
  body("后端：进入 backend 目录，以 Python 3.12 创建虚拟环境并安装 requirements.txt，执行 uvicorn app.main:app --port 8000。可选配置环境变量 KB_LLM_API_KEY 接入 DeepSeek；不配置则自动进入 Mock 模式。前端：进入 frontend 目录执行 npm install 与 npm run dev，访问 http://localhost:5173，开发服务器已代理 /api 至后端。"),
  body("演示路径：先在知识库上传 backend/data_seed/sample_docs 下的三篇示例文献，转至问答页提问（例如：FastAPI 是什么），核对流式回答与引用剪报条；再在评估页一键运行内置评估集，最后在看板查看运行台账。若需接入真实模型，在设置页填写 API Key 并保存，保存后立即生效。"),

  h1("八、总结与展望"),
  body("本项目以一条完整的技能化流水线交付了一个可演示、可量化、可二次开发的企业级 RAG 平台，覆盖岗位说明中大模型应用集成、RAG 检索、效果评估与数据分析四项核心经验。后续可迭代方向：接入重排序（Rerank）模型提升首命中质量、扩展知识图谱问答、引入流式引用高亮、以及利用微调实验室产出在 LLaMA-Factory 中完成领域 LoRA 训练并回接推理。"),
];

// ── 组装：封面 / 目录(罗马页码) / 正文(阿拉伯页码从 1) ──
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: P.primary },
        paragraph: { spacing: { before: 360, after: 160, line: 312 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: P.primary },
        paragraph: { spacing: { before: 240, after: 120, line: 312 }, outlineLevel: 1 },
      },
    },
  },
  sections: [
    { // 封面
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: "智汇知识库项目交付文档",
        subtitle: "企业级 RAG 智能问答与效果评估平台",
        englishLabel: "PROJECT DELIVERY REPORT",
        metaLines: [
          "对标岗位：AI 大模型应用开发工程师",
          "技术栈：FastAPI · ChromaDB · BGE + BM25 · React 18 · DeepSeek",
          "开发流水线：superpowers skills + impeccable + web-gui-tester",
          "交付日期：2026-09-03    版本：v1.0",
        ],
        footerLeft: "ZHIHUI KNOWLEDGE BASE",
        footerRight: "2026-09-03",
      }),
    },
    { // 目录 — 罗马页码
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageNumFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "目  录", bold: true, size: 32, font: { eastAsia: "SimHei", ascii: "Times New Roman" } })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "注：本目录由域代码生成。编辑文档后请在目录上点击右键并选择\u201c更新域\u201d以刷新页码。",
            italics: true, size: 18, color: "888888",
          })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    { // 正文 — 阿拉伯页码从 1
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: docHeader() },
      footers: { default: pageNumFooter() },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(process.argv[2] || "output.docx", buf);
  console.log("DOCX written:", process.argv[2] || "output.docx");
});
