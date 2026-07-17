import { Router } from "express";
import { z } from "zod";
import {
  addGoalToScoreboard,
  incrementPlayerStat
} from "../../domain/football/scoreboard-rules.js";

export const scoreboardRouter = Router();

const playerSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  teamId: z.string(),
  teamName: z.string()
});

scoreboardRouter.post("/rules/register-goal", (req, res, next) => {
  try {
    const body = z
      .object({
        player: playerSchema,
        amount: z.number().int().positive().default(1),
        scoreboard: z.array(
          z.object({
            teamId: z.string(),
            teamName: z.string(),
            goals: z.number().int().min(0)
          })
        ),
        scorers: z.array(
          z.object({
            playerId: z.string(),
            playerName: z.string(),
            total: z.number().int().min(0),
            tournamentTotal: z.number().int().min(0)
          })
        )
      })
      .parse(req.body);

    res.json({
      scoreboard: addGoalToScoreboard(body.scoreboard, body.player, body.amount),
      scorers: incrementPlayerStat(body.scorers, body.player, body.amount)
    });
  } catch (error) {
    next(error);
  }
});

scoreboardRouter.post("/rules/register-assist", (req, res, next) => {
  try {
    const body = z
      .object({
        player: playerSchema.pick({ playerId: true, playerName: true }),
        amount: z.number().int().positive().default(1),
        assists: z.array(
          z.object({
            playerId: z.string(),
            playerName: z.string(),
            total: z.number().int().min(0),
            tournamentTotal: z.number().int().min(0)
          })
        )
      })
      .parse(req.body);

    res.json({
      assists: incrementPlayerStat(body.assists, body.player, body.amount)
    });
  } catch (error) {
    next(error);
  }
});
