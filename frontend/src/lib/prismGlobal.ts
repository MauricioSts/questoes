// Os componentes de linguagem do prismjs (prism-java.js etc.) são scripts que procuram
// um `Prism` global. Este módulo publica a MESMA instância que o prism-react-renderer usa
// e precisa ser importado ANTES deles (ver lib/prismLinguagens.ts).
import { Prism } from "prism-react-renderer";

(globalThis as unknown as { Prism: typeof Prism }).Prism = Prism;
