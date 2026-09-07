import { defineConfig } from "vitest/config";

// Só a lógica pura roda aqui: os testes copiados do web (sessionBuilder, correcao,
// validarLote) não tocam em React Native nem em DOM. São a única rede de proteção
// contra o mobile divergir do web, já que as duas cópias são independentes.
export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
  },
});
