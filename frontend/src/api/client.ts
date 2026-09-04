// 后端 API 客户端：REST + SSE

export interface DocumentItem {
  id: number;
  filename: string;
  ext: string;
  size: number;
  status: string;
  chunk_count: number;
  created_at: string | null;
}

export interface Citation {
  index: number;
  doc_id: number;
  filename: string;
  idx: number;
  text: string;
  score: number;
}

export interface ConversationItem {
  id: number;
  title: string;
  created_at: string;
}

export interface MessageItem {
  id: number;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  rating: "up" | "down" | null;
  created_at: string;
}

export interface EvalDatasetItem {
  question: string;
  ground_truth: string;
  expected_keywords: string[];
}

export interface EvalDataset {
  name: string;
  description: string;
  items: EvalDatasetItem[];
}

export interface EvalMetrics {
  hit_rate: number;
  mrr: number;
  avg_faithfulness: number;
  avg_answer_relevance: number;
}

export interface EvalRunResult {
  id: number;
  dataset: string;
  metrics: EvalMetrics;
  per_item: {
    question: string;
    answer: string;
    hit: boolean;
    first_hit_rank: number;
    faithfulness: number;
    answer_relevance: number;
  }[];
  created_at: string;
}

export interface UsageStat {
  prompt_tokens: number;
  completion_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
  cache_hit_rate: number | null;
}

export interface Overview {
  total_queries: number;
  avg_latency_ms: number;
  avg_top_score: number;
  feedback: { up: number; down: number };
  doc_count: number;
  chunk_count: number;
  tokens: {
    prompt: number;
    completion: number;
    cache_hit: number;
    cache_miss: number;
    cache_hit_rate: number | null;
  };
}

export interface TrendPoint {
  date: string;
  queries: number;
  avg_latency: number;
  prompt_tokens: number;
  cache_hit_rate: number | null;
}

export interface ModelSettings {
  llm_base_url: string;
  llm_api_key: string;
  llm_model: string;
  embedding_provider: string;
  embedding_model: string;
  top_k: number;
  final_k: number;
  mock_mode: boolean;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const body = await res.json();
      message = body.message || body.detail || message;
    } catch {
      /* 保持状态码 */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetch("/api/health").then(handle<{ status: string; mock: boolean }>),

  listDocuments: () => fetch("/api/documents").then(handle<DocumentItem[]>),
  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch("/api/documents/upload", { method: "POST", body: form }).then(
      handle<DocumentItem>
    );
  },
  deleteDocument: (id: number) =>
    fetch(`/api/documents/${id}`, { method: "DELETE" }).then(handle<{ ok: boolean }>),
  rebuildIndex: () =>
    fetch("/api/index/rebuild", { method: "POST" }).then(handle<{ ok: boolean; chunks: number }>),

  conversations: () => fetch("/api/conversations").then(handle<ConversationItem[]>),
  messages: (conversationId: number) =>
    fetch(`/api/conversations/${conversationId}/messages`).then(handle<MessageItem[]>),
  rate: (messageId: number, rating: "up" | "down") =>
    fetch(`/api/messages/${messageId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    }).then(handle<{ ok: boolean }>),

  evalDatasets: () => fetch("/api/eval/datasets").then(handle<EvalDataset[]>),
  evalRuns: () =>
    fetch("/api/eval/runs").then<
      { id: number; dataset: string; metrics: EvalMetrics; created_at: string }[]
    >(handle),
  runEval: (dataset: string) =>
    fetch("/api/eval/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset }),
    }).then(handle<EvalRunResult>),

  overview: () => fetch("/api/analytics/overview").then(handle<Overview>),
  trends: () => fetch("/api/analytics/trends").then(handle<TrendPoint[]>),

  modelSettings: () => fetch("/api/settings/model").then(handle<ModelSettings>),
  saveModelSettings: (patch: Partial<ModelSettings>) =>
    fetch("/api/settings/model", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(handle<ModelSettings>),
  testModel: () =>
    fetch("/api/settings/model/test", { method: "POST" }).then<
      { ok: boolean; detail: string }
    >(handle),
  finetuneExport: () =>
    fetch("/api/finetune/export", { method: "POST" }).then<
      { count: number; jsonl: string; yaml: string }
    >(handle),
};

export interface StreamHandlers {
  onCitations: (hits: Citation[]) => void;
  onDelta: (text: string) => void;
  onDone: (result: { message_id: number; conversation_id: number; usage?: UsageStat }) => void;
  onError: (message: string) => void;
}

/** 发起 SSE 问答请求，逐事件回调。 */
export async function streamChat(
  question: string,
  conversationId: number | null,
  h: StreamHandlers
): Promise<void> {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, conversation_id: conversationId }),
  });
  if (!res.ok || !res.body) {
    h.onError(`请求失败（${res.status}）`);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let dataLines: string[] = [];

  const dispatch = () => {
    if (!event) return;
    const raw = dataLines.join("\n");
    try {
      const data = JSON.parse(raw);
      if (event === "citations") h.onCitations(data.hits ?? []);
      else if (event === "delta") h.onDelta(data.text ?? "");
      else if (event === "done")
        h.onDone({
          message_id: data.message_id,
          conversation_id: data.conversation_id,
          usage: data.usage,
        });
      else if (event === "error") h.onError(data.message ?? "生成失败");
    } catch {
      /* 忽略不完整事件 */
    }
    event = "";
    dataLines = [];
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, "");
      buffer = buffer.slice(idx + 1);
      if (line === "") {
        dispatch();
      } else if (line.startsWith("event: ")) {
        event = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        dataLines.push(line.slice(6));
      }
    }
  }
  dispatch();
}
