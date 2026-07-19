import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

function isUniqueConstraintError(error: unknown): error is { code: "P2002"; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Dados invalidos.",
      issues: error.issues
    });
  }

  if (isUniqueConstraintError(error)) {
    return res.status(409).json({
      message: "Ja existe um cadastro com esses dados."
    });
  }

  if (error instanceof Error) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({ message: "Erro inesperado." });
}
