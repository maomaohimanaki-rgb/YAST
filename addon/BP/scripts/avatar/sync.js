// =====================================================================
// sync.js — sincronização por tick: player real -> entidade sombra.
//
// Posição/rotação via teleport; todo o resto via Entity Properties, que o
// shim do RP (gerado em tools/ysm2bedrock/convert.py) traduz para v.yq_*.
// A IA continua vendo o player real (hitbox 1.8); o avatar é só visual.
// =====================================================================
import { EquipmentSlot, GameMode, system } from "@minecraft/server";
import { ST, ARMOR, ITEM_CAT, VEHICLE } from "../config.js";
import { ensureEntity, removeEntity, setProp } from "./manager.js";

const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round = (x, step) => Math.round(x / step) * step;

/** typeId -> categoria usada pelas animações hold_/use_ do YSM. */
export function itemCategory(item) {
  if (!item) return ITEM_CAT.none;
  const id = item.typeId.replace(/^minecraft:/, "");
  if (id === "crossbow") {
    try {
      const charged = item.getComponent("minecraft:charged")?.isCharged ?? false;
      return charged ? ITEM_CAT.chargedCrossbow : ITEM_CAT.crossbow;
    } catch {
      return ITEM_CAT.crossbow;
    }
  }
  if (id.endsWith("_sword")) return ITEM_CAT.sword;
  if (id === "bow") return ITEM_CAT.bow;
  if (id === "shield") return ITEM_CAT.shield;
  if (id === "trident" || id.endsWith("_spear")) return ITEM_CAT.spear;
  if (id.endsWith("_pickaxe")) return ITEM_CAT.pickaxe;
  if (id.endsWith("_axe")) return ITEM_CAT.axe;
  if (id.endsWith("_shovel")) return ITEM_CAT.shovel;
  if (id.endsWith("_hoe")) return ITEM_CAT.hoe;
  if (id === "mace") return ITEM_CAT.mace;
  if (id === "splash_potion" || id === "lingering_potion") return ITEM_CAT.throwablePotion;
  if (id === "potion" || id === "milk_bucket" || id === "honey_bottle") return ITEM_CAT.drink;
  if (id === "spyglass") return ITEM_CAT.spyglass;
  if (id === "fishing_rod") return ITEM_CAT.fishingRod;
  if (id === "shears") return ITEM_CAT.shears;
  if (id === "brush") return ITEM_CAT.brush;
  if (id === "goat_horn") return ITEM_CAT.goatHorn;
  try {
    if (item.getComponent("minecraft:food")) return ITEM_CAT.food;
  } catch {
    /* ignore */
  }
  return item.typeId.includes("block") || item.typeId.endsWith("_planks") ? ITEM_CAT.block : ITEM_CAT.item;
}

function vehicleKind(player) {
  let v;
  try {
    v = player.getComponent("minecraft:riding")?.entityRidingOn;
  } catch {
    return VEHICLE.none;
  }
  if (!v) return VEHICLE.none;
  const t = v.typeId;
  if (t.includes("boat") || t.includes("raft")) return VEHICLE.boat;
  if (t.includes("minecart")) return VEHICLE.minecart;
  if (/horse|donkey|mule|camel|llama|skeleton_horse|zombie_horse/.test(t)) return VEHICLE.horse;
  if (/pig|strider/.test(t)) return VEHICLE.pig;
  return VEHICLE.other;
}

/** Rotação do corpo estilo vanilla: segue o movimento e fica até 75° da cabeça. */
function bodyYaw(sync, headYaw, vx, vz) {
  let body = sync.body ?? headYaw;
  const moving = vx * vx + vz * vz > 0.0025; // > 0.05 bloco/tick
  let target = body;
  if (moving) {
    let mv = (Math.atan2(-vx, vz) * 180) / Math.PI;
    if (Math.abs(wrap(mv - headYaw)) > 95) mv += 180; // andando de costas
    target = mv;
  }
  const lim = moving ? 75 : 50;
  target = headYaw + clamp(wrap(target - headYaw), -lim, lim);
  body = body + wrap(target - body) * (moving ? 0.35 : 0.2);
  body = headYaw + clamp(wrap(body - headYaw), -75, 75);
  return wrap(body);
}

function stateBits(p, s) {
  let st = 0;
  const f = (cond, bit) => {
    if (cond) st |= bit;
  };
  f(p.isSneaking, ST.sneaking);
  f(p.isSprinting, ST.sprinting);
  f(p.isSwimming, ST.swimming);
  f(p.isGliding, ST.gliding);
  f(p.isOnGround, ST.onGround);
  f(p.isInWater, ST.inWater);
  f(s.sync.vehicle > 0, ST.riding);
  f(p.isSleeping, ST.sleeping);
  f(p.isJumping, ST.jumping);
  f(p.isFlying, ST.flying);
  f(p.isClimbing, ST.climbing);
  f(s.counters.use > 0, ST.usingItem);
  f(p.isFalling, ST.falling);
  try {
    f(!!p.getComponent("minecraft:onfire"), ST.onFire);
    f(!!p.getEffect("invisibility") || p.getGameMode() === GameMode.Spectator, ST.hidden);
    const hp = p.getComponent("minecraft:health");
    f(hp && hp.currentValue <= 0, ST.dead);
  } catch {
    /* componente indisponível neste tick */
  }
  return st;
}

/** Espelha o item da mão do player na entidade (osso rightItem/leftItem). */
function mirrorEquipment(s, main, off) {
  const e = s.entity;
  for (const [slot, item, key] of [["slot.weapon.mainhand", main, "main"], ["slot.weapon.offhand", off, "off"]]) {
    const id = item?.typeId ?? "minecraft:air";
    if (s.sync[`eq_${key}`] === id) continue;
    s.sync[`eq_${key}`] = id;
    try {
      e.runCommand(`replaceitem entity @s ${slot} 0 ${id}`);
    } catch {
      s.sync[`eq_${key}`] = undefined; // tenta de novo no próximo tick
    }
  }
}

function armorBits(eq) {
  let a = 0;
  const has = (slot) => !!eq.getEquipment(slot);
  if (has(EquipmentSlot.Head)) a |= ARMOR.helmet;
  const chest = eq.getEquipment(EquipmentSlot.Chest);
  if (chest) a |= chest.typeId === "minecraft:elytra" ? ARMOR.elytra : ARMOR.chest;
  if (has(EquipmentSlot.Legs)) a |= ARMOR.legs;
  if (has(EquipmentSlot.Feet)) a |= ARMOR.boots;
  return a;
}

/** Um tick de sincronização. */
export function syncSession(s) {
  const p = s.player;
  if (!p.isValid) return;
  try {
    if ((p.getComponent("minecraft:health")?.currentValue ?? 1) <= 0) {
      removeEntity(s); // morto: some até o playerSpawn
      return;
    }
  } catch {
    return;
  }
  const e = ensureEntity(s);
  if (!e) return;

  const loc = p.location;
  const rot = p.getRotation();
  const vel = p.getVelocity(); // blocos/tick
  const head = rot.y;
  const body = bodyYaw(s.sync, head, vel.x, vel.z);
  const yawSpeed = s.sync.body === undefined ? 0 : wrap(body - s.sync.body) * 20;
  s.sync.body = body;

  try {
    e.teleport(loc, { dimension: p.dimension, rotation: { x: 0, y: body }, keepVelocity: false });
  } catch {
    return;
  }

  s.sync.vehicle = vehicleKind(p);
  setProp(s, "yast:st", stateBits(p, s));
  setProp(s, "yast:veh", s.sync.vehicle);
  setProp(s, "yast:pitch", round(clamp(rot.x, -90, 90), 0.5));
  setProp(s, "yast:hyaw", round(wrap(head - body), 0.5));
  setProp(s, "yast:yspd", round(clamp(yawSpeed, -3000, 3000), 5));
  setProp(s, "yast:vx", round(clamp(vel.x * 20, -100, 100), 0.05));
  setProp(s, "yast:vy", round(clamp(vel.y * 20, -100, 100), 0.05));
  setProp(s, "yast:vz", round(clamp(vel.z * 20, -100, 100), 0.05));
  setProp(s, "yast:swing", s.counters.swing);
  setProp(s, "yast:hurt", s.counters.hurt);
  setProp(s, "yast:use", s.counters.use);

  // Coisas que mudam pouco: a cada 5 ticks basta.
  if (system.currentTick % 5 !== 0) return;
  try {
    const hp = p.getComponent("minecraft:health");
    if (hp) {
      setProp(s, "yast:hp", round(clamp(hp.currentValue, 0, 4096), 0.5));
      setProp(s, "yast:mhp", round(clamp(hp.effectiveMax, 1, 4096), 0.5));
    }
    const hunger = p.getComponent("minecraft:player.hunger");
    if (hunger) setProp(s, "yast:food", clamp(Math.round(hunger.currentValue), 0, 20));
    const eq = p.getComponent("minecraft:equippable");
    if (eq) {
      const main = eq.getEquipment(EquipmentSlot.Mainhand);
      const off = eq.getEquipment(EquipmentSlot.Offhand);
      setProp(s, "yast:main", itemCategory(main));
      setProp(s, "yast:off", itemCategory(off));
      setProp(s, "yast:armor", armorBits(eq));
      mirrorEquipment(s, main, off);
    }
  } catch {
    /* jogador saindo / componente indisponível */
  }
}
