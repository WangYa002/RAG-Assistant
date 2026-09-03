import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as echarts from "echarts";
import { api, TrendPoint } from "../api/client";

export default function Dashboard() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  const trends = useQuery({ queryKey: ["trends"], queryFn: api.trends });

  return (
    <section aria-labelledby="dash-title">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 id="dash-title" className="section-head text-2xl">
          值班日志
        </h2>
        <span className="digits text-xs text-tea">DUTY LOG · 资料室运行台账</span>
      </div>
      <p className="text-ink-soft mt-1">
        问询量、时延与批阅情况逐日登记；每一条数字都来自真实运行记录。
      </p>

      {/* 台账：栏线式读数，不做卡片 */}
      {overview.data && (
        <dl className="grid grid-cols-2 md:grid-cols-5 mt-6 border-y border-line-dark divide-x divide-line">
          <Ledger label="累计问询" value={String(overview.data.total_queries)} />
          <Ledger label="平均时延" value={`${overview.data.avg_latency_ms.toFixed(0)} ms`} />
          <Ledger label="平均检索分" value={overview.data.avg_top_score.toFixed(3)} />
          <Ledger label="在库文献" value={String(overview.data.doc_count)} />
          <Ledger label="剪报条目" value={String(overview.data.chunk_count)} />
        </dl>
      )}

      {/* 七日趋势 */}
      <div className="mt-8">
        <h3 className="section-head text-lg">七日问询曲线</h3>
        <hr className="cut-line mt-2" />
        <TrendChart data={trends.data ?? []} />
      </div>

      {/* 批阅情况 */}
      {overview.data && (
        <div className="mt-8">
          <h3 className="section-head text-lg">批阅记录</h3>
          <hr className="cut-line mt-2" />
          {overview.data.feedback.up + overview.data.feedback.down === 0 ? (
            <p className="text-sm text-ink-soft mt-3">
              还没有批阅记录。到「问答」桌对回答作出「有据 / 存疑」的批阅后，这里会记上一笔。
            </p>
          ) : (
            <>
              <div className="mt-4 h-6 flex overflow-hidden rounded-sm border border-line-dark" role="img"
                aria-label={`有据 ${overview.data.feedback.up} 次，存疑 ${overview.data.feedback.down} 次`}>
                <div className="bg-seal" style={{ flex: overview.data.feedback.up }} />
                <div style={{ flex: Math.max(overview.data.feedback.down, 0.001), background: "var(--color-line-dark)" }} />
              </div>
              <div className="flex gap-6 mt-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 bg-seal rounded-sm" aria-hidden />
                  有据 <span className="digits">{overview.data.feedback.up}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "var(--color-line-dark)" }} aria-hidden />
                  存疑 <span className="digits">{overview.data.feedback.down}</span>
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Ledger({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 first:pl-0 py-3">
      <dt className="digits text-[10px] tracking-[0.2em] text-tea">{label}</dt>
      <dd className="digits text-2xl mt-1">{value}</dd>
    </div>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      animationDuration: 400,
      grid: { left: 48, right: 56, top: 32, bottom: 28 },
      legend: {
        data: ["问询量", "平均时延 (ms)"],
        top: 0,
        textStyle: { color: "#6b6353", fontSize: 11, fontFamily: "IBM Plex Mono" },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fbf8f1",
        borderColor: "#d8cfbb",
        textStyle: { color: "#211d17", fontSize: 12 },
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.date),
        axisLine: { lineStyle: { color: "#b9ad93" } },
        axisLabel: { color: "#6b6353", fontFamily: "IBM Plex Mono", fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          minInterval: 1,
          splitLine: { lineStyle: { color: "#e4dcc9", type: "dashed" } },
          axisLabel: { color: "#6b6353", fontFamily: "IBM Plex Mono", fontSize: 11 },
        },
        {
          type: "value",
          splitLine: { show: false },
          axisLabel: { color: "#6b6353", fontFamily: "IBM Plex Mono", fontSize: 11 },
        },
      ],
      series: [
        {
          name: "问询量",
          type: "line",
          data: data.map((d) => d.queries),
          lineStyle: { color: "#211d17", width: 2 },
          itemStyle: { color: "#211d17" },
          symbol: "circle",
          symbolSize: 5,
          areaStyle: { color: "rgba(33,29,23,0.05)" },
        },
        {
          name: "平均时延 (ms)",
          type: "line",
          yAxisIndex: 1,
          data: data.map((d) => d.avg_latency),
          lineStyle: { color: "#be3b2b", width: 1.5, type: "dashed" },
          itemStyle: { color: "#be3b2b" },
          symbol: "none",
        },
      ],
    });
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [data]);

  if (!data.length) return <p className="digits text-sm text-tea mt-4">暂无记录 ……</p>;
  return <div ref={ref} className="h-64 w-full mt-3" />;
}
