import React, { useEffect, useState } from "react";
import { Copy, Dices, Save, Plus, Trash2, RotateCcw, Download, Upload, Timer, CircleDot, MessageSquare, Link2, ListTodo, Palette, CheckCircle2, Clock, Users, ExternalLink, Sparkles } from "lucide-react";
import { createSprint7WidgetState, parseSprint7FullState, serializeSprint7FullState, type Sprint7WidgetState } from "./sprint7State";

interface Sprint7DashboardProps {
  state: Sprint7WidgetState;
  syncState: (next: Sprint7WidgetState) => void;
}

/* ─────────── Shared style tokens ─────────── */
const glassCard = "relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 backdrop-blur-sm shadow-xl";
const inputCls = "w-full bg-slate-950/70 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all duration-200";
const sectionTitle = "text-[11px] font-semibold uppercase tracking-[0.15em] flex items-center gap-2";

export function Sprint7Dashboard({ state, syncState }: Sprint7DashboardProps) {
  const rootUrl = window.location.origin.replace("127.0.0.1", "localhost");

  // ---- Local draft states ----
  const [wheelUsersInput, setWheelUsersInput] = useState((state.wheelUsers || []).join(", "));
  const [timerSec, setTimerSec] = useState(String(state.timerSeconds ?? 300));
  const [timerDoneText, setTimerDoneText] = useState(state.timerDoneText || "Time is up");
  const [cssDraft, setCssDraft] = useState(state.customCSS || "");
  const [todoDrafts, setTodoDrafts] = useState<Record<string, string>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [newTodoText, setNewTodoText] = useState("");
  const [newLinkKey, setNewLinkKey] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Sync drafts when state changes externally
  useEffect(() => {
    setWheelUsersInput((state.wheelUsers || []).join(", "));
    setTimerSec(String(state.timerSeconds ?? 300));
    setTimerDoneText(state.timerDoneText || "Time is up");
    setCssDraft(state.customCSS || "");
  }, [state.wheelUsers, state.timerSeconds, state.timerDoneText, state.customCSS]);

  const flash = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  };

  // ---- Copy OBS link ----
  const handleCopy = (route: string, label: string) => {
    navigator.clipboard.writeText(`${rootUrl}/${route}`);
    flash(`✅ Đã sao chép link ${label}!`);
  };

  // ---- Spin wheel ----
  const handleSpinWheel = () => {
    const channel = new BroadcastChannel("sprint7_wheel_channel");
    channel.postMessage({ type: "SPIN" });
    channel.close();
    flash("🎡 Đã gửi lệnh quay!");
  };

  // ---- Save all settings ----
  const handleSaveAll = () => {
    const parsedSec = Number.parseInt(timerSec, 10);
    const finalSec = Number.isFinite(parsedSec) && parsedSec >= 0 ? parsedSec : 300;
    const finalDoneText = timerDoneText || "Time is up";
    const finalWheelUsers = wheelUsersInput.split(",").map(s => s.trim()).filter(Boolean);
    syncState({
      ...state,
      wheelUsers: finalWheelUsers,
      timerSeconds: finalSec,
      timerDoneText: finalDoneText,
      customCSS: cssDraft,
    });
    const timerChannel = new BroadcastChannel("sprint7_timer_channel");
    timerChannel.postMessage({ type: "UPDATE_TIMER", seconds: finalSec, doneText: finalDoneText });
    timerChannel.close();
    const wheelChannel = new BroadcastChannel("sprint7_wheel_state");
    wheelChannel.postMessage({ type: "UPDATE_WHEEL", users: finalWheelUsers });
    wheelChannel.close();
    flash("💾 Đã lưu tất cả thiết lập!");
  };

  // ---- Todo helpers ----
  const addTodo = () => {
    if (!newTodoText.trim()) return;
    syncState({
      ...state,
      todoList: [...state.todoList, { id: `todo-${Date.now()}`, text: newTodoText.trim(), completed: false }],
    });
    setNewTodoText("");
  };
  const toggleTodo = (id: string) => {
    syncState({
      ...state,
      todoList: state.todoList.map(t => t.id === id ? { ...t, completed: !t.completed } : t),
    });
  };
  const deleteTodo = (id: string) => {
    syncState({
      ...state,
      todoList: state.todoList.filter(t => t.id !== id),
    });
  };
  const saveTodoText = (id: string) => {
    const text = todoDrafts[id];
    if (text === undefined) return;
    syncState({
      ...state,
      todoList: state.todoList.map(t => t.id === id ? { ...t, text } : t),
    });
  };
  const clearTodos = () => {
    syncState({ ...state, todoList: [] });
  };

  // ---- Social link helpers ----
  const addLink = () => {
    const key = newLinkKey.trim() || `link${Object.keys(state.socialLinks).length + 1}`;
    syncState({
      ...state,
      socialLinks: { ...state.socialLinks, [key]: newLinkUrl.trim() || "https://example.com" },
    });
    setNewLinkKey("");
    setNewLinkUrl("");
  };
  const deleteLink = (key: string) => {
    const { [key]: _, ...rest } = state.socialLinks;
    syncState({ ...state, socialLinks: rest });
  };
  const saveLinkText = (key: string) => {
    const val = linkDrafts[key];
    if (val === undefined) return;
    syncState({
      ...state,
      socialLinks: { ...state.socialLinks, [key]: val },
    });
  };

  // ---- Export / Import / Reset ----
  const exportState = () => {
    const payload = serializeSprint7FullState({ todoList: state.todoList, customCSS: state.customCSS, socialLinks: state.socialLinks });
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sprint7-widget-state.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flash("📦 Đã xuất cấu hình!");
  };
  const importState = async (file: File | null) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = parseSprint7FullState(raw);
      syncState(createSprint7WidgetState({ ...state, todoList: parsed.todoList, customCSS: parsed.customCSS, socialLinks: parsed.socialLinks }));
      flash("📥 Đã nhập cấu hình thành công!");
    } catch {
      flash("❌ File không hợp lệ.");
    }
  };
  const resetAll = () => {
    syncState(createSprint7WidgetState());
    flash("🔄 Đã reset toàn bộ!");
  };

  /* ─────────── OBS Link Card ─────────── */
  const ObsLinkCard = ({ emoji, title, desc, route, gradient, extra }: {
    emoji: string; title: string; desc: string; route: string; gradient: string; extra?: React.ReactNode;
  }) => (
    <div className={`${glassCard} group hover:scale-[1.02] transition-all duration-300`}>
      {/* Gradient accent line at top */}
      <div className={`h-[2px] w-full ${gradient}`} />
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-xl select-none">{emoji}</span>
          <h3 className="font-bold text-white text-sm tracking-wide">{title}</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-3 flex-1 leading-relaxed">{desc}</p>
        <div className="font-mono text-[10px] text-slate-500 break-all p-2 bg-black/30 rounded-lg border border-white/[0.04] mb-3 select-all">
          {rootUrl}/{route}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleCopy(route, title)}
            className="flex-1 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200 hover:border-white/[0.15]"
          >
            <Copy className="w-3.5 h-3.5" /> Sao chép
          </button>
          {extra}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full overflow-y-auto bg-[#0a0a12] text-slate-100" style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">

        {/* ═══════════ HEADER ═══════════ */}
        <div className={`${glassCard} p-6`}>
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/[0.07] via-fuchsia-500/[0.05] to-cyan-500/[0.07]" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Khu thử nghiệm Sprint 7</h2>
              <p className="text-sm text-slate-400 mt-0.5">Quản lý widget tương tác OBS — Wheel, Timer, Todo, Social Links & CSS Editor</p>
            </div>
          </div>
        </div>

        {/* ═══════════ OBS ROUTE CARDS ═══════════ */}
        <div>
          <h3 className={`${sectionTitle} text-slate-400 mb-3 pl-1`}>
            <ExternalLink className="w-3.5 h-3.5" /> Đường dẫn OBS Browser Source
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ObsLinkCard
              emoji="💬"
              title="Chat & Vote"
              desc="Overlay chat với bầu chọn A/B, roulette, todo, social links."
              route="obs-chat"
              gradient="bg-gradient-to-r from-blue-500 to-cyan-400"
            />
            <ObsLinkCard
              emoji="🎡"
              title="Lucky Wheel"
              desc="Vòng quay may mắn. Nhấn Spin hoặc click vào tâm vòng quay."
              route="obs-wheel"
              gradient="bg-gradient-to-r from-violet-500 to-fuchsia-500"
              extra={
                <button
                  onClick={handleSpinWheel}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/20"
                >
                  <Dices className="w-3.5 h-3.5" /> Quay
                </button>
              }
            />
            <ObsLinkCard
              emoji="🔗"
              title="Social Links"
              desc="Trang hiển thị liên kết mạng xã hội dạng marquee."
              route="obs-link"
              gradient="bg-gradient-to-r from-amber-500 to-orange-500"
            />
            <ObsLinkCard
              emoji="⏱️"
              title="Timer & Todo"
              desc="Đồng hồ đếm ngược và danh sách nhiệm vụ."
              route="obs-timer"
              gradient="bg-gradient-to-r from-emerald-500 to-teal-500"
            />
          </div>
        </div>

        {/* ═══════════ SETTINGS PANEL ═══════════ */}
        <div className={glassCard}>
          <div className="h-[2px] w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />
          <div className="p-5 sm:p-6">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                <Save className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="tracking-wide">Cài đặt Widget</span>
            </h3>

            <div className="space-y-7">

              {/* ──── Timer & Wheel ──── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Timer */}
                <div className="bg-black/20 rounded-xl border border-white/[0.04] p-4 space-y-3">
                  <h4 className={`${sectionTitle} text-cyan-400`}>
                    <Clock className="w-3.5 h-3.5" /> Bộ đếm ngược
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Thời gian (giây)</label>
                    <input type="number" className={inputCls} value={timerSec} onChange={(e) => setTimerSec(e.target.value)} placeholder="300" min={0} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Thông báo khi hết giờ</label>
                    <input type="text" className={inputCls} value={timerDoneText} onChange={(e) => setTimerDoneText(e.target.value)} placeholder="Thời gian đã kết thúc" />
                  </div>
                </div>

                {/* Wheel Users */}
                <div className="bg-black/20 rounded-xl border border-white/[0.04] p-4 space-y-3">
                  <h4 className={`${sectionTitle} text-violet-400`}>
                    <Users className="w-3.5 h-3.5" /> Người chơi Wheel
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tên người chơi, cách nhau bởi dấu phẩy</label>
                    <textarea className={`${inputCls} resize-y min-h-[68px]`} value={wheelUsersInput} onChange={(e) => setWheelUsersInput(e.target.value)} rows={3} placeholder="Doro, An, Bình, Chi, Dung..." />
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <CircleDot className="w-3 h-3 text-violet-400" />
                    Hiện có <span className="text-violet-300 font-semibold">{(state.wheelUsers || []).length}</span> người chơi
                  </p>
                </div>
              </div>

              {/* ──── Todo List ──── */}
              <div className="bg-black/20 rounded-xl border border-white/[0.04] p-4 space-y-3">
                <h4 className={`${sectionTitle} text-emerald-400`}>
                  <ListTodo className="w-3.5 h-3.5" /> Danh sách nhiệm vụ
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className={`${inputCls} flex-1`}
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTodo()}
                    placeholder="Nhập nhiệm vụ mới..."
                  />
                  <button onClick={addTodo} className="bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all duration-200 shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Thêm
                  </button>
                  {state.todoList.length > 0 && (
                    <button onClick={clearTodos} className="bg-rose-600/40 hover:bg-rose-500/60 text-rose-200 font-semibold py-2 px-3 rounded-xl text-[11px] flex items-center gap-1.5 transition-all duration-200 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" /> Xóa hết
                    </button>
                  )}
                </div>
                {state.todoList.length > 0 && (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                    {state.todoList.map((todo) => (
                      <div key={todo.id} className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 transition-all duration-200 ${todo.completed ? "bg-emerald-500/[0.06] border border-emerald-500/10" : "bg-slate-950/50 border border-white/[0.04] hover:border-white/[0.08]"}`}>
                        <button onClick={() => toggleTodo(todo.id)} className="shrink-0">
                          {todo.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-600 hover:border-emerald-400 transition-colors" />
                          )}
                        </button>
                        <input
                          className={`flex-1 bg-transparent text-[13px] text-slate-200 outline-none ${todo.completed ? "line-through opacity-40" : ""}`}
                          value={todoDrafts[todo.id] ?? todo.text}
                          onChange={(e) => setTodoDrafts(prev => ({ ...prev, [todo.id]: e.target.value }))}
                          onBlur={() => saveTodoText(todo.id)}
                        />
                        <button onClick={() => deleteTodo(todo.id)} className="text-slate-600 hover:text-rose-400 p-0.5 transition-colors shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {state.todoList.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic pl-1">Chưa có nhiệm vụ nào.</p>
                )}
              </div>

              {/* ──── Social Links ──── */}
              <div className="bg-black/20 rounded-xl border border-white/[0.04] p-4 space-y-3">
                <h4 className={`${sectionTitle} text-amber-400`}>
                  <Link2 className="w-3.5 h-3.5" /> Liên kết mạng xã hội
                </h4>
                <div className="flex gap-2">
                  <input type="text" className={`${inputCls} w-28 shrink-0`} value={newLinkKey} onChange={(e) => setNewLinkKey(e.target.value)} placeholder="Tên" />
                  <input type="text" className={`${inputCls} flex-1`} value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => e.key === "Enter" && addLink()} />
                  <button onClick={addLink} className="bg-amber-600/80 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all duration-200 shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Thêm
                  </button>
                </div>
                {Object.keys(state.socialLinks).length > 0 && (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {Object.entries(state.socialLinks).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2.5 bg-slate-950/50 border border-white/[0.04] hover:border-white/[0.08] rounded-xl px-3.5 py-2 transition-all duration-200 group">
                        <span className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider min-w-[48px] shrink-0">{key}</span>
                        <input
                          className="flex-1 bg-transparent text-[13px] text-slate-300 outline-none"
                          value={linkDrafts[key] ?? value}
                          onChange={(e) => setLinkDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                          onBlur={() => saveLinkText(key)}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(value);
                            flash(`✅ Đã sao chép link ${key}`);
                          }}
                          className="text-slate-600 hover:text-amber-400 p-0.5 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteLink(key)} className="text-slate-600 hover:text-rose-400 p-0.5 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ──── Custom CSS ──── */}
              <div className="bg-black/20 rounded-xl border border-white/[0.04] p-4 space-y-3">
                <h4 className={`${sectionTitle} text-indigo-400`}>
                  <Palette className="w-3.5 h-3.5" /> CSS tùy chỉnh
                </h4>
                <textarea
                  className={`${inputCls} font-mono text-[12px] resize-y leading-relaxed`}
                  rows={5}
                  value={cssDraft}
                  onChange={(e) => setCssDraft(e.target.value)}
                  placeholder="/* Nhập CSS tùy chỉnh ở đây... */"
                />
                <p className="text-[10px] text-slate-500 pl-0.5">CSS chỉ được áp dụng khi cú pháp hợp lệ. Cú pháp sai sẽ được bỏ qua an toàn.</p>
              </div>

              {/* ──── Action Bar ──── */}
              <div className="flex flex-wrap gap-2.5 pt-4 border-t border-white/[0.04]">
                <button onClick={handleSaveAll} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30">
                  <Save className="w-4 h-4" /> Lưu tất cả
                </button>
                <button onClick={exportState} className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200">
                  <Download className="w-4 h-4" /> Xuất file
                </button>
                <label className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer">
                  <Upload className="w-4 h-4" /> Nhập file
                  <input type="file" accept=".json" className="hidden" onChange={(e) => { void importState(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
                </label>
                <button onClick={resetAll} className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200 ml-auto">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* ═══════════ FLOATING TOAST ═══════════ */}
      {savedMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[slideUp_0.3s_ease-out]">
          <div className="bg-slate-900/95 border border-white/[0.1] backdrop-blur-lg rounded-2xl px-5 py-3 shadow-2xl shadow-black/40">
            <p className="text-sm text-white font-medium">{savedMsg}</p>
          </div>
        </div>
      )}

      {/* Keyframe for toast animation */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
