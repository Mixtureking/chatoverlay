import React, { useEffect, useMemo, useState, useRef } from "react";
import { createSprint7WidgetState, loadPersistedSprint7WidgetState, parseSprint7StateFromBase64, savePersistedSprint7WidgetState, isLikelySafeCss, type Sprint7WidgetState } from "./sprint7State";
import { Sprint7Dashboard } from "./Sprint7Dashboard";
import { ChatMessage } from "../../types";

/**
 * Helper to unescape HTML entities from sanitized messages.
 */
function unescapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&quot;/g, '"')
    .replace(/&QUOT;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&AMP;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&LT;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&GT;/g, ">");
}

type WidgetRoute = "obs-vote" | "obs-timer" | "obs-wheel" | "obs-link" | "obs-todo" | "obs-effect" | "dashboard";

const obsFontStyle = { fontFamily: '"Segoe UI", Arial, sans-serif' };

const getRoute = (): WidgetRoute => {
  if (typeof window === "undefined") return "dashboard";
  const path = window.location.pathname;
  if (path.includes("obs-timer")) return "obs-timer";
  if (path.includes("obs-wheel")) return "obs-wheel";
  if (path.includes("obs-link")) return "obs-link";
  if (path.includes("obs-vote")) return "obs-vote";
  if (path.includes("obs-chat")) return "obs-vote"; // Legacy support
  if (path.includes("obs-todo")) return "obs-todo";
  if (path.includes("obs-effect")) return "obs-effect";
  return "dashboard";
};

/**
 * EmojiEffect component that can trigger independently or via props.
 */
function FlowerEffect({ messages }: { messages?: ChatMessage[] }) {
  const [items, setItems] = useState<{ id: number; left: number; delay: number; duration: number; size: number; content: string }[]>([]);
  const nextPageTokenRef = useRef<string | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  const trigger = (type: string = "TUNG_HOA") => {
    let emojis = ["🌸", "🌹", "🌺", "🌻", "🌼", "🌷"];
    if (type === "PHAO_HOA") emojis = ["🎆", "🎇", "✨", "🎊", "🎉"];
    if (type === "TIM") emojis = ["❤️", "💖", "💗", "💓", "💘", "💝"];
    if (type === "VO_TAY") emojis = ["👏", "🙌", "🎉", "✨"];

    const newItems = Array.from({ length: 30 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 3,
      size: 20 + Math.random() * 20,
      content: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    setItems((prev) => [...prev, ...newItems]);
    setTimeout(() => {
      setItems((prev) => prev.filter((f) => !newItems.includes(f)));
    }, 8000);
  };

  // 1. Listen for triggers from other tabs
  useEffect(() => {
    const channel = new BroadcastChannel("sprint7_flower_channel");
    channel.onmessage = (e) => {
      if (["TUNG_HOA", "PHAO_HOA", "TIM", "VO_TAY"].includes(e.data.type)) {
        trigger(e.data.type);
      }
    };
    return () => channel.close();
  }, []);

  // 2. Process messages from props
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    
    messages.forEach((m) => {
      if (processedMessageIds.current.has(m.id)) return;
      processedMessageIds.current.add(m.id);

      const text = unescapeHtml(m.messageText || "").trim().toUpperCase();
      let triggeredType = "";
      if (text.includes("!TUNGHOA")) triggeredType = "TUNG_HOA";
      else if (text.includes("!PHAOHOA")) triggeredType = "PHAO_HOA";
      else if (text.includes("!TIM")) triggeredType = "TIM";
      else if (text.includes("!VOTAY") || text.includes("!VỖTAY")) triggeredType = "VO_TAY";

      if (triggeredType) {
        trigger(triggeredType);
        const channel = new BroadcastChannel("sprint7_flower_channel");
        channel.postMessage({ type: triggeredType });
        channel.close();
      }
    });

    if (processedMessageIds.current.size > 1000) {
      const allIds = Array.from(processedMessageIds.current);
      processedMessageIds.current = new Set(allIds.slice(allIds.length - 500));
    }
  }, [messages]);

  // 3. Autonomous polling (fallback)
  useEffect(() => {
    if (messages) return;

    let alive = true;
    const poll = async () => {
      try {
        const settingsRes = await fetch("/api/youtube/settings-sync");
        const settingsData = await settingsRes.json();
        const settings = settingsData?.settings;
        if (settings?.activeLiveChatId && settings?.apiKey) {
          let url = `/api/youtube/messages?liveChatId=${encodeURIComponent(settings.activeLiveChatId)}&apiKey=${encodeURIComponent(settings.apiKey)}`;
          if (nextPageTokenRef.current) url += `&pageToken=${encodeURIComponent(nextPageTokenRef.current)}`;
          const msgRes = await fetch(url);
          const msgData = await msgRes.json();
          if (!alive) return;
          nextPageTokenRef.current = msgData?.nextPageToken || null;
          if (Array.isArray(msgData?.messages)) {
            msgData.messages.forEach((m: any) => {
              const text = unescapeHtml(m.messageText || "").trim().toUpperCase();
              
              let triggeredType = "";
              if (text.includes("!TUNGHOA")) triggeredType = "TUNG_HOA";
              else if (text.includes("!PHAOHOA")) triggeredType = "PHAO_HOA";
              else if (text.includes("!TIM")) triggeredType = "TIM";
              else if (text.includes("!VOTAY") || text.includes("!VỖTAY")) triggeredType = "VO_TAY";

              if (triggeredType) {
                trigger(triggeredType);
                const channel = new BroadcastChannel("sprint7_flower_channel");
                channel.postMessage({ type: triggeredType });
                channel.close();
              }
            });
          }
        }
      } catch {}
    };

    const timer = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [messages]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {items.map((f) => (
        <div
          key={f.id}
          className="absolute text-2xl animate-fall"
          style={{
            left: `${f.left}%`,
            top: "-50px",
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            fontSize: `${f.size}px`,
          }}
        >
          {f.content}
        </div>
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}

interface ClientVoteState {
  A: number;
  B: number;
  total: number;
  voters: Record<string, "A" | "B">;
}

/**
 * Hook to manage vote state entirely on the client-side for absolute stability on Vercel.
 */
function useVoteState(widgetState: Sprint7WidgetState, messages?: ChatMessage[]) {
  const [state, setState] = useState<ClientVoteState>(() => {
    try {
      const saved = localStorage.getItem("sprint7_votes");
      return saved ? JSON.parse(saved) : { A: 0, B: 0, total: 0, voters: {} };
    } catch {
      return { A: 0, B: 0, total: 0, voters: {} };
    }
  });

  const nextPageTokenRef = useRef<string | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  const processIncomingMessages = (incoming: any[], kA: string, kB: string) => {
    const savedRaw = localStorage.getItem("sprint7_votes");
    let current: ClientVoteState;
    try {
      current = savedRaw ? JSON.parse(savedRaw) : { A: 0, B: 0, total: 0, voters: {} };
    } catch {
      current = { A: 0, B: 0, total: 0, voters: {} };
    }
    
    let updated = false;

    incoming.forEach((m: any) => {
      if (processedMessageIds.current.has(m.id)) return;
      processedMessageIds.current.add(m.id);

      let text = unescapeHtml(m.messageText || "").trim().toUpperCase();
      const userId = String(m.authorChannelId || m.authorName || m.id || "").trim();
      
      // Only count the FIRST vote from each user
      if (userId && !current.voters[userId]) {
        const voteMatch = text.match(/^!VOTE\s+"?([^"]+)"?$/i);
        if (voteMatch) {
          const val = voteMatch[1].trim().toUpperCase();
          if (val === kA) { current.voters[userId] = "A"; current.A++; updated = true; }
          else if (val === kB) { current.voters[userId] = "B"; current.B++; updated = true; }
        }
      }

      // Effect triggers
      let triggeredType = "";
      if (text.includes("!TUNGHOA")) triggeredType = "TUNG_HO_A"; // Avoid recursion if triggered by same poll
      else if (text.includes("!PHAOHOA")) triggeredType = "PHAO_HOA";
      else if (text.includes("!TIM")) triggeredType = "TIM";
      else if (text.includes("!VOTAY") || text.includes("!VỖTAY")) triggeredType = "VO_TAY";

      // Special case: if it's TUNGHOA, use the standard type
      if (triggeredType === "TUNG_HO_A") triggeredType = "TUNG_HOA";

      if (triggeredType) {
        const channel = new BroadcastChannel("sprint7_flower_channel");
        channel.postMessage({ type: triggeredType });
        channel.close();
      }
    });

    if (updated) {
      current.total = current.A + current.B;
      localStorage.setItem("sprint7_votes", JSON.stringify(current));
      setState(current);
    }

    if (processedMessageIds.current.size > 1000) {
      const allIds = Array.from(processedMessageIds.current);
      processedMessageIds.current = new Set(allIds.slice(allIds.length - 500));
    }
  };

  // 1. Sync state across tabs
  useEffect(() => {
    const syncFromLocal = () => {
      try {
        const saved = localStorage.getItem("sprint7_votes");
        if (saved) setState(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener("storage", (e) => {
      if (e.key === "sprint7_votes") syncFromLocal();
    });
    return () => window.removeEventListener("storage", syncFromLocal);
  }, []);

  // 2. Process messages from props
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const kA = (widgetState?.voteKeywordA || "A").trim().toUpperCase();
    const kB = (widgetState?.voteKeywordB || "B").trim().toUpperCase();
    processIncomingMessages(messages, kA, kB);
  }, [messages, widgetState?.voteKeywordA, widgetState?.voteKeywordB]);

  // 3. Autonomous polling (fallback)
  useEffect(() => {
    if (messages) return;

    let alive = true;
    const poll = async () => {
      try {
        const settingsRes = await fetch("/api/youtube/settings-sync");
        const settingsData = await settingsRes.json();
        const settings = settingsData?.settings;

        if (settings?.activeLiveChatId && settings?.apiKey) {
          let url = `/api/youtube/messages?liveChatId=${encodeURIComponent(settings.activeLiveChatId)}&apiKey=${encodeURIComponent(settings.apiKey)}`;
          if (nextPageTokenRef.current) url += `&pageToken=${encodeURIComponent(nextPageTokenRef.current)}`;
          const msgRes = await fetch(url);
          const msgData = await msgRes.json();
          if (!alive) return;
          nextPageTokenRef.current = msgData?.nextPageToken || null;

          if (Array.isArray(msgData?.messages)) {
            const kA = (widgetState?.voteKeywordA || settings.voteKeywordA || "A").trim().toUpperCase();
            const kB = (widgetState?.voteKeywordB || settings.voteKeywordB || "B").trim().toUpperCase();
            processIncomingMessages(msgData.messages, kA, kB);
          }
        }
      } catch {}
    };

    const timer = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [messages, widgetState?.voteKeywordA, widgetState?.voteKeywordB]);

  const aPct = state.total > 0 ? Math.round((state.A / state.total) * 100) : 0;
  const bPct = state.total > 0 ? 100 - aPct : 0;
  return { ...state, aPct, bPct };
}

function getFallbackState(): Sprint7WidgetState {
  return {
    todoList: [
      { id: "todo-1", text: "Thiết lập cảnh", completed: false },
      { id: "todo-2", text: "Kiểm tra Mic", completed: true },
      { id: "todo-3", text: "Bắt đầu Stream", completed: false },
    ],
    customCSS: "",
    socialLinks: {
      youtube: "https://youtube.com",
      tiktok: "https://tiktok.com",
      facebook: "https://facebook.com",
    },
    timerSeconds: 5 * 60,
    timerDoneText: "Thời gian đã kết thúc",
    wheelUsers: ["Doro", "An", "Bình", "Chi", "Dung", "Em"],
  };
}

function getSprint7State(): Sprint7WidgetState {
  const fallback = getFallbackState();

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const ob = params.get("sp7");
    if (ob) {
      const decoded = parseSprint7StateFromBase64(ob);
      if (decoded) return { ...fallback, ...decoded };
    }
  }

  const persisted = loadPersistedSprint7WidgetState();
  const raw = persisted || ((window as any).__SPRINT7_STATE__ as Partial<Sprint7WidgetState> | undefined);
  if (!raw || typeof raw !== "object") return fallback;
  return { ...fallback, ...raw };
}

/* ─────────── Widget Sub-components ─────────── */

function TimerWidget({ widgetState: initialWidgetState }: { widgetState: Sprint7WidgetState }) {
  const widgetState = useMemo(() => initialWidgetState || getSprint7State(), [initialWidgetState]);
  const [seconds, setSeconds] = useState(widgetState.timerSeconds ?? 5 * 60);
  const [doneText, setDoneText] = useState(widgetState.timerDoneText || "Time is up");
  const [isRunning, setIsRunning] = useState(true);
  const lastTriggerRef = useRef<number>(widgetState.timerTrigger || 0);

  useEffect(() => {
    const applyState = (next: Partial<Sprint7WidgetState>) => {
      const trigger = next.timerTrigger ?? 0;
      if (trigger > lastTriggerRef.current) {
        if (typeof next.timerSeconds === "number" && next.timerSeconds >= 0) {
          setSeconds(next.timerSeconds);
          setIsRunning(true);
        }
        lastTriggerRef.current = trigger;
      }
      if (typeof next.timerDoneText === "string" && next.timerDoneText.trim()) setDoneText(next.timerDoneText);
    };

    const channel = new BroadcastChannel("sprint7_timer_channel");
    channel.onmessage = (e) => {
      if (e.data.type === "UPDATE_TIMER") {
        applyState({ timerSeconds: e.data.seconds, timerDoneText: e.data.doneText, timerTrigger: e.data.trigger });
      }
    };

    const poll = async () => {
      try {
        const res = await fetch("/api/sprint7/state-sync");
        const data = await res.json();
        if (data?.state) applyState(data.state);
      } catch {}
    };
    const interval = setInterval(poll, 1500);

    return () => {
      channel.close();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 0) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const done = seconds === 0 && !isRunning;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="w-screen h-screen grid place-items-center bg-transparent text-slate-100 overflow-hidden" style={obsFontStyle}>
      <div className="text-center animate-in fade-in duration-300">
        <div className="text-[10vw] font-black tracking-[0.2em]">{done ? doneText : `${mins}:${secs}`}</div>
        <div className="text-cyan-400 uppercase tracking-[0.5em] mt-4 font-bold">{done ? "Timer Ended" : "Timer"}</div>
      </div>
    </div>
  );
}

function WheelWidget({ widgetState: initialWidgetState }: { widgetState: Sprint7WidgetState }) {
  const widgetState = useMemo(() => initialWidgetState || getSprint7State(), [initialWidgetState]);
  const [users, setUsers] = useState<string[]>(widgetState.wheelUsers || []);
  const [angle, setAngle] = useState(0);
  const isSpinningRef = useRef(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel("sprint7_wheel_state");
    channel.onmessage = (e) => {
      if (e.data.type === "UPDATE_WHEEL") setUsers(e.data.users);
    };
    
    const spinChannel = new BroadcastChannel("sprint7_wheel_channel");
    spinChannel.onmessage = (e) => {
      if (e.data.type === "SPIN" && !isSpinningRef.current) {
        // Simple logic for spin animation (simulated)
        isSpinningRef.current = true;
        setWinner(null);
        const targetAngle = angle + 1800 + Math.random() * 360;
        setAngle(targetAngle);
        setTimeout(() => {
          isSpinningRef.current = false;
          setWinner("Winner!"); 
        }, 6000);
      }
    };

    return () => {
      channel.close();
      spinChannel.close();
    };
  }, [angle]);

  return (
    <div className="w-screen h-screen grid place-items-center bg-transparent overflow-hidden" style={obsFontStyle}>
      <div className="text-center text-white font-bold">Wheel Widget Active (Users: {users.length})</div>
      {winner && <div className="fixed inset-0 grid place-items-center bg-black/40 text-4xl text-white">{winner}</div>}
    </div>
  );
}

function LinkWidget({ widgetState }: { widgetState: Sprint7WidgetState }) {
  const links = Object.entries(widgetState.socialLinks || {});
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-transparent" style={obsFontStyle}>
      <div className="bg-black/60 p-4 rounded-xl text-white">Social Links Active: {links.length}</div>
    </div>
  );
}

function ObsTodoWidget({ widgetState }: { widgetState: Sprint7WidgetState }) {
  return (
    <div className="w-screen h-screen p-8 bg-transparent" style={obsFontStyle}>
      <div className="bg-black/60 p-6 rounded-2xl border-l-4 border-emerald-500 text-white">
        <h2 className="text-xl font-black uppercase mb-4">Todo List</h2>
        <div className="space-y-2">
          {widgetState.todoList.map(t => (
            <div key={t.id} className={t.completed ? "opacity-40 line-through" : ""}>{t.text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sprint7Widgets({ messages }: { messages?: ChatMessage[] }) {
  const route = getRoute();
  const [state, setState] = useState<Sprint7WidgetState>(getSprint7State());
  const lastManualSyncRef = useRef<number>(0);

  useEffect(() => {
    if (messages && messages.length > 0) {
      console.log(`[Sprint7Widgets] Received ${messages.length} messages from parent.`);
    }
  }, [messages]);

  const syncState = (next: Sprint7WidgetState) => {
    lastManualSyncRef.current = Date.now();
    (window as any).__SPRINT7_STATE__ = next;
    savePersistedSprint7WidgetState(next);
    setState(next);
    fetch("/api/sprint7/state-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: next }),
    }).catch(() => {});
  };

  useEffect(() => {
    const poll = async () => {
      if (Date.now() - lastManualSyncRef.current < 3000) return;
      try {
        const res = await fetch("/api/sprint7/state-sync");
        const data = await res.json();
        if (data?.state) setState(data.state);
      } catch {}
    };
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  const vote = useVoteState(state, messages);

  return (
    <div className="w-full h-full bg-transparent overflow-hidden relative" style={obsFontStyle}>
      <CustomCssInjector css={state.customCSS} />
      <FlowerEffect messages={messages} />
      {route === "obs-effect" ? (
        null // FlowerEffect is already rendered globally in this container
      ) : route === "dashboard" ? (
        <Sprint7Dashboard state={state} syncState={syncState} />
      ) : route === "obs-timer" ? (
        <TimerWidget widgetState={state} />
      ) : route === "obs-wheel" ? (
        <WheelWidget widgetState={state} />
      ) : route === "obs-link" ? (
        <LinkWidget widgetState={state} />
      ) : route === "obs-todo" ? (
        <ObsTodoWidget widgetState={state} />
      ) : route === "obs-vote" ? (
        <ObsVoteWidget widgetState={state} vote={vote} />
      ) : (
        <div className="p-8 text-white">Route not found: {route}</div>
      )}
    </div>
  );
}

function ObsVoteWidget({ widgetState, vote }: { widgetState: Sprint7WidgetState, vote: any }) {
  const keywordA = widgetState.voteKeywordA || "A";
  const keywordB = widgetState.voteKeywordB || "B";

  return (
    <div className="w-screen h-screen bg-transparent p-12 flex items-end justify-center" style={obsFontStyle}>
      <div className="w-full max-w-4xl bg-black/60 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-12 duration-700">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-white text-3xl font-black uppercase tracking-[0.2em] flex items-center gap-4">
            <span className="w-3 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full" />
            Live Vote
          </h2>
          <div className="bg-white/10 px-6 py-2 rounded-full border border-white/5">
            <span className="text-slate-300 font-bold text-lg uppercase tracking-widest">Total: {vote.total}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12">
          {/* Option A */}
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-cyan-400 text-sm font-black uppercase tracking-widest mb-1">Keyword</span>
                <span className="text-white text-6xl font-black tracking-tight">{keywordA}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-cyan-400 text-4xl font-black">{vote.aPct}%</span>
                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{vote.A} votes</span>
              </div>
            </div>
            <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out" style={{ width: `${vote.aPct}%` }} />
            </div>
          </div>

          {/* Option B */}
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-fuchsia-400 text-sm font-black uppercase tracking-widest mb-1">Keyword</span>
                <span className="text-white text-6xl font-black tracking-tight">{keywordB}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-fuchsia-400 text-4xl font-black">{vote.bPct}%</span>
                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{vote.B} votes</span>
              </div>
            </div>
            <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-1000 ease-out" style={{ width: `${vote.bPct}%` }} />
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.4em] animate-pulse">
            Type <span className="text-white">!vote {keywordA}</span> or <span className="text-white">!vote {keywordB}</span> in chat to vote
          </p>
        </div>
      </div>
    </div>
  );
}

function CustomCssInjector({ css }: { css?: string }) {
  if (!css || !isLikelySafeCss(css)) return null;
  return <style id="custom-css-injector" dangerouslySetInnerHTML={{ __html: css }} />;
}
