import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api/client";
import { ThemeProvider, useTheme } from "./theme";
import {
  IconChart,
  IconChat,
  IconClipboard,
  IconDatabase,
  IconMoon,
  IconSliders,
  IconSun,
} from "./components/icons";
import Knowledge from "./pages/Knowledge";
import Chat from "./pages/Chat";
import Eval from "./pages/Eval";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";

const SIDEBAR_MIN = 184;
const SIDEBAR_MAX = 340;
const SIDEBAR_DEFAULT = 240;

const NAV = [
  { to: "/knowledge", label: "知识库", sub: "文档入库与索引", icon: IconDatabase },
  { to: "/chat", label: "问答", sub: "检索增强生成", icon: IconChat },
  { to: "/eval", label: "评估", sub: "质量评定", icon: IconClipboard },
  { to: "/dashboard", label: "看板", sub: "运行数据", icon: IconChart },
  { to: "/settings", label: "设置", sub: "模型与微调", icon: IconSliders },
];

function ModeChip({ full = false }: { full?: boolean }) {
  const health = useQuery({ queryKey: ["health"], queryFn: api.health, refetchInterval: 30000 });
  const mock = health.data?.mock ?? true;
  return (
    <span className="chip text-soft" title={mock ? "未配置 API Key，本地 Mock 模型运行中" : "DeepSeek 已连接"}>
      <span className="dot" style={{ color: mock ? "var(--kb-warn)" : "var(--kb-ok)" }} />
      {full ? (mock ? "Mock 模式运行中" : "DeepSeek 已连接") : mock ? "MOCK" : "DEEPSEEK"}
    </span>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="btn btn-ghost w-9 !px-0"
      onClick={toggle}
      aria-label={theme === "light" ? "切换到深色" : "切换到浅色"}
      title={theme === "light" ? "切换到深色" : "切换到浅色"}
    >
      {theme === "light" ? <IconMoon /> : <IconSun />}
    </button>
  );
}

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accentink"
        aria-hidden
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17V7l8 5 8-5v10" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">智汇知识库</span>
      <span className="mono hidden text-[10px] font-medium tracking-[0.14em] text-faint sm:inline">
        RAG ASSISTANT
      </span>
    </span>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}

function Shell() {
  const [sidebarW, setSidebarW] = useState(
    () => clamp(Number(localStorage.getItem("kb-sidebar-w")) || SIDEBAR_DEFAULT)
  );
  const drag = useRef<{ startX: number; startW: number } | null>(null);

  const onMove = useCallback((e: MouseEvent) => {
    if (!drag.current) return;
    setSidebarW(clamp(drag.current.startW + e.clientX - drag.current.startX));
  }, []);
  const onUp = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    localStorage.setItem("kb-sidebar-w", String(clamp(sidebarWRef.current)));
  }, []);

  // 用 ref 让 onUp 读到最新宽度
  const sidebarWRef = useRef(sidebarW);
  sidebarWRef.current = sidebarW;

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onMove, onUp]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { startX: e.clientX, startW: sidebarW };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  return (
    <div className="flex h-full">
        {/* 侧栏（桌面，右缘可拖拽调宽，双击复位） */}
        <aside
          className="relative hidden shrink-0 flex-col border-r border-line bg-surface md:flex"
          style={{ width: sidebarW }}
        >
          <div className="px-4 pb-4 pt-5">
            <Brand />
          </div>
          <nav className="flex flex-col gap-0.5 px-3" aria-label="主导航">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className="nav-link" data-active={undefined}>
                {({ isActive }) => (
                  <span className="nav-link w-full" data-active={isActive}>
                    <Icon size={17} />
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto space-y-3 px-4 pb-5">
            <ModeChip full />
            <div className="flex items-center justify-between">
              <p className="mono text-[10px] leading-relaxed text-faint">
                FastAPI · ChromaDB
                <br />
                BGE + BM25 · RRF
              </p>
              <ThemeToggle />
            </div>
          </div>
          <div
            role="separator"
            aria-label="拖拽调整侧栏宽度"
            aria-orientation="vertical"
            title="拖拽调整宽度，双击复位"
            onMouseDown={startDrag}
            onDoubleClick={() => {
              setSidebarW(SIDEBAR_DEFAULT);
              localStorage.setItem("kb-sidebar-w", String(SIDEBAR_DEFAULT));
            }}
            className="absolute right-0 top-0 z-10 h-full w-1.5 -mr-0.5 cursor-col-resize transition-colors hover:bg-line2"
            style={{ touchAction: "none" }}
          />
        </aside>

        {/* 主区 */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 顶栏（移动端） */}
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:hidden">
            <Brand />
            <span className="flex items-center gap-2">
              <ModeChip />
              <ThemeToggle />
            </span>
          </header>
          <nav
            className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2 md:hidden"
            aria-label="主导航"
          >
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}>
                {({ isActive }) => (
                  <span
                    className="nav-link !px-3"
                    data-active={isActive}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <Icon size={15} />
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <main className="min-h-0 flex-1 overflow-hidden">
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
      </div>
  );
}

function clamp(w: number): number {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(w)));
}
