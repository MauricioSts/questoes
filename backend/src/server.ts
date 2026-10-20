import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { seguranca } from "./middleware/seguranca.js";
import { raizRouter } from "./modules/raiz/raiz.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { questoesRouter } from "./modules/questoes/questoes.routes.js";
import { answersRouter } from "./modules/answers/answers.routes.js";
import { notesRouter } from "./modules/notes/notes.routes.js";
import { marcadasRouter } from "./modules/marcadas/marcadas.routes.js";
import { goalsRouter } from "./modules/goals/goals.routes.js";
import { sessaoRouter } from "./modules/sessao/sessao.routes.js";
import { concursosRouter } from "./modules/concursos/concursos.routes.js";
import { trilhasRouter } from "./modules/trilhas/trilhas.routes.js";
import { cadernoRouter } from "./modules/caderno/caderno.routes.js";
import { postitsRouter } from "./modules/postits/postits.routes.js";
import { statsRouter } from "./modules/stats/stats.routes.js";
import { pokeRouter } from "./modules/poke/poke.routes.js";
import { assinaturaRouter } from "./modules/assinatura/assinatura.routes.js";
import { exerciciosRouter, execucoesRouter } from "./modules/codigo/codigo.routes.js";
import { provasRouter } from "./modules/provas/provas.routes.js";
import { discursivasRouter } from "./modules/discursivas/discursivas.routes.js";

const app = express();
// Atrás do Caddy local: req.ip vira o IP real do cliente (usado no limite do registro).
app.set("trust proxy", "loopback");

app.use(seguranca);

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/", raizRouter);

app.use("/auth", authRouter);
app.use("/questoes", questoesRouter);
app.use("/answers", answersRouter);
app.use("/notes", notesRouter);
app.use("/marcadas", marcadasRouter);
app.use("/goals", goalsRouter);
app.use("/sessao", sessaoRouter);
app.use("/concursos", concursosRouter);
app.use("/trilhas", trilhasRouter);
app.use("/caderno", cadernoRouter);
app.use("/postits", postitsRouter);
app.use("/stats", statsRouter);
app.use("/poke", pokeRouter);
app.use("/assinatura", assinaturaRouter);
app.use("/exercicios", exerciciosRouter);
app.use("/execucoes", execucoesRouter);
app.use("/provas", provasRouter);
app.use("/discursivas", discursivasRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
});
