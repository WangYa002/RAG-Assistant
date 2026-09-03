import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, DocumentItem } from "../api/client";

const STATIONS = ["收文", "剪裁", "归档"];

export default function Knowledge() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const docs = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
  };

  const upload = useMutation({
    mutationFn: api.uploadDocument,
    onSuccess: (doc) => {
      setNotice(`《${doc.filename}》已归档，剪成 ${doc.chunk_count} 条知识。`);
      invalidate();
    },
    onError: (e: Error) => setNotice(`收文失败：${e.message}`),
  });

  const remove = useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: invalidate,
  });

  const rebuild = useMutation({
    mutationFn: api.rebuildIndex,
    onSuccess: (r) => setNotice(`索引已重建，共 ${r.chunks} 条剪报。`),
    onError: (e: Error) => setNotice(`重建失败：${e.message}`),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setNotice(null);
    upload.mutate(files[0]);
  };

  return (
    <section aria-labelledby="kb-title">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 id="kb-title" className="section-head text-2xl">
          收文台
        </h2>
        <span className="digits text-xs text-tea">FILING DESK · 文献入库</span>
      </div>
      <p className="text-ink-soft mt-1 max-w-prose">
        上传 PDF / DOCX / MD / TXT 文献，资料室将自动剪裁、编号、归档入检索索引。
      </p>

      {/* 收文口：剪裁虚线 */}
      <div
        role="button"
        tabIndex={0}
        aria-label="上传文献"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className="mt-5 border-2 border-dashed rounded-sm px-6 py-8 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? "var(--color-seal)" : "var(--color-line-dark)",
          background: dragOver ? "var(--color-paper-deep)" : "transparent",
        }}
      >
        {upload.isPending ? (
          <p className="digits text-sm text-tea animate-pulse">剪裁归档中 ……</p>
        ) : (
          <>
            <p className="section-head text-lg">把文献递进收文口</p>
            <p className="text-sm text-ink-soft mt-1">
              拖到此处，或点击选择文件 · 单份不超过 20MB ·
              <span className="digits"> txt / md / pdf / docx</span>
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.pdf,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {notice && (
        <p className="mt-3 text-sm" role="status">
          <span className="text-seal">▍</span>
          {notice}
        </p>
      )}

      {/* 工位说明（暗房借鉴：固定工位语法） */}
      <ol className="mt-6 flex flex-wrap items-center gap-y-1 text-sm" aria-label="入库工位">
        {STATIONS.map((s, i) => (
          <li key={s} className="flex items-center">
            {i > 0 && (
              <span className="digits mx-3 text-line-dark select-none" aria-hidden>
                ──────▶
              </span>
            )}
            <span className="flex items-baseline gap-1.5">
              <span className="digits text-[10px] text-tea">{`0${i + 1}`}</span>
              <span className="section-head">{s}</span>
            </span>
          </li>
        ))}
      </ol>

      {/* 文献总表 */}
      <div className="mt-6 flex items-baseline justify-between">
        <h3 className="section-head text-lg">文献总表</h3>
        <button
          className="btn-ghost digits text-xs px-3 py-1.5"
          onClick={() => rebuild.mutate()}
          disabled={rebuild.isPending || !docs.data?.length}
        >
          {rebuild.isPending ? "重建中……" : "重建索引"}
        </button>
      </div>
      <hr className="cut-line mt-2" />

      {docs.isLoading ? (
        <p className="digits text-sm text-tea mt-6">调卷中 ……</p>
      ) : !docs.data?.length ? (
        <div className="mt-8 mb-4 text-center">
          <p className="section-head text-lg text-ink-soft">资料室还没有文献</p>
          <p className="text-sm text-ink-soft mt-1">
            先递一份文献进收文口，再到「问答」桌前开始问询。
          </p>
        </div>
      ) : (
        <table className="w-full mt-2 text-sm">
          <thead>
            <tr className="text-left text-xs text-tea border-b border-line-dark">
              <th className="py-2 pr-3 font-medium digits">编号</th>
              <th className="py-2 pr-3 font-medium">文献</th>
              <th className="py-2 pr-3 font-medium">格式</th>
              <th className="py-2 pr-3 font-medium">状态</th>
              <th className="py-2 pr-3 font-medium text-right">剪报条数</th>
              <th className="py-2 pr-3 font-medium text-right">收文时间</th>
              <th className="py-2 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {docs.data.map((d, i) => (
              <DocRow key={d.id} doc={d} seq={i} onDelete={() => remove.mutate(d.id)} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function DocRow({ doc, seq, onDelete }: { doc: DocumentItem; seq: number; onDelete: () => void }) {
  const time = doc.created_at ? new Date(doc.created_at) : null;
  return (
    <tr className="border-b border-line">
      <td className="py-2 pr-3 digits text-xs text-tea">{`D-${String(seq + 1).padStart(4, "0")}`}</td>
      <td className="py-2 pr-3 max-w-[24rem] truncate" title={doc.filename}>
        {doc.filename}
      </td>
      <td className="py-2 pr-3 digits text-xs uppercase">{doc.ext}</td>
      <td className="py-2 pr-3">
        <span
          className="inline-block text-xs px-1.5 py-0.5 rounded-sm border"
          style={
            doc.status === "ready"
              ? { borderColor: "var(--color-tea)", color: "var(--color-tea)" }
              : { borderColor: "var(--color-seal)", color: "var(--color-seal)" }
          }
        >
          {doc.status === "ready" ? "已归档" : "处理中"}
        </span>
      </td>
      <td className="py-2 pr-3 text-right digits">{doc.chunk_count}</td>
      <td className="py-2 pr-3 text-right digits text-xs text-ink-soft">
        {time ? time.toLocaleString("zh-CN", { hour12: false }) : "—"}
      </td>
      <td className="py-2 text-right">
        <button
          className="btn-ghost text-xs px-2 py-1 text-seal"
          onClick={onDelete}
          aria-label={`删除 ${doc.filename}`}
        >
          退卷
        </button>
      </td>
    </tr>
  );
}
