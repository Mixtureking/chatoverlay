import React, { useEffect, useMemo, useState } from "react";
import { createSprint7WidgetState, isLikelySafeCss, parseSprint7FullState, serializeSprint7FullState, type Sprint7WidgetState } from "./sprint7State";

type VoteState = { A: number; B: number; total: number };
type WidgetRoute = "obs-chat" | "obs-timer" | "obs-wheel";

const sampleComments = [
  "Clip này đỉnh quá!",
  "Bạn đẹp thật",
  "Roll đi anh ơi",
  "Vote A nào",
  "Cyberpunk vibe cực mạnh",
  "Chat đang nóng lên rồi",
];

const getRoute = (): WidgetRoute => {
  if (typeof window === "undefined") return "obs-chat";
  const path = window.location.pathname;
  if (path.includes("obs-timer")) return "obs-timer";
  if (path.includes("obs-wheel")) return "obs-wheel";
  return "obs-chat";
};

function useVoteState() {
  const [state, setState] = useState<VoteState>({ A: 0, B: 0, total: 0 });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/interactivity/votes");
        const data = await res.json();
        if (!alive) return;
        setState(data?.state || { A: 0, B: 0, total: 0 });
      } catch {
        if (alive) setState({ A: 0, B: 0, total: 0 });
      }
    };
    load();
    const timer = window.setInterval(load, 900);
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
    timerDoneText: "Thời gian đã kết thúc",
    wheelUsers: ["Doro", "An", "Bình", "Chi", "Dung", "Em"],
  };
}

function getSprint7State(): Sprint7WidgetState {
  const fallback = getFallbackState();
  const raw = (window as any).__SPRINT7_STATE__ as Partial<Sprint7WidgetState> | undefined;
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

function LiveCssInjector({ customCSS }: { customCSS: string }) {
  useEffect(() => {
    const styleId = "custom-css-injector";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    try {
      const css = customCSS || "";
      if (!css.trim()) {
        styleTag.textContent = "";
        return;
      }
      styleTag.textContent = isLikelySafeCss(css) ? css : "";
    } catch {
      if (styleTag) styleTag.textContent = "";
    }
  }, [customCSS]);

  return null;
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

function VoteWidget({ widgetState, syncState, isLight }: VoteWidgetProps) {
  const vote = useVoteState();
  const [roulette, setRoulette] = useState<string[]>(sampleComments);
  const [todoDrafts, setTodoDrafts] = useState<Record<string, string>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [cssDraft, setCssDraft] = useState("");
  const [timerDraftSeconds, setTimerDraftSeconds] = useState("300");
  const [timerDraftDoneText, setTimerDraftDoneText] = useState("Thời gian đã kết thúc");
  const [wheelDrafts, setWheelDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    setCssDraft(widgetState.customCSS || "");
    setTimerDraftSeconds(String(widgetState.timerSeconds ?? 300));
    setTimerDraftDoneText(widgetState.timerDoneText || "Thời gian đã kết thúc");
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
    const next = { ...widgetState };
    next.socialLinks = { ...next.socialLinks, [key]: linkDrafts[key] ?? next.socialLinks[key] };
    syncState(next);
  };
  const deleteLink = (key: string) => {
    const next = { ...widgetState };
    const { [key]: _removed, ...rest } = next.socialLinks;
    next.socialLinks = rest;
    syncState(next);
  };
  const addSocialLink = () => {
    const next = { ...widgetState };
    const count = Object.keys(next.socialLinks).length + 1;
    next.socialLinks = { ...next.socialLinks, [`link${count}`]: `https://example.com/${count}` };
    syncState(next);
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
    next.timerDoneText = timerDraftDoneText || "Thời gian đã kết thúc";
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
    <div className="w-full h-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="h-full overflow-y-auto custom-scrollbar px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
          
          {/* Card: Live Vote */}
          <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/50 p-6 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-cyan-600" : "text-cyan-300"}`}>
              Bỏ phiếu trực tiếp
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm font-bold text-slate-205">
              <div>A: {vote.A}</div>
              <div>B: {vote.B}</div>
            </div>
            <div className="mt-4 h-4 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${vote.aPct}%` }} />
            </div>
            <div className={`mt-2 text-xs font-semibold ${isLight ? "text-cyan-700" : "text-cyan-200"}`}>
              {vote.aPct}% / {vote.bPct}%
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
              Danh sách việc cần làm
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={addTodo} className={getBtnClass("emerald", isLight)}>Thêm</button>
              <button onClick={toggleFirstTodo} className={getBtnClass("cyan", isLight)}>Đổi trạng thái đầu</button>
              <button onClick={clearTodos} className={getBtnClass("rose", isLight)}>Xóa hết</button>
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
                    <button onClick={() => deleteTodo(item.id)} className={getBtnClass("rose", isLight)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Social Links Marquee */}
          <div className="rounded-3xl border border-yellow-500/30 bg-slate-900/50 p-4 overflow-hidden">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-yellow-600" : "text-yellow-300"}`}>
              Thanh liên kết mạng xã hội
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={addSocialLink} className={getBtnClass("yellow", isLight)}>Thêm liên kết</button>
              <button onClick={resetSocialLinks} className={getBtnClass("slate", isLight)}>Khôi phục</button>
            </div>
            <div className="overflow-hidden whitespace-nowrap">
              <div className="marquee-track items-center">
                {Object.entries(widgetState.socialLinks).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800">
                    <input 
                      value={linkDrafts[key] ?? value} 
                      onChange={(e) => updateLinkText(key, e.target.value)} 
                      onBlur={() => saveLinkText(key)} 
                      className="bg-transparent outline-none text-sm min-w-[180px] text-slate-100 placeholder-slate-500" 
                    />
                    <button onClick={() => deleteLink(key)} className={getBtnClass("rose", isLight)}>Xóa</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: JSON state files */}
          <div className="rounded-3xl border border-sky-500/30 bg-slate-900/50 p-5">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-sky-600" : "text-sky-300"}`}>
              Tệp trạng thái JSON
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportState} className={getBtnClass("sky", isLight)}>Xuất</button>
              <button onClick={copyState} className={getBtnClass("indigo", isLight)}>Sao chép</button>
              <label className={getBtnClass("slate", isLight)}>Nhập
                <input type="file" accept=".json" className="hidden" onChange={(e) => { void importState(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
              </label>
              <button onClick={resetAllState} className={getBtnClass("rose", isLight)}>Đặt lại toàn bộ</button>
            </div>
          </div>

          {/* Card: Custom CSS */}
          <div className="rounded-3xl border border-indigo-500/30 bg-slate-900/50 p-5">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-indigo-600" : "text-indigo-300"}`}>
              CSS tùy chỉnh
            </div>
            <textarea
              value={cssDraft}
              onChange={(e) => setCssDraft(e.target.value)}
              onBlur={saveCssDraft}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono outline-none resize-y text-slate-100 focus:border-indigo-500"
              placeholder="Nhập CSS ở đây..."
            />
            <div className="mt-2 text-[11px] text-slate-400">CSS sẽ được inject nếu dấu ngoặc cân bằng. Sai cú pháp sẽ bị bỏ qua.</div>
          </div>

          {/* Card: Timer / Wheel */}
          <div className="rounded-3xl border border-amber-500/30 bg-slate-900/50 p-5">
            <div className={`text-xs uppercase tracking-[0.35em] mb-3 font-bold ${isLight ? "text-amber-600" : "text-amber-300"}`}>
              Bộ đếm / Vòng quay
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  value={timerDraftSeconds} 
                  onChange={(e) => setTimerDraftSeconds(e.target.value)} 
                  onBlur={saveTimerDraft} 
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-100 focus:border-indigo-500" 
                  placeholder="Số giây đếm ngược" 
                />
                <input 
                  value={timerDraftDoneText} 
                  onChange={(e) => setTimerDraftDoneText(e.target.value)} 
                  onBlur={saveTimerDraft} 
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-100 focus:border-indigo-500" 
                  placeholder="Thông báo khi kết thúc" 
                />
              </div>
              <div className="text-[11px] text-slate-400">Sửa nhanh thời gian đếm và nội dung kết thúc, sẽ lưu khi rời ô nhập.</div>
              <div className="space-y-2">
                {(widgetState.wheelUsers || []).map((user, index) => (
                  <input
                    key={`${index}-${user}`}
                    value={wheelDrafts[index] ?? user}
                    onChange={(e) => updateWheelDraft(index, e.target.value)}
                    onBlur={saveWheelDrafts}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-100 focus:border-indigo-500"
                    placeholder={`Người dùng vòng quay ${index + 1}`}
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

function TimerWidget() {
  const widgetState = useMemo(() => getSprint7State(), []);
  const [seconds, setSeconds] = useState(widgetState.timerSeconds || 5 * 60);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const done = seconds === 0;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="w-screen h-screen grid place-items-center bg-slate-950 text-slate-100 overflow-hidden">
      <div className="text-center animate-in fade-in duration-300">
        <div className="text-[10vw] font-black tracking-[0.2em]">{done ? widgetState.timerDoneText : `${mins}:${secs}`}</div>
        <div className="text-cyan-400 uppercase tracking-[0.5em] mt-4 font-bold">{done ? widgetState.timerDoneText : "Bộ đếm thời gian"}</div>
      </div>
    </div>
  );
}

const DORO_WHEEL_COLORS = [
  "#7c3aed", "#0e7490", "#be185d", "#15803d", "#c2410c",
  "#1d4ed8", "#a21caf", "#0f766e", "#b45309", "#1e40af",
];

function WheelWidget() {
  const widgetState = useMemo(() => getSprint7State(), []);
  const [users, setUsers] = useState<string[]>(
    widgetState.wheelUsers && widgetState.wheelUsers.length > 0
      ? widgetState.wheelUsers
      : getFallbackState().wheelUsers,
  );
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let alive = true;
    const loadChatUsers = async () => {
      try {
        const syncRes = await fetch("/api/youtube/settings-sync");
        const syncData = await syncRes.json().catch(() => ({}));
        const settings = syncData?.settings;
        const liveChatId = settings?.activeLiveChatId;
        const apiKey = settings?.apiKey;
        if (!liveChatId || !apiKey) return;
        const msgRes = await fetch(
          `/api/youtube/messages?liveChatId=${encodeURIComponent(liveChatId)}&apiKey=${encodeURIComponent(apiKey)}`,
        );
        const msgData = await msgRes.json().catch(() => ({}));
        const names = Array.isArray(msgData?.messages)
          ? (Array.from(
              new Set(
                msgData.messages
                  .map((m: any) => String(m?.authorName || "").trim())
                  .filter(Boolean),
              ),
            ) as string[]).slice(0, 24)
          : [];
        if (alive && names.length > 0) setUsers(names);
      } catch {}
    };
    loadChatUsers();
    const refresh = window.setInterval(loadChatUsers, 10000);
    let raf = 0;
    const loop = () => {
      setAngle((prev) => (prev + 1.5) % 360);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => {
      alive = false;
      window.clearInterval(refresh);
      window.cancelAnimationFrame(raf);
    };
  }, []);

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
    <div className="w-screen h-screen grid place-items-center bg-slate-950 overflow-hidden">
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
                  {name.length > 12 ? name.slice(0, 11) + "…" : name}
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

        {/* Counter-rotating center — stays upright at all times */}
        <div
          className="absolute"
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

        {/* Pointer arrow at top */}
        <div
          className="absolute"
          style={{
            top: -8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "28px solid #f472b6",
            filter: "drop-shadow(0 0 6px rgba(244,114,182,0.8))",
            zIndex: 10,
          }}
        />
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

export default function Sprint7Widgets() {
  const route = getRoute();
  const themeMode = useThemeMode();
  const [state, setState] = useState<Sprint7WidgetState>(getSprint7State());

  const syncState = (next: Sprint7WidgetState) => {
    (window as any).__SPRINT7_STATE__ = next;
    setState(next);
  };

  const isLight = themeMode === "light";

  return (
    <div className={`w-full h-full ${isLight ? "theme-light" : ""}`}>
      <LiveCssInjector customCSS={state.customCSS} />
      {route === "obs-timer" ? (
        <TimerWidget />
      ) : route === "obs-wheel" ? (
        <WheelWidget />
      ) : (
        <VoteWidget widgetState={state} syncState={syncState} isLight={isLight} />
      )}
    </div>
  );
}
