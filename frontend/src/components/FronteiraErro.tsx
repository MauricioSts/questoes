// Fronteira de erro do app inteiro. Sem ela, qualquer exceção durante a renderização
// desmonta a árvore toda e o usuário fica olhando uma página branca, sem saber se é a
// internet, o servidor ou o app. Com ela, o pior caso vira um aviso com um botão.
//
// O caso mais comum é o deploy: a aba antiga pede um pedaço de código que não existe
// mais. lib/importarChunk já recarrega sozinho quando isso acontece; esta tela é a
// segunda linha, para quando a recarga não resolveu ou o erro veio de outro lugar.
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  erro: Error | null;
}

export class FronteiraErro extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Sem serviço de telemetria: o console é o que existe para depurar em produção.
    console.error("Erro não tratado na interface:", erro, info.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="card max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-brand-ink">Algo quebrou por aqui</h1>
          <p className="mt-2 text-sm text-muted">
            Costuma ser uma versão nova do site que entrou enquanto a página estava aberta.
            Recarregar resolve na maioria das vezes.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-6 w-full text-base">
            Recarregar o app
          </button>
          <p className="mt-4 break-words text-[11px] text-faint">{this.state.erro.message}</p>
        </div>
      </div>
    );
  }
}
