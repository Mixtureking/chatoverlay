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

function LiveCssInjector() {
  const customCSS = useMemo(() => {
    const raw = (window as any).__SPRINT7_STATE__ as Partial<Sprint7WidgetState> | undefined;
    return typeof raw?.customCSS === "string" ? raw.customCSS : "";
  }, []);

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

function VoteWidget() {
  const vote = useVoteState();
  const [roulette, setRoulette] = useState<string[]>(sampleComments);
  const [refreshTick, setRefreshTick] = useState(0);
  const widgetState = useMemo(() => getSprint7State(), [refreshTick]);
  const [todoDrafts, setTodoDrafts] = useState<Record<string, string>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [cssDraft, setCssDraft] = useState("");
  const [timerDraftSeconds, setTimerDraftSeconds] = useState("300");
  const [timerDraftDoneText, setTimerDraftDoneText] = useState("Thời gian đã kết thúc");
  const [wheelDrafts, setWheelDrafts] = useState<Record<number, string>>({});

  const syncState = (next: Sprint7WidgetState) => {
    (window as any).__SPRINT7_STATE__ = next;
    setRefreshTick((v) => v + 1);
  };

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
  }, [widgetState.customCSS]);

  const addTodo = () => {
    const next = getSprint7State();
    next.todoList = next.todoList.concat({ id: `todo-${Date.now()}`, text: `Nhiệm vụ ${next.todoList.length + 1}`, completed: false });
    syncState(next);
  };
  const toggleFirstTodo = () => {
    const next = getSprint7State();
    if (next.todoList.length === 0) return;
    next.todoList = next.todoList.map((item, index) => (index === 0 ? { ...item, completed: !item.completed } : item));
    syncState(next);
  };
  const clearTodos = () => {
    const next = getSprint7State();
    next.todoList = [];
    syncState(next);
  };
  const updateTodoText = (id: string, text: string) => setTodoDrafts((prev) => ({ ...prev, [id]: text }));
  const saveTodoText = (id: string) => {
    const next = getSprint7State();
    next.todoList = next.todoList.map((item) => (item.id === id ? { ...item, text: todoDrafts[id] ?? item.text } : item));
    syncState(next);
  };
  const deleteTodo = (id: string) => {
    const next = getSprint7State();
    next.todoList = next.todoList.filter((item) => item.id !== id);
    syncState(next);
  };

  const updateLinkText = (key: string, value: string) => setLinkDrafts((prev) => ({ ...prev, [key]: value }));
  const saveLinkText = (key: string) => {
    const next = getSprint7State();
    next.socialLinks = { ...next.socialLinks, [key]: linkDrafts[key] ?? next.socialLinks[key] };
    syncState(next);
  };
  const deleteLink = (key: string) => {
    const next = getSprint7State();
    const { [key]: _removed, ...rest } = next.socialLinks;
    next.socialLinks = rest;
    syncState(next);
  };
  const addSocialLink = () => {
    const next = getSprint7State();
    const count = Object.keys(next.socialLinks).length + 1;
    next.socialLinks = { ...next.socialLinks, [`link${count}`]: `https://example.com/${count}` };
    syncState(next);
  };
  const resetSocialLinks = () => syncState({ ...getFallbackState() });
  const saveCssDraft = () => {
    const next = getSprint7State();
    next.customCSS = cssDraft;
    syncState(next);
  };
  const saveTimerDraft = () => {
    const next = getSprint7State();
    const parsedSeconds = Number.parseInt(timerDraftSeconds, 10);
    next.timerSeconds = Number.isFinite(parsedSeconds) && parsedSeconds >= 0 ? parsedSeconds : 300;
    next.timerDoneText = timerDraftDoneText || "Thời gian đã kết thúc";
    syncState(next);
  };
  const updateWheelDraft = (index: number, value: string) => setWheelDrafts((prev) => ({ ...prev, [index]: value }));
  const saveWheelDrafts = () => {
    const next = getSprint7State();
    const items = Object.entries(wheelDrafts).sort(([a], [b]) => Number(a) - Number(b)).map(([, value]) => value.trim()).filter(Boolean);
    next.wheelUsers = items.length > 0 ? items : getFallbackState().wheelUsers;
    syncState(next);
  };
  const resetAllState = () => syncState(getFallbackState());
  const exportState = () => {
    const current = getSprint7State();
    const payload = serializeSprint7FullState({ todoList: current.todoList, customCSS: current.customCSS, socialLinks: current.socialLinks });
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
      const current = getSprint7State();
      await navigator.clipboard.writeText(serializeSprint7FullState({ todoList: current.todoList, customCSS: current.customCSS, socialLinks: current.socialLinks }));
    } catch {}
  };
  const importState = async (file: File | null) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = parseSprint7FullState(raw);
      syncState(createSprint7WidgetState({ ...getSprint7State(), todoList: parsed.todoList, customCSS: parsed.customCSS, socialLinks: parsed.socialLinks }));
    } catch {}
  };

  useEffect(() => {
    const timer = window.setInterval(() => setRoulette((prev) => prev.slice(1).concat(prev[0])), 2500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full overflow-hidden bg-[#050816] text-white">
      <div className="h-full overflow-y-auto custom-scrollbar px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
          <div className="rounded-3xl border border-cyan-400/30 bg-white/5 p-6 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300 mb-3">Bỏ phiếu trực tiếp</div>
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold"><div>A: {vote.A}</div><div>B: {vote.B}</div></div>
            <div className="mt-4 h-4 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${vote.aPct}%` }} /></div>
            <div className="mt-2 text-xs text-cyan-200">{vote.aPct}% / {vote.bPct}%</div>
          </div>

          <div className="rounded-3xl border border-fuchsia-400/30 bg-black/30 p-6">
            <div className="cyberpunk-glitch rounded-2xl border border-fuchsia-400/80 p-4 text-xl font-bold text-fuchsia-200">{roulette[0]}</div>
            <div className="mt-4 space-y-2 text-sm text-white/70">{roulette.slice(1, 4).map((item) => <div key={item}>{item}</div>)}</div>
          </div>

          <div className="rounded-3xl border border-emerald-400/30 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-300 mb-3">Danh sách việc cần làm</div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={addTodo} className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30">Thêm</button>
              <button onClick={toggleFirstTodo} className="text-[11px] px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30">Đổi trạng thái đầu</button>
              <button onClick={clearTodos} className="text-[11px] px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30">Xóa hết</button>
            </div>
            <div className="space-y-2">
              {widgetState.todoList.map((item) => (
                <div key={item.id} className={`rounded-xl px-3 py-2 bg-black/20 border border-white/10 space-y-2 ${item.completed ? "line-through opacity-60" : ""}`}>
                  <input value={todoDrafts[item.id] ?? item.text} onChange={(e) => updateTodoText(item.id, e.target.value)} onBlur={() => saveTodoText(item.id)} className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-sm outline-none" />
                  <button onClick={() => deleteTodo(item.id)} className="text-[10px] px-2 py-1 rounded-full bg-rose-500/20 border border-rose-400/30">Xóa</button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-400/30 bg-black/30 p-4 overflow-hidden">
            <div className="text-xs uppercase tracking-[0.35em] text-yellow-300 mb-3">Thanh liên kết mạng xã hội</div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={addSocialLink} className="text-[11px] px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-400/30">Thêm liên kết</button>
              <button onClick={resetSocialLinks} className="text-[11px] px-3 py-1 rounded-full bg-slate-500/20 border border-slate-400/30">Khôi phục</button>
            </div>
            <div className="overflow-hidden whitespace-nowrap">
              <div className="marquee-track items-center">
                {Object.entries(widgetState.socialLinks).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                    <input value={linkDrafts[key] ?? value} onChange={(e) => updateLinkText(key, e.target.value)} onBlur={() => saveLinkText(key)} className="bg-transparent outline-none text-sm min-w-[180px]" />
                    <button onClick={() => deleteLink(key)} className="text-[10px] px-2 py-1 rounded-full bg-rose-500/20 border border-rose-400/30">Xóa</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-sky-400/30 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.35em] text-sky-300 mb-3">Tệp trạng thái JSON</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportState} className="text-[11px] px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30">Xuất</button>
              <button onClick={copyState} className="text-[11px] px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30">Sao chép</button>
              <label className="text-[11px] px-3 py-1 rounded-full bg-slate-500/20 border border-slate-400/30 cursor-pointer">Nhập
                <input type="file" accept=".json" className="hidden" onChange={(e) => { void importState(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
              </label>
              <button onClick={resetAllState} className="text-[11px] px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30">Đặt lại toàn bộ</button>
            </div>
          </div>

          <div className="rounded-3xl border border-indigo-400/30 bg-black/30 p-5">
            <div className="text-xs uppercase tracking-[0.35em] text-indigo-300 mb-3">CSS tùy chỉnh</div>
            <textarea
              value={cssDraft}
              onChange={(e) => setCssDraft(e.target.value)}
              onBlur={saveCssDraft}
              rows={6}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono outline-none resize-y"
              placeholder="Nhập CSS ở đây..."
            />
            <div className="mt-2 text-[11px] text-slate-400">CSS sẽ được inject nếu dấu ngoặc cân bằng. Sai cú pháp sẽ bị bỏ qua.</div>
          </div>

          <div className="rounded-3xl border border-amber-400/30 bg-black/30 p-5">
            <div className="text-xs uppercase tracking-[0.35em] text-amber-300 mb-3">Bộ đếm / Vòng quay</div>
            <div className="grid gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={timerDraftSeconds} onChange={(e) => setTimerDraftSeconds(e.target.value)} onBlur={saveTimerDraft} className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Số giây đếm ngược" />
                <input value={timerDraftDoneText} onChange={(e) => setTimerDraftDoneText(e.target.value)} onBlur={saveTimerDraft} className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Thông báo khi kết thúc" />
              </div>
              <div className="text-[11px] text-slate-400">Sửa nhanh thời gian đếm và nội dung kết thúc, sẽ lưu khi rời ô nhập.</div>
              <div className="space-y-2">
                {(widgetState.wheelUsers || []).map((user, index) => (
                  <input
                    key={`${index}-${user}`}
                    value={wheelDrafts[index] ?? user}
                    onChange={(e) => updateWheelDraft(index, e.target.value)}
                    onBlur={saveWheelDrafts}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none"
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
    <div className="w-screen h-screen grid place-items-center bg-[#050816] text-white overflow-hidden">
      <div className="text-center">
        <div className="text-[10vw] font-black tracking-[0.2em]">{done ? widgetState.timerDoneText : `${mins}:${secs}`}</div>
        <div className="text-cyan-300 uppercase tracking-[0.5em] mt-4">{done ? widgetState.timerDoneText : "Bộ đếm thời gian"}</div>
      </div>
    </div>
  );
}

function WheelWidget() {
  const widgetState = useMemo(() => getSprint7State(), []);
  const [users, setUsers] = useState<string[]>(widgetState.wheelUsers && widgetState.wheelUsers.length > 0 ? widgetState.wheelUsers : getFallbackState().wheelUsers);
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
        const msgRes = await fetch(`/api/youtube/messages?liveChatId=${encodeURIComponent(liveChatId)}&apiKey=${encodeURIComponent(apiKey)}`);
        const msgData = await msgRes.json().catch(() => ({}));
        const names = Array.isArray(msgData?.messages)
          ? Array.from(new Set(msgData.messages.map((m: any) => String(m?.authorName || "").trim()).filter(Boolean))).slice(0, 24)
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

  return (
    <div className="w-screen h-screen grid place-items-center bg-[#050816] overflow-hidden">
      <svg width="520" height="520" viewBox="0 0 520 520" style={{ transform: `rotate(${angle}deg)` }}>
        <g>
          {users.map((name, idx) => (
            <g key={name} transform={`rotate(${idx * (360 / users.length)} 260 260)`}>
              <path d="M260 260 L260 40 A220 220 0 0 1 440 140 Z" fill={idx % 2 ? "#1d4ed8" : "#0f766e"} opacity="0.85" />
              <text x="260" y="110" fill="white" fontSize="20" textAnchor="middle">{name}</text>
            </g>
          ))}
        </g>
        <g id="center">
          <circle cx="260" cy="260" r="72" fill="#020617" stroke="#22d3ee" strokeWidth="4" />
          <image
            href={`data:image/svg+xml;utf8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
                <rect width="100" height="100" rx="50" fill="#0f172a"/>
                <circle cx="50" cy="42" r="18" fill="#22d3ee"/>
                <path d="M28 82c4-16 15-24 22-24s18 8 22 24" fill="#a855f7"/>
                <text x="50" y="95" font-size="10" text-anchor="middle" fill="#d9faff">Doro</text>
              </svg>
            `)}`}
            x="210"
            y="210"
            width="100"
            height="100"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </svg>
    </div>
  );
}

export default function Sprint7Widgets() {
  const route = getRoute();
  return (
    <>
      <LiveCssInjector />
      {route === "obs-timer" ? <TimerWidget /> : route === "obs-wheel" ? <WheelWidget /> : <VoteWidget />}
    </>
  );
}
