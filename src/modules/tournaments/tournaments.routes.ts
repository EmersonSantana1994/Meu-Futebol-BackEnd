import { Router } from "express";
import { z } from "zod";
import { createRoundRobinFixtures, shuffleTeams } from "../../domain/football/draw-rules.js";
import {
  applyTournamentResult,
  evaluateTournamentScore,
  sortLeagueStandings,
  sortStandings
} from "../../domain/football/match-rules.js";

export const tournamentsRouter = Router();

const scoreSchema = z.object({
  home: z.number().int().min(0),
  away: z.number().int().min(0)
});

const standingRowSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  points: z.number().int(),
  goalBalance: z.number().int()
});

const standingMatchSchema = z.object({
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0)
});

tournamentsRouter.post("/rules/evaluate-score", (req, res, next) => {
  try {
    const score = scoreSchema.parse(req.body);
    res.json(evaluateTournamentScore(score));
  } catch (error) {
    next(error);
  }
});

tournamentsRouter.post("/rules/apply-result", (req, res, next) => {
  try {
    const body = z
      .object({
        home: standingRowSchema,
        away: standingRowSchema,
        score: scoreSchema
      })
      .parse(req.body);

    res.json(applyTournamentResult(body.home, body.away, body.score));
  } catch (error) {
    next(error);
  }
});

tournamentsRouter.post("/rules/sort-standings", (req, res, next) => {
  try {
    const body = z.object({
      standings: z.array(standingRowSchema),
      matches: z.array(standingMatchSchema).optional()
    }).parse(req.body);
    res.json({
      standings: body.matches ? sortLeagueStandings(body.standings, body.matches) : sortStandings(body.standings)
    });
  } catch (error) {
    next(error);
  }
});

tournamentsRouter.post("/draw", (req, res, next) => {
  try {
    const body = z
      .object({
        teams: z.array(z.object({ id: z.string(), name: z.string() })).min(2)
      })
      .parse(req.body);

    const teams = shuffleTeams(body.teams);
    const fixtures = teams.length === 4 ? createRoundRobinFixtures(teams) : [];

    res.json({ teams, fixtures });
  } catch (error) {
    next(error);
  }
});
