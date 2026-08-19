// Estatísticas agregadas: heatmap de sequência (estilo GitHub).
import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { localDateKey } from "../../lib/date.js";

export const statsRouter = Router();
statsRouter.use(requireAuth);

// GET /stats/heatmap?concursoId=&from=&to=: total de questões respondidas por dia
// (fuso America/Fortaleza), para o heatmap anual. from/to em ISO ou YYYY-MM-DD.
statsRouter.get(
  "/heatmap",
  asyncHandler(async (req, res) => {
    const concursoId = req.query.concursoId ? String(req.query.concursoId) : undefined;
    const parse = (v: unknown) => {
      if (!v) return undefined;
      const s = String(v);
      return new Date(s.includes("T") ? s : `${s}T00:00:00`);
    };
    const from = parse(req.query.from);
    const to = parse(req.query.to);

    const rows = await prisma.answer.findMany({
      where: {
        userId: req.userId!,
        ...(concursoId ? { concursoId } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      select: { createdAt: true },
    });

    const porDia = new Map<string, number>();
    for (const r of rows) {
      const key = localDateKey(r.createdAt);
      porDia.set(key, (porDia.get(key) ?? 0) + 1);
    }

    const dias = [...porDia.entries()]
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => a.dia.localeCompare(b.dia));

    // Períodos de férias (para o heatmap marcar as semanas em que houve modo férias).
    const periodosRaw = await prisma.feriasPeriodo.findMany({
      where: { userId: req.userId! },
      select: { inicio: true, fim: true },
      orderBy: { inicio: "asc" },
    });
    const periodos = periodosRaw.map((p) => ({
      inicio: localDateKey(p.inicio),
      fim: p.fim ? localDateKey(p.fim) : null,
    }));

    res.json({ dias, periodos });
  })
);
