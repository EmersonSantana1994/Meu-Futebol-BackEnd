import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../shared/prisma.js";

const router = Router();

const createLeagueSchema = z.object({
  name: z.string().trim().min(1),
  season: z.string().trim().optional()
});

const createTeamSchema = z.object({
  leagueId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  shortName: z.string().trim().optional(),
  primaryColor: z.string().trim().optional(),
  badgeUrl: z.string().trim().optional()
});

const createPlayerSchema = z.object({
  name: z.string().trim().min(1),
  position: z.string().trim().min(1, "Informe a posicao do jogador."),
  country: z.string().trim().min(1, "Informe o pais do jogador."),
  number: z.number().int().positive().optional(),
  teamId: z.string().trim().optional(),
  leagueId: z.string().trim().optional(),
  isOwner: z.boolean().optional()
});

const catalogSchema = z.object({
  name: z.string().trim().min(1)
});

const changeOwnerSchema = z.object({
  ownerPlayerId: z.string().trim().min(1)
});

const teamSwapTransferSchema = z.object({
  targetTeamId: z.string().trim().min(1),
  targetPlayerId: z.string().trim().min(1),
  replacementPlayerId: z.string().trim().min(1),
  nextOwnerPlayerId: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

const freeAgentTransferSchema = z.object({
  targetTeamId: z.string().trim().min(1),
  targetPlayerId: z.string().trim().min(1),
  replacementPlayerId: z.string().trim().min(1),
  nextOwnerPlayerId: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

function cleanOptional(value?: string) {
  return value && value.length > 0 ? value : undefined;
}

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizedName(value: string) {
  return cleanName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

async function assertUniqueName(
  entity: "league" | "team" | "player",
  name: string
) {
  const records =
    entity === "league"
      ? await prisma.competition.findMany({
          where: { type: "LEAGUE", isOrganizer: true },
          select: { name: true }
        })
      : entity === "team"
        ? await prisma.team.findMany({ select: { name: true } })
        : await prisma.player.findMany({ select: { name: true } });

  if (records.some((record) => normalizedName(record.name) === normalizedName(name))) {
    const labels = {
      league: "uma liga",
      team: "um time",
      player: "um jogador"
    };
    throw new Error(`Ja existe ${labels[entity]} com esse nome.`);
  }
}

async function ensureTeamCanReceivePlayer(teamId: string) {
  const count = await prisma.player.count({ where: { teamId } });
  if (count >= 4) {
    throw new Error("Este time ja possui o limite de 4 jogadores.");
  }
}

async function findCatalogEntry(type: "position" | "country", name: string) {
  const entries =
    type === "position"
      ? await prisma.playerPosition.findMany()
      : await prisma.country.findMany();
  return entries.find((entry) => normalizedName(entry.name) === normalizedName(name));
}

router.get("/positions", async (_req, res, next) => {
  try {
    res.json(await prisma.playerPosition.findMany({ orderBy: { name: "asc" } }));
  } catch (error) {
    next(error);
  }
});

router.post("/positions", async (req, res, next) => {
  try {
    const data = catalogSchema.parse(req.body);
    if (await findCatalogEntry("position", data.name)) {
      throw new Error("Ja existe uma posicao com esse nome.");
    }
    const position = await prisma.playerPosition.create({
      data: { name: cleanName(data.name), nameKey: normalizedName(data.name) }
    });
    res.status(201).json(position);
  } catch (error) {
    next(error);
  }
});

router.delete("/positions/:id", async (req, res, next) => {
  try {
    const id = z.string().trim().min(1).parse(req.params.id);
    const position = await prisma.playerPosition.findUnique({ where: { id } });
    if (!position) throw new Error("Posicao nao encontrada.");
    const players = await prisma.player.findMany({
      where: { position: { not: null } },
      select: { position: true }
    });
    if (
      players.some(
        (player) =>
          player.position && normalizedName(player.position) === normalizedName(position.name)
      )
    ) {
      throw new Error("Esta posicao esta sendo usada por jogadores e nao pode ser excluida.");
    }
    await prisma.playerPosition.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/countries", async (_req, res, next) => {
  try {
    res.json(await prisma.country.findMany({ orderBy: { name: "asc" } }));
  } catch (error) {
    next(error);
  }
});

router.post("/countries", async (req, res, next) => {
  try {
    const data = catalogSchema.parse(req.body);
    if (await findCatalogEntry("country", data.name)) {
      throw new Error("Ja existe um pais com esse nome.");
    }
    const country = await prisma.country.create({
      data: { name: cleanName(data.name), nameKey: normalizedName(data.name) }
    });
    res.status(201).json(country);
  } catch (error) {
    next(error);
  }
});

router.delete("/countries/:id", async (req, res, next) => {
  try {
    const id = z.string().trim().min(1).parse(req.params.id);
    const country = await prisma.country.findUnique({ where: { id } });
    if (!country) throw new Error("Pais nao encontrado.");
    const players = await prisma.player.findMany({
      where: { country: { not: null } },
      select: { country: true }
    });
    if (
      players.some(
        (player) =>
          player.country && normalizedName(player.country) === normalizedName(country.name)
      )
    ) {
      throw new Error("Este pais esta sendo usado por jogadores e nao pode ser excluido.");
    }
    await prisma.country.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

async function assertNextOwner(teamId: string, nextOwnerPlayerId?: string, excludedPlayerId?: string) {
  if (!nextOwnerPlayerId) {
    throw new Error("Informe o proximo dono do time antes de transferir o dono atual.");
  }

  if (nextOwnerPlayerId === excludedPlayerId) {
    throw new Error("O proximo dono nao pode ser o jogador que esta saindo do time.");
  }

  const nextOwner = await prisma.player.findFirst({
    where: { id: nextOwnerPlayerId, teamId }
  });

  if (!nextOwner) {
    throw new Error("O proximo dono precisa ser jogador do mesmo time.");
  }

  return nextOwner;
}

router.get("/leagues", async (_req, res, next) => {
  try {
    const leagues = await prisma.competition.findMany({
      where: { type: "LEAGUE", isOrganizer: true },
      orderBy: [{ createdAt: "desc" }],
      include: {
        leagueTeams: {
          include: {
            ownerPlayer: true,
            players: true
          },
          orderBy: { name: "asc" }
        }
      }
    });

    res.json(leagues);
  } catch (error) {
    next(error);
  }
});

router.post("/leagues", async (req, res, next) => {
  try {
    const data = createLeagueSchema.parse(req.body);
    await assertUniqueName("league", data.name);
    const league = await prisma.competition.create({
      data: {
        name: cleanName(data.name),
        registrationNameKey: normalizedName(data.name),
        season: cleanOptional(data.season),
        type: "LEAGUE",
        isOrganizer: true,
        status: "DRAFT"
      }
    });

    res.status(201).json(league);
  } catch (error) {
    next(error);
  }
});

router.get("/teams", async (_req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: [{ league: { name: "asc" } }, { name: "asc" }],
      include: {
        league: true,
        ownerPlayer: true,
        players: {
          orderBy: [{ name: "asc" }]
        }
      }
    });

    res.json(
      teams.map((team) => ({
        ...team,
        players: team.players.sort((a, b) => {
          if (a.id === team.ownerPlayerId) return -1;
          if (b.id === team.ownerPlayerId) return 1;
          return a.name.localeCompare(b.name);
        })
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post("/teams", async (req, res, next) => {
  try {
    const data = createTeamSchema.parse(req.body);
    await assertUniqueName("team", data.name);
    const league = await prisma.competition.findFirst({
      where: { id: data.leagueId, type: "LEAGUE", isOrganizer: true }
    });

    if (!league) {
      throw new Error("Liga nao encontrada.");
    }

    const team = await prisma.team.create({
      data: {
        leagueId: league.id,
        name: cleanName(data.name),
        nameKey: normalizedName(data.name),
        shortName: cleanOptional(data.shortName),
        primaryColor: cleanOptional(data.primaryColor),
        badgeUrl: cleanOptional(data.badgeUrl)
      },
      include: { league: true, ownerPlayer: true, players: true }
    });

    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
});

router.patch("/teams/:teamId/owner", async (req, res, next) => {
  try {
    const params = z.object({ teamId: z.string().trim().min(1) }).parse(req.params);
    const data = changeOwnerSchema.parse(req.body);

    const player = await prisma.player.findFirst({
      where: { id: data.ownerPlayerId, teamId: params.teamId }
    });

    if (!player) {
      throw new Error("O dono precisa ser um jogador do proprio time.");
    }

    const team = await prisma.team.update({
      where: { id: params.teamId },
      data: { ownerPlayerId: player.id },
      include: { ownerPlayer: true, players: true, league: true }
    });

    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.get("/players", async (_req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        team: { include: { ownerPlayer: true, league: true } },
        league: true
      }
    });

    res.json(players);
  } catch (error) {
    next(error);
  }
});

router.post("/players", async (req, res, next) => {
  try {
    const data = createPlayerSchema.parse(req.body);
    await assertUniqueName("player", data.name);
    const [position, country] = await Promise.all([
      findCatalogEntry("position", data.position),
      findCatalogEntry("country", data.country)
    ]);
    if (!position) throw new Error("Selecione uma posicao cadastrada no sistema.");
    if (!country) throw new Error("Selecione um pais cadastrado no sistema.");
    let leagueId = cleanOptional(data.leagueId);

    if (data.teamId) {
      await ensureTeamCanReceivePlayer(data.teamId);
      const team = await prisma.team.findUnique({ where: { id: data.teamId } });
      if (!team) {
        throw new Error("Time nao encontrado.");
      }
      leagueId = team.leagueId;
    }

    const player = await prisma.player.create({
      data: {
        name: cleanName(data.name),
        nameKey: normalizedName(data.name),
        position: position.name,
        country: country.name,
        number: data.number,
        teamId: cleanOptional(data.teamId),
        leagueId
      },
      include: { team: true, league: true }
    });

    if (data.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: data.teamId },
        select: { ownerPlayerId: true }
      });

      if (data.isOwner || !team?.ownerPlayerId) {
        await prisma.team.update({
          where: { id: data.teamId },
          data: { ownerPlayerId: player.id }
        });
      }
    }

    res.status(201).json(player);
  } catch (error) {
    next(error);
  }
});

router.post("/transfers/team-swap", async (req, res, next) => {
  try {
    const data = teamSwapTransferSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const targetTeam = await tx.team.findUnique({ where: { id: data.targetTeamId } });
      const targetPlayer = await tx.player.findUnique({ where: { id: data.targetPlayerId } });
      const replacementPlayer = await tx.player.findUnique({ where: { id: data.replacementPlayerId } });

      if (!targetTeam || !targetPlayer || !replacementPlayer) {
        throw new Error("Time ou jogador nao encontrado.");
      }

      if (!targetPlayer.teamId) {
        throw new Error("Use a transferencia de jogador livre para atletas sem time.");
      }

      if (replacementPlayer.teamId !== targetTeam.id) {
        throw new Error("O jogador escolhido para sair precisa pertencer ao time comprador.");
      }

      if (targetPlayer.teamId === targetTeam.id) {
        throw new Error("O jogador comprado ja pertence a este time.");
      }

      const sourceTeam = await tx.team.findUnique({ where: { id: targetPlayer.teamId } });
      if (!sourceTeam) {
        throw new Error("Time de origem nao encontrado.");
      }

      if (sourceTeam.ownerPlayerId === targetPlayer.id) {
        await assertNextOwner(sourceTeam.id, data.nextOwnerPlayerId, targetPlayer.id);
      }

      await tx.player.update({
        where: { id: targetPlayer.id },
        data: { teamId: targetTeam.id, leagueId: targetTeam.leagueId }
      });

      await tx.player.update({
        where: { id: replacementPlayer.id },
        data: { teamId: sourceTeam.id, leagueId: sourceTeam.leagueId }
      });

      if (sourceTeam.ownerPlayerId === targetPlayer.id) {
        await tx.team.update({
          where: { id: sourceTeam.id },
          data: { ownerPlayerId: data.nextOwnerPlayerId }
        });
      }

      if (targetTeam.ownerPlayerId === replacementPlayer.id) {
        await tx.team.update({
          where: { id: targetTeam.id },
          data: { ownerPlayerId: targetPlayer.id }
        });
      }

      return tx.transfer.create({
        data: {
          type: "TEAM_SWAP",
          targetTeamId: targetTeam.id,
          sourceTeamId: sourceTeam.id,
          targetPlayerId: targetPlayer.id,
          replacementPlayerId: replacementPlayer.id,
          nextOwnerPlayerId: cleanOptional(data.nextOwnerPlayerId),
          previousTargetTeamId: sourceTeam.id,
          previousTargetLeagueId: sourceTeam.leagueId,
          notes: cleanOptional(data.notes)
        }
      });
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/transfers/free-agent", async (req, res, next) => {
  try {
    const data = freeAgentTransferSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const targetTeam = await tx.team.findUnique({ where: { id: data.targetTeamId } });
      const targetPlayer = await tx.player.findUnique({ where: { id: data.targetPlayerId } });
      const replacementPlayer = await tx.player.findUnique({ where: { id: data.replacementPlayerId } });

      if (!targetTeam || !targetPlayer || !replacementPlayer) {
        throw new Error("Time ou jogador nao encontrado.");
      }

      if (targetPlayer.teamId) {
        throw new Error("Este jogador ja pertence a um time. Use transferencia entre times.");
      }

      if (replacementPlayer.teamId !== targetTeam.id) {
        throw new Error("O jogador escolhido para sair precisa pertencer ao time comprador.");
      }

      if (targetTeam.ownerPlayerId === replacementPlayer.id) {
        await assertNextOwner(targetTeam.id, data.nextOwnerPlayerId, replacementPlayer.id);
      }

      await tx.player.update({
        where: { id: targetPlayer.id },
        data: { teamId: targetTeam.id, leagueId: targetTeam.leagueId }
      });

      await tx.player.update({
        where: { id: replacementPlayer.id },
        data: { teamId: null, leagueId: null }
      });

      if (targetTeam.ownerPlayerId === replacementPlayer.id) {
        await tx.team.update({
          where: { id: targetTeam.id },
          data: { ownerPlayerId: data.nextOwnerPlayerId }
        });
      }

      return tx.transfer.create({
        data: {
          type: "FREE_AGENT",
          targetTeamId: targetTeam.id,
          targetPlayerId: targetPlayer.id,
          replacementPlayerId: replacementPlayer.id,
          releasedPlayerId: replacementPlayer.id,
          previousTargetTeamId: null,
          previousTargetLeagueId: null,
          nextOwnerPlayerId: cleanOptional(data.nextOwnerPlayerId),
          notes: cleanOptional(data.notes)
        }
      });
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/transfers", async (_req, res, next) => {
  try {
    const transfers = await prisma.transfer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        targetTeam: true,
        sourceTeam: true,
        targetPlayer: true,
        replacementPlayer: true,
        releasedPlayer: true
      }
    });

    res.json(transfers);
  } catch (error) {
    next(error);
  }
});

export const registrationsRouter = router;
