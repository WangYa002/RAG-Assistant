import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ModelSettings } from "../api/client";
import { IconDownload } from "../components/icons";

export default function Settings() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["model-settings"], queryFn: api.modelSettings });
  const [form, setForm] = useState<Partial<ModelSettings>>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [finetune, setFinetune] = useState<{ count: number; jsonl: string; yaml: string } | null>(null);

  useEffect(() => {
    if (settings.data && !Object.keys(form).length) {
      setForm({ ...settings.data });
    }
  }, [settings.data, form]);

  const save = async () => {
    setNotice(null);
    try {
      await api.saveModelSettings(form);
      qc.invalidateQueries({ queryKey: ["model-settings"] });
      qc.invalidateQueries({ queryKey: ["health"] });
      setNotice({ ok: true, text: "已保存，配置即时生效" });
    } catch (e) {
      setNotice({ ok: false, text: `保存失败：${(e as Error).message}` });
    }
  };

  const test = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const r = await api.testModel();
      setNotice({ ok: r.ok, text: r.detail });
    } finally {
      setTesting(false);
    }
  };

  const exportFinetune = async () => {
    setFinetune(await api.finetuneExport());
  };

  const download = (name: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8 md:px-10">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">设置</h1>
          <p className="mt-1 text-sm text-soft">模型接入与检索参数；未配置 API Key 时以 Mock 模式运行</p>
        </header>

        {settings.data?.mock_mode && (
          <p className="chip mt-4" style={{ color: "var(--kb-warn)" }}>
            <span className="dot" />
            MOCK 模式 · 未配置 API Key，全流程可离线演示
          </p>
        )}

        {/* 模型接入 */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold">模型接入</h2>
          <div className="card mt-3 space-y-4 p-5">
            <Field label="API 地址" hint="OpenAI 兼容接口">
              <input
                className="field mono h-9 w-full px-3 text-sm"
                value={form.llm_base_url ?? ""}
                onChange={(e) => setForm({ ...form, llm_base_url: e.target.value })}
                placeholder="https://api.deepseek.com/v1"
              />
            </Field>
            <Field label="API Key" hint="保存后仅显示末四位；留空则使用 Mock 模式">
              <input
                type="password"
                className="field mono h-9 w-full px-3 text-sm"
                value={form.llm_api_key ?? ""}
                onChange={(e) => setForm({ ...form, llm_api_key: e.target.value })}
                placeholder="sk-…"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="模型名">
                <input
                  className="field mono h-9 w-full px-3 text-sm"
                  value={form.llm_model ?? ""}
                  onChange={(e) => setForm({ ...form, llm_model: e.target.value })}
                  placeholder="deepseek-chat"
                />
              </Field>
              <Field label="向量模型">
                <select
                  className="field h-9 w-full px-3 text-sm"
                  value={form.embedding_provider ?? "auto"}
                  onChange={(e) => setForm({ ...form, embedding_provider: e.target.value })}
                >
                  <option value="auto">auto · BGE 优先，失败降级 Mock</option>
                  <option value="bge">bge · BGE 中文向量（CPU）</option>
                  <option value="mock">mock · 离线演示</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="召回数 Top-K" hint="混合检索的候选片段数">
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="field mono h-9 w-full px-3 text-sm"
                  value={form.top_k ?? 8}
                  onChange={(e) => setForm({ ...form, top_k: Number(e.target.value) })}
                />
              </Field>
              <Field label="引用上限 Final-K" hint="最终写入回答的引用条数">
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="field mono h-9 w-full px-3 text-sm"
                  value={form.final_k ?? 4}
                  onChange={(e) => setForm({ ...form, final_k: Number(e.target.value) })}
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex gap-2.5">
            <button className="btn btn-primary" onClick={save}>
              保存并生效
            </button>
            <button className="btn btn-ghost" onClick={test} disabled={testing}>
              {testing ? "测试中…" : "测试连接"}
            </button>
          </div>
          {notice && (
            <p
              className="rise mt-3 text-sm"
              style={{ color: notice.ok ? "var(--kb-ok)" : "var(--kb-danger)" }}
              role="status"
            >
              {notice.text}
            </p>
          )}
        </section>

        {/* 微调实验室 */}
        <section className="mt-10">
          <h2 className="text-sm font-semibold">微调实验室</h2>
          <p className="mt-1 text-sm text-soft">
            将问答记录导出为 SFT 数据集（OpenAI 消息格式 JSONL），并生成 LLaMA-Factory 的 LoRA
            训练配置，供离线微调使用
          </p>
          <button className="btn btn-ghost mt-3" onClick={exportFinetune}>
            <IconDownload size={14} />
            生成导出文件
          </button>
          {finetune && (
            <div className="mt-4 grid gap-4">
              <p className="text-sm text-soft">
                共 <span className="mono font-semibold text-ink">{finetune.count}</span> 条问答对
              </p>
              <FileBlock
                title="dataset.jsonl"
                content={finetune.jsonl || "（暂无问答记录）"}
                onDownload={() => download("zhihui_kb.jsonl", finetune.jsonl)}
              />
              <FileBlock
                title="lora_config.yaml"
                content={finetune.yaml}
                onDownload={() => download("lora_config.yaml", finetune.yaml)}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

function FileBlock({
  title,
  content,
  onDownload,
}: {
  title: string;
  content: string;
  onDownload: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between bg-surface px-3.5 py-2">
        <span className="mono text-xs text-soft">{title}</span>
        <button className="btn btn-ghost !h-7 !px-2 text-xs" onClick={onDownload}>
          <IconDownload size={13} />
          下载
        </button>
      </div>
      <pre className="mono max-h-56 overflow-auto whitespace-pre-wrap p-3.5 text-[11px] leading-relaxed text-soft">
        {content}
      </pre>
    </div>
  );
}
