import { Router } from "express";
import { z } from "zod";
import { createRoundRobinFixtures, shuffleTeams } from "../../domain/football/draw-rules.js";
import { evaluateTournamentScore, sortLeagueStandings } from "../../domain/football/match-rules.js";
import { prisma } from "../../shared/prisma.js";

const router = Router();

const competitionParamsSchema = z.object({
  competitionId: z.string().trim().min(1)
});

const matchParamsSchema = z.object({
  matchId: z.string().trim().min(1)
});

const scoreSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  extraHomeScore: z.number().int().min(0).optional().nullable(),
  extraAwayScore: z.number().int().min(0).optional().nullable(),
  winnerTeamId: z.string().trim().optional().nullable()
});

const createCompetitionSchema = z.object({
  name: z.string().trim().min(1),
  season: z.string().trim().optional(),
  type: z.enum(["LEAGUE", "CUP"]),
  cupModel: z.enum(["SEMIFINALS", "SIX_TEAMS", "QUARTERFINALS", "ROUND_OF_16"]).optional().nullable(),
  teamIds: z.array(z.string().trim().min(1)).min(2)
});

const finalizeTournamentSchema = z.object({
  tournamentName: z.string().trim().min(1),
  titleTypeId: z.string().trim().min(1),
  teamRuleId: z.string().trim().min(1),
  championTeamId: z.string().trim().min(1),
  runnerUpTeamId: z.string().trim().optional().nullable(),
  thirdTeamId: z.string().trim().optional().nullable(),
  bestPlayerIds: z.array(z.string().trim().min(1)).max(3).optional()
});

function pointsForPosition(
  position: number,
  rule: {
    firstPlacePoints: number;
    secondPlacePoints: number;
    thirdPlacePoints: number;
    fourthPlacePoints?: number;
    fifthPlacePoints?: number;
    sixthPlacePoints?: number;
    seventhPlacePoints?: number;
    eighthPlacePoints?: number;
    ninthPlacePoints?: number;
    tenthPlacePoints?: number;
    eleventhPlacePoints?: number;
    twelfthPlacePoints?: number;
    thirteenthPlacePoints?: number;
    fourteenthPlacePoints?: number;
    fifteenthPlacePoints?: number;
    sixteenthPlacePoints?: number;
  }
) {
  const fieldByPosition = [
    rule.firstPlacePoints,
    rule.secondPlacePoints,
    rule.thirdPlacePoints,
    rule.fourthPlacePoints,
    rule.fifthPlacePoints,
    rule.sixthPlacePoints,
    rule.seventhPlacePoints,
    rule.eighthPlacePoints,
    rule.ninthPlacePoints,
    rule.tenthPlacePoints,
    rule.eleventhPlacePoints,
    rule.twelfthPlacePoints,
    rule.thirteenthPlacePoints,
    rule.fourteenthPlacePoints,
    rule.fifteenthPlacePoints,
    rule.sixteenthPlacePoints
  ];
  return fieldByPosition[position - 1] ?? 0;
}

router.get("/summary", async (_req, res, next) => {
  try {
    const [teamsCount, playersCount, competitionsCount, matchesCount, activeLeaguesCount, latestMatches] =
      await Promise.all([
        prisma.team.count(),
        prisma.player.count(),
        prisma.competition.count({ where: { isOrganizer: false } }),
        prisma.match.count(),
        prisma.competition.count({ where: { type: "LEAGUE", isOrganizer: true, status: { in: ["DRAFT", "ACTIVE"] } } }),
        prisma.match.findMany({
          where: { competition: { isOrganizer: false } },
          take: 6,
          orderBy: [{ playedAt: "desc" }, { updatedAt: "desc" }],
          include: {
            competition: true,
            homeTeam: true,
            awayTeam: true,
            winnerTeam: true
          }
        })
      ]);

    res.json({
      stats: [
        { label: "Times cadastrados", value: String(teamsCount), helper: `${activeLeaguesCount} ligas ativas` },
        { label: "Jogadores", value: String(playersCount), helper: "Elencos cadastrados no banco" },
        { label: "Campeonatos", value: String(competitionsCount), helper: "Campeonatos e copas" },
        { label: "Partidas registradas", value: String(matchesCount), helper: "Jogos salvos no banco" }
      ],
      latestMatches
    });
  } catch (error) {
    next(error);
  }
});

router.get("/recent-matches", async (req, res, next) => {
  try {
    const query = z
      .object({
        type: z.enum(["LEAGUE", "CUP"]).optional(),
        limit: z.coerce.number().int().positive().max(50).optional()
      })
      .parse(req.query);

    const matches = await prisma.match.findMany({
      where: {
        competition: { isOrganizer: false, type: query.type }
      },
      take: query.limit ?? 20,
      orderBy: [{ playedAt: "desc" }, { updatedAt: "desc" }],
      include: {
        competition: true,
        homeTeam: true,
        awayTeam: true,
        winnerTeam: true
      }
    });

    res.json(matches.filter((match) => match.homeTeamId !== match.awayTeamId));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createCompetitionSchema.parse(req.body);
    const uniqueTeamIds = [...new Set(data.teamIds)];

    if (uniqueTeamIds.length !== data.teamIds.length) {
      throw new Error("Selecione times diferentes para o torneio.");
    }
    if (data.type === "LEAGUE" && uniqueTeamIds.length !== 4) {
      throw new Error("Campeonato de liga precisa ter exatamente 4 times.");
    }
    if (data.type === "CUP") {
      const expectedCountByModel = {
        SEMIFINALS: 4,
        SIX_TEAMS: 6,
        QUARTERFINALS: 8,
        ROUND_OF_16: 16
      } as const;
      const model = data.cupModel ?? "SEMIFINALS";
      if (uniqueTeamIds.length !== expectedCountByModel[model]) {
        throw new Error(`Esta copa precisa de exatamente ${expectedCountByModel[model]} times.`);
      }
    }

    const teamsCount = await prisma.team.count({ where: { id: { in: uniqueTeamIds } } });
    if (teamsCount !== uniqueTeamIds.length) {
      throw new Error("Um ou mais times selecionados nao existem.");
    }

    const competition = await prisma.competition.create({
      data: {
        name: data.name,
        season: data.season || undefined,
        type: data.type,
        cupModel: data.type === "CUP" ? data.cupModel ?? "SEMIFINALS" : null,
        isOrganizer: false,
        status: "DRAFT",
        teams: {
          create: uniqueTeamIds.map((teamId, index) => ({
            teamId,
            seed: index + 1
          }))
        }
      },
      include: { teams: { include: { team: true } } }
    });

    res.status(201).json(competition);
  } catch (error) {
    next(error);
  }
});

router.get("/:competitionId/matches", async (req, res, next) => {
  try {
    const { competitionId } = competitionParamsSchema.parse(req.params);
    const matches = await prisma.match.findMany({
      where: { competitionId },
      orderBy: [{ matchNumber: "asc" }, { createdAt: "asc" }],
      include: {
        competition: true,
        homeTeam: true,
        awayTeam: true,
        winnerTeam: true
      }
    });

    res.json(matches);
  } catch (error) {
    next(error);
  }
});

router.get("/:competitionId/standings", async (req, res, next) => {
  try {
    const { competitionId } = competitionParamsSchema.parse(req.params);
    const [competition, standings, matches] = await Promise.all([
      prisma.competition.findUnique({
        where: { id: competitionId },
        include: { teams: { include: { team: true } } }
      }),
      prisma.standing.findMany({
        where: { competitionId },
        include: { team: true }
      }),
      prisma.match.findMany({
        where: {
          competitionId,
          stage: "LEAGUE",
          homeScore: { not: null },
          awayScore: { not: null }
        }
      })
    ]);

    if (!competition) {
      throw new Error("Torneio nao encontrado.");
    }

    if (standings.length > 0 || competition.type !== "LEAGUE") {
      res.json(
        sortLeagueStandings(
          standings.map((standing) => ({
            ...standing,
            teamName: standing.team.name
          })),
          matches
            .filter((match) => match.homeTeamId !== match.awayTeamId)
            .map((match) => ({
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId,
              homeScore: match.homeScore ?? 0,
              awayScore: match.awayScore ?? 0
            }))
        )
      );
      return;
    }

    res.json(
      competition.teams
        .map(({ team }) => ({
          id: `${competitionId}-${team.id}`,
          competitionId,
          teamId: team.id,
          played: 0,
          wins: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalBalance: 0,
          points: 0,
          team
        }))
        .sort((a, b) => a.team.name.localeCompare(b.team.name, "pt-BR"))
    );
  } catch (error) {
    next(error);
  }
});

router.post("/:competitionId/generate-league-fixtures", async (req, res, next) => {
  try {
    const { competitionId } = competitionParamsSchema.parse(req.params);
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: { teams: { include: { team: true } }, matches: true }
    });

    if (!competition || competition.type !== "LEAGUE" || competition.isOrganizer) {
      throw new Error("Selecione um campeonato de liga para sortear os jogos.");
    }
    const participantTeams = competition.teams.map((item) => item.team);
    if (participantTeams.length !== 4) {
      throw new Error("O campeonato precisa ter exatamente 4 times participantes.");
    }
    const officialMatches = competition.matches.filter((match) => match.homeTeamId !== match.awayTeamId);
    if (officialMatches.length > 0) {
      throw new Error("Esta liga ja possui jogos. Limpe o torneio antes de sortear novamente.");
    }

    const fixtures = createRoundRobinFixtures(shuffleTeams(participantTeams));
    const matches = await prisma.$transaction(
      fixtures.map((fixture, index) =>
        prisma.match.create({
          data: {
            competitionId,
            stage: "LEAGUE",
            leg: "SINGLE",
            matchNumber: index + 1,
            homeTeamId: fixture.home.id,
            awayTeamId: fixture.away.id
          },
          include: { homeTeam: true, awayTeam: true, winnerTeam: true }
        })
      )
    );

    res.status(201).json(matches);
  } catch (error) {
    next(error);
  }
});

router.post("/:competitionId/clear-tournament", async (req, res, next) => {
  try {
    const { competitionId } = competitionParamsSchema.parse(req.params);

    await prisma.$transaction(async (tx) => {
      const officialMatches = await tx.match.findMany({
        where: { competitionId },
        select: { id: true, homeTeamId: true, awayTeamId: true }
      });
      const officialMatchIds = officialMatches
        .filter((match) => match.homeTeamId !== match.awayTeamId)
        .map((match) => match.id);

      await tx.match.deleteMany({ where: { id: { in: officialMatchIds } } });
      await tx.standing.deleteMany({ where: { competitionId } });
      await tx.tournamentFinalization.deleteMany({ where: { competitionId } });
      await tx.competition.update({
        where: { id: competitionId },
        data: { status: "DRAFT" }
      });
    });

    res.json({
      ok: true,
      message:
        "Torneio limpo. Partidas, classificacao e finalizacao foram apagadas; placar, artilharia, assistencias e rankings foram preservados."
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:competitionId/finalization", async (req, res, next) => {
  try {
    const { competitionId } = competitionParamsSchema.parse(req.params);
    const finalization = await prisma.tournamentFinalization.findFirst({
      where: { competitionId },
      orderBy: { createdAt: "desc" },
      include: {
        titleType: true,
        championTeam: { include: { players: true } },
        runnerUpTeam: { include: { players: true } },
        bestPlayers: {
          orderBy: { position: "asc" },
          include: { player: true }
        }
      }
    });

    if (!finalization) {
      return res.json(null);
    }

    res.json({
      finalization,
      titleType: finalization.titleType,
      championTeam: finalization.championTeam,
      runnerUpTeam: finalization.runnerUpTeam,
      thirdTeam: null,
      bestPlayers: finalization.bestPlayers.map((award) => award.player)
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/matches/:matchId/score", async (req, res, next) => {
  try {
    const { matchId } = matchParamsSchema.parse(req.params);
    const score = scoreSchema.parse(req.body);
    const currentMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: { competition: true }
    });

    if (!currentMatch) {
      throw new Error("Partida nao encontrada.");
    }
    if (currentMatch.homeTeamId === currentMatch.awayTeamId) {
      throw new Error("Esta partida e apenas um registro tecnico da artilharia e nao pode receber placar de campeonato.");
    }

    if (currentMatch.competition.type === "LEAGUE") {
      evaluateTournamentScore({ home: score.homeScore, away: score.awayScore });
    }

    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        extraHomeScore: currentMatch.competition.type === "LEAGUE" ? null : score.extraHomeScore ?? null,
        extraAwayScore: currentMatch.competition.type === "LEAGUE" ? null : score.extraAwayScore ?? null,
        winnerTeamId: currentMatch.competition.type === "LEAGUE" ? null : score.winnerTeamId || null,
        playedAt: new Date(),
        status: "FINISHED"
      },
      include: {
        competition: true,
        homeTeam: true,
        awayTeam: true,
        winnerTeam: true
      }
    });

    if (match.competition.type === "LEAGUE") {
      await recalculateLeagueStandings(match.competitionId);
    }

    res.json(match);
  } catch (error) {
    next(error);
  }
});

router.post("/matches/:matchId/clear-score", async (req, res, next) => {
  try {
    const { matchId } = matchParamsSchema.parse(req.params);
    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: null,
        awayScore: null,
        extraHomeScore: null,
        extraAwayScore: null,
        winnerTeamId: null,
        playedAt: null,
        status: "SCHEDULED"
      },
      include: {
        competition: true,
        homeTeam: true,
        awayTeam: true,
        winnerTeam: true
      }
    });

    if (match.competition.type === "LEAGUE") {
      await recalculateLeagueStandings(match.competitionId);
    }

    res.json(match);
  } catch (error) {
    next(error);
  }
});

router.post("/:competitionId/finalize", async (req, res, next) => {
  try {
    const { competitionId } = competitionParamsSchema.parse(req.params);
    const data = finalizeTournamentSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const competition = await tx.competition.findUnique({ where: { id: competitionId } });
      if (!competition) throw new Error("Torneio nao encontrado.");

      const [teamRule, titleType, playerRule] = await Promise.all([
        tx.teamTournamentPointRule.findUnique({ where: { id: data.teamRuleId } }),
        tx.tournamentTitleType.findUnique({ where: { id: data.titleTypeId } }),
        tx.playerAwardPointRule.findFirst({ orderBy: { createdAt: "desc" } })
      ]);
      if (!teamRule) throw new Error("Regra de pontuacao dos times nao encontrada.");
      if (!titleType) throw new Error("Tipo de titulo nao encontrado.");

      const season = competition.season ?? "Temporada";
      const placements = [
        { teamId: data.championTeamId, position: 1 },
        data.runnerUpTeamId ? { teamId: data.runnerUpTeamId, position: 2 } : undefined,
        data.thirdTeamId ? { teamId: data.thirdTeamId, position: 3 } : undefined
      ].filter((placement): placement is { teamId: string; position: number } => Boolean(placement));

      for (const placement of placements) {
        await tx.teamSeasonRanking.upsert({
          where: { season_teamId: { season, teamId: placement.teamId } },
          create: {
            season,
            teamId: placement.teamId,
            points: pointsForPosition(placement.position, teamRule)
          },
          update: { points: { increment: pointsForPosition(placement.position, teamRule) } }
        });
      }

      if (playerRule && data.bestPlayerIds?.length) {
        for (const [index, playerId] of data.bestPlayerIds.entries()) {
          await tx.playerSeasonStat.upsert({
            where: { season_playerId: { season, playerId } },
            create: {
              season,
              playerId,
              points: pointsForPosition(index + 1, playerRule)
            },
            update: { points: { increment: pointsForPosition(index + 1, playerRule) } }
          });
        }
      }

      const championPlayers = await tx.player.findMany({
        where: { teamId: data.championTeamId },
        orderBy: { name: "asc" }
      });

      for (const player of championPlayers) {
        await tx.playerTournamentTitle.upsert({
          where: {
            season_playerId_titleTypeId: {
              season,
              playerId: player.id,
              titleTypeId: data.titleTypeId
            }
          },
          create: {
            season,
            playerId: player.id,
            titleTypeId: data.titleTypeId,
            titles: 1
          },
          update: { titles: { increment: 1 } }
        });
      }

      const finalization = await tx.tournamentFinalization.create({
        data: {
          competitionId,
          season,
          tournamentName: data.tournamentName,
          titleTypeId: data.titleTypeId,
          championTeamId: data.championTeamId,
          runnerUpTeamId: data.runnerUpTeamId || null,
          thirdTeamId: data.thirdTeamId || null,
          bestPlayers: {
            create: (data.bestPlayerIds ?? []).map((playerId, index) => ({
              playerId,
              position: index + 1
            }))
          }
        }
      });

      await tx.competition.update({
        where: { id: competitionId },
        data: { status: "FINISHED" }
      });

      const [championTeam, runnerUpTeam, thirdTeam, selectedBestPlayers] = await Promise.all([
        tx.team.findUnique({ where: { id: data.championTeamId }, include: { players: true } }),
        data.runnerUpTeamId ? tx.team.findUnique({ where: { id: data.runnerUpTeamId }, include: { players: true } }) : null,
        data.thirdTeamId ? tx.team.findUnique({ where: { id: data.thirdTeamId }, include: { players: true } }) : null,
        tx.player.findMany({ where: { id: { in: data.bestPlayerIds ?? [] } } })
      ]);

      const bestPlayersById = new Map(selectedBestPlayers.map((player) => [player.id, player]));
      const bestPlayers = (data.bestPlayerIds ?? []).flatMap((playerId) => {
        const player = bestPlayersById.get(playerId);
        return player ? [player] : [];
      });

      return { finalization, titleType, championTeam, runnerUpTeam, thirdTeam, bestPlayers };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

async function recalculateLeagueStandings(competitionId: string) {
  const [competition, matches] = await Promise.all([
    prisma.competition.findUnique({ where: { id: competitionId }, include: { teams: { include: { team: true } } } }),
    prisma.match.findMany({
      where: {
        competitionId,
        stage: "LEAGUE",
        homeScore: { not: null },
        awayScore: { not: null }
      }
    })
  ]);

  if (!competition) return;

  const participantTeams = competition.teams.map((item) => item.team);
  const rows = new Map(
    participantTeams.map((team) => [
      team.id,
      {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        wins: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalBalance: 0,
        points: 0
      }
    ])
  );

  for (const match of matches) {
    if (match.homeScore == null || match.awayScore == null || match.homeTeamId === match.awayTeamId) continue;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) continue;

    const result = evaluateTournamentScore({ home: match.homeScore, away: match.awayScore });
    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (result.winnerSide === "home") {
      home.wins += 1;
      away.losses += 1;
      home.points += result.winnerPoints;
      home.goalBalance += result.goalBalance;
      away.goalBalance -= result.goalBalance;
    } else {
      away.wins += 1;
      home.losses += 1;
      away.points += result.winnerPoints;
      away.goalBalance += result.goalBalance;
      home.goalBalance -= result.goalBalance;
    }
  }

  const sorted = sortLeagueStandings(
    [...rows.values()],
    matches
      .filter((match) => match.homeScore != null && match.awayScore != null && match.homeTeamId !== match.awayTeamId)
      .map((match) => ({
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeScore: match.homeScore ?? 0,
        awayScore: match.awayScore ?? 0
      }))
  );

  await prisma.$transaction([
    prisma.standing.deleteMany({ where: { competitionId } }),
    ...sorted.map((row) =>
      prisma.standing.create({
        data: {
          competitionId,
          teamId: row.teamId,
          played: row.played,
          wins: row.wins,
          losses: row.losses,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalBalance: row.goalBalance,
          points: row.points
        }
      })
    )
  ]);
}

export const competitionsRouter = router;
