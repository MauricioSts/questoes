// WebGL rodando na CPU (Chrome com aceleração de hardware desligada, máquina sem GPU
// liberada: SwiftShader / llvmpipe). Nesse caso cada quadro do fundo em tela cheia custa
// dezenas de milissegundos, a página inteira fica sem quadro livre e até as animações de
// CSS param no meio — o anel da meta chegou a ficar parado no zero. Nesses aparelhos os
// efeitos desenham UM quadro e não animam.
//
// `localStorage.q_fx = "sempre"` força a animação mesmo assim (usado nos testes, que
// rodam justamente em SwiftShader).
export function webglLento(gl: WebGL2RenderingContext): boolean {
  try {
    if (localStorage.getItem("q_fx") === "sempre") return false;
  } catch {
    /* sem localStorage: segue a detecção */
  }
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const nome = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(nome);
}
