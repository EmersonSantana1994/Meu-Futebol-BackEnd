import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRoundRobinFixtures, shuffleTeams } from "../draw-rules.js";

const teams = [
  { id: "1", name: "Castelao" },
  { id: "2", name: "Democration" },
  { id: "3", name: "Panasonic" },
  { id: "4", name: "Penharol" }
];

describe("regras de sorteio e tabela", () => {
  it("sorteia todos os times sem repetir", () => {
    const shuffled = shuffleTeams(teams, () => 0.7);

    assert.equal(shuffled.length, teams.length);
    assert.equal(new Set(shuffled.map((team) => team.id)).size, teams.length);
  });

  it("gera 12 jogos para 4 times em turno e returno", () => {
    const fixtures = createRoundRobinFixtures(teams);

    assert.equal(fixtures.length, 12);
    assert.deepEqual(fixtures[0], { round: 1, home: teams[0], away: teams[1] });
    assert.deepEqual(fixtures[11], { round: 6, home: teams[3], away: teams[2] });
  });

  it("rejeita formato diferente de 4 times no torneio principal atual", () => {
    assert.throws(() => createRoundRobinFixtures(teams.slice(0, 3)), /exatamente 4 times/);
  });
});
