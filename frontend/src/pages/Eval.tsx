import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, EvalRunResult } from "../api/client";

const STATIONS = ["取样", "检索", "生成", "评定"];

export default function Eval() {
  const qc = useQueryClient();
  const datasets = useQuery({ queryKey: ["eval-datasets"], queryFn: api.evalDatasets });
  const history = useQuery({ queryKey: ["eval-runs"], queryFn: api.evalRuns });
  const [selected, setSelected] = useState<string>("");
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
    // 工位推进动画：取样→检索→生成→评定（暗房工位语法）
    let step = 0;
    setStation(0);
    const timer = setInterval(() => {
      step = Math.min(step + 1, STATIONS.length - 1);
      setStation(step);
    }, 700);
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
    <section aria-labelledby="eval-title">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 id="eval-title" className="section-head text-2xl">
          质检台
        </h2>
        <span className="digits text-xs text-tea">EVALUATION DESK · 检索与回答质量评定</span>
      </div>
      <p className="text-ink-soft mt-1 max-w-prose">
        选一套评估集，质检台将对每道题执行完整的检索与回答流水线，
        再按来源命中、忠实度、相关性逐项打分。
      </p>

      <div className="mt-5 flex items-end gap-3 flex-wrap">
        <label className="text-sm">
          <span className="block text-xs text-tea mb-1">评估集</span>
          <select
            className="field px-3 py-2 text-sm min-w-64"
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
        <button className="btn-primary px-5 py-2 text-sm" onClick={run} disabled={running || !selected}>
          {running ? "评定中……" : "开始评定"}
        </button>
      </div>

      {/* 工位进度 */}
      <ol className="mt-5 flex items-center gap-0 text-sm" aria-label="评定工位">
        {STATIONS.map((s, i) => (
          <li key={s} className="flex items-center">
            {i > 0 && (
              <span className="digits mx-3 select-none" style={{ color: "var(--color-line-dark)" }} aria-hidden>
                ──────▶
              </span>
            )}
            <span
              className={`flex items-baseline gap-1.5 ${
                running && i === station ? "text-seal" : i < station ? "" : "text-ink-soft"
              }`}
            >
              <span className="digits text-[10px] text-tea">{`0${i + 1}`}</span>
              <span className="section-head">{s}</span>
              {running && i === station && (
                <span className="digits text-xs animate-pulse" aria-hidden>
                  ▍
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {error && (
        <p className="mt-4 text-sm text-seal" role="alert">
          评定失败：{error}
        </p>
      )}

      {result && (
        <>
          {/* 仪表读数 + 盖章 */}
          <div className="mt-6 relative">
            <div className="flex justify-end absolute -top-1 right-0">
              <span className="stamp stamp-anim text-sm" aria-hidden>
                已评定
              </span>
            </div>
            <h3 className="section-head text-lg">本次读数</h3>
            <hr className="cut-line mt-2" />
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mt-4">
              <Metric label="来源命中率 HIT-RATE" value={pct(result.metrics.hit_rate)} />
              <Metric label="首命中位次 MRR" value={result.metrics.mrr.toFixed(3)} />
              <Metric label="平均忠实度" value={pct(result.metrics.avg_faithfulness)} />
              <Metric label="平均相关性" value={pct(result.metrics.avg_answer_relevance)} />
            </dl>
          </div>

          {/* 逐题明细 */}
          <h3 className="section-head text-lg mt-8">逐题明细</h3>
          <hr className="cut-line mt-2" />
          <table className="w-full mt-2 text-sm">
            <thead>
              <tr className="text-left text-xs text-tea border-b border-line-dark">
                <th className="py-2 pr-3 font-medium digits">题号</th>
                <th className="py-2 pr-3 font-medium">问题</th>
                <th className="py-2 pr-3 font-medium">来源命中</th>
                <th className="py-2 pr-3 font-medium text-right">首命中位次</th>
                <th className="py-2 pr-3 font-medium text-right">忠实度</th>
                <th className="py-2 font-medium text-right">相关性</th>
              </tr>
            </thead>
            <tbody>
              {result.per_item.map((item, i) => (
                <tr key={i} className="border-b border-line align-top">
                  <td className="py-2 pr-3 digits text-xs text-tea">{`Q${String(i + 1).padStart(2, "0")}`}</td>
                  <td className="py-2 pr-3 max-w-[26rem]">
                    <span className="block">{item.question}</span>
                    <span className="block text-xs text-ink-soft mt-0.5 line-clamp-2">
                      {item.answer}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {item.hit ? (
                      <span className="text-seal section-head" title="命中">
                        ✓
                      </span>
                    ) : (
                      <span className="text-ink-soft" title="未命中">
                        ✗
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right digits">
                    {item.first_hit_rank || "—"}
                  </td>
                  <td className="py-2 pr-3 text-right digits">{pct(item.faithfulness)}</td>
                  <td className="py-2 text-right digits">{pct(item.answer_relevance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* 历史评定 */}
      {history.data?.length ? (
        <>
          <h3 className="section-head text-lg mt-8">评定档案</h3>
          <hr className="cut-line mt-2" />
          <table className="w-full mt-2 text-sm">
            <thead>
              <tr className="text-left text-xs text-tea border-b border-line-dark">
                <th className="py-2 pr-3 font-medium digits">编号</th>
                <th className="py-2 pr-3 font-medium">评估集</th>
                <th className="py-2 pr-3 font-medium text-right">命中率</th>
                <th className="py-2 pr-3 font-medium text-right">MRR</th>
                <th className="py-2 font-medium text-right">时间</th>
              </tr>
            </thead>
            <tbody>
              {history.data.map((r) => (
                <tr key={r.id} className="border-b border-line">
                  <td className="py-2 pr-3 digits text-xs text-tea">{`E-${String(r.id).padStart(4, "0")}`}</td>
                  <td className="py-2 pr-3">{r.dataset}</td>
                  <td className="py-2 pr-3 text-right digits">{pct(r.metrics.hit_rate)}</td>
                  <td className="py-2 pr-3 text-right digits">{r.metrics.mrr.toFixed(3)}</td>
                  <td className="py-2 text-right digits text-xs text-ink-soft">
                    {new Date(r.created_at).toLocaleString("zh-CN", { hour12: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line pb-2">
      <dt className="digits text-[10px] tracking-[0.2em] text-tea">{label}</dt>
      <dd className="digits text-3xl mt-1">{value}</dd>
    </div>
  );
}
