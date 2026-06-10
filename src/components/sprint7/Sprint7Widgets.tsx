import React, { useEffect, useMemo, useState, useRef } from "react";
import { createSprint7WidgetState, loadPersistedSprint7WidgetState, parseSprint7StateFromBase64, savePersistedSprint7WidgetState, isLikelySafeCss, type Sprint7WidgetState, serializeSprint7FullState, parseSprint7FullState } from "./sprint7State";
import { Sprint7Dashboard } from "./Sprint7Dashboard";

type VoteState = { A: number; B: number; total: number; keywordA?: string; keywordB?: string };
type WidgetRoute = "obs-vote" | "obs-timer" | "obs-wheel" | "obs-link" | "obs-todo" | "dashboard";

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
  return "dashboard";
};

function useVoteState() {
  const [state, setState] = useState<VoteState>({ A: 0, B: 0, total: 0 });
  const nextPageTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        // Poll settings to get YouTube credentials
        const settingsRes = await fetch("/api/youtube/settings-sync");
        const settingsData = await settingsRes.json();
        const settings = settingsData?.settings;

        if (settings?.activeLiveChatId && settings?.apiKey) {
          // Poll messages to trigger vote processing on backend
          let url = `/api/youtube/messages?liveChatId=${encodeURIComponent(settings.activeLiveChatId)}&apiKey=${encodeURIComponent(settings.apiKey)}`;
          if (nextPageTokenRef.current) {
            url += `&pageToken=${encodeURIComponent(nextPageTokenRef.current)}`;
          }
          const msgRes = await fetch(url);
          const msgData = await msgRes.json();
          if (msgData?.nextPageToken) {
            nextPageTokenRef.current = msgData.nextPageToken;
          }
        }

        const res = await fetch("/api/interactivity/votes");
        const data = await res.json();
        if (!alive) return;
        setState(data?.state || { A: 0, B: 0, total: 0 });
      } catch {
        if (alive) setState({ A: 0, B: 0, total: 0 });
      }
    };
    load();
    const timer = window.setInterval(load, 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const aPct = state.total > 0 ? Math.round((state.A / state.total) * 100) : 0;
  const bPct = state.total > 0 ? 100 - aPct : 0;
  return { ...state, aPct, bPct };
}

function getFallbackState(): Sprint7WidgetState {
  return {
    todoList: [
      { id: "todo-1", text: "Set scene", completed: false },
      { id: "todo-2", text: "Check mic", completed: true },
      { id: "todo-3", text: "Start stream", completed: false },
    ],
    customCSS: "",
    socialLinks: {
      youtube: "https://youtube.com",
      tiktok: "https://tiktok.com",
      discord: "https://discord.com",
    },
    timerSeconds: 5 * 60,
    timerDoneText: "Time is up",
    wheelUsers: ["Doro", "An", "Binh", "Chi", "Dung", "Em"],
  };
}

function getSprint7State(): Sprint7WidgetState {
  const fallback = getFallbackState();

  // Try parsing from URL parameter 'ob' first
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const ob = params.get("sp7");
    if (ob) {
      const decoded = parseSprint7StateFromBase64(ob);
      if (decoded) {
        return {
          ...fallback,
          ...decoded,
          todoList: Array.isArray(decoded.todoList) ? decoded.todoList : fallback.todoList,
          socialLinks: decoded.socialLinks && typeof decoded.socialLinks === "object" ? decoded.socialLinks : fallback.socialLinks,
          timerSeconds: typeof decoded.timerSeconds === "number" ? decoded.timerSeconds : fallback.timerSeconds,
          timerDoneText: typeof decoded.timerDoneText === "string" && decoded.timerDoneText.trim() ? decoded.timerDoneText : fallback.timerDoneText,
          wheelUsers: Array.isArray(decoded.wheelUsers) && decoded.wheelUsers.length > 0 ? decoded.wheelUsers : fallback.wheelUsers,
        };
      }
    }
  }

  const persisted = loadPersistedSprint7WidgetState();
  const raw = persisted || ((window as any).__SPRINT7_STATE__ as Partial<Sprint7WidgetState> | undefined);
  if (!raw || typeof raw !== "object") return fallback;
  return {
    ...fallback,
    ...raw,
    todoList: Array.isArray(raw.todoList) ? raw.todoList : fallback.todoList,
    socialLinks: raw.socialLinks && typeof raw.socialLinks === "object" ? raw.socialLinks : fallback.socialLinks,
    timerSeconds: typeof raw.timerSeconds === "number" ? raw.timerSeconds : fallback.timerSeconds,
    timerDoneText: typeof raw.timerDoneText === "string" && raw.timerDoneText.trim() ? raw.timerDoneText : fallback.timerDoneText,
    wheelUsers: Array.isArray(raw.wheelUsers) && raw.wheelUsers.length > 0 ? raw.wheelUsers : fallback.wheelUsers,
  };
}

const getBtnClass = (color: "cyan" | "fuchsia" | "emerald" | "yellow" | "sky" | "indigo" | "amber" | "rose" | "slate", isLight: boolean) => {
  const themes = {
    emerald: isLight 
      ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" 
      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20",
    cyan: isLight 
      ? "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100" 
      : "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20",
    rose: isLight 
      ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" 
      : "bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20",
    yellow: isLight 
      ? "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100" 
      : "bg-yellow-500/10 border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20",
    slate: isLight 
      ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200" 
      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700",
    sky: isLight 
      ? "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100" 
      : "bg-sky-500/10 border-sky-500/20 text-sky-300 hover:bg-sky-500/20",
    indigo: isLight 
      ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" 
      : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20",
    amber: isLight 
      ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" 
      : "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20",
  };
  return `text-[11px] px-3 py-1.5 rounded-full border font-bold transition-all cursor-pointer ${themes[color]}`;
};

interface VoteWidgetProps {
  widgetState: Sprint7WidgetState;
  syncState: (next: Sprint7WidgetState) => void;
  isLight: boolean;
}

const sampleComments = [
  "Stream mượt quá anh ơi! 🔥🕹️",
  "Game này tên gì vậy mọi người ơi? Đẹp mắt thế.",
  "Chào cả nhà nha, chúc buổi tối stream vui vẻ!",
  "Mọi người nhớ nhấn Like và Đăng ký kênh ủng hộ streamer nhé! 👍🔔",
  "Làm trận Custom với người xem đi anh trai ơi!"
];

function VoteWidget({ widgetState, syncState, isLight }: VoteWidgetProps) {
  const vote = useVoteState();
  const obsChatFontStyle = { fontFamily: '"Segoe UI", Roboto, Arial, sans-serif' };
  const [roulette, setRoulette] = useState<string[]>(sampleComments);
  const [todoDrafts, setTodoDrafts] = useState<Record<string, string>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [newLinkKey, setNewLinkKey] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [cssDraft, setCssDraft] = useState("");
  const [timerDraftSeconds, setTimerDraftSeconds] = useState("300");
  const [timerDraftDoneText, setTimerDraftDoneText] = useState("Time is up");
  const [wheelDrafts, setWheelDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    setCssDraft(widgetState.customCSS || "");
    setTimerDraftSeconds(String(widgetState.timerSeconds ?? 300));
    setTimerDraftDoneText(widgetState.timerDoneText || "Time is up");
    setWheelDrafts(
      (widgetState.wheelUsers || []).reduce<Record<number, string>>((acc, value, index) => {
        acc[index] = value;
        return acc;
      }, {}),
    );
  }, [widgetState.customCSS, widgetState.timerSeconds, widgetState.timerDoneText, widgetState.wheelUsers]);

  const addTodo = () => {
    const next = { ...widgetState };
    next.todoList = next.todoList.concat({ id: `todo-${Date.now()}`, text: `Nhiệm vụ ${next.todoList.length + 1}`, completed: false });
    syncState(next);
  };
  const toggleFirstTodo = () => {
    const next = { ...widgetState };
    if (next.todoList.length === 0) return;
    next.todoList = next.todoList.map((item, index) => (index === 0 ? { ...item, completed: !item.completed } : item));
    syncState(next);
  };
  const clearTodos = () => {
    const next = { ...widgetState };
    next.todoList = [];
    syncState(next);
  };
  const updateTodoText = (id: string, text: string) => setTodoDrafts((prev) => ({ ...prev, [id]: text }));
  const saveTodoText = (id: string) => {
    const next = { ...widgetState };
    next.todoList = next.todoList.map((item) => (item.id === id ? { ...item, text: todoDrafts[id] ?? item.text } : item));
    syncState(next);
  };
  const deleteTodo = (id: string) => {
    const next = { ...widgetState };
    next.todoList = next.todoList.filter((item) => item.id !== id);
    syncState(next);
  };

  const updateLinkText = (key: string, value: string) => setLinkDrafts((prev) => ({ ...prev, [key]: value }));
  const saveLinkText = (key: string) => {
    const safeLinks = widgetState.socialLinks || {};
    const val = linkDrafts[key];
    if (val === undefined) return;
    syncState({
      ...widgetState,
      socialLinks: { ...safeLinks, [key]: val },
    });
  };
  const deleteLink = (key: string) => {
    const safeLinks = widgetState.socialLinks || {};
    const { [key]: _removed, ...rest } = safeLinks;
    setLinkDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    syncState({ ...widgetState, socialLinks: rest });
  };
  const addSocialLink = () => {
    const safeLinks = widgetState.socialLinks || {};
    const key = newLinkKey.trim() || `link${Object.keys(safeLinks).length + 1}`;
    const url = newLinkUrl.trim() || "https://example.com";
    
    syncState({
      ...widgetState,
      socialLinks: { ...safeLinks, [key]: url },
    });
    setNewLinkKey("");
    setNewLinkUrl("");
  };
  const resetSocialLinks = () => syncState({ ...widgetState, ...getFallbackState() });
  const saveCssDraft = () => {
    const next = { ...widgetState };
    next.customCSS = cssDraft;
    syncState(next);
  };
  const saveTimerDraft = () => {
    const next = { ...widgetState };
    const parsedSeconds = Number.parseInt(timerDraftSeconds, 10);
    next.timerSeconds = Number.isFinite(parsedSeconds) && parsedSeconds >= 0 ? parsedSeconds : 300;
    next.timerDoneText = timerDraftDoneText || "Time is up";
    next.timerTrigger = Date.now();
    syncState(next);
  };
  const updateWheelDraft = (index: number, value: string) => setWheelDrafts((prev) => ({ ...prev, [index]: value }));
  const saveWheelDrafts = () => {
    const next = { ...widgetState };
    const items = Object.entries(wheelDrafts).sort(([a], [b]) => Number(a) - Number(b)).map(([, value]) => (value as string).trim()).filter(Boolean);
    next.wheelUsers = items.length > 0 ? items : getFallbackState().wheelUsers;
    syncState(next);
  };
  const resetAllState = () => syncState(getFallbackState());
  const exportState = () => {
    const payload = serializeSprint7FullState({ todoList: widgetState.todoList, customCSS: widgetState.customCSS, socialLinks: widgetState.socialLinks });
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sprint7-widget-state.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const copyState = async () => {
    try {
      await navigator.clipboard.writeText(serializeSprint7FullState({ todoList: widgetState.todoList, customCSS: widgetState.customCSS, socialLinks: widgetState.socialLinks }));
    } catch {}
  };
  const importState = async (file: File | null) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = parseSprint7FullState(raw);
      syncState(createSprint7WidgetState({ ...widgetState, todoList: parsed.todoList, customCSS: parsed.customCSS, socialLinks: parsed.socialLinks }));
    } catch {}
  };

  useEffect(() => {
    const timer = window.setInterval(() => setRoulette((prev) => prev.slice(1).concat(prev[0])), 2500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full overflow-hidden bg-slate-950 text-slate-100" style={obsChatFontStyle}>
      <div className="h-full overflow-y-auto custom-scrollbar px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
          
          {/* Card: Live Vote */}
          <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/50 p-6 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-cyan-600" : "text-cyan-300"}`}>
              Live Vote
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Keyword A</label>
                <input 
                  value={widgetState.voteKeywordA || "A"} 
                  onChange={(e) => syncState({ ...widgetState, voteKeywordA: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none text-cyan-400 focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Keyword B</label>
                <input 
                  value={widgetState.voteKeywordB || "B"} 
                  onChange={(e) => syncState({ ...widgetState, voteKeywordB: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none text-fuchsia-400 focus:border-fuchsia-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm font-bold text-slate-200">
              <div>{widgetState.voteKeywordA || "A"}: {vote.A}</div>
              <div>{widgetState.voteKeywordB || "B"}: {vote.B}</div>
            </div>
            <div className="mt-4 h-4 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${vote.aPct}%` }} />
            </div>
            <div className={`mt-2 text-xs font-semibold ${isLight ? "text-cyan-700" : "text-cyan-200"}`}>
              {vote.aPct}% / {vote.bPct}%
            </div>
            <div className="mt-4 flex justify-end">
                <button 
                  onClick={async () => {
                    await fetch("/api/interactivity/votes", { method: "DELETE" });
                    window.location.reload();
                  }} 
                  className={getBtnClass("rose", isLight)}
                >
                  Reset Votes
                </button>
            </div>
          </div>

          {/* Card: Chat Roulette */}
          <div className="rounded-3xl border border-fuchsia-500/30 bg-slate-900/50 p-6">
            <div className="cyberpunk-glitch rounded-2xl border border-fuchsia-400/80 p-4 text-xl font-bold text-fuchsia-200 bg-slate-950/40">
              {roulette[0]}
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-400 font-medium">
              {roulette.slice(1, 4).map((item) => <div key={item}>{item}</div>)}
            </div>
          </div>

          {/* Card: Todo List */}
          <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/50 p-5">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-emerald-600" : "text-emerald-300"}`}>
              Todo List
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={addTodo} className={getBtnClass("emerald", isLight)}>Add</button>
              <button onClick={toggleFirstTodo} className={getBtnClass("cyan", isLight)}>Toggle first</button>
              <button onClick={clearTodos} className={getBtnClass("rose", isLight)}>Clear all</button>
            </div>
            <div className="space-y-2">
              {widgetState.todoList.map((item) => (
                <div key={item.id} className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 space-y-2 flex flex-col">
                  <input 
                    value={todoDrafts[item.id] ?? item.text} 
                    onChange={(e) => updateTodoText(item.id, e.target.value)} 
                    onBlur={() => saveTodoText(item.id)} 
                    style={{ textDecoration: item.completed ? "line-through" : "none" }}
                    className={`w-full bg-slate-900 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-sm outline-none text-slate-100 placeholder-slate-500 focus:border-indigo-500 ${item.completed ? "opacity-60" : ""}`} 
                  />
                  <div className="flex justify-end">
                      <button onClick={() => deleteTodo(item.id)} className={getBtnClass("rose", isLight)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Social Links Marquee */}
          <div className="rounded-3xl border border-yellow-500/30 bg-slate-900/50 p-4 overflow-hidden">
              <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-yellow-600" : "text-yellow-300"}`}>
              Social Links
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <input 
                type="text" 
                placeholder="Tên" 
                value={newLinkKey} 
                onChange={(e) => setNewLinkKey(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs outline-none text-slate-100 w-24"
              />
              <input 
                type="text" 
                placeholder="URL" 
                value={newLinkUrl} 
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs outline-none text-slate-100 flex-1"
              />
              <button onClick={addSocialLink} className={getBtnClass("yellow", isLight)}>Add link</button>
              <button onClick={resetSocialLinks} className={getBtnClass("slate", isLight)}>Reset</button>
            </div>
            <div className="overflow-hidden whitespace-nowrap">
              <div className="marquee-track items-center">
                {Object.entries(widgetState.socialLinks).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider min-w-[60px] shrink-0">{key}</span>
                      <input
                        value={linkDrafts[key] ?? value}
                        onChange={(e) => updateLinkText(key, e.target.value)}
                        onBlur={() => saveLinkText(key)}
                        className="bg-transparent outline-none text-sm min-w-[180px] text-slate-100"
                      />
                      <button onClick={() => deleteLink(key)} className={getBtnClass("rose", isLight)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: JSON state files */}
          <div className="rounded-3xl border border-sky-500/30 bg-slate-900/50 p-5">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-sky-600" : "text-sky-300"}`}>
              JSON State
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportState} className={getBtnClass("sky", isLight)}>Export</button>
              <button onClick={copyState} className={getBtnClass("indigo", isLight)}>Copy</button>
              <label className={getBtnClass("slate", isLight)}>Import
                <input type="file" accept=".json" className="hidden" onChange={(e) => { void importState(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
              </label>
              <button onClick={resetAllState} className={getBtnClass("rose", isLight)}>Reset all</button>
            </div>
          </div>

          {/* Card: Custom CSS */}
          <div className="rounded-3xl border border-indigo-500/30 bg-slate-900/50 p-5">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-indigo-600" : "text-indigo-300"}`}>
              Custom CSS
            </div>
            <textarea
              value={cssDraft}
              onChange={(e) => setCssDraft(e.target.value)}
              onBlur={saveCssDraft}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono outline-none resize-y text-slate-100 focus:border-indigo-500"
              placeholder="Enter CSS here..."
            />
            <div className="mt-2 text-[11px] text-slate-400">CSS is injected only when the syntax is valid. Invalid CSS is ignored.</div>
          </div>

          {/* Card: Timer / Wheel */}
          <div className="rounded-3xl border border-amber-500/30 bg-slate-900/50 p-5">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-amber-600" : "text-amber-300"}`}>
              Timer / Wheel
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  value={timerDraftSeconds} 
                  onChange={(e) => setTimerDraftSeconds(e.target.value)} 
                  onBlur={saveTimerDraft} 
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-100 focus:border-indigo-500" 
                    placeholder="Countdown seconds" 
                />
                <input 
                  value={timerDraftDoneText} 
                  onChange={(e) => setTimerDraftDoneText(e.target.value)} 
                  onBlur={saveTimerDraft} 
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-100 focus:border-indigo-500" 
                    placeholder="Finish message" 
                />
              </div>
              <div className="text-[11px] text-slate-400">Edit the timer and finish text quickly, then it saves on blur.</div>
              <div className="space-y-2">
                {(widgetState.wheelUsers || []).map((user, index) => (
                  <input
                    key={`${index}-${user}`}
                    value={wheelDrafts[index] ?? user}
                    onChange={(e) => updateWheelDraft(index, e.target.value)}
                    onBlur={saveWheelDrafts}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-100 focus:border-indigo-500"
                    placeholder={`Wheel user ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      
      if (typeof next.timerDoneText === "string" && next.timerDoneText.trim()) {
        setDoneText(next.timerDoneText);
      }
    };

    const syncFromStorage = () => {
      const persisted = loadPersistedSprint7WidgetState();
      if (persisted) applyState(persisted);
    };

    syncFromStorage();

    const channel = new BroadcastChannel("sprint7_timer_channel");
    channel.onmessage = (e) => {
      if (e.data.type === "UPDATE_TIMER") {
        applyState({ timerSeconds: e.data.seconds, timerDoneText: e.data.doneText, timerTrigger: e.data.trigger });
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "sprint7_widget_state") syncFromStorage();
    };
    window.addEventListener("storage", onStorage);

    // Sync via server polling for remote controllers or isolated browser profiles
    const pollState = async () => {
      try {
        const res = await fetch("/api/sprint7/state-sync");
        const data = await res.json();
        if (data?.state) {
          applyState(data.state);
        }
      } catch {}
    };
    pollState();
    const pollInterval = setInterval(pollState, 1000);

    return () => {
      channel.close();
      window.removeEventListener("storage", onStorage);
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 0) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const done = seconds === 0 && !isRunning;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="w-screen h-screen grid place-items-center bg-transparent text-slate-100 overflow-hidden" style={obsFontStyle}>
      <div className="text-center animate-in fade-in duration-300">
        <div className="text-[10vw] font-black tracking-[0.2em]">{done ? doneText : `${mins}:${secs}`}</div>
        <div className="text-cyan-400 uppercase tracking-[0.5em] mt-4 font-bold">{done ? doneText : "Timer"}</div>
      </div>
    </div>
  );
}

const DORO_WHEEL_COLORS = [
  "#7c3aed", "#0e7490", "#be185d", "#15803d", "#c2410c",
  "#1d4ed8", "#a21caf", "#0f766e", "#b45309", "#1e40af",
];

function WheelWidget({ widgetState: initialWidgetState }: { widgetState: Sprint7WidgetState }) {
  const widgetState = useMemo(() => initialWidgetState || getSprint7State(), [initialWidgetState]);
  const fallbackUsers = widgetState.wheelUsers && widgetState.wheelUsers.length > 0 ? widgetState.wheelUsers : getFallbackState().wheelUsers;
  const [users, setUsers] = useState<string[]>(fallbackUsers);
  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0);
  const isSpinningRef = useRef(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const usersRef = useRef(users);
  const mountedRef = useRef(true);
  const lastSpinTriggerRef = useRef<number>(0);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reloadUsers = async (shuffleOnFallback = false) => {
    try {
      const syncRes = await fetch("/api/youtube/settings-sync");
      const syncData = await syncRes.json().catch(() => ({}));
      const settings = syncData?.settings;
      const liveChatId = settings?.activeLiveChatId;
      const apiKey = settings?.apiKey;
      if (!liveChatId || !apiKey) {
        if (shuffleOnFallback && mountedRef.current) {
          setUsers((prev) => [...prev].sort(() => Math.random() - 0.5));
        }
        return;
      }
      const msgRes = await fetch(
        `/api/youtube/messages?liveChatId=${encodeURIComponent(liveChatId)}&apiKey=${encodeURIComponent(apiKey)}`,
      );
      const msgData = await msgRes.json().catch(() => ({}));
      const names = Array.isArray(msgData?.messages)
        ? Array.from(
            new Set(
              msgData.messages
                .map((m: any) => String(m?.authorName || "").trim())
                .filter(Boolean),
            ),
          ).slice(0, 24)
        : [];
      if (!mountedRef.current) return;
      if (names.length > 0) {
        setUsers(names);
      } else if (shuffleOnFallback) {
        setUsers((prev) => [...prev].sort(() => Math.random() - 0.5));
      }
    } catch {
      if (shuffleOnFallback && mountedRef.current) {
        setUsers((prev) => [...prev].sort(() => Math.random() - 0.5));
      }
    }
  };

  const handleReload = async () => {
    setIsReloading(true);
    setWinner(null);
    setUsers((prev) => (prev.length > 1 ? [...prev].sort(() => Math.random() - 0.5) : prev));
    await reloadUsers(true);
    setIsReloading(false);
  };

  useEffect(() => {
    reloadUsers(false);

    const wheelChannel = new BroadcastChannel("sprint7_wheel_state");
    wheelChannel.onmessage = (e) => {
      if (e.data.type === "UPDATE_WHEEL") {
        const newUsers = e.data.users;
        if (Array.isArray(newUsers) && newUsers.length > 0) {
          setUsers(newUsers);
        }
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sprint7_widget_state") {
        const persisted = loadPersistedSprint7WidgetState();
        if (persisted?.wheelUsers?.length) {
          setUsers(persisted.wheelUsers);
        }
        if (persisted?.spinTrigger) {
          if (lastSpinTriggerRef.current === 0) {
            lastSpinTriggerRef.current = persisted.spinTrigger;
          } else if (persisted.spinTrigger > lastSpinTriggerRef.current) {
            lastSpinTriggerRef.current = persisted.spinTrigger;
            const localChannel = new BroadcastChannel("sprint7_wheel_channel");
            localChannel.postMessage({ type: "SPIN" });
            localChannel.close();
          }
        }
      }
    };
    window.addEventListener("storage", onStorage);

    // Sync via server polling for remote controllers or isolated browser profiles
    const pollWheelState = async () => {
      try {
        const res = await fetch("/api/sprint7/state-sync");
        const data = await res.json();
        if (data?.state) {
          if (data.state.wheelUsers && JSON.stringify(data.state.wheelUsers) !== JSON.stringify(usersRef.current)) {
            setUsers(data.state.wheelUsers);
          }
          if (data.state.spinTrigger) {
            if (lastSpinTriggerRef.current === 0) {
              lastSpinTriggerRef.current = data.state.spinTrigger;
            } else if (data.state.spinTrigger > lastSpinTriggerRef.current) {
              lastSpinTriggerRef.current = data.state.spinTrigger;
              const localChannel = new BroadcastChannel("sprint7_wheel_channel");
              localChannel.postMessage({ type: "SPIN" });
              localChannel.close();
            }
          }
        }
      } catch {}
    };
    pollWheelState();
    const pollInterval = setInterval(pollWheelState, 750);

    return () => {
      wheelChannel.close();
      window.removeEventListener("storage", onStorage);
      clearInterval(pollInterval);
    };
  }, []);

  const updateAngle = (val: number) => {
    angleRef.current = val;
    setAngle(val);
  };

  useEffect(() => {
    let alive = true;
    const loadChatUsers = async () => {
      await reloadUsers(false);
      if (!alive) return;
    };
    loadChatUsers();
    const refresh = window.setInterval(loadChatUsers, 10000);
    return () => {
      alive = false;
      window.clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel("sprint7_wheel_channel");
    const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);

    channel.onmessage = (e) => {
      if (e.data.type === "SPIN" && !isSpinningRef.current && users.length > 0) {
        isSpinningRef.current = true;
        setWinner(null);

        const currentUsers = usersRef.current.length > 0 ? usersRef.current : fallbackUsers;
        const winnerIdx = Math.floor(Math.random() * currentUsers.length);
        const segAngle = 360 / currentUsers.length;
        const centerDeg = (winnerIdx + 0.5) * segAngle;
        
        // Rotate 5-8 full circles before landing
        const extraSpins = 5 + Math.floor(Math.random() * 4);
        const targetAngle = 360 * extraSpins + (360 - centerDeg);
        
        const startAngle = angleRef.current % 360;
        const distance = targetAngle - startAngle;
        
        const duration = 6000 + Math.random() * 2000; // 6 to 8 seconds
        const startTime = performance.now();
        
        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          const currentAngle = startAngle + distance * easeOutQuart(progress);
          updateAngle(currentAngle);
          
          if (progress < 1) {
            window.requestAnimationFrame(animate);
          } else {
            isSpinningRef.current = false;
            updateAngle(currentAngle % 360);
            setWinner(currentUsers[winnerIdx]);
            void reloadUsers(true);
          }
        };
        window.requestAnimationFrame(animate);
      }
    };
    return () => channel.close();
  }, [users]);

  const segAngle = 360 / users.length;
  const R = 240; // outer radius
  const CX = 260;
  const CY = 260;
  const CENTER_R = 80; // doro circle radius

  // Build SVG arc path for each segment
  const describeSegment = (startDeg: number, endDeg: number, outerR: number, innerR: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const x1 = CX + outerR * Math.sin(toRad(startDeg));
    const y1 = CY - outerR * Math.cos(toRad(startDeg));
    const x2 = CX + outerR * Math.sin(toRad(endDeg));
    const y2 = CY - outerR * Math.cos(toRad(endDeg));
    const ix1 = CX + innerR * Math.sin(toRad(startDeg));
    const iy1 = CY - innerR * Math.cos(toRad(startDeg));
    const ix2 = CX + innerR * Math.sin(toRad(endDeg));
    const iy2 = CY - innerR * Math.cos(toRad(endDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${ix1} ${iy1} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
  };

  // Label position midway through segment at 70% of radius
  const labelPos = (midDeg: number, r: number) => ({
    x: CX + r * Math.sin((midDeg * Math.PI) / 180),
    y: CY - r * Math.cos((midDeg * Math.PI) / 180),
  });

  return (
    <div className="w-screen h-screen grid place-items-center bg-slate-950 overflow-hidden" style={obsFontStyle}>
      <button
        onClick={() => void handleReload()}
        className="fixed top-4 right-4 z-[60] rounded-full border border-cyan-400/50 bg-slate-900/95 px-4 py-2 text-xs font-bold text-cyan-200 shadow-lg shadow-cyan-500/20 hover:bg-slate-800 transition-colors pointer-events-auto"
        disabled={isReloading}
        type="button"
      >
        {isReloading ? "Loading..." : "Reload"}
      </button>
      {/* Outer glow ring behind wheel */}
      <div
        className="absolute"
        style={{
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div className="relative" style={{ width: 520, height: 520 }}>
        {/* Spinning wheel */}
        <svg
          width="520"
          height="520"
          viewBox="0 0 520 520"
          style={{ transform: `rotate(${angle}deg)`, position: "absolute", top: 0, left: 0 }}
        >
          {/* Outer decorative ring */}
          <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#a855f7" strokeWidth="3" opacity="0.4" />
          <circle cx={CX} cy={CY} r={R + 16} fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="8 6" opacity="0.25" />

          {/* Segments */}
          {users.map((name, idx) => {
            const startDeg = idx * segAngle;
            const endDeg = startDeg + segAngle;
            const mid = startDeg + segAngle / 2;
            const color = DORO_WHEEL_COLORS[idx % DORO_WHEEL_COLORS.length];
            const lp = labelPos(mid, CENTER_R + (R - CENTER_R) * 0.58);
            const rotLabel = mid > 90 && mid < 270 ? mid + 180 : mid;
            return (
              <g key={name}>
                <path
                  d={describeSegment(startDeg, endDeg, R, CENTER_R + 6)}
                  fill={color}
                  opacity="0.88"
                  stroke="#020617"
                  strokeWidth="1.5"
                />
                {/* Subtle shine */}
                <path
                  d={describeSegment(startDeg, endDeg, R - 2, CENTER_R + 28)}
                  fill="white"
                  opacity="0.045"
                />
                {/* Segment label */}
                <text
                  x={lp.x}
                  y={lp.y}
                  fill="white"
                  fontSize={users.length > 12 ? "11" : "14"}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${rotLabel} ${lp.x} ${lp.y})`}
                  style={{ textShadow: "0 1px 4px #000" }}
                >
                  {name.length > 12 ? name.slice(0, 11) + "â€¦" : name}
                </text>
                {/* Divider lines */}
                <line
                  x1={CX + (CENTER_R + 8) * Math.sin((startDeg * Math.PI) / 180)}
                  y1={CY - (CENTER_R + 8) * Math.cos((startDeg * Math.PI) / 180)}
                  x2={CX + R * Math.sin((startDeg * Math.PI) / 180)}
                  y2={CY - R * Math.cos((startDeg * Math.PI) / 180)}
                  stroke="#020617"
                  strokeWidth="2"
                  opacity="0.6"
                />
              </g>
            );
          })}

          {/* Center backdrop (spins with wheel) */}
          <circle cx={CX} cy={CY} r={CENTER_R + 6} fill="#020617" />
        </svg>

        {/* Counter-rotating center â€” stays upright at all times */}
        <div
          className="absolute cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          onClick={() => {
            const channel = new BroadcastChannel("sprint7_wheel_channel");
            channel.postMessage({ type: "SPIN" });
            channel.close();
          }}
          style={{
            width: (CENTER_R + 6) * 2,
            height: (CENTER_R + 6) * 2,
            top: CY - CENTER_R - 6,
            left: CX - CENTER_R - 6,
            transform: `rotate(${-angle}deg)`,
            borderRadius: "50%",
            overflow: "hidden",
            border: "4px solid #22d3ee",
            boxShadow: "0 0 24px rgba(34,211,238,0.5), 0 0 8px rgba(168,85,247,0.4)",
            background: "#020617",
            zIndex: 30,
          }}
        >
          <img
            src="/doro.png"
            alt="Doro"
            className="arwass-logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Pointer Triangle */}
        <div
          className="absolute"
          style={{
            top: -12,
            left: 260 - 14,
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "28px solid #f472b6",
            filter: "drop-shadow(0 0 6px rgba(244,114,182,0.8))",
            zIndex: 10,
          }}
        />

        {/* Winner Announcement Overlay */}
        {winner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center animate-in zoom-in fade-in duration-500" style={{ zIndex: 50 }}>
            <div className="absolute inset-0 bg-slate-950/60 rounded-full backdrop-blur-sm" />
            <div className="relative flex flex-col items-center bg-indigo-900/90 border-2 border-indigo-400 px-8 py-6 rounded-3xl shadow-2xl shadow-indigo-500/50 transform scale-110">
              <span className="text-indigo-300 font-bold text-sm uppercase tracking-widest mb-1">Winner</span>
              <span className="text-white font-black text-4xl truncate max-w-[400px]">{winner}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkWidget({ widgetState: initialWidgetState }: { widgetState: Sprint7WidgetState }) {
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(initialWidgetState?.socialLinks || {});

  useEffect(() => {
    if (initialWidgetState?.socialLinks) {
        setSocialLinks(initialWidgetState.socialLinks);
    }
  }, [initialWidgetState]);

  useEffect(() => {
    // Load initial state if not provided
    if (!initialWidgetState) {
        const persisted = loadPersistedSprint7WidgetState();
        if (persisted?.socialLinks) {
          setSocialLinks(persisted.socialLinks);
        } else {
          setSocialLinks({
            youtube: "https://youtube.com",
            tiktok: "https://tiktok.com",
            discord: "https://discord.com",
          });
        }
    }

    // Sync via server polling for remote controllers or isolated browser profiles
    const pollLinks = async () => {
      try {
        const res = await fetch("/api/sprint7/state-sync");
        const data = await res.json();
        if (data?.state?.socialLinks) {
          setSocialLinks(data.state.socialLinks);
        }
      } catch {}
    };
    pollLinks();
    const interval = setInterval(pollLinks, 2000);
    return () => clearInterval(interval);
  }, []);

  const links = Object.entries(socialLinks);
  const trackLinks = links.length > 0 ? [...links, ...links, ...links, ...links] : [["empty", "Add links in dashboard"]];

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent text-slate-100" style={obsFontStyle}>
      <div className="flex h-full w-full items-center justify-center px-4">
        <div className="w-[96vw] max-w-[1800px] overflow-hidden rounded-[1.25rem] border border-cyan-500/20 bg-black/40 backdrop-blur-md px-3 py-2">
          <div className="marquee-track marquee-track-slow items-center py-1">
            {trackLinks.map(([key, value], index) => (
              <a
                key={`${key}-${index}`}
                href={key === "empty" ? "#" : value}
                target={key === "empty" ? undefined : "_blank"}
                rel={key === "empty" ? undefined : "noreferrer"}
                className="mx-4 inline-flex h-[54px] min-w-[200px] items-center justify-between rounded-full border border-cyan-900/60 bg-[#0b1023]/85 px-5 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] group transition-all hover:border-cyan-400/50"
                onClick={(e) => {
                  if (key === "empty") e.preventDefault();
                }}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 flex-shrink-0 mr-3 border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                    <img src="/doro.png" alt="Arwass" className="arwass-logo" style={{ objectFit: "contain" }} />
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-[10px] font-black text-cyan-500/70 uppercase tracking-tighter">{key}</span>
                    <span className="truncate text-[14px] font-bold tracking-tight text-cyan-100 group-hover:text-white transition-colors">{value}</span>
                </div>
                <div className="ml-3 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                    <span className="text-[10px] font-black text-cyan-400">FOLLOW</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ObsTodoWidget({ widgetState }: { widgetState: Sprint7WidgetState }) {
  const [todos, setTodos] = useState<{ id: string; text: string; completed: boolean }[]>(widgetState?.todoList || []);

  useEffect(() => {
    if (widgetState?.todoList) {
        setTodos(widgetState.todoList);
    }
  }, [widgetState]);

  useEffect(() => {
    const sync = () => {
      const persisted = loadPersistedSprint7WidgetState();
      if (persisted?.todoList) setTodos(persisted.todoList);
    };
    sync();
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/sprint7/state-sync");
        const data = await res.json();
        if (data?.state?.todoList) setTodos(data.state.todoList);
      } catch {}
    }, 2000);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent p-8 flex flex-col items-start justify-start" style={obsFontStyle}>
      <div className="bg-black/60 backdrop-blur-md border-l-4 border-emerald-500 p-6 rounded-r-2xl shadow-2xl min-w-[320px] max-w-[600px] animate-in slide-in-from-left duration-500">
        <h2 className="text-emerald-400 text-xl font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
          <div className="w-2 h-6 bg-emerald-500 rounded-full" />
          Todo List
        </h2>
        <div className="space-y-3">
          {todos.length === 0 && (
            <p className="text-slate-400 italic text-sm">No tasks added.</p>
          )}
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-3 transition-all duration-300">
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${todo.completed ? "border-emerald-500 bg-emerald-500/20" : "border-emerald-500/50"}`}>
                {todo.completed && <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />}
              </div>
              <span className={`text-white text-lg font-bold tracking-wide drop-shadow-md transition-all ${todo.completed ? "line-through opacity-50" : "opacity-100"}`}>{todo.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ObsVoteWidget({ widgetState }: { widgetState: Sprint7WidgetState }) {
  const vote = useVoteState();
  const keywordA = widgetState.voteKeywordA || "A";
  const keywordB = widgetState.voteKeywordB || "B";

  return (
    <div className="w-screen h-screen bg-transparent p-12 flex items-end justify-center" style={obsFontStyle}>
      <div className="w-full max-w-4xl bg-black/60 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] shadow-[0_24px_48px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom-12 duration-700">
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
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                style={{ width: `${vote.aPct}%` }}
              />
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
              <div 
                className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(217,70,239,0.4)]"
                style={{ width: `${vote.bPct}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.4em] animate-pulse">
            Type <span className="text-white">{keywordA}</span> or <span className="text-white">{keywordB}</span> in chat to vote
          </p>
        </div>
      </div>
    </div>
  );
}

function useThemeMode() {
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("yt_overlay_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.themeMode) setThemeMode(parsed.themeMode);
      }
    } catch {}

    const poll = async () => {
      try {
        const res = await fetch("/api/youtube/settings-sync");
        const data = await res.json();
        if (data?.settings?.themeMode) {
          setThemeMode(data.settings.themeMode);
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, []);
  return themeMode;
}

function CustomCssInjector({ css }: { css?: string }) {
  if (!css || !isLikelySafeCss(css)) return null;
  return <style id="custom-css-injector" dangerouslySetInnerHTML={{ __html: css }} />;
}

export default function Sprint7Widgets() {
  const route = getRoute();
  const themeMode = useThemeMode();
  const [state, setState] = useState<Sprint7WidgetState>(getSprint7State());
  const lastManualSyncRef = useRef<number>(0);

  const syncState = (next: Sprint7WidgetState) => {
    lastManualSyncRef.current = Date.now();
    (window as any).__SPRINT7_STATE__ = next;
    savePersistedSprint7WidgetState(next);
    setState(next);

    // Sync to current origin's backend cache
    fetch("/api/sprint7/state-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: next }),
    }).catch(() => {});

    // Sync a copy to localhost:3000 if running on Vercel
    if (!window.location.origin.includes("localhost") && !window.location.origin.includes("127.0.0.1")) {
      fetch("http://localhost:3000/api/sprint7/state-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next }),
      }).catch(() => {});
    }
  };

  useEffect(() => {
    // Sync initial state from localStorage to server on mount
    if (route === "dashboard") {
      const initialState = getSprint7State();
      fetch("/api/sprint7/state-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: initialState }),
      }).catch(() => {});
    }
  }, [route]);

  useEffect(() => {
    // Poll server state for dashboard to stay in sync with remote changes
    const pollAllState = async () => {
      // Ignore polling if we just synced manually (within last 3 seconds)
      if (Date.now() - lastManualSyncRef.current < 3000) return;

      try {
        const res = await fetch("/api/sprint7/state-sync");
        const data = await res.json();
        if (data?.state) {
          // Deep compare simple JSON to avoid unnecessary re-renders
          const currentStr = JSON.stringify(state);
          const nextStr = JSON.stringify(data.state);
          if (currentStr !== nextStr) {
            setState(data.state);
            (window as any).__SPRINT7_STATE__ = data.state;
          }
        }

        // Auto-resync keywords to backend if they were lost (e.g. server restart)
        // We only do this in dashboard mode to avoid multiple widgets fighting
        if (state.voteKeywordA || state.voteKeywordB) {
            const voteRes = await fetch("/api/interactivity/votes");
            const voteData = await voteRes.json();
            if (voteData?.state && (voteData.state.keywordA !== state.voteKeywordA || voteData.state.keywordB !== state.voteKeywordB)) {
                fetch("/api/interactivity/vote-keywords", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ keywordA: state.voteKeywordA, keywordB: state.voteKeywordB }),
                });
            }
        }
      } catch {}
    };

    if (route === "dashboard") {
      const interval = setInterval(pollAllState, 2000);
      return () => clearInterval(interval);
    }
  }, [route, state]);

  const isLight = themeMode === "light";

  return (
    <div className={`w-full h-full ${isLight ? "theme-light" : ""}`} style={obsFontStyle}>
      <CustomCssInjector css={state.customCSS} />
      {route === "dashboard" ? (
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
        <ObsVoteWidget widgetState={state} />
      ) : (
        <VoteWidget widgetState={state} syncState={syncState} isLight={isLight} />
      )}
    </div>
  );
}

