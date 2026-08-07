// Camadas de atmosfera fixas atrás do conteúdo. Nunca capturam clique.
// Grão + vinheta em ambos os temas; halos de vela só no Grimório; varredura só no Neon.
export function Atmosfera() {
  return (
    <>
      <div className="atmos atmos-grain" aria-hidden />
      <div className="atmos atmos-vignette" aria-hidden />
      <div className="atmos atmos-candle" aria-hidden>
        <span className="halo halo-amber" />
        <span className="halo halo-violet" />
      </div>
      <div className="atmos" aria-hidden>
        <span className="atmos-scan" />
      </div>
    </>
  );
}
