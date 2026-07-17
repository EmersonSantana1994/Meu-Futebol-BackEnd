import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateTie,
  chooseFinalSecondLegHomeTeam,
  chooseSecondLegHomeTeam,
  chooseThirdPlaceSecondLegHomeTeam,
  evaluateSecondLegLiveTie,
  validateFinishedCupLeg,
  validateFinishedSecondLeg,
  validateFinishedExtraTime
} from "../cup-rules.js";

describe("regras de copa e mando", () => {
  it("partida normal da Copa termina quando alguem faz 4 gols primeiro", () => {
    assert.deepEqual(validateFinishedCupLeg({ home: 4, away: 1 }), {
      winnerSide: "home",
      loserSide: "away"
    });
    assert.throws(() => validateFinishedCupLeg({ home: 3, away: 1 }), /4 gols primeiro/);
    assert.throws(() => validateFinishedCupLeg({ home: 4, away: 4 }), /4 gols primeiro/);
  });

  it("prorrogacao so termina a partir do quarto gol com dois de diferenca", () => {
    assert.deepEqual(validateFinishedExtraTime({ home: 5, away: 3 }), {
      winnerSide: "home",
      loserSide: "away"
    });
    assert.throws(() => validateFinishedExtraTime({ home: 4, away: 3 }), /2 gols de diferenca/);
    assert.throws(() => validateFinishedExtraTime({ home: 3, away: 1 }), /quarto gol/);
  });

  it("define vencedor pelo placar agregado em ida e volta", () => {
    const result = aggregateTie({
      homeFirstLegTeamId: "castelao",
      awayFirstLegTeamId: "panasonic",
      firstLeg: { home: 4, away: 1 },
      secondLeg: { home: 4, away: 2 }
    });

    assert.equal(result.winnerTeamId, "castelao");
    assert.equal(result.loserTeamId, "panasonic");
    assert.equal(result.tied, false);
  });

  it("usa prorrogacao quando agregados ficam empatados", () => {
    const result = aggregateTie({
      homeFirstLegTeamId: "castelao",
      awayFirstLegTeamId: "panasonic",
      firstLeg: { home: 4, away: 1 },
      secondLeg: { home: 4, away: 1 },
      extraTime: { home: 3, away: 5 }
    });

    assert.equal(result.winnerTeamId, "castelao");
  });

  it("encerra o confronto quando a virada fica matematicamente impossivel", () => {
    const result = evaluateSecondLegLiveTie({
      homeFirstLegTeamId: "castelao",
      awayFirstLegTeamId: "panasonic",
      firstLeg: { home: 4, away: 1 },
      secondLeg: { home: 4, away: 2 }
    });

    assert.equal(result.canStillReverse, false);
    assert.equal(result.clinchedWinnerTeamId, "castelao");
    assert.equal(result.eliminatedTeamId, "panasonic");
  });

  it("mantem confronto vivo enquanto ainda da para empatar o agregado", () => {
    const result = evaluateSecondLegLiveTie({
      homeFirstLegTeamId: "castelao",
      awayFirstLegTeamId: "panasonic",
      firstLeg: { home: 4, away: 1 },
      secondLeg: { home: 3, away: 1 }
    });

    assert.equal(result.canStillReverse, true);
    assert.equal(result.clinchedWinnerTeamId, null);
  });

  it("aceita volta encerrada antes dos 4 quando o vencedor da ida garante o agregado", () => {
    const result = validateFinishedSecondLeg({
      homeFirstLegTeamId: "time-x",
      awayFirstLegTeamId: "time-y",
      firstLeg: { home: 4, away: 1 },
      secondLeg: { home: 1, away: 2 }
    });

    assert.equal(result.endedEarly, true);
    assert.equal(result.winnerTeamId, "time-x");
    assert.equal(result.loserTeamId, "time-y");
  });

  it("nao aceita volta encerrada cedo se o adversario ainda puder reverter", () => {
    assert.throws(
      () =>
        validateFinishedSecondLeg({
          homeFirstLegTeamId: "time-x",
          awayFirstLegTeamId: "time-y",
          firstLeg: { home: 4, away: 1 },
          secondLeg: { home: 2, away: 1 }
        }),
      /matematicamente irreversivel/
    );
  });

  it("nao aceita empate em 4 a 4 no jogo de volta", () => {
    assert.throws(
      () =>
        validateFinishedSecondLeg({
          homeFirstLegTeamId: "time-x",
          awayFirstLegTeamId: "time-y",
          firstLeg: { home: 4, away: 1 },
          secondLeg: { home: 4, away: 4 }
        }),
      /4 gols primeiro/
    );
  });

  it("coloca o melhor time para jogar o ultimo jogo em casa", () => {
    const home = chooseSecondLegHomeTeam(
      { teamId: "a", teamName: "Castelao", goalsFor: 8, goalsAgainst: 2, points: 6 },
      { teamId: "b", teamName: "Panasonic", goalsFor: 4, goalsAgainst: 2, points: 4 }
    );

    assert.equal(home.teamId, "a");
  });

  it("usa saldo quando os pontos de campanha empatam", () => {
    const home = chooseSecondLegHomeTeam(
      { teamId: "a", teamName: "Castelao", goalsFor: 5, goalsAgainst: 3, points: 6 },
      { teamId: "b", teamName: "Panasonic", goalsFor: 7, goalsAgainst: 2, points: 6 }
    );

    assert.equal(home.teamId, "b");
  });

  it("na final, quem nao foi para prorrogacao joga a ultima partida em casa", () => {
    const decision = chooseFinalSecondLegHomeTeam(
      {
        teamId: "a",
        teamName: "Castelao",
        usedExtraTime: true,
        goalsForInTie: 8,
        goalsAgainstInTie: 8,
        extraTimeGoalsAgainst: 3
      },
      {
        teamId: "b",
        teamName: "Panasonic",
        usedExtraTime: false,
        goalsForInTie: 8,
        goalsAgainstInTie: 4
      }
    );

    assert.equal(decision.homeTeam?.teamId, "b");
  });

  it("na final, se ambos foram para prorrogacao, joga em casa quem levou menos gols nela", () => {
    const decision = chooseFinalSecondLegHomeTeam(
      {
        teamId: "a",
        teamName: "Castelao",
        usedExtraTime: true,
        goalsForInTie: 8,
        goalsAgainstInTie: 8,
        extraTimeGoalsAgainst: 4
      },
      {
        teamId: "b",
        teamName: "Panasonic",
        usedExtraTime: true,
        goalsForInTie: 8,
        goalsAgainstInTie: 8,
        extraTimeGoalsAgainst: 3
      }
    );

    assert.equal(decision.homeTeam?.teamId, "b");
  });

  it("na final, se ninguem foi para prorrogacao, joga em casa quem sofreu menos gols nas duas partidas", () => {
    const decision = chooseFinalSecondLegHomeTeam(
      {
        teamId: "a",
        teamName: "Castelao",
        usedExtraTime: false,
        goalsForInTie: 8,
        goalsAgainstInTie: 5
      },
      {
        teamId: "b",
        teamName: "Panasonic",
        usedExtraTime: false,
        goalsForInTie: 8,
        goalsAgainstInTie: 3
      }
    );

    assert.equal(decision.homeTeam?.teamId, "b");
  });

  it("na final, empate completo exige decisao manual", () => {
    const decision = chooseFinalSecondLegHomeTeam(
      {
        teamId: "a",
        teamName: "Castelao",
        usedExtraTime: false,
        goalsForInTie: 8,
        goalsAgainstInTie: 4
      },
      {
        teamId: "b",
        teamName: "Panasonic",
        usedExtraTime: false,
        goalsForInTie: 8,
        goalsAgainstInTie: 4
      }
    );

    assert.equal(decision.homeTeam, null);
  });

  it("no terceiro lugar, joga em casa quem fez mais gols na semifinal", () => {
    const decision = chooseThirdPlaceSecondLegHomeTeam(
      {
        teamId: "a",
        teamName: "Castelao",
        usedExtraTime: false,
        goalsForInTie: 7,
        goalsAgainstInTie: 8
      },
      {
        teamId: "b",
        teamName: "Panasonic",
        usedExtraTime: false,
        goalsForInTie: 5,
        goalsAgainstInTie: 8
      }
    );

    assert.equal(decision.homeTeam?.teamId, "a");
  });
});
