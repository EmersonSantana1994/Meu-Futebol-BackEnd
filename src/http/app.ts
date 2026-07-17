import cors from "cors";
import express from "express";
import { cupsRouter } from "../modules/cups/cups.routes.js";
import { competitionsRouter } from "../modules/competitions/competitions.routes.js";
import { registrationsRouter } from "../modules/registrations/registrations.routes.js";
import { rankingsRouter } from "../modules/rankings/rankings.routes.js";
import { scoreboardRouter } from "../modules/scoreboard/scoreboard.routes.js";
import { tournamentsRouter } from "../modules/tournaments/tournaments.routes.js";
import { errorHandler } from "./errors.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? "http://localhost:3005"
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "my-fut-api" });
  });

  app.use("/tournaments", tournamentsRouter);
  app.use("/registrations", registrationsRouter);
  app.use("/rankings", rankingsRouter);
  app.use("/competitions", competitionsRouter);
  app.use("/cups", cupsRouter);
  app.use("/scoreboard", scoreboardRouter);

  app.use(errorHandler);

  return app;
}
