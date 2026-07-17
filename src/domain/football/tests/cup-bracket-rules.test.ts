import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCupOpeningBracket, getCupModelTeamCount } from "../cup-bracket-rules.js";

function makeTeams(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Time ${index + 1}`
  }));
}

describe("modelos de chaveamento da Copa", () => {
  it("semifinal precisa de 4 times e gera 2 confrontos", () => {
    const bracket = createCupOpeningBracket("semifinals", makeTeams(4), "Campeonato Mundial", () => 0.4);

    assert.equal(getCupModelTeamCount("semifinals"), 4);
    assert.equal(bracket.tournamentName, "Campeonato Mundial");
    assert.equal(bracket.matches.length, 2);
    assert.equal(new Set(bracket.matches.flatMap((match) => [match.home.id, match.away.id])).size, 4);
  });

  it("quartas precisa de 8 times e gera 4 confrontos", () => {
    const bracket = createCupOpeningBracket("quarterfinals", makeTeams(8), "Copa Nacional", () => 0.4);

    assert.equal(getCupModelTeamCount("quarterfinals"), 8);
    assert.equal(bracket.matches.length, 4);
    assert.equal(new Set(bracket.matches.flatMap((match) => [match.home.id, match.away.id])).size, 8);
  });

  it("oitavas precisa de 16 times e gera 8 confrontos", () => {
    const bracket = createCupOpeningBracket("round-of-16", makeTeams(16), "Super Mundial", () => 0.4);

    assert.equal(getCupModelTeamCount("round-of-16"), 16);
    assert.equal(bracket.matches.length, 8);
    assert.equal(new Set(bracket.matches.flatMap((match) => [match.home.id, match.away.id])).size, 16);
  });

  it("rejeita quantidade errada de times", () => {
    assert.throws(() => createCupOpeningBracket("quarterfinals", makeTeams(4)), /8 times/);
  });

  it("rejeita nome vazio de torneio", () => {
    assert.throws(() => createCupOpeningBracket("semifinals", makeTeams(4), " "), /nome do torneio/);
  });
});
