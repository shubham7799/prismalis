"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check, Loader2, MessageSquarePlus, Pencil, Send,
  Sparkles, Trash2, PanelLeft,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-store";
import { api, Chat, ChatMessage } from "@/lib/api";

const SUGGESTIONS = [
  "What are NVIDIA's latest revenue and margins?",
  "Compare Apple and Microsoft on valuation.",
  "Screen for technology stocks under a P/E of 20.",
  "How has Tesla's stock performed over the past year?",
];

export default function AssistantPage() {
  const { user, loading: authLoading } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Load chat sessions ─────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoadingChats(false); return; }
    api.assistant.listChats()
      .then(setChats)
      .catch(() => {})
      .finally(() => setLoadingChats(false));
  }, [user, authLoading]);

  // ── Auto-scroll to bottom on new messages ──────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // ── Abort any in-flight stream on unmount ───────────────────────────────────
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  function stopStreaming() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  async function openChat(id: string) {
    stopStreaming();
    setActiveId(id);
    setSidebarOpen(false);
    setError("");
    setLoadingChat(true);
    try {
      const detail = await api.assistant.getChat(id);
      setMessages(detail.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chat");
      setMessages([]);
    } finally {
      setLoadingChat(false);
    }
  }

  function newChat() {
    stopStreaming();
    setActiveId(null);
    setMessages([]);
    setError("");
    setInput("");
    setSidebarOpen(false);
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const chatIdAtSend = activeId;
    const userMsgId = `tmp-user-${Date.now()}`;
    const assistantMsgId = `tmp-assistant-${Date.now()}`;

    setError("");
    setInput("");
    setSending(true);
    setStreamingId(assistantMsgId);

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, chat_id: chatIdAtSend ?? "", role: "user", content, created_at: new Date().toISOString() },
      { id: assistantMsgId, chat_id: chatIdAtSend ?? "", role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);

    let acc = "";
    const onChunk = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: acc } : m)));
    };

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (chatIdAtSend) {
        await api.assistant.sendMessageStream(chatIdAtSend, content, onChunk, controller.signal);
        // reconcile with persisted rows (real ids/timestamps)
        const detail = await api.assistant.getChat(chatIdAtSend);
        setMessages(detail.messages);
        setChats((prev) => {
          const found = prev.find((c) => c.id === chatIdAtSend);
          if (!found) return prev;
          return [found, ...prev.filter((c) => c.id !== chatIdAtSend)];
        });
      } else {
        await api.assistant.startChatStream(content, onChunk, controller.signal);
        // the streamed chat had no id yet — the newest chat in the list is the one just created
        const list = await api.assistant.listChats();
        const created = list[0];
        if (created) {
          setActiveId(created.id);
          setChats(list);
          const detail = await api.assistant.getChat(created.id);
          setMessages(detail.messages);
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages((prev) => prev.filter((m) => m.id !== userMsgId && m.id !== assistantMsgId));
      setInput(content);
    } finally {
      setSending(false);
      setStreamingId(null);
      abortRef.current = null;
    }
  }

  async function saveTitle(id: string) {
    const title = editTitle.trim();
    setEditingId(null);
    if (!title) return;
    try {
      const updated = await api.assistant.renameChat(id, title);
      setChats((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch { /* ignore */ }
  }

  async function removeChat(id: string) {
    try {
      await api.assistant.deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) newChat();
    } catch { /* ignore */ }
  }

  // ── Not authed ─────────────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-4">
          <div className="size-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
            <Sparkles className="size-7 text-neon-purple" />
          </div>
          <h2 className="text-xl font-bold">Sign in to use the AI assistant</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Ask questions about any US stock — the assistant pulls live quotes,
            financials, price history, and can screen the market for you.
          </p>
          <Link href="/auth" className="btn-neon mt-2">Sign in / Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex flex-1 min-h-0 mx-auto w-full max-w-6xl px-4 md:px-6 py-4 gap-4">
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside
          className={`${sidebarOpen ? "flex" : "hidden"} md:flex flex-col w-72 shrink-0 glass-card p-3 absolute md:relative inset-y-4 left-4 right-4 md:inset-auto z-40 md:z-auto`}
        >
          <button onClick={newChat} className="btn-neon w-full flex items-center justify-center gap-2 py-2.5 mb-3">
            <MessageSquarePlus className="size-4" />
            New chat
          </button>

          <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-1">
            {loadingChats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-neon-purple" />
              </div>
            ) : chats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-2">
                No conversations yet. Start one below.
              </p>
            ) : (
              chats.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors cursor-pointer ${
                    activeId === c.id ? "bg-neon-purple/15 text-neon-purple" : "hover:bg-surface text-foreground/90"
                  }`}
                  onClick={() => editingId !== c.id && openChat(c.id)}
                >
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-surface border border-border rounded px-1.5 py-0.5 text-sm outline-none focus:border-neon-purple/60"
                    />
                  ) : (
                    <span className="flex-1 min-w-0 truncate">{c.title || "Untitled chat"}</span>
                  )}

                  {editingId === c.id ? (
                    <button onClick={(e) => { e.stopPropagation(); saveTitle(c.id); }} className="shrink-0 p-1 text-neon-green" title="Save">
                      <Check className="size-3.5" />
                    </button>
                  ) : (
                    <div className="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditTitle(c.title || ""); }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        title="Rename"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeChat(c.id); }}
                        className="p-1 text-muted-foreground hover:text-neon-red"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Conversation ────────────────────────────────────────── */}
        <section className="flex flex-col flex-1 min-w-0 glass-card overflow-hidden">
          {/* Mobile sidebar toggle */}
          <div className="md:hidden flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <PanelLeft className="size-4" />
              Chats
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
            {loadingChat ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-neon-purple" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState onPick={send} disabled={sending} />
            ) : (
              <div className="space-y-5 max-w-3xl mx-auto">
                {messages.map((m) => (
                  <Bubble key={m.id} message={m} streaming={m.id === streamingId} />
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border/60 p-3 md:p-4">
            {error && (
              <p className="mb-2 rounded-lg bg-neon-red/10 border border-neon-red/20 px-3 py-2 text-xs text-neon-red max-w-3xl mx-auto">
                {error}
              </p>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-end gap-2 max-w-3xl mx-auto"
            >
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Ask about any stock, financials, or screen the market…"
                className="flex-1 resize-none max-h-40 bg-surface border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-neon-purple/60 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.08)] transition-all"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="btn-neon shrink-0 grid place-items-center size-11 !p-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
            <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
              AI can make mistakes. Verify important figures before acting on them.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EmptyState({ onPick, disabled }: { onPick: (t: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center max-w-2xl mx-auto">
      <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 grid place-items-center shadow-lg shadow-violet-900/40">
        <Sparkles className="size-7 text-white" />
      </div>
      <h1 className="mt-5 text-2xl font-bold">Prismalis Research Assistant</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask anything about US stocks. I can fetch live quotes, financials, price
        history, and screen the market.
      </p>
      <div className="mt-8 grid sm:grid-cols-2 gap-2 w-full">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => !disabled && onPick(s)}
            disabled={disabled}
            className="glass-card-hover text-left text-sm px-4 py-3 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={isUser ? "max-w-[85%]" : "flex gap-3 max-w-[90%]"}>
        {!isUser && (
          <div className="shrink-0 size-8 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 grid place-items-center mt-0.5">
            <Sparkles className="size-4 text-white" />
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-neon-purple/15 border border-neon-purple/25 text-foreground"
              : "bg-surface border border-border text-foreground/95"
          }`}
        >
          {message.content ? (
            <>
              {message.content}
              {streaming && (
                <span className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 bg-neon-purple/70 animate-pulse align-middle" />
              )}
            </>
          ) : streaming ? (
            <span className="flex items-center gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-neon-purple animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-neon-purple animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-neon-purple animate-bounce" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
