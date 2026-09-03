import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ModelSettings } from "../api/client";

export default function Settings() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["model-settings"], queryFn: api.modelSettings });
  const [form, setForm] = useState<Partial<ModelSettings>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [finetune, setFinetune] = useState<{ count: number; jsonl: string; yaml: string } | null>(null);

  useEffect(() => {
    if (settings.data && !Object.keys(form).length) {
      const { ...rest } = settings.data;
      setForm(rest);
    }
  }, [settings.data, form]);

  const save = async () => {
    setNotice(null);
    try {
      await api.saveModelSettings(form);
      qc.invalidateQueries({ queryKey: ["model-settings"] });
      qc.invalidateQueries({ queryKey: ["health"] });
      setNotice("已保存，配置即时生效。");
    } catch (e) {
      setNotice(`保存失败：${(e as Error).message}`);
    }
  };

  const test = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const r = await api.testModel();
      setNotice(r.ok ? `连接正常：${r.detail}` : `连接失败：${r.detail}`);
    } finally {
      setTesting(false);
    }
  };

  const exportFinetune = async () => {
    const data = await api.finetuneExport();
    setFinetune(data);
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
    <section aria-labelledby="settings-title">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 id="settings-title" className="section-head text-2xl">
          值房
        </h2>
        <span className="digits text-xs text-tea">BACK OFFICE · 模型接入与微调</span>
      </div>
      <p className="text-ink-soft mt-1">
        配置大模型与检索参数。未填写 API Key 时，资料室以 Mock 模式值机，全流程可演示。
      </p>

      {settings.data?.mock_mode && (
        <p className="mt-4 inline-block stamp text-xs">MOCK 值机中</p>
      )}

      <div className="mt-6 max-w-2xl">
        <h3 className="section-head text-lg">模型接入</h3>
        <hr className="cut-line mt-2" />
        <div className="grid gap-4 mt-4">
          <label className="text-sm block">
            <span className="block text-xs text-tea mb-1">API 地址（OpenAI 兼容）</span>
            <input
              className="field w-full px-3 py-2 text-sm digits"
              value={form.llm_base_url ?? ""}
              onChange={(e) => setForm({ ...form, llm_base_url: e.target.value })}
              placeholder="https://api.deepseek.com/v1"
            />
          </label>
          <label className="text-sm block">
            <span className="block text-xs text-tea mb-1">API Key（保存后只显示后四位）</span>
            <input
              type="password"
              className="field w-full px-3 py-2 text-sm digits"
              value={form.llm_api_key ?? ""}
              onChange={(e) => setForm({ ...form, llm_api_key: e.target.value })}
              placeholder="sk-……（留空则为 Mock 模式）"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm block">
              <span className="block text-xs text-tea mb-1">模型名</span>
              <input
                className="field w-full px-3 py-2 text-sm digits"
                value={form.llm_model ?? ""}
                onChange={(e) => setForm({ ...form, llm_model: e.target.value })}
                placeholder="deepseek-chat"
              />
            </label>
            <label className="text-sm block">
              <span className="block text-xs text-tea mb-1">向量模型</span>
              <select
                className="field w-full px-3 py-2 text-sm"
                value={form.embedding_provider ?? "auto"}
                onChange={(e) => setForm({ ...form, embedding_provider: e.target.value })}
              >
                <option value="auto">auto · BGE 优先，失败降级 Mock</option>
                <option value="bge">bge · BGE 中文向量（CPU）</option>
                <option value="mock">mock · 离线演示</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm block">
              <span className="block text-xs text-tea mb-1">召回数 TOP-K</span>
              <input
                type="number"
                min={1}
                max={50}
                className="field w-full px-3 py-2 text-sm digits"
                value={form.top_k ?? 8}
                onChange={(e) => setForm({ ...form, top_k: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm block">
              <span className="block text-xs text-tea mb-1">引用上限 FINAL-K</span>
              <input
                type="number"
                min={1}
                max={20}
                className="field w-full px-3 py-2 text-sm digits"
                value={form.final_k ?? 4}
                onChange={(e) => setForm({ ...form, final_k: Number(e.target.value) })}
              />
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn-primary px-5 py-2 text-sm" onClick={save}>
            保存并生效
          </button>
          <button className="btn-ghost px-4 py-2 text-sm" onClick={test} disabled={testing}>
            {testing ? "测试中……" : "测试连接"}
          </button>
        </div>
        {notice && (
          <p className="mt-3 text-sm" role="status">
            <span className="text-seal">▍</span>
            {notice}
          </p>
        )}
      </div>

      {/* 微调实验室 */}
      <div className="mt-10 max-w-2xl">
        <h3 className="section-head text-lg">微调实验室</h3>
        <hr className="cut-line mt-2" />
        <p className="text-sm text-ink-soft mt-3">
          把问答批阅记录导出为 SFT 数据集（OpenAI 消息格式 JSONL），并生成
          LLaMA-Factory 的 LoRA 训练配置，供离线微调使用。
        </p>
        <button className="btn-ghost px-4 py-2 text-sm mt-3" onClick={exportFinetune}>
          生成导出文件
        </button>
        {finetune && (
          <div className="mt-4">
            <p className="text-sm">
              共 <span className="digits text-seal">{finetune.count}</span> 条问答对。
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-2">
              <FileBlock title="dataset.jsonl" content={finetune.jsonl || "（暂无问答记录）"} onDownload={() => download("zhihui_kb.jsonl", finetune.jsonl)} />
              <FileBlock title="lora_config.yaml" content={finetune.yaml} onDownload={() => download("lora_config.yaml", finetune.yaml)} />
            </div>
          </div>
        )}
      </div>
    </section>
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
    <div>
      <div className="flex items-baseline justify-between">
        <span className="digits text-xs text-tea">{title}</span>
        <button className="btn-ghost text-xs px-2 py-0.5" onClick={onDownload}>
          下载
        </button>
      </div>
      <pre className="clip-slip mt-1 p-3 text-[11px] leading-relaxed overflow-auto max-h-56 digits whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  );
}
