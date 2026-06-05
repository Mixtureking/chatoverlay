import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useAnimationControls } from "motion/react";
import { Sparkles, Tv } from "lucide-react";
import { OverlaySettings } from "../types";

// Sound synthesizer helper for high-end audio chime notifications
export const playTransitionSound = (soundType: "none" | "bell" | "pop" | "synth") => {
  if (soundType === "none" || !soundType) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (soundType === "bell") {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1150, now);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } else if (soundType === "pop") {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (soundType === "synth") {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.08);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.35);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.45);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(550, now);
      osc2.frequency.linearRampToValueAtTime(1050, now + 0.45);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.9);
      osc2.stop(now + 0.9);
    }
  } catch (err) {
    console.warn("Synth transition audio error:", err);
  }
};

interface ScreenTransitionOverlayProps {
  settings: OverlaySettings;
}

export default function ScreenTransitionOverlay({
  settings,
}: ScreenTransitionOverlayProps) {
  const [isActive, setIsActive] = useState(false);
  
  // Track trigger increments strictly to prevent re-renders breaking things
  const lastTriggerCountRef = useRef<number>(settings.transitionTriggerCount || 0);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor count increments
  useEffect(() => {
    const isTransitionActive = !!settings.transitionActive;
    const currentTriggerCount = settings.transitionTriggerCount || 0;

    if (currentTriggerCount > lastTriggerCountRef.current) {
      // It's a new trigger call! Turn on.
      lastTriggerCountRef.current = currentTriggerCount;
      setIsActive(true);
      
      // Stop old timers
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      
      // Play sound
      const soundType = settings.transitionSoundType || "bell";
      playTransitionSound(soundType);
      
      // Set new auto-close
      const sustainType = settings.transitionSustainType || "auto";
      if (sustainType === "auto") {
        const duration = (settings.transitionDuration || 3) * 1000;
        autoCloseTimerRef.current = setTimeout(() => {
          setIsActive(false);
          autoCloseTimerRef.current = null;
          
          // Fire-and-forget sync to off, using PATCH so we don't clobber layout settings
          fetch("/api/youtube/settings-sync", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ settings: { transitionActive: false } })
          }).catch(() => {});
        }, duration);
      }
    } else if (!isTransitionActive && isActive) {
      // Transition was turned off externally (e.g. from Dashboard manually clicking off)
      setIsActive(false);
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    }
  }, [
    settings.transitionActive, 
    settings.transitionTriggerCount, 
    settings.transitionSustainType, 
    settings.transitionDuration, 
    settings.transitionSoundType, 
    isActive
  ]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  // Determine Background stylings
  const getBackgroundStyle = () => {
    const bgType = settings.transitionBgType || "gradient";
    if (bgType === "solid") {
      return { backgroundColor: settings.transitionBgColor || "#0f172a" };
    }
    if (bgType === "gradient") {
      return { background: settings.transitionBgGradient || "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #030712 100%)" };
    }
    // Custom Background Image or patterns fallback
    return {
      background: `linear-gradient(to bottom, rgba(15,23,42,0.85), rgba(3,7,18,0.95)), url(${settings.transitionImageUrl || ""})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    };
  };

  // Obtain motion kinematics based on configuration animationType
  const getVariants = () => {
    const type = settings.transitionType || "shutter";
    switch (type) {
      /** Preset: curtain (màn rèm dọc) */
      case "curtain":
        return {
          initial: { opacity: 1 },
          animate: { opacity: 1, transition: { staggerChildren: 0.05 } },
          exit: { opacity: 0, transition: { duration: 0.1, delay: 0.4 } }
        };
      /** Preset: glitch (hiệu ứng glitch kỹ thuật số) */
      case "glitch":
        return {
          initial: { opacity: 0, x: -4 },
          animate: { 
            opacity: [0, 1, 0, 1], 
            x: [0, -4, 4, -2, 0],
            transition: { duration: 0.3, times: [0, 0.3, 0.6, 1] } 
          },
          exit: { scale: 0.8, opacity: 0, transition: { duration: 0.2 } }
        };
      /** Preset: morph (biến hình từ trung tâm) */
      case "morph":
        return {
          initial: { clipPath: "circle(0% at 50% 50%)" },
          animate: { clipPath: "circle(150% at 50% 50%)", transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] } },
          exit: { clipPath: "circle(0% at 50% 50%)", transition: { duration: 0.45, ease: "easeInOut" } }
        };
      case "slide":
        return {
          initial: { x: "100%", opacity: 0 },
          animate: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 180, damping: 25 } },
          exit: { x: "-100%", opacity: 0, transition: { duration: 0.35, ease: "easeInOut" } }
        };
      case "zoom":
        return {
          initial: { scale: 0.1, opacity: 0 },
          animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 140, damping: 20 } },
          exit: { scale: 1.8, opacity: 0, transition: { duration: 0.4, ease: "easeIn" } }
        };
      case "rotate":
        return {
          initial: { rotate: 180, scale: 0, opacity: 0 },
          animate: { rotate: 0, scale: 1, opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
          exit: { rotate: -180, scale: 0, opacity: 0, transition: { duration: 0.5, ease: "easeIn" } }
        };
      case "shutter":
        return {
          initial: { scaleY: 0, opacity: 0 },
          animate: { scaleY: 1, opacity: 1, transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } },
          exit: { scaleY: 0, opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }
        };
      case "fade":
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1, transition: { duration: 0.4, ease: "easeInOut" } },
          exit: { opacity: 0, transition: { duration: 0.35, ease: "easeInOut" } }
        };
    }
  };

  const currentVariants = getVariants();
  const transitionImg = settings.transitionImageBase64 || settings.transitionImageUrl;
  const type = settings.transitionType || "shutter";
  const contentDelayOffset = type === "morph" ? 0.3 : 0;
  
  // Custom Glitch component logic encapsulation
  const GlitchSubContainer = ({ children }: { children: React.ReactNode }) => {
    const controls = useAnimationControls();
    useEffect(() => {
      if (type !== "glitch") return;
      const timer = setInterval(() => {
        controls.start({
          x: [0, -3, 3, -1, 0],
          transition: { duration: 0.15 }
        });
      }, 2500);
      return () => clearInterval(timer);
    }, [controls]);
    
    if (type !== "glitch") return <>{children}</>;
    return (
      <motion.div animate={controls} className="w-full h-full relative z-10 flex flex-col items-center justify-center">
        {children}
      </motion.div>
    );
  };

  return (
    <div className="w-full h-full bg-transparent overflow-hidden relative" id="obs-transition-layer-root">
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={`overlay-session-${settings.transitionTriggerCount}-${type}`}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={currentVariants}
            style={type === "curtain" ? {} : getBackgroundStyle()}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 z-50 origin-center"
            id={`transition-animation-overlay-${settings.transitionTriggerCount}`}
          >
            {type === "curtain" && (
              <>
                <motion.div 
                  variants={{
                    initial: { x: "-100%" },
                    animate: { x: 0, transition: { type: "spring", stiffness: 120, damping: 20 } },
                    exit: { x: "-100%", transition: { duration: 0.4, ease: "easeInOut" } }
                  }}
                  style={{ ...getBackgroundStyle(), backgroundSize: "200% 100%", backgroundPosition: "left center" }}
                  className="absolute top-0 left-0 w-1/2 h-full z-0 overflow-hidden"
                />
                <motion.div 
                  variants={{
                    initial: { x: "100%" },
                    animate: { x: 0, transition: { type: "spring", stiffness: 120, damping: 20 } },
                    exit: { x: "100%", transition: { duration: 0.4, ease: "easeInOut" } }
                  }}
                  style={{ ...getBackgroundStyle(), backgroundSize: "200% 100%", backgroundPosition: "right center" }}
                  className="absolute top-0 right-0 w-1/2 h-full z-0 border-l border-white/5 overflow-hidden"
                />
              </>
            )}

            {type === "glitch" && (
              <div className="absolute inset-0 z-0 bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(0,0,0,0.1)_3px,rgba(0,0,0,0.1)_4px)] pointer-events-none" />
            )}

            <GlitchSubContainer>
              {/* Ambient Animated Grid backing */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

              {/* Custom Logo Brand */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0, transition: { delay: 0.25 + contentDelayOffset, type: "spring" } }}
                className="z-10 mb-6 shrink-0"
                id="transition-logo-branding-wrapper"
              >
                {transitionImg ? (
                  <img
                    src={transitionImg}
                    alt="Stream Transition Brand"
                    referrerPolicy="no-referrer"
                    className="max-w-[140px] max-h-[140px] object-contain drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)] rounded-xl border border-slate-700/30 p-2 bg-slate-900/40"
                    id="transition-custom-brand-logo"
                  />
                ) : (
                  <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                    <Tv className="w-10 h-10" />
                  </div>
                )}
              </motion.div>

              {/* Text Contents */}
              <div className="z-10 space-y-3.5 max-w-xl">
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: { delay: 0.35 + contentDelayOffset, duration: 0.4 } }}
                  className="text-3xl md:text-5xl font-black tracking-widest text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                  id="transition-overlay-title"
                  style={{ fontFamily: settings.fontFamily || "Inter" }}
                >
                  {settings.transitionTitle || "STREAMING SOON"}
                </motion.h2>

                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: { delay: 0.45 + contentDelayOffset, duration: 0.4 } }}
                  className="text-sm md:text-lg font-bold text-slate-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] tracking-wide shrink-0 leading-relaxed max-w-lg mx-auto"
                  id="transition-overlay-subtitle"
                  style={{ fontFamily: settings.fontFamily || "Inter" }}
                >
                  {settings.transitionSubtitle || "Chuẩn bị bắt đầu trong giây lát..."}
                </motion.p>
              </div>

              {/* Micro loading details or sparkles decoration */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4, transition: { delay: 0.6 + contentDelayOffset, duration: 0.5 } }}
                className="absolute bottom-10 flex items-center gap-2 text-xs font-mono tracking-wider font-bold text-indigo-300 uppercase shrink-0"
                id="transition-status-ticker"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: "3s" }} />
                <span>Chuyển cảnh hoạt ảnh đang tải...</span>
              </motion.div>
            </GlitchSubContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
