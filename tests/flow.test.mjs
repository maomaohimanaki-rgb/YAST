// Teste de fluxo dos scripts com a Script API simulada (tests/mock/node_modules).
// Não substitui o teste no jogo: pega erro de runtime, regressão de lógica e contrato
// de propriedades. Uso:  python3 tools/yast.py build packs/debug.json && node tests/flow.test.mjs
import assert from "node:assert/strict";
import { cpSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pack = process.argv[2] ?? "debug";
const run = join(here, "mock", "run");
rmSync(run, { recursive: true, force: true });
mkdirSync(run, { recursive: true });
cpSync(join(here, "..", "dist", pack, `YAST_${pack}_BP`, "scripts"), join(run, "scripts"), { recursive: true });

const mc = await import(pathToFileURL(join(here, "mock", "node_modules", "@minecraft", "server", "index.js")));
const ui = await import(pathToFileURL(join(here, "mock", "node_modules", "@minecraft", "server-ui", "index.js")));
const { CATALOG } = await import(pathToFileURL(join(run, "scripts", "generated", "catalog.js")));
const { world, system, Player, _dims } = mc;

const steve = new Player("Steve");
world.players.push(steve);
await import(pathToFileURL(join(run, "scripts", "main.js")));
system._advance(2);

const flush = () => new Promise((r) => setTimeout(r, 0));
const avatars = () => [..._dims.overworld.entities].filter((e) => e.typeId.startsWith("yast:av_"));
const pickButton = (match) => (form) => {
  const i = form.buttons.findIndex((b) => b.includes(match));
  assert.ok(i >= 0, `botão "${match}" não encontrado em ${JSON.stringify(form.buttons)}`);
  return { canceled: false, selection: i };
};

// 1) Menu -> Avatares -> modelo com várias cores -> escolhe a 3ª cor
const target = CATALOG.find((m) => m.variants.length > 2 && m.extras.length && m.configs.length) ?? CATALOG[0];
console.log(`modelo de teste: ${target.id} (${target.variants.length} cores, ${target.extras.length} emotes, ${target.configs.length} configs)`);
const collectionLevel = CATALOG.length > 60;
ui.responses.push(pickButton("Avatares"));
if (collectionLevel) ui.responses.push(pickButton(target.collection));
ui.responses.push(pickButton(target.name.slice(0, 20)));
ui.responses.push(pickButton(target.variants[2].slice(0, 15)));
world._fire("itemUse", { itemStack: { typeId: "yast:menu_key" }, source: steve });
for (let i = 0; i < 10; i++) await flush();

assert.equal(steve.getDynamicProperty("yast:avatar"), target.id, "DynamicProperty salva o id");
assert.equal(steve.props["yast:avatar_on"], true, "gate do player ligado");
assert.equal(avatars().length, 1, "uma entidade sombra");
const av = avatars()[0];
assert.equal(av.typeId, target.entity);
assert.equal(av.getDynamicProperty("yast:owner"), steve.id);
assert.equal(av.props["yast:var"], 2, "cor escolhida aplicada");
assert.ok(JSON.parse(steve.getDynamicProperty(`yast:prefs:${target.id}`)).v === 2, "cor salva por modelo");

// 2) Sync: andar agachado olhando para baixo, segurando espada
steve.isSneaking = true;
steve.velocity = { x: 0, y: 0, z: 0.06 };
steve.headRot = { x: 40, y: 30 };
steve.location = { x: 5, y: 64, z: 5 };
steve.equip.Mainhand = { typeId: "minecraft:diamond_sword", getComponent: () => undefined };
system._advance(10);
assert.deepEqual(av.location, steve.location, "parado: avatar exatamente no player");

// 2b) Predição linear (modo teleporte, lead 2 para contas redondas):
//     andando a 0,25 bloco/tick em X, o avatar fica 2 ticks À FRENTE
system._fire("scriptEventReceive", { id: "yast:sync", message: "teleport", sourceEntity: steve });
system._fire("scriptEventReceive", { id: "yast:lead", message: "2", sourceEntity: steve });
for (let i = 0; i < 12; i++) {
  steve.location = { x: steve.location.x + 0.25, y: 64, z: 5 };
  system._advance(1);
}
assert.ok(Math.abs(av.location.x - (steve.location.x + 0.5)) < 0.02, `prevê +0,5 bloco (lead 2): ${av.location.x - steve.location.x}`);
assert.equal(av.location.y, 64, "no chão não prevê Y");
// parou: o avanço some em poucos ticks (sem "deslizar" para longe)
for (let i = 0; i < 4; i++) system._advance(1);
assert.ok(Math.abs(av.location.x - steve.location.x) < 0.05, `parou: ${av.location.x - steve.location.x}`);
// pulo (no ar): prevê Y também
steve.isOnGround = false;
for (let i = 0; i < 6; i++) {
  steve.location = { x: steve.location.x, y: steve.location.y + 0.2, z: 5 };
  system._advance(1);
}
assert.ok(av.location.y > steve.location.y + 0.3, "no ar prevê Y");
steve.isOnGround = true;
steve.location = { x: 5, y: 64, z: 5 };
system._advance(5);
// teleporte longo: encaixa sem extrapolar
steve.location = { x: 500, y: 64, z: 5 };
system._advance(1);
assert.deepEqual(av.location, steve.location, "teleporte: sem predição");
// limite de avanço: velocidade absurda (elytra/foguete) não joga o avatar a mais de 1,5 bloco
for (let i = 0; i < 8; i++) {
  steve.location = { x: steve.location.x + 3, y: 64, z: 5 };
  system._advance(1);
}
assert.ok(av.location.x - steve.location.x <= 1.5 + 1e-9, "avanço limitado");
steve.location = { x: 5, y: 64, z: 5 };
system._advance(8);
// calibração ao vivo
system._fire("scriptEventReceive", { id: "yast:lead", message: "3", sourceEntity: steve });
assert.equal(world.getDynamicProperty("yast:lead"), 3, "lead salvo no mundo");
for (let i = 0; i < 12; i++) {
  steve.location = { x: steve.location.x + 0.2, y: 64, z: 5 };
  system._advance(1);
}
assert.ok(Math.abs(av.location.x - (steve.location.x + 0.6)) < 0.02, "lead 3 = +0,6 bloco");
system._fire("scriptEventReceive", { id: "yast:lead", message: "2", sourceEntity: steve });
steve.location = { x: 5, y: 64, z: 5 };
system._advance(8);

// 2c) Modo impulso: anda por velocidade (sem teleporte por tick) e converge para o alvo
system._fire("scriptEventReceive", { id: "yast:sync", message: "impulse", sourceEntity: steve });
system._advance(3);
const tp0 = av.teleports ?? 0;
for (let i = 0; i < 20; i++) {
  steve.location = { x: steve.location.x + 0.2, y: 64, z: 5 };
  system._advance(1);
}
assert.equal(av.teleports ?? 0, tp0, "impulso: nenhum teleporte andando normalmente");
assert.ok(Math.abs(av.location.x - (steve.location.x + 0.4)) < 0.25, `impulso acompanha: ${av.location.x - steve.location.x}`);
// 2d) Motor que ignora velocidade: cai sozinho para teleporte
av.ignoresImpulse = true;
for (let i = 0; i < 25; i++) {
  steve.location = { x: steve.location.x + 0.2, y: 64, z: 5 };
  system._advance(1);
}
assert.ok(Math.abs(av.location.x - (steve.location.x + 0.4)) < 0.05, `fallback para teleporte: ${av.location.x - steve.location.x}`);
av.ignoresImpulse = false;
steve.location = { x: 5, y: 64, z: 5 };
system._advance(8);
assert.equal(av.props["yast:st"] & 1, 1, "bit agachado");
assert.equal(av.props["yast:st"] & 16, 16, "bit no chão");
assert.equal(av.props["yast:pitch"], -40, "pitch invertido (AXIS.pitch = -1, teste 02)");
assert.equal(av.props["yast:main"], 1, "categoria espada");
assert.ok(Math.abs(av.props["yast:vz"] - 1.2) < 0.06, "velocidade em m/s");
assert.ok(av.commands.some((c) => c.includes("slot.weapon.mainhand 0 minecraft:diamond_sword")), "item espelhado");
assert.ok(Math.abs(av.props["yast:hyaw"]) <= 75, "cabeça a no máximo 75° do corpo");

// 3) Golpe, dano e uso viram contadores/estado
world._fire("playerSwingStart", { player: steve, swingSource: "Attack" });
world._fire("entityHitEntity", { damagingEntity: steve, hitEntity: {} }); // não pode contar de novo
world._fire("entityHurt", { hurtEntity: steve, damage: 1 });
world._fire("itemStartUse", { source: steve, itemStack: { typeId: "minecraft:diamond_sword" } });
system._advance(1);
assert.equal(av.props["yast:swing"], 1);
assert.equal(av.props["yast:hurt"], 1);
assert.equal(av.props["yast:use"], 1);
world._fire("itemStopUse", { source: steve });
system._advance(1);
assert.equal(av.props["yast:use"], 0);

// 4) Emote e config pelo menu
ui.responses.push(pickButton("Emotes"));
ui.responses.push((f) => ({ canceled: false, selection: 0 }));
world._fire("itemUse", { itemStack: { typeId: "yast:menu_key" }, source: steve });
for (let i = 0; i < 10; i++) await flush();
assert.equal(av.props["yast:act"], 0);
assert.equal(av.props["yast:aseq"], 1);

ui.responses.push(pickButton("Ajustes"));
ui.responses.push((form) => ({ canceled: false, formValues: form.controls.map((c) => (c[0] === "toggle" ? true : c[0] === "dropdown" ? 1 : c[3])) }));
ui.responses.push({ canceled: true });
world._fire("itemUse", { itemStack: { typeId: "yast:menu_key" }, source: steve });
for (let i = 0; i < 10; i++) await flush();
assert.equal(av.props[`yast:c${target.configs[0].slot}`], target.configs[0].kind === "range" ? target.configs[0].max : 1, "config aplicada");

// 5) Entidade some (/kill, chunk): volta sozinha após o cooldown
av.remove();
system._advance(25);
assert.equal(avatars().length, 1, "respawn automático");
const av2 = avatars()[0];
assert.equal(av2.props["yast:var"], 2, "cor reaplicada no respawn");

// 6) Órfão: avatar sem sessão é varrido
const orphan = _dims.overworld.spawnEntity(target.entity, { x: 0, y: 0, z: 0 });
system._advance(101);
assert.equal(orphan.isValid, false, "órfão removido");
assert.equal(av2.isValid, true, "avatar do dono preservado");

// 7) Saída e volta: save restaura
world._fire("playerLeave", { player: steve }, true);
system._advance(2);
assert.equal(avatars().length, 0, "sair remove a entidade");
world._fire("playerSpawn", { player: steve, initialSpawn: true });
system._advance(1);
assert.equal(avatars().length, 1, "entrar restaura");
assert.equal(avatars()[0].props["yast:var"], 2);

// 8) Troca direta (radio) e reset
const other = CATALOG.find((m) => m.id !== target.id);
if (other) {
  ui.responses.push(pickButton("Avatares"));
  if (collectionLevel) ui.responses.push(pickButton(other.collection));
  ui.responses.push(pickButton(other.name.slice(0, 20)));
  ui.responses.push({ canceled: true });
  world._fire("itemUse", { itemStack: { typeId: "yast:menu_key" }, source: steve });
  for (let i = 0; i < 10; i++) await flush();
  assert.equal(avatars().length, 1, "troca não duplica entidade");
  assert.equal(avatars()[0].typeId, other.entity);
}
ui.responses.push(pickButton("Resetar"));
world._fire("itemUse", { itemStack: { typeId: "yast:menu_key" }, source: steve });
for (let i = 0; i < 10; i++) await flush();
assert.equal(avatars().length, 0, "reset remove a entidade");
assert.equal(steve.props["yast:avatar_on"], false, "gate desligado");
assert.equal(steve.getDynamicProperty("yast:avatar"), undefined);

// 9) Morte: entidade some; respawn do player traz de volta
ui.responses.push(pickButton("Avatares"));
if (collectionLevel) ui.responses.push(pickButton(target.collection));
ui.responses.push(pickButton(target.name.slice(0, 20)));
ui.responses.push({ canceled: true });
world._fire("itemUse", { itemStack: { typeId: "yast:menu_key" }, source: steve });
for (let i = 0; i < 10; i++) await flush();
steve.health = 0;
system._advance(30);
assert.equal(avatars().length, 0, "morto: sem avatar");
steve.health = 20;
world._fire("playerSpawn", { player: steve, initialSpawn: false });
system._advance(1);
assert.equal(avatars().length, 1, "renasceu com avatar");

console.log("OK: fluxo completo passou");
