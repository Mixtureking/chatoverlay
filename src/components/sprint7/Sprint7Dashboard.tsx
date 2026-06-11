import React, { useEffect, useState } from "react";
import { Copy, Dices, Save, Plus, Trash2, RotateCcw, Timer, CircleDot, MessageSquare, Link2, ListTodo, CheckCircle2, Clock, Users, ExternalLink, Sparkles, Trophy } from "lucide-react";
import { createSprint7WidgetState, serializeSprint7StateToBase64, type Sprint7WidgetState } from "./sprint7State";

interface Sprint7DashboardProps {
  state: Sprint7WidgetState;
  syncState: (next: Sprint7WidgetState) => void;
  themeMode?: string;
}

/* ─────────── Shared style tokens ─────────── */
const glassCard = "relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 backdrop-blur-sm shadow-xl dark:border-white/[0.06] light:border-black/[0.06]";
const inputCls = "bg-slate-950/70 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all duration-200";
const sectionTitle = "text-[11px] font-semibold uppercase tracking-[0.15em] flex items-center gap-2";

export function Sprint7Dashboard({ state, syncState, themeMode }: Sprint7DashboardProps) {
  const rootUrl = window.location.origin.replace("127.0.0.1", "localhost");

  // ---- Local draft states ----
  const [wheelUsersInput, setWheelUsersInput] = useState((state.wheelUsers || []).join(", "));
  const [timerSec, setTimerSec] = useState(String(state.timerSeconds ?? 300));
  const [timerDoneText, setTimerDoneText] = useState(state.timerDoneText || "Time is up");
  const [voteKeywordA, setVoteKeywordA] = useState(state.voteKeywordA || "A");
  const [voteKeywordB, setVoteKeywordB] = useState(state.voteKeywordB || "B");
  const [todoDrafts, setTodoDrafts] = useState<Record<string, string>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [newTodoText, setNewTodoText] = useState("");
  const [newLinkKey, setNewLinkKey] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Sync drafts when state changes externally, avoiding cursor jumping on local typing
  useEffect(() => {
    const nextWheelText = (state.wheelUsers || []).join(", ");
    if (nextWheelText !== wheelUsersInput) {
      setWheelUsersInput(nextWheelText);
    }
  }, [state.wheelUsers]);

  useEffect(() => {
    const nextTimerSec = String(state.timerSeconds ?? 300);
    if (nextTimerSec !== timerSec) {
      setTimerSec(nextTimerSec);
    }
  }, [state.timerSeconds]);

  useEffect(() => {
    const nextDoneText = state.timerDoneText || "Time is up";
    if (nextDoneText !== timerDoneText) {
      setTimerDoneText(nextDoneText);
    }
  }, [state.timerDoneText]);

  useEffect(() => {
    const nextA = state.voteKeywordA || "A";
    if (nextA !== voteKeywordA) {
      setVoteKeywordA(nextA);
    }
  }, [state.voteKeywordA]);

  useEffect(() => {
    const nextB = state.voteKeywordB || "B";
    if (nextB !== voteKeywordB) {
      setVoteKeywordB(nextB);
    }
  }, [state.voteKeywordB]);

  const flash = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  };

  // Helper to sync specific values immediately to parent state & Broadcast Channels
  const saveField = (key: "timer" | "wheel" | "vote", val1: string, val2?: string) => {
    const next = { ...state };
    if (key === "timer") {
      const parsedSec = Number.parseInt(val1, 10);
      const finalSec = Number.isFinite(parsedSec) && parsedSec >= 0 ? parsedSec : 300;
      const finalDoneText = val2 || "Time is up";
      const trigger = Date.now();
      next.timerSeconds = finalSec;
      next.timerDoneText = finalDoneText;
      next.timerTrigger = trigger;

      const timerChannel = new BroadcastChannel("sprint7_timer_channel");
      timerChannel.postMessage({ type: "UPDATE_TIMER", seconds: finalSec, doneText: finalDoneText, trigger });
      timerChannel.close();
    } else if (key === "wheel") {
      const finalWheelUsers = val1.split(",").map(s => s.trim()).filter(Boolean);
      next.wheelUsers = finalWheelUsers;

      const wheelChannel = new BroadcastChannel("sprint7_wheel_state");
      wheelChannel.postMessage({ type: "UPDATE_WHEEL", users: finalWheelUsers });
      wheelChannel.close();
    } else if (key === "vote") {
      next.voteKeywordA = val1 || "A";
      next.voteKeywordB = val2 || "B";
      
      // Sync to server immediately
      fetch("/api/interactivity/vote-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywordA: next.voteKeywordA, keywordB: next.voteKeywordB }),
      }).catch(console.error);
    }
    syncState(next);
  };

  const handleEndVote = async () => {
    try {
      const res = await fetch("/api/interactivity/votes");
      const data = await res.json();
      if (data?.state) {
        const { A, B } = data.state;
        let winner: "A" | "B" | "DRAW" = "DRAW";
        if (A > B) winner = "A";
        else if (B > A) winner = "B";

        const trigger = Date.now();
        syncState({
          ...state,
          voteEndTrigger: trigger,
          voteWinner: winner,
        });
        flash(`🏆 Kết thúc vote! Winner: ${winner === "DRAW" ? "Hòa" : winner}`);
      }
    } catch (err) {
      console.error("Failed to end vote:", err);
      flash("❌ Lỗi khi kết thúc vote");
    }
  };

  // ---- Copy OBS link ----
  const handleCopy = (route: string, label: string) => {
    const parsedSec = Number.parseInt(timerSec, 10);
    const finalSec = Number.isFinite(parsedSec) && parsedSec >= 0 ? parsedSec : 300;
    const finalDoneText = timerDoneText || "Time is up";
    const finalWheelUsers = wheelUsersInput.split(",").map(s => s.trim()).filter(Boolean);

    const config = {
      ...state,
      timerSeconds: finalSec,
      timerDoneText: finalDoneText,
      wheelUsers: finalWheelUsers,
    };

    const b64 = serializeSprint7StateToBase64(config);
    navigator.clipboard.writeText(`${rootUrl}/${route}?sp7=${b64}`);
    flash(`✅ Đã sao chép link ${label}!`);
  };

  // ---- Spin wheel ----
  const handleSpinWheel = () => {
    const trigger = Date.now();
    const channel = new BroadcastChannel("sprint7_wheel_channel");
    channel.postMessage({ type: "SPIN", trigger });
    channel.close();

    syncState({
      ...state,
      spinTrigger: trigger,
    });
    flash("🎡 Đã gửi lệnh quay!");
  };

  const handleFlower = (type: string) => {
    const trigger = Date.now();
    const channel = new BroadcastChannel("sprint7_flower_channel");
    channel.postMessage({ type });
    channel.close();

    syncState({
      ...state,
      flowerTrigger: trigger,
      flowerType: type,
    });
    flash("✨ Đã gửi hiệu ứng!");
  };


  // ---- Save all settings ----
  const handleSaveAll = () => {
    const parsedSec = Number.parseInt(timerSec, 10);
    const finalSec = Number.isFinite(parsedSec) && parsedSec >= 0 ? parsedSec : 300;
    const finalDoneText = timerDoneText || "Time is up";
    const finalWheelUsers = wheelUsersInput.split(",").map(s => s.trim()).filter(Boolean);
    const trigger = Date.now();
    
    syncState({
      ...state,
      wheelUsers: finalWheelUsers,
      timerSeconds: finalSec,
      timerDoneText: finalDoneText,
      timerTrigger: trigger,
    });
    
    const timerChannel = new BroadcastChannel("sprint7_timer_channel");
    timerChannel.postMessage({ type: "UPDATE_TIMER", seconds: finalSec, doneText: finalDoneText, trigger });
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
    const safeLinks = state.socialLinks || {};
    const key = newLinkKey.trim() || `link${Object.keys(safeLinks).length + 1}`;
    const url = newLinkUrl.trim() || "https://example.com";
    
    // Clear any existing draft for this key to prevent old values showing up
    setLinkDrafts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    syncState({
      ...state,
      socialLinks: { ...safeLinks, [key]: url },
    });
    setNewLinkKey("");
    setNewLinkUrl("");
  };
  const deleteLink = (key: string) => {
    const safeLinks = state.socialLinks || {};
    const { [key]: _, ...rest } = safeLinks;
    setLinkDrafts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    syncState({ ...state, socialLinks: rest });
  };
  const saveLinkText = (key: string) => {
    const safeLinks = state.socialLinks || {};
    const val = linkDrafts[key];
    if (val === undefined) return;
    syncState({
      ...state,
      socialLinks: { ...safeLinks, [key]: val },
    });
  };

  const resetAll = () => {
    localStorage.removeItem("sprint7_votes_local");
    syncState(createSprint7WidgetState());
    fetch("/api/interactivity/votes", { method: "DELETE" }).catch(console.error);
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
    <div className="w-full h-full overflow-y-auto bg-slate-950 text-slate-100" style={{ fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">

        {/* ═══════════ HEADER ═══════════ */}
        <div className={`${glassCard} p-6`}>
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/[0.07] via-fuchsia-500/[0.05] to-cyan-500/[0.07]" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-50 tracking-tight">Tính năng tương tác Stream</h2>
              <p className="text-sm text-slate-400 mt-0.5">Quản lý widget tương tác OBS — Wheel, Timer, Todo & Social Links</p>
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
              emoji="📊"
              title="Live Vote"
              desc="Overlay bầu chọn A/B dựa trên tin nhắn chat của người xem."
              route="obs-vote"
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
            <ObsLinkCard
              emoji="🌸"
              title="Effect Layer"
              desc="Layer dành riêng cho hiệu ứng (Tung hoa !tunghoa)."
              route="obs-effect"
              gradient="bg-gradient-to-r from-rose-400 to-pink-500"
              extra={
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button onClick={() => handleFlower("TUNG_HOA")} className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 p-2 rounded-lg" title="🌸 Tung hoa">🌸</button>
                  <button onClick={() => handleFlower("PHAO_HOA")} className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 p-2 rounded-lg" title="🎆 Pháo hoa">🎆</button>
                  <button onClick={() => handleFlower("TIM")} className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 p-2 rounded-lg" title="❤️ Tim">❤️</button>
                  <button onClick={() => handleFlower("VO_TAY")} className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 p-2 rounded-lg" title="👏 Vỗ tay">👏</button>
                </div>
              }
            />
            <ObsLinkCard
              emoji="✅"
              title="OBS Todo"
              desc="Danh sách nhiệm vụ tối giản dành riêng cho OBS."
              route="obs-todo"
              gradient="bg-gradient-to-r from-slate-500 to-slate-700"
            />
          </div>
        </div>

        {/* ═══════════ SETTINGS PANEL ═══════════ */}
        <div className={glassCard}>
          <div className="h-[2px] w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />
          <div className="p-5 sm:p-6">
            <h3 className="font-bold text-slate-100 mb-6 flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                <Save className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="tracking-wide">Cài đặt Widget</span>
            </h3>

            <div className="space-y-7">

              {/* ──── Timer & Wheel ──── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Timer */}
                <div className="bg-slate-900/40 rounded-xl border border-white/[0.04] p-4 space-y-3">
                  <h4 className={`${sectionTitle} text-cyan-400`}>
                    <Clock className="w-3.5 h-3.5" /> Bộ đếm ngược
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Thời gian (giây)</label>
                    <input
                      type="number"
                      className={`${inputCls} w-full`}
                      value={timerSec}
                      onChange={(e) => setTimerSec(e.target.value)}
                      onBlur={() => saveField("timer", timerSec, timerDoneText)}
                      onKeyDown={(e) => e.key === "Enter" && saveField("timer", timerSec, timerDoneText)}
                      placeholder="300"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Thông báo khi hết giờ</label>
                    <input
                      type="text"
                      className={`${inputCls} w-full`}
                      value={timerDoneText}
                      onChange={(e) => setTimerDoneText(e.target.value)}
                      onBlur={() => saveField("timer", timerSec, timerDoneText)}
                      onKeyDown={(e) => e.key === "Enter" && saveField("timer", timerSec, timerDoneText)}
                      placeholder="Thời gian đã kết thúc"
                    />
                  </div>
                </div>

                {/* Wheel Users */}
                <div className="bg-slate-900/40 rounded-xl border border-white/[0.04] p-4 space-y-3">
                  <h4 className={`${sectionTitle} text-violet-400`}>
                    <Users className="w-3.5 h-3.5" /> Người chơi Wheel
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-medium">Tên người chơi, cách nhau bởi dấu phẩy</label>
                    <textarea
                      className={`${inputCls} w-full resize-y min-h-[68px]`}
                      value={wheelUsersInput}
                      onChange={(e) => setWheelUsersInput(e.target.value)}
                      onBlur={() => saveField("wheel", wheelUsersInput)}
                      rows={3}
                      placeholder="Doro, An, Bình, Chi, Dung..."
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <CircleDot className="w-3 h-3 text-violet-400" />
                    Hiện có <span className="text-violet-300 font-semibold">{(state.wheelUsers || []).length}</span> người chơi
                  </p>
                </div>

                {/* Vote Keywords */}
                <div className="bg-slate-900/40 rounded-xl border border-white/[0.04] p-4 space-y-3">
                  <h4 className={`${sectionTitle} text-blue-400`}>
                    <MessageSquare className="w-3.5 h-3.5" /> Từ khóa bầu chọn (Live Vote)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-medium">Từ khóa Lựa chọn A</label>
                      <input
                        type="text"
                        className={`${inputCls} w-full`}
                        value={voteKeywordA}
                        onChange={(e) => setVoteKeywordA(e.target.value)}
                        onBlur={() => saveField("vote", voteKeywordA, voteKeywordB)}
                        onKeyDown={(e) => e.key === "Enter" && saveField("vote", voteKeywordA, voteKeywordB)}
                        placeholder="A"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-medium">Từ khóa Lựa chọn B</label>
                      <input
                        type="text"
                        className={`${inputCls} w-full`}
                        value={voteKeywordB}
                        onChange={(e) => setVoteKeywordB(e.target.value)}
                        onBlur={() => saveField("vote", voteKeywordA, voteKeywordB)}
                        onKeyDown={(e) => e.key === "Enter" && saveField("vote", voteKeywordA, voteKeywordB)}
                        placeholder="B"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEndVote}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-500/20"
                    >
                      <Trophy className="w-3.5 h-3.5" /> Kết thúc Vote
                    </button>
                    <button
                      onClick={() => {
                        fetch("/api/interactivity/votes", { method: "DELETE" }).catch(console.error);
                        flash("🔄 Đã reset điểm vote!");
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl transition-colors"
                      title="Reset điểm vote"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    Người xem chat đúng từ khóa này (ví dụ: "{voteKeywordA}") để tăng điểm vote.
                  </p>
                </div>
              </div>

              {/* ──── Todo List ──── */}
              <div className="bg-slate-900/40 rounded-xl border border-white/[0.04] p-4 space-y-3">
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
                      <div key={todo.id} className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 transition-all duration-200 ${todo.completed ? "bg-emerald-500/[0.06] border border-emerald-500/10" : "bg-slate-900/50 border border-white/[0.04] hover:border-white/[0.08]"}`}>
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
              <div className="bg-slate-900/40 rounded-xl border border-white/[0.04] p-4 space-y-3">
                <h4 className={`${sectionTitle} text-amber-400`}>
                  <Link2 className="w-3.5 h-3.5" /> Liên kết mạng xã hội
                </h4>
                <div className="flex gap-2">
                  <input type="text" className={`${inputCls} w-32 shrink-0`} value={newLinkKey} onChange={(e) => setNewLinkKey(e.target.value)} placeholder="Tên" />
                  <input type="text" className={`${inputCls} flex-1`} value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => e.key === "Enter" && addLink()} />
                  <button onClick={addLink} className="bg-amber-600/80 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all duration-200 shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Thêm
                  </button>
                </div>
                {Object.keys(state.socialLinks).length > 0 && (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {Object.entries(state.socialLinks).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2.5 bg-slate-900/50 border border-white/[0.04] hover:border-white/[0.08] rounded-xl px-3.5 py-2 transition-all duration-200 group">
                        <span className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider min-w-[64px] shrink-0">{key}</span>
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

              {/* ──── Action Bar ──── */}
              <div className="flex flex-wrap gap-2.5 pt-4 border-t border-white/[0.04]">
                <button onClick={handleSaveAll} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30">
                  <Save className="w-4 h-4" /> Lưu tất cả
                </button>
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
            <p className="text-sm text-slate-100 font-medium">{savedMsg}</p>
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
