import helmet from "helmet";

// Headers de segurança. A API só responde JSON (fora a página da raiz e a de aprovação de
// conta, que definem a própria CSP), então a política padrão não libera nada. CORP
// "same-site" porque o front (questoes.) e a API (questoesapi.) são o mesmo site.
export const seguranca = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "same-site" },
});
