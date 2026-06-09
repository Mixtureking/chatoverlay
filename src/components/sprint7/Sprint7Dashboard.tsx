import React, { useEffect, useState } from "react";
import { Copy, Dices, Save, Plus, Trash2, RotateCcw, Download, Upload, ClipboardCopy } from "lucide-react";
import { createSprint7WidgetState, parseSprint7FullState, serializeSprint7FullState, type Sprint7WidgetState } from "./sprint7State";

interface Sprint7DashboardProps {
  state: Sprint7WidgetState;
  syncState: (next: Sprint7WidgetState) => void;
}

const inputCls = "bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors";
const btnPrimary = "bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors";
const btnSecondary = "bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700";
const btnDanger = "bg-rose-700/60 hover:bg-rose-600 text-white font-semibold py-1.5 px-3 rounded-lg text-[11px] flex items-center gap-1.5 transition-colors";
const btnAccent = "bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors";

export function Sprint7Dashboard({ state, syncState }: Sprint7DashboardProps) {
  const rootUrl = window.location.origin;
  const rootFontStyle = { fontFamily: '"Segoe UI", Arial, sans-serif' };

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
    setTimeout(() => setSavedMsg(null), 2000);
  };

  // ---- Copy OBS link ----
  const handleCopy = (route: string, label: string) => {
    navigator.clipboard.writeText(`${rootUrl}/${route}`);
    flash(`Copied ${label} link!`);
  };

  // ---- Spin wheel ----
  const handleSpinWheel = () => {
    const channel = new BroadcastChannel("sprint7_wheel_channel");
    channel.postMessage({ type: "SPIN" });
    channel.close();
    flash("Wheel spin sent!");
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
    flash("All settings saved.");
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
    flash("Configuration exported.");
  };
  const importState = async (file: File | null) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = parseSprint7FullState(raw);
      syncState(createSprint7WidgetState({ ...state, todoList: parsed.todoList, customCSS: parsed.customCSS, socialLinks: parsed.socialLinks }));
      flash("Configuration imported.");
    } catch {
      flash("Invalid file.");
    }
  };
  const resetAll = () => {
    syncState(createSprint7WidgetState());
    flash("Everything reset.");
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-950 text-slate-100" style={rootFontStyle}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-12">

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">Link</span>
            <h3 className="font-bold text-amber-300">Social Links</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4 flex-1">Links shown in OBS. Enter URLs and copy them.</p>
          <div className="space-y-2">
            {Object.entries(state.socialLinks).map(([key, url]) => (
              <div key={key} className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950 p-2">
                <label className="text-xs font-bold text-slate-400 w-16 capitalize">{key}</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    const newLinks = { ...state.socialLinks, [key]: e.target.value };
                    syncState({ ...state, socialLinks: newLinks });
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    alert("Copied link " + key);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1 px-2 rounded text-xs"
                >Copy</button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-cyan-300 underline underline-offset-2 break-all"
                >
                  {url}
                </a>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-amber-400">Sprint 7 Lab</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage settings and copy OBS links for the minigames and interaction tools.
          </p>
        </div>

        {/* ========== OBS LINKS ========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">Chat</span>
              <h3 className="font-bold text-amber-300 text-sm">Chat MiniGame & Vote</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 flex-1">Chat overlay with A/B voting.</p>
            <div className="font-mono text-[10px] text-slate-400 break-all p-1.5 bg-slate-950 rounded border border-slate-800 mb-2">{rootUrl}/obs-chat</div>
            <button onClick={() => handleCopy("obs-chat", "Chat")} className={btnPrimary}>
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">Wheel</span>
              <h3 className="font-bold text-amber-300 text-sm">Lucky Wheel</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 flex-1">Lucky wheel. Click the center or press spin.</p>
            <div className="font-mono text-[10px] text-slate-400 break-all p-1.5 bg-slate-950 rounded border border-slate-800 mb-2">{rootUrl}/obs-wheel</div>
            <div className="flex gap-2">
              <button onClick={() => handleCopy("obs-wheel", "Wheel")} className={`flex-1 ${btnPrimary}`}>
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button onClick={handleSpinWheel} className={`flex-1 ${btnAccent}`}>
                <Dices className="w-3.5 h-3.5" /> Spin
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">Links</span>
              <h3 className="font-bold text-amber-300 text-sm">OBS Links</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 flex-1">Social link page for OBS.</p>
            <div className="font-mono text-[10px] text-slate-400 break-all p-1.5 bg-slate-950 rounded border border-slate-800 mb-2">{rootUrl}/obs-link</div>
            <button onClick={() => handleCopy("obs-link", "OBS Links")} className={btnPrimary}>
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">Timer</span>
              <h3 className="font-bold text-amber-300 text-sm">Countdown & Todo</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 flex-1">Countdown timer and todo list.</p>
            <div className="font-mono text-[10px] text-slate-400 break-all p-1.5 bg-slate-950 rounded border border-slate-800 mb-2">{rootUrl}/obs-timer</div>
            <button onClick={() => handleCopy("obs-timer", "Timer")} className={btnPrimary}>
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </button>
          </div>
        </div>

        {/* ========== SETTINGS ========== */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="font-bold text-amber-300 mb-5 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Save className="w-4 h-4" /> Settings
          </h3>

          <div className="space-y-6">

            {/* Timer & Wheel Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timer */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Timer</h4>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400">Seconds</label>
                  <input type="number" className={inputCls} value={timerSec} onChange={(e) => setTimerSec(e.target.value)} placeholder="300" min={0} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400">Finish message</label>
                  <input type="text" className={inputCls} value={timerDoneText} onChange={(e) => setTimerDoneText(e.target.value)} placeholder="Time is up" />
                </div>
              </div>

              {/* Wheel Users */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">Wheel users</h4>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400">Player names, separated by commas</label>
                  <textarea className={`${inputCls} resize-y min-h-[60px]`} value={wheelUsersInput} onChange={(e) => setWheelUsersInput(e.target.value)} rows={3} placeholder="Doro, An, Binh, Chi, Dung..." />
                </div>
                <p className="text-[10px] text-slate-500">
                  Current: <span className="text-slate-300">{(state.wheelUsers || []).length} users</span>
                </p>
              </div>
            </div>

            {/* Todo List Management */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Todo list</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`${inputCls} flex-1`}
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTodo()}
                  placeholder="Type a todo item..."
                />
                <button onClick={addTodo} className={btnSecondary}><Plus className="w-3.5 h-3.5" /> Add</button>
                <button onClick={clearTodos} className={btnDanger}><Trash2 className="w-3.5 h-3.5" /> Clear all</button>
              </div>
              {state.todoList.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {state.todoList.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="accent-emerald-500"
                      />
                      <input
                        className={`flex-1 bg-transparent text-xs text-slate-200 outline-none ${todo.completed ? "line-through opacity-50" : ""}`}
                        value={todoDrafts[todo.id] ?? todo.text}
                        onChange={(e) => setTodoDrafts(prev => ({ ...prev, [todo.id]: e.target.value }))}
                        onBlur={() => saveTodoText(todo.id)}
                      />
                      <button onClick={() => deleteTodo(todo.id)} className="text-rose-400 hover:text-rose-300 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              {state.todoList.length === 0 && <p className="text-[11px] text-slate-500 italic">No todo items yet.</p>}
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Social links</h4>
              <div className="flex gap-2">
                <input type="text" className={`${inputCls} w-28`} value={newLinkKey} onChange={(e) => setNewLinkKey(e.target.value)} placeholder="Name" />
                <input type="text" className={`${inputCls} flex-1`} value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="URL" onKeyDown={(e) => e.key === "Enter" && addLink()} />
                <button onClick={addLink} className={btnSecondary}><Plus className="w-3.5 h-3.5" /> Add</button>
              </div>
              {Object.keys(state.socialLinks).length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {Object.entries(state.socialLinks).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
                      <span className="text-[10px] text-slate-500 font-mono min-w-[50px]">{key}</span>
                      <input
                        className="flex-1 bg-transparent text-xs text-slate-200 outline-none"
                        value={linkDrafts[key] ?? value}
                        onChange={(e) => setLinkDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                        onBlur={() => saveLinkText(key)}
                      />
                      <button onClick={() => deleteLink(key)} className="text-rose-400 hover:text-rose-300 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom CSS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Custom CSS</h4>
              <textarea
                className={`${inputCls} w-full font-mono resize-y`}
                rows={5}
                value={cssDraft}
                onChange={(e) => setCssDraft(e.target.value)}
                placeholder="Enter custom CSS here..."
              />
              <p className="text-[10px] text-slate-500">CSS is injected only when the syntax is valid. Invalid CSS is ignored.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
              <button onClick={handleSaveAll} className={btnPrimary}>
                <Save className="w-4 h-4" /> Save all settings
              </button>
              <button onClick={exportState} className={btnSecondary}>
                <Download className="w-4 h-4" /> Export file
              </button>
              <label className={`${btnSecondary} cursor-pointer`}>
                <Upload className="w-4 h-4" /> Import file
                <input type="file" accept=".json" className="hidden" onChange={(e) => { void importState(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
              </label>
              <button onClick={resetAll} className={btnDanger}>
                <RotateCcw className="w-3.5 h-3.5" /> Reset all
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

