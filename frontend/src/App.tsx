import { NavLink, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api/client";
import Knowledge from "./pages/Knowledge";
import Chat from "./pages/Chat";
import Eval from "./pages/Eval";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";

const NAV = [
  { to: "/knowledge", index: "01", label: "知识库", sub: "收文台" },
  { to: "/chat", index: "02", label: "问答", sub: "阅读桌" },
  { to: "/eval", index: "03", label: "评估", sub: "质检台" },
  { to: "/dashboard", index: "04", label: "看板", sub: "值班日志" },
  { to: "/settings", index: "05", label: "设置", sub: "值房" },
];

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function todayStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}·${p(d.getMonth() + 1)}·${p(d.getDate())} 星期${WEEKDAYS[d.getDay()]}`;
}

export default function App() {
  const health = useQuery({ queryKey: ["health"], queryFn: api.health });

  return (
    <div className="min-h-screen flex flex-col">
      {/* 报头：通栏印泥红 */}
      <header className="bg-seal text-paper">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-baseline gap-5 flex-wrap">
          <h1 className="masthead-title text-2xl leading-none">智汇知识库</h1>
          <span className="digits text-[11px] tracking-[0.22em] opacity-90">
            ZHIHUI CLIPPING BUREAU · RAG DESK
          </span>
          <div className="ml-auto flex items-center gap-4">
            <span className="digits text-xs opacity-95">{todayStamp()}</span>
            <span
              className="digits text-[11px] border border-paper/70 rounded-sm px-1.5 py-0.5 tracking-widest"
              title={
                health.data?.mock
                  ? "未配置 API Key，当前以本地 Mock 模型运行"
                  : `已接入 ${health.data ? "远程模型" : "……"}`
              }
            >
              {health.isLoading ? "……" : health.data?.mock ? "MOCK 值机" : "DEEPSEEK 在线"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl w-full px-6 flex-1 flex gap-8 py-6">
        {/* 档案夹标签轨 */}
        <nav className="w-40 shrink-0 flex flex-col gap-1 pt-2" aria-label="主导航">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <span
                  className="folder-tab block px-3 py-2"
                  data-active={isActive}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="digits block text-[10px] tracking-[0.25em] opacity-70">
                    {item.index}
                  </span>
                  <span className="section-head block text-base leading-tight">
                    {item.label}
                  </span>
                  <span className="block text-xs opacity-70">{item.sub}</span>
                </span>
              )}
            </NavLink>
          ))}
          <p className="mt-auto text-[11px] leading-relaxed text-ink-soft pt-6">
            每份文献经收文、剪裁、归档三道工位入库；
            每条回答附来源戳，可在阅读桌下方的剪报条中核对。
          </p>
        </nav>

        {/* 阅读桌 */}
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Knowledge />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/eval" element={<Eval />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Knowledge />} />
          </Routes>
        </main>
      </div>

      <footer className="mx-auto max-w-6xl w-full px-6 pb-6">
        <hr className="cut-line" />
        <p className="digits text-[11px] text-ink-soft pt-3">
          FASTAPI · CHROMADB · BGE + BM25 混合检索 · RRF 融合 · 资料室常年开馆
        </p>
      </footer>
    </div>
  );
}
