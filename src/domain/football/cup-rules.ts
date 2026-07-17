import { Score } from "./match-rules.js";

const NORMAL_CUP_GOAL_LIMIT = 4;

export type CupTeamCampaign = {
  teamId: string;
  teamName: string;
  goalsFor: number;
  goalsAgainst: number;
  points?: number;
};

export type TwoLegTieInput = {
  firstLeg: Score;
  secondLeg: Score;
  homeFirstLegTeamId: string;
  awayFirstLegTeamId: string;
  /**
   * Extra time is played after the second leg, so the score follows the second-leg
   * home/away orientation.
   */
  extraTime?: Score;
};

export type CupSemifinalCampaign = {
  teamId: string;
  teamName: string;
  usedExtraTime: boolean;
  goalsForInTie: number;
  goalsAgainstInTie: number;
  extraTimeGoalsAgainst?: number;
};

export function validateFinishedCupLeg(score: Score) {
  const highest = Math.max(score.home, score.away);
  const lowest = Math.min(score.home, score.away);

  if (highest !== NORMAL_CUP_GOAL_LIMIT || lowest >= NORMAL_CUP_GOAL_LIMIT) {
    throw new Error("Na Copa, a partida normal termina quando alguem faz 4 gols primeiro.");
  }

  return {
    winnerSide: score.home > score.away ? "home" : "away",
    loserSide: score.home > score.away ? "away" : "home"
  };
}

export function validateFinishedExtraTime(score: Score) {
  const highest = Math.max(score.home, score.away);
  const diff = Math.abs(score.home - score.away);

  if (highest < NORMAL_CUP_GOAL_LIMIT || diff < 2) {
    throw new Error(
      "Na prorrogacao, so termina a partir do quarto gol e com pelo menos 2 gols de diferenca."
    );
  }

  return {
    winnerSide: score.home > score.away ? "home" : "away",
    loserSide: score.home > score.away ? "away" : "home"
  };
}

export function aggregateTie(input: TwoLegTieInput) {
  validateFinishedCupLeg(input.firstLeg);
  validateFinishedCupLeg(input.secondLeg);
  if (input.extraTime) {
    validateFinishedExtraTime(input.extraTime);
  }

  const homeFirstTeamGoals = input.firstLeg.home + input.secondLeg.away;
  const awayFirstTeamGoals = input.firstLeg.away + input.secondLeg.home;
  const extraHomeFirstTeamGoals = input.extraTime?.away ?? 0;
  const extraAwayFirstTeamGoals = input.extraTime?.home ?? 0;
  const totalHomeFirstTeam = homeFirstTeamGoals + extraHomeFirstTeamGoals;
  const totalAwayFirstTeam = awayFirstTeamGoals + extraAwayFirstTeamGoals;

  if (totalHomeFirstTeam === totalAwayFirstTeam) {
    return {
      winnerTeamId: null,
      loserTeamId: null,
      tied: true,
      aggregate: {
        [input.homeFirstLegTeamId]: totalHomeFirstTeam,
        [input.awayFirstLegTeamId]: totalAwayFirstTeam
      }
    };
  }

  const homeFirstTeamWon = totalHomeFirstTeam > totalAwayFirstTeam;

  return {
    winnerTeamId: homeFirstTeamWon ? input.homeFirstLegTeamId : input.awayFirstLegTeamId,
    loserTeamId: homeFirstTeamWon ? input.awayFirstLegTeamId : input.homeFirstLegTeamId,
    tied: false,
    aggregate: {
      [input.homeFirstLegTeamId]: totalHomeFirstTeam,
      [input.awayFirstLegTeamId]: totalAwayFirstTeam
    }
  };
}

export function evaluateSecondLegLiveTie(input: Omit<TwoLegTieInput, "extraTime">) {
  validateFinishedCupLeg(input.firstLeg);

  if (
    input.secondLeg.home > NORMAL_CUP_GOAL_LIMIT ||
    input.secondLeg.away > NORMAL_CUP_GOAL_LIMIT
  ) {
    throw new Error("Na Copa, nenhum time passa de 4 gols na partida normal.");
  }

  const homeFirstTeamCurrent = input.firstLeg.home + input.secondLeg.away;
  const awayFirstTeamCurrent = input.firstLeg.away + input.secondLeg.home;
  const homeFirstTeamMax = input.firstLeg.home + NORMAL_CUP_GOAL_LIMIT;
  const awayFirstTeamMax = input.firstLeg.away + NORMAL_CUP_GOAL_LIMIT;

  if (homeFirstTeamCurrent > awayFirstTeamMax) {
    return {
      clinchedWinnerTeamId: input.homeFirstLegTeamId,
      eliminatedTeamId: input.awayFirstLegTeamId,
      canStillReverse: false
    };
  }

  if (awayFirstTeamCurrent > homeFirstTeamMax) {
    return {
      clinchedWinnerTeamId: input.awayFirstLegTeamId,
      eliminatedTeamId: input.homeFirstLegTeamId,
      canStillReverse: false
    };
  }

  return {
    clinchedWinnerTeamId: null,
    eliminatedTeamId: null,
    canStillReverse: true
  };
}

export function validateFinishedSecondLeg(input: Omit<TwoLegTieInput, "extraTime">) {
  try {
    validateFinishedCupLeg(input.secondLeg);
  } catch (validationError) {
    if (
      input.secondLeg.home === NORMAL_CUP_GOAL_LIMIT &&
      input.secondLeg.away === NORMAL_CUP_GOAL_LIMIT
    ) {
      throw validationError;
    }

    const liveTie = evaluateSecondLegLiveTie(input);

    if (liveTie.canStillReverse) {
      throw new Error(
        "O jogo de volta so pode terminar antes dos 4 gols quando a classificacao no agregado for matematicamente irreversivel."
      );
    }

    return {
      winnerTeamId: liveTie.clinchedWinnerTeamId,
      loserTeamId: liveTie.eliminatedTeamId,
      endedEarly: true
    };
  }

  const result = evaluateSecondLegLiveTie(input);
  const homeFirstTeamGoals = input.firstLeg.home + input.secondLeg.away;
  const awayFirstTeamGoals = input.firstLeg.away + input.secondLeg.home;

  return {
    winnerTeamId:
      homeFirstTeamGoals === awayFirstTeamGoals
        ? null
        : homeFirstTeamGoals > awayFirstTeamGoals
          ? input.homeFirstLegTeamId
          : input.awayFirstLegTeamId,
    loserTeamId:
      homeFirstTeamGoals === awayFirstTeamGoals
        ? null
        : homeFirstTeamGoals > awayFirstTeamGoals
          ? input.awayFirstLegTeamId
          : input.homeFirstLegTeamId,
    endedEarly: false,
    canStillReverse: result.canStillReverse
  };
}

export function chooseSecondLegHomeTeam(
  teamA: CupTeamCampaign,
  teamB: CupTeamCampaign
): CupTeamCampaign {
  const teamABalance = teamA.goalsFor - teamA.goalsAgainst;
  const teamBBalance = teamB.goalsFor - teamB.goalsAgainst;

  if ((teamA.points ?? 0) !== (teamB.points ?? 0)) {
    return (teamA.points ?? 0) > (teamB.points ?? 0) ? teamA : teamB;
  }

  if (teamABalance !== teamBBalance) {
    return teamABalance > teamBBalance ? teamA : teamB;
  }

  if (teamA.goalsFor !== teamB.goalsFor) {
    return teamA.goalsFor > teamB.goalsFor ? teamA : teamB;
  }

  return teamA.teamName.localeCompare(teamB.teamName, "pt-BR") <= 0 ? teamA : teamB;
}

export function chooseFinalSecondLegHomeTeam(
  finalistA: CupSemifinalCampaign,
  finalistB: CupSemifinalCampaign
) {
  if (finalistA.usedExtraTime !== finalistB.usedExtraTime) {
    const homeTeam = finalistA.usedExtraTime ? finalistB : finalistA;
    return { homeTeam, reason: "O time que nao foi para prorrogacao joga o ultimo jogo em casa." };
  }

  if (finalistA.usedExtraTime && finalistB.usedExtraTime) {
    const goalsAgainstA = finalistA.extraTimeGoalsAgainst ?? 0;
    const goalsAgainstB = finalistB.extraTimeGoalsAgainst ?? 0;

    if (goalsAgainstA !== goalsAgainstB) {
      const homeTeam = goalsAgainstA < goalsAgainstB ? finalistA : finalistB;
      return {
        homeTeam,
        reason: "Ambos foram para prorrogacao; joga em casa quem sofreu menos gols nela."
      };
    }

    return {
      homeTeam: null,
      reason: "Empate nos criterios da prorrogacao. O mando precisa ser decidido manualmente."
    };
  }

  if (finalistA.goalsAgainstInTie !== finalistB.goalsAgainstInTie) {
    const homeTeam =
      finalistA.goalsAgainstInTie < finalistB.goalsAgainstInTie ? finalistA : finalistB;
    return {
      homeTeam,
      reason: "Nenhum foi para prorrogacao; joga em casa quem sofreu menos gols nas duas partidas."
    };
  }

  return {
    homeTeam: null,
    reason: "Empate em gols sofridos nas duas partidas. O mando precisa ser decidido manualmente."
  };
}

export function chooseThirdPlaceSecondLegHomeTeam(
  teamA: CupSemifinalCampaign,
  teamB: CupSemifinalCampaign
) {
  if (teamA.goalsForInTie !== teamB.goalsForInTie) {
    const homeTeam = teamA.goalsForInTie > teamB.goalsForInTie ? teamA : teamB;
    return {
      homeTeam,
      reason: "Na disputa de terceiro lugar, joga em casa quem fez mais gols na semifinal."
    };
  }

  return {
    homeTeam: null,
    reason: "Empate em gols feitos na semifinal. O mando precisa ser decidido manualmente."
  };
}
