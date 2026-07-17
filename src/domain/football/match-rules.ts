export type Score = {
  home: number;
  away: number;
};

export type MatchResult = {
  winnerSide: "home" | "away";
  loserSide: "home" | "away";
  winnerGoals: number;
  loserGoals: number;
  winnerPoints: 1 | 2 | 3;
  goalBalance: 1 | 2 | 4;
};

const allowedWinningScores = [
  { winnerGoals: 3, loserGoals: 2, points: 1, balance: 1 },
  { winnerGoals: 3, loserGoals: 1, points: 2, balance: 2 },
  { winnerGoals: 4, loserGoals: 0, points: 3, balance: 4 }
] as const;

export const allowedScores = allowedWinningScores.flatMap((score) => [
  `${score.winnerGoals}x${score.loserGoals}`,
  `${score.loserGoals}x${score.winnerGoals}`
]);

export function evaluateTournamentScore(score: Score): MatchResult {
  const homeWins = score.home > score.away;
  const winnerGoals = homeWins ? score.home : score.away;
  const loserGoals = homeWins ? score.away : score.home;
  const rule = allowedWinningScores.find(
    (item) => item.winnerGoals === winnerGoals && item.loserGoals === loserGoals
  );

  if (!rule) {
    throw new Error(
      `Placar invalido: ${score.home} x ${score.away}. Use apenas: 3x2, 3x1 ou 4x0 para qualquer lado.`
    );
  }

  return {
    winnerSide: homeWins ? "home" : "away",
    loserSide: homeWins ? "away" : "home",
    winnerGoals,
    loserGoals,
    winnerPoints: rule.points,
    goalBalance: rule.balance
  };
}

export type StandingRow = {
  teamId: string;
  teamName: string;
  points: number;
  goalBalance: number;
};

export type StandingMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

export function applyTournamentResult(
  home: StandingRow,
  away: StandingRow,
  score: Score
): { home: StandingRow; away: StandingRow; result: MatchResult } {
  const result = evaluateTournamentScore(score);

  const nextHome = { ...home };
  const nextAway = { ...away };

  if (result.winnerSide === "home") {
    nextHome.points += result.winnerPoints;
    nextHome.goalBalance += result.goalBalance;
    nextAway.goalBalance -= result.goalBalance;
  } else {
    nextAway.points += result.winnerPoints;
    nextAway.goalBalance += result.goalBalance;
    nextHome.goalBalance -= result.goalBalance;
  }

  return { home: nextHome, away: nextAway, result };
}

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalBalance !== a.goalBalance) return b.goalBalance - a.goalBalance;
    return a.teamName.localeCompare(b.teamName, "pt-BR");
  });
}

export function sortLeagueStandings<T extends StandingRow>(rows: T[], matches: StandingMatch[] = []): T[] {
  const basicSorted = sortStandings(rows);
  const rankOrder = new Map(basicSorted.map((row, index) => [row.teamId, index]));

  return [...rows].sort((a, b) => {
    const base = compareNumber(b.points, a.points) || compareNumber(b.goalBalance, a.goalBalance);
    if (base !== 0) return base;

    const direct = compareDirectConfrontation(a.teamId, b.teamId, matches);
    if (direct !== 0) return direct;

    const winsBy40 = compareNumber(countWinsBy(a.teamId, matches, 4, 0), countWinsBy(b.teamId, matches, 4, 0));
    if (winsBy40 !== 0) return -winsBy40;

    const winsBy31 = compareNumber(countWinsBy(a.teamId, matches, 3, 1), countWinsBy(b.teamId, matches, 3, 1));
    if (winsBy31 !== 0) return -winsBy31;

    const lossesBy40 = compareNumber(countLossesBy(a.teamId, matches, 4, 0), countLossesBy(b.teamId, matches, 4, 0));
    if (lossesBy40 !== 0) return lossesBy40;

    const lossesBy31 = compareNumber(countLossesBy(a.teamId, matches, 3, 1), countLossesBy(b.teamId, matches, 3, 1));
    if (lossesBy31 !== 0) return lossesBy31;

    const againstRanking = compareWinsAgainstRanking(a.teamId, b.teamId, matches, rankOrder);
    if (againstRanking !== 0) return againstRanking;

    return a.teamName.localeCompare(b.teamName, "pt-BR");
  });
}

function compareNumber(a: number, b: number) {
  return a === b ? 0 : a > b ? 1 : -1;
}

function compareDirectConfrontation(teamAId: string, teamBId: string, matches: StandingMatch[]) {
  const directRows = matches.filter(
    (match) =>
      (match.homeTeamId === teamAId && match.awayTeamId === teamBId) ||
      (match.homeTeamId === teamBId && match.awayTeamId === teamAId)
  );

  const points = { a: 0, b: 0 };
  const balance = { a: 0, b: 0 };

  for (const match of directRows) {
    const result = evaluateTournamentScore({ home: match.homeScore, away: match.awayScore });
    const homeIsA = match.homeTeamId === teamAId;
    const winnerIsA = (result.winnerSide === "home" && homeIsA) || (result.winnerSide === "away" && !homeIsA);

    if (winnerIsA) {
      points.a += result.winnerPoints;
      balance.a += result.goalBalance;
      balance.b -= result.goalBalance;
    } else {
      points.b += result.winnerPoints;
      balance.b += result.goalBalance;
      balance.a -= result.goalBalance;
    }
  }

  if (points.a !== points.b) return points.a > points.b ? -1 : 1;
  if (balance.a !== balance.b) return balance.a > balance.b ? -1 : 1;
  return 0;
}

function countWinsBy(teamId: string, matches: StandingMatch[], winnerGoals: number, loserGoals: number) {
  return matches.filter((match) => matchWinnerId(match) === teamId && scoreShape(match) === `${winnerGoals}x${loserGoals}`).length;
}

function countLossesBy(teamId: string, matches: StandingMatch[], winnerGoals: number, loserGoals: number) {
  return matches.filter((match) => matchLoserId(match) === teamId && scoreShape(match) === `${winnerGoals}x${loserGoals}`).length;
}

function compareWinsAgainstRanking(
  teamAId: string,
  teamBId: string,
  matches: StandingMatch[],
  rankOrder: Map<string, number>
) {
  const opponents = [...rankOrder.entries()]
    .filter(([teamId]) => teamId !== teamAId && teamId !== teamBId)
    .sort((a, b) => a[1] - b[1])
    .map(([teamId]) => teamId);

  for (const opponentId of opponents) {
    const bestA = bestWinWeightAgainst(teamAId, opponentId, matches);
    const bestB = bestWinWeightAgainst(teamBId, opponentId, matches);
    if (bestA !== bestB) return bestA > bestB ? -1 : 1;
  }

  return 0;
}

function bestWinWeightAgainst(teamId: string, opponentId: string, matches: StandingMatch[]) {
  return Math.max(
    0,
    ...matches
      .filter(
        (match) =>
          ((match.homeTeamId === teamId && match.awayTeamId === opponentId) ||
            (match.awayTeamId === teamId && match.homeTeamId === opponentId)) &&
          matchWinnerId(match) === teamId
      )
      .map((match) => evaluateTournamentScore({ home: match.homeScore, away: match.awayScore }).winnerPoints)
  );
}

function matchWinnerId(match: StandingMatch) {
  return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
}

function matchLoserId(match: StandingMatch) {
  return match.homeScore > match.awayScore ? match.awayTeamId : match.homeTeamId;
}

function scoreShape(match: StandingMatch) {
  const winnerGoals = Math.max(match.homeScore, match.awayScore);
  const loserGoals = Math.min(match.homeScore, match.awayScore);
  return `${winnerGoals}x${loserGoals}`;
}
