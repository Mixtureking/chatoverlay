export type ChatCommand =
  | { type: "roll"; sides: number }
  | { type: "pick" }
  | { type: "vote"; option: "A" | "B" }
  | { type: "tunghoa" };

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

const voteState: VoteState = {
  ...DEFAULT_VOTE_STATE,
  voters: {},
};

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
  return getVoteState();
}

export function setVoteKeywords(keywordA: string, keywordB: string) {
  voteState.keywordA = (keywordA || "A").trim().toUpperCase();
  voteState.keywordB = (keywordB || "B").trim().toUpperCase();
  voteState.updatedAt = Date.now();
  return getVoteState();
}

export function castVote(userId: string, option: "A" | "B", messageId?: string, timestamp?: number) {
  if (!userId || typeof userId !== "string") {
    return { accepted: false, reason: "missing_user" as const, state: getVoteState() };
  }

  // If a messageId is provided, check if we've already processed it
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

  // If a timestamp is provided, verify it is not before the vote started
  if (timestamp && timestamp < voteState.voteStartedAt) {
    return { accepted: false, reason: "old_message" as const, state: getVoteState() };
  }

  // One user = One vote logic
  const normalizedUserId = userId.trim();
  voteState.voters[normalizedUserId] = option;

  // Recalculate totals from voters map to ensure consistency
  const counts = Object.values(voteState.voters).reduce(
    (acc, val) => {
      acc[val]++;
      return acc;
    },
    { A: 0, B: 0 }
  );

  voteState.A = counts.A;
  voteState.B = counts.B;
  voteState.updatedAt = Date.now();

  return {
    accepted: true,
    reason: "new_vote",
    state: getVoteState(),
  };
}
