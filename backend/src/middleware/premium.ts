// Recursos só de assinante. Responde 402 com `codigo` para o cliente abrir a tela de
// planos em vez de tratar como erro comum.
import type { Request, Response, NextFunction } from "express";
import { acessoDoUsuario } from "../lib/assinatura.js";

export function requirePremium(req: Request, res: Response, next: NextFunction) {
  acessoDoUsuario(req.userId!, req.userEmail)
    .then((motivo) => {
      if (motivo) return next();
      res.status(402).json({ error: "Recurso exclusivo para assinantes.", codigo: "PREMIUM" });
    })
    .catch(next);
}
