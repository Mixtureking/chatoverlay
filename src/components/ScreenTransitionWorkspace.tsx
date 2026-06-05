import React, { useState, useRef, useEffect } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Sparkles, 
  Settings, 
  Gauge, 
  Columns, 
  Eye, 
  Play, 
  HelpCircle,
  Tv,
  CheckCircle,
  Volume2,
  Type,
  Image,
  Sliders,
  Music,
  Trash2,
  Clock,
  Layers,
  Copy,
  ExternalLink,
  Plus
} from "lucide-react";
import { OverlaySettings } from "../types";
import ScreenTransition from "./ScreenTransition";
import { playTransitionSound } from "./ScreenTransitionOverlay";

interface ScreenTransitionWorkspaceProps {
  settings: OverlaySettings;
  updateSettings: (newSettings: Partial<OverlaySettings>) => void;
  language: "vi" | "en";
  showToast: (msg: string) => void;
  accentColor: string;
  obsTransitionLink: string;
  onCopyObsTransitionLink: () => void;
}

const defaultPresets = [
  { id: "preset_soon", name: "Streaming Soon ⏳", title: "STREAMING SOON", subtitle: "Chuẩn bị bắt đầu trong vài phút nữa...", duration: 5, sustainType: "auto" as const },
  { id: "preset_changing", name: "Changing Screen 🔄", title: "CHANGING SCENE", subtitle: "Streamer đang chuyển cảnh, vui lòng chờ...", duration: 3, sustainType: "auto" as const },
  { id: "preset_waiting", name: "Be Right Back ☕", title: "BE RIGHT BACK", subtitle: "Streamer đang bận một chút, sẽ quay lại ngay!", duration: 5, sustainType: "auto" as const },
];

export default function ScreenTransitionWorkspace({
  settings,
  updateSettings,
  language = "vi",
  showToast,
  accentColor,
  obsTransitionLink,
  onCopyObsTransitionLink,
}: ScreenTransitionWorkspaceProps) {
  const [previewTab, setPreviewTab] = useState<"screen_a" | "screen_b">("screen_a");
  const [triggerCount, setTriggerCount] = useState(0);
  const [isLocalSimulating, setIsLocalSimulating] = useState(false);
  const [localSimTimeout, setLocalSimTimeout] = useState<any>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Custom Preset Option states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetTitle, setNewPresetTitle] = useState("");
  const [newPresetSubtitle, setNewPresetSubtitle] = useState("");
  const [newPresetDuration, setNewPresetDuration] = useState(5);
  const [newPresetSustain, setNewPresetSustain] = useState<"auto" | "manual">("auto");

  useEffect(() => {
    return () => {
      if (localSimTimeout) clearTimeout(localSimTimeout);
    };
  }, [localSimTimeout]);

  // Turn off Option focus when the transition is no longer active (finished/closed)
  useEffect(() => {
    if (!settings.transitionActive) {
      setSelectedOptionId(null);
    }
  }, [settings.transitionActive]);

  // Ref for tracking the last selectedOptionId to avoid race conditions on preset switch
  const prevSelectedOptionIdRef = useRef<string | null>(null);

  useEffect(() => {
    prevSelectedOptionIdRef.current = selectedOptionId;
  }, [selectedOptionId]);

  const prevSelectedOptionId = prevSelectedOptionIdRef.current;

  // Synchronize transition configuration when Option preset options are changed
  useEffect(() => {
    if (!selectedOptionId) return;
    
    // Only synchronize once selectedOptionId has stabilized (prev and current match)
    // to avoid overwriting a newly selected preset's values with the prior preset's values
    if (prevSelectedOptionId !== selectedOptionId) return;

    const customList = settings.transitionCustomPresets || [];
    const existing = customList.find(p => p.id === selectedOptionId);
    const defaultPreset = defaultPresets.find(p => p.id === selectedOptionId);

    const currentTitle = settings.transitionTitle || "";
    const currentSubtitle = settings.transitionSubtitle || "";
    const currentDuration = settings.transitionDuration || 3;
    const currentSustainType = settings.transitionSustainType || "auto";

    let shouldUpdatePrs = false;
    let nextCustomList = [...customList];

    if (existing) {
      if (
        existing.title !== currentTitle ||
        existing.subtitle !== currentSubtitle ||
        existing.duration !== currentDuration ||
        existing.sustainType !== currentSustainType
      ) {
        shouldUpdatePrs = true;
        nextCustomList = customList.map(p => {
          if (p.id === selectedOptionId) {
            return {
              ...p,
              title: currentTitle,
              subtitle: currentSubtitle,
              duration: currentDuration,
              sustainType: currentSustainType as "auto" | "manual"
            };
          }
          return p;
        });
      }
    } else if (defaultPreset) {
      // It's a default preset, we can create an override in customList with its same ID
      const titleDiverged = currentTitle !== defaultPreset.title;
      const subtitleDiverged = currentSubtitle !== defaultPreset.subtitle;
      const durationDiverged = currentDuration !== defaultPreset.duration;
      const sustainTypeDiverged = currentSustainType !== defaultPreset.sustainType;

      if (titleDiverged || subtitleDiverged || durationDiverged || sustainTypeDiverged) {
        shouldUpdatePrs = true;
        
        // Check if there is an override already in custom list to update
        const alreadyHasOverride = customList.some(p => p.id === selectedOptionId);
        if (alreadyHasOverride) {
          nextCustomList = customList.map(p => {
            if (p.id === selectedOptionId) {
              return {
                ...p,
                title: currentTitle,
                subtitle: currentSubtitle,
                duration: currentDuration,
                sustainType: currentSustainType as "auto" | "manual"
              };
            }
            return p;
          });
        } else {
          nextCustomList = [
            ...customList,
            {
              id: defaultPreset.id,
              name: defaultPreset.name,
              title: currentTitle,
              subtitle: currentSubtitle,
              duration: currentDuration,
              sustainType: currentSustainType as "auto" | "manual"
            }
          ];
        }
      }
    }

    if (shouldUpdatePrs) {
      updateSettings({
        transitionCustomPresets: nextCustomList
      });

      // Also persist to server database instantly
      fetch("/api/youtube/settings-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...settings,
            transitionCustomPresets: nextCustomList
          }
        })
      }).catch(err => console.warn("Failed to sync updated presets on edit:", err));
    }
  }, [
    selectedOptionId,
    prevSelectedOptionId,
    settings.transitionTitle,
    settings.transitionSubtitle,
    settings.transitionDuration,
    settings.transitionSustainType,
    settings.transitionCustomPresets,
  ]);

  const allPresets = [
    ...defaultPresets.map(dp => {
      const override = (settings.transitionCustomPresets || []).find(p => p.id === dp.id);
      if (override) {
        return {
          ...dp,
          title: override.title,
          subtitle: override.subtitle,
          duration: override.duration,
          sustainType: override.sustainType
        };
      }
      return dp;
    }),
    ...(settings.transitionCustomPresets || [])
      .filter(p => !p.id.startsWith("preset_"))
      .map(p => ({
        id: p.id,
        name: p.name,
        title: p.title || p.name,
        subtitle: p.subtitle || "Vui lòng chờ giây lát...",
        duration: p.duration || 3,
        sustainType: p.sustainType || "auto"
      }))
  ];
  const selectedPreset = allPresets.find(p => p.id === selectedOptionId);
  const selectedOptionName = selectedPreset ? selectedPreset.name : "";

  const text = {
    title: language === "vi" ? "Studio Chuyển Cảnh OBS" : "OBS Transition Studio",
    subtitle: language === "vi" ? "Tự thiết kế màn hình chuyển cảnh hoạt ảnh chuyên nghiệp cho livestream" : "Self-design professional transition screens for your livestream",
    presetLabel: language === "vi" ? "Kiểu hoạt ảnh chuyển tiếp" : "Active Transition Type",
    presetDesc: language === "vi" ? "Chọn hiệu ứng hoạt ảnh chính khi bắt đầu chuyển cảnh" : "Select main motion effect of the screen transition screen",
    speedLabel: language === "vi" ? "Thời gian hiển thị chuyển cảnh (giây)" : "Transition Duration Space (seconds)",
    testBtn: language === "vi" ? "Kích Hoạt Thử Chuyển Cảnh" : "Trigger Sandbox Preview",
    obsTriggerBtn: language === "vi" ? "🎬 KÍCH HOẠT CHUYỂN CẢNH OBS" : "🎬 TRIGGER OBS TRANSITION",
    shutterOptions: language === "vi" ? "Cấu hình rèm kỹ thuật số" : "Digital Shutter Colors",
    previewTitle: language === "vi" ? "Mô Phỏng Trực Quan Thời Gian Thực" : "Real-Time Visual Sandbox",
    previewDesc: language === "vi" ? "Mô phỏng chính xác những gì người xem nhìn thấy trên OBS Studio" : "Wysiwyg simulator of your configured live brand scene",
    toggleMock: language === "vi" ? "Đổi màn hình cơ sở" : "Toggle Base Panels",
    physicsLabel: language === "vi" ? "Công nghệ gia tốc: SPRING PHYSICS" : "Acceleration Engine: SPRING PHYSICS",
    shutter: language === "vi" ? "🚪 Cửa sập kỹ thuật số (Shutter Effect)" : "🚪 Digital Shutter Effect",
    fade: language === "vi" ? "💨 Mờ dần cao cấp (Crossfade Theme)" : "💨 Premium Crossfade Theme",
    slide: language === "vi" ? "➡️ Trượt ngang mượt mà (Spring Slide)" : "➡️ Smooth Spring Horizon Slide",
    zoom: language === "vi" ? "🔍 Thu phòng êm ái (Zooming Out)" : "🔍 Ambient Depth Zoom Out",
    rotate: language === "vi" ? "🔄 Xoay góc 3D (3D Spiral Card)" : "🔄 Elegant 3D Spiral Rotation",
  };

  const handleTriggerTest = () => {
    if (isLocalSimulating) {
      if (localSimTimeout) clearTimeout(localSimTimeout);
      setIsLocalSimulating(false);
      showToast(language === "vi" ? "🚪 Đã dừng mô phỏng thử!" : "🚪 Simulation stopped!");
      return;
    }

    // Play local chimes
    const soundType = settings.transitionSoundType || "bell";
    playTransitionSound(soundType);

    // Swap simulated tabs
    setTriggerCount(c => c + 1);
    setPreviewTab(prev => prev === "screen_a" ? "screen_b" : "screen_a");

    // Trigger local screen cover
    setIsLocalSimulating(true);

    const sustainType = settings.transitionSustainType || "auto";
    if (sustainType === "auto") {
      const duration = (settings.transitionDuration || 3) * 1050;
      const timeout = setTimeout(() => {
        setIsLocalSimulating(false);
      }, duration);
      setLocalSimTimeout(timeout);
    }

    showToast(
      language === "vi" 
        ? `🎬 Đang mô phỏng rèm: "${settings.transitionType || "shutter"}" (${sustainType === "auto" ? `${settings.transitionDuration || 3} giây` : "vô hạn, click lại để tắt"})` 
        : `🎬 Sandbox active: ${settings.transitionType || "shutter"}`
    );
  };

  const triggerObsTransitionGlobal = async () => {
    const nextActive = !settings.transitionActive;
    const updatedCount = (settings.transitionTriggerCount || 0) + 1;

    // Save locally
    updateSettings({
      transitionActive: nextActive,
      transitionTriggerCount: updatedCount
    });

    if (nextActive) {
      // Fire sound effect locally on Streamer controller panel
      const soundType = settings.transitionSoundType || "bell";
      playTransitionSound(soundType);

      // Handle controller auto shutoff in auto sustain type
      const sustainType = settings.transitionSustainType || "auto";
      if (sustainType === "auto") {
        setTimeout(async () => {
          updateSettings({ transitionActive: false });
          try {
            await fetch("/api/youtube/settings-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                settings: { 
                  ...settings, 
                  transitionActive: false 
                } 
              }),
            });
          } catch (e) {
            console.error(e);
          }
        }, (settings.transitionDuration || 3) * 1000);
      }
    }

    // Persist settings directly onto synchronized server JSON instantly
    try {
      const { soundFileBase64, ...settingsToSave } = { 
        ...settings, 
        transitionActive: nextActive, 
        transitionTriggerCount: updatedCount 
      };
      await fetch("/api/youtube/settings-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsToSave }),
      });
      showToast(
        language === "vi"
          ? (nextActive 
              ? `🚀 Đã kích hoạt sập rèm OBS (${settings.transitionSustainType === "manual" ? "thủ công, bấm lại để đóng" : `${settings.transitionDuration || 3} giây`})!` 
              : "🚪 Đã mở rèm, kết thúc chuyển cảnh OBS!")
          : (nextActive ? "🚀 OBS Transition overlay activated!" : "🚪 OBS Transition closed!")
      );
    } catch (err) {
      console.warn("Failed to instantly sync trigger global transition to server:", err);
      showToast(
        language === "vi"
          ? "⚠️ Đã kích hoạt chuyển cảnh local (kết nối máy chủ gặp gián đoạn)"
          : "⚠️ Fired transition locally (server connection slow)"
      );
    }
  };

  const handlePresetClick = async (preset: { id: string; name: string; title: string; subtitle: string; duration: number; sustainType: "auto" | "manual" }) => {
    // If clicking the currently active option, deactivate it immediately
    if (selectedOptionId === preset.id && settings.transitionActive) {
      setSelectedOptionId(null);
      setIsLocalSimulating(false);
      if (localSimTimeout) clearTimeout(localSimTimeout);

      const updatedSettings = {
        ...settings,
        transitionActive: false,
      };

      updateSettings(updatedSettings);

      try {
        const { soundFileBase64, ...settingsToSave } = updatedSettings;
        await fetch("/api/youtube/settings-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: settingsToSave }),
        });
        showToast(
          language === "vi"
            ? `🚪 Đã hủy chuyển cảnh: "${preset.name}"`
            : `🚪 Cancelled transition: "${preset.name}"`
        );
      } catch (err) {
        console.warn("Failed to cancel preset transition:", err);
      }
      return;
    }

    // Otherwise, select and trigger this option
    setSelectedOptionId(preset.id);

    const nextActive = true; 
    const updatedCount = (settings.transitionTriggerCount || 0) + 1;
    const durationVal = preset.duration || settings.transitionDuration || 3;
    const sustainTypeVal = settings.transitionSustainType || "auto";

    // Build the fully resolved settings block
    const updatedSettings = {
      ...settings,
      transitionTitle: preset.title || preset.name,
      transitionSubtitle: preset.subtitle || "Vui lòng chờ giây lát...",
      transitionDuration: durationVal,
      transitionSustainType: sustainTypeVal,
      transitionActive: nextActive,
      transitionTriggerCount: updatedCount
    };

    updateSettings(updatedSettings);

    // Play chime sound locally
    const soundType = settings.transitionSoundType || "bell";
    playTransitionSound(soundType);

    // Toggle simulated previews
    setTriggerCount(c => c + 1);
    setIsLocalSimulating(true);

    if (localSimTimeout) clearTimeout(localSimTimeout);
    
    if (sustainTypeVal === "auto") {
      const timeout = setTimeout(() => {
        setIsLocalSimulating(false);
      }, durationVal * 1050); 
      setLocalSimTimeout(timeout);
    }

    try {
      const { soundFileBase64, ...settingsToSave } = updatedSettings;
      await fetch("/api/youtube/settings-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsToSave }),
      });

      showToast(
        language === "vi"
          ? `🚀 Kích hoạt chuyển cảnh nhanh: "${preset.name}" (${sustainTypeVal === "manual" ? "vô hạn" : `${durationVal} giây`})`
          : `🚀 Direct transition preset triggered: "${preset.name}"`
      );

      // Auto clear timeout from server if it is auto close
      if (sustainTypeVal === "auto") {
        setTimeout(async () => {
          updateSettings({ transitionActive: false });
          try {
            await fetch("/api/youtube/settings-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                settings: { 
                  ...updatedSettings, 
                  transitionActive: false 
                } 
              }),
            });
          } catch (e) {
            console.error(e);
          }
        }, durationVal * 1000);
      }
    } catch (err) {
      console.warn("Failed to instantly sync preset trigger state:", err);
    }
  };

  const handleAddNewPreset = (name: string) => {
    const currentCustom = settings.transitionCustomPresets || [];
    const created = {
      id: "custom_" + Date.now(),
      name: name,
      title: name,
      subtitle: "Vui lòng chờ giây lát...",
      duration: settings.transitionDuration || 3,
      sustainType: "auto" as const
    };
    const nextCustomList = [...currentCustom, created];
    updateSettings({
      transitionCustomPresets: nextCustomList
    });
    
    // Save to server
    fetch("/api/youtube/settings-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        settings: { 
          ...settings, 
          transitionCustomPresets: nextCustomList 
        } 
      }),
    });

    showToast(language === "vi" ? `✨ Đã lưu tùy chọn chuyển cảnh: ${name}` : `✨ Transition preset saved: ${name}`);
  };

  // Logo file upload handler converting to Base64 store
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast(language === "vi" ? "⚠️ Kích thước logo phải nhỏ hơn 2MB!" : "⚠️ Logo must be under 2MB!");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      updateSettings({
        transitionImageBase64: reader.result as string,
        transitionImageUrl: "" // Clear url since base64 is custom prioritized
      });
      showToast(language === "vi" ? "🎨 Đã tải ảnh Logo lên thành công!" : "🎨 Brand logo uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  // Preset Gradients options
  const presetsGradients = [
    { name: "Cosmic Lavender", value: "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #030712 100%)" },
    { name: "Neon Emerald", value: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #020617 100%)" },
    { name: "Twilight Crimson", value: "linear-gradient(135deg, #500724 0%, #2e1065 50%, #0f172a 100%)" },
    { name: "Cyberpunk Sunrise", value: "linear-gradient(135deg, #450a0a 0%, #701a75 55%, #020617 100%)" },
    { name: "Ice Deep Sea", value: "linear-gradient(135deg, #0f172a 0%, #0284c7 100%)" },
  ];

  const getPreviewBackgroundStyle = () => {
    const bgType = settings.transitionBgType || "gradient";
    if (bgType === "solid") {
      return { backgroundColor: settings.transitionBgColor || "#0f172a" };
    }
    if (bgType === "gradient") {
      return { background: settings.transitionBgGradient || "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #030712 100%)" };
    }
    return {
      background: `linear-gradient(to bottom, rgba(15,23,42,0.85), rgba(3,7,18,0.95)), url(${settings.transitionImageUrl || ""})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    };
  };

  const activeBrandingImg = settings.transitionImageBase64 || settings.transitionImageUrl;

  return (
    <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5 min-h-0 animate-in fade-in-50 duration-200" id="transition-studio-workspace">
      {/* LEFT COLUMN: CONTROLS CONFIGURATION */}
      <div className="col-span-1 lg:col-span-2 bg-slate-900/40 border-r border-slate-800/80 flex flex-col overflow-y-auto custom-scrollbar p-5 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-pink-500 animate-spin" style={{ animationDuration: "5s" }} />
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
              {text.title}
            </h3>
          </div>
          <p className="text-[11px] text-slate-450 leading-relaxed">
            {text.subtitle}
          </p>
        </div>

        {/* OBS TRANSITION OVERLAY LINK IMPORT CARD */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/50 border border-indigo-500/20 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-indigo-400" />
              <span>Link OBS Transition Overlay độc lập</span>
            </span>
            <span className="bg-indigo-500/10 text-indigo-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono uppercase border border-indigo-500/20 shadow-sm animate-pulse">
              OBS Link
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            {language === "vi" 
              ? "Sao chép liên kết chuyên biệt này và cài đặt vào OBS dưới dạng nguồn trình duyệt Browser Source riêng biệt." 
              : "Copy this unique link and insert into OBS as a standalone browser source."}
          </p>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 p-1.5 pl-2.5 rounded-lg select-all">
            <input 
              type="text" 
              readOnly 
              value={obsTransitionLink} 
              className="bg-transparent border-none text-[10px] font-mono text-indigo-305 w-full focus:outline-none select-all overflow-hidden truncate"
            />
            <button
              type="button"
              onClick={onCopyObsTransitionLink}
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white p-1.5 rounded-md cursor-pointer transition-all flex items-center gap-1 shrink-0 px-2 text-[10px] font-bold uppercase shadow"
            >
              <Copy className="w-3 h-3" />
              <span>Sao Chép</span>
            </button>
          </div>
          <div className="text-[9px] text-slate-400 leading-normal bg-indigo-500/5 p-2 rounded border border-indigo-500/10">
            💡 <strong>OBS Setup:</strong> Rộng: <b>1920</b>, Cao: <b>1080</b> (hoặc độ phân giải stream của bạn). Đừng quên tích chọn <i>"Refresh browser when scene becomes active"</i> để tối ưu phục hồi rèm!
          </div>
        </div>

        {/* TRANSITION PRESETS DECK */}
        <div className="bg-slate-900/50 border border-indigo-500/10 p-4 rounded-xl space-y-3" id="transition-quick-presets-deck-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <Layers className="w-3.5 h-3.5 text-pink-400" />
              <span>Chuyển Cảnh Nhanh (Options)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-300 text-[9px] font-extrabold px-2 py-1 rounded cursor-pointer transition-all uppercase flex items-center gap-1 shrink-0"
              id="toggle-add-preset-form-btn"
            >
              <Plus className="w-3 h-3 text-indigo-400" />
              <span>{showAddForm ? "Đóng" : "Thêm Nút"}</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Bấm các tùy chọn dưới đây để tự động kích hoạt chuyển cảnh tương ứng trên màn hình livestream và OBS.
          </p>

          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1" id="presets-buttons-grid">
            {/* Render defaults */}
            {defaultPresets.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`w-full bg-slate-950 p-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                  selectedOptionId === preset.id 
                    ? "border-pink-500/80 text-pink-450 bg-indigo-950/30 shadow-indigo-505/10" 
                    : "border-slate-800 text-slate-200 hover:border-indigo-500/35 hover:bg-indigo-950/15"
                }`}
                id={`preset-btn-${preset.id}`}
              >
                {preset.name}
              </button>
            ))}

            {/* Render custom presets */}
            {(settings.transitionCustomPresets || [])
              .filter(p => !p.id.startsWith("preset_"))
              .map(preset => (
              <div 
                key={preset.id}
                className={`border rounded-xl flex items-center justify-between gap-1.5 transition-all text-left relative group/custom ${
                  selectedOptionId === preset.id
                    ? "border-pink-500/80 bg-indigo-950/30"
                    : "border-slate-800 bg-slate-950 hover:border-indigo-500/35 hover:bg-indigo-950/10"
                }`}
                id={`custom-preset-container-${preset.id}`}
              >
                <button
                   type="button"
                   onClick={() => handlePresetClick({
                     id: preset.id,
                     name: preset.name,
                     title: preset.title || preset.name,
                     subtitle: preset.subtitle || "Vui lòng chờ giây lát...",
                     duration: preset.duration || 3,
                     sustainType: preset.sustainType || "auto"
                   })}
                  className="flex-1 text-left p-2.5 cursor-pointer font-bold text-xs truncate min-w-0"
                  id={`custom-preset-btn-${preset.id}`}
                >
                  <span className={`${
                    selectedOptionId === preset.id ? "text-pink-450" : "text-slate-200 group-hover/custom:text-pink-400"
                  } transition-colors block truncate`}>
                    {preset.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextList = (settings.transitionCustomPresets || []).filter(p => p.id !== preset.id);
                    updateSettings({ transitionCustomPresets: nextList });
                    fetch("/api/youtube/settings-sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ settings: { ...settings, transitionCustomPresets: nextList } }),
                    });
                    if (selectedOptionId === preset.id) {
                      setSelectedOptionId(null);
                    }
                    showToast(language === "vi" ? `🗑️ Đã xóa tùy chọn: ${preset.name}` : `🗑️ Deleted option: ${preset.name}`);
                  }}
                  className="hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg cursor-pointer transition-all shrink-0 mr-1.5"
                  title="Xóa tùy chọn này"
                  id={`delete-custom-preset-btn-${preset.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* New Option creation inline form */}
          {showAddForm && (
            <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg space-y-2.5 animate-in slide-in-from-top-2 duration-200" id="add-preset-inline-form">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest pl-0.5 block">Thêm tùy chọn mới</span>
              
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block font-semibold">Tên Tùy Chọn</span>
                <input
                  type="text"
                  maxLength={20}
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g. Giải Lao 🍿"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-550 font-bold"
                  id="new-preset-display-name-input"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!newPresetName.trim()) {
                    showToast(language === "vi" ? "⚠️ Hãy nhập Tên Nút chuyển cảnh mới!" : "⚠️ Fill name field!");
                    return;
                  }
                  handleAddNewPreset(newPresetName);
                  // Reset form
                  setNewPresetName("");
                  setShowAddForm(false);
                }}
                className="w-full bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white py-2 px-2 rounded-lg text-[11px] font-bold uppercase transition-all shadow cursor-pointer mt-1"
                id="save-new-preset-btn"
              >
                💾 Lưu Tùy Chọn Mới
              </button>
            </div>
          )}
        </div>

        {/* DETAILS SECTION: ONLY RENDERS WHEN AN OPTION BUTTON IS CLICKED/SELECTED */}
        {selectedOptionId && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-300" id="options-details-group">
            {/* Active Selected Option Indicator */}
            <div className="bg-slate-900/40 border border-pink-500/15 p-3 rounded-xl flex items-center justify-between">
              <span className="text-[11px] font-bold text-pink-400 flex items-center gap-1.5 uppercase">
                <Settings className="w-3.5 h-3.5 text-pink-400 animate-spin" style={{ animationDuration: "12s" }} />
                <span>Cấu hình rèm: <strong className="text-white hover:text-pink-300 transition-colors ml-1">{selectedOptionName}</strong></span>
              </span>
              <button 
                type="button" 
                onClick={() => setSelectedOptionId(null)}
                className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer bg-slate-950 px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 transition"
                id="close-options-details-btn"
              >
                {language === "vi" ? "Đóng ✕" : "Close ✕"}
              </button>
            </div>

            {/* 2. Text Contents Card */}
            <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-3.5" id="options-details-texts-card">
              <label className="text-[11.5px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                <span>{language === "vi" ? "Chữ hiển thị (Texts)" : "Branding texts"}</span>
              </label>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-450 block font-semibold">Dòng chữ chính (Tiêu đề rèm)</span>
                  <input
                    type="text"
                    value={settings.transitionTitle || ""}
                    onChange={(e) => updateSettings({ transitionTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                    placeholder="e.g. LIVE STARTING SOON"
                  />
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-450 block font-semibold">Dòng chữ phụ (Mô tả rèm)</span>
                  <textarea
                    value={settings.transitionSubtitle || ""}
                    onChange={(e) => updateSettings({ transitionSubtitle: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium custom-scrollbar"
                    placeholder="e.g. Vui lòng đợi trong giây lát..."
                  />
                </div>
              </div>
            </div>

            {/* 3. Color & Branding Card */}
            <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-3.5" id="options-details-branding-card">
              <label className="text-[11.5px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>{language === "vi" ? "Nền & Thương hiệu (Branding)" : "Branding & Backdrop"}</span>
              </label>

              <div className="space-y-3">
                {/* Background Style choice */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-450 block font-semibold">Kiểu nền giao diện</span>
                  <select
                    value={settings.transitionBgType || "gradient"}
                    onChange={(e) => updateSettings({ transitionBgType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
                  >
                    <option value="gradient">🎨 Nền dải màu (Linear Gradient Presets)</option>
                    <option value="solid">⬛ Nền màu đơn sắc (Solid Color Background)</option>
                    <option value="custom_image">🖼️ Ảnh nền tùy chỉnh (Custom Image Link)</option>
                  </select>
                </div>

                {/* Custom backgrounds context rendering */}
                {settings.transitionBgType === "solid" && (
                  <div className="space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-850">
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider pl-0.5">Chọn màu đơn sắc</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={settings.transitionBgColor || "#0f172a"}
                        onChange={(e) => updateSettings({ transitionBgColor: e.target.value })}
                        className="w-7 h-7 border-0 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        maxLength={7}
                        value={settings.transitionBgColor || "#0f172a"}
                        onChange={(e) => updateSettings({ transitionBgColor: e.target.value })}
                        className="w-full bg-transparent border-0 text-xs font-mono font-bold text-slate-300 uppercase tracking-widest pl-1"
                      />
                    </div>
                  </div>
                )}

                {settings.transitionBgType === "gradient" && (
                  <div className="space-y-2 bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider pl-0.5">Preset Gradient phối sọc</span>
                    <select
                      value={settings.transitionBgGradient || "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #030712 100%)"}
                      onChange={(e) => updateSettings({ transitionBgGradient: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-805 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    >
                      {presetsGradients.map((g) => (
                        <option key={g.name} value={g.value}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {settings.transitionBgType === "custom_image" && (
                  <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider pl-0.5">Đường dẫn URL ảnh nền</span>
                    <input
                      type="text"
                      value={settings.transitionImageUrl || ""}
                      onChange={(e) => updateSettings({ transitionImageUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-805 rounded-md px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="Paste direct .png/.jpg link"
                    />
                  </div>
                )}

                {/* Custom Logo Brand upload */}
                <div className="space-y-1.5 border-t border-slate-800/40 pt-2">
                  <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                    <Image className="w-3.5 h-3.5 text-slate-555" />
                    <span>Logo / Điểm nhấn trung tâm</span>
                  </span>

                  {activeBrandingImg ? (
                    <div className="flex items-center justify-between gap-3 bg-slate-950 p-2 rounded-lg border border-slate-850">
                      <div className="flex items-center gap-2">
                        <img
                          src={activeBrandingImg}
                          alt="Brand preview"
                          className="w-9 h-9 object-contain rounded bg-slate-900 border border-slate-800 p-0.5"
                        />
                        <div className="text-left">
                          <span className="text-[10px] font-bold text-slate-200 block truncate max-w-[120px]">Logo Đã Thiết Lập</span>
                          <span className="text-[8px] font-mono text-emerald-400 block font-bold">BASE64 / URL</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSettings({ transitionImageBase64: "", transitionImageUrl: "" })}
                        className="p-1 px-1.5 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/20 text-rose-400 rounded transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <label className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-350 text-[11px] font-bold py-2 border border-slate-850 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center">
                        <Plus className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Tải ảnh logo lên</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Speed & Sound Audio notification card */}
            <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-3.5" id="options-details-fx-card">
              <label className="text-[11.5px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                <span>{language === "vi" ? "Thời gian & Âm thanh (FXs)" : "Timing & FXs"}</span>
              </label>

              <div className="space-y-3.5">
                {/* Duration Mode Selector */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold pl-0.5">Kiểu thời lượng rèm</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSettings({ transitionSustainType: "auto" })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        (settings.transitionSustainType || "auto") === "auto"
                          ? "bg-pink-600/20 border-pink-500 text-pink-400"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-350 hover:bg-slate-900"
                      }`}
                      id="duration-mode-auto-btn"
                    >
                      ⏱️ Ít giây (Tự tắt)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ transitionSustainType: "manual" })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        settings.transitionSustainType === "manual"
                          ? "bg-pink-600/20 border-pink-500 text-pink-400"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-350 hover:bg-slate-900"
                      }`}
                      id="duration-mode-infinite-btn"
                    >
                      ♾️ Vô hạn (Thủ công)
                    </button>
                  </div>
                </div>

                {/* Speed duration - Only render if auto close sustain type is active */}
                {(settings.transitionSustainType || "auto") === "auto" && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Thời gian tự tắt rèm</span>
                      <span className="font-bold text-pink-500 font-mono">{settings.transitionDuration || 3} giây</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={settings.transitionDuration || 3}
                      onChange={(e) => updateSettings({ transitionDuration: parseInt(e.target.value, 10) })}
                      className="w-full accent-pink-500 cursor-pointer"
                    />
                  </div>
                )}

                {/* Sound Choice */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1 pl-0.5">
                    <Music className="w-3 h-3 text-slate-500" />
                    <span>Âm thanh đi kèm khi sập rèm</span>
                  </span>
                  <select
                    value={settings.transitionSoundType || "bell"}
                    onChange={(e) => updateSettings({ transitionSoundType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="none">🔇 Không phát âm thanh (Silent)</option>
                    <option value="bell">🔔 Tiếng chuông bính bong thanh khiết (Bell Chime)</option>
                    <option value="pop">🍿 Tiếng nổ tách tinh nghịch (Organic Pop)</option>
                    <option value="synth">⚡ Rít vụt âm kĩ thuật số tối tân (Digital Sweep)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Shutter specific details */}
            {(settings.transitionType || "shutter") === "shutter" && (
              <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200" id="options-details-shutter-card">
                <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5" />
                  <span>{text.shutterOptions}</span>
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Số lượng cột sọc sập xuôi</span>
                    <span className="font-mono text-cyan-400 font-bold">5 Cốt sọc (Default)</span>
                  </div>
                  <div className="flex justify-between text-[11px] border-t border-slate-850 pt-2.5">
                    <span className="text-slate-400">Màu rèm chắn kĩ thuật số</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: accentColor }} />
                      <span className="text-slate-300 font-bold uppercase">{accentColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: MOTION SANBDX WORKSPACE */}
      <div className="col-span-1 lg:col-span-3 bg-slate-950 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        {/* Workspace Title Card */}
        <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-pink-400 animate-pulse" />
            <div>
              <h3 className="text-xs font-bold text-slate-100">{text.previewTitle}</h3>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                {text.previewDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPreviewTab(prev => prev === "screen_a" ? "screen_b" : "screen_a")}
            className="font-bold text-[9px] bg-slate-950 hover:bg-slate-900 text-pink-400 border border-slate-805 px-2 py-1 rounded transition-all cursor-pointer select-none uppercase active:scale-95"
          >
            {text.toggleMock}
          </button>
        </div>

        {/* HIGH-END INTERACTIVE TELEMETRY SCREEN */}
        <div 
          className="flex-1 min-h-[480px] rounded-2xl bg-slate-980 border border-slate-900/90 relative overflow-hidden flex flex-col justify-between p-6 select-none shadow-inner"
          id="simulation-telemetry-canvas"
        >
          {/* Top aesthetic grid line decorators */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 animate-pulse" style={{ animationDuration: "10s" }} />

          {/* Interactive Dynamic Transition viewport */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center rounded-xl bg-slate-950/60 border border-slate-900/50 z-10 min-h-[360px]">
            <ScreenTransition transitionKey={`${previewTab}-${triggerCount}`} type={settings.transitionType || "shutter"}>
              {isLocalSimulating ? (
                /* Renders 100% exact live simulated transition overlay cover! */
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20"
                  style={getPreviewBackgroundStyle()}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
                  
                  {activeBrandingImg ? (
                    <img 
                      src={activeBrandingImg} 
                      alt="Local Logo brand preview"
                      className="max-w-[100px] max-h-[100px] object-contain mb-4 animate-bounce bg-slate-900/50 p-2 rounded-xl border border-slate-800"
                    />
                  ) : (
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-550/30 text-indigo-400 mb-4 animate-bounce">
                      <Tv className="w-8 h-8" />
                    </div>
                  )}

                  <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-wider" style={{ fontFamily: settings.fontFamily }}>
                    {settings.transitionTitle || "STREAMING SOON"}
                  </h3>
                  
                  <p className="text-xs text-slate-300 max-w-sm mt-2 font-medium" style={{ fontFamily: settings.fontFamily }}>
                    {settings.transitionSubtitle || "Chuẩn bị bắt đầu trong giây lát..."}
                  </p>

                  <div className="absolute bottom-6 flex items-center gap-1.5 text-[9px] font-mono font-bold text-indigo-300 uppercase shrink-0 opacity-40">
                    <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
                    <span>Sandbox Rendering...</span>
                  </div>
                </div>
              ) : previewTab === "screen_a" ? (
                <div className="text-center p-6 space-y-4 max-w-sm" key="screen_a_payload_key">
                  <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-555/20 text-indigo-400">
                    <Tv className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-widest font-sans">
                      MÀN HÌNH CHỜ LIVE (LỚP A)
                    </h4>
                    <p className="text-10px text-slate-500 mt-2 font-medium leading-relaxed">
                      {language === "vi" 
                        ? "Mô phỏng Streamer đang phát trò chơi hoặc giao lưu trực tuyến với người hâm mộ." 
                        : "Simulating live gameplay streaming feed overlay mode to support dynamic context layers."}
                    </p>
                  </div>
                  <div className="inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    SCENE STATUS: ONLINE FEED A
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-4 max-w-sm" key="screen_b_payload_key">
                  <div className="inline-flex p-3 rounded-2xl bg-pink-500/10 border border-pink-550/20 text-pink-400">
                    <Sparkles className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-widest font-sans">
                      MÀN HÌNH NGHỈ GIỮA HIỆP (LỚP B)
                    </h4>
                    <p className="text-10px text-slate-500 mt-2 font-medium leading-relaxed">
                      {language === "vi" 
                        ? "Mô phỏng Streamer vừa thực hiện thao tác chuyển tiếp rèm hoạt ảnh." 
                        : "Harnessing spring curves to switch user views seamlessly inside control deck."}
                    </p>
                  </div>
                  <div className="inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-pink-950/20 border border-pink-900/30 text-pink-400">
                    SCENE STATUS: TRANSITED STATE B
                  </div>
                </div>
              )}
            </ScreenTransition>
          </div>

          {/* Acceleration Curve telemetry overlay */}
          <div className="shrink-0 p-3 bg-slate-950/90 border border-slate-900 rounded-xl flex items-center justify-between gap-4 z-10 mt-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400 animate-pulse" />
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-350 block uppercase leading-none">
                  {text.physicsLabel}
                </span>
                <span className="text-[8px] text-slate-500 font-semibold block uppercase leading-none mt-1">
                  Duration: {settings.transitionDuration || 3}s • Type: {settings.transitionType || "shutter"} • Chime: {settings.transitionSoundType || "bell"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wide">
                ACCEL CALIBRATED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
