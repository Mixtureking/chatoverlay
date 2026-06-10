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
  const nextPageTokenRef = useRef<string | null>(null);
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

interface ClientVoteState {
  A: number;
  B: number;
  total: number;
  voters: Record<string, "A" | "B">;
}

/**
 * Hook to manage vote state.
 */
function useVoteState(widgetState: Sprint7WidgetState, messages?: ChatMessage[]) {
  const [state, setState] = useState<ClientVoteState>(() => {
    try {
      const saved = localStorage.getItem("sprint7_votes_local");
      return saved ? JSON.parse(saved) : { A: 0, B: 0, total: 0, voters: {} };
    } catch {
      return { A: 0, B: 0, total: 0, voters: {} };
    }
  });

  const processedIds = useRef(new Set<string>());

  const fetchServerVotes = async () => {
    try {
      const res = await fetch("/api/interactivity/votes");
      const data = await res.json();
      if (data?.state) {
        setState(data.state);
        localStorage.setItem("sprint7_votes_local", JSON.stringify(data.state));
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
    const newState = { ...state, voters: { ...state.voters } };

    messages.forEach(m => {
      if (processedIds.current.has(m.id)) return;
      processedIds.current.add(m.id);

      const text = unescapeHtml(m.messageText || "").trim().toUpperCase();
      const userId = String(m.authorChannelId || m.authorName || m.id).trim();

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
      const counts = Object.values(newState.voters).reduce((acc, v) => {
        acc[v]++;
        return acc;
      }, { A: 0, B: 0 });
      newState.A = counts.A;
      newState.B = counts.B;
      newState.total = counts.A + counts.B;
      setState(newState);
      localStorage.setItem("sprint7_votes_local", JSON.stringify(newState));
      
      // Sync to server too
      fetch("/api/interactivity/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "system", option: "A", state: newState }), // Pseudo-update
      }).catch(() => {});
    }
  }, [messages, widgetState?.voteKeywordA, widgetState?.voteKeywordB]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sprint7_votes_local" && e.newValue) {
        setState(JSON.parse(e.newValue));
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
      <div className="text-center animate-in fade-in zoom-in duration-500">
        <div className="text-[12vw] font-black tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
          {done ? <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{doneText}</motion.div> : `${mins}:${secs}`}
        </div>
        <div className="text-cyan-400 uppercase tracking-[1em] mt-4 font-bold text-[2vw] opacity-70">{done ? "Timer Ended" : "Coming Soon"}</div>
      </div>
    </div>
  );
}

function WheelWidget({ widgetState: state }: { widgetState: Sprint7WidgetState }) {
  const users = useMemo(() => state.wheelUsers || ["Player"], [state.wheelUsers]);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const lastSpinTriggerRef = useRef<number>(state.spinTrigger || 0);

  const startSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinner(null);
    const extraDegrees = Math.floor(Math.random() * 360);
    const newRotation = rotation + 1800 + extraDegrees;
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
        <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 z-20 drop-shadow-lg">
          <div className="w-12 h-16 bg-white" style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
        </div>
        <div className="relative drop-shadow-2xl" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
            <motion.g animate={{ rotate: rotation }} transition={{ duration: 6, ease: [0.2, 0, 0.1, 1] }} style={{ originX: `${centerX}px`, originY: `${centerY}px` }}>
              <circle cx={centerX} cy={centerY} r={radius + 10} fill="#1e293b" />
              {users.map((user, i) => {
                const startAngle = i * segmentAngle;
                const endAngle = (i + 1) * segmentAngle;
                const x1 = centerX + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
                const y1 = centerY + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
                const x2 = centerX + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
                const y2 = centerY + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);
                const largeArc = segmentAngle > 180 ? 1 : 0;
                const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4"];
                const color = colors[i % colors.length];
                return (
                  <g key={i}>
                    <path d={pathData} fill={color} stroke="#1e293b" strokeWidth="2" />
                    <g transform={`rotate(${startAngle + segmentAngle / 2} ${centerX} ${centerY})`}>
                      <text x={centerX} y={centerY - radius * 0.7} fill="white" fontSize={Math.max(12, 24 - users.length)} fontWeight="bold" textAnchor="middle" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }}>{user}</text>
                    </g>
                  </g>
                );
              })}
            </motion.g>
            <circle cx={centerX} cy={centerY} r="60" fill="white" stroke="#1e293b" strokeWidth="6" />
            <image href="/doro.png" x={centerX - 45} y={centerY - 45} width="90" height="90" />
          </svg>
        </div>
        <AnimatePresence>
          {winner && !isSpinning && (
            <motion.div initial={{ scale: 0.5, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.5, opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="bg-white/10 backdrop-blur-2xl border-2 border-white/20 p-12 rounded-[50px] shadow-[0_0_100px_rgba(236,72,153,0.5)] text-center">
                <div className="text-pink-400 uppercase tracking-[0.5em] font-black text-xl mb-4">WINNER</div>
                <div className="text-white text-7xl font-black drop-shadow-lg">{winner}</div>
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
  const items = [...links, ...links, ...links, ...links];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-black/60 backdrop-blur-md py-6 border-t border-white/10 overflow-hidden" style={obsFontStyle}>
      <div className="marquee-track flex items-center">
        {items.map(([key, value], i) => (
          <div key={`${key}-${i}`} className="flex items-center gap-4 px-12 shrink-0">
             <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs uppercase shadow-lg shadow-indigo-500/20">
               {key[0]}
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-0.5">{key}</span>
               <span className="text-white font-bold text-lg tracking-tight">{new URL(value).hostname.replace("www.", "")}</span>
             </div>
             <span className="text-white/20 ml-12 text-2xl">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObsTodoWidget({ widgetState }: { widgetState: Sprint7WidgetState }) {
  return (
    <div className="w-screen h-screen p-12 bg-transparent" style={obsFontStyle}>
      <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md ml-auto bg-slate-900/80 backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 shadow-2xl">
        <h2 className="text-2xl font-black uppercase tracking-[0.3em] mb-8 text-white flex items-center gap-4"><span className="w-2 h-8 bg-emerald-500 rounded-full" />Mission</h2>
        <div className="space-y-4">
          {widgetState.todoList.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${t.completed ? "bg-emerald-500/10 border-emerald-500/20 opacity-40" : "bg-white/5 border-white/5"}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${t.completed ? "bg-emerald-500 border-emerald-500" : "border-white/20"}`}>{t.completed && <div className="w-2 h-2 bg-white rounded-full" />}</div>
              <span className={`font-bold text-lg ${t.completed ? "line-through text-slate-400" : "text-white"}`}>{t.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function Sprint7Widgets({ messages }: { messages?: ChatMessage[] }) {
  const route = getRoute();
  const [state, setState] = useState<Sprint7WidgetState>(getSprint7State());
  const lastManualSyncRef = useRef<number>(0);

  const syncStateFromServer = async () => {
    if (Date.now() - lastManualSyncRef.current < 2000) return;
    try {
      const res = await fetch("/api/sprint7/state-sync");
      const data = await res.json();
      if (data?.state) setState(data.state);
    } catch {}
  };

  useEffect(() => {
    syncStateFromServer();
    const interval = setInterval(syncStateFromServer, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const persisted = loadPersistedSprint7WidgetState();
      if (persisted) setState(persisted);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const vote = useVoteState(state, messages);

  return (
    <div className="w-full h-full bg-transparent overflow-hidden relative" style={obsFontStyle}>
      <CustomCssInjector css={state.customCSS} />
      <FlowerEffect state={state} messages={messages} />
      {route === "dashboard" ? (
        <Sprint7Dashboard state={state} syncState={(next) => {
          lastManualSyncRef.current = Date.now();
          setState(next);
          savePersistedSprint7WidgetState(next);
          fetch("/api/sprint7/state-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: next }) }).catch(() => {});
        }} />
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
    <div className="w-screen h-screen bg-transparent p-12 flex items-end justify-center" style={obsFontStyle}>
      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-4xl bg-black/60 backdrop-blur-2xl border border-white/10 p-8 rounded-[40px] shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-white text-3xl font-black uppercase tracking-[0.2em] flex items-center gap-4"><span className="w-3 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full" />Live Vote</h2>
          <div className="bg-white/10 px-6 py-2 rounded-full border border-white/5"><span className="text-slate-300 font-bold text-lg uppercase tracking-widest">Total: {vote.total}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex flex-col"><span className="text-cyan-400 text-xs font-black uppercase tracking-widest mb-1">Option A</span><span className="text-white text-6xl font-black tracking-tight">{keywordA}</span></div>
              <div className="flex flex-col items-end"><span className="text-cyan-400 text-4xl font-black tabular-nums">{vote.aPct}%</span><span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{vote.A} votes</span></div>
            </div>
            <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden border border-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${vote.aPct}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" /></div>
          </div>
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex flex-col"><span className="text-fuchsia-400 text-xs font-black uppercase tracking-widest mb-1">Option B</span><span className="text-white text-6xl font-black tracking-tight">{keywordB}</span></div>
              <div className="flex flex-col items-end"><span className="text-fuchsia-400 text-4xl font-black tabular-nums">{vote.bPct}%</span><span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{vote.B} votes</span></div>
            </div>
            <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden border border-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${vote.bPct}%` }} className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full" /></div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 text-center"><p className="text-slate-400 font-bold text-xs uppercase tracking-[0.4em] animate-pulse">Type <span className="text-white">!vote {keywordA}</span> or <span className="text-white">!vote {keywordB}</span> in chat</p></div>
      </motion.div>
    </div>
  );
}

function CustomCssInjector({ css }: { css?: string }) {
  if (!css || !isLikelySafeCss(css)) return null;
  return <style id="custom-css-injector" dangerouslySetInnerHTML={{ __html: css }} />;
}
