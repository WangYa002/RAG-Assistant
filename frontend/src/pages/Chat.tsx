import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Citation, streamChat } from "../api/client";

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
    setTurns((t) => [...t, { role: "user", content: question, citations: [] }, { role: "assistant", content: "", citations: [], streaming: true }]);

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
          const last = next[next.length - 1];
          if (!last.content) next.pop(); // 空回答则移除占位
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
  };

  return (
    <section aria-labelledby="chat-title" className="flex gap-6 h-[calc(100vh-13rem)] min-h-[28rem]">
      {/* 会话档案 */}
      <aside className="w-52 shrink-0 flex flex-col" aria-label="问询档案">
        <button
          className="btn-primary text-sm px-3 py-2 mb-3"
          onClick={() => {
            setConvId(null);
            setTurns([]);
            setError(null);
          }}
        >
          ＋ 新问询单
        </button>
        <div className="flex-1 overflow-y-auto pr-1">
          {conversations.data?.length ? (
            conversations.data.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`block w-full text-left text-sm px-2 py-1.5 rounded-sm mb-0.5 border-b border-line hover:bg-paper-deep ${
                  c.id === convId ? "bg-paper-deep" : ""
                }`}
              >
                <span className="digits text-[10px] text-tea block">
                  {`Q-${String(c.id).padStart(4, "0")}`}
                </span>
                <span className="block truncate">{c.title}</span>
              </button>
            ))
          ) : (
            <p className="text-xs text-ink-soft px-2">尚无问询记录。</p>
          )}
        </div>
      </aside>

      {/* 阅读桌 */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-baseline gap-4">
          <h2 id="chat-title" className="section-head text-2xl">
            阅读桌
          </h2>
          <span className="digits text-xs text-tea">READING DESK · 提问与溯源</span>
        </div>
        <hr className="cut-line mt-2" />

        <div className="flex-1 overflow-y-auto py-4 pr-1" aria-live="polite">
          {turns.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="section-head text-xl text-ink-soft">向资料室递一张问询单</p>
              <p className="text-sm text-ink-soft mt-2 max-w-prose">
                回答完全基于已归档文献生成，每条结论都附
                <span className="text-seal"> [n] </span>
                来源编号，可在回答下方的剪报条里核对原文。
              </p>
            </div>
          ) : (
            turns.map((turn, i) =>
              turn.role === "user" ? (
                <div key={i} className="flex justify-end my-3">
                  <p className="clip-slip px-4 py-2 max-w-[80%] text-[15px]">
                    <span className="digits text-[10px] text-tea block mb-0.5">问询单</span>
                    {turn.content}
                  </p>
                </div>
              ) : (
                <AnswerBlock key={i} turn={turn} onRate={rate} />
              )
            )
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="text-sm text-seal mb-2" role="alert">
            出错了：{error}（可重试，或到「设置」检查模型接入）
          </p>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            className="field flex-1 px-3 py-2 text-[15px] resize-none"
            rows={2}
            placeholder="把问题写进问询单，Enter 发出，Shift+Enter 换行"
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
          <button className="btn-primary px-5 py-2.5 text-sm" onClick={ask} disabled={busy || !input.trim()}>
            {busy ? "检索中……" : "递单提问"}
          </button>
        </div>
      </div>
    </section>
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
    <article className="my-4">
      <div className="text-[15px] leading-[1.85] whitespace-pre-wrap max-w-prose">
        {turn.content}
        {turn.streaming && (
          <span className="text-seal digits animate-pulse" aria-label="正在生成">
            ▍
          </span>
        )}
      </div>

      {turn.citations.length > 0 && (
        <div className="mt-3 max-w-prose">
          <p className="digits text-[10px] tracking-[0.25em] text-tea mb-1.5">
            SOURCES · 来源剪报 {turn.citations.length} 条
          </p>
          <div className="flex flex-col gap-1.5">
            {turn.citations.map((c) => (
              <div key={c.index} className="clip-slip">
                <button
                  className="w-full text-left px-3 py-1.5 flex items-baseline gap-2 text-sm"
                  onClick={() => setOpenIdx(openIdx === c.index ? null : c.index)}
                  aria-expanded={openIdx === c.index}
                >
                  <span className="digits text-xs text-seal shrink-0">[{c.index}]</span>
                  <span className="truncate">
                    《{c.filename}》第 {c.idx + 1} 条
                  </span>
                  <span className="digits text-[10px] text-ink-faint ml-auto shrink-0 pl-2">
                    相似度 {c.score.toFixed(3)}
                  </span>
                  <span className="digits text-[10px] text-ink-soft shrink-0" aria-hidden>
                    {openIdx === c.index ? "▲ 收起" : "▼ 展开"}
                  </span>
                </button>
                {openIdx === c.index && (
                  <p className="px-3 pb-2.5 pt-1 text-sm text-ink-soft border-t border-dashed border-line-dark leading-relaxed">
                    {c.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!turn.streaming && turn.id && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="digits text-[10px] text-ink-faint tracking-[0.2em]">批阅：</span>
          <button
            className={`btn-ghost px-2 py-0.5 ${turn.rating === "up" ? "text-seal border-seal" : ""}`}
            onClick={() => onRate(turn, "up")}
          >
            有据 ✓
          </button>
          <button
            className={`btn-ghost px-2 py-0.5 ${turn.rating === "down" ? "text-seal border-seal" : ""}`}
            onClick={() => onRate(turn, "down")}
          >
            存疑 ✗
          </button>
        </div>
      )}
      <hr className="cut-line mt-4" />
    </article>
  );
}
