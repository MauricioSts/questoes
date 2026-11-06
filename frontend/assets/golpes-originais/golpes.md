# Sprites originais de golpes

Folhas de sprite em pixel art de DS, desenhadas por código (`tools/golpes-originais/`), sem pixel dos jogos. Cada PNG: fundo transparente, quadros do mesmo tamanho lado a lado numa linha, 2 px de espaço entre eles. Tamanhos em px reais de DS (tela 256×192). Projéteis apontam para a direita (atacante embaixo à esquerda); o jogo espelha quando o inimigo ataca.

## Lote 1: golpes sem sprite (28)

| arquivo | quadro | nº de quadros | peças | o que acontece em cada quadro |
|---|---|---|---|---|
| spiky-shield.png | 64×64 | 4 | domo | 1 domo pequeno se forma; 2 domo cheio com espinhos brotando; 3 espinhos longos e brilho branco com faíscas; 4 estável (repetir 4 enquanto o escudo fica) |
| mystical-fire--projetil.png | 32×32 | 6 | projetil | 1-6 loop: orbe de chama violeta com 3 línguas em espiral girando e 3 runas orbitando (60°/quadro) |
| mystical-fire--impacto.png | 40×40 | 5 | impacto | 1 clarão; 2 estrela de chama; 3 explosão cheia com runas; 4 anel se abrindo, runas afastam; 5 anel dissolvendo |
| water-shuriken--projetil.png | 28×28 | 1 | projetil | 1 shuriken d'água de 4 pontas curvas (o motor gira e move) |
| water-shuriken--impacto.png | 32×32 | 4 | impacto | 1 coroa d'água pequena; 2 coroa aberta e gotas saindo; 3 gotas longe; 4 gotas menores caindo |
| leafage.png | 14×14 | 4 | particula | 4 variações de folhinha (ângulos e tamanhos); 1 quadro cada, o motor espalha |
| phantom-force--portal.png | 32×48 | 4 | portal | 1 fenda vertical se abre (risco); 2 fenda abrindo; 3 portal aberto com fumaças; 4 portal no máximo (de onde o usuário sai atrás do alvo) |
| phantom-force--impacto.png | 40×40 | 4 | impacto | 1 primeiro risco do X na metade; 2 X completo; 3 X com brilho; 4 X afinando |
| spirit-shackle--flecha.png | 32×12 | 1 | flecha | 1 flecha-sombra roxa apontando para a direita (o motor faz cair e cravar) |
| spirit-shackle--correntes.png | 64×32 | 4 | correntes | 1 flecha cravada no chão sob o alvo, elos começando; 2 correntes saem em 4 direções; 3 correntes completas prendendo; 4 correntes brilham (fim) |
| darkest-lariat.png | 48×48 | 6 | redemoinho | 1-6 loop: dois braços escuros com punhos girando 30°/quadro, rastro de chamas preto e vermelho atrás de cada braço |
| disarming-voice.png | 40×40 | 3 | onda | 1 um coração-onda pequeno; 2 dois arcos concêntricos; 3 três arcos maiores (o motor afasta e faz fade) |
| baby-doll-eyes.png | 48×26 | 3 | olhos | 1 olhos se abrindo (pálpebra na metade); 2 abertos, brilho grande e 2 coraçõezinhos; 3 piscada com 3 coraçõezinhos |
| misty-terrain.png | 256×192 | 4 | overlay | 1-4 loop: névoa rosa clara em faixas no chão (metade de baixo da tela), deslizando 64 px/quadro; faíscas acendem e apagam em fases |
| moonblast--lua.png | 40×40 | 4 | lua | 1 lua crescente pequena surgindo no alto; 2 crescente maior; 3 quase cheia com faíscas; 4 lua cheia com halo rosa |
| moonblast--orbe.png | 24×24 | 1 | projetil | 1 orbe rosa com halo (o motor leva da lua ao alvo) |
| moonblast--explosao.png | 48×48 | 5 | explosao | 1 clarão; 2 estrela rosa; 3 explosão cheia; 4 anel abrindo; 5 dissolve |
| sparkling-aria--bolha.png | 16×16 | 3 | particula | 3 variações de bolha cintilante (pequena, média, grande) |
| sparkling-aria--nota.png | 12×12 | 2 | particula | 2 variações de nota musical azul-clara (colcheia e dupla) |
| branch-poke--galho.png | 40×16 | 2 | galho | 1 galho recolhido; 2 galho espetando à frente com linhas de movimento |
| branch-poke--impacto.png | 24×24 | 3 | impacto | 1 estrela pequena; 2 estrela cheia; 3 estrela afinando |
| noble-roar--onda.png | 48×48 | 3 | onda | 1 primeira onda dourada; 2 duas ondas; 3 três ondas largas (saem da boca para a direita) |
| noble-roar--juba.png | 48×48 | 1 | juba | 1 juba estilizada em volta do usuário (o motor escala e faz fade) |
| grassy-terrain.png | 256×192 | 4 | overlay | 1-4 loop: tufos de grama e florzinhas pelo chão (metade de baixo), balançando centro→direita→centro→esquerda |
| drum-beating--tambor.png | 40×40 | 3 | tambor | 1 baquetas erguidas; 2 batida no couro com linhas de impacto; 3 baquetas voltando |
| drum-beating--raiz.png | 32×48 | 4 | raiz | 1 chão racha e a ponta da raiz aparece; 2 raiz subindo; 3 raiz inteira curvada para o alvo; 4 golpe com lascas (colocar no field-target) |
| boomburst.png | 128×128 | 5 | onda | 1 dois anéis brancos pequenos; 2 três anéis; 3 anéis grandes; 4 anéis enormes estourando com faíscas; 5 anéis quebrados em arcos (some) |
| pyro-ball--bola.png | 24×24 | 4 | projetil | 1-4 loop: bola de pedra com gomos girando e chamas tremulando atrás e em cima |
| pyro-ball--explosao.png | 48×48 | 5 | explosao | 1 clarão; 2 estrela de fogo; 3 explosão cheia; 4 anel de fogo abrindo; 5 dissolve |
| court-change.png | 128×64 | 4 | setas | 1-4: seta amarela vai da esquerda para a direita por cima e a azul da direita para a esquerda por baixo, cada quadro avança 1/4 do caminho |
| tearful-look--olhos.png | 48×26 | 2 | olhos | 1-2 loop: olhos marejados com água na pálpebra de baixo; o brilho treme entre os quadros |
| tearful-look--lagrima.png | 8×12 | 1 | particula | 1 gota de lágrima (o motor faz cair dos olhos) |
| liquidation--corte.png | 48×48 | 4 | corte | 1 jato d'água subindo; 2 o jato vira lâmina em meia-lua (metade); 3 lâmina inteira com estilhaços; 4 lâmina afinando, gotas espalhando |
| liquidation--gota.png | 8×8 | 3 | particula | 3 variações de gota d'água (média, pequena, grande) |
| snipe-shot--mira.png | 40×40 | 3 | mira | 1 mira grande tracejada procurando; 2 mira fechando; 3 mira travada com ponto vermelho e cantos |
| snipe-shot--tiro.png | 64×8 | 1 | projetil | 1 tiro d'água fino e reto apontando para a direita (cauda fina à esquerda) |
| play-rough.png | 56×48 | 6 | nuvem | 1-6 loop: nuvem de briga pulsando, 2 estrelas amarelas e 1 coração rosa girando em volta, poeira voando |
| flower-trick--buque.png | 32×32 | 3 | buque | 1 buquê com botões fechados; 2 flores abrem e o buquê balança; 3 buquê estoura em pétalas com estrela no centro |
| flower-trick--petala.png | 10×10 | 3 | particula | 3 variações de pétala afiada (rosa, vermelha, amarela) |
| torch-song.png | 16×16 | 3 | particula | 3 variações de nota de fogo (colcheia, dupla, semínima) com chaminhas no topo; o motor solta em leque |
| aqua-cutter--lamina.png | 40×20 | 1 | projetil | 1 lâmina d'água em meia-lua horizontal, convexa para a direita |
| aqua-cutter--impacto.png | 40×40 | 3 | impacto | 1 risco de corte horizontal curto; 2 corte inteiro com gotas; 3 corte afinando, gotas afastam |
| aqua-step--pegada.png | 12×10 | 1 | particula | 1 pegada de água (o motor deixa uma trilha e faz fade) |
| aqua-step--redemoinho.png | 48×24 | 4 | redemoinho | 1-4 loop: redemoinho d'água achatado aos pés, 3 braços girando (30°/quadro) com gotas em volta (colocar no field-user) |
| wave-crash--onda.png | 128×96 | 5 | onda | 1 swell baixo; 2 onda subindo; 3 a crista começa a curvar para a direita; 4 tubo completo com espuma; 5 a onda desaba sobre o alvo com respingos |
| wave-crash--espuma.png | 10×10 | 3 | particula | 3 variações de espuma branca |
