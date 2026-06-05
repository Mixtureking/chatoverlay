import React, { memo } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ScreenTransitionProps {
  children: React.ReactNode;
  transitionKey: string; // The trigger key (e.g. activeTab)
  type?: "fade" | "slide" | "zoom" | "rotate" | "shutter" | "curtain" | "glitch" | "morph";
}

const ScreenTransition = memo(function ScreenTransition({
  children,
  transitionKey,
  type = "fade",
}: ScreenTransitionProps) {
  
  // Custom motion variants for each transition style
  const getVariants = () => {
    switch (type) {
      case "slide":
        return {
          initial: { opacity: 0, x: 60, scale: 0.98 },
          animate: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 220, damping: 20 } },
          exit: { opacity: 0, x: -60, scale: 0.98, transition: { duration: 0.15 } },
        };
      case "zoom":
        return {
          initial: { opacity: 0, scale: 0.92 },
          animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
          exit: { opacity: 0, scale: 1.05, transition: { duration: 0.2 } },
        };
      case "rotate":
        return {
          initial: { opacity: 0, rotate: -2, scale: 0.95 },
          animate: { opacity: 1, rotate: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
          exit: { opacity: 0, rotate: 2, scale: 0.95, transition: { duration: 0.2 } },
        };
      case "shutter":
        return {
          initial: { opacity: 0, scaleY: 0.95 },
          animate: { 
            opacity: 1, 
            scaleY: 1,
            transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] } 
          },
          exit: { 
            opacity: 0, 
            scaleY: 0.95,
            transition: { duration: 0.2, ease: "easeInOut" } 
          },
        };
      case "curtain":
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
          exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
        };
      case "glitch":
        return {
          initial: { opacity: 0, x: -10 },
          animate: { opacity: 1, x: 0, transition: { duration: 0.35, type: "spring", stiffness: 300, damping: 15 } },
          exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
        };
      case "morph":
        return {
          initial: { opacity: 0, clipPath: "circle(0% at 50% 50%)" },
          animate: { opacity: 1, clipPath: "circle(150% at 50% 50%)", transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } },
          exit: { opacity: 0, clipPath: "circle(0% at 50% 50%)", transition: { duration: 0.3, ease: "easeInOut" } },
        };
      case "fade":
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
          exit: { opacity: 0, transition: { duration: 0.15 } },
        };
    }
  };

  const variants = getVariants();

  return (
    <div className="relative w-full h-full overflow-hidden" id="screen-transition-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={transitionKey}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className="w-full h-full"
          id={`transition-view-${transitionKey}`}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Futuristic digital shutters effect triggered on switch */}
      {type === "shutter" && (
        <AnimatePresence>
          <motion.div
            key={`shutter-overlay-${transitionKey}`}
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0 }}
            exit={{ scaleY: 1 }}
            transition={{ duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
            style={{ originY: 0 }}
            className="absolute inset-0 bg-indigo-650 z-50 pointer-events-none opacity-20"
            id="transition-shutter-curtain"
          />
        </AnimatePresence>
      )}
    </div>
  );
});

export default ScreenTransition;
