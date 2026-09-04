import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as echarts from "echarts";
import { api, TrendPoint } from "../api/client";
import { useTheme } from "../theme";

export default function Dashboard() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  const trends = useQuery({ queryKey: ["trends"], queryFn: api.trends });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8 md:px-10">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">数据看板</h1>
          <p className="mt-1 text-sm text-soft">问询量、时延与反馈的运行数据，全部来自真实记录</p>
        </header>

        {/* 指标行 */}
        {overview.data && (
          <div className="card mt-6 grid grid-cols-2 divide-line md:grid-cols-5 md:divide-x">
            <Stat label="累计问询" value={String(overview.data.total_queries)} />
            <Stat label="平均时延" value={`${overview.data.avg_latency_ms.toFixed(0)} ms`} />
            <Stat label="平均检索分" value={overview.data.avg_top_score.toFixed(3)} />
            <Stat label="在库文档" value={String(overview.data.doc_count)} />
            <Stat label="知识片段" value={String(overview.data.chunk_count)} />
          </div>
        )}

        {/* 趋势 */}
        <h2 className="mt-8 text-sm font-semibold">七日趋势</h2>
        <div className="card mt-3 p-4">
          <TrendChart data={trends.data ?? []} />
        </div>

        {/* 反馈 */}
        {overview.data && (
          <>
            <h2 className="mt-8 text-sm font-semibold">回答反馈</h2>
            <div className="card mt-3 px-5 py-4">
              {overview.data.feedback.up + overview.data.feedback.down === 0 ? (
                <p className="text-sm text-soft">
                  暂无反馈。在「问答」页对回答点选有帮助 / 需改进后，这里会汇总展示。
                </p>
              ) : (
                <FeedbackBar up={overview.data.feedback.up} down={overview.data.feedback.down} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-soft">{label}</p>
      <p className="mono mt-1 text-2xl font-semibold leading-tight">{value}</p>
    </div>
  );
}

function FeedbackBar({ up, down }: { up: number; down: number }) {
  const total = up + down;
  const upPct = (up / total) * 100;
  return (
    <>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface2" role="img"
        aria-label={`有帮助 ${up} 次，需改进 ${down} 次`}>
        <div style={{ width: `${upPct}%`, background: "var(--kb-ok)" }} />
      </div>
      <div className="mt-3 flex gap-6 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="dot" style={{ color: "var(--kb-ok)" }} />
          有帮助 <span className="mono">{up}</span>
        </span>
        <span className="flex items-center gap-1.5 text-soft">
          <span className="dot bg-current" />
          需改进 <span className="mono">{down}</span>
        </span>
      </div>
    </>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const dark = theme === "dark";

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const chart = echarts.init(ref.current);
    const soft = dark ? "#a8a8a8" : "#6e6e6e";
    const line = dark ? "#454545" : "#ececec";
    const strong = dark ? "#616161" : "#d9d9d9";
    chart.setOption({
      animationDuration: 400,
      grid: { left: 44, right: 52, top: 34, bottom: 26 },
      legend: {
        data: ["问询量", "平均时延 (ms)"],
        top: 0,
        itemWidth: 14,
        textStyle: { color: soft, fontSize: 11 },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: dark ? "#323232" : "#ffffff",
        borderColor: strong,
        textStyle: { color: dark ? "#ececec" : "#0d0d0d", fontSize: 12 },
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.date),
        axisLine: { lineStyle: { color: strong } },
        axisTick: { show: false },
        axisLabel: { color: soft, fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          minInterval: 1,
          splitLine: { lineStyle: { color: line } },
          axisLabel: { color: soft, fontSize: 11 },
        },
        {
          type: "value",
          splitLine: { show: false },
          axisLabel: { color: soft, fontSize: 11 },
        },
      ],
      series: [
        {
          name: "问询量",
          type: "line",
          data: data.map((d) => d.queries),
          lineStyle: { color: dark ? "#ececec" : "#0d0d0d", width: 2 },
          itemStyle: { color: dark ? "#ececec" : "#0d0d0d" },
          symbol: "circle",
          symbolSize: 5,
          areaStyle: {
            color: dark
              ? "rgba(236,236,236,0.07)"
              : "rgba(13,13,13,0.05)",
          },
        },
        {
          name: "平均时延 (ms)",
          type: "line",
          yAxisIndex: 1,
          data: data.map((d) => d.avg_latency),
          lineStyle: { color: "#10a37f", width: 1.5, type: "dashed" },
          itemStyle: { color: "#10a37f" },
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
  }, [data, dark]);

  if (!data.length) return <p className="mono py-8 text-center text-sm text-faint">暂无记录</p>;
  return <div ref={ref} className="h-64 w-full" />;
}
