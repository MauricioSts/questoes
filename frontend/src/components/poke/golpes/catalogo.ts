// CATÁLOGO VISUAL DOS GOLPES (gerações 1–5, 559 golpes). Uma linha por golpe:
//   Nome | Tipo | ARQUÉTIPO | descrição visual
// A descrição é a fonte criativa do efeito: spec.ts lê forma, cor, movimento, nº de hits,
// status e setas de atributo dela. Mexer aqui muda o desenho do golpe; a lógica de dano
// (lib/poke/motor.ts) não lê este arquivo.
import type { Arquetipo } from "./tipos";

export interface LinhaCatalogo {
  nome: string;
  slug: string;
  tipo: number; // índice de NOME_TIPO / TIPOS_EN
  arquetipo: Arquetipo;
  notas: string;
  geracao: 1 | 2 | 3 | 4 | 5;
}

export const TIPOS_EN = [
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison", "Ground",
  "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy",
];

// Slug da PokéAPI: minúsculas, espaço vira hífen, hífen fica.
export const slugDe = (nome: string) => nome.toLowerCase().replace(/['’.]/g, "").replace(/\s+/g, "-");

// Nomes que a PokéAPI/pokedex.json escreve diferente do catálogo.
export const ALIASES: Record<string, string> = {
  "faint-attack": "feint-attack",
  "vicegrip": "vise-grip",
  "vice-grip": "vise-grip",
  "hi-jump-kick": "high-jump-kick",
  "softboiled": "soft-boiled",
  "selfdestruct": "self-destruct",
  "doubleslap": "double-slap",
  "thundershock": "thunder-shock",
  "thunderpunch": "thunder-punch",
  "sonicboom": "sonic-boom",
  "smellingsalt": "smelling-salts",
  "smelling-salt": "smelling-salts",
  "dynamicpunch": "dynamic-punch",
  "dragonbreath": "dragon-breath",
  "extremespeed": "extreme-speed",
  "ancientpower": "ancient-power",
  "bubblebeam": "bubble-beam",
  "solarbeam": "solar-beam",
  "poisonpowder": "poison-powder",
  "sand-attack": "sand-attack",
  "conversion2": "conversion-2",
  "will-o-wisp": "will-o-wisp",
};

const G1 = `
Absorb | Grass | DRAIN | Filetes de luz verde saem do alvo e fluem até o usuário; folhinhas brilham ao entrarem nele.
Acid | Poison | PROJ | Jato de gotas de líquido roxo-esverdeado que respinga no alvo e chia, com fumaça fina de corrosão.
Acid Armor | Poison | BUFF | Corpo do usuário derrete em gosma roxa translúcida e se recompõe com brilho viscoso; ↑↑ Defense.
Agility | Psychic | BUFF | Imagens residuais rosa-azuladas do usuário deslizam rápido para os lados, linhas de velocidade; ↑↑ Speed.
Amnesia | Psychic | BUFF | Espirais pálidas e pontos de interrogação sobem da cabeça, aura azul suave, olhar vazio; ↑↑ Sp.Def.
Aurora Beam | Ice | BEAM | Feixe multicolorido (arco-íris ártico) com cintilações geladas; cristais de gelo se desprendem no impacto.
Barrage | Normal | MULTI | Várias esferas marrons e brancas lançadas em rajada, quicando no alvo (2–5).
Barrier | Psychic | BUFF | Painéis hexagonais rosados se materializam ao redor do usuário e travam no lugar; ↑↑ Defense.
Bide | Normal | CHARGE | Usuário treme e brilha em vermelho enquanto absorve golpes por 2 turnos; no fim libera onda de choque branca no alvo.
Bind | Normal | TRAP | Faixas/cordas (cauda ou corpo) enrolam o alvo e apertam; anel de aperto pulsa a cada turno.
Bite | Dark | STRIKE | Mandíbula sombria roxo-escura se fecha sobre o alvo; marcas de presas e faíscas escuras.
Blizzard | Ice | AOE | Tempestade de neve intensa varre o campo do alvo com rajadas e cristais; tela fica esbranquiçada.
Body Slam | Normal | STRIKE | Usuário salta e desaba com o corpo inteiro sobre o alvo; onda de impacto e poeira.
Bone Club | Ground | STRIKE | Clava de osso bate no alvo com estalo; fragmentos de pó, o osso ricocheteia de volta.
Bonemerang | Ground | MULTI | Osso lançado gira, atinge o alvo, volta em arco e atinge de novo (2 hits); usuário o recolhe.
Bubble | Water | PROJ | Bolhas pequenas flutuam do usuário ao alvo e estouram em gotículas.
Bubble Beam | Water | BEAM | Jato denso de bolhas em linha reta que estouram em cadeia no alvo.
Clamp | Water | TRAP | Concha gigante de água se fecha sobre o alvo e o prende; fecha e abre em pulsos.
Comet Punch | Normal | MULTI | Série de socos rápidos com rastros brancos em forma de cometa (2–5 impactos).
Confuse Ray | Ghost | STATUS | Raio de luz roxa espectral dispara dos olhos; espirais fantasmas passam a girar na cabeça do alvo (confusão).
Confusion | Psychic | PROJ | Onda psíquica rosada distorce o ar ao redor do alvo (efeito de lente); estrelinhas giram brevemente.
Constrict | Normal | STRIKE | Tentáculos finos enrolam e apertam o alvo rapidamente e o soltam.
Conversion | Normal | SPECIAL | Usuário muda de cor/textura em ciclo; ícones de tipos passam em carrossel e fixam em um.
Counter | Fighting | STRIKE | Usuário absorve o golpe, flash vermelho e contra-ataque instantâneo de punho; sensação de reflexo.
Crabhammer | Water | STRIKE | Garra enorme envolvida em água martela de cima para baixo; splash grande no impacto.
Cut | Normal | STRIKE | Corte diagonal rápido em linha branca cortante, às vezes em "X".
Defense Curl | Normal | BUFF | Usuário se enrola em bola; brilho prateado no casco; ↑ Defense.
Dig | Ground | CHARGE | T1: usuário mergulha no chão levantando terra e some (subsolo); T2: emerge sob o alvo em explosão de terra.
Disable | Normal | DEBUFF | Selo/cadeado cinza-roxo aparece sobre o alvo e sobre o ícone do último golpe dele.
Dizzy Punch | Normal | STRIKE | Soco que faz estrelas e espirais saírem da cabeça do alvo (possível confusão).
Double Kick | Fighting | MULTI | Dois chutes consecutivos, um por perna, com arcos laranjas (2 hits).
Double Slap | Normal | MULTI | Tapas alternados esquerda-direita, rápidos (2–5).
Double Team | Normal | BUFF | Cópias fantasma do usuário se abrem em leque e circundam o original; ↑ Evasion.
Double-Edge | Normal | STRIKE | Investida frontal com rastro branco-amarelo, impacto forte; faísca vermelha de recoil no usuário.
Dragon Rage | Dragon | PROJ | Bola de fogo azul-índigo em forma de dragão lançada do usuário; explode em ondas no alvo.
Dream Eater | Psychic | DRAIN | Alvo dormindo; fumaça/bolhas roxas de sonho saem do alvo e entram no usuário.
Drill Peck | Flying | STRIKE | Usuário gira como broca em direção ao alvo com espiral branca-azulada; perfura.
Earthquake | Ground | AOE | Tela treme forte, rachaduras se espalham pelo chão, rochas saltam; atinge todos em campo.
Egg Bomb | Normal | PROJ | Ovo grande arremessado em arco; explode em fumaça branca e fragmentos de casca.
Ember | Fire | PROJ | Pequenas brasas de fogo laranja saem em arco e estalam no alvo.
Explosion | Normal | SACRIFICE | Usuário brilha, infla e explode em esfera branco-alaranjada enorme com onda de choque e fumaça; usuário some.
Fire Blast | Fire | PROJ | Chama em formato de estrela de cinco pontas lançada e que se expande ao atingir; grande e dramática.
Fire Punch | Fire | STRIKE | Punho em chamas desfere soco; explosão de brasas e marca de queimadura.
Fire Spin | Fire | TRAP | Redemoinho de fogo em espiral circunda o alvo e permanece girando, brasas voando.
Fissure | Ground | OHKO | Fenda escura se abre sob o alvo e o engole; tela treme; fecha em poeira.
Flamethrower | Fire | BEAM | Jato contínuo de chamas laranja-amarelas em leque estreito; calor distorce o ar.
Flash | Normal | DEBUFF | Clarão branco enorme que ofusca o alvo; alvo cobre os olhos; ↓ Accuracy.
Fly | Flying | CHARGE | T1: usuário sobe em arco e sai da tela; T2: mergulha na diagonal sobre o alvo com rastro de vento.
Focus Energy | Normal | BUFF | Usuário se contrai; aura laranja-avermelhada comprimida pulsa; olhos brilham (aumenta crit).
Fury Attack | Normal | MULTI | Bicadas/chifradas rápidas e repetidas (2–5), pontinhos de impacto.
Fury Swipes | Normal | MULTI | Arranhões em garras, riscos brancos cruzados sucessivos (2–5).
Glare | Normal | STATUS | Olhos do usuário brilham em amarelo; olhar penetrante trava o alvo com faíscas amarelas (paralisia).
Growl | Normal | DEBUFF | Anéis sonoros saem da boca em direção ao alvo; ↓ Attack.
Growth | Normal | BUFF | Usuário brilha e infla levemente; brotos verdes surgem; ↑ Attack/Sp.Atk.
Guillotine | Normal | OHKO | Pinças gigantes se fecham como lâmina de guilhotina sobre o alvo; corte seco.
Gust | Flying | PROJ | Rajada pequena de vento com folhas e poeira em redemoinho atinge o alvo.
Harden | Normal | BUFF | Corpo fica metálico com reflexo brilhante e flash; ↑ Defense.
Haze | Ice | FIELD | Névoa escura e esfumaçada preenche todo o campo e apaga as setas de stats.
Headbutt | Normal | STRIKE | Usuário projeta a cabeça contra o alvo; impacto com estrelas.
High Jump Kick | Fighting | STRIKE | Salto altíssimo e joelhada/chute descendente; se errar, o usuário se machuca ao cair.
Horn Attack | Normal | STRIKE | Investida com chifre brilhante que perfura o alvo.
Horn Drill | Normal | OHKO | Chifre gira como broca gigante e perfura o alvo; espiral branca; efeito letal.
Hydro Pump | Water | BEAM | Jato maciço de água azul sob pressão, grosso, com espuma e splash enorme.
Hyper Beam | Normal | BEAM | Carga laranja-branca na boca e feixe gigante; depois o usuário fica exausto (recarga).
Hyper Fang | Normal | STRIKE | Dentes grandes brilhantes mordem com estalo; marcas de dentes.
Hypnosis | Psychic | STATUS | Anéis hipnóticos concêntricos ondulam no alvo, pálpebras pesadas, "Z" sobem (sono).
Ice Beam | Ice | BEAM | Feixe fino azul-claro que congela o ponto atingido; cristais e possível bloco de gelo.
Ice Punch | Ice | STRIKE | Punho congelado com estilhaços de gelo e geada no impacto.
Jump Kick | Fighting | STRIKE | Salto e chute voador; se errar, tombo (versão menos intensa que High Jump Kick).
Karate Chop | Fighting | STRIKE | Golpe lateral de mão rápido; corte branco seco e estalo.
Kinesis | Psychic | DEBUFF | Colher psíquica balança em ondas diante do alvo, que fica ofuscado; ↓ Accuracy.
Leech Life | Bug | DRAIN | Mordida sugadora; fios vermelho-esverdeados viajam do alvo ao usuário.
Leech Seed | Grass | STATUS | Semente verde lançada gruda no alvo e brota vinhas que sugam energia a cada turno (persistente).
Leer | Normal | DEBUFF | Olhar ameaçador, olhos vermelhos e linhas de pressão; ↓ Defense.
Lick | Ghost | STRIKE | Língua longa roxa lambe o alvo deixando gosma fantasma e faíscas de paralisia.
Light Screen | Psychic | FIELD | Parede de luz amarelada/rosada translúcida ergue-se do lado do usuário (persistente 5 turnos).
Lovely Kiss | Normal | STATUS | Usuário faz bico; beijo/coração rosa viaja até o alvo e o faz dormir.
Low Kick | Fighting | STRIKE | Rasteira baixa que balança o alvo; impacto mais forte quanto mais pesado o alvo.
Meditate | Psychic | BUFF | Usuário flutua de pernas cruzadas, aura vermelha e anéis de foco; ↑ Attack.
Mega Drain | Grass | DRAIN | Parecido com Absorb, mas maior; feixes verde-brilhantes mais intensos.
Mega Kick | Normal | STRIKE | Chute enorme com perna brilhante e estrela de impacto grande.
Mega Punch | Normal | STRIKE | Soco gigante com punho amplificado e anel de choque.
Metronome | Normal | SPECIAL | Usuário balança o dedo (metrônomo); ícones de golpes passam em roleta rápida e executa outro golpe aleatório.
Mimic | Normal | SPECIAL | Usuário vira sombra espelhada cinza do golpe do alvo e copia brevemente a animação.
Minimize | Normal | BUFF | Usuário encolhe rapidamente (escala ~0,3) com brilhos; ↑↑ Evasion.
Mirror Move | Flying | SPECIAL | Espelho prateado e penas giram; usuário reflete o último golpe do alvo (replay).
Mist | Ice | FIELD | Névoa branco-azulada envolve o time do usuário e persiste.
Night Shade | Ghost | PROJ | Olhos viram buracos escuros e projetam visão/ilusão sombria sobre o alvo.
Pay Day | Normal | MULTI | Chuva de moedas douradas sobre o alvo; cada moeda brilha ao quicar.
Peck | Flying | STRIKE | Bicada rápida, ponto branco de impacto.
Petal Dance | Grass | AOE | Tornado de pétalas rosa-brancas gira ao redor do usuário e do alvo por 2–3 turnos; usuário dança.
Pin Missile | Bug | MULTI | Agulhas brancas disparadas em rajada que se cravam no alvo (2–5).
Poison Gas | Poison | STATUS | Nuvem roxo-esverdeada sopra e envolve o alvo, bolhas venenosas.
Poison Powder | Poison | STATUS | Pó roxo espalhado em nuvem pelo vento sobre o alvo.
Poison Sting | Poison | PROJ | Ferrão roxo brilhante disparado rápido; gota de veneno no impacto.
Pound | Normal | STRIKE | Pancada com pata ou cauda; impacto simples com estrelinha branca.
Psybeam | Psychic | BEAM | Feixe ondulante multicolorido (rosa/azul/amarelo) em zigue-zague psíquico.
Psychic | Psychic | AOE | Aura rosa, olhos brilhando, espaço distorcido em torno do alvo e onda psíquica forte.
Psywave | Psychic | PROJ | Ondas concêntricas psíquicas arco-íris passam pelo alvo.
Quick Attack | Normal | STRIKE | Dash velocíssimo com rastro branco e linhas de velocidade; atinge e volta.
Rage | Normal | STRIKE | Usuário vermelho, veias saltadas; ataque furioso com aura vermelha crescente persistente.
Razor Leaf | Grass | MULTI | Várias folhas giratórias afiadas voam em leque e cortam o alvo.
Razor Wind | Normal | CHARGE | T1: usuário gira criando redemoinho; T2: lâminas de vento cortam o alvo.
Recover | Normal | HEAL | Luz verde-branca flui para o usuário; brilho curativo; barra de vida sobe.
Reflect | Psychic | FIELD | Parede translúcida azul-rosada persistente do lado do usuário (físico).
Rest | Psychic | HEAL | Usuário dorme dentro de bolha de cura, "Z", corpo brilha e acorda curado.
Roar | Normal | DEBUFF | Rugido com ondas sonoras; alvo se encolhe, tela vibra e o alvo é forçado a sair.
Rock Slide | Rock | AOE | Chuva de pedras despenca sobre o campo do alvo; poeira.
Rock Throw | Rock | PROJ | Pedra arremessada em arco que se quebra no impacto.
Rolling Kick | Fighting | STRIKE | Chute giratório 360º com perna brilhante.
Sand Attack | Ground | DEBUFF | Usuário lança punhado de areia no rosto do alvo; nuvem marrom-amarelada; ↓ Accuracy.
Scratch | Normal | STRIKE | Três riscos de garra brancos rápidos.
Screech | Normal | DEBUFF | Ondas sonoras agudas em zigue-zague; alvo tampa os ouvidos; ↓↓ Defense.
Seismic Toss | Fighting | STRIKE | Usuário agarra o alvo, gira em órbita e o arremessa ao chão em arco.
Self-Destruct | Normal | SACRIFICE | Usuário infla e explode em bola de fogo branca; some; menor que Explosion.
Sharpen | Normal | BUFF | Brilho cortante, reflexos de lâmina; ↑ Attack.
Sing | Normal | STATUS | Notas musicais coloridas flutuam até o alvo; olhos pesam; "Z" (sono).
Skull Bash | Normal | CHARGE | T1: usuário encolhe a cabeça, aura blindada (↑ Defense); T2: cabeçada em investida.
Sky Attack | Flying | CHARGE | T1: usuário brilha em luz branco-amarela com penas; T2: voa como flecha de luz e atinge.
Slam | Normal | STRIKE | Cauda/corpo bate de lado em arco amplo; impacto.
Slash | Normal | STRIKE | Corte diagonal de garra/lâmina com brilho branco.
Sleep Powder | Grass | STATUS | Pó verde-azulado cai como chuva fina; alvo boceja e dorme.
Sludge | Poison | PROJ | Bolas de lodo roxo viscoso arremessadas que fazem splat.
Smog | Poison | PROJ | Nuvem espessa de fumaça roxa sai em jato curto.
Smokescreen | Normal | DEBUFF | Nuvem de fumaça escura cobre o alvo; ↓ Accuracy.
Soft-Boiled | Normal | HEAL | Ovo gigante brilhante rosa/branco; cura o usuário.
Solar Beam | Grass | CHARGE | T1: usuário absorve luz solar em esfera amarelo-esverdeada (tela clareia); T2: feixe imenso.
Sonic Boom | Normal | PROJ | Onda de choque branca em meia-lua voa até o alvo.
Spike Cannon | Normal | MULTI | Espinhos brancos disparados em rajada (2–5).
Splash | Normal | SPECIAL | Usuário pula sem fazer nada; respingos inúteis e fumaça cômica (efeito nulo de propósito).
Spore | Grass | STATUS | Nuvem grande de esporos amarelados cai; alvo dorme.
Stomp | Normal | STRIKE | Pé enorme pisa de cima e esmaga; onda de choque.
Strength | Normal | STRIKE | Usuário empurra/chuta com força bruta; poeira e rachadura.
String Shot | Bug | DEBUFF | Fios de seda brancos disparados enrolam o alvo; ↓↓ Speed.
Struggle | Normal | STRIKE | Investida desesperada e desajeitada; impacto fraco e dano de recoil no usuário.
Stun Spore | Grass | STATUS | Pó amarelo faísca sobre o alvo, que treme e fica rígido (paralisia).
Submission | Fighting | STRIKE | Usuário agarra e gira, projetando o alvo ao chão; recoil.
Substitute | Normal | FIELD | Usuário solta um boneco/sósia de pelúcia ao lado e recua; o boneco absorve golpes.
Super Fang | Normal | STRIKE | Dentes gigantes brilhantes mordem; a barra do alvo cai pela metade.
Supersonic | Normal | STATUS | Ondas sonoras ondulantes/anéis de som; alvo tonto com espirais (confusão).
Surf | Water | AOE | Onda gigante azul varre o campo e atinge todos.
Swift | Normal | MULTI | Estrelas amarelas disparadas em leque que perseguem o alvo (homing).
Swords Dance | Normal | BUFF | Usuário dança com espadas translúcidas girando; ↑↑ Attack.
Tackle | Normal | STRIKE | Investida simples com impacto branco.
Tail Whip | Normal | DEBUFF | Usuário balança a cauda de forma provocativa; alvo desanimado; ↓ Defense.
Take Down | Normal | STRIKE | Investida bruta e pesada; recoil.
Teleport | Psychic | SPECIAL | Usuário se desfaz em partículas e ondulação psíquica e some da cena.
Thrash | Normal | STRIKE | Golpes caóticos por 2–3 turnos; no fim o usuário fica confuso (estrelas).
Thunder | Electric | PROJ | Raio colossal cai do céu sobre o alvo; tela escurece e pisca; trovão.
Thunder Punch | Electric | STRIKE | Punho carregado de eletricidade; soco com arcos amarelos.
Thunder Shock | Electric | PROJ | Faíscas amarelas saltam do usuário em zigue-zague até o alvo.
Thunder Wave | Electric | STATUS | Onda de pequenos arcos elétricos amarelos que prende o alvo (paralisia).
Thunderbolt | Electric | BEAM | Raio amarelo contínuo em zigue-zague; tela pisca.
Toxic | Poison | STATUS | Líquido/nuvem roxo-escura envolve o alvo com bolhas grandes e caveira (veneno grave).
Transform | Normal | SPECIAL | Usuário vira massa roxo-branca amorfa e remodela para a forma do alvo.
Tri Attack | Normal | PROJ | Três esferas (vermelha, azul, amarela) convergem num triângulo e atingem juntas.
Twineedle | Bug | MULTI | Dois ferrões brilhantes perfuram o alvo (2 hits).
Vine Whip | Grass | STRIKE | Vinhas verdes chicoteiam em arco duplo.
Vise Grip | Normal | STRIKE | Pinças/garras apertam o alvo como um torno.
Water Gun | Water | PROJ | Jato fino de água azul; splash no impacto.
Waterfall | Water | STRIKE | Usuário sobe numa cachoeira reversa e golpeia com cascata de água.
Whirlwind | Normal | DEBUFF | Redemoinho de vento forte varre o alvo para fora do campo.
Wing Attack | Flying | STRIKE | Asas se abrem com brilho branco e batem no alvo.
Withdraw | Water | BUFF | Usuário se recolhe na carapaça com brilho azul; ↑ Defense.
Wrap | Normal | TRAP | Faixa/corpo enrola o alvo e o mantém preso por turnos.
`;

const G2 = `
Aeroblast | Flying | BEAM | Rajada de vento perfurante em forma de lança giratória azul-branca, com grande onda aérea; alto crit.
Ancient Power | Rock | PROJ | Pedras flutuam em volta do usuário brilhando em dourado, são lançadas ao alvo; chance de ↑ em todos os stats (aura).
Attract | Normal | STATUS | Corações rosa saem do usuário e envolvem o alvo, que passa a ter corações flutuando (paixão).
Baton Pass | Normal | SPECIAL | Usuário passa um bastão luminoso em arco para o próximo Pokémon que entra; stats brilham.
Beat Up | Dark | MULTI | Silhuetas dos aliados surgem e golpeiam o alvo em sequência (um hit por aliado).
Belly Drum | Normal | BUFF | Usuário bate na barriga como tambor com ondas rítmicas; perde HP; aura vermelha enorme (Attack ao máximo).
Bone Rush | Ground | MULTI | Osso girando bate várias vezes em rajada (2–5), com fragmentos.
Charm | Fairy | DEBUFF | Usuário pisca fofo e solta corações e brilhos; alvo derrete (olhos de coração); ↓↓ Attack.
Conversion 2 | Normal | SPECIAL | Usuário muda de cor para resistir ao último golpe do alvo; símbolos de tipos em carrossel.
Cotton Spore | Grass | DEBUFF | Algodão branco flutua pelo campo e prende ao alvo; ↓↓ Speed.
Cross Chop | Fighting | STRIKE | Dois braços cruzados em "X" brilhando; golpe em cruz com corte duplo; alto crit.
Crunch | Dark | STRIKE | Mandíbulas sombrias com dentes brilhantes mordem e trituram o alvo; estilhaços escuros.
Curse | Ghost | STATUS | Fantasma: usuário desenha prego/ boneco vodu, maldição roxa drena o usuário e marca o alvo. Não-fantasma: usuário fica pesado, ↑ Attack/Defense ↓ Speed.
Destiny Bond | Ghost | STATUS | Fio de destino roxo-escuro liga usuário e alvo, olhos fantasmagóricos; marca persistente.
Detect | Fighting | FIELD | Olhos do usuário brilham, escudo curto de energia branca/azul faz o golpe ricochetear.
Dragon Breath | Dragon | BEAM | Sopro de chama azul-roxa em cone com escamas de energia; faíscas de paralisia.
Dynamic Punch | Fighting | STRIKE | Soco cheio de energia laranja explosiva, shockwave e estrelas de confusão no alvo.
Encore | Normal | DEBUFF | Palmas e aplausos; alvo preso a um holofote forçado a repetir o último golpe.
Endure | Normal | FIELD | Usuário se firma com aura laranja escura e segura o golpe com 1 HP.
Extreme Speed | Normal | STRIKE | Dash ultrarrápido com múltiplas imagens residuais e rastros brancos; golpe quase invisível.
False Swipe | Normal | STRIKE | Corte leve e controlado que para antes de acabar com o alvo; faíscas pequenas e "abafadas".
Feint Attack | Dark | STRIKE | Usuário se esconde em sombra, aparece do outro lado e golpeia de surpresa.
Flail | Normal | STRIKE | Usuário se debate descontrolado; impactos aleatórios; mais forte quanto menos HP.
Flame Wheel | Fire | STRIKE | Usuário vira roda de fogo rolando em direção ao alvo; atinge com brasas.
Foresight | Normal | DEBUFF | Olhar com mira/retículo luminoso sobre o alvo; revela fantasmas.
Frustration | Normal | STRIKE | Usuário golpeia de má vontade; impacto comum com ar amargurado.
Fury Cutter | Bug | STRIKE | Cortes de lâmina verde que crescem em tamanho a cada uso consecutivo.
Future Sight | Psychic | SPECIAL | Olho/esfera psíquica surge e fica no campo; 2 turnos depois uma explosão psíquica atinge o alvo.
Giga Drain | Grass | DRAIN | Raios verde-brilhantes intensos puxam energia do alvo ao usuário.
Heal Bell | Normal | FIELD | Sino ressoa com ondas de luz dourada; time do usuário brilha e cura status.
Hidden Power | Normal | PROJ | Esfera de energia multicolorida que assume a cor do tipo efetivo, com anéis de poder; lançada ao alvo.
Icy Wind | Ice | AOE | Vento gelado e cortante sopra pelo campo adversário com cristais; ↓ Speed.
Iron Tail | Steel | STRIKE | Cauda metálica brilhante em arco amplo que bate com som de ferro; faíscas.
Lock-On | Normal | BUFF | Retículo vermelho trava no alvo e confirma; próximo golpe é garantido.
Mach Punch | Fighting | STRIKE | Soco ultrarrápido com onda de choque cônica, linhas de velocidade.
Magnitude | Ground | AOE | Tremor de intensidade variável; o número da magnitude aparece (4 a 10) e escala o tremor.
Mean Look | Normal | DEBUFF | Olhar frio com anel/prisão de energia que cerca o alvo, travando saída.
Megahorn | Bug | STRIKE | Chifre gigante verde brilhante perfura o alvo com força enorme.
Metal Claw | Steel | STRIKE | Garras metálicas brilhantes rasgam o alvo; faíscas.
Milk Drink | Normal | HEAL | Usuário bebe leite brilhante; luz branca e rosada flui; cura.
Mind Reader | Normal | BUFF | Olho/símbolo psíquico se fixa no alvo; próximo golpe será certeiro.
Mirror Coat | Psychic | STRIKE | Superfície espelhada envolve o usuário e reflete o golpe especial de volta em dobro.
Moonlight | Fairy | HEAL | Luz da lua desce sobre o usuário; brilho prateado cura; intensidade depende do clima.
Morning Sun | Normal | HEAL | Raios dourados do sol nascente curam o usuário; mais forte no sol.
Mud-Slap | Ground | PROJ | Usuário bate lama no alvo, respingo marrom no rosto; ↓ Accuracy.
Nightmare | Ghost | STATUS | Alvo dormindo recebe nuvem roxa de pesadelo com rostos sombrios; perde HP por turno.
Octazooka | Water | PROJ | Bola de tinta escura lançada por canhão de polvo, explode em tinta preta; ↓ Accuracy.
Outrage | Dragon | STRIKE | Usuário enlouquecido envolto em aura vermelho-dragão, ataca por 2–3 turnos e fica confuso depois.
Pain Split | Normal | SPECIAL | Fios de energia ligam usuário e alvo, igualando barras de vida em oscilação.
Perish Song | Normal | FIELD | Notas musicais sombrias em onda circular por todo o campo; contagem 3-2-1 sobre cada Pokémon.
Powder Snow | Ice | PROJ | Rajada de neve fina e brilhante sobre o alvo; geada e cristais.
Present | Normal | PROJ | Caixa de presente com laço lançada ao alvo; explode ou cura (flor de luz ou explosão).
Protect | Normal | FIELD | Escudo hexagonal verde/branco brilhante se forma na frente do usuário e repele o golpe.
Psych Up | Normal | SPECIAL | Usuário copia setas de stats do alvo em onda psíquica.
Pursuit | Dark | STRIKE | Usuário surge em sombra e agarra o alvo que está saindo; golpe pelas costas.
Rain Dance | Water | FIELD | Nuvens escuras surgem e chuva cai por 5 turnos; usuário dança.
Rapid Spin | Normal | STRIKE | Usuário gira como pião e atinge o alvo; limpa armadilhas e prisões (poeira sai).
Return | Normal | STRIKE | Investida cheia de afeto/energia com corações pequenos no impacto.
Reversal | Fighting | STRIKE | Reação desesperada com aura de contra-ataque; mais forte quanto menos HP.
Rock Smash | Fighting | STRIKE | Punho quebra pedra: rocha surge e é destruída junto com o golpe; ↓ Defense.
Rollout | Rock | STRIKE | Usuário rola como bola, ganhando velocidade e tamanho a cada hit consecutivo.
Sacred Fire | Fire | PROJ | Chama sagrada dourada-alaranjada em forma de ave de fogo ou pilar flamejante.
Safeguard | Normal | FIELD | Domo/cúpula branco-azulada translúcida protege o time do usuário.
Sandstorm | Rock | FIELD | Tempestade de areia cobre todo o campo por 5 turnos; tom marrom-amarelado.
Scary Face | Normal | DEBUFF | Rosto do usuário vira máscara aterrorizante com olhos vermelhos; alvo congela; ↓↓ Speed.
Shadow Ball | Ghost | PROJ | Esfera de sombras roxa-escura com névoa fantasma é lançada e explode.
Sketch | Normal | SPECIAL | Usuário rabisca o último golpe do alvo num caderno e fixa o desenho.
Sleep Talk | Normal | SPECIAL | Usuário dorme, "Z", e murmura enquanto executa outro golpe adormecido.
Sludge Bomb | Poison | PROJ | Bomba de lodo roxo gigante lançada em arco; explode com respingos tóxicos.
Snore | Normal | AOE | Ronco forte com ondas sonoras e "Z" grandes que atingem o alvo; usuário dormindo.
Spark | Electric | STRIKE | Usuário vira bola de faíscas elétricas e se choca contra o alvo.
Spider Web | Bug | TRAP | Teia gigante lançada cobre o alvo prendendo-o ao chão.
Spikes | Ground | FIELD | Espinhos de metal/terra espalhados no chão do lado do alvo (persistente).
Spite | Ghost | DEBUFF | Sombra do usuário murmura maldição; ícone do golpe do alvo sangra PP.
Steel Wing | Steel | STRIKE | Asas de aço brilhantes cortam o alvo em arco; faíscas de metal.
Sunny Day | Fire | FIELD | Sol forte surge no céu iluminando o campo por 5 turnos; tom quente.
Swagger | Normal | STATUS | Usuário se exibe arrogante provocando o alvo, que fica furioso e confuso; ↑↑ Attack do alvo.
Sweet Kiss | Fairy | STATUS | Beijo/coração rosa sobe ao alvo; alvo confuso com corações girando.
Sweet Scent | Normal | DEBUFF | Perfume rosa-doce em névoa perfumada que atrai o alvo; ↓ Evasion.
Synthesis | Grass | HEAL | Luz solar e folhas verdes se concentram no usuário; cura por fotossíntese.
Thief | Dark | STRIKE | Usuário aparece, golpeia e foge com item em mãos; brilho do item roubado.
Triple Kick | Fighting | MULTI | Três chutes crescentes em intensidade, cada um mais forte (3 hits).
Twister | Dragon | AOE | Dois a três tornados de energia azul-dragão giram pelo campo e atingem o alvo.
Vital Throw | Fighting | STRIKE | Usuário espera, agarra o alvo e arremessa com técnica precisa.
Whirlpool | Water | TRAP | Redemoinho de água gigante gira ao redor do alvo e persiste por turnos.
Zap Cannon | Electric | PROJ | Esfera elétrica enorme e lenta que dispara como canhão; explode em faíscas e deixa o alvo paralisado.
`;

const G3 = `
Aerial Ace | Flying | STRIKE | Usuário some em borrão de vento e corta o alvo com rastro de lâmina de ar; golpe certeiro e elegante.
Air Cutter | Flying | PROJ | Lâminas de ar em formato de foice (1–2) voam em arco e cortam o alvo; alto crit.
Arm Thrust | Fighting | MULTI | Série de empurrões/socos de palma rápidos (2–5).
Aromatherapy | Grass | FIELD | Perfume de ervas e flores em ondas verdes cura o time do usuário; pétalas flutuam.
Assist | Normal | SPECIAL | Silhuetas de aliados surgem passando golpes; usuário executa um aleatório de um aliado.
Astonish | Ghost | STRIKE | Usuário surge com susto: rosto fantasmagórico grande diante do alvo; alvo pula e treme (flinch).
Blast Burn | Fire | AOE | Explosão colossal de fogo laranja-vermelho sobe do chão sob o alvo; usuário cansa (recarga).
Blaze Kick | Fire | STRIKE | Chute com perna em chamas, arco flamejante e brasas; alto crit.
Block | Normal | DEBUFF | Usuário bloqueia a saída com corpo/barreira; muro de energia cerca o alvo.
Bounce | Flying | CHARGE | T1: usuário quica alto e some; T2: cai pesadamente sobre o alvo com estrelas e faíscas de paralisia.
Brick Break | Fighting | STRIKE | Mão em arco quebrando tijolos/vidro; despedaça barreiras (Reflect/Light Screen) se existirem.
Bulk Up | Fighting | BUFF | Músculos inflam; poses de fisiculturista, aura vermelho-laranja; ↑ Attack/Defense.
Bullet Seed | Grass | MULTI | Sementes verdes disparadas em rajada de metralhadora (2–5).
Calm Mind | Psychic | BUFF | Anéis de ondas calmas e luz roxa em volta do usuário; olhos fechados; ↑ Sp.Atk/Sp.Def.
Camouflage | Normal | SPECIAL | Usuário muda a cor/textura mesclando com o ambiente atual.
Charge | Electric | BUFF | Usuário acumula eletricidade em arcos amarelos ao redor do corpo; ↑ Sp.Def; próximo elétrico mais forte.
Cosmic Power | Psychic | BUFF | Luz cósmica de estrelas e aura azul-escura envolvem o usuário; ↑ Defense/Sp.Def.
Covet | Normal | STRIKE | Usuário faz olhar fofo e agarra o item do alvo; coração e brilho do item roubado.
Crush Claw | Normal | STRIKE | Garras enormes brilhantes esmagam e rasgam; marcas profundas.
Dive | Water | CHARGE | T1: usuário mergulha em jato de água e some; T2: emerge sob o alvo com explosão de água.
Doom Desire | Steel | SPECIAL | Esfera/feixe de aço dourado de condenação surge no campo; 2 turnos depois raios de luz metálica atingem o alvo.
Dragon Claw | Dragon | STRIKE | Garras de energia roxo-azulada em forma de dragão rasgam o alvo.
Dragon Dance | Dragon | BUFF | Usuário dança ritual com aura dragão sinuosa; ↑ Attack/Speed.
Endeavor | Normal | STRIKE | Usuário golpeia com raiva pedindo o mesmo nível de HP; barras de vida se nivelam.
Eruption | Fire | AOE | Vulcão explode com lava e rochas voando sobre o campo do alvo; maior com HP alto.
Extrasensory | Psychic | PROJ | Ondas psíquicas coloridas ondulam o ar em volta do alvo; olhos do usuário brilham.
Facade | Normal | STRIKE | Usuário finge doença e ataca bravo; dano em dobro se tem status (aura de status).
Fake Out | Normal | STRIKE | Palmas na cara do alvo com flash; efeito surpresa com estrelas; só no primeiro turno.
Fake Tears | Dark | DEBUFF | Usuário chora com gotas exageradas; alvo se sente culpado; ↓↓ Sp.Def.
Feather Dance | Flying | DEBUFF | Penas brancas rodopiam em dança ao redor do alvo; ↓↓ Attack.
Flatter | Dark | STATUS | Usuário elogia o alvo com brilhos e flores; alvo fica convencido e confuso; ↑ Sp.Atk do alvo.
Focus Punch | Fighting | CHARGE | T1: usuário concentra aura vermelha; se atingido, perde concentração; T2: soco violento com explosão.
Follow Me | Normal | FIELD | Usuário acena chamando atenção com holofote/brilho; todos olham para ele.
Frenzy Plant | Grass | AOE | Raízes gigantes brotam do chão e esmagam o alvo; usuário cansa (recarga).
Grass Whistle | Grass | STATUS | Folha assoviada com notas verdes; alvo adormece.
Grudge | Ghost | STATUS | Aura vermelha-sombria de rancor sobre o usuário; se cair, o golpe do alvo é selado.
Hail | Ice | FIELD | Granizo cai do céu cinza por 5 turnos; cristais e pedras de gelo.
Heat Wave | Fire | AOE | Ondas de calor distorcem o ar e varrem o campo; brasas, tela quente alaranjada.
Helping Hand | Normal | BUFF | Mão luminosa dá impulso ao aliado; brilho dourado no aliado.
Howl | Normal | BUFF | Usuário uiva para a lua; ondas sonoras e brilho vermelho; ↑ Attack dos aliados.
Hydro Cannon | Water | BEAM | Canhão gigante de água pressurizada; jato massivo; usuário cansa (recarga).
Hyper Voice | Normal | AOE | Voz altíssima com anéis sonoros largos que ondulam pelo campo.
Ice Ball | Ice | STRIKE | Usuário vira bola de gelo e rola pelo alvo, cada hit maior e mais rápido; estilhaços.
Icicle Spear | Ice | MULTI | Lanças de gelo afiadas disparadas em sequência (2–5).
Imprison | Psychic | DEBUFF | Selo de luz psíquica prende os golpes que o usuário também conhece; cadeado e grades.
Ingrain | Grass | HEAL | Raízes brotam do usuário no chão e o ancoram; brilho verde de cura contínuo.
Iron Defense | Steel | BUFF | Corpo cobre-se de aço brilhante com reflexos; ↑↑ Defense.
Knock Off | Dark | STRIKE | Golpe derruba o item do alvo, que quica no chão; item some.
Leaf Blade | Grass | STRIKE | Folhas afiadas em formato de espada verde-brilhante cortam em X; alto crit.
Luster Purge | Psychic | PROJ | Esfera de luz branca-cristalina brilhante explode em raios radiantes.
Magic Coat | Psychic | FIELD | Manto mágico translúcido e brilhante envolve o usuário e reflete golpes de status.
Magical Leaf | Grass | MULTI | Folhas mágicas multicoloridas perseguem o alvo (homing) e nunca erram.
Memento | Dark | SACRIFICE | Usuário se despede com aura sombria, entrega a vida em onda escura ao alvo; ↓↓ Atk/Sp.Atk; usuário desaparece.
Metal Sound | Steel | DEBUFF | Som metálico agudo em ondas pontiagudas arranha o alvo; ↓↓ Sp.Def.
Meteor Mash | Steel | STRIKE | Punho de aço vira meteoro metálico que desce rasgando o céu e esmaga.
Mist Ball | Psychic | PROJ | Esfera de névoa rosada explode em nuvem; ↓ Sp.Atk.
Mud Shot | Ground | PROJ | Jato de lama marrom grudento atinge o alvo e reduz sua velocidade.
Mud Sport | Ground | FIELD | Usuário joga lama em volta do campo formando camada que enfraquece elétricos.
Muddy Water | Water | AOE | Onda de água suja marrom varre o campo; ↓ Accuracy.
Nature Power | Normal | SPECIAL | Usuário invoca o poder da natureza do terreno; executa um golpe baseado no local.
Needle Arm | Grass | STRIKE | Braços cobertos de espinhos acertam o alvo; espinhos se cravam.
Odor Sleuth | Normal | DEBUFF | Nariz do usuário fareja ondas de aroma; revela alvo escondido.
Overheat | Fire | BEAM | Calor máximo: fogo branco-alaranjado explosivo em onda ampla; usuário esgota Sp.Atk.
Poison Fang | Poison | STRIKE | Presas roxas brilhantes mordem o alvo e injetam veneno em gotas.
Poison Tail | Poison | STRIKE | Cauda venenosa roxa e brilhante bate com arco rápido; alto crit.
Psycho Boost | Psychic | BEAM | Rajada psíquica arco-íris em explosão enorme; usuário esgota Sp.Atk.
Recycle | Normal | SPECIAL | Item reaparece em ciclo de setas verdes de reciclagem na mão do usuário.
Refresh | Normal | HEAL | Luz azul-clara refrescante limpa o usuário; bolhas de status se dissolvem.
Revenge | Fighting | STRIKE | Usuário reage com punho vermelho ardente após levar dano; mais forte se atingido.
Rock Blast | Rock | MULTI | Pedras lançadas em sequência rápida (2–5).
Rock Tomb | Rock | TRAP | Rochas caem e cercam o alvo, prendendo-o; ↓ Speed.
Role Play | Psychic | SPECIAL | Usuário veste uma máscara/imita o alvo e copia sua habilidade em luz azul.
Sand Tomb | Ground | TRAP | Areia se ergue em redemoinho que enterra o alvo parcialmente e persiste.
Secret Power | Normal | STRIKE | Golpe de efeito variável conforme o terreno; símbolo misterioso brilha.
Shadow Punch | Ghost | STRIKE | Mão sombria sai da escuridão e acerta o alvo; certeiro.
Sheer Cold | Ice | OHKO | Frio absoluto cobre a tela de branco-azul e congela o alvo em bloco gigante; fim seco.
Shock Wave | Electric | PROJ | Arcos elétricos serpenteiam até o alvo (homing, certeiros).
Signal Beam | Bug | BEAM | Feixe luminoso colorido (vermelho-verde-azul) pisca como semáforo; confusão.
Silver Wind | Bug | AOE | Rajada de vento prateado com escamas brilhantes varre o alvo; chance de ↑ em todos os stats.
Skill Swap | Psychic | SPECIAL | Esferas de habilidade trocam de lugar entre usuário e alvo em arcos luminosos.
Sky Uppercut | Fighting | STRIKE | Soco ascendente vertical que lança o alvo ao ar; acerta até quem está voando.
Slack Off | Normal | HEAL | Usuário relaxa deitado com "Z" e brilho verde; cura.
Smelling Salts | Normal | STRIKE | Frasco de sais é esfregado e tapa de energia acorda alvo paralisado em faíscas amarelas.
Snatch | Dark | SPECIAL | Mão sombria rouba o efeito do próximo golpe do alvo.
Spit Up | Normal | PROJ | Usuário cospe a energia estocada em jato proporcional ao Stockpile.
Stockpile | Normal | BUFF | Usuário engole energia em esferas; contador de níveis (1–3) brilha; ↑ Defense/Sp.Def.
Superpower | Fighting | STRIKE | Usuário libera poder bruto em soco/golpe gigante vermelho; depois enfraquece (↓ Attack/Defense).
Swallow | Normal | HEAL | Usuário engole a energia estocada e brilha de cura conforme o nível.
Tail Glow | Bug | BUFF | Ponta da cauda brilha intensamente em luz branco-azulada; ↑↑↑ Sp.Atk.
Taunt | Dark | DEBUFF | Usuário provoca com gestos; marca vermelha de raiva sobre o alvo.
Teeter Dance | Normal | STATUS | Usuário cambaleia dançando; todos em campo ficam confusos com estrelas.
Tickle | Normal | DEBUFF | Mãos fazem cócegas no alvo, que ri; ↓ Attack/Defense.
Torment | Dark | DEBUFF | Usuário atormenta o alvo com gestos maliciosos; nuvem negra sobre ele.
Trick | Psychic | SPECIAL | Luz e fumaça trocam os itens entre usuário e alvo.
Uproar | Normal | AOE | Usuário berra com ondas sonoras contínuas por 3 turnos; ninguém dorme.
Volt Tackle | Electric | STRIKE | Usuário vira bola de eletricidade e arrasa o alvo com faíscas; recoil elétrico.
Water Pulse | Water | PROJ | Anel de água pulsante lançado ao alvo; confusão possível.
Water Sport | Water | FIELD | Usuário joga água ao redor formando camada que enfraquece fogo.
Water Spout | Water | AOE | Jato enorme de água sobe do usuário e cai em chuva sobre o alvo; mais forte com HP alto.
Weather Ball | Normal | PROJ | Esfera que muda de tipo/cor conforme o clima (fogo, água, gelo, pedra ou neutra).
Will-O-Wisp | Fire | STATUS | Chamas azul-fantasmagóricas flutuam e envolvem o alvo, queimando-o.
Wish | Normal | HEAL | Estrela cadente em desejo desce no turno seguinte e cura quem estiver em campo.
Yawn | Normal | STATUS | Usuário boceja grande; bolha de sono envolve o alvo e estoura no turno seguinte.
`;

const G4 = `
Acupressure | Normal | BUFF | Usuário pressiona pontos do corpo; luz branca percorre e ↑↑ de um stat aleatório.
Air Slash | Flying | PROJ | Lâmina de ar em crescente azul-branca gigante voa e corta o alvo.
Aqua Jet | Water | STRIKE | Usuário vira jato de água em velocidade e perfura o alvo; rastro de bolhas.
Aqua Ring | Water | HEAL | Anéis de água flutuam ao redor do usuário curando continuamente (persistente).
Aqua Tail | Water | STRIKE | Cauda envolta em onda gigante de água bate como chicote; splash.
Assurance | Dark | STRIKE | Golpe sombrio que ganha força se o alvo já sofreu dano; marca de dano no alvo.
Attack Order | Bug | MULTI | Enxame de abelhas/insetos obedece comando e ataca em formação.
Aura Sphere | Fighting | PROJ | Esfera azul de aura concentrada, lançada com palma; persegue o alvo (certeira).
Avalanche | Ice | AOE | Avalanche de neve e gelo desce sobre o alvo; mais forte se o usuário foi atingido.
Brave Bird | Flying | STRIKE | Usuário vira ave de fogo azul e mergulha com as asas recolhidas; recoil.
Brine | Water | PROJ | Jato de água salgada que arde; mais forte se o alvo tem pouca vida; cristais de sal.
Bug Bite | Bug | STRIKE | Mordida de inseto; mandíbulas verdes pegam a baga do alvo.
Bug Buzz | Bug | AOE | Zumbido ensurdecedor com ondas sonoras verde-amareladas; sprite do alvo vibra.
Bullet Punch | Steel | STRIKE | Soco de aço velocíssimo; rastro metálico, estilhaços.
Captivate | Normal | DEBUFF | Usuário faz gesto sedutor e solta brilhos; alvo hipnotizado; ↓↓ Sp.Atk.
Charge Beam | Electric | BEAM | Feixe elétrico contínuo amarelo que carrega o usuário; ↑ Sp.Atk.
Chatter | Flying | PROJ | Notas musicais coloridas em ondas sonoras confusas atingem o alvo (confusão).
Close Combat | Fighting | MULTI | Saraivada de socos e chutes cegos e rápidos em rajada; usuário fica exposto (↓ Defesas).
Copycat | Normal | SPECIAL | Usuário imita o último golpe usado com cópia translúcida.
Cross Poison | Poison | STRIKE | Corte em X com lâminas roxas venenosas; alto crit.
Crush Grip | Normal | STRIKE | Mão gigante esmaga o alvo em aperto; mais forte com HP alto.
Dark Pulse | Dark | BEAM | Ondas de energia escura roxo-negra pulsantes em forma de anel crescente.
Dark Void | Dark | STATUS | Vácuo escuro engole o campo adversário; alvos adormecem com "Z".
Defend Order | Bug | BUFF | Insetos formam muralha de carapaça verde em volta do usuário; ↑ Defense/Sp.Def.
Defog | Flying | FIELD | Vento forte dissipa neblina, barreiras e armadilhas; ↓ Evasion.
Discharge | Electric | AOE | Raios elétricos saem do usuário em todas as direções e atingem o campo.
Double Hit | Normal | MULTI | Dois golpes rápidos com cauda/corpo (2 hits).
Draco Meteor | Dragon | AOE | Esfera de energia sobe ao céu e explode em meteoros de dragão que despencam sobre o alvo; usuário esgota Sp.Atk.
Dragon Pulse | Dragon | BEAM | Onda de choque em forma de cabeça de dragão azul-roxa dispara em linha.
Dragon Rush | Dragon | STRIKE | Usuário vira dragão de energia e investe com violência; chance de flinch.
Drain Punch | Fighting | DRAIN | Soco que drena energia; luz vermelha-laranja flui do alvo ao usuário.
Earth Power | Ground | AOE | Terra brilha em fissuras laranjas e sobe uma coluna de energia sob o alvo.
Embargo | Dark | DEBUFF | Selo/algemas escuras prendem a bolsa/itens do alvo.
Energy Ball | Grass | PROJ | Esfera verde-brilhante de energia natural lançada, explode em folhas.
Feint | Normal | STRIKE | Usuário finge e acerta rápido, quebra a proteção do alvo; flash.
Fire Fang | Fire | STRIKE | Presas em chamas mordem; marcas de fogo e brasas.
Flare Blitz | Fire | STRIKE | Usuário vira bola de fogo e arrasa com chamas amplas; recoil flamejante.
Flash Cannon | Steel | BEAM | Canhão de luz prateada metálica acumulada e disparada em feixe ofuscante.
Fling | Dark | PROJ | Usuário arremessa o item que segura; o objeto voa brilhando e acerta.
Focus Blast | Fighting | PROJ | Esfera de energia azul-branca lançada com ambas as mãos; explode com onda de choque.
Force Palm | Fighting | STRIKE | Palma aberta emite onda de choque no corpo do alvo; faíscas de paralisia.
Gastro Acid | Poison | DEBUFF | Líquido ácido verde-amarelado derretendo a barriga do alvo; habilidade cancelada.
Giga Impact | Normal | STRIKE | Investida colossal com aura roxo-branca e estrondo; usuário cansa (recarga).
Grass Knot | Grass | STRIKE | Fio de grama laça os pés do alvo e o derruba; mais forte com alvo pesado.
Gravity | Psychic | FIELD | Campo todo fica pesado; objetos no ar caem, partículas descem; setas ↓.
Guard Swap | Psychic | SPECIAL | Esferas de defesa trocam de lugar entre usuário e alvo.
Gunk Shot | Poison | PROJ | Bola enorme de lixo/lodo tóxico lançada com força; explode em splat sujo.
Gyro Ball | Steel | STRIKE | Usuário gira como giroscópio de aço e acerta o alvo; mais forte se lento.
Hammer Arm | Fighting | STRIKE | Braço pesado e brilhante martela como marreta; ↓ Speed do usuário.
Head Smash | Rock | STRIKE | Usuário bate a cabeça cheia de pedra com impacto devastador e rachaduras; grande recoil.
Heal Block | Psychic | DEBUFF | Selo rosa/roxo bloqueia o brilho de cura sobre o alvo.
Heal Order | Bug | HEAL | Enxame de insetos forma círculo de luz verde sobre o usuário e o cura.
Healing Wish | Psychic | SACRIFICE | Usuário se dissolve em luz rosa e a luz cura totalmente o próximo Pokémon que entra.
Heart Swap | Psychic | SPECIAL | Corações luminosos trocam entre usuário e alvo com os stats.
Ice Fang | Ice | STRIKE | Presas congelantes mordem; cristais e geada no ponto da mordida.
Ice Shard | Ice | PROJ | Estilhaço de gelo rápido disparado, quase instantâneo.
Iron Head | Steel | STRIKE | Cabeça de aço brilhante cabeceia o alvo; estrelas metálicas.
Judgment | Normal | BEAM | Rajadas de luz sagrada de múltiplos feixes caem como julgamento; cor muda conforme a Placa.
Last Resort | Normal | STRIKE | Ataque final com aura dourada-esgotada de último recurso.
Lava Plume | Fire | AOE | Colunas de lava e fogo brotam do chão e queimam o campo.
Leaf Storm | Grass | AOE | Tempestade enorme de folhas giratórias ao redor do alvo; usuário esgota Sp.Atk.
Lucky Chant | Normal | FIELD | Cantos e brilhos dourados criam trevo de proteção sobre o time.
Lunar Dance | Psychic | SACRIFICE | Usuário dança sob a luz da lua e desaparece em poeira luminosa; cura o próximo.
Magma Storm | Fire | TRAP | Tempestade de magma vermelho-alaranjado prende o alvo num turbilhão ardente.
Magnet Bomb | Steel | PROJ | Esferas metálicas magnéticas lançadas perseguem o alvo (certeiras) e explodem.
Magnet Rise | Electric | BUFF | Usuário levita com arcos magnéticos azul-amarelos sob o corpo.
Me First | Normal | SPECIAL | Usuário se antecipa e copia o golpe do alvo antes dele; brilho de pressa.
Metal Burst | Steel | STRIKE | Onda de metal prateado explode do usuário devolvendo o dano ao alvo.
Miracle Eye | Psychic | DEBUFF | Olho misterioso grande abre sobre o alvo, expõe-no; luz roxa.
Mirror Shot | Steel | BEAM | Disco/feixe metálico espelhado brilha e ofusca; ↓ Accuracy.
Mud Bomb | Ground | PROJ | Bomba de lama lançada em arco e explode em respingos marrons; ↓ Accuracy.
Nasty Plot | Dark | BUFF | Usuário sorri maliciosamente, esfrega as mãos com fumaça roxa; ↑↑ Sp.Atk.
Natural Gift | Normal | PROJ | Usuário lança baga brilhante que muda de tipo/cor conforme a baga.
Night Slash | Dark | STRIKE | Corte sombrio longo em arco com rastro roxo-negro; alto crit.
Ominous Wind | Ghost | AOE | Ventania fantasmagórica com sombras e luzes roxas sopra no alvo; chance de ↑ todos os stats.
Payback | Dark | STRIKE | Golpe sombrio de retaliação; mais forte se o usuário agiu depois.
Pluck | Flying | STRIKE | Bicada que rouba a baga do alvo e a engole.
Poison Jab | Poison | STRIKE | Soco com punho roxo venenoso que perfura o alvo.
Power Gem | Rock | BEAM | Raios de luz coloridos disparados por gema brilhante; cristais.
Power Swap | Psychic | SPECIAL | Esferas de poder trocam entre usuário e alvo.
Power Trick | Psychic | BUFF | Usuário vira o corpo ao contrário (inverte); ícones Atk/Def trocam.
Power Whip | Grass | STRIKE | Vinhas gigantes verde-escuras chicoteiam o alvo com grande força.
Psycho Cut | Psychic | PROJ | Lâminas psíquicas rosa-brancas em arco cortam o alvo; alto crit.
Psycho Shift | Psychic | STATUS | Esfera psíquica leva a condição do usuário para o alvo; status migra.
Punishment | Dark | STRIKE | Golpe sombrio de castigo cuja força cresce com as melhorias do alvo.
Roar of Time | Dragon | BEAM | Onda temporal massiva distorcendo o espaço e o tempo; ondas de relógio; usuário cansa (recarga).
Rock Climb | Normal | STRIKE | Usuário investe escalando como rocha em arremetida; chance de confusão.
Rock Polish | Rock | BUFF | Usuário se polia e brilha como pedra lisa; ↑↑ Speed.
Rock Wrecker | Rock | PROJ | Pedra gigante lançada que se desintegra no impacto; usuário cansa (recarga).
Roost | Flying | HEAL | Usuário pousa e descansa; brilho dourado suave; perde Flying brevemente.
Seed Bomb | Grass | PROJ | Semente grande e pesada explode em pólen e folhas.
Seed Flare | Grass | AOE | Explosão de luz verde-branca de sementes em flor de luz no corpo do usuário.
Shadow Claw | Ghost | STRIKE | Garras de sombra roxa rasgam o alvo; alto crit.
Shadow Force | Ghost | CHARGE | T1: usuário some dentro da sombra; T2: emerge e ataca o alvo por trás atravessando defesas.
Shadow Sneak | Ghost | STRIKE | Sombra do usuário alonga-se e acerta o alvo antes de ele reagir.
Spacial Rend | Dragon | BEAM | Rasgo no espaço em corte vertical que distorce a tela; alto crit.
Stealth Rock | Rock | FIELD | Pedras flutuantes pontiagudas cercam o campo do alvo (persistente).
Stone Edge | Rock | PROJ | Lanças de pedra afiada irrompem do chão ao redor do alvo; alto crit.
Sucker Punch | Dark | STRIKE | Soco furtivo vindo de sombra; atinge antes do alvo agir.
Switcheroo | Dark | SPECIAL | Itens trocados em flash e fumaça escura entre usuário e alvo.
Tailwind | Flying | FIELD | Vento forte e rastros brancos sopram para trás do time do usuário; ↑ Speed.
Thunder Fang | Electric | STRIKE | Presas elétricas amarelas mordem com faíscas de paralisia.
Toxic Spikes | Poison | FIELD | Espinhos roxos venenosos espalhados no chão do adversário.
Trick Room | Psychic | FIELD | Sala/quarto psíquico surge e inverte a ordem; relógios em sentido inverso.
Trump Card | Normal | PROJ | Carta de baralho brilhante lançada com ás dourado; mais forte com PP baixo.
U-turn | Bug | STRIKE | Usuário golpeia, dá meia-volta em arco e volta para o time em flash.
Vacuum Wave | Fighting | PROJ | Onda de ar a vácuo em anel branco-azulado lançada com soco; rápida.
Wake-Up Slap | Fighting | STRIKE | Tapa que acorda alvo dormindo com faíscas de despertar.
Wood Hammer | Grass | STRIKE | Corpo/tronco de madeira martela o alvo com impacto pesado; recoil.
Worry Seed | Grass | STATUS | Semente cinza preocupada cai no alvo e cria nuvem de ansiedade; não dorme.
Wring Out | Normal | STRIKE | Usuário aperta/torce o alvo com tentáculos; mais forte com HP alto.
X-Scissor | Bug | STRIKE | Duas lâminas cruzam em X verde-brilhante e cortam o alvo.
Zen Headbutt | Psychic | STRIKE | Cabeçada com aura psíquica rosada concentrada na testa.
`;

const G5 = `
Acid Spray | Poison | PROJ | Esfera de ácido lançada que explode em borrifo e corrói; ↓↓ Sp.Def.
Acrobatics | Flying | STRIKE | Acrobacias aéreas rápidas com giros e golpe leve e ágil; mais forte sem item.
After You | Normal | BUFF | Usuário cede a vez com gesto cavalheiro e energia dourada empurra o alvo para agir.
Ally Switch | Psychic | SPECIAL | Dois aliados trocam de lugar em teletransporte com luz roxa.
Autotomize | Steel | BUFF | Partes do corpo de aço caem e o usuário fica leve e rápido; ↑↑ Speed.
Bestow | Normal | SPECIAL | Usuário entrega item ao alvo com brilho de presente.
Blue Flare | Fire | AOE | Explosão enorme de chamas azuis que sobe e envolve o alvo.
Bolt Strike | Electric | STRIKE | Usuário vira raio azul-branco e se choca no alvo com explosão elétrica.
Bulldoze | Ground | AOE | Usuário pisa com força; chão rachado e tremor atingem todos; ↓ Speed.
Chip Away | Normal | MULTI | Golpes repetitivos cortam a proteção do alvo em lascas.
Circle Throw | Fighting | STRIKE | Usuário gira o alvo em círculo e o lança longe fora de campo.
Clear Smog | Poison | AOE | Nuvem de fumaça escura e então limpa; setas dos stats do alvo se apagam.
Coil | Poison | BUFF | Corpo se enrola em espiral; olhos fixos; ↑ Attack/Defense/Accuracy.
Cotton Guard | Grass | BUFF | Corpo fofo se cobre de algodão branco em camadas; ↑↑↑ Defense.
Dragon Tail | Dragon | STRIKE | Cauda gigante de dragão azul bate e arremessa o alvo para fora.
Drill Run | Ground | STRIKE | Usuário gira como broca de terra em disparada e atinge; alto crit.
Dual Chop | Dragon | MULTI | Duas machadadas de energia dragão (2 hits).
Echoed Voice | Normal | AOE | Ondas de eco da voz crescem a cada uso consecutivo; anéis cada vez maiores.
Electro Ball | Electric | PROJ | Esfera elétrica azulada lançada; mais forte quanto mais veloz o usuário.
Electroweb | Electric | TRAP | Teia elétrica amarela lançada cobre o alvo e faz faíscas; ↓ Speed.
Entrainment | Normal | SPECIAL | Usuário dança e hipnotiza o alvo a dançar junto; habilidade copiada em notas.
Fiery Dance | Fire | AOE | Dança envolta em chamas e pétalas de fogo; asas flamejantes em rodopio.
Final Gambit | Fighting | SACRIFICE | Usuário concentra toda a vida em esfera de aura e se joga contra o alvo; desmaia.
Fire Pledge | Fire | AOE | Coluna de fogo sobe do chão; combina com Grass/Water Pledge para efeito de pântano/mar de fogo/arco-íris.
Flame Burst | Fire | PROJ | Bola de fogo explode em chamas fragmentadas que atingem o alvo e vizinhos.
Flame Charge | Fire | STRIKE | Usuário investe envolto em chamas e ganha velocidade; ↑ Speed.
Foul Play | Dark | STRIKE | Usuário usa a força do alvo contra ele; sombra do alvo golpeia o próprio alvo.
Freeze Shock | Ice | CHARGE | T1: bloco de gelo com eletricidade azul envolve o usuário; T2: bloco explode em raios gélidos.
Frost Breath | Ice | BEAM | Sopro gelado em cristais que sempre acerta crítico; vapor branco.
Fusion Bolt | Electric | PROJ | Esfera de relâmpago azul-branca gigante lançada; combina com Fusion Flare.
Fusion Flare | Fire | PROJ | Esfera de chamas azul-esbranquiçadas gigante lançada; combina com Fusion Bolt.
Gear Grind | Steel | MULTI | Engrenagens de aço giratórias lançadas duas vezes e serram o alvo (2 hits).
Glaciate | Ice | AOE | Onda de ar glacial congela o campo adversário e forma cristais; ↓ Speed.
Grass Pledge | Grass | AOE | Raízes/vegetação brotam do chão em onda; combina com os outros Pledges.
Guard Split | Psychic | SPECIAL | Fluxo de luz roxa mistura defesas entre usuário e alvo e as iguala.
Head Charge | Normal | STRIKE | Cabeçada massiva com cabeça blindada de chifres e impacto forte; recoil.
Heal Pulse | Psychic | HEAL | Pulsos de energia rosa curam o alvo (aliado) com ondas suaves.
Heart Stamp | Psychic | STRIKE | Carimbo/cabeçada com coração rosa estampado no alvo; flinch.
Heat Crash | Fire | STRIKE | Usuário envolto em chamas desaba pesado; mais forte se mais pesado que o alvo.
Heavy Slam | Steel | STRIKE | Corpo pesado de aço prensa o alvo; mais forte se mais pesado.
Hex | Ghost | PROJ | Maldição roxa em chamas fantasmagóricas se acumula no alvo; mais forte se já tem status.
Hone Claws | Dark | BUFF | Usuário afia as garras com faíscas escuras e brilho; ↑ Attack/Accuracy.
Horn Leech | Grass | DRAIN | Chifre verde brilhante perfura e suga energia pela ponta que flui ao usuário.
Hurricane | Flying | AOE | Furacão colossal de vento azul-branco, nuvens e raios em redemoinho sobre o alvo; confusão.
Ice Burn | Ice | CHARGE | T1: usuário concentra ar gélido e aura azul; T2: explosão de chamas azul-gélidas que queima o alvo.
Icicle Crash | Ice | PROJ | Blocos grandes de gelo caem do céu e esmagam o alvo em estilhaços.
Incinerate | Fire | AOE | Chamas varrem o campo adversário e queimam a baga/item do alvo.
Inferno | Fire | AOE | Mar de fogo violento engole o alvo em chamas intensas (queimadura certa).
Leaf Tornado | Grass | AOE | Tornado de folhas afiadas envolve e corta o alvo; ↓ Accuracy.
Low Sweep | Fighting | STRIKE | Rasteira rápida varrendo as pernas do alvo; ↓ Speed.
Magic Room | Psychic | FIELD | Sala mágica rosa-azulada cobre o campo e apaga brilho dos itens (persistente 5 turnos).
Night Daze | Dark | AOE | Onda escura de choque em explosão ampla com sombras e luzes arroxeadas; ↓ Accuracy.
Power Split | Psychic | SPECIAL | Fluxo de energia une ataque do usuário e do alvo e os iguala.
Psyshock | Psychic | PROJ | Esferas psíquicas materializam e atingem como projéteis físicos.
Psystrike | Psychic | PROJ | Rajada psíquica rosa-azulada materializa-se em lança de cristal e golpeia.
Quash | Dark | DEBUFF | Mão sombria prensa o alvo e o empurra para o fim da fila.
Quick Guard | Fighting | FIELD | Barreira rápida de energia protege o time contra golpes prioritários.
Quiver Dance | Bug | BUFF | Usuário dança e vibra com escamas brilhantes; ↑ Sp.Atk/Sp.Def/Speed.
Rage Powder | Bug | FIELD | Pó laranja irritante em nuvem chama atenção para o usuário.
Razor Shell | Water | STRIKE | Conchas-lâmina de água cortam o alvo; ↓ Defense.
Reflect Type | Normal | SPECIAL | Usuário muda de cor e símbolo para copiar o tipo do alvo.
Relic Song | Normal | AOE | Canto antigo com notas e anéis sonoros coloridos; pode causar sono; muda de forma.
Retaliate | Normal | STRIKE | Golpe de vingança com aura vermelha forte por aliado caído.
Round | Normal | AOE | Notas musicais em círculo cantando; golpes encadeados em canto coral.
Sacred Sword | Fighting | STRIKE | Espadas de aura cortam em cruz atravessando as mudanças de stats do alvo.
Scald | Water | PROJ | Jato de água fervente com vapor branco; queimadura.
Searing Shot | Fire | AOE | Bolas de fogo explodem em fogo laranja ao redor do alvo e adjacentes.
Secret Sword | Fighting | PROJ | Lâmina de luz concentrada na ponta do chifre; corte que atinge a Defense.
Shell Smash | Normal | BUFF | Casca explode em fragmentos brilhantes; ↑↑ Atk/Sp.Atk/Speed, ↓ Def/Sp.Def.
Shift Gear | Steel | BUFF | Engrenagens giram e mudam de marcha com faíscas; ↑ Attack ↑↑ Speed.
Simple Beam | Normal | DEBUFF | Feixe simples azul-branco muda a habilidade do alvo para Simple.
Sky Drop | Flying | CHARGE | T1: usuário agarra o alvo e voa alto sumindo; T2: solta o alvo que despenca no chão.
Sludge Wave | Poison | AOE | Onda gigante de lodo roxo varre o campo atingindo todos.
Smack Down | Rock | PROJ | Pedra lançada derruba o alvo voador ao chão; poeira.
Snarl | Dark | AOE | Rosnado forte com ondas sonoras escuras; ↓ Sp.Atk dos alvos.
Soak | Water | STATUS | Jato ensopa o alvo e o muda para tipo Water; gotas e cor azul no alvo.
Steamroller | Bug | STRIKE | Usuário vira rolo compressor e passa por cima do alvo rolando.
Stored Power | Psychic | PROJ | Energia acumulada em esferas psíquicas brilhantes lançada; mais forte com ↑ de stats.
Storm Throw | Fighting | STRIKE | Arremesso violento do alvo em tempestade de golpes; sempre crítico.
Struggle Bug | Bug | AOE | Usuário se debate e solta onda de inseticida/esporos; ↓ Sp.Atk.
Synchronoise | Psychic | AOE | Onda sincronizada em anéis de ressonância atinge quem compartilha tipo.
Tail Slap | Normal | MULTI | Tapas de cauda rápidos e alternados (2–5).
Techno Blast | Normal | BEAM | Raio de energia tecnológica com circuitos; cor muda conforme o Drive.
Telekinesis | Psychic | DEBUFF | Alvo levita com aura rosa/azul sem chão (imune a Ground).
V-create | Fire | STRIKE | Usuário vira chama V de fogo e atinge com investida em formato V flamejante; ↓ Def/Sp.Def/Speed.
Venoshock | Poison | PROJ | Onda de veneno líquido lançada; mais forte se o alvo está envenenado.
Volt Switch | Electric | STRIKE | Usuário vira raio, ataca e volta ao time em flash elétrico.
Water Pledge | Water | AOE | Onda e coluna de água sobem do chão; combina com Fire/Grass Pledge.
Wide Guard | Rock | FIELD | Parede de pedra larga forma-se protegendo o time contra golpes de área.
Wild Charge | Electric | STRIKE | Usuário envolto em eletricidade selvagem em investida; recoil elétrico.
Wonder Room | Psychic | FIELD | Sala psicodélica cobre o campo e inverte Defense e Sp.Def por 5 turnos.
Work Up | Normal | BUFF | Usuário se anima com energia vermelha crescente; ↑ Attack/Sp.Atk.
`;

function ler(texto: string, geracao: LinhaCatalogo["geracao"]): LinhaCatalogo[] {
  return texto
    .trim()
    .split("\n")
    .map((l) => {
      const [nome, tipo, arquetipo, notas] = l.split(" | ");
      return { nome, slug: slugDe(nome), tipo: TIPOS_EN.indexOf(tipo), arquetipo: arquetipo as Arquetipo, notas, geracao };
    });
}

export const CATALOGO: LinhaCatalogo[] = [...ler(G1, 1), ...ler(G2, 2), ...ler(G3, 3), ...ler(G4, 4), ...ler(G5, 5)];
export const POR_SLUG = new Map(CATALOGO.map((l) => [l.slug, l]));
