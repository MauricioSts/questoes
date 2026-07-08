// Helpers de data cientes do fuso do usuário (default America/Fortaleza).
// A meta diária "zera à meia-noite local", então precisamos do início do dia no fuso certo.
import { env } from "../config/env.js";

// Retorna "YYYY-MM-DD" no fuso informado para uma data.
export function localDateKey(date: Date, timeZone = env.USER_TIMEZONE): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Início do dia local (em UTC) para uma dada data.
export function startOfLocalDay(date: Date, timeZone = env.USER_TIMEZONE): Date {
  const key = localDateKey(date, timeZone);
  // Descobre o offset do fuso naquele instante para reconstruir a meia-noite local em UTC.
  const asUTC = new Date(`${key}T00:00:00Z`);
  const offsetMs = offsetForZone(asUTC, timeZone);
  return new Date(asUTC.getTime() - offsetMs);
}

// Offset (ms) do fuso em relação a UTC no instante dado. Positivo = a leste de UTC.
function offsetForZone(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asLocal = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asLocal - date.getTime();
}

// Início do dia de hoje (fuso do usuário), em UTC.
export function startOfToday(timeZone = env.USER_TIMEZONE): Date {
  return startOfLocalDay(new Date(), timeZone);
}

// Início da janela de 7 dias atrás (para simulado "questões da semana").
export function startOfWeekWindow(timeZone = env.USER_TIMEZONE): Date {
  const today = startOfToday(timeZone);
  return new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
}
