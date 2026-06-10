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
};

const DEFAULT_VOTE_STATE: VoteState = {
  A: 0,
  B: 0,
  voters: {},
  updatedAt: Date.now(),
  keywordA: "A",
  keywordB: "B",
};

const voteState: VoteState = {
  ...DEFAULT_VOTE_STATE,
  voters: {},
};

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
  };
}

export function resetVoteState() {
  voteState.A = 0;
  voteState.B = 0;
  voteState.voters = {};
  voteState.updatedAt = Date.now();
  return getVoteState();
}

export function setVoteKeywords(keywordA: string, keywordB: string) {
  voteState.keywordA = (keywordA || "A").trim().toUpperCase();
  voteState.keywordB = (keywordB || "B").trim().toUpperCase();
  voteState.updatedAt = Date.now();
  return getVoteState();
}

export function castVote(userId: string, option: "A" | "B") {
  if (!userId || typeof userId !== "string") {
    return { accepted: false, reason: "missing_user" as const, state: getVoteState() };
  }

  const normalizedUserId = userId.trim();
  const previousVote = voteState.voters[normalizedUserId];

  if (previousVote === option) {
    return { accepted: false, reason: "duplicate_vote" as const, state: getVoteState() };
  }

  if (previousVote === "A") voteState.A = Math.max(0, voteState.A - 1);
  if (previousVote === "B") voteState.B = Math.max(0, voteState.B - 1);

  voteState.voters[normalizedUserId] = option;
  voteState[option] += 1;
  voteState.updatedAt = Date.now();

  return {
    accepted: true,
    reason: previousVote ? "updated_vote" : "new_vote",
    state: getVoteState(),
  };
}

