export type ChatCommand =
  | { type: "roll"; sides: number }
  | { type: "pick" }
  | { type: "vote"; option: "A" | "B" };

export type VoteState = {
  A: number;
  B: number;
  voters: Record<string, "A" | "B">;
  updatedAt: number;
};

const DEFAULT_VOTE_STATE: VoteState = {
  A: 0,
  B: 0,
  voters: {},
  updatedAt: Date.now(),
};

const voteState: VoteState = {
  ...DEFAULT_VOTE_STATE,
  voters: {},
};

export function parseChatCommand(messageText: string): ChatCommand | null {
  if (typeof messageText !== "string") return null;

  const trimmed = messageText.trim().toUpperCase();

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

    const voteMatch = trimmed.match(/^!VOTE\s+([AB])$/i);
    if (voteMatch) {
      return { type: "vote", option: voteMatch[1] as "A" | "B" };
    }
  }

  // Flexible voting: "VOTE A", "VOTE B", or just "A", "B"
  if (/^VOTE\s+[AB]$/i.test(trimmed)) {
    return { type: "vote", option: trimmed.slice(-1) as "A" | "B" };
  }

  if (trimmed === "A" || trimmed === "B") {
    return { type: "vote", option: trimmed as "A" | "B" };
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
  };
}

export function resetVoteState() {
  voteState.A = 0;
  voteState.B = 0;
  voteState.voters = {};
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

