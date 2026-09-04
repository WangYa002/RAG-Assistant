import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, EvalRunResult } from "../api/client";
import { IconCheck, IconRefresh, IconX } from "../components/icons";

const STATIONS = ["取样", "检索", "生成", "评定"];

function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const t0 = performance.now();
    const dur = 700;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{format(display)}</>;
}

export default function Eval() {
  const qc = useQueryClient();
  const datasets = useQuery({ queryKey: ["eval-datasets"], queryFn: api.evalDatasets });
  const history = useQuery({ queryKey: ["eval-runs"], queryFn: api.evalRuns });
  const [selected, setSelected] = useState("");
  const [running, setRunning] = useState(false);
  const [station, setStation] = useState(-1);
  const [result, setResult] = useState<EvalRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && datasets.data?.length) setSelected(datasets.data[0].name);
  }, [datasets.data, selected]);

  const run = async () => {
    if (!selected || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    let step = 0;
    setStation(0);
    const timer = setInterval(() => {
      step = Math.min(step + 1, STATIONS.length - 1);
      setStation(step);
    }, 600);
    try {
      const res = await api.runEval(selected);
      setResult(res);
      qc.invalidateQueries({ queryKey: ["eval-runs"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearInterval(timer);
      setRunning(false);
      setStation(-1);
    }
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8 md:px-10">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">效果评估</h1>
          <p className="mt-1 text-sm text-soft">
            对评估集逐题执行检索与生成流水线，按来源命中、忠实度、相关性打分
          </p>
        </header>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1.5 block text-xs font-medium text-soft">评估集</span>
            <select
              className="field h-9 min-w-60 px-3 text-sm"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={running}
            >
              {datasets.data?.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} · {d.items.length} 题
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={run} disabled={running || !selected}>
            <IconRefresh size={14} className={running ? "animate-spin" : undefined} />
            {running ? "评估中…" : "开始评估"}
          </button>
          {result && (
            <span className="chip ml-auto" style={{ color: "var(--kb-ok)", borderColor: "var(--kb-ok)" }}>
              <IconCheck size={12} />
              评估完成
            </span>
          )}
        </div>

        {/* 流程指示 */}
        <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="评估流程">
          {STATIONS.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-7 bg-line2" aria-hidden />}
              <span
                className="chip"
                style={
                  running && i === station
                    ? { borderColor: "var(--kb-ink)", color: "var(--kb-ink)" }
                    : i < station
                      ? { color: "var(--kb-ok)" }
                      : { color: "var(--kb-faint)" }
                }
              >
                <span className="mono text-[10px]">{`0${i + 1}`}</span>
                {s}
                {running && i === station && <span className="dot" />}
              </span>
            </span>
          ))}
        </div>

        {error && (
          <p
            className="rise mt-4 rounded-lg px-3 py-2 text-sm"
            style={{ background: "color-mix(in srgb, var(--kb-danger) 8%, transparent)", color: "var(--kb-danger)" }}
            role="alert"
          >
            评估失败：{error}
          </p>
        )}

        {result && (
          <>
            {/* 指标读数 */}
            <h2 className="mt-8 text-sm font-semibold">本次指标</h2>
            <div className="card mt-3 grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
              <Metric label="命中率 Hit-Rate" value={result.metrics.hit_rate} format={pct} />
              <Metric label="MRR" value={result.metrics.mrr} format={(v) => v.toFixed(3)} />
              <Metric label="平均忠实度" value={result.metrics.avg_faithfulness} format={pct} />
              <Metric label="平均相关性" value={result.metrics.avg_answer_relevance} format={pct} />
            </div>

            {/* 逐题明细 */}
            <h2 className="mt-8 text-sm font-semibold">逐题明细</h2>
            <div className="card mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-surface text-left text-xs text-soft">
                    <th className="px-4 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">问题 / 回答</th>
                    <th className="px-4 py-2.5 font-medium">命中</th>
                    <th className="px-4 py-2.5 text-right font-medium">位次</th>
                    <th className="px-4 py-2.5 text-right font-medium">忠实度</th>
                    <th className="px-4 py-2.5 text-right font-medium">相关性</th>
                  </tr>
                </thead>
                <tbody>
                  {result.per_item.map((item, i) => (
                    <tr key={i} className="border-t border-line align-top transition-colors hover:bg-surface">
                      <td className="mono px-4 py-2.5 text-xs text-faint">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="max-w-[24rem] px-4 py-2.5">
                        <span className="block font-medium">{item.question}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-soft">
                          {item.answer}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {item.hit ? (
                          <IconCheck size={15} style={{ color: "var(--kb-ok)" }} />
                        ) : (
                          <IconX size={15} className="text-faint" />
                        )}
                      </td>
                      <td className="mono px-4 py-2.5 text-right">{item.first_hit_rank || "—"}</td>
                      <td className="mono px-4 py-2.5 text-right">{pct(item.faithfulness)}</td>
                      <td className="mono px-4 py-2.5 text-right">{pct(item.answer_relevance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 历史记录 */}
        {history.data?.length ? (
          <>
            <h2 className="mt-8 text-sm font-semibold">历史记录</h2>
            <div className="card mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-surface text-left text-xs text-soft">
                    <th className="px-4 py-2.5 font-medium">编号</th>
                    <th className="px-4 py-2.5 font-medium">评估集</th>
                    <th className="px-4 py-2.5 text-right font-medium">命中率</th>
                    <th className="px-4 py-2.5 text-right font-medium">MRR</th>
                    <th className="px-4 py-2.5 text-right font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.map((r) => (
                    <tr key={r.id} className="border-t border-line transition-colors hover:bg-surface">
                      <td className="mono px-4 py-2.5 text-xs text-faint">
                        E-{String(r.id).padStart(4, "0")}
                      </td>
                      <td className="px-4 py-2.5">{r.dataset}</td>
                      <td className="mono px-4 py-2.5 text-right">{pct(r.metrics.hit_rate)}</td>
                      <td className="mono px-4 py-2.5 text-right">{r.metrics.mrr.toFixed(3)}</td>
                      <td className="mono px-4 py-2.5 text-right text-xs text-faint">
                        {new Date(r.created_at).toLocaleString("zh-CN", { hour12: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  format,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-soft">{label}</p>
      <p className="mono mt-1 text-[28px] font-semibold leading-tight">
        <CountUp value={value} format={format} />
      </p>
    </div>
  );
}
