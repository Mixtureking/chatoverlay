import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
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

/**
 * Robustly get hostname from a URL string.
 */
function getHostname(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

type WidgetRoute = "obs-vote" | "obs-timer" | "obs-wheel" | "obs-link" | "obs-todo" | "obs-effect" | "dashboard";

const obsFontStyle = { fontFamily: '"Inter", "Segoe UI", Arial, sans-serif' };

const getRoute = (): WidgetRoute => {
  if (typeof window === "undefined") return "dashboard";
  const path = window.location.pathname;
  if (path.includes("obs-timer")) return "obs-timer";
  if (path.includes("obs-wheel")) return "obs-wheel";
  if (path.includes("obs-link")) return "obs-link";
  if (path.includes("obs-vote")) return "obs-vote";
  if (path.includes("obs-chat")) return "obs-vote"; 
  if (path.includes("obs-todo")) return "obs-todo";
  if (path.includes("obs-effect")) return "obs-effect";
  return "dashboard";
};

/**
 * EmojiEffect component.
 */
function FlowerEffect({ state, messages }: { state?: Sprint7WidgetState, messages?: ChatMessage[] }) {
  const [items, setItems] = useState<{ id: number; left: number; delay: number; duration: number; size: number; content: string }[]>([]);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const lastFlowerTriggerRef = useRef<number>(state?.flowerTrigger || 0);

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

  useEffect(() => {
    const channel = new BroadcastChannel("sprint7_flower_channel");
    channel.onmessage = (e) => {
      if (["TUNG_HOA", "PHAO_HOA", "TIM", "VO_TAY"].includes(e.data.type)) {
        trigger(e.data.type);
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (state?.flowerTrigger && state.flowerTrigger > lastFlowerTriggerRef.current) {
      trigger(state.flowerType || "TUNG_HOA");
      lastFlowerTriggerRef.current = state.flowerTrigger;
    }
  }, [state?.flowerTrigger, state?.flowerType]);

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
      if (triggeredType) trigger(triggeredType);
    });
  }, [messages]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {items.map((f) => (
        <div key={f.id} className="absolute text-2xl animate-fall" style={{ left: `${f.left}%`, top: "-50px", animationDelay: `${f.delay}s`, animationDuration: `${f.duration}s`, fontSize: `${f.size}px` }}>{f.content}</div>
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-fall { animation: fall linear forwards; }
      `}</style>
    </div>
  );
}

/**
 * Hook to manage vote state with versioning.
 */
function useVoteState(widgetState: Sprint7WidgetState, messages?: ChatMessage[]) {
  const [state, setState] = useState<any>({ A: 0, B: 0, total: 0, voters: {}, updatedAt: 0 });
  const processedIds = useRef(new Set<string>());
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchServerVotes = async () => {
    try {
      const res = await fetch("/api/interactivity/votes");
      const data = await res.json();
      if (data?.state) {
        const incoming = data.state;
        if ((incoming.updatedAt || 0) > (stateRef.current.updatedAt || 0)) {
          setState(incoming);
          localStorage.setItem("sprint7_votes_local", JSON.stringify(incoming));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchServerVotes();
    const timer = setInterval(fetchServerVotes, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const kA = (widgetState?.voteKeywordA || "A").trim().toUpperCase();
    const kB = (widgetState?.voteKeywordB || "B").trim().toUpperCase();

    let updated = false;
    const newState = { ...stateRef.current, voters: { ...stateRef.current.voters } };

    messages.forEach(m => {
      if (processedIds.current.has(m.id)) return;
      processedIds.current.add(m.id);

      const text = unescapeHtml(m.messageText || "").trim().toUpperCase();
      const userId = String(m.authorName || m.id).trim();

      if (userId && !newState.voters[userId]) {
        const voteMatch = text.match(/^!VOTE\s+"?([^"]+)"?$/i);
        if (voteMatch) {
          const val = voteMatch[1].trim().toUpperCase();
          if (val === kA) { newState.voters[userId] = "A"; updated = true; }
          else if (val === kB) { newState.voters[userId] = "B"; updated = true; }
        }
      }
    });

    if (updated) {
      const counts = (Object.values(newState.voters) as Array<"A" | "B">).reduce((acc, v) => {
        acc[v]++;
        return acc;
      }, { A: 0, B: 0 });
      newState.A = counts.A;
      newState.B = counts.B;
      newState.total = counts.A + counts.B;
      newState.updatedAt = Date.now(); 
      setState(newState);
      localStorage.setItem("sprint7_votes_local", JSON.stringify(newState));
    }
  }, [messages, widgetState?.voteKeywordA, widgetState?.voteKeywordB]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sprint7_votes_local" && e.newValue) {
        try { 
          const incoming = JSON.parse(e.newValue);
          if ((incoming.updatedAt || 0) > (stateRef.current.updatedAt || 0)) {
            setState(incoming);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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
    socialLinks: { youtube: "https://youtube.com", tiktok: "https://tiktok.com", facebook: "https://facebook.com" },
    timerSeconds: 5 * 60,
    timerDoneText: "Thời gian đã kết thúc",
    wheelUsers: ["Doro", "An", "Bình", "Chi", "Dung", "Em"],
    updatedAt: Date.now()
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
  const [seconds, setSeconds] = useState(initialWidgetState.timerSeconds ?? 300);
  const [doneText, setDoneText] = useState(initialWidgetState.timerDoneText || "Time is up");
  const [isRunning, setIsRunning] = useState(true);
  const lastTriggerRef = useRef<number>(initialWidgetState.timerTrigger || 0);

  useEffect(() => {
    const trigger = initialWidgetState.timerTrigger ?? 0;
    if (trigger > lastTriggerRef.current) {
      setSeconds(initialWidgetState.timerSeconds ?? 300);
      setDoneText(initialWidgetState.timerDoneText || "Time is up");
      setIsRunning(true);
      lastTriggerRef.current = trigger;
    }
  }, [initialWidgetState.timerTrigger, initialWidgetState.timerSeconds, initialWidgetState.timerDoneText]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 0) { setIsRunning(false); return 0; }
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
      <div className="text-center">
        <div className="text-[12vw] font-black tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
          {done ? <motion.div key="done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{doneText}</motion.div> : <span key="time">{`${mins}:${secs}`}</span>}
        </div>
        <div className="text-cyan-400 uppercase tracking-[1em] mt-4 font-bold text-[2vw] opacity-70">{done ? "Timer Ended" : "Coming Soon"}</div>
      </div>
    </div>
  );
}

function WheelWidget({ widgetState: state }: { widgetState: Sprint7WidgetState }) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const lastSpinTriggerRef = useRef<number>(state.spinTrigger || 0);
  const users = useMemo(() => state.wheelUsers || ["Player"], [state.wheelUsers]);

  const startSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinner(null);
    const extraDegrees = Math.floor(Math.random() * 360);
    const newRotation = rotation + (5 * 360) + extraDegrees;
    setRotation(newRotation);
    setTimeout(() => {
      setIsSpinning(false);
      const actualDegrees = newRotation % 360;
      const segmentAngle = 360 / users.length;
      const winnerIndex = Math.floor((360 - (actualDegrees % 360)) / segmentAngle) % users.length;
      setWinner(users[winnerIndex]);
    }, 6000);
  };

  useEffect(() => {
    const trigger = state.spinTrigger ?? 0;
    if (trigger > lastSpinTriggerRef.current) {
      startSpin();
      lastSpinTriggerRef.current = trigger;
    }
  }, [state.spinTrigger]);

  const size = 600;
  const radius = 280;
  const centerX = size / 2;
  const centerY = size / 2;
  const segmentAngle = 360 / users.length;

  return (
    <div className="w-screen h-screen grid place-items-center bg-transparent overflow-hidden" style={obsFontStyle}>
      <div className="relative">
        <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 z-20 drop-shadow-xl">
          <div className="w-14 h-18 bg-white" style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
        </div>
        <div className="relative drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
            <motion.g animate={{ rotate: rotation }} transition={{ duration: 6, ease: [0.15, 0, 0.1, 1] }} style={{ originX: `${centerX}px`, originY: `${centerY}px` }}>
              <circle cx={centerX} cy={centerY} r={radius + 8} fill="#0f172a" />
              {users.map((user, i) => {
                const startAngle = i * segmentAngle;
                const endAngle = (i + 1) * segmentAngle;
                const x1 = centerX + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
                const y1 = centerY + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
                const x2 = centerX + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
                const y2 = centerY + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);
                const largeArc = segmentAngle > 180 ? 1 : 0;
                const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                const colors = ["#4f46e5", "#7c3aed", "#c026d3", "#db2777", "#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0891b2"];
                const color = colors[i % colors.length];
                return (
                  <g key={`${i}-${users.length}`}>
                    <path d={pathData} fill={color} stroke="#0f172a" strokeWidth="2" />
                    <g transform={`rotate(${startAngle + segmentAngle / 2} ${centerX} ${centerY})`}>
                      <text x={centerX} y={centerY - radius * 0.75} fill="white" fontSize={Math.max(10, 24 - Math.floor(users.length / 2))} fontWeight="900" textAnchor="middle" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))", textTransform: "uppercase", letterSpacing: "1px" }}>{user}</text>
                    </g>
                  </g>
                );
              })}
            </motion.g>
            <circle cx={centerX} cy={centerY} r="65" fill="#1e293b" stroke="white" strokeWidth="4" />
            <circle cx={centerX} cy={centerY} r="58" fill="white" />
            <image href="/doro.png" x={centerX - 42} y={centerY - 42} width="84" height="84" />
          </svg>
        </div>
        <AnimatePresence>
          {winner && !isSpinning && (
            <motion.div initial={{ scale: 0.5, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.5, opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur-3xl border-4 border-white/20 p-16 rounded-[60px] shadow-[0_0_150px_rgba(124,58,237,0.5)] text-center">
                <div className="text-violet-400 uppercase tracking-[0.8em] font-black text-2xl mb-6 animate-pulse">Winner Found</div>
                <div className="text-white text-8xl font-black drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] tracking-tight">{winner}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LinkWidget({ widgetState }: { widgetState: Sprint7WidgetState }) {
  const links = Object.entries(widgetState.socialLinks || {});
  if (links.length === 0) return null;
  const items = useMemo(() => [...links, ...links, ...links, ...links], [links]);

  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur-2xl py-8 border-t border-white/5 overflow-hidden" style={obsFontStyle}>
      <div className="marquee-track flex items-center">
        {items.map(([key, value], i) => (
          <div key={`${key}-${i}`} className="flex items-center gap-6 px-16 shrink-0">
             <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm uppercase shadow-xl shadow-violet-500/30">
               {key[0]}
             </div>
             <div className="flex flex-col">
               <span className="text-[11px] text-violet-400 font-black uppercase tracking-[0.3em] mb-1">{key}</span>
               <span className="text-white font-black text-2xl tracking-tight">{getHostname(value)}</span>
             </div>
             <span className="text-white/10 ml-16 text-4xl font-light">/</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObsTodoWidget({ widgetState }: { widgetState: Sprint7WidgetState }) {
  return (
    <div className="w-screen h-screen p-16 bg-transparent flex items-start justify-end" style={obsFontStyle}>
      <motion.div initial={false} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md bg-slate-950/80 backdrop-blur-3xl p-10 rounded-[50px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-black uppercase tracking-[0.4em] text-white flex items-center gap-5"><span className="w-3 h-10 bg-emerald-500 rounded-full" />Focus</h2>
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-black px-4 py-1.5 rounded-full border border-emerald-500/30 uppercase tracking-widest">{widgetState.todoList.filter(t=>t.completed).length}/{widgetState.todoList.length}</span>
        </div>
        <div className="space-y-5">
          {widgetState.todoList.map((t) => (
            <motion.div key={t.id} initial={false} animate={{ opacity: 1, scale: 1 }} className={`flex items-center gap-5 p-5 rounded-[24px] border transition-all duration-300 ${t.completed ? "bg-emerald-500/10 border-emerald-500/20 opacity-40 grayscale" : "bg-white/5 border-white/5 hover:border-white/20"}`}>
              <div className={`w-7 h-7 rounded-xl border-3 flex items-center justify-center transition-all ${t.completed ? "bg-emerald-500 border-emerald-500" : "border-white/20"}`}>
                {t.completed && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 bg-white rounded-md" />}
              </div>
              <span className={`font-bold text-xl tracking-tight ${t.completed ? "line-through text-slate-500" : "text-slate-100"}`}>{t.text}</span>
            </motion.div>
          ))}
          {widgetState.todoList.length === 0 && <p className="text-slate-500 italic text-center py-4">Empty list...</p>}
        </div>
      </motion.div>
    </div>
  );
}

export default function Sprint7Widgets({ messages }: { messages?: ChatMessage[] }) {
  const route = useMemo(() => getRoute(), []);
  const [state, setState] = useState<Sprint7WidgetState>(() => getSprint7State());
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const syncStateFromServer = async () => {
    try {
      const res = await fetch("/api/sprint7/state-sync");
      const data = await res.json();
      if (data?.state) {
        const incoming = data.state as Sprint7WidgetState;
        if ((incoming.updatedAt || 0) > (stateRef.current.updatedAt || 0)) {
          setState(incoming);
        }
      }
    } catch {}
  };

  useEffect(() => {
    const channel = new BroadcastChannel("sprint7_global_sync");
    channel.onmessage = (e) => {
      if (e.data?.type === "STATE_UPDATE" && e.data.state) {
        const incoming = e.data.state as Sprint7WidgetState;
        if ((incoming.updatedAt || 0) > (stateRef.current.updatedAt || 0)) {
          setState(incoming);
        }
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    syncStateFromServer();
    const interval = setInterval(syncStateFromServer, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const persisted = loadPersistedSprint7WidgetState();
      if (persisted && (persisted.updatedAt || 0) > (stateRef.current.updatedAt || 0)) {
        setState(persisted);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const vote = useVoteState(state, messages);

  const handleSyncState = (next: Sprint7WidgetState) => {
    const stamped = { ...next, updatedAt: Date.now() };
    setState(stamped);
    savePersistedSprint7WidgetState(stamped);
    
    const channel = new BroadcastChannel("sprint7_global_sync");
    channel.postMessage({ type: "STATE_UPDATE", state: stamped });
    channel.close();

    fetch("/api/sprint7/state-sync", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ state: stamped }) 
    }).catch(() => {});
  };

  return (
    <div className="w-full h-full bg-transparent overflow-hidden relative" style={obsFontStyle}>
      <CustomCssInjector css={state.customCSS} />
      <FlowerEffect state={state} messages={messages} />
      {route === "dashboard" ? (
        <Sprint7Dashboard state={state} syncState={handleSyncState} />
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
      ) : route === "obs-effect" ? (
        null
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
    <div className="w-screen h-screen bg-transparent p-16 flex items-end justify-center" style={obsFontStyle}>
      <motion.div initial={false} animate={{ y: 0, opacity: 1 }} className="w-full max-w-5xl bg-slate-950/80 backdrop-blur-3xl border border-white/10 p-12 rounded-[60px] shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
             <div className="w-4 h-12 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full" />
             <h2 className="text-white text-5xl font-black uppercase tracking-[0.2em]">Live Vote</h2>
          </div>
          <div className="bg-white/5 px-8 py-3 rounded-3xl border border-white/10 shadow-inner">
             <span className="text-slate-400 font-black text-xl uppercase tracking-widest">Total: <span className="text-white">{vote.total}</span></span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-20">
          <div className="space-y-6">
            <div className="flex items-end justify-between px-2">
              <div className="flex flex-col"><span className="text-cyan-400 text-sm font-black uppercase tracking-[0.3em] mb-2">Option Alpha</span><span className="text-white text-7xl font-black tracking-tighter">{keywordA}</span></div>
              <div className="flex flex-col items-end"><span className="text-cyan-400 text-6xl font-black tabular-nums">{vote.aPct}%</span><span className="text-slate-500 text-sm font-black uppercase tracking-widest">{vote.A} members</span></div>
            </div>
            <div className="h-10 w-full bg-white/5 rounded-[20px] overflow-hidden border border-white/5 shadow-inner p-1.5">
              <motion.div 
                initial={false} 
                animate={{ width: `${vote.aPct}%` }} 
                transition={{ type: "spring", stiffness: 60, damping: 15 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[12px] shadow-[0_0_20px_rgba(6,182,212,0.5)]" 
              />
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-end justify-between px-2">
              <div className="flex flex-col"><span className="text-fuchsia-400 text-sm font-black uppercase tracking-[0.3em] mb-2">Option Beta</span><span className="text-white text-7xl font-black tracking-tighter">{keywordB}</span></div>
              <div className="flex flex-col items-end"><span className="text-fuchsia-400 text-6xl font-black tabular-nums">{vote.bPct}%</span><span className="text-slate-500 text-sm font-black uppercase tracking-widest">{vote.B} members</span></div>
            </div>
            <div className="h-10 w-full bg-white/5 rounded-[20px] overflow-hidden border border-white/5 shadow-inner p-1.5">
              <motion.div 
                initial={false} 
                animate={{ width: `${vote.bPct}%` }} 
                transition={{ type: "spring", stiffness: 60, damping: 15 }}
                className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-600 rounded-[12px] shadow-[0_0_20px_rgba(217,70,239,0.5)]" 
              />
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/5 text-center">
           <p className="text-slate-500 font-black text-sm uppercase tracking-[0.6em] animate-pulse">Join by typing <span className="text-white">!vote {keywordA}</span> or <span className="text-white">!vote {keywordB}</span></p>
        </div>
      </motion.div>
    </div>
  );
}

function CustomCssInjector({ css }: { css?: string }) {
  if (!css || !isLikelySafeCss(css)) return null;
  return <style id="custom-css-injector" dangerouslySetInnerHTML={{ __html: css }} />;
}
