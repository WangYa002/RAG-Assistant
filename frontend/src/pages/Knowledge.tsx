import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, DocumentItem } from "../api/client";
import { IconCheck, IconRefresh, IconTrash, IconUpload } from "../components/icons";

const STATIONS = ["收文", "剪裁", "归档"];

export default function Knowledge() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const docs = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
  };

  const upload = useMutation({
    mutationFn: api.uploadDocument,
    onSuccess: (doc) => {
      setNotice({ ok: true, text: `《${doc.filename}》已入库，切分为 ${doc.chunk_count} 个片段` });
      invalidate();
    },
    onError: (e: Error) => setNotice({ ok: false, text: `上传失败：${e.message}` }),
  });

  const remove = useMutation({ mutationFn: api.deleteDocument, onSuccess: invalidate });

  const rebuild = useMutation({
    mutationFn: api.rebuildIndex,
    onSuccess: (r) => setNotice({ ok: true, text: `索引已重建，共 ${r.chunks} 个片段` }),
    onError: (e: Error) => setNotice({ ok: false, text: `重建失败：${e.message}` }),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setNotice(null);
    upload.mutate(files[0]);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8 md:px-10">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">知识库</h1>
          <p className="mt-1 text-sm text-soft">
            上传 PDF / DOCX / MD / TXT 文档，自动完成解析、分块与向量化入库
          </p>
        </header>

        {/* 上传区 */}
        <div
          role="button"
          tabIndex={0}
          aria-label="上传文档"
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
          className="mt-6 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors"
          style={{
            borderColor: dragOver ? "var(--kb-ink)" : "var(--kb-line-strong)",
            background: dragOver ? "var(--kb-surface)" : "transparent",
          }}
        >
          {upload.isPending ? (
            <p className="mono text-sm text-soft">入库处理中 …</p>
          ) : (
            <>
              <span
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-soft"
                aria-hidden
              >
                <IconUpload size={18} />
              </span>
              <p className="mt-3 text-sm font-medium">拖拽文件到此处，或点击上传</p>
              <p className="mono mt-1 text-xs text-faint">单份 ≤ 20MB · txt / md / pdf / docx</p>
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
          <p
            className="rise mt-3 flex items-center gap-2 text-sm"
            style={{ color: notice.ok ? "var(--kb-ok)" : "var(--kb-danger)" }}
            role="status"
          >
            <IconCheck size={14} />
            {notice.text}
          </p>
        )}

        {/* 处理流程 */}
        <div className="mt-8 flex flex-wrap items-center gap-2" aria-label="入库流程">
          {STATIONS.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-7 bg-line2" aria-hidden />}
              <span className="chip text-soft">
                <span className="mono text-[10px] text-faint">{`0${i + 1}`}</span>
                {s}
              </span>
            </span>
          ))}
        </div>

        {/* 文档列表 */}
        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            文档列表
            <span className="mono ml-2 text-xs font-normal text-faint">
              {docs.data?.length ?? 0}
            </span>
          </h2>
          <button
            className="btn btn-ghost !h-8 text-xs"
            onClick={() => rebuild.mutate()}
            disabled={rebuild.isPending || !docs.data?.length}
          >
            <IconRefresh size={13} />
            {rebuild.isPending ? "重建中…" : "重建索引"}
          </button>
        </div>

        {docs.isLoading ? (
          <p className="mono mt-6 text-sm text-faint">加载中 …</p>
        ) : !docs.data?.length ? (
          <div className="card mt-3 px-6 py-12 text-center">
            <p className="text-sm font-medium text-soft">还没有文档</p>
            <p className="mt-1 text-xs text-faint">
              先上传一份文档，再到「问答」页开始提问；示例语料见 backend/data_seed/sample_docs
            </p>
          </div>
        ) : (
          <div className="card mt-3 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs text-soft">
                  <th className="px-4 py-2.5 font-medium">文件名</th>
                  <th className="px-4 py-2.5 font-medium">格式</th>
                  <th className="px-4 py-2.5 font-medium">状态</th>
                  <th className="px-4 py-2.5 text-right font-medium">片段数</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">上传时间</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {docs.data.map((d) => (
                  <DocRow key={d.id} doc={d} onDelete={() => remove.mutate(d.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DocRow({ doc, onDelete }: { doc: DocumentItem; onDelete: () => void }) {
  const time = doc.created_at ? new Date(doc.created_at) : null;
  return (
    <tr className="border-t border-line transition-colors hover:bg-surface">
      <td className="max-w-[18rem] truncate px-4 py-2.5 font-medium" title={doc.filename}>
        {doc.filename}
      </td>
      <td className="px-4 py-2.5">
        <span className="mono text-[11px] uppercase text-soft">{doc.ext}</span>
      </td>
      <td className="px-4 py-2.5">
        <span
          className="inline-flex items-center gap-1.5 text-xs"
          style={{ color: doc.status === "ready" ? "var(--kb-ok)" : "var(--kb-warn)" }}
        >
          <span className="dot" />
          {doc.status === "ready" ? "已入库" : "处理中"}
        </span>
      </td>
      <td className="mono px-4 py-2.5 text-right">{doc.chunk_count}</td>
      <td className="mono hidden px-4 py-2.5 text-right text-xs text-faint sm:table-cell">
        {time ? time.toLocaleString("zh-CN", { hour12: false }) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right">
        <button
          className="btn btn-ghost !h-7 !px-2 text-soft hover:!text-danger"
          onClick={onDelete}
          aria-label={`删除 ${doc.filename}`}
          title="删除"
        >
          <IconTrash size={14} />
        </button>
      </td>
    </tr>
  );
}
