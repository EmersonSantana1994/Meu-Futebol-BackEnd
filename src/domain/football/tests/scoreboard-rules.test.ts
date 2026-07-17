import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addGoalToScoreboard, incrementPlayerStat } from "../scoreboard-rules.js";

const player = {
  playerId: "p1",
  playerName: "Varicel",
  teamId: "t1",
  teamName: "Castelao"
};

describe("regras de placar, artilharia e assistencia", () => {
  it("quando jogador marca gol, aumenta placar do time dele", () => {
    const scoreboard = addGoalToScoreboard([], player);

    assert.deepEqual(scoreboard, [{ teamId: "t1", teamName: "Castelao", goals: 1 }]);
  });

  it("soma gols no placar do time existente", () => {
    const scoreboard = addGoalToScoreboard(
      [{ teamId: "t1", teamName: "Castelao", goals: 2 }],
      player,
      2
    );

    assert.equal(scoreboard[0].goals, 4);
  });

  it("atualiza estatistica total e do torneio do jogador", () => {
    const stats = incrementPlayerStat([], player);
    const nextStats = incrementPlayerStat(stats, player, 3);

    assert.equal(nextStats[0].total, 4);
    assert.equal(nextStats[0].tournamentTotal, 4);
  });
});
