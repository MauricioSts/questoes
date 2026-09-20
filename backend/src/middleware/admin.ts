// Só o administrador mexe no acervo. O e-mail vem do access token (req.userEmail),
// não do corpo da requisição, então não dá para forjar pelo cliente.
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export function ehAdmin(email: string | undefined): boolean {
  return !!email && email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!ehAdmin(req.userEmail)) {
    return res.status(403).json({ error: "Só o administrador pode alterar o acervo de questões." });
  }
  next();
}
