import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { questoesRouter } from "./modules/questoes/questoes.routes.js";
import { answersRouter } from "./modules/answers/answers.routes.js";
import { notesRouter } from "./modules/notes/notes.routes.js";
import { marcadasRouter } from "./modules/marcadas/marcadas.routes.js";
import { goalsRouter } from "./modules/goals/goals.routes.js";

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/questoes", questoesRouter);
app.use("/answers", answersRouter);
app.use("/notes", notesRouter);
app.use("/marcadas", marcadasRouter);
app.use("/goals", goalsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
});
