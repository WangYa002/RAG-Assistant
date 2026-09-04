import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Citation, streamChat } from "../api/client";
import { IconChat, IconCheck, IconChevron, IconPlus, IconSend, IconX } from "../components/icons";

interface Turn {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  id?: number;
  rating?: "up" | "down" | null;
  streaming?: boolean;
}

export default function Chat() {
  const qc = useQueryClient();
  const [convId, setConvId] = useState<number | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery({ queryKey: ["conversations"], queryFn: api.conversations });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const loadConversation = async (id: number) => {
    setConvId(id);
    setError(null);
    try {
      const msgs = await api.messages(id);
      setTurns(
        msgs.map((m) => ({
          role: m.role,
          content: m.content,
          citations: m.citations,
          id: m.id,
          rating: m.rating,
        }))
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const ask = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    setTurns((t) => [
      ...t,
      { role: "user", content: question, citations: [] },
      { role: "assistant", content: "", citations: [], streaming: true },
    ]);

    await streamChat(question, convId, {
      onCitations: (hits) =>
        setTurns((t) => {
          const next = [...t];
          next[next.length - 1] = { ...next[next.length - 1], citations: hits };
          return next;
        }),
      onDelta: (text) =>
        setTurns((t) => {
          const next = [...t];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + text };
          return next;
        }),
      onDone: ({ message_id, conversation_id }) => {
        setTurns((t) => {
          const next = [...t];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, streaming: false, id: message_id };
          return next;
        });
        if (conversation_id !== convId) setConvId(conversation_id);
        qc.invalidateQueries({ queryKey: ["conversations"] });
        qc.invalidateQueries({ queryKey: ["overview"] });
        qc.invalidateQueries({ queryKey: ["trends"] });
        setBusy(false);
      },
      onError: (message) => {
        setError(message);
        setTurns((t) => {
          const next = [...t];
          if (!next[next.length - 1]?.content) next.pop();
          return next;
        });
        setBusy(false);
      },
    });
  };

  const rate = async (turn: Turn, rating: "up" | "down") => {
    if (!turn.id) return;
    await api.rate(turn.id, rating);
    setTurns((t) => t.map((x) => (x.id === turn.id ? { ...x, rating } : x)));
    qc.invalidateQueries({ queryKey: ["overview"] });
  };

  return (
    <div className="flex h-full min-w-0">
      {/* 会话列表 */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 lg:flex">
        <button
          className="btn btn-primary w-full"
          onClick={() => {
            setConvId(null);
            setTurns([]);
            setError(null);
          }}
        >
          <IconPlus size={14} />
          新对话
        </button>
        <div className="mt-3 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {conversations.data?.length ? (
            conversations.data.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`w-full truncate rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-surface2 ${
                  c.id === convId ? "bg-surface2 font-medium" : "text-soft"
                }`}
                title={c.title}
              >
                {c.title}
              </button>
            ))
          ) : (
            <p className="px-2.5 py-2 text-xs text-faint">暂无历史会话</p>
          )}
        </div>
      </aside>

      {/* 对话主区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 md:px-8">
          <div className="min-h-0 flex-1 overflow-y-auto py-6" aria-live="polite">
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface2 text-soft"
                  aria-hidden
                >
                  <IconChat size={20} />
                </span>
                <h1 className="mt-4 text-lg font-semibold tracking-tight">向知识库提问</h1>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-soft">
                  回答基于已入库文档生成，每个结论附带 <span className="mono text-ink">[n]</span>{" "}
                  引用编号，点击引用可核对原文与相似度
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {turns.map((turn, i) =>
                  turn.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-surface px-4 py-2.5 text-[15px] leading-relaxed">
                        {turn.content}
                      </p>
                    </div>
                  ) : (
                    <AnswerBlock key={i} turn={turn} onRate={rate} />
                  )
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {error && (
            <p
              className="rise mb-3 rounded-lg px-3 py-2 text-sm"
              style={{ background: "color-mix(in srgb, var(--kb-danger) 8%, transparent)", color: "var(--kb-danger)" }}
              role="alert"
            >
              出错了：{error}　可重试，或到「设置」检查模型接入
            </p>
          )}

          {/* 输入区 */}
          <div className="pb-5">
            <div className="card flex items-end gap-2 p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <textarea
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] leading-relaxed outline-none placeholder:text-faint"
                rows={1}
                placeholder="输入问题，Enter 发送，Shift+Enter 换行"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask();
                  }
                }}
                disabled={busy}
              />
              <button
                className="btn btn-primary !h-9 !w-9 !px-0 shrink-0"
                onClick={ask}
                disabled={busy || !input.trim()}
                aria-label="发送"
              >
                <IconSend size={16} />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-faint">
              内容由 AI 生成，请以引用原文为准
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerBlock({
  turn,
  onRate,
}: {
  turn: Turn;
  onRate: (turn: Turn, rating: "up" | "down") => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <article className="rise">
      <div className="whitespace-pre-wrap text-[15px] leading-[1.8]">
        {turn.content}
        {turn.streaming && <span className="caret" aria-label="正在生成" />}
      </div>

      {turn.citations.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="mono text-[10px] font-medium tracking-[0.16em] text-faint">
            SOURCES · {turn.citations.length}
          </p>
          {turn.citations.map((c) => (
            <div key={c.index} className="card overflow-hidden">
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface"
                onClick={() => setOpenIdx(openIdx === c.index ? null : c.index)}
                aria-expanded={openIdx === c.index}
              >
                <span className="mono flex h-6 w-7 items-center justify-center rounded-md bg-surface2 text-[11px] font-medium">
                  [{c.index}]
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {c.filename}
                  <span className="text-soft"> · 片段 {c.idx + 1}</span>
                </span>
                <span className="mono text-[11px] text-faint">{c.score.toFixed(3)}</span>
                <span
                  className="text-faint transition-transform duration-200"
                  style={{ transform: openIdx === c.index ? "rotate(180deg)" : "none" }}
                  aria-hidden
                >
                  <IconChevron size={14} />
                </span>
              </button>
              {openIdx === c.index && (
                <p className="border-t border-line px-3.5 py-2.5 text-sm leading-relaxed text-soft">
                  {c.text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!turn.streaming && turn.id && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            className={`btn btn-ghost !h-7 !px-2 ${turn.rating === "up" ? "!text-ok" : "text-soft"}`}
            style={turn.rating === "up" ? { borderColor: "var(--kb-ok)" } : undefined}
            onClick={() => onRate(turn, "up")}
            aria-label="有帮助"
            title="有帮助"
          >
            <IconCheck size={14} />
          </button>
          <button
            className={`btn btn-ghost !h-7 !px-2 ${turn.rating === "down" ? "!text-danger" : "text-soft"}`}
            style={turn.rating === "down" ? { borderColor: "var(--kb-danger)" } : undefined}
            onClick={() => onRate(turn, "down")}
            aria-label="需改进"
            title="需改进"
          >
            <IconX size={14} />
          </button>
        </div>
      )}
    </article>
  );
}
