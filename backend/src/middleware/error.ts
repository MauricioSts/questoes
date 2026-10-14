// Handler central de erros. Converte ZodError em 400 e o resto em 500.
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  // `codigo` deixa o cliente reagir sem ler a mensagem (ex.: "PREMIUM" abre os planos).
  constructor(public status: number, message: string, public codigo?: string) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Dados inválidos", detalhes: err.flatten().fieldErrors });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.codigo ? { codigo: err.codigo } : {}) });
  }
  console.error(err);
  return res.status(500).json({ error: "Erro interno" });
}
