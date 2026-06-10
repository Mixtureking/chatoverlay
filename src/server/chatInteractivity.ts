export type ChatCommand =
  import fs from "fs";
  import path from "path";

  const VOTE_STATE_FILE = path.join(process.cwd(), "vote_state.json");

  export type ChatCommand =
    | { type: "roll"; sides: number }
    | { type: "pick" }
    | { type: "vote"; option: "A" | "B" };

  export type VoteState = {
    A: number;
    B: number;
    voters: Record<string, "A" | "B">;
    updatedAt: number;
    keywordA: string;
    keywordB: string;
    voteStartedAt: number;
  };

  const DEFAULT_VOTE_STATE: VoteState = {
    A: 0,
    B: 0,
    voters: {},
    updatedAt: Date.now(),
    keywordA: "A",
    keywordB: "B",
    voteStartedAt: Date.now(),
  };

  let voteState: VoteState = {
    ...DEFAULT_VOTE_STATE,
    voters: {},
  };

  // Try to load persisted state on startup
  try {
    if (fs.existsSync(VOTE_STATE_FILE)) {
      const raw = fs.readFileSync(VOTE_STATE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      voteState = { ...DEFAULT_VOTE_STATE, ...parsed };
    }
  } catch (err) {
    // Silent fail if no file or bad format
  }

  function persistVoteState() {
    try {
      fs.writeFileSync(VOTE_STATE_FILE, JSON.stringify(voteState), "utf-8");
    } catch (err) {
      // Fail silently in read-only environments like Vercel
    }
  }

  const processedMessageIds = new Set<string>();
const processedMessageIdQueue: string[] = [];
const MAX_PROCESSED_IDS = 5000;

export function parseChatCommand(messageText: string): ChatCommand | null {
  if (typeof messageText !== "string") return null;

  const trimmed = messageText.trim().toUpperCase();
  const kA = voteState.keywordA;
  const kB = voteState.keywordB;

  // Explicit command with !
  if (trimmed.startsWith("!")) {
    // !tunghoa command
    if (/^!TUNGHOA$/i.test(trimmed)) {
      return { type: "tunghoa" };
    }

    const rollMatch = trimmed.match(/^!ROLL\s+(\d{1,4})$/i);
    if (rollMatch) {
      const sides = Number.parseInt(rollMatch[1], 10);
      if (Number.isFinite(sides) && sides >= 2) {
        return { type: "roll", sides };
      }
      return null;
    }

    if (/^!PICK$/i.test(trimmed)) {
      return { type: "pick" };
    }

    // Strict !vote "keyword" requirement
    const voteMatch = trimmed.match(/^!VOTE\s+"?([^"]+)"?$/i);
    if (voteMatch) {
      const val = voteMatch[1].trim().toUpperCase();
      if (val === kA) return { type: "vote", option: "A" };
      if (val === kB) return { type: "vote", option: "B" };
    }
  }

  // Legacy flexible voting removed as per user request
  return null;
}

export function getVoteState() {
  return {
    A: voteState.A,
    B: voteState.B,
    total: voteState.A + voteState.B,
    voters: { ...voteState.voters },
    updatedAt: voteState.updatedAt,
    keywordA: voteState.keywordA,
    keywordB: voteState.keywordB,
    voteStartedAt: voteState.voteStartedAt,
  };
}

export function resetVoteState() {
  voteState.A = 0;
  voteState.B = 0;
  voteState.voters = {};
  voteState.voteStartedAt = Date.now();
  voteState.updatedAt = Date.now();
  processedMessageIds.clear();
  processedMessageIdQueue.length = 0;
  persistVoteState();
  return getVoteState();
}

export function setVoteKeywords(keywordA: string, keywordB: string) {
  voteState.keywordA = (keywordA || "A").trim().toUpperCase();
  voteState.keywordB = (keywordB || "B").trim().toUpperCase();
  voteState.updatedAt = Date.now();
  persistVoteState();
  return getVoteState();
}

export function castVote(userId: string, option: "A" | "B", messageId?: string, timestamp?: number) {
  if (!userId || typeof userId !== "string") {
    return { accepted: false, reason: "missing_user" as const, state: getVoteState() };
  }

  // Deduplicate by messageId - one message = one vote
  if (messageId) {
    if (processedMessageIds.has(messageId)) {
      return { accepted: false, reason: "duplicate_message" as const, state: getVoteState() };
    }
    processedMessageIds.add(messageId);
    processedMessageIdQueue.push(messageId);
    if (processedMessageIdQueue.length > MAX_PROCESSED_IDS) {
      const oldId = processedMessageIdQueue.shift();
      if (oldId) processedMessageIds.delete(oldId);
    }
  }

  if (timestamp && timestamp < voteState.voteStartedAt) {
    return { accepted: false, reason: "old_message" as const, state: getVoteState() };
  }

  // CUMULATIVE: Every valid message counts as 1 vote.
  // We don't subtract previous votes, and multiple comments from same user count.
  voteState[option] += 1;
  voteState.updatedAt = Date.now();

  // Track voter in map for logs, but don't use it for counting logic
  const normalizedUserId = userId.trim();
  voteState.voters[normalizedUserId] = option;

  persistVoteState();

  return {
    accepted: true,
    reason: "new_vote",
    state: getVoteState(),
  };
}

export function setRawVoteState(newState: Partial<VoteState>) {
  if (typeof newState.A === "number") voteState.A = newState.A;
  if (typeof newState.B === "number") voteState.B = newState.B;
  if (newState.keywordA) voteState.keywordA = newState.keywordA;
  if (newState.keywordB) voteState.keywordB = newState.keywordB;
  if (newState.voteStartedAt) voteState.voteStartedAt = newState.voteStartedAt;
  voteState.updatedAt = Date.now();
  persistVoteState();
}
