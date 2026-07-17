import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyTournamentResult,
  evaluateTournamentScore,
  sortLeagueStandings,
  sortStandings,
  type StandingRow
} from "../match-rules.js";

describe("regras de pontuacao do torneio principal", () => {
  it("da 3 pontos e 4 de saldo para vitoria por 4 x 0", () => {
    const result = evaluateTournamentScore({ home: 4, away: 0 });

    assert.equal(result.winnerSide, "home");
    assert.equal(result.winnerPoints, 3);
    assert.equal(result.goalBalance, 4);
  });

  it("da 2 pontos e 2 de saldo para vitoria por 3 x 1", () => {
    const result = evaluateTournamentScore({ home: 1, away: 3 });

    assert.equal(result.winnerSide, "away");
    assert.equal(result.winnerPoints, 2);
    assert.equal(result.goalBalance, 2);
  });

  it("da 1 ponto e 1 de saldo para vitoria por 3 x 2", () => {
    const result = evaluateTournamentScore({ home: 3, away: 2 });

    assert.equal(result.winnerSide, "home");
    assert.equal(result.winnerPoints, 1);
    assert.equal(result.goalBalance, 1);
  });

  it("rejeita placares fora do regulamento", () => {
    assert.throws(() => evaluateTournamentScore({ home: 2, away: 1 }), /Placar invalido/);
    assert.throws(() => evaluateTournamentScore({ home: 0, away: 0 }), /Placar invalido/);
    assert.throws(() => evaluateTournamentScore({ home: 5, away: 0 }), /Placar invalido/);
  });

  it("atualiza pontos do vencedor e saldo dos dois times", () => {
    const castelao: StandingRow = { teamId: "1", teamName: "Castelao", points: 0, goalBalance: 0 };
    const penharol: StandingRow = { teamId: "2", teamName: "Penharol", points: 0, goalBalance: 0 };

    const next = applyTournamentResult(castelao, penharol, { home: 3, away: 1 });

    assert.equal(next.home.points, 2);
    assert.equal(next.home.goalBalance, 2);
    assert.equal(next.away.points, 0);
    assert.equal(next.away.goalBalance, -2);
  });

  it("ordena ranking por pontos, saldo e nome", () => {
    const ranking = sortStandings([
      { teamId: "1", teamName: "Panasonic", points: 2, goalBalance: 2 },
      { teamId: "2", teamName: "Castelao", points: 3, goalBalance: 1 },
      { teamId: "3", teamName: "Democration", points: 3, goalBalance: 4 }
    ]);

    assert.deepEqual(
      ranking.map((team) => team.teamName),
      ["Democration", "Castelao", "Panasonic"]
    );
  });

  it("usa confronto direto quando pontos e saldo empatam", () => {
    const ranking = sortLeagueStandings(
      [
        { teamId: "brastemp", teamName: "Brastemp", points: 6, goalBalance: 5 },
        { teamId: "juventude", teamName: "Juventude", points: 6, goalBalance: 5 }
      ],
      [
        { homeTeamId: "brastemp", awayTeamId: "juventude", homeScore: 3, awayScore: 2 },
        { homeTeamId: "juventude", awayTeamId: "brastemp", homeScore: 3, awayScore: 1 }
      ]
    );

    assert.deepEqual(
      ranking.map((team) => team.teamName),
      ["Juventude", "Brastemp"]
    );
  });
});
