/**
 * The Shadow Assistant — a case-scoped, READ-ONLY chat that replaced the AI-suggestions review view.
 * The investigator asks; it answers by reading the case (server-side) and calling the wired LLM.
 *
 * Discipline: this is a WORKING SESSION, not case state. The chat is EPHEMERAL client state (React +
 * per-case localStorage) — it is NEVER persisted server-side and NEVER audited (like search / the
 * board). It calls only the READ-ONLY GET assistant endpoint and NO write route; it writes nothing
 * to the case, custody, or the report. The R6 suggestions review queue + its write route are
 * unchanged in the backend — only this VIEW changed. Answers keep R4 discipline (the model is
 * prompted to separate "the case shows X" from "I'm inferring Y"); the banner keeps that honest.
 */
import { Bot, Eraser, Info, Send, Sparkles, User } from 'lucide-react';
import * as React from 'react';

import { askAssistant } from '@/api/endpoints';
import { CaseScoped } from '@/components/common/CaseScoped';
import { Button } from '@/components/ui/button';
import { describeApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** For assistant turns: the backend status ('ok' | 'unavailable') + which model answered. */
  status?: string;
  provider?: string | null;
  model?: string | null;
}

const HISTORY_TURNS = 8;

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `m_${Date.now()}_${Math.round(performance.now())}`;
}

const storageKey = (caseId: number) => `qaif.assistant.${caseId}`;

function loadSession(caseId: number): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(caseId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveSession(caseId: number, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(storageKey(caseId), JSON.stringify(messages));
  } catch {
    // ephemeral convenience only — never block the UI on it
  }
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const unavailable = message.status === 'unavailable';
  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border',
          isUser
            ? 'border-primary/40 bg-primary/15 text-primary'
            : 'border-ai/40 bg-ai/10 text-ai',
        )}
        aria-hidden
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </span>
      <div
        className={cn(
          'max-w-[80%] rounded-lg border px-3 py-2 text-body leading-relaxed',
          isUser
            ? 'border-primary/30 bg-primary/10 text-foreground'
            : unavailable
              ? 'border-probabilistic/40 bg-probabilistic/5 text-muted-foreground'
              : 'border-border bg-surface-1 text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.status === 'ok' && (message.provider || message.model) && (
          <p className="mt-1.5 text-micro text-muted-foreground">
            Advisory · {message.provider ?? 'model'}
            {message.model ? ` / ${message.model}` : ''} — not case evidence
          </p>
        )}
      </div>
    </div>
  );
}

function AssistantChat({ caseId }: { caseId: number }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => loadSession(caseId));
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Reload the session when the case changes (strictly per-case, like the board).
  React.useEffect(() => {
    setMessages(loadSession(caseId));
    setError(null);
  }, [caseId]);

  // Persist the ephemeral session per case so it survives a reload within the session.
  React.useEffect(() => {
    saveSession(caseId, messages);
  }, [caseId, messages]);

  // Keep the newest message in view.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  const send = React.useCallback(async () => {
    const question = input.trim();
    if (!question || sending) return;
    setError(null);
    const userMessage: ChatMessage = { id: newId(), role: 'user', content: question };
    // History = the recent turns BEFORE this question (the backend also caps this).
    const history = messages
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    try {
      const res = await askAssistant(caseId, question, history);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content: res.answer,
          status: res.status,
          provider: res.provider,
          model: res.model,
        },
      ]);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, caseId]);

  const clearSession = React.useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Honest framing — this session is analysis, not case custody. */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2/60 px-3 py-2 text-caption text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden />
        <p>
          <span className="font-medium text-foreground">Working session — not recorded to the
          case.</span>{' '}
          The assistant reads this case to help you reason; it writes nothing, is never audited, and
          its answers are advisory (it separates what the case shows from what it infers), never
          evidence.
        </p>
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-0">
        <div ref={scrollRef} className="flex min-h-[46vh] flex-col gap-4 overflow-y-auto p-4">
          {messages.length === 0 && !sending && (
            <div className="m-auto flex max-w-[46ch] flex-col items-center gap-2 text-center">
              <Sparkles className="size-6 text-ai/60" aria-hidden />
              <p className="text-caption text-muted-foreground">
                Ask about this case — its findings, entities, timeline, or what to look at next. The
                assistant answers from the case data and flags anything it&apos;s inferring.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-caption text-muted-foreground">
              <Bot className="size-4 text-ai" aria-hidden />
              <span className="inline-flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </span>
            </div>
          )}
        </div>

        {error && (
          <p className="border-t border-border bg-integrity-broken/5 px-4 py-2 text-caption text-integrity-broken">
            {error}
          </p>
        )}

        <form
          className="flex items-end gap-2 border-t border-border bg-surface-1 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Ask about this case…  (Enter to send, Shift+Enter for a new line)"
            className="max-h-40 min-h-[40px] flex-1 resize-y rounded-md border border-border bg-surface-0 px-3 py-2 text-body text-foreground outline-none focus:border-primary"
          />
          <Button type="submit" disabled={sending || input.trim().length === 0}>
            <Send aria-hidden />
            Send
          </Button>
          {messages.length > 0 && (
            <Button type="button" variant="ghost" onClick={clearSession} title="Clear this session">
              <Eraser aria-hidden />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

/** Shadow Assistant — a case-scoped, read-only working chat. */
export function ShadowAssistantPage() {
  return (
    <CaseScoped
      kicker="Assistant"
      title="Shadow Assistant"
      sub="A read-only working chat over this case — advisory, ephemeral, never written to the case."
    >
      {(caseId) => <AssistantChat caseId={caseId} />}
    </CaseScoped>
  );
}
