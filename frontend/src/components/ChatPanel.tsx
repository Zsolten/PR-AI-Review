import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../types";

const SUGGESTIONS = [
  "What are the risks?",
  "Summarize this PR",
  "Explain this like I'm new to the project",
];

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void>;
  sending: boolean;
  error: string | null;
}

export function ChatPanel({ messages, onSend, sending, error }: ChatPanelProps) {
  const [input, setInput] = useState("");

  const submit = async (text: string) => {
    if (!text.trim() || sending) return;
    const trimmed = text.trim();
    setInput("");
    await onSend(trimmed);
  };

  return (
    <section className="flex flex-col h-full min-h-[320px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="shrink-0 flex h-[60px] items-center border-b border-[var(--color-border)] px-4 bg-[var(--color-surface-elevated)]">
        <h3 className="text-sm font-semibold">Ask about this PR</h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {sending && (
          <div className="text-sm text-[var(--color-muted)] animate-pulse">Thinking…</div>
        )}
        {messages.length === 0 && !sending ? (
          <p className="text-sm text-[var(--color-muted)]">
            Ask questions about risks, design, or how the changes fit the codebase.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-8 bg-zinc-800 text-zinc-100"
                  : "mr-8 border border-[var(--color-border)] text-zinc-300"
              }`}
            >
              <span className="mb-1 block text-[10px] uppercase text-[var(--color-muted)]">
                {m.role}
              </span>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="mb-2 list-disc pl-4 last:mb-0" {...props} />,
                    ol: ({ node, ...props }) => <ol className="mb-2 list-decimal pl-4 last:mb-0" {...props} />,
                    li: ({ node, ...props }) => <li className="mb-1 last:mb-0" {...props} />,
                    code: ({ node, className, children, ...props }: any) => {
                      const isInline = !String(children).includes("\n");
                      return isInline ? (
                        <code className="rounded bg-zinc-700/50 px-1.5 py-0.5 font-mono text-[13px] text-[var(--color-accent-dim)]" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="block rounded-md bg-zinc-950/80 p-3 font-mono text-[13px] overflow-x-auto my-2 border border-[var(--color-border)]" {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void submit(s)}
              disabled={sending}
              className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this pull request…"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-dim)]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
