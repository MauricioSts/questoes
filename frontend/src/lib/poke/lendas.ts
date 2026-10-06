// RASTRO LENDÁRIO: as lendas de cada região, cada uma no seu santuário dos jogos (Articuno nas
// Ilhas Espuma, Lugia nas Ilhas Redemoinho, Giratina na Caverna Retorno...). O rastro abre
// antes do último ginásio da região (7 insígnias), como nos jogos, em que os pássaros e os
// cães lendários aparecem no fim da jornada; as lendas míticas só depois de virar Campeão.
//
// Uma caçada: a equipe vilã da região também está atrás da lenda (recrutas e um admin no
// caminho), selvagens do lugar entre eles e, no fim, a lenda. Ela é selvagem (dá para
// capturar), mas luta como chefe e nunca desmaia: fica por 1 HP. Se as questões dela acabarem
// sem captura, ela volta para o santuário e a caçada pode ser repetida.
// Dados puros: o motor (motor.ts, planoLendario) monta a partida.

export interface Equipe {
  nome: string;
  recrutas: [string, string]; // sprites do Showdown (recruta e recruta mulher)
  time: number[]; // Pokémon dos recrutas
}

export const EQUIPES: Record<string, Equipe> = {
  rocket: { nome: "Equipe Rocket", recrutas: ["rocketgrunt", "rocketgruntf"], time: [19, 20, 41, 42, 23, 24, 109, 110, 88, 52, 198, 228, 211] },
  magma: { nome: "Equipe Magma", recrutas: ["magmagrunt", "magmagruntf"], time: [261, 262, 41, 42, 322, 323, 218, 74, 109] },
  aqua: { nome: "Equipe Aqua", recrutas: ["aquagrunt", "aquagruntf"], time: [261, 262, 41, 42, 318, 319, 72, 73, 320] },
  galactica: { nome: "Equipe Galáctica", recrutas: ["galacticgrunt", "galacticgruntf"], time: [434, 435, 41, 42, 431, 432, 453, 454, 436] },
  plasma: { nome: "Equipe Plasma", recrutas: ["plasmagrunt", "plasmagruntf"], time: [509, 510, 504, 505, 551, 552, 568, 569, 559] },
};

export interface Chefe {
  nome: string;
  sprite: string;
  titulo: string; // "Admin da Equipe Rocket"
  time: number[]; // o ás é o último
}

export interface Lenda {
  id: number;
  regiao: number;
  lugar: string;
  nivel: number; // nível em que aparece nos jogos
  mitico?: boolean; // lenda mítica: só para o Campeão da região
  lore: string;
  cenario: number | "campeao"; // tipo do cenário de batalha (dex.cenario)
  selvagens: number[]; // Pokémon que vivem no lugar
  equipe: keyof typeof EQUIPES;
  chefe: Chefe;
}

const archer: Chefe = { nome: "Archer", sprite: "archer", titulo: "Executivo da Equipe Rocket", time: [41, 109, 229] };
const ariana: Chefe = { nome: "Ariana", sprite: "ariana", titulo: "Executiva da Equipe Rocket", time: [24, 109, 52] };
const proton: Chefe = { nome: "Proton", sprite: "proton", titulo: "Executivo da Equipe Rocket", time: [42, 110] };
const petrel: Chefe = { nome: "Petrel", sprite: "petrel", titulo: "Executivo da Equipe Rocket", time: [109, 109, 110] };
// Em Kanto (até o #151) não há Houndoom: os times dos executivos ficam na 1ª geração.
const archerK: Chefe = { ...archer, time: [41, 109, 24] };
const tabitha: Chefe = { nome: "Tabitha", sprite: "tabitha-gen3", titulo: "Admin da Equipe Magma", time: [322, 41, 323] };
const courtney: Chefe = { nome: "Courtney", sprite: "courtney-gen3", titulo: "Admin da Equipe Magma", time: [262, 324] };
const maxie: Chefe = { nome: "Maxie", sprite: "maxie-gen3", titulo: "Líder da Equipe Magma", time: [262, 42, 323] };
const matt: Chefe = { nome: "Matt", sprite: "matt-gen3", titulo: "Admin da Equipe Aqua", time: [262, 319] };
const shelly: Chefe = { nome: "Shelly", sprite: "shelly-gen3", titulo: "Admin da Equipe Aqua", time: [319, 262] };
const archie: Chefe = { nome: "Archie", sprite: "archie-gen3", titulo: "Líder da Equipe Aqua", time: [262, 73, 319] };
const mars: Chefe = { nome: "Mars", sprite: "mars", titulo: "Comandante da Equipe Galáctica", time: [42, 425, 432] };
const jupiter: Chefe = { nome: "Jupiter", sprite: "jupiter", titulo: "Comandante da Equipe Galáctica", time: [42, 435] };
const saturn: Chefe = { nome: "Saturn", sprite: "saturn", titulo: "Comandante da Equipe Galáctica", time: [42, 437, 454] };
const cyrus: Chefe = { nome: "Cyrus", sprite: "cyrus", titulo: "Chefe da Equipe Galáctica", time: [430, 215, 461, 229] };
const zinzolin: Chefe = { nome: "Zinzolin", sprite: "zinzolin", titulo: "Sábio da Equipe Plasma", time: [459, 215, 461] };
const sombra: Chefe = { nome: "Sombras", sprite: "shadowtriad", titulo: "Trio das Sombras da Equipe Plasma", time: [625, 625] };
const colress: Chefe = { nome: "Colress", sprite: "colress", titulo: "Cientista da Equipe Plasma", time: [598, 601] };
const n: Chefe = { nome: "N", sprite: "n", titulo: "Rei da Equipe Plasma", time: [570, 549, 586, 571] };
const ghetsis: Chefe = { nome: "Ghetsis", sprite: "ghetsis", titulo: "Sábio da Equipe Plasma", time: [563, 537, 589, 635] };

export const LENDAS: Lenda[] = [
  // ---------- Kanto ----------
  { id: 144, regiao: 0, lugar: "Ilhas Espuma", nivel: 50, cenario: 5, equipe: "rocket", chefe: proton, selvagens: [86, 87, 41, 42, 54, 79, 116, 90, 98], lore: "No fundo gelado das Ilhas Espuma, o pássaro de gelo pousa onde as correntes se encontram. A Equipe Rocket quer congelá-lo numa Pokébola." },
  { id: 145, regiao: 0, lugar: "Usina Abandonada", nivel: 50, cenario: 3, equipe: "rocket", chefe: petrel, selvagens: [81, 82, 100, 101, 25, 125, 88, 89], lore: "Os geradores da usina voltaram a zumbir sozinhos: é Zapdos, que se alimenta da eletricidade parada no ar." },
  { id: 146, regiao: 0, lugar: "Monte Brasa", nivel: 50, cenario: 1, equipe: "rocket", chefe: ariana, selvagens: [77, 78, 74, 75, 66, 67, 21, 22, 126], lore: "No topo do Monte Brasa, a lava ilumina a silhueta de Moltres. Dizem que as asas dele anunciam a primavera." },
  { id: 150, regiao: 0, lugar: "Caverna Cerulean", nivel: 70, cenario: 12, equipe: "rocket", chefe: archerK, selvagens: [42, 47, 57, 64, 82, 97, 101, 105, 132, 113], lore: "Criado em laboratório a partir do DNA de Mew, Mewtwo fugiu e se escondeu na caverna mais perigosa de Kanto. A Rocket quer o seu experimento de volta." },
  { id: 151, regiao: 0, lugar: "Ilha Distante", nivel: 30, mitico: true, cenario: 4, equipe: "rocket", chefe: archerK, selvagens: [10, 11, 13, 14, 43, 69, 102, 123, 127], lore: "Mew guarda o DNA de todos os Pokémon. Só aparece para quem tem o coração puro, e ainda assim brinca de esconde-esconde." },
  // ---------- Johto ----------
  { id: 243, regiao: 1, lugar: "Torre Queimada", nivel: 40, cenario: 3, equipe: "rocket", chefe: petrel, selvagens: [19, 20, 109, 110, 58, 126, 41, 218], lore: "Quando a Torre Queimada pegou fogo, três Pokémon morreram e Ho-Oh os trouxe de volta. Raikou carrega o raio que caiu naquela noite." },
  { id: 244, regiao: 1, lugar: "Torre Queimada", nivel: 40, cenario: 1, equipe: "rocket", chefe: proton, selvagens: [19, 20, 109, 110, 58, 126, 41, 218], lore: "Entei renasceu das chamas da torre. Dizem que um vulcão novo nasce cada vez que ele ruge." },
  { id: 245, regiao: 1, lugar: "Torre de Lata", nivel: 40, cenario: 2, equipe: "rocket", chefe: ariana, selvagens: [92, 93, 200, 163, 164, 54, 60, 118], lore: "Suicune é a chuva que apagou o incêndio. Corre sobre a água e purifica tudo por onde passa." },
  { id: 249, regiao: 1, lugar: "Ilhas Redemoinho", nivel: 60, cenario: 2, equipe: "rocket", chefe: archer, selvagens: [41, 42, 72, 73, 86, 87, 116, 117, 98, 222], lore: "No fundo das Ilhas Redemoinho, Lugia dorme para não provocar tempestades. Basta um bater de asas para durar quarenta dias." },
  { id: 250, regiao: 1, lugar: "Topo da Torre de Lata", nivel: 60, cenario: 9, equipe: "rocket", chefe: archer, selvagens: [92, 93, 200, 163, 164, 198, 41], lore: "As penas de Ho-Oh brilham nas sete cores. Quem o vê, dizem, terá felicidade eterna." },
  { id: 251, regiao: 1, lugar: "Santuário do Bosque Ilex", nivel: 30, mitico: true, cenario: 4, equipe: "rocket", chefe: proton, selvagens: [10, 11, 13, 14, 43, 46, 48, 167, 163, 191], lore: "Celebi viaja pelo tempo e só aparece em florestas que estão em paz. O pequeno santuário do bosque é dele." },
  // ---------- Hoenn ----------
  { id: 377, regiao: 2, lugar: "Câmara do Deserto", nivel: 40, cenario: 8, equipe: "magma", chefe: tabitha, selvagens: [328, 331, 343, 27, 28, 74, 75, 322], lore: "Selado sob as areias há milênios, Regirock é feito de rochas de todas as eras. O braile na parede conta como despertá-lo." },
  { id: 378, regiao: 2, lugar: "Caverna da Ilha", nivel: 40, cenario: 5, equipe: "aqua", chefe: matt, selvagens: [41, 42, 72, 73, 363, 364, 361, 86, 87], lore: "Regice nasceu na era do gelo e esfria o ar à sua volta a −200 °C. Nem lava derrete o seu corpo." },
  { id: 379, regiao: 2, lugar: "Tumba Antiga", nivel: 40, cenario: 12, equipe: "magma", chefe: courtney, selvagens: [41, 42, 302, 303, 304, 305, 74, 75], lore: "Registeel foi selado na tumba por gente que temia a sua força. O metal do corpo dele não existe em lugar nenhum da Terra." },
  { id: 380, regiao: 2, lugar: "Ilha do Sul", nivel: 50, cenario: 14, equipe: "aqua", chefe: shelly, selvagens: [311, 312, 278, 279, 333, 334, 370], lore: "Latias entende o coração das pessoas e fica invisível dobrando a luz com as penas. Na Ilha do Sul, cuida da Joia d'Alma." },
  { id: 381, regiao: 2, lugar: "Ilha do Sul", nivel: 50, cenario: 14, equipe: "aqua", chefe: matt, selvagens: [311, 312, 278, 279, 333, 334, 370], lore: "Latios mostra aos outros, por telepatia, o que os seus olhos estão vendo. Voa mais rápido que um avião a jato." },
  { id: 382, regiao: 2, lugar: "Caverna Submarina", nivel: 70, cenario: 2, equipe: "aqua", chefe: archie, selvagens: [41, 42, 72, 73, 318, 319, 320, 339, 340], lore: "Kyogre expandiu os mares e dorme no fundo da Caverna Submarina. A Equipe Aqua quer acordá-lo para cobrir o mundo de água." },
  { id: 383, regiao: 2, lugar: "Caverna Terrestre", nivel: 70, cenario: 8, equipe: "magma", chefe: maxie, selvagens: [41, 42, 74, 75, 322, 323, 324, 218, 219], lore: "Groudon ergueu os continentes com magma. A Equipe Magma quer que ele seque os mares para ter mais terra." },
  { id: 384, regiao: 2, lugar: "Pilar Celeste", nivel: 70, cenario: 9, equipe: "magma", chefe: maxie, selvagens: [42, 302, 344, 355, 356, 353, 354, 334], lore: "Rayquaza vive na camada de ozônio e só desce ao Pilar Celeste quando Kyogre e Groudon brigam." },
  { id: 385, regiao: 2, lugar: "Monte do Céu Estrelado", nivel: 40, mitico: true, cenario: 10, equipe: "aqua", chefe: shelly, selvagens: [337, 338, 343, 344, 280, 281, 358], lore: "Jirachi dorme mil anos e acorda por apenas sete dias. Dizem que realiza qualquer desejo escrito nos papéis da sua cabeça." },
  { id: 386, regiao: 2, lugar: "Ilha do Nascimento", nivel: 30, mitico: true, cenario: 10, equipe: "magma", chefe: courtney, selvagens: [337, 338, 343, 344, 374, 375], lore: "Deoxys nasceu de um vírus vindo do espaço num meteorito. O cristal no seu peito é o cérebro." },
  // ---------- Sinnoh ----------
  { id: 480, regiao: 3, lugar: "Lago Agudez", nivel: 50, cenario: 5, equipe: "galactica", chefe: jupiter, selvagens: [54, 55, 129, 130, 459, 460, 215, 220], lore: "Uxie, o ser do conhecimento, apaga a memória de quem olha nos seus olhos. Dorme no fundo do Lago Agudez." },
  { id: 481, regiao: 3, lugar: "Lago Verdade", nivel: 50, cenario: 2, equipe: "galactica", chefe: mars, selvagens: [54, 55, 129, 130, 399, 400, 396, 397, 183], lore: "Mesprit, o ser da emoção, ensinou às pessoas a tristeza e a alegria. Gosta de passear invisível pelo Lago Verdade." },
  { id: 482, regiao: 3, lugar: "Lago Valor", nivel: 50, cenario: 2, equipe: "galactica", chefe: saturn, selvagens: [54, 55, 129, 130, 399, 400, 418, 419, 193], lore: "Azelf, o ser da força de vontade, dorme no fundo do Lago Valor e mantém o mundo em equilíbrio." },
  { id: 483, regiao: 3, lugar: "Coluna Lança", nivel: 47, cenario: 16, equipe: "galactica", chefe: cyrus, selvagens: [41, 42, 74, 75, 66, 67, 433, 436, 437, 307], lore: "Dialga faz o tempo andar com as batidas do coração. Cyrus quer usá-lo para recriar o universo do zero." },
  { id: 484, regiao: 3, lugar: "Coluna Lança", nivel: 47, cenario: 14, equipe: "galactica", chefe: cyrus, selvagens: [41, 42, 74, 75, 66, 67, 433, 436, 437, 307], lore: "Palkia vive numa dimensão paralela e dobra o espaço quando respira. No topo do Monte Coronet, o espaço racha." },
  { id: 485, regiao: 3, lugar: "Monte Ardente", nivel: 50, cenario: 1, equipe: "galactica", chefe: mars, selvagens: [74, 75, 76, 218, 219, 322, 323, 111, 112, 228], lore: "Heatran mora em cavernas vulcânicas. O seu sangue ferve como magma e os pés de garra se agarram ao teto." },
  { id: 486, regiao: 3, lugar: "Templo de Snowpoint", nivel: 70, cenario: 5, equipe: "galactica", chefe: saturn, selvagens: [41, 42, 459, 460, 215, 361, 362], lore: "Dizem que Regigigas puxou os continentes com cordas. Acorda dos três Regis e despertá-lo exige os três." },
  { id: 487, regiao: 3, lugar: "Caverna Retorno", nivel: 70, cenario: 13, equipe: "galactica", chefe: cyrus, selvagens: [41, 42, 92, 93, 200, 425, 426, 442], lore: "Banido para o Mundo Distorção por ser violento, Giratina observa o nosso mundo do outro lado. A caverna muda de forma." },
  { id: 488, regiao: 3, lugar: "Ilha Lua Cheia", nivel: 50, cenario: 10, equipe: "galactica", chefe: jupiter, selvagens: [396, 397, 399, 400, 403, 404, 406, 315], lore: "Cresselia traz sonhos bons. As suas asas soltam partículas que brilham como o véu da lua cheia." },
  { id: 490, regiao: 3, lugar: "Ruínas do Mar", nivel: 50, mitico: true, cenario: 2, equipe: "galactica", chefe: mars, selvagens: [72, 73, 222, 223, 224, 226, 456, 457], lore: "Manaphy nasce no mar quente e sempre volta ao lugar onde nasceu, por mais longe que tenha ido." },
  { id: 491, regiao: 3, lugar: "Ilha Lua Nova", nivel: 40, mitico: true, cenario: 15, equipe: "galactica", chefe: cyrus, selvagens: [198, 430, 92, 93, 434, 435, 215], lore: "Darkrai põe quem chega perto para dormir e mostra pesadelos. Só as penas de Cresselia desfazem o feitiço." },
  { id: 492, regiao: 3, lugar: "Jardim das Flores", nivel: 30, mitico: true, cenario: 4, equipe: "galactica", chefe: jupiter, selvagens: [406, 315, 407, 420, 421, 191, 192, 43, 44], lore: "Shaymin transforma o ar poluído em flores. Quando as gracídeas florescem, ele sai voando para longe." },
  { id: 493, regiao: 3, lugar: "Salão da Origem", nivel: 80, mitico: true, cenario: "campeao", equipe: "galactica", chefe: cyrus, selvagens: [436, 437, 433, 358, 475, 282], lore: "Arceus surgiu de um ovo no vazio antes de tudo existir e criou o universo com mil braços. É o Pokémon do princípio." },
  // ---------- Unova ----------
  { id: 494, regiao: 4, lugar: "Ilha Liberdade", nivel: 15, mitico: true, cenario: 1, equipe: "plasma", chefe: zinzolin, selvagens: [504, 505, 506, 509, 519, 527, 543], lore: "Victini cria energia infinita e divide com quem estiver perto. Quem o tem do lado não perde uma batalha." },
  { id: 638, regiao: 4, lugar: "Caverna Mistralton", nivel: 42, cenario: 16, equipe: "plasma", chefe: zinzolin, selvagens: [524, 525, 527, 528, 532, 533, 529, 530, 621], lore: "Cobalion, de coração e corpo de aço, protegeu Pokémon contra as pessoas que queimaram as florestas. Os Plasma querem libertá-lo... para eles." },
  { id: 639, regiao: 4, lugar: "Caverna Vitória", nivel: 42, cenario: 12, equipe: "plasma", chefe: sombra, selvagens: [524, 525, 527, 528, 532, 533, 529, 530, 610], lore: "Terrakion derruba castelos com uma investida. Mora no fundo da Estrada Vitória e testa quem chega lá." },
  { id: 640, regiao: 4, lugar: "Bosque Pinwheel", nivel: 42, cenario: 4, equipe: "plasma", chefe: zinzolin, selvagens: [540, 541, 543, 544, 546, 548, 556, 531], lore: "Virizion corta o ar com os chifres afiados como lâminas. Some na floresta antes que se perceba que estava lá." },
  { id: 641, regiao: 4, lugar: "Rota 7 sob a ventania", nivel: 40, cenario: 9, equipe: "plasma", chefe: sombra, selvagens: [519, 520, 522, 523, 580, 587, 527], lore: "Tornadus corre pelos céus de Unova soltando ventos tão fortes que derrubam casas. A Rota 7 inteira se dobra." },
  { id: 642, regiao: 4, lugar: "Rota 7 sob a tempestade", nivel: 40, cenario: 3, equipe: "plasma", chefe: sombra, selvagens: [519, 520, 522, 523, 580, 587, 527], lore: "Thundurus solta raios da cauda e queima os campos. Quando ele passa, a chuva elétrica não para." },
  { id: 643, regiao: 4, lugar: "Torre Espiral do Dragão", nivel: 50, cenario: 14, equipe: "plasma", chefe: n, selvagens: [610, 611, 621, 527, 528, 577, 613], lore: "Reshiram é o dragão da verdade: as chamas da sua cauda queimam o mundo para quem busca um mundo justo." },
  { id: 644, regiao: 4, lugar: "Torre Espiral do Dragão", nivel: 50, cenario: 14, equipe: "plasma", chefe: n, selvagens: [610, 611, 621, 527, 528, 577, 613], lore: "Zekrom é o dragão dos ideais: gera eletricidade com a cauda e voa escondido entre nuvens negras." },
  { id: 645, regiao: 4, lugar: "Santuário da Abundância", nivel: 70, cenario: 8, equipe: "plasma", chefe: colress, selvagens: [506, 507, 531, 548, 549, 540, 551], lore: "Por onde Landorus passa, os campos dão colheitas fartas. Ele castigou Tornadus e Thundurus pelas tempestades." },
  { id: 646, regiao: 4, lugar: "Caverna Gigante", nivel: 75, cenario: 5, equipe: "plasma", chefe: ghetsis, selvagens: [613, 614, 615, 582, 583, 527, 528, 524, 525], lore: "Kyurem é o casco vazio que sobrou quando o dragão original se dividiu em Reshiram e Zekrom. Ghetsis quer congelar Unova com ele." },
  { id: 647, regiao: 4, lugar: "Lago de Icirrus", nivel: 15, mitico: true, cenario: 2, equipe: "plasma", chefe: sombra, selvagens: [535, 536, 537, 550, 580, 594, 618], lore: "Keldeo correu atrás de Cobalion, Terrakion e Virizion até virar um deles. Pula sobre a água como se ela fosse chão." },
  { id: 648, regiao: 4, lugar: "Teatro de Castelia", nivel: 15, mitico: true, cenario: 10, equipe: "plasma", chefe: colress, selvagens: [517, 518, 561, 574, 575, 577, 578], lore: "As melodias de Meloetta mudam o humor de quem ouve. Dizem que ela já inspirou muitas músicas famosas." },
  { id: 649, regiao: 4, lugar: "Laboratório Plasma", nivel: 15, mitico: true, cenario: 16, equipe: "plasma", chefe: colress, selvagens: [599, 600, 602, 603, 615, 624, 625], lore: "Genesect viveu há 300 milhões de anos. A Equipe Plasma o trouxe de volta e o equipou com um canhão nas costas." },
];

export const lendaPorId = (id: number) => LENDAS.find((l) => l.id === id);
export const lendasDaRegiao = (r: number) => LENDAS.filter((l) => l.regiao === r);
export const ehLenda = (id: number) => LENDAS.some((l) => l.id === id);

// O rastro abre com 7 insígnias (o último ginásio pela frente); as míticas, sendo Campeão.
export const INSIGNIAS_RASTRO = 7;

// Uma questão a mais por turno contra a lenda: até 10 turnos antes de ela voltar ao santuário.
export const TURNOS_LENDA = 10;
