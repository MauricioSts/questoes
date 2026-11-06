# Sprites originais de golpes

Folhas de sprite em pixel art de DS, desenhadas por código (`tools/golpes-originais/`), sem pixel dos jogos. Cada PNG: fundo transparente, quadros do mesmo tamanho lado a lado numa linha, 2 px de espaço entre eles. Tamanhos em px reais de DS (tela 256×192). Projéteis apontam para a direita (atacante embaixo à esquerda); o jogo espelha quando o inimigo ataca. Peças marcadas *(recolorível)* estão em cinza para o recolor por tipo.

## Lote 1: golpes sem sprite (28)

| arquivo | quadro | nº de quadros | peças | o que acontece em cada quadro |
|---|---|---|---|---|
| aqua-cutter--impacto.png | 40×40 | 3 | impacto | 1 risco de corte horizontal curto; 2 corte inteiro com gotas; 3 corte afinando, gotas afastam |
| aqua-cutter--lamina.png | 40×20 | 1 | projetil | 1 lâmina d'água em meia-lua horizontal, convexa para a direita |
| aqua-step--pegada.png | 12×10 | 1 | particula | 1 pegada de água (o motor deixa uma trilha e faz fade) |
| aqua-step--redemoinho.png | 48×24 | 4 | redemoinho | 1-4 loop: redemoinho d'água achatado aos pés, 3 braços girando (30°/quadro) com gotas em volta (colocar no field-user) |
| baby-doll-eyes.png | 48×26 | 3 | olhos | 1 olhos se abrindo (pálpebra na metade); 2 abertos, brilho grande e 2 coraçõezinhos; 3 piscada com 3 coraçõezinhos |
| boomburst.png | 128×128 | 5 | onda | 1 dois anéis brancos pequenos; 2 três anéis; 3 anéis grandes; 4 anéis enormes estourando com faíscas; 5 anéis quebrados em arcos (some) |
| branch-poke--galho.png | 40×16 | 2 | galho | 1 galho recolhido; 2 galho espetando à frente com linhas de movimento |
| branch-poke--impacto.png | 24×24 | 3 | impacto | 1 estrela pequena; 2 estrela cheia; 3 estrela afinando |
| court-change.png | 128×64 | 4 | setas | 1-4: seta amarela vai da esquerda para a direita por cima e a azul da direita para a esquerda por baixo, cada quadro avança 1/4 do caminho |
| darkest-lariat.png | 48×48 | 6 | redemoinho | 1-6 loop: dois braços escuros com punhos girando 30°/quadro, rastro de chamas preto e vermelho atrás de cada braço |
| disarming-voice.png | 40×40 | 3 | onda | 1 um coração-onda pequeno; 2 dois arcos concêntricos; 3 três arcos maiores (o motor afasta e faz fade) |
| drum-beating--raiz.png | 32×48 | 4 | raiz | 1 chão racha e a ponta da raiz aparece; 2 raiz subindo; 3 raiz inteira curvada para o alvo; 4 golpe com lascas (colocar no field-target) |
| drum-beating--tambor.png | 40×40 | 3 | tambor | 1 baquetas erguidas; 2 batida no couro com linhas de impacto; 3 baquetas voltando |
| flower-trick--buque.png | 32×32 | 3 | buque | 1 buquê com botões fechados; 2 flores abrem e o buquê balança; 3 buquê estoura em pétalas com estrela no centro |
| flower-trick--petala.png | 10×10 | 3 | particula | 3 variações de pétala afiada (rosa, vermelha, amarela) |
| grassy-terrain.png | 256×192 | 4 | overlay | 1-4 loop: tufos de grama e florzinhas pelo chão (metade de baixo), balançando centro→direita→centro→esquerda |
| leafage.png | 14×14 | 4 | particula | 4 variações de folhinha (ângulos e tamanhos); 1 quadro cada, o motor espalha |
| liquidation--corte.png | 48×48 | 4 | corte | 1 jato d'água subindo; 2 o jato vira lâmina em meia-lua (metade); 3 lâmina inteira com estilhaços; 4 lâmina afinando, gotas espalhando |
| liquidation--gota.png | 8×8 | 3 | particula | 3 variações de gota d'água (média, pequena, grande) |
| misty-terrain.png | 256×192 | 4 | overlay | 1-4 loop: névoa rosa clara em faixas no chão (metade de baixo da tela), deslizando 64 px/quadro; faíscas acendem e apagam em fases |
| moonblast--explosao.png | 48×48 | 5 | explosao | 1 clarão; 2 estrela rosa; 3 explosão cheia; 4 anel abrindo; 5 dissolve |
| moonblast--lua.png | 40×40 | 4 | lua | 1 lua crescente pequena surgindo no alto; 2 crescente maior; 3 quase cheia com faíscas; 4 lua cheia com halo rosa |
| moonblast--orbe.png | 24×24 | 1 | projetil | 1 orbe rosa com halo (o motor leva da lua ao alvo) |
| mystical-fire--impacto.png | 40×40 | 5 | impacto | 1 clarão; 2 estrela de chama; 3 explosão cheia com runas; 4 anel se abrindo, runas afastam; 5 anel dissolvendo |
| mystical-fire--projetil.png | 32×32 | 6 | projetil | 1-6 loop: orbe de chama violeta com 3 línguas em espiral girando e 3 runas orbitando (60°/quadro) |
| noble-roar--juba.png | 48×48 | 1 | juba | 1 juba estilizada em volta do usuário (o motor escala e faz fade) |
| noble-roar--onda.png | 48×48 | 3 | onda | 1 primeira onda dourada; 2 duas ondas; 3 três ondas largas (saem da boca para a direita) |
| phantom-force--impacto.png | 40×40 | 4 | impacto | 1 primeiro risco do X na metade; 2 X completo; 3 X com brilho; 4 X afinando |
| phantom-force--portal.png | 32×48 | 4 | portal | 1 fenda vertical se abre (risco); 2 fenda abrindo; 3 portal aberto com fumaças; 4 portal no máximo (de onde o usuário sai atrás do alvo) |
| play-rough.png | 56×48 | 6 | nuvem | 1-6 loop: nuvem de briga pulsando, 2 estrelas amarelas e 1 coração rosa girando em volta, poeira voando |
| pyro-ball--bola.png | 24×24 | 4 | projetil | 1-4 loop: bola de pedra com gomos girando e chamas tremulando atrás e em cima |
| pyro-ball--explosao.png | 48×48 | 5 | explosao | 1 clarão; 2 estrela de fogo; 3 explosão cheia; 4 anel de fogo abrindo; 5 dissolve |
| snipe-shot--mira.png | 40×40 | 3 | mira | 1 mira grande tracejada procurando; 2 mira fechando; 3 mira travada com ponto vermelho e cantos |
| snipe-shot--tiro.png | 64×8 | 1 | projetil | 1 tiro d'água fino e reto apontando para a direita (cauda fina à esquerda) |
| sparkling-aria--bolha.png | 16×16 | 3 | particula | 3 variações de bolha cintilante (pequena, média, grande) |
| sparkling-aria--nota.png | 12×12 | 2 | particula | 2 variações de nota musical azul-clara (colcheia e dupla) |
| spiky-shield.png | 64×64 | 4 | domo | 1 domo pequeno se forma; 2 domo cheio com espinhos brotando; 3 espinhos longos e brilho branco com faíscas; 4 estável (repetir 4 enquanto o escudo fica) |
| spirit-shackle--correntes.png | 64×32 | 4 | correntes | 1 flecha cravada no chão sob o alvo, elos começando; 2 correntes saem em 4 direções; 3 correntes completas prendendo; 4 correntes brilham (fim) |
| spirit-shackle--flecha.png | 32×12 | 1 | flecha | 1 flecha-sombra roxa apontando para a direita (o motor faz cair e cravar) |
| tearful-look--lagrima.png | 8×12 | 1 | particula | 1 gota de lágrima (o motor faz cair dos olhos) |
| tearful-look--olhos.png | 48×26 | 2 | olhos | 1-2 loop: olhos marejados com água na pálpebra de baixo; o brilho treme entre os quadros |
| torch-song.png | 16×16 | 3 | particula | 3 variações de nota de fogo (colcheia, dupla, semínima) com chaminhas no topo; o motor solta em leque |
| water-shuriken--impacto.png | 32×32 | 4 | impacto | 1 coroa d'água pequena; 2 coroa aberta e gotas saindo; 3 gotas longe; 4 gotas menores caindo |
| water-shuriken--projetil.png | 28×28 | 1 | projetil | 1 shuriken d'água de 4 pontas curvas (o motor gira e move) |
| wave-crash--espuma.png | 10×10 | 3 | particula | 3 variações de espuma branca |
| wave-crash--onda.png | 128×96 | 5 | onda | 1 swell baixo; 2 onda subindo; 3 a crista começa a curvar para a direita; 4 tubo completo com espuma; 5 a onda desaba sobre o alvo com respingos |

## Lote 2a: aumento/queda de atributo e cura (61)

| arquivo | quadro | nº de quadros | peças | o que acontece em cada quadro |
|---|---|---|---|---|
| acid-armor.png | 40×40 | 4 | icone | 1 gosma roxa no topo começando a escorrer; 2-3 escorre e pinga; 4 cobre tudo (o corpo vira líquido) |
| after-you.png | 40×32 | 2 | icone | 1 mão de palma para cima em gesto de 'por favor'; 2 com seta amarela apontando para o alvo |
| aqua-ring.png | 56×24 | 4 | anel | 1-4 loop: anel achatado de bolhas d'água girando em volta do usuário (9°/quadro) |
| autotomize--pedaco.png | 12×12 | 3 | particula | 3 variações de pedaço de metal (o motor faz cair) |
| autotomize--velocidade.png | 32×24 | 1 | linhas | 1 linhas de velocidade brancas (o motor arrasta ao lado do usuário) |
| barrier.png | 40×40 | 3 | icone | 1 placa hexagonal pequena surgindo; 2 placa ciano translúcida cheia; 3 reflexo branco atravessa |
| belly-drum.png | 40×40 | 3 | icone | 1 barriga redonda; 2 batida: barriga estufa e ondas vermelhas dos lados; 3 duas ondas por lado |
| bulk-up.png | 40×32 | 3 | icone | 1 braço dobrado; 2 bíceps incha com linhas de força; 3 bíceps no máximo |
| calm-mind.png | 40×32 | 3 | icone | 1 olho fechado com cílios e uma onda suave; 2 duas ondas; 3 três ondas lilás |
| captivate.png | 32×32 | 3 | icone | 1 coração rosa; 2 coração grande com brilhos; 3 pulsa e os brilhos mudam |
| charge.png | 40×40 | 4 | icone | 1 faíscas elétricas afastadas; 2-3 se juntando; 4 bola de carga amarela no centro |
| charm.png | 32×32 | 3 | icone | 1 coração rosa; 2 pisca grande com halo; 3 encolhe (loop 1-2-3) |
| coil.png | 40×40 | 4 | icone | 1 serpente roxa meia volta; 2-3 enrolando mais; 4 espiral fechada com a cabeça no topo |
| cosmic-power.png | 48×40 | 3 | constelacao | 1 estrelas douradas sobre fundo azul-escuro; 2 linhas da constelação ligando; 3 constelação completa brilhando (o motor faz descer até o usuário) |
| cotton-guard.png | 48×40 | 3 | nuvem | 1 três tufos de algodão; 2 cinco tufos envolvendo; 3 anel completo de algodão branco |
| defense-curl.png | 32×32 | 4 | icone | (recolorível) 1 anel abrindo; 2 meio anel; 3 quase fechado; 4 bola fechada |
| disable.png | 40×40 | 3 | icone | 1 X vermelho pequeno; 2 X cheio sobre uma corrente; 3 X mais grosso (golpe travado) |
| double-team.png | 64×40 | 3 | silhuetas | (recolorível) 1 silhueta tremendo; 2 três silhuetas translúcidas lado a lado; 3 as três iguais (não dá para saber qual é a verdadeira) |
| dragon-dance.png | 40×48 | 6 | aura | 1-6 loop: duas fitas de chama de dragão (roxa e azul) subindo em espiral, as costas mais escuras, com pontas de fogo no topo |
| encore.png | 48×48 | 3 | icone | 1 holofote acende; 2 'BIS!' aparece; 3 estrelas em volta |
| fake-tears.png | 14×18 | 3 | particula | 3 variações de lágrima exagerada (gotas grandes; o motor solta em leque dos olhos) |
| feather-dance.png | 14×14 | 3 | particula | 3 variações de pena branca (o motor faz cair balançando) |
| flash.png | 256×192 | 3 | overlay | 1 clarão branco total; 2 clarão diminuindo; 3 clarão em xadrez (sumindo) |
| focus-energy.png | 48×48 | 4 | icone | 1 veias de energia amarela nas bordas; 2-3 convergindo para o centro; 4 centro brilha e estoura |
| gastro-acid.png | 32×40 | 4 | icone | 1-4 loop: gosma verde ácida pingando gotas que caem em ritmos diferentes |
| growth.png | 32×32 | 4 | icone | 1 brotinho; 2 cresce e abre duas folhas; 3 botão rosa; 4 flor aberta com brilhos |
| harden.png | 32×32 | 3 | icone | 1 superfície cinza rachando; 2 vira cristal facetado; 3 cristal brilha |
| heal-pulse.png | 48×48 | 4 | pulso | 1 cruz verde; 2 primeira onda de pulso; 3 duas ondas; 4 ondas se afastando |
| howl.png | 40×40 | 3 | icone | 1 lua crescente cinza-azulada e uma onda de uivo; 2 duas ondas; 3 três ondas |
| ingrain.png | 48×32 | 4 | raizes | 1 raízes começam sob os pés; 2-3 crescem para baixo; 4 três raízes cravadas no chão |
| iron-defense.png | 40×40 | 4 | icone | 1 quatro placas de aço afastadas; 2 aproximando; 3 juntas como armadura; 4 armadura brilha |
| magnet-rise.png | 32×40 | 2 | icone | 1-2 loop: ímã em U (vermelho e azul) flutuando com linhas de campo, sobe e desce |
| meditate.png | 48×32 | 3 | aura | 1 lótus laranja fechado; 2 pétalas abrindo; 3 lótus aberto com aura |
| milk-drink.png | 24×32 | 3 | icone | 1 garrafa de leite cheia; 2 o leite baixa; 3 brilho branco em volta |
| minimize.png | 40×40 | 4 | icone | (recolorível) 1 quatro setas apontando para dentro, ponto grande; 2-3 setas fecham e o ponto encolhe; 4 só um pontinho |
| moonlight.png | 40×48 | 3 | icone | 1 lua crescente azul; 2 luz azul começa a descer; 3 feixes de luz chegam ao chão |
| morning-sun.png | 48×32 | 4 | icone | 1 sol aparecendo no horizonte; 2 nascendo; 3 metade com raios; 4 sol inteiro laranja e amarelo |
| nasty-plot.png | 40×40 | 3 | balao | 1 bolinhas de pensamento; 2 balão com sorriso maligno; 3 lâmpada escura acende em cima |
| power-trick.png | 40×32 | 4 | setas | 1 seta vermelha (ataque) em cima e azul (defesa) embaixo; 2-3 giram trocando de lugar; 4 trocadas |
| quash.png | 40×40 | 3 | icone | 1 mão escura no alto; 2 empurra para baixo com onda roxa; 3 duas ondas no chão |
| quiver-dance.png | 40×40 | 4 | espiral | 1-4 loop: pó de asa iridescente (5 cores) em espiral girando 45°/quadro |
| rock-polish.png | 32×32 | 3 | icone | 1 pedra com uma faísca; 2 pedra polida com brilho; 3 brilhos de polimento em volta |
| roost--ninho.png | 40×16 | 1 | ninho | 1 ninho de gravetos (o motor põe no chão sob o usuário; as penas são as do feather-dance) |
| sand-attack--grao.png | 8×8 | 3 | particula | 3 variações de grão de areia |
| sand-attack--nuvem.png | 32×24 | 3 | nuvem | 1 punhado de areia; 2 nuvem de areia abrindo; 3 nuvem rala (chega no rosto do alvo) |
| sharpen.png | 32×32 | 3 | icone | (recolorível) 1 aresta triangular; 2 brilho afiado subindo; 3 brilho na ponta com faísca |
| shell-smash.png | 40×40 | 4 | icone | 1 casco inteiro; 2 casco racha; 3 estoura com estrela; 4 pedaços voando |
| shift-gear.png | 40×32 | 4 | icone | 1-4 loop: duas engrenagens de metal girando em sentidos opostos |
| simple-beam.png | 64×16 | 2 | raio | 1-2 loop: raio de pontinhos rosa e amarelo alternando (desliza 4 px por quadro) |
| slack-off.png | 40×32 | 3 | icone | 1 nuvenzinha de preguiça com um z; 2 dois z; 3 três z e brilho verde em volta |
| smokescreen.png | 48×40 | 4 | nuvem | 1 baforada de fumaça preta pequena; 2 cresce; 3 nuvem cheia; 4 dissolvendo |
| soft-boiled.png | 32×32 | 4 | icone | 1 ovo branco; 2 ovo racha no meio; 3 abre e brilha; 4 brilho grande saindo |
| stockpile.png | 40×24 | 3 | icone | 1 uma esfera verde; 2 duas; 3 três esferas acumuladas (uma por uso) |
| string-shot.png | 40×40 | 4 | fios | 1 fio de seda começa a enrolar; 2-3 mais voltas; 4 o alvo fica todo enrolado |
| sweet-scent.png | 48×32 | 4 | nuvem | 1-4 loop: nuvem rosa de perfume ondulando com florzinhas brancas |
| synthesis.png | 48×48 | 3 | icone | 1 raios de sol começam a descer; 2 raios alcançam as folhas; 3 folhas brilham absorvendo a luz |
| tail-glow.png | 40×32 | 3 | icone | 1 cauda curva; 2 a ponta acende em amarelo com pontos de luz; 3 brilho máximo com halo |
| tail-whip.png | 32×32 | 3 | icone | 1 cauda à esquerda; 2 no meio; 3 à direita (balançando com linhas de movimento) |
| tickle.png | 40×32 | 3 | icone | 1 pena fazendo cócegas; 2 pena balança e surgem marcas de riso; 3 três marcas de riso |
| whirlwind.png | 40×48 | 4 | redemoinho | 1-4 loop: redemoinho de vento cinza-claro em anéis, girando |
| wish--estrela.png | 32×16 | 1 | projetil | 1 estrela cadente com rastro (o motor faz cair do céu no usuário) |
| withdraw.png | 40×32 | 3 | icone | 1 duas metades de casco abertas; 2 fechando; 3 casco fechado com brilho |
| work-up.png | 40×32 | 2 | icone | 1-2 loop: dois punhos laranja tremendo de esforço com linhas de força |

## Lote 2b: grupos de golpes parecidos (102)

| arquivo | quadro | nº de quadros | peças | o que acontece em cada quadro |
|---|---|---|---|---|
| air-cutter.png | 16×16 | 3 | particula | 3 variações de lâmina de ar pequena (saem em leque) |
| air-slash.png | 32×32 | 1 | projetil | 1 lâmina de ar branca em meia-lua (o motor gira e lança) |
| aqua-jet.png | 64×24 | 4 | rastro | 1-4 loop: jato d'água que se alarga para a frente (o usuário vai na ponta), com gotas |
| assurance--exclamacao.png | 16×24 | 1 | icone | 1 '!' vermelho (aparece sobre o alvo se ele já levou dano no turno) |
| assurance--punho.png | 28×24 | 1 | punho | 1 punho escuro |
| blaze-kick.png | 40×32 | 4 | pe | 1-4 loop: pé em chamas, labaredas tremulando atrás |
| brave-bird.png | 48×32 | 4 | projetil | 1-4 loop: pássaro de energia azul batendo as asas, com rastro (o usuário investe dentro dele) |
| bullet-punch.png | 36×20 | 1 | projetil | 1 punho de aço em forma de bala |
| charge-beam.png | 128×24 | 4 | raio | 1-4 loop: raio elétrico amarelo em zigue-zague (cada quadro um traçado) |
| chute-base--impacto.png | 40×40 | 3 | impacto | (recolorível) 1 estrela pequena; 2 cheia; 3 afinando |
| chute-base--pe.png | 32×24 | 1 | pe | (recolorível) base dos chutes: 1 pé com a sola para a direita |
| circle-throw.png | 64×64 | 4 | rastro | 1-4 rastro do arremesso em arco circular, crescendo até quase uma volta |
| comet-punch.png | 48×24 | 1 | punho | 1 punho dourado com cauda de cometa (o motor repete em sequência rápida) |
| confusion.png | 56×24 | 4 | aneis | 1-4 loop: três anéis psíquicos rosa girando em volta do alvo |
| cotton-spore.png | 14×14 | 3 | particula | 3 variações de tufo de algodão |
| cross-chop.png | 48×48 | 3 | maos | 1 duas mãos de caratê afastadas; 2 cruzando; 3 X fechado com impacto |
| cross-poison.png | 48×48 | 4 | corte | 1 primeiro risco roxo; 2 X de veneno completo; 3 brilho; 4 afinando |
| dizzy-punch.png | 40×20 | 4 | estrelas | 1-4 loop: três estrelinhas girando em volta da cabeça do alvo |
| double-edge--aura.png | 48×48 | 4 | aura | 1-4 loop: aura ondulante branca e laranja em volta do usuário que investe |
| double-edge--recuo.png | 32×32 | 3 | impacto | 1-3 estrela laranja de recuo (sobre o próprio usuário) |
| drain-punch--energia.png | 12×12 | 1 | particula | 1 esfera de energia laranja (sugada pelo punho base) |
| echoed-voice.png | 48×48 | 4 | onda | 1-4 ondas que se repetem, cada quadro com uma a mais e maior (o golpe cresce a cada uso) |
| egg-bomb--explosao.png | 48×48 | 5 | explosao | 1 clarão; 2 estrela; 3 explosão amarela; 4 anel; 5 dissolve |
| egg-bomb--ovo.png | 16×20 | 1 | projetil | 1 ovo branco (o motor arremessa em arco e gira) |
| embargo.png | 24×32 | 3 | icone | 1 cadeado preto aberto; 2 fecha; 3 trancado com brilho |
| extrasensory.png | 48×32 | 3 | olho | 1 olho psíquico se abrindo sobre o alvo; 2 aberto; 3 brilha com raios |
| extreme-speed.png | 96×32 | 3 | rastro | 1-3 loop: rastro branco intenso com linhas de velocidade passando |
| feint.png | 40×48 | 3 | silhueta | (recolorível) 1 silhueta falsa do usuário; 2 começa a sumir; 3 some em xadrez (o golpe vem de outro lado) |
| feint-attack.png | 48×48 | 4 | golpe | 1 sombra surge pela lateral; 2 aproxima; 3 golpe em X escuro; 4 X afinando |
| fire-fang--chama.png | 14×18 | 3 | particula | 3 variações de chama (sobem da mordida) |
| flame-charge.png | 12×16 | 3 | particula | 3 variações de chaminha (o motor espalha em volta do usuário correndo) |
| fury-cutter.png | 48×48 | 4 | corte | 1-4 lâmina de inseto verde em meia-lua, cada quadro maior (usar o quadro pelo nº de usos seguidos) |
| giga-drain.png | 48×48 | 4 | raizes | 1 raízes de luz começam a sair do alvo; 2-3 crescem com mais esferas; 4 muitas esferas presas às raízes |
| grass-whistle--folha.png | 24×16 | 1 | folha | 1 folha-apito |
| grass-whistle--nota.png | 12×12 | 2 | particula | 2 variações de nota verde |
| head-charge.png | 40×24 | 1 | chifres | 1 par de chifres apontando para a frente (vai na frente da investida) |
| head-smash--cabeca.png | 32×32 | 1 | cabeca | 1 cabeça de pedra com rachaduras (vai na frente do usuário na investida) |
| head-smash--explosao.png | 56×56 | 5 | explosao | 1 clarão; 2 estrela; 3 explosão de pedra; 4 anel; 5 dissolve |
| headbutt.png | 40×40 | 3 | impacto | 1 estrela pequena e anel; 2 estrela e dois anéis (bonk); 3 anéis se abrindo |
| heal-block.png | 32×32 | 3 | icone | 1 cruz verde de cura; 2 um X vermelho começa por cima; 3 X completo (cura bloqueada) |
| heavy-slam.png | 64×24 | 4 | rachadura | 1 o corpo pesado bate: rachadura curta; 2-3 rachaduras se espalham no chão; 4 lascas pulando |
| high-jump-kick.png | 56×56 | 4 | impacto | 1-3 impacto vermelho forte de 8 pontas; 4 anéis de choque (o chute voador alto, mais forte) |
| horn-leech.png | 32×24 | 1 | chifre | 1 chifre de madeira (as esferas verdes são as do mega-drain) |
| hyper-fang.png | 48×48 | 4 | boca | (recolorível) 1-4 mordida com dois incisivos enormes |
| hyper-voice.png | 64×64 | 3 | onda | 1-3 ondas sonoras enormes e brancas |
| ice-fang--cristal.png | 14×14 | 3 | particula | 3 variações de cristal de gelo |
| icy-wind.png | 64×32 | 4 | vento | 1-4 loop: vento gelado azul-claro em faixas onduladas com cristaizinhos |
| imprison.png | 48×48 | 3 | cela | 1 grades roxas descendo; 2 cela completa; 3 cela trancada com brilho |
| jump-kick.png | 24×48 | 1 | rastro | 1 rastro do chute voador caindo de cima (o pé base vai na ponta) |
| karate-chop.png | 40×40 | 3 | mao | 1 mão de caratê erguida; 2 descendo com linhas de movimento; 3 golpe embaixo |
| leaf-blade.png | 48×48 | 4 | corte | 1 lâmina-folha verde começa o corte; 2 meio; 3 corte inteiro com brilho; 4 some em xadrez |
| low-kick.png | 64×24 | 3 | rastro | 1-3 rastro de rasteira baixo, varrendo da esquerda para a direita, com poeira |
| mach-punch.png | 48×24 | 1 | linhas | 1 linhas de velocidade brancas (vão atrás do punho base) |
| mega-drain.png | 14×14 | 2 | particula | 2 variações de esfera verde maior (o motor traz do alvo ao usuário) |
| mega-punch.png | 64×64 | 4 | impacto | (recolorível) 1 impacto forte; 2 estrela enorme de 10 pontas; 3 estrela com anel de choque; 4 anéis se abrindo |
| metal-sound.png | 48×48 | 3 | onda | 1-3 ondas metálicas cinza com faíscas |
| meteor-mash.png | 48×32 | 4 | projetil | 1-4 loop: punho-meteoro de aço com cauda de fogo e duas estrelas girando |
| mirror-shot--clarao.png | 64×16 | 2 | raio | 1-2 loop: tiro de luz refletida, prateado |
| mirror-shot--espelho.png | 32×32 | 3 | espelho | 1 espelho oval; 2 reflexo atravessa; 3 clarão na borda (de onde sai o tiro) |
| mordida-base.png | 48×48 | 4 | boca | (recolorível) base das mordidas: 1 boca aberta; 2 fechando; 3 fechada; 4 impacto com riscos (bite, fire/thunder/ice/poison-fang) |
| mud-slap.png | 32×32 | 4 | impacto | 1 tapa de lama marrom; 2 espalha; 3 mancha cheia com respingos; 4 some |
| night-slash.png | 48×48 | 4 | corte | 1 corte escuro em meia-lua começa; 2 abre; 3 cheio; 4 afina |
| payback.png | 40×32 | 3 | seta | 1-3 seta vermelha curva voltando para o alvo (revide) |
| pedra-base.png | 24×24 | 3 | pedra | (recolorível) base das pedras: 3 variações (pequena, média, grande) |
| perish-song--caveira.png | 18×18 | 1 | icone | 1 caveira (fica sobre os dois Pokémon durante a contagem) |
| perish-song--nota.png | 12×12 | 2 | particula | 2 variações de nota sombria |
| poison-fang--gota.png | 10×12 | 3 | particula | 3 variações de gota roxa de veneno |
| poison-powder.png | 10×10 | 3 | particula | 3 variações de pó roxo |
| poison-sting.png | 20×10 | 1 | projetil | 1 ferrão roxo apontando para a direita |
| powder-snow.png | 10×10 | 3 | particula | 3 variações de floco de neve leve |
| psybeam.png | 128×24 | 4 | raio | 1-4 loop: raio em espiral dupla de arco-íris sobre um fio rosa (gira 90°/quadro) |
| psyshock.png | 12×16 | 3 | particula | 3 variações de cristal psíquico em ponta (caem como estilhaços sobre o alvo) |
| psystrike.png | 64×64 | 5 | explosao | 1 clarão violeta; 2 estrela; 3 explosão psíquica grande; 4 anel; 5 dissolve |
| pursuit.png | 48×32 | 3 | silhueta | 1 silhueta escura de olhos vermelhos; 2-3 com rastros atrás (perseguindo) |
| rage-powder.png | 10×10 | 3 | particula | 3 variações de pó vermelho-alaranjado |
| razor-wind.png | 48×48 | 4 | redemoinho | 1-4 loop: redemoinho de lâminas de vento girando (carga no 1º turno) |
| roar.png | 56×56 | 3 | onda | 1-3 ondas grossas com linhas de vento empurrando para a direita |
| rock-wrecker.png | 48×48 | 1 | projetil | (recolorível) 1 rocha enorme rachada (o motor lança e gira) |
| rolling-kick.png | 48×48 | 4 | rastro | 1-4 loop: arco de chute giratório (o pé base gira junto) |
| round.png | 48×48 | 4 | notas | 1-4 loop: cinco notas coloridas girando em roda |
| screech.png | 48×48 | 3 | onda | 1-3 ondas estridentes serrilhadas (branco com borda vermelha) |
| sheer-cold.png | 48×56 | 4 | bloco | 1 gelo começa no chão; 2 sobe; 3 bloco de gelo cobre o alvo; 4 brilho (congelamento total) |
| signal-beam.png | 128×16 | 4 | raio | 1-4 loop: fila de luzes coloridas piscando e trocando de cor |
| sky-uppercut.png | 32×48 | 3 | rastro | 1-3 rastro de gancho em arco de baixo para cima (cresce) |
| slash.png | 48×48 | 4 | corte | 1-3 três riscos de garra em diagonal crescendo; 4 afinando |
| sleep-talk.png | 40×32 | 3 | balao | 1-3 balão de fala com reticências enchendo e um 'z' (falando dormindo) |
| sludge--projetil.png | 20×20 | 2 | projetil | 1-2 loop: bola de gosma roxa pulsando |
| sludge--respingo.png | 32×32 | 4 | impacto | 1 gosma bate; 2 espalha; 3 respingos roxos; 4 some |
| sludge-bomb--bomba.png | 24×24 | 1 | projetil | 1 bomba de lodo roxa com pavio aceso |
| sludge-bomb--explosao.png | 48×48 | 5 | explosao | 1 clarão; 2 estrela roxa; 3 explosão de lodo; 4 anel; 5 dissolve |
| snarl.png | 48×48 | 3 | onda | 1-3 ondas escuras com dentes brancos nas bordas |
| snore.png | 40×32 | 3 | onda | 1-3 'z' subindo (1 a 3) e uma onda de ronco que cresce |
| soco-base--impacto.png | 40×40 | 3 | impacto | (recolorível) 1 estrela pequena; 2 estrela cheia; 3 afinando |
| soco-base--punho.png | 28×24 | 1 | punho | (recolorível) base dos socos: 1 punho fechado de lado, nós dos dedos para a direita |
| solar-beam--carga.png | 32×32 | 4 | carga | 1 ponto de luz; 2-3 o sol cresce juntando luz; 4 sol cheio com raios (carregado) |
| solar-beam--raio.png | 128×32 | 3 | raio | 1-3 loop: raio grosso amarelo-branco ondulando (o motor estica entre usuário e alvo) |
| spike-cannon.png | 20×10 | 1 | projetil | 1 espinho de pedra (o motor dispara em rajada) |
| spore.png | 14×14 | 3 | particula | 3 variações de esporo de cogumelo, maiores, com pintinhas |
| stored-power--esfera.png | 14×14 | 1 | particula | 1 esfera de energia rosa (uma por bônus de atributo; o motor junta no usuário e dispara) |
| storm-throw.png | 48×48 | 4 | redemoinho | 1-4 loop: redemoinho de vento cinza-azulado (o arremesso sai dele) |
| stun-spore.png | 10×10 | 3 | particula | 3 variações de pó amarelo (com pontinho de faísca) |
| submission.png | 48×48 | 4 | rolagem | 1-4 loop: os dois rolando juntos: arcos de movimento girando, estrela e poeira |
| super-fang--boca.png | 48×48 | 4 | boca | (recolorível) 1-4 mordida com presas longas |
| super-fang--rachadura.png | 40×40 | 3 | rachadura | 1 rachadura começa no ponto da mordida; 2 abre; 3 rachadura grande (o HP pela metade) |
| supersonic.png | 48×48 | 3 | onda | 1-3 ondas sonoras finas em zigue-zague, branco-roxas, saindo para a direita |
| take-down.png | 48×24 | 4 | poeira | 1-4 nuvem de poeira crescendo atrás da investida (a última mais rala) |
| thunder-fang--raio.png | 24×32 | 3 | raio | 1-3 raios curtos piscando (cada quadro um desenho) |
| torment.png | 40×32 | 3 | icone | 1 chifrinhos de diabo; 2 com uma marca de raiva; 3 duas marcas de raiva |
| twineedle.png | 28×14 | 1 | projetil | 1 duas agulhas verdes paralelas |
| u-turn.png | 64×48 | 4 | rastro | 1-4 rastro verde-inseto em U: vai até o alvo, faz a curva e volta (o usuário troca) |
| uproar.png | 48×48 | 4 | onda | 1-4 loop: ondas e notas em várias cores, desencontradas (caos) |
| vital-throw.png | 48×48 | 3 | impacto | 1-3 linhas de impacto radiais se abrindo (o alvo bate no chão) |
| wild-charge.png | 48×48 | 4 | aura | 1-4 loop: corpo envolto em aura elétrica com raios saindo (cada quadro outro desenho) |
| yawn.png | 32×32 | 3 | icone | 1 boca começa a bocejar; 2 bocejo aberto e uma bolha; 3 bolha cresce (o alvo vai dormir) |
| zen-headbutt.png | 48×48 | 4 | aura | 1-4 loop: aura psíquica azul em arcos na frente da cabeça (vai junto com a investida) |
