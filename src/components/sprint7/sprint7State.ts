export interface Sprint7WidgetState {
  todoList: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
  customCSS: string;
  socialLinks: {
    [key: string]: string;
  };
  timerSeconds?: number;
  timerDoneText?: string;
  wheelUsers?: string[];
}

export interface Sprint7FullState {
  todoList: Sprint7WidgetState["todoList"];
  customCSS: string;
  socialLinks: Sprint7WidgetState["socialLinks"];
  timerSeconds?: number;
  timerDoneText?: string;
  wheelUsers?: string[];
}

export const SPRINT7_WIDGET_STORAGE_KEY = "sprint7_widget_state";

export function createSprint7WidgetState(input?: Partial<Sprint7WidgetState>): Sprint7WidgetState {
  return {
    todoList: Array.isArray(input?.todoList)
      ? input!.todoList.map((item: any, index: number) => ({
          id: typeof item?.id === "string" ? item.id : `todo-${index}`,
          text: typeof item?.text === "string" ? item.text : "",
          completed: !!item?.completed,
        }))
      : [],
    customCSS: typeof input?.customCSS === "string" ? input.customCSS : "",
    socialLinks: input?.socialLinks && typeof input.socialLinks === "object" && Object.keys(input.socialLinks).length > 0 ? input.socialLinks : { youtube: "https://youtube.com/@YourChannel", discord: "https://discord.gg/example" },
    timerSeconds: typeof input?.timerSeconds === "number" && input.timerSeconds >= 0 ? input.timerSeconds : 5 * 60,
    timerDoneText: typeof input?.timerDoneText === "string" && input.timerDoneText.trim() ? input.timerDoneText : "Thời gian đã kết thúc",
    wheelUsers: Array.isArray(input?.wheelUsers) && input.wheelUsers.length > 0 ? input.wheelUsers.filter((item) => typeof item === "string" && item.trim()) : ["Doro", "An", "Binh", "Chi", "Dung", "Em"],
  };
}

export function loadPersistedSprint7WidgetState(): Sprint7WidgetState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SPRINT7_WIDGET_STORAGE_KEY);
    if (!raw) return null;
    return createSprint7WidgetState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePersistedSprint7WidgetState(state: Sprint7WidgetState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SPRINT7_WIDGET_STORAGE_KEY, JSON.stringify(createSprint7WidgetState(state)));
  } catch {}
}

export function serializeSprint7WidgetState(state: Sprint7WidgetState): string {
  return JSON.stringify(createSprint7WidgetState(state), null, 2);
}

export function parseSprint7WidgetState(raw: string): Sprint7WidgetState {
  const parsed = JSON.parse(raw);
  return createSprint7WidgetState(parsed);
}

export function isLikelySafeCss(css: string): boolean {
  if (typeof css !== "string") return false;
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  return opens === closes;
}

export function createSprint7FullState(input?: Partial<Sprint7FullState>): Sprint7FullState {
  const widgetState = createSprint7WidgetState(input);
  return {
    todoList: widgetState.todoList,
    customCSS: widgetState.customCSS,
    socialLinks: widgetState.socialLinks,
    timerSeconds: widgetState.timerSeconds,
    timerDoneText: widgetState.timerDoneText,
    wheelUsers: widgetState.wheelUsers,
  };
}

export function serializeSprint7FullState(state: Sprint7FullState): string {
  return JSON.stringify(createSprint7FullState(state), null, 2);
}

export function parseSprint7FullState(raw: string): Sprint7FullState {
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === "object" && ("todoList" in parsed || "customCSS" in parsed || "socialLinks" in parsed)) {
    return createSprint7FullState(parsed);
  }
  if (parsed && typeof parsed === "object" && "sprint7" in parsed) {
    return createSprint7FullState((parsed as any).sprint7);
  }
  return createSprint7FullState(parsed);
}
