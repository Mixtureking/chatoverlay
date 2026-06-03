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
