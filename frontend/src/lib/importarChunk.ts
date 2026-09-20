// Import dinâmico à prova de deploy.
//
// O app quebra branco quando um deploy sai com a aba aberta: o bundle antigo continua
// rodando e, na hora de buscar um pedaço adiado (motion, os fundos WebGL, o título),
// pede um arquivo com hash que não existe mais. Pior: a regra de rewrite responde
// index.html com 200 em vez de 404, então o navegador tenta executar HTML como módulo
// e o erro estoura no meio do React — sem fronteira de erro, a árvore inteira some e
// sobra a tela branca.
//
// A saída é a única que funciona de verdade: recarregar a página uma vez para pegar o
// index novo. A trava em sessionStorage garante que isso não vire laço de recarga
// quando o chunk falhou por outro motivo (rede caída, por exemplo).
const CHAVE = "q_recarga_chunk";

function marcar(valor: string | null) {
  try {
    if (valor === null) sessionStorage.removeItem(CHAVE);
    else sessionStorage.setItem(CHAVE, valor);
  } catch {
    // Modo privado / storage bloqueado: sem trava, só não recarrega.
  }
}

function jaRecarregou(): boolean {
  try {
    return sessionStorage.getItem(CHAVE) !== null;
  } catch {
    return true; // sem storage, não arrisca o laço
  }
}

export function importarChunk<T>(carregar: () => Promise<T>): Promise<T> {
  return carregar().then(
    (mod) => {
      marcar(null); // chegou: a versão da aba está em dia de novo
      return mod;
    },
    (erro) => {
      if (jaRecarregou()) throw erro; // já tentamos: deixa a fronteira de erro assumir
      marcar("1");
      window.location.reload();
      // A promessa nunca resolve: a página está indo embora e o React não deve
      // renderizar um estado de erro no meio do caminho.
      return new Promise<T>(() => {});
    }
  );
}
