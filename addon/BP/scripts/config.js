// =====================================================================
// config.js — constantes compartilhadas. Nada aqui depende de modelo.
// =====================================================================
export const DEBUG = false;

export const ITEM_MENU_KEY = "yast:menu_key";
export const AVATAR_FAMILY = "yast_avatar";
export const PLAYER_FLAG = "yast:avatar_on";          // propriedade do player (gate do render no RP)

// DynamicProperties do jogador (fonte única de verdade)
export const DP_AVATAR = "yast:avatar";                // id estável do modelo ("" = nenhum)
export const DP_PREFS = (id) => `yast:prefs:${id}`;    // JSON { v: variação, c: [configs] }
// DynamicProperty da entidade sombra
export const DP_OWNER = "yast:owner";                  // player.id do dono

export const CONFIG_SLOTS = 12;
// Config que o jogador nunca mexeu: vai para a entidade como CONFIG_UNSET e o modelo usa o
// próprio padrão (mesmo valor em tools/ysm2bedrock/convert.py).
export const CONFIG_UNSET = -99999;
export const RESPAWN_COOLDOWN_TICKS = 20;
export const SWEEP_INTERVAL_TICKS = 100;

// Predição linear (dead reckoning) — ver avatar/sync.js: predictMotion().
// O avatar é posicionado pelo servidor, que já recebe a posição do player com atraso,
// e o cliente ainda interpola a entidade: sem previsão ele fica ~1 passo atrás.
export const PREDICTION = {
  leadTicks: 3,         // quanto do futuro prever (ticks de 50 ms; 3 = 1 do servidor + ~2 da interpolação do cliente). Ajuste: /scriptevent yast:lead <0..6>
  smoothing: 0.6,       // 0..1: peso da velocidade nova no filtro (1 = sem filtro, mais tremido)
  maxOffset: 1.5,       // avanço máximo em blocos (evita "atravessar parede" ao parar de repente)
  snapDistance: 4,      // deslocamento maior que isso num tick = teleporte/portal: não prever
  maxYawLead: 35,       // graus máximos de avanço na rotação
};
// Como o avatar anda até a posição prevista.
//  impulse : velocidade (o cliente interpola entre ticks -> sem "micro teleporte")
//  teleport: teleporte a cada tick (sempre funciona, mas pula 20x por segundo)
// Se o impulso não mover a entidade, a sessão cai sozinha para teleport.
// Ajuste em jogo: /scriptevent yast:sync impulse   |   /scriptevent yast:sync teleport
export const SYNC = { mode: "impulse", snapDistance: 2.0, stuckTicks: 10 };
export const DP_SYNC = "yast:sync";
export const DP_LEAD = "yast:lead";                    // DynamicProperty do mundo (ajuste ao vivo)

// Sinal dos eixos da cabeça enviados ao avatar (ysm.head_pitch / ysm.head_yaw).
// Teste 02: olhar para baixo levantava a cabeça e o cabelo apontava para o céu -> pitch -1.
// Ajuste em jogo: /scriptevent yast:axis pitch -1   |   /scriptevent yast:axis yaw 1
export const AXIS = { pitch: -1, yaw: 1 };
export const DP_AXIS = "yast:axis";

// Bits de yast:st — espelho de tools/ysm2bedrock/molang.py (STATE_BITS) + HIDDEN_BIT.
export const ST = {
  sneaking: 1, sprinting: 2, swimming: 4, gliding: 8, onGround: 16, inWater: 32, riding: 64,
  sleeping: 128, jumping: 256, flying: 512, climbing: 1024, usingItem: 2048, dead: 4096,
  onFire: 8192, falling: 16384, hidden: 32768,
};
export const ARMOR = { helmet: 1, chest: 2, legs: 4, boots: 8, elytra: 16 };
// Categorias de item — espelho de ITEM_CATS em molang.py.
export const ITEM_CAT = {
  none: 0, sword: 1, bow: 2, crossbow: 3, shield: 4, spear: 5, pickaxe: 6, axe: 7, shovel: 8, hoe: 9,
  mace: 10, throwablePotion: 11, food: 12, drink: 13, spyglass: 14, fishingRod: 15, block: 16, item: 17,
  shears: 18, brush: 19, goatHorn: 20, chargedCrossbow: 21,
};
export const VEHICLE = { none: 0, boat: 1, minecart: 2, horse: 3, pig: 4, other: 5 };
