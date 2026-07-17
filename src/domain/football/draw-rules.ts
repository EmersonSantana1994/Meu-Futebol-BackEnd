export type DrawTeam = {
  id: string;
  name: string;
};

export function shuffleTeams<T extends DrawTeam>(
  teams: T[],
  random: () => number = Math.random
): T[] {
  if (teams.length < 2) {
    throw new Error("O sorteio precisa de pelo menos dois times.");
  }

  const shuffled = [...teams];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const selectedIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[selectedIndex]] = [shuffled[selectedIndex], shuffled[index]];
  }

  return shuffled;
}

export function createRoundRobinFixtures<T extends DrawTeam>(teams: T[]) {
  if (teams.length !== 4) {
    throw new Error("O formato atual do torneio principal espera exatamente 4 times sorteados.");
  }

  const [team1, team2, team3, team4] = teams;

  return [
    { round: 1, home: team1, away: team2 },
    { round: 1, home: team3, away: team4 },
    { round: 2, home: team3, away: team1 },
    { round: 2, home: team2, away: team4 },
    { round: 3, home: team4, away: team1 },
    { round: 3, home: team2, away: team3 },
    { round: 4, home: team1, away: team4 },
    { round: 4, home: team3, away: team2 },
    { round: 5, home: team1, away: team3 },
    { round: 5, home: team4, away: team2 },
    { round: 6, home: team2, away: team1 },
    { round: 6, home: team4, away: team3 }
  ];
}
