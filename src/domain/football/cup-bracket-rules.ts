import { shuffleTeams, type DrawTeam } from "./draw-rules.js";

export type CupBracketModel = "semifinals" | "six-teams" | "quarterfinals" | "round-of-16";

export type CupBracketMatch = {
  id: string;
  phase: CupBracketModel | "final" | "third-place";
  order: number;
  home: DrawTeam;
  away: DrawTeam;
};

export type CupBracket = {
  tournamentName: string;
  model: CupBracketModel;
  matches: CupBracketMatch[];
  byes?: DrawTeam[];
};

const modelTeamCount: Record<CupBracketModel, number> = {
  semifinals: 4,
  "six-teams": 6,
  quarterfinals: 8,
  "round-of-16": 16
};

const modelPhaseLabel: Record<CupBracketModel, CupBracketModel> = {
  semifinals: "semifinals",
  "six-teams": "quarterfinals",
  quarterfinals: "quarterfinals",
  "round-of-16": "round-of-16"
};

export function getCupModelTeamCount(model: CupBracketModel) {
  return modelTeamCount[model];
}

export function createCupOpeningBracket(
  model: CupBracketModel,
  teams: DrawTeam[],
  tournamentName = "Copa",
  byeTeamIdsOrRandom: string[] | (() => number) = [],
  random: () => number = Math.random
): CupBracket {
  const byeTeamIds = typeof byeTeamIdsOrRandom === "function" ? [] : byeTeamIdsOrRandom;
  const randomGenerator = typeof byeTeamIdsOrRandom === "function" ? byeTeamIdsOrRandom : random;
  const expectedCount = getCupModelTeamCount(model);

  if (!tournamentName.trim()) {
    throw new Error("Informe o nome do torneio da Copa.");
  }

  if (teams.length !== expectedCount) {
    throw new Error(`O modelo ${model} precisa de exatamente ${expectedCount} times.`);
  }

  if (model === "six-teams") {
    return createSixTeamCupBracket(teams, tournamentName, byeTeamIds, randomGenerator);
  }

  const shuffled = shuffleTeams(teams, randomGenerator);

  const matches = Array.from({ length: expectedCount / 2 }, (_, index) => {
    const home = shuffled[index * 2];
    const away = shuffled[index * 2 + 1];

    return {
      id: `${model}-${index + 1}`,
      phase: modelPhaseLabel[model],
      order: index + 1,
      home,
      away
    };
  });

  return {
    tournamentName: tournamentName.trim(),
    model,
    matches
  };
}

function createSixTeamCupBracket(
  teams: DrawTeam[],
  tournamentName: string,
  byeTeamIds: string[],
  random: () => number
): CupBracket {
  const uniqueByeIds = [...new Set(byeTeamIds)];
  if (uniqueByeIds.length !== 2) {
    throw new Error("A copa com 6 times precisa de exatamente 2 times classificados direto.");
  }

  const byes = uniqueByeIds.map((teamId) => teams.find((team) => team.id === teamId));
  if (byes.some((team) => !team)) {
    throw new Error("Os times classificados direto precisam estar na lista da copa.");
  }

  const playingTeams = shuffleTeams(
    teams.filter((team) => !uniqueByeIds.includes(team.id)),
    random
  );

  return {
    tournamentName: tournamentName.trim(),
    model: "six-teams",
    byes: byes as DrawTeam[],
    matches: [
      {
        id: "six-teams-quarterfinal-1",
        phase: "quarterfinals",
        order: 1,
        home: playingTeams[0],
        away: playingTeams[1]
      },
      {
        id: "six-teams-quarterfinal-2",
        phase: "quarterfinals",
        order: 2,
        home: playingTeams[2],
        away: playingTeams[3]
      }
    ]
  };
}
