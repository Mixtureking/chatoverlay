import React, { useEffect, useMemo, useState, useRef } from "react";
import { createSprint7WidgetState, loadPersistedSprint7WidgetState, parseSprint7StateFromBase64, savePersistedSprint7WidgetState, isLikelySafeCss, type Sprint7WidgetState } from "./sprint7State";
import { Sprint7Dashboard } from "./Sprint7Dashboard";

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
 * FlowerEffect component that can trigger independently by polling chat.
 */
function FlowerEffect() {
  const [flowers, setFlowers] = useState<{ id: number; left: number; delay: number; duration: number; size: number }[]>([]);
  const nextPageTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const trigger = () => {
      const newFlowers = Array.from({ length: 30 }).map((_, i) => ({
        id: Date.now() + i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 3,
        size: 20 + Math.random() * 20,
      }));
      setFlowers((prev) => [...prev, ...newFlowers]);
      setTimeout(() => {
        setFlowers((prev) => prev.filter((f) => !newFlowers.includes(f)));
      }, 8000);
    };

    // Listen for triggers from other tabs (Dashboard or other layers)
    const channel = new BroadcastChannel("sprint7_flower_channel");
    channel.onmessage = (e) => {
      if (e.data.type === "TUNG_HOA") trigger();
    };

    // Autonomous polling to ensure it works even if ONLY this layer is open in OBS
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
            const hasTunghoa = msgData.messages.some((m: any) => 
              String(m.messageText || "").trim().toUpperCase().includes("!TUNGHOA")
            );
            if (hasTunghoa) {
              trigger();
              channel.postMessage({ type: "TUNG_HOA" }); // Notify other tabs
            }
          }
        }
      } catch {}
    };

    const timer = setInterval(poll, 2000);
    return () => {
      alive = false;
      channel.close();
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {flowers.map((f) => (
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
          {["🌸", "🌹", "🌺", "🌻", "🌼", "🌷"][f.id % 6]}
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
function useVoteState(widgetState: Sprint7WidgetState) {
  const [state, setState] = useState<ClientVoteState>(() => {
    try {
      const saved = localStorage.getItem("sprint7_votes");
      return saved ? JSON.parse(saved) : { A: 0, B: 0, total: 0, voters: {} };
    } catch {
      return { A: 0, B: 0, total: 0, voters: {} };
    }
  });

  const nextPageTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Sync state across tabs using storage event
    const syncFromLocal = () => {
      try {
        const saved = localStorage.getItem("sprint7_votes");
        if (saved) setState(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener("storage", (e) => {
      if (e.key === "sprint7_votes") syncFromLocal();
    });

    // 2. Autonomous polling for votes
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
            const savedRaw = localStorage.getItem("sprint7_votes");
            const current: ClientVoteState = savedRaw ? JSON.parse(savedRaw) : { A: 0, B: 0, total: 0, voters: {} };
            let updated = false;

            const kA = (widgetState?.voteKeywordA || settings.voteKeywordA || "A").trim().toUpperCase();
            const kB = (widgetState?.voteKeywordB || settings.voteKeywordB || "B").trim().toUpperCase();

            msgData.messages.forEach((m: any) => {
              const text = String(m.messageText || "").trim().toUpperCase();
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

              // Also check for !tunghoa here to bridge with FlowerEffect if needed
              if (text.includes("!TUNGHOA")) {
                const channel = new BroadcastChannel("sprint7_flower_channel");
                channel.postMessage({ type: "TUNG_HOA" });
                channel.close();
              }
            });

            if (updated) {
              current.total = current.A + current.B;
              localStorage.setItem("sprint7_votes", JSON.stringify(current));
              setState(current);
            }
          }
        }
      } catch {}
    };

    const timer = setInterval(poll, 2000);
    return () => {
      alive = false;
      window.removeEventListener("storage", syncFromLocal);
      clearInterval(timer);
    };
  }, [widgetState?.voteKeywordA, widgetState?.voteKeywordB]);

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

function ObsVoteWidget({ widgetState }: { widgetState: Sprint7WidgetState }) {
  const vote = useVoteState(widgetState);
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

export default function Sprint7Widgets() {
  const route = getRoute();
  const [state, setState] = useState<Sprint7WidgetState>(getSprint7State());
  const lastManualSyncRef = useRef<number>(0);

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
    if (route === "dashboard") {
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
    }
  }, [route]);

  const isLight = false; // Could be synced if needed

  return (
    <div className="w-full h-full bg-transparent overflow-hidden" style={obsFontStyle}>
      <CustomCssInjector css={state.customCSS} />
      {route === "obs-effect" ? (
        <FlowerEffect />
      ) : route === "dashboard" ? (
        <>
          <FlowerEffect />
          <Sprint7Dashboard state={state} syncState={syncState} />
        </>
      ) : route === "obs-timer" ? (
        <TimerWidget widgetState={state} />
      ) : route === "obs-wheel" ? (
        <WheelWidget widgetState={state} />
      ) : route === "obs-link" ? (
        <LinkWidget widgetState={state} />
      ) : route === "obs-todo" ? (
        <ObsTodoWidget widgetState={state} />
      ) : route === "obs-vote" ? (
        <ObsVoteWidget widgetState={state} />
      ) : (
        <div className="p-8 text-white">Route not found: {route}</div>
      )}
    </div>
  );
}
