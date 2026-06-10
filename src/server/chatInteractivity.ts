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

    const voteMatch = trimmed.match(/^!VOTE\s+(.+)$/i);
    if (voteMatch) {
      const val = voteMatch[1].trim();
      if (val === kA) return { type: "vote", option: "A" };
      if (val === kB) return { type: "vote", option: "B" };
    }
  }

  // Flexible voting: "VOTE [KEYWORD]", or just "[KEYWORD]"
  const voteWordMatch = trimmed.match(/^VOTE\s+(.+)$/i);
  if (voteWordMatch) {
    const val = voteWordMatch[1].trim();
    if (val === kA) return { type: "vote", option: "A" };
    if (val === kB) return { type: "vote", option: "B" };
  }

  if (trimmed === kA) {
    return { type: "vote", option: "A" };
  }
  if (trimmed === kB) {
    return { type: "vote", option: "B" };
  }

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
  }

  // If a timestamp is provided, verify it is not before the vote started
  if (timestamp && timestamp < voteState.voteStartedAt) {
    return { accepted: false, reason: "old_message" as const, state: getVoteState() };
  }

  const normalizedUserId = userId.trim();
  const previousVote = voteState.voters[normalizedUserId];

  if (previousVote === option) {
    if (messageId) {
      if (!processedMessageIds.has(messageId)) {
        processedMessageIds.add(messageId);
        processedMessageIdQueue.push(messageId);
        if (processedMessageIdQueue.length > MAX_PROCESSED_IDS) {
          const oldId = processedMessageIdQueue.shift();
          if (oldId) processedMessageIds.delete(oldId);
        }
      }
    }
    return { accepted: false, reason: "duplicate_vote" as const, state: getVoteState() };
  }

  if (previousVote === "A") voteState.A = Math.max(0, voteState.A - 1);
  if (previousVote === "B") voteState.B = Math.max(0, voteState.B - 1);

  voteState.voters[normalizedUserId] = option;
  voteState[option] += 1;
  voteState.updatedAt = Date.now();

  if (messageId) {
    if (!processedMessageIds.has(messageId)) {
      processedMessageIds.add(messageId);
      processedMessageIdQueue.push(messageId);
      if (processedMessageIdQueue.length > MAX_PROCESSED_IDS) {
        const oldId = processedMessageIdQueue.shift();
        if (oldId) processedMessageIds.delete(oldId);
      }
    }
  }

  return {
    accepted: true,
    reason: previousVote ? "updated_vote" : "new_vote",
    state: getVoteState(),
  };
}
