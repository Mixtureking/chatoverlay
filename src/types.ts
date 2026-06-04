export interface ChatMessage {
  id: string;
  authorName: string;
  authorPhotoUrl: string;
  messageText: string;
  isModerator: boolean;
  isOwner: boolean;
  isSponsor: boolean;
  isVerified: boolean;
  isSuperChat: boolean;
  superChatAmountText?: string;
  superChatColor?: string;
  tier: number; // 1 to 6 (representing levels of super chat colors)
  timestamp: number;
}

export interface OverlaySettings {
  fontSize: number;       // default 15
  fontFamily: string;     // default "Inter"
  textColor: string;      // hex: default "#ffffff"
  bgColor: string;        // hex: default "#0f172a" (Slate-900)
  bgOpacity: number;      // 0 to 1
  authorColor: string;    // hex: default "#bae6fd" (Sky-200)
  moderatorColor: string; // hex: default "#34d399" (Emerald-400)
  sponsorColor: string;   // hex: default "#fbbf24" (Amber-400)
  superChatDuration: number; // speed/seconds to keep active (default 60s)
  isTransparent: boolean;  // toggle background completely
  scale: number;          // 0.5 to 2.0 (overall window multiplier)
  chatDuration: number;   // fade out messages after X seconds (0 for infinite)
  showAvatar: boolean;    // toggle avatars
  showBadges: boolean;    // moderator/sponsor badge icons
  animationType: "fade" | "slide" | "bounce"; // animations
  useCustomCode?: boolean; // custom widget renderer flag
  customHtml?: string;     // user custom html
  customCss?: string;      // user custom css
  customJs?: string;       // user custom javascript
  
  // Notification Sound configuration
  soundEnabled?: boolean;
  soundType?: "default" | "bell" | "pop" | "synth" | "custom_url" | "custom_file";
  soundVolume?: number;     // 0 to 1
  soundUrl?: string;
  soundFileBase64?: string; // base64 string of sound
  soundFileName?: string;   // friendly uploaded sound name

  // Chat Box Background Image customization
  bgImageEnabled?: boolean;
  bgImageType?: "pattern" | "gradient" | "custom_url" | "upload";
  bgImageUrl?: string;
  bgImageBase64?: string;
  bgImageOpacity?: number;  // 0 to 1
  bgImageBlur?: number;     // px (0 to 20)
  bgImagePreset?: "grid" | "dots" | "waves" | "gradient-sunset" | "gradient-neon" | "gradient-forest";

  // Decorative companion tiny icons alongside chat messages
  decorativeIconEnabled?: boolean;
  decorativeIconType?: "star" | "heart" | "fire" | "sparkles" | "crown" | "controller" | "bolt" | "coffee";
  decorativeIconPosition?: "before_name" | "after_name" | "before_msg";
}

export interface FilterKeyword {
  id: string;
  pattern: string;
  isRegex: boolean;
  comment?: string;
}

export interface StreamStatus {
  isConnected: boolean;
  videoUrlOrId: string;
  activeLiveChatId: string;
  title: string;
  channelTitle: string;
  viewerCount: number;
  error: string | null;
  performance: {
    latency: number;
    fps: number;
    messageCount: number;
    activeCacheSize: number;
  };
}
