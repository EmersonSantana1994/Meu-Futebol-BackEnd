import { Router } from "express";
import { z } from "zod";
import { createCupOpeningBracket } from "../../domain/football/cup-bracket-rules.js";
import { prisma } from "../../shared/prisma.js";
import {
  aggregateTie,
  chooseFinalSecondLegHomeTeam,
  chooseSecondLegHomeTeam,
  chooseThirdPlaceSecondLegHomeTeam,
  evaluateSecondLegLiveTie,
  validateFinishedSecondLeg,
  validateFinishedCupLeg,
  validateFinishedExtraTime
} from "../../domain/football/cup-rules.js";

export const cupsRouter = Router();

const scoreSchema = z.object({
  home: z.number().int().min(0),
  away: z.number().int().min(0)
});

const cupModelSchema = z.enum(["semifinals", "six-teams", "quarterfinals", "round-of-16"]);

function bracketResponse(bracket: {
  tournamentName: string;
  model: string;
  byeTeamIds: unknown;
  matches: Array<{
    id: string;
    phase: string;
    order: number;
    firstHomeScore: number | null;
    firstAwayScore: number | null;
    secondHomeScore: number | null;
    secondAwayScore: number | null;
    extraHomeScore: number | null;
    extraAwayScore: number | null;
    scoreSavedAt: Date | null;
    firstScoreSavedAt: Date | null;
    secondScoreSavedAt: Date | null;
    extraScoreSavedAt: Date | null;
    homeTeam: { id: string; name: string };
    awayTeam: { id: string; name: string };
  }>;
}) {
  return {
    tournamentName: bracket.tournamentName,
    model: bracket.model,
    byeTeamIds: Array.isArray(bracket.byeTeamIds) ? bracket.byeTeamIds : [],
    matches: bracket.matches.map((match) => ({
      id: match.id,
      phase: match.phase,
      order: match.order,
      home: match.homeTeam,
      away: match.awayTeam,
      firstHomeScore: match.firstHomeScore,
      firstAwayScore: match.firstAwayScore,
      secondHomeScore: match.secondHomeScore,
      secondAwayScore: match.secondAwayScore,
      extraHomeScore: match.extraHomeScore,
      extraAwayScore: match.extraAwayScore,
      scoreSavedAt: match.scoreSavedAt,
      firstScoreSavedAt: match.firstScoreSavedAt,
      secondScoreSavedAt: match.secondScoreSavedAt,
      extraScoreSavedAt: match.extraScoreSavedAt
    }))
  };
}

type PersistedCupMatch = {
  id: string;
  order: number;
  homeTeamId: string;
  awayTeamId: string;
  firstHomeScore: number | null;
  firstAwayScore: number | null;
  secondHomeScore: number | null;
  secondAwayScore: number | null;
  extraHomeScore: number | null;
  extraAwayScore: number | null;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
};

function completedTieResult(match: PersistedCupMatch) {
  if (
    match.firstHomeScore == null ||
    match.firstAwayScore == null ||
    match.secondHomeScore == null ||
    match.secondAwayScore == null
  ) {
    throw new Error(`O jogo ${match.order} ainda nao possui os placares de ida e volta.`);
  }

  const firstHomeAggregate =
    match.firstHomeScore + match.secondAwayScore + (match.extraAwayScore ?? 0);
  const firstAwayAggregate =
    match.firstAwayScore + match.secondHomeScore + (match.extraHomeScore ?? 0);

  if (firstHomeAggregate === firstAwayAggregate) {
    throw new Error(
      `O jogo ${match.order} esta empatado no agregado e precisa de uma prorrogacao valida.`
    );
  }

  const homeLegWins =
    Number(match.firstHomeScore > match.firstAwayScore) +
    Number(match.secondAwayScore > match.secondHomeScore);
  const awayLegWins =
    Number(match.firstAwayScore > match.firstHomeScore) +
    Number(match.secondHomeScore > match.secondAwayScore);
  const homeWon = firstHomeAggregate > firstAwayAggregate;
  const winner = homeWon ? match.homeTeam : match.awayTeam;
  const loser = homeWon ? match.awayTeam : match.homeTeam;

  return {
    winner,
    loser,
    campaign: {
      teamId: winner.id,
      teamName: winner.name,
      goalsFor: homeWon ? firstHomeAggregate : firstAwayAggregate,
      goalsAgainst: homeWon ? firstAwayAggregate : firstHomeAggregate,
      points: (homeWon ? homeLegWins : awayLegWins) * 3
    },
    winnerSemifinalCampaign: {
      teamId: winner.id,
      teamName: winner.name,
      usedExtraTime: match.extraHomeScore != null && match.extraAwayScore != null,
      goalsForInTie: homeWon
        ? match.firstHomeScore + match.secondAwayScore
        : match.firstAwayScore + match.secondHomeScore,
      goalsAgainstInTie: homeWon
        ? match.firstAwayScore + match.secondHomeScore
        : match.firstHomeScore + match.secondAwayScore,
      extraTimeGoalsAgainst: homeWon ? match.extraHomeScore ?? 0 : match.extraAwayScore ?? 0
    },
    loserSemifinalCampaign: {
      teamId: loser.id,
      teamName: loser.name,
      usedExtraTime: match.extraHomeScore != null && match.extraAwayScore != null,
      goalsForInTie: homeWon
        ? match.firstAwayScore + match.secondHomeScore
        : match.firstHomeScore + match.secondAwayScore,
      goalsAgainstInTie: homeWon
        ? match.firstHomeScore + match.secondAwayScore
        : match.firstAwayScore + match.secondHomeScore,
      extraTimeGoalsAgainst: homeWon ? match.extraAwayScore ?? 0 : match.extraHomeScore ?? 0
    }
  };
}

function cupPlacementPoints(position: number, rule: Record<string, number | string | Date>) {
  const fields = [
    "firstPlacePoints",
    "secondPlacePoints",
    "thirdPlacePoints",
    "fourthPlacePoints",
    "fifthPlacePoints",
    "sixthPlacePoints",
    "seventhPlacePoints",
    "eighthPlacePoints",
    "ninthPlacePoints",
    "tenthPlacePoints",
    "eleventhPlacePoints",
    "twelfthPlacePoints",
    "thirteenthPlacePoints",
    "fourteenthPlacePoints",
    "fifteenthPlacePoints",
    "sixteenthPlacePoints"
  ] as const;
  return Number(rule[fields[position - 1]] ?? 0);
}

async function cupFinalizationResponse(bracket: {
  tournamentName: string;
  finalSeason: string | null;
  finalTitleTypeId: string | null;
  championTeamId: string | null;
  runnerUpTeamId: string | null;
  thirdTeamId: string | null;
  bestPlayerIds: unknown;
  finalizedAt: Date | null;
}) {
  if (!bracket.finalizedAt || !bracket.championTeamId || !bracket.finalTitleTypeId) return null;
  const bestPlayerIds = Array.isArray(bracket.bestPlayerIds)
    ? bracket.bestPlayerIds.filter((id): id is string => typeof id === "string")
    : [];
  const [titleType, championTeam, runnerUpTeam, thirdTeam, players] = await Promise.all([
    prisma.tournamentTitleType.findUnique({ where: { id: bracket.finalTitleTypeId } }),
    prisma.team.findUnique({
      where: { id: bracket.championTeamId },
      include: { players: { orderBy: { name: "asc" } } }
    }),
    bracket.runnerUpTeamId
      ? prisma.team.findUnique({
          where: { id: bracket.runnerUpTeamId },
          include: { players: { orderBy: { name: "asc" } } }
        })
      : null,
    bracket.thirdTeamId
      ? prisma.team.findUnique({ where: { id: bracket.thirdTeamId } })
      : null,
    prisma.player.findMany({ where: { id: { in: bestPlayerIds } } })
  ]);
  const playersById = new Map(players.map((player) => [player.id, player]));
  return {
    finalization: {
      tournamentName: bracket.tournamentName,
      season: bracket.finalSeason,
      finalizedAt: bracket.finalizedAt
    },
    titleType,
    championTeam,
    runnerUpTeam,
    thirdTeam,
    bestPlayers: bestPlayerIds.flatMap((id) => {
      const player = playersById.get(id);
      return player ? [player] : [];
    })
  };
}

cupsRouter.get("/brackets/opening/:model", async (req, res, next) => {
  try {
    const model = cupModelSchema.parse(req.params.model);
    const bracket = await prisma.cupBracket.findUnique({
      where: { model },
      include: {
        matches: {
          orderBy: { order: "asc" },
          include: { homeTeam: true, awayTeam: true }
        }
      }
    });

    res.json(bracket ? bracketResponse(bracket) : null);
  } catch (error) {
    next(error);
  }
});

cupsRouter.get("/brackets/:model/finalization", async (req, res, next) => {
  try {
    const model = cupModelSchema.parse(req.params.model);
    const bracket = await prisma.cupBracket.findUnique({ where: { model } });
    res.json(bracket ? await cupFinalizationResponse(bracket) : null);
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/brackets/:model/finalize", async (req, res, next) => {
  try {
    const model = cupModelSchema.parse(req.params.model);
    const data = z
      .object({
        tournamentName: z.string().trim().min(1),
        season: z.string().trim().min(1),
        titleTypeId: z.string().trim().min(1),
        teamRuleId: z.string().trim().min(1),
        placements: z.array(
          z.object({
            position: z.number().int().min(1).max(16),
            teamId: z.string().trim().min(1)
          })
        ),
        bestPlayerIds: z.array(z.string().trim().min(1)).max(3)
      })
      .refine((value) => new Set(value.bestPlayerIds).size === value.bestPlayerIds.length, {
        message: "Os tres melhores jogadores nao podem se repetir."
      })
      .refine(
        (value) => new Set(value.placements.map((item) => item.position)).size === value.placements.length,
        { message: "Uma posicao nao pode ser informada mais de uma vez." }
      )
      .refine(
        (value) => new Set(value.placements.map((item) => item.teamId)).size === value.placements.length,
        { message: "Um time nao pode ocupar mais de uma posicao." }
      )
      .parse(req.body);

    await prisma.$transaction(async (tx) => {
      const bracket = await tx.cupBracket.findUnique({
        where: { model },
        include: {
          matches: {
            include: { homeTeam: true, awayTeam: true }
          }
        }
      });
      if (!bracket) throw new Error("Copa nao encontrada.");
      if (bracket.finalizedAt) throw new Error("Esta Copa ja foi finalizada.");

      const finalMatch = bracket.matches.find((match) => match.phase === "final");
      const thirdMatch = bracket.matches.find((match) => match.phase === "third-place");
      if (!finalMatch || !thirdMatch) {
        throw new Error("Gere e conclua a final e a disputa de terceiro lugar antes de finalizar a Copa.");
      }
      const finalResult = completedTieResult(finalMatch);
      const thirdResult = completedTieResult(thirdMatch);

      const [teamRule, titleType, playerRule, selectedPlayers] = await Promise.all([
        tx.teamTournamentPointRule.findUnique({ where: { id: data.teamRuleId } }),
        tx.tournamentTitleType.findUnique({ where: { id: data.titleTypeId } }),
        tx.playerAwardPointRule.findFirst({ orderBy: { createdAt: "desc" } }),
        tx.player.findMany({ where: { id: { in: data.bestPlayerIds } } })
      ]);
      if (!teamRule) throw new Error("Regra de pontuacao dos times nao encontrada.");
      if (!titleType) throw new Error("Tipo de titulo nao encontrado.");
      if (selectedPlayers.length !== data.bestPlayerIds.length) {
        throw new Error("Um ou mais melhores jogadores nao existem no banco.");
      }
      const participantTeamIds = new Set(
        bracket.matches.flatMap((match) => [match.homeTeamId, match.awayTeamId])
      );
      if (data.placements.some((placement) => !participantTeamIds.has(placement.teamId))) {
        throw new Error("Todos os colocados precisam ter participado desta Copa.");
      }

      const requiredPositions = Array.from({ length: 16 }, (_, index) => index + 1).filter(
        (position) => cupPlacementPoints(position, teamRule) > 0
      );
      const informedPositions = data.placements
        .map((placement) => placement.position)
        .sort((a, b) => a - b);
      if (
        requiredPositions.length !== informedPositions.length ||
        requiredPositions.some((position, index) => position !== informedPositions[index])
      ) {
        throw new Error(
          "Informe todos os colocados que possuem pontuacao maior que zero nesta regra."
        );
      }

      const placementByPosition = new Map(
        data.placements.map((placement) => [placement.position, placement.teamId])
      );
      const championTeamId = placementByPosition.get(1);
      const runnerUpTeamId = placementByPosition.get(2);
      const thirdTeamId = placementByPosition.get(3);
      if (
        championTeamId !== finalResult.winner.id ||
        runnerUpTeamId !== finalResult.loser.id ||
        thirdTeamId !== thirdResult.winner.id
      ) {
        throw new Error("Campeao, vice e terceiro lugar nao correspondem aos placares da fase final.");
      }

      for (const { position, teamId } of data.placements) {
        const points = cupPlacementPoints(position, teamRule);
        await tx.teamSeasonRanking.upsert({
          where: { season_teamId: { season: data.season, teamId } },
          create: { season: data.season, teamId, points },
          update: { points: { increment: points } }
        });
      }

      if (playerRule) {
        for (const [index, playerId] of data.bestPlayerIds.entries()) {
          const points = cupPlacementPoints(index + 1, playerRule);
          await tx.playerSeasonStat.upsert({
            where: { season_playerId: { season: data.season, playerId } },
            create: { season: data.season, playerId, points },
            update: { points: { increment: points } }
          });
        }
      }

      const championPlayers = await tx.player.findMany({
        where: { teamId: championTeamId }
      });
      for (const player of championPlayers) {
        await tx.playerTournamentTitle.upsert({
          where: {
            season_playerId_titleTypeId: {
              season: data.season,
              playerId: player.id,
              titleTypeId: data.titleTypeId
            }
          },
          create: {
            season: data.season,
            playerId: player.id,
            titleTypeId: data.titleTypeId,
            titles: 1
          },
          update: { titles: { increment: 1 } }
        });
      }

      await tx.cupBracket.update({
        where: { id: bracket.id },
        data: {
          tournamentName: data.tournamentName,
          finalSeason: data.season,
          finalTitleTypeId: data.titleTypeId,
          finalTeamRuleId: data.teamRuleId,
          championTeamId,
          runnerUpTeamId,
          thirdTeamId,
          placementTeamIds: data.placements
            .sort((a, b) => a.position - b.position)
            .map((placement) => placement.teamId),
          bestPlayerIds: data.bestPlayerIds,
          finalizedAt: new Date()
        }
      });
    });

    const finalized = await prisma.cupBracket.findUniqueOrThrow({ where: { model } });
    res.status(201).json(await cupFinalizationResponse(finalized));
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/brackets/:model/semifinals", async (req, res, next) => {
  try {
    const model = cupModelSchema.parse(req.params.model);
    const bracket = await prisma.cupBracket.findUnique({
      where: { model },
      include: {
        matches: {
          orderBy: [{ phase: "asc" }, { order: "asc" }],
          include: { homeTeam: true, awayTeam: true }
        }
      }
    });

    if (!bracket) {
      throw new Error("Gere e salve as quartas de final antes de gerar as semifinais.");
    }
    if (bracket.matches.some((match) => match.phase === "semifinals")) {
      throw new Error("As semifinais desta Copa ja foram geradas.");
    }

    const quarterfinals = bracket.matches
      .filter((match) => match.phase === "quarterfinals")
      .sort((a, b) => a.order - b.order);
    if (quarterfinals.length !== 4) {
      throw new Error("Sao necessarios quatro confrontos de quartas para gerar as semifinais.");
    }

    const qualified = quarterfinals.map(completedTieResult);
    const semifinalPairs = [
      [qualified[0], qualified[1]],
      [qualified[2], qualified[3]]
    ];

    await prisma.$transaction(
      semifinalPairs.map(([teamA, teamB], index) => {
        const secondLegHome = chooseSecondLegHomeTeam(teamA.campaign, teamB.campaign);
        const firstLegHome = secondLegHome.teamId === teamA.winner.id ? teamB.winner : teamA.winner;
        const secondLegHomeTeam =
          secondLegHome.teamId === teamA.winner.id ? teamA.winner : teamB.winner;

        return prisma.cupBracketMatch.create({
          data: {
            bracketId: bracket.id,
            phase: "semifinals",
            order: index + 1,
            homeTeamId: firstLegHome.id,
            awayTeamId: secondLegHomeTeam.id
          }
        });
      })
    );

    const updated = await prisma.cupBracket.findUniqueOrThrow({
      where: { id: bracket.id },
      include: {
        matches: {
          orderBy: [{ phase: "asc" }, { order: "asc" }],
          include: { homeTeam: true, awayTeam: true }
        }
      }
    });

    res.status(201).json(bracketResponse(updated));
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/brackets/:model/final-stage", async (req, res, next) => {
  try {
    const model = cupModelSchema.parse(req.params.model);
    const body = z
      .object({
        finalSecondLegHomeTeamId: z.string().trim().min(1).optional(),
        thirdPlaceSecondLegHomeTeamId: z.string().trim().min(1).optional()
      })
      .parse(req.body);
    const bracket = await prisma.cupBracket.findUnique({
      where: { model },
      include: {
        matches: {
          orderBy: [{ phase: "asc" }, { order: "asc" }],
          include: { homeTeam: true, awayTeam: true }
        }
      }
    });
    if (!bracket) throw new Error("Copa nao encontrada.");
    if (bracket.matches.some((match) => match.phase === "final")) {
      throw new Error("A final e a disputa de terceiro lugar ja foram geradas.");
    }

    const semifinals = bracket.matches
      .filter((match) => match.phase === "semifinals")
      .sort((a, b) => a.order - b.order);
    if (semifinals.length !== 2) {
      throw new Error("Sao necessarios dois confrontos de semifinal para gerar a fase final.");
    }
    const results = semifinals.map(completedTieResult);
    const finalistA = results[0].winnerSemifinalCampaign;
    const finalistB = results[1].winnerSemifinalCampaign;
    const thirdA = results[0].loserSemifinalCampaign;
    const thirdB = results[1].loserSemifinalCampaign;

    const finalDecision = chooseFinalSecondLegHomeTeam(finalistA, finalistB);
    const thirdDecision = chooseThirdPlaceSecondLegHomeTeam(thirdA, thirdB);
    const finalHomeId = finalDecision.homeTeam?.teamId ?? body.finalSecondLegHomeTeamId;
    const thirdHomeId =
      thirdDecision.homeTeam?.teamId ?? body.thirdPlaceSecondLegHomeTeamId;

    const finalistIds = [finalistA.teamId, finalistB.teamId];
    const thirdIds = [thirdA.teamId, thirdB.teamId];
    if (!finalHomeId) {
      throw new Error(
        `O mando da volta da final precisa de decisao manual. ${finalDecision.reason}`
      );
    }
    if (!finalistIds.includes(finalHomeId)) {
      throw new Error("O mando manual da final precisa ser atribuido a um dos finalistas.");
    }
    if (!thirdHomeId) {
      throw new Error(
        `O mando da volta do terceiro lugar precisa de decisao manual. ${thirdDecision.reason}`
      );
    }
    if (!thirdIds.includes(thirdHomeId)) {
      throw new Error("O mando manual do terceiro lugar precisa ser atribuido a um dos participantes.");
    }

    const finalFirstHomeId = finalistIds.find((teamId) => teamId !== finalHomeId)!;
    const thirdFirstHomeId = thirdIds.find((teamId) => teamId !== thirdHomeId)!;
    await prisma.$transaction([
      prisma.cupBracketMatch.create({
        data: {
          bracketId: bracket.id,
          phase: "final",
          order: 1,
          homeTeamId: finalFirstHomeId,
          awayTeamId: finalHomeId
        }
      }),
      prisma.cupBracketMatch.create({
        data: {
          bracketId: bracket.id,
          phase: "third-place",
          order: 1,
          homeTeamId: thirdFirstHomeId,
          awayTeamId: thirdHomeId
        }
      })
    ]);

    const updated = await prisma.cupBracket.findUniqueOrThrow({
      where: { id: bracket.id },
      include: {
        matches: {
          orderBy: [{ phase: "asc" }, { order: "asc" }],
          include: { homeTeam: true, awayTeam: true }
        }
      }
    });
    res.status(201).json(bracketResponse(updated));
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/brackets/opening", async (req, res, next) => {
  try {
    const body = z
      .object({
        tournamentName: z.string().min(1),
        model: cupModelSchema,
        teams: z.array(z.object({ id: z.string(), name: z.string() })),
        byeTeamIds: z.array(z.string()).optional()
      })
      .parse(req.body);

    const existing = await prisma.cupBracket.findUnique({ where: { model: body.model } });
    if (existing) {
      throw new Error("Ja existe um chaveamento salvo para este modelo. Limpe-o antes de gerar outro.");
    }

    const teamIds = [...new Set(body.teams.map((team) => team.id))];
    const storedTeams = await prisma.team.findMany({ where: { id: { in: teamIds } } });
    if (storedTeams.length !== teamIds.length) {
      throw new Error("Um ou mais times nao existem no banco.");
    }

    const opening = createCupOpeningBracket(body.model, storedTeams, body.tournamentName, body.byeTeamIds ?? []);
    const bracket = await prisma.cupBracket.create({
      data: {
        tournamentName: opening.tournamentName,
        model: opening.model,
        byeTeamIds: body.byeTeamIds ?? [],
        matches: {
          create: opening.matches.map((match) => ({
            phase: match.phase,
            order: match.order,
            homeTeamId: match.home.id,
            awayTeamId: match.away.id
          }))
        }
      },
      include: {
        matches: {
          orderBy: { order: "asc" },
          include: { homeTeam: true, awayTeam: true }
        }
      }
    });

    res.status(201).json(bracketResponse(bracket));
  } catch (error) {
    next(error);
  }
});

cupsRouter.patch("/brackets/matches/:matchId/score", async (req, res, next) => {
  try {
    const matchId = z.string().trim().min(1).parse(req.params.matchId);
    const score = z
      .object({
        firstHomeScore: z.number().int().min(0).nullable(),
        firstAwayScore: z.number().int().min(0).nullable(),
        secondHomeScore: z.number().int().min(0).nullable(),
        secondAwayScore: z.number().int().min(0).nullable(),
        extraHomeScore: z.number().int().min(0).nullable(),
        extraAwayScore: z.number().int().min(0).nullable()
      })
      .refine(
        (data) =>
          [
            [data.firstHomeScore, data.firstAwayScore],
            [data.secondHomeScore, data.secondAwayScore],
            [data.extraHomeScore, data.extraAwayScore]
          ].every(([home, away]) => (home == null && away == null) || (home != null && away != null)),
        { message: "Preencha os dois placares de cada etapa informada." }
      )
      .refine(
        (data) =>
          data.firstHomeScore != null ||
          data.secondHomeScore != null ||
          data.extraHomeScore != null,
        { message: "Informe pelo menos um placar antes de salvar." }
      )
      .parse(req.body);

    const match = await prisma.cupBracketMatch.update({
      where: { id: matchId },
      data: { ...score, scoreSavedAt: new Date() },
      include: { homeTeam: true, awayTeam: true }
    });

    res.json({
      id: match.id,
      phase: match.phase,
      order: match.order,
      home: match.homeTeam,
      away: match.awayTeam,
      ...score,
      scoreSavedAt: match.scoreSavedAt
    });
  } catch (error) {
    next(error);
  }
});

cupsRouter.patch("/brackets/matches/:matchId/score/:stage", async (req, res, next) => {
  try {
    const matchId = z.string().trim().min(1).parse(req.params.matchId);
    const stage = z.enum(["first", "second", "extra"]).parse(req.params.stage);
    const score = scoreSchema.parse(req.body);

    const currentMatch = await prisma.cupBracketMatch.findUnique({ where: { id: matchId } });
    if (!currentMatch) {
      throw new Error("Confronto da Copa nao encontrado.");
    }

    if (stage === "first") {
      validateFinishedCupLeg(score);
    } else if (stage === "second") {
      if (currentMatch.firstHomeScore == null || currentMatch.firstAwayScore == null) {
        throw new Error("Salve o placar do jogo de ida antes de salvar o jogo de volta.");
      }

      validateFinishedSecondLeg({
        firstLeg: {
          home: currentMatch.firstHomeScore,
          away: currentMatch.firstAwayScore
        },
        secondLeg: score,
        homeFirstLegTeamId: currentMatch.homeTeamId,
        awayFirstLegTeamId: currentMatch.awayTeamId
      });
    } else {
      if (
        currentMatch.firstHomeScore == null ||
        currentMatch.firstAwayScore == null ||
        currentMatch.secondHomeScore == null ||
        currentMatch.secondAwayScore == null
      ) {
        throw new Error("Salve os placares de ida e volta antes de salvar a prorrogacao.");
      }

      const homeFirstTeamAggregate =
        currentMatch.firstHomeScore + currentMatch.secondAwayScore;
      const awayFirstTeamAggregate =
        currentMatch.firstAwayScore + currentMatch.secondHomeScore;
      if (homeFirstTeamAggregate !== awayFirstTeamAggregate) {
        throw new Error("A prorrogacao so pode ser jogada quando o placar agregado estiver empatado.");
      }

      validateFinishedExtraTime(score);
    }
    const savedAt = new Date();
    const data =
      stage === "first"
        ? { firstHomeScore: score.home, firstAwayScore: score.away, firstScoreSavedAt: savedAt }
        : stage === "second"
          ? { secondHomeScore: score.home, secondAwayScore: score.away, secondScoreSavedAt: savedAt }
          : { extraHomeScore: score.home, extraAwayScore: score.away, extraScoreSavedAt: savedAt };

    const match = await prisma.cupBracketMatch.update({
      where: { id: matchId },
      data,
      include: { homeTeam: true, awayTeam: true }
    });

    res.json({
      id: match.id,
      phase: match.phase,
      order: match.order,
      home: match.homeTeam,
      away: match.awayTeam,
      firstHomeScore: match.firstHomeScore,
      firstAwayScore: match.firstAwayScore,
      secondHomeScore: match.secondHomeScore,
      secondAwayScore: match.secondAwayScore,
      extraHomeScore: match.extraHomeScore,
      extraAwayScore: match.extraAwayScore,
      scoreSavedAt: match.scoreSavedAt,
      firstScoreSavedAt: match.firstScoreSavedAt,
      secondScoreSavedAt: match.secondScoreSavedAt,
      extraScoreSavedAt: match.extraScoreSavedAt
    });
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/brackets/matches/:matchId/clear-score/:stage", async (req, res, next) => {
  try {
    const matchId = z.string().trim().min(1).parse(req.params.matchId);
    const stage = z.enum(["first", "second", "extra"]).parse(req.params.stage);
    const data =
      stage === "first"
        ? { firstHomeScore: null, firstAwayScore: null, firstScoreSavedAt: null }
        : stage === "second"
          ? { secondHomeScore: null, secondAwayScore: null, secondScoreSavedAt: null }
          : { extraHomeScore: null, extraAwayScore: null, extraScoreSavedAt: null };

    await prisma.cupBracketMatch.update({ where: { id: matchId }, data });
    res.json({ ok: true, matchId, stage });
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/brackets/matches/:matchId/clear-score", async (req, res, next) => {
  try {
    const matchId = z.string().trim().min(1).parse(req.params.matchId);
    const match = await prisma.cupBracketMatch.update({
      where: { id: matchId },
      data: {
        firstHomeScore: null,
        firstAwayScore: null,
        secondHomeScore: null,
        secondAwayScore: null,
        extraHomeScore: null,
        extraAwayScore: null,
        scoreSavedAt: null
      },
      include: { homeTeam: true, awayTeam: true }
    });

    res.json({
      id: match.id,
      phase: match.phase,
      order: match.order,
      home: match.homeTeam,
      away: match.awayTeam,
      firstHomeScore: null,
      firstAwayScore: null,
      secondHomeScore: null,
      secondAwayScore: null,
      extraHomeScore: null,
      extraAwayScore: null,
      scoreSavedAt: null
    });
  } catch (error) {
    next(error);
  }
});

cupsRouter.delete("/brackets/opening/:model", async (req, res, next) => {
  try {
    const model = cupModelSchema.parse(req.params.model);
    await prisma.cupBracket.deleteMany({ where: { model } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/rules/aggregate-tie", (req, res, next) => {
  try {
    const body = z
      .object({
        firstLeg: scoreSchema,
        secondLeg: scoreSchema,
        extraTime: scoreSchema.optional(),
        homeFirstLegTeamId: z.string(),
        awayFirstLegTeamId: z.string()
      })
      .parse(req.body);

    res.json(aggregateTie(body));
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/rules/validate-leg", (req, res, next) => {
  try {
    const score = scoreSchema.parse(req.body);
    res.json(validateFinishedCupLeg(score));
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/rules/validate-extra-time", (req, res, next) => {
  try {
    const score = scoreSchema.parse(req.body);
    res.json(validateFinishedExtraTime(score));
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/rules/live-second-leg", (req, res, next) => {
  try {
    const body = z
      .object({
        firstLeg: scoreSchema,
        secondLeg: scoreSchema,
        homeFirstLegTeamId: z.string(),
        awayFirstLegTeamId: z.string()
      })
      .parse(req.body);

    res.json(evaluateSecondLegLiveTie(body));
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/rules/second-leg-home", (req, res, next) => {
  try {
    const teamSchema = z.object({
      teamId: z.string(),
      teamName: z.string(),
      goalsFor: z.number().int(),
      goalsAgainst: z.number().int(),
      points: z.number().int().optional()
    });

    const body = z.object({ teamA: teamSchema, teamB: teamSchema }).parse(req.body);

    res.json({ homeTeam: chooseSecondLegHomeTeam(body.teamA, body.teamB) });
  } catch (error) {
    next(error);
  }
});

const semifinalCampaignSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  usedExtraTime: z.boolean(),
  goalsForInTie: z.number().int().min(0),
  goalsAgainstInTie: z.number().int().min(0),
  extraTimeGoalsAgainst: z.number().int().min(0).optional()
});

cupsRouter.post("/rules/final-second-leg-home", (req, res, next) => {
  try {
    const body = z
      .object({
        finalistA: semifinalCampaignSchema,
        finalistB: semifinalCampaignSchema
      })
      .parse(req.body);

    res.json(chooseFinalSecondLegHomeTeam(body.finalistA, body.finalistB));
  } catch (error) {
    next(error);
  }
});

cupsRouter.post("/rules/third-place-second-leg-home", (req, res, next) => {
  try {
    const body = z
      .object({
        teamA: semifinalCampaignSchema,
        teamB: semifinalCampaignSchema
      })
      .parse(req.body);

    res.json(chooseThirdPlaceSecondLegHomeTeam(body.teamA, body.teamB));
  } catch (error) {
    next(error);
  }
});
