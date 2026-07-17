export type PlayerTeam = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
};

export type ScoreboardRow = {
  teamId: string;
  teamName: string;
  goals: number;
};

export type PlayerStatRow = {
  playerId: string;
  playerName: string;
  total: number;
  tournamentTotal: number;
};

export function addGoalToScoreboard(
  scoreboard: ScoreboardRow[],
  player: PlayerTeam,
  amount = 1
): ScoreboardRow[] {
  if (amount <= 0) {
    throw new Error("A quantidade de gols precisa ser maior que zero.");
  }

  const existing = scoreboard.find((row) => row.teamId === player.teamId);
  if (existing) {
    return scoreboard.map((row) =>
      row.teamId === player.teamId ? { ...row, goals: row.goals + amount } : row
    );
  }

  return [
    ...scoreboard,
    {
      teamId: player.teamId,
      teamName: player.teamName,
      goals: amount
    }
  ];
}

export function incrementPlayerStat(
  rows: PlayerStatRow[],
  player: Pick<PlayerTeam, "playerId" | "playerName">,
  amount = 1
): PlayerStatRow[] {
  if (amount <= 0) {
    throw new Error("A quantidade precisa ser maior que zero.");
  }

  const existing = rows.find((row) => row.playerId === player.playerId);
  if (existing) {
    return rows.map((row) =>
      row.playerId === player.playerId
        ? { ...row, total: row.total + amount, tournamentTotal: row.tournamentTotal + amount }
        : row
    );
  }

  return [
    ...rows,
    {
      playerId: player.playerId,
      playerName: player.playerName,
      total: amount,
      tournamentTotal: amount
    }
  ];
}
