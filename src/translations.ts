export interface TranslationKeys {
  appName: string;
  connectTab: string;
  stylerTab: string;
  filtersTab: string;
  helpTab: string;
  sidebarOpenBtn: string;
  sidebarCloseBtn: string;
  testMsgBtn: string;
  clearChatBtn: string;
  connectHeader: string;
  connectSub: string;
  stylerHeader: string;
  stylerSub: string;
  fontLabel: string;
  fontSizeLabel: string;
  zoomScaleLabel: string;
  colorHeader: string;
  transparentNess: string;
  bgColorLabel: string;
  bgOpacityLabel: string;
  commentColorLabel: string;
  authorColorLabel: string;
  moderatorColorLabel: string;
  sponsorColorLabel: string;
  animationLabel: string;
  bgDecorativeHeader: string;
  bgImageLabel: string;
  bgImageOpacityLabel: string;
  bgImageBlurLabel: string;
  bgPatternLabel: string;
  iconDeckLabel: string;
  iconPositionLabel: string;
  soundLabel: string;
  volumeLabel: string;
  customColorLabel: string;
  accentColorLabel: string;
  transitionTypeLabel: string;
  languageSelectLabel: string;
  obsHeaderLabel: string;
  obsUrlLabel: string;
  obsDescLabel: string;
  btnSaveAndSync: string;
  toastSaveAndSync: string;
  connectedStatus: string;
  offlineStatus: string;
  previewHeader: string;
  previewDesc: string;
}

export const TRANSLATIONS: Record<"vi" | "en", TranslationKeys> = {
  vi: {
    appName: "YOUTUBE CHAT OVERLAY",
    connectTab: "Kết nối",
    stylerTab: "Giao diện",
    filtersTab: "Bộ lọc",
    helpTab: "Hướng dẫn",
    sidebarOpenBtn: "Mở Sidebar Chat",
    sidebarCloseBtn: "Đóng Sidebar",
    testMsgBtn: "Bơm tin nhắn dùng thử",
    clearChatBtn: "Xóa sạch chat",
    connectHeader: "URL Livestream",
    connectSub: "Kết kết nối luồng chat trực tiếp từ Youtube thông qua API hoặc videoID.",
    stylerHeader: "Tùy chỉnh Giao diện Overlay",
    stylerSub: "Phát hỏa phong cách riêng biệt để hiển thị trước khán giả của bạn.",
    fontLabel: "Kiểu phông chữ (Fonts)",
    fontSizeLabel: "Cỡ chữ văn bản",
    zoomScaleLabel: "Tỷ lệ thu phóng cửa sổ",
    colorHeader: "Bảng màu sắc (Colors)",
    transparentNess: "Nền trong suốt hoàn toàn",
    bgColorLabel: "Màu nền khung",
    bgOpacityLabel: "Độ mờ nền",
    commentColorLabel: "Màu chữ comment",
    authorColorLabel: "Màu tên người xem",
    moderatorColorLabel: "Màu tên Moderator",
    sponsorColorLabel: "Màu tên Hội viên",
    animationLabel: "Hiệu ứng xuất hiện",
    bgDecorativeHeader: "Tính năng trang trí (Ảnh nền & Biểu tượng)",
    bgImageLabel: "Kích hoạt hình nền khung chat",
    bgImageOpacityLabel: "Độ mờ ảnh nền",
    bgImageBlurLabel: "Độ nhòe ảnh nền (Blur)",
    bgPatternLabel: "Họa tiết phông nền",
    iconDeckLabel: "Bật biểu tượng bạn đồng hành",
    iconPositionLabel: "Vị trí biểu tượng",
    soundLabel: "Bật âm thông báo chuông",
    volumeLabel: "Âm lượng âm chuông",
    customColorLabel: "Tùy Chọn Màu Sắc Dashboard",
    accentColorLabel: "Màu điểm nhấn hệ thống (Button/Icon)",
    transitionTypeLabel: "Hiệu ứng chuyển trang (Transition)",
    languageSelectLabel: "Ngôn ngữ hiển thị (Language)",
    obsHeaderLabel: "Cửa sổ màn hình xem trước Overlay",
    obsUrlLabel: "Đường dẫn cài đặt OBS Browser Source",
    obsDescLabel: "Mô hình hiển thị đúng tỷ lệ và độ mờ khi phát sóng chat stream của bạn.",
    btnSaveAndSync: "Lưu & Đồng bộ cài đặt",
    toastSaveAndSync: "🚀 Đã lưu cấu hình và đồng bộ OBS thành công!",
    connectedStatus: "🔴 Đang quét tìm kênh...",
    offlineStatus: "🟢 Hệ thống sẵn sàng kết nối",
    previewHeader: "Live Setup Preview",
    previewDesc: "Kéo để di chuyển, kéo cạnh góc phải để chỉnh kích thước.",
  },
  en: {
    appName: "YOUTUBE CHAT OVERLAY",
    connectTab: "Connect",
    stylerTab: "Styler",
    filtersTab: "Filters",
    helpTab: "Help Guide",
    sidebarOpenBtn: "Open Sidebar Chat",
    sidebarCloseBtn: "Close Sidebar",
    testMsgBtn: "Simulate Test Chat",
    clearChatBtn: "Flush Chat log",
    connectHeader: "Livestream URL",
    connectSub: "Safely hook your live discussion feed using YouTube Video IDs.",
    stylerHeader: "Overlay Style Configuration Deck",
    stylerSub: "Customize layout elements, colors, and dynamic backdrops.",
    fontLabel: "Font Family",
    fontSizeLabel: "Text Font Size",
    zoomScaleLabel: "Window Zoom Level Scale",
    colorHeader: "Colors & Palettes",
    transparentNess: "Completely Transparent Background",
    bgColorLabel: "Box Background Color",
    bgOpacityLabel: "Backdrop Opacity",
    commentColorLabel: "Comment Text Color",
    authorColorLabel: "Viewer Name Color",
    moderatorColorLabel: "Moderator Name Color",
    sponsorColorLabel: "Sponsor Member Color",
    animationLabel: "Entrance Motion Effect Animation",
    bgDecorativeHeader: "Decorations (Backdrop Image & Emoji Icons)",
    bgImageLabel: "Enable Chatbox Backdrop Image",
    bgImageOpacityLabel: "Background Image Opacity",
    bgImageBlurLabel: "Background Image Blur Filter",
    bgPatternLabel: "Background Backdrop Pattern Mesh",
    iconDeckLabel: "Enable Companion Emoticons Tiny Icons",
    iconPositionLabel: "Companion Emoticon Position Offset",
    soundLabel: "Notification Bubble Ring Sound Chime",
    volumeLabel: "Chime Pitch Sound Volume",
    customColorLabel: "App Dashboard Styling Accents",
    accentColorLabel: "Accent Color Code (Button/Focus Highlight)",
    transitionTypeLabel: "Tab Screen Switching Transition",
    languageSelectLabel: "Application UI Language Target",
    obsHeaderLabel: "Overlay Monitor Live Device Screen Preview",
    obsUrlLabel: "Path Link OBS Browser Source Setup",
    obsDescLabel: "Exact replica rendered live. Paste into OBS scene browser view layer safely.",
    btnSaveAndSync: "Commit Save & Synchronize",
    toastSaveAndSync: "🚀 Configurations saved and synchronized successfully to OBS!",
    connectedStatus: "🔴 Active polling channel stream...",
    offlineStatus: "🟢 Systems idle - ready to hook-up",
    previewHeader: "Overlay Device Frame View",
    previewDesc: "Drag bar to change location, pull corner to resize layout.",
  },
};
