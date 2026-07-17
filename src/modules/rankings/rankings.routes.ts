import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../shared/prisma.js";

const router = Router();

const competitionActionSchema = z.object({
  competitionId: z.string().trim().min(1),
  playerId: z.string().trim().min(1)
});

const clearCompetitionSchema = z.object({
  competitionId: z.string().trim().min(1)
});

const teamRuleSchema = z.object({
  name: z.string().trim().min(1),
  firstPlacePoints: z.number().int().min(0),
  secondPlacePoints: z.number().int().min(0),
  thirdPlacePoints: z.number().int().min(0),
  fourthPlacePoints: z.number().int().min(0).optional(),
  fifthPlacePoints: z.number().int().min(0).optional(),
  sixthPlacePoints: z.number().int().min(0).optional(),
  seventhPlacePoints: z.number().int().min(0).optional(),
  eighthPlacePoints: z.number().int().min(0).optional(),
  ninthPlacePoints: z.number().int().min(0).optional(),
  tenthPlacePoints: z.number().int().min(0).optional(),
  eleventhPlacePoints: z.number().int().min(0).optional(),
  twelfthPlacePoints: z.number().int().min(0).optional(),
  thirteenthPlacePoints: z.number().int().min(0).optional(),
  fourteenthPlacePoints: z.number().int().min(0).optional(),
  fifteenthPlacePoints: z.number().int().min(0).optional(),
  sixteenthPlacePoints: z.number().int().min(0).optional()
});

const playerAwardRuleSchema = z.object({
  firstPlacePoints: z.number().int().min(0),
  secondPlacePoints: z.number().int().min(0),
  thirdPlacePoints: z.number().int().min(0)
});

const teamAwardSchema = z.object({
  season: z.string().trim().min(1),
  ruleId: z.string().trim().min(1),
  placements: z.array(
    z.object({
      teamId: z.string().trim().min(1),
      position: z.number().int().min(1).max(16)
    })
  ).min(1)
});

const playerAwardSchema = z.object({
  season: z.string().trim().min(1),
  awards: z.array(
    z.object({
      playerId: z.string().trim().min(1),
      position: z.union([z.literal(1), z.literal(2), z.literal(3)])
    })
  ).min(1)
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
  if (position === 1) return rule.firstPlacePoints;
  if (position === 2) return rule.secondPlacePoints;
  if (position === 3) return rule.thirdPlacePoints;
  if (position === 4) return rule.fourthPlacePoints ?? 0;
  if (position === 5) return rule.fifthPlacePoints ?? 0;
  if (position === 6) return rule.sixthPlacePoints ?? 0;
  if (position === 7) return rule.seventhPlacePoints ?? 0;
  if (position === 8) return rule.eighthPlacePoints ?? 0;
  if (position === 9) return rule.ninthPlacePoints ?? 0;
  if (position === 10) return rule.tenthPlacePoints ?? 0;
  if (position === 11) return rule.eleventhPlacePoints ?? 0;
  if (position === 12) return rule.twelfthPlacePoints ?? 0;
  if (position === 13) return rule.thirteenthPlacePoints ?? 0;
  if (position === 14) return rule.fourteenthPlacePoints ?? 0;
  if (position === 15) return rule.fifteenthPlacePoints ?? 0;
  if (position === 16) return rule.sixteenthPlacePoints ?? 0;
  return 0;
}

async function seasonForCompetition(competitionId: string) {
  const competition = await prisma.competition.findFirst({ where: { id: competitionId, isOrganizer: false } });
  if (!competition) throw new Error("Campeonato nao encontrado.");
  return competition.season ?? "Temporada";
}

router.get("/competitions", async (_req, res, next) => {
  try {
    const competitions = await prisma.competition.findMany({
      where: { isOrganizer: false },
      orderBy: [{ createdAt: "desc" }],
      include: { teams: { include: { team: true } } }
    });
    res.json(competitions);
  } catch (error) {
    next(error);
  }
});

router.get("/scoreboard", async (req, res, next) => {
  try {
    const competitionId = z.string().trim().min(1).parse(req.query.competitionId);
    const entries = await prisma.liveScoreboardEntry.findMany({
      where: { competitionId },
      orderBy: [{ goals: "desc" }, { team: { name: "asc" } }],
      include: { team: true }
    });
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

router.get("/players", async (req, res, next) => {
  try {
    const competitionId = z.string().trim().min(1).parse(req.query.competitionId);
    const season = await seasonForCompetition(competitionId);
    const [competitionStats, seasonStats] = await Promise.all([
      prisma.playerCompetitionStat.findMany({
        where: { competitionId },
        orderBy: [{ goals: "desc" }, { assists: "desc" }],
        include: { player: { include: { team: true } } }
      }),
      prisma.playerSeasonStat.findMany({
        where: { season },
        orderBy: [{ goals: "desc" }, { assists: "desc" }, { points: "desc" }],
        include: { player: { include: { team: true } } }
      })
    ]);

    res.json({ competitionStats, seasonStats, season });
  } catch (error) {
    next(error);
  }
});

router.get("/players/season-table", async (req, res, next) => {
  try {
    const query = z.object({
      country: z.string().trim().optional(),
      position: z.string().trim().optional(),
      teamId: z.string().trim().optional(),
      leagueId: z.string().trim().optional(),
      orderBy: z.enum(["goals", "assists", "participations", "points"]).optional()
    }).parse(req.query);

    const players = await prisma.player.findMany({
      where: {
        country: query.country || undefined,
        position: query.position || undefined,
        teamId: query.teamId === "__none__" ? null : query.teamId || undefined,
        leagueId: query.leagueId === "__none__" ? null : query.leagueId || undefined
      },
      include: {
        team: { include: { league: true } },
        league: true,
        seasonStats: true
      }
    });

    const rows = players
      .map((player) => {
        const totals = player.seasonStats.reduce(
          (sum, stat) => ({
            goals: sum.goals + stat.goals,
            assists: sum.assists + stat.assists,
            points: sum.points + stat.points
          }),
          { goals: 0, assists: 0, points: 0 }
        );

        return {
          id: player.id,
          playerId: player.id,
          playerName: player.name,
          teamName: player.team?.name ?? "Sem time",
          teamId: player.teamId,
          leagueName: player.team?.league.name ?? player.league?.name ?? "Sem liga",
          leagueId: player.leagueId,
          country: player.country ?? "-",
          position: player.position ?? "-",
          goals: totals.goals,
          assists: totals.assists,
          participations: totals.goals + totals.assists,
          points: totals.points
        };
      })
      .sort((a, b) => {
        const orderBy = query.orderBy ?? "goals";
        const primary = b[orderBy] - a[orderBy];
        if (primary !== 0) return primary;
        const goals = b.goals - a.goals;
        if (goals !== 0) return goals;
        const assists = b.assists - a.assists;
        if (assists !== 0) return assists;
        return a.playerName.localeCompare(b.playerName);
      });

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/players/group-rankings", async (req, res, next) => {
  try {
    const query = z
      .object({
        groupBy: z.enum(["country", "position", "team", "league"]),
        orderBy: z.enum(["goals", "assists"]).optional()
      })
      .parse(req.query);

    const players = await prisma.player.findMany({
      include: {
        team: { include: { league: true } },
        league: true,
        seasonStats: true
      }
    });

    const groups = new Map<
      string,
      {
        id: string;
        name: string;
        goals: number;
        assists: number;
        participations: number;
        players: number;
      }
    >();

    for (const player of players) {
      const rawGroup =
        query.groupBy === "country"
          ? { id: player.country ?? "-", name: player.country ?? "-" }
          : query.groupBy === "position"
            ? { id: player.position ?? "-", name: player.position ?? "-" }
            : query.groupBy === "team"
              ? {
                  id: player.team?.id ?? "__no_team__",
                  name: player.team?.name ?? "Sem time"
                }
              : {
                id: player.team?.league.id ?? player.league?.id ?? "__no_league__",
                name: player.team?.league.name ?? player.league?.name ?? "Sem liga"
              };
      const group =
        query.groupBy === "country" || query.groupBy === "position"
          ? {
              id: rawGroup.name
                .trim()
                .replace(/\s+/g, " ")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLocaleLowerCase("pt-BR"),
              name: rawGroup.name.trim().replace(/\s+/g, " ")
            }
          : rawGroup;
      const totals = player.seasonStats.reduce(
        (sum, stat) => ({
          goals: sum.goals + stat.goals,
          assists: sum.assists + stat.assists
        }),
        { goals: 0, assists: 0 }
      );
      const current = groups.get(group.id) ?? {
        ...group,
        goals: 0,
        assists: 0,
        participations: 0,
        players: 0
      };
      current.goals += totals.goals;
      current.assists += totals.assists;
      current.participations += totals.goals + totals.assists;
      current.players += 1;
      groups.set(group.id, current);
    }

    const orderBy = query.orderBy ?? "goals";
    res.json(
      [...groups.values()].sort((a, b) => {
        const primary = b[orderBy] - a[orderBy];
        if (primary !== 0) return primary;
        const secondary =
          orderBy === "goals" ? b.assists - a.assists : b.goals - a.goals;
        if (secondary !== 0) return secondary;
        return a.name.localeCompare(b.name, "pt-BR");
      })
    );
  } catch (error) {
    next(error);
  }
});

router.post("/goals", async (req, res, next) => {
  try {
    const data = competitionActionSchema.parse(req.body);
    const season = await seasonForCompetition(data.competitionId);

    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({ where: { id: data.playerId }, include: { team: true } });
      if (!player?.teamId || !player.team) {
        throw new Error("Jogador precisa estar em um time para marcar gol.");
      }

      await tx.goal.create({
        data: {
          matchId: await ensureSyntheticMatch(tx, data.competitionId, player.teamId),
          playerId: player.id,
          teamId: player.teamId
        }
      });

      const competitionStat = await tx.playerCompetitionStat.upsert({
        where: { competitionId_playerId: { competitionId: data.competitionId, playerId: player.id } },
        create: { competitionId: data.competitionId, playerId: player.id, goals: 1 },
        update: { goals: { increment: 1 } }
      });

      const seasonStat = await tx.playerSeasonStat.upsert({
        where: { season_playerId: { season, playerId: player.id } },
        create: { season, playerId: player.id, goals: 1 },
        update: { goals: { increment: 1 } }
      });

      const scoreboard = await tx.liveScoreboardEntry.upsert({
        where: { competitionId_teamId: { competitionId: data.competitionId, teamId: player.teamId } },
        create: { competitionId: data.competitionId, teamId: player.teamId, goals: 1 },
        update: { goals: { increment: 1 } }
      });

      return { player, competitionStat, seasonStat, scoreboard };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/goals/remove", async (req, res, next) => {
  try {
    const data = competitionActionSchema.parse(req.body);
    const season = await seasonForCompetition(data.competitionId);

    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.findFirst({
        where: {
          playerId: data.playerId,
          match: { competitionId: data.competitionId }
        },
        orderBy: { createdAt: "desc" }
      });
      if (!goal) {
        throw new Error("Este jogador nao possui gol para remover neste campeonato.");
      }

      await tx.goal.delete({ where: { id: goal.id } });
      await tx.playerCompetitionStat.updateMany({
        where: { competitionId: data.competitionId, playerId: data.playerId, goals: { gt: 0 } },
        data: { goals: { decrement: 1 } }
      });
      await tx.playerSeasonStat.updateMany({
        where: { season, playerId: data.playerId, goals: { gt: 0 } },
        data: { goals: { decrement: 1 } }
      });

      const scoreboard = await tx.liveScoreboardEntry.findUnique({
        where: { competitionId_teamId: { competitionId: data.competitionId, teamId: goal.teamId } }
      });
      if (scoreboard && scoreboard.goals <= 1) {
        await tx.liveScoreboardEntry.delete({ where: { id: scoreboard.id } });
      } else if (scoreboard) {
        await tx.liveScoreboardEntry.update({
          where: { id: scoreboard.id },
          data: { goals: { decrement: 1 } }
        });
      }

      return { ok: true, removedGoalId: goal.id };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/assists", async (req, res, next) => {
  try {
    const data = competitionActionSchema.parse(req.body);
    const season = await seasonForCompetition(data.competitionId);

    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({ where: { id: data.playerId }, include: { team: true } });
      if (!player?.teamId || !player.team) {
        throw new Error("Jogador precisa estar em um time para registrar assistencia.");
      }

      await tx.assist.create({
        data: {
          matchId: await ensureSyntheticMatch(tx, data.competitionId, player.teamId),
          playerId: player.id,
          teamId: player.teamId
        }
      });

      const competitionStat = await tx.playerCompetitionStat.upsert({
        where: { competitionId_playerId: { competitionId: data.competitionId, playerId: player.id } },
        create: { competitionId: data.competitionId, playerId: player.id, assists: 1 },
        update: { assists: { increment: 1 } }
      });

      const seasonStat = await tx.playerSeasonStat.upsert({
        where: { season_playerId: { season, playerId: player.id } },
        create: { season, playerId: player.id, assists: 1 },
        update: { assists: { increment: 1 } }
      });

      return { player, competitionStat, seasonStat };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/assists/remove", async (req, res, next) => {
  try {
    const data = competitionActionSchema.parse(req.body);
    const season = await seasonForCompetition(data.competitionId);

    const result = await prisma.$transaction(async (tx) => {
      const assist = await tx.assist.findFirst({
        where: {
          playerId: data.playerId,
          match: { competitionId: data.competitionId }
        },
        orderBy: { createdAt: "desc" }
      });
      if (!assist) {
        throw new Error("Este jogador nao possui assistencia para remover neste campeonato.");
      }

      await tx.assist.delete({ where: { id: assist.id } });
      await tx.playerCompetitionStat.updateMany({
        where: { competitionId: data.competitionId, playerId: data.playerId, assists: { gt: 0 } },
        data: { assists: { decrement: 1 } }
      });
      await tx.playerSeasonStat.updateMany({
        where: { season, playerId: data.playerId, assists: { gt: 0 } },
        data: { assists: { decrement: 1 } }
      });

      return { ok: true, removedAssistId: assist.id };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/scoreboard/clear", async (req, res, next) => {
  try {
    const data = clearCompetitionSchema.parse(req.body);
    await prisma.liveScoreboardEntry.deleteMany({ where: { competitionId: data.competitionId } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/competition-stats/clear", async (req, res, next) => {
  try {
    const data = clearCompetitionSchema.parse(req.body);
    await prisma.$transaction([
      prisma.goal.deleteMany({ where: { match: { competitionId: data.competitionId } } }),
      prisma.assist.deleteMany({ where: { match: { competitionId: data.competitionId } } }),
      prisma.playerCompetitionStat.deleteMany({ where: { competitionId: data.competitionId } })
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/team-point-rules", async (_req, res, next) => {
  try {
    res.json(await prisma.teamTournamentPointRule.findMany({ orderBy: { name: "asc" } }));
  } catch (error) {
    next(error);
  }
});

router.post("/team-point-rules", async (req, res, next) => {
  try {
    const data = teamRuleSchema.parse(req.body);
    const rule = await prisma.teamTournamentPointRule.upsert({
      where: { name: data.name },
      create: data,
      update: data
    });
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

router.patch("/team-point-rules/:ruleId", async (req, res, next) => {
  try {
    const ruleId = z.string().trim().min(1).parse(req.params.ruleId);
    const data = teamRuleSchema.parse(req.body);
    const existing = await prisma.teamTournamentPointRule.findUnique({ where: { id: ruleId } });
    if (!existing) throw new Error("Regra de pontuacao nao encontrada.");
    const rule = await prisma.teamTournamentPointRule.update({
      where: { id: ruleId },
      data
    });
    res.json(rule);
  } catch (error) {
    next(error);
  }
});

router.post("/team-awards/apply", async (req, res, next) => {
  try {
    const data = teamAwardSchema.parse(req.body);
    const rule = await prisma.teamTournamentPointRule.findUnique({ where: { id: data.ruleId } });
    if (!rule) throw new Error("Regra de pontuacao do torneio nao encontrada.");

    const result = await prisma.$transaction(
      data.placements.map((placement) =>
        prisma.teamSeasonRanking.upsert({
          where: { season_teamId: { season: data.season, teamId: placement.teamId } },
          create: {
            season: data.season,
            teamId: placement.teamId,
            points: pointsForPosition(placement.position, rule)
          },
          update: { points: { increment: pointsForPosition(placement.position, rule) } }
        })
      )
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/team-season", async (req, res, next) => {
  try {
    const season = z.string().trim().min(1).parse(req.query.season);
    const ranking = await prisma.teamSeasonRanking.findMany({
      where: { season },
      orderBy: { points: "desc" },
      include: { team: true }
    });
    res.json(ranking);
  } catch (error) {
    next(error);
  }
});

router.get("/title-types", async (_req, res, next) => {
  try {
    res.json(await prisma.tournamentTitleType.findMany({ orderBy: { name: "asc" } }));
  } catch (error) {
    next(error);
  }
});

router.post("/title-types", async (req, res, next) => {
  try {
    const data = z.object({ name: z.string().trim().min(1) }).parse(req.body);
    const titleType = await prisma.tournamentTitleType.upsert({
      where: { name: data.name },
      create: { name: data.name },
      update: { name: data.name }
    });
    res.status(201).json(titleType);
  } catch (error) {
    next(error);
  }
});

router.get("/player-titles", async (req, res, next) => {
  try {
    const season = z.string().trim().min(1).parse(req.query.season);
    const rows = await prisma.playerTournamentTitle.findMany({
      where: { season },
      include: {
        player: { include: { team: true } },
        titleType: true
      }
    });

    type PlayerTitleRow = {
      playerId: string;
      playerName: string;
      teamName: string;
      totalTitles: number;
      titles: Record<string, number>;
    };
    const grouped = new Map<string, PlayerTitleRow>();

    for (const row of rows) {
      const current: PlayerTitleRow = grouped.get(row.playerId) ?? {
        playerId: row.playerId,
        playerName: row.player.name,
        teamName: row.player.team?.name ?? "-",
        totalTitles: 0,
        titles: {}
      };
      current.totalTitles += row.titles;
      current.titles[row.titleType.name] = row.titles;
      grouped.set(row.playerId, current);
    }

    res.json(
      [...grouped.values()].sort((a, b) => {
        if (b.totalTitles !== a.totalTitles) return b.totalTitles - a.totalTitles;
        return a.playerName.localeCompare(b.playerName, "pt-BR");
      })
    );
  } catch (error) {
    next(error);
  }
});

router.get("/player-award-rule", async (_req, res, next) => {
  try {
    res.json(await prisma.playerAwardPointRule.findFirst({ orderBy: { createdAt: "desc" } }));
  } catch (error) {
    next(error);
  }
});

router.post("/player-award-rule", async (req, res, next) => {
  try {
    const data = playerAwardRuleSchema.parse(req.body);
    const existing = await prisma.playerAwardPointRule.findFirst({ orderBy: { createdAt: "desc" } });
    const rule = existing
      ? await prisma.playerAwardPointRule.update({ where: { id: existing.id }, data })
      : await prisma.playerAwardPointRule.create({ data });
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

router.post("/player-awards/apply", async (req, res, next) => {
  try {
    const data = playerAwardSchema.parse(req.body);
    const rule = await prisma.playerAwardPointRule.findFirst({ orderBy: { createdAt: "desc" } });
    if (!rule) throw new Error("Cadastre a regra de pontos dos melhores jogadores primeiro.");

    const result = await prisma.$transaction(
      data.awards.map((award) =>
        prisma.playerSeasonStat.upsert({
          where: { season_playerId: { season: data.season, playerId: award.playerId } },
          create: {
            season: data.season,
            playerId: award.playerId,
            points: pointsForPosition(award.position, rule)
          },
          update: { points: { increment: pointsForPosition(award.position, rule) } }
        })
      )
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

async function ensureSyntheticMatch(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  competitionId: string,
  teamId: string
) {
  const existing = await tx.match.findFirst({
    where: { competitionId, stage: "LEAGUE", homeTeamId: teamId, awayTeamId: teamId }
  });
  if (existing) return existing.id;

  const match = await tx.match.create({
    data: {
      competitionId,
      stage: "LEAGUE",
      leg: "SINGLE",
      homeTeamId: teamId,
      awayTeamId: teamId,
      status: "LIVE"
    }
  });
  return match.id;
}

export const rankingsRouter = router;
