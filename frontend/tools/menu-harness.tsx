import { createRoot } from "react-dom/client";
import { TimeGba, useTemaGba, type LinhaGba } from "../src/components/poke/TimeGba";
import "../src/index.css";

const spr = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/emerald/${id}.png`;
const base: [string, number, number, number, number, string?][] = [
  ["Charizard", 6, 50, 140, 153],
  ["Pikachu", 25, 31, 40, 70, "paralysis"],
  ["Gengar", 94, 44, 20, 120, "poison"],
  ["Snorlax", 143, 40, 0, 190],
  ["Lapras", 131, 38, 130, 130, "sleep"],
  ["Alakazam", 65, 47, 90, 110],
];
const linhas = (campo: number[]): LinhaGba[] =>
  base.map(([nome, id, nivel, hp, max, status], i) => ({ chave: nome, nome, nivel, hp, max, status, sprite: spr(id), emCampo: campo.includes(i), desabilitado: hp <= 0, onClick: () => {} }));

function Demo({ regiao, cls }: { regiao: number; cls: string }) {
  const tema = useTemaGba(regiao);
  return <div className={cls}>{tema ? <TimeGba tema={tema} linhas={linhas([0])} /> : <p style={{ color: "#fff" }}>sem peças ({regiao})</p>}</div>;
}
createRoot(document.getElementById("r")!).render(
  <>
    <Demo regiao={0} cls="w" />
    <Demo regiao={2} cls="w" />
    <Demo regiao={2} cls="n" />
  </>
);
