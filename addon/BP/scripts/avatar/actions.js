// =====================================================================
// actions.js — eventos do player que viram animação na entidade (Fase 6).
//
// A animação do braço da entidade não copia o player sozinha: cada ação vira
// um contador (yast:swing / yast:hurt) ou estado (yast:use) que o controlador
// gerado lê. Contador em vez de booleano = o mesmo golpe repetido reinicia a
// animação, sem precisar "desligar" no tick seguinte.
// =====================================================================
import { world, EquipmentSlot } from "@minecraft/server";
import { sessions } from "./manager.js";

function bump(player, key) {
  const s = sessions.get(player?.id);
  if (s) s.counters[key] = (s.counters[key] + 1) % 256;
}

function isPlayer(e) {
  return e?.typeId === "minecraft:player";
}

export function registerActionEvents() {
  // API 2.9 (1.26.50+): todo golpe, inclusive no ar. Os eventos de acerto ficam só
  // de reserva caso o evento não exista, para não contar o mesmo golpe duas vezes.
  if (world.afterEvents.playerSwingStart) {
    world.afterEvents.playerSwingStart.subscribe((ev) => bump(ev.player, "swing"));
  } else {
    world.afterEvents.entityHitEntity.subscribe((ev) => {
      if (isPlayer(ev.damagingEntity)) bump(ev.damagingEntity, "swing");
    });
    world.afterEvents.entityHitBlock.subscribe((ev) => {
      if (isPlayer(ev.damagingEntity)) bump(ev.damagingEntity, "swing");
    });
    world.afterEvents.playerPlaceBlock.subscribe((ev) => bump(ev.player, "swing"));
    world.afterEvents.playerInteractWithBlock.subscribe((ev) => {
      if (ev.isFirstEvent) bump(ev.player, "swing");
    });
  }

  world.afterEvents.entityHurt.subscribe(
    (ev) => bump(ev.hurtEntity, "hurt"),
    { entityTypes: ["minecraft:player"] },
  );

  world.afterEvents.itemStartUse.subscribe((ev) => {
    const s = sessions.get(ev.source.id);
    if (!s) return;
    let hand = 1;
    try {
      const eq = ev.source.getComponent("minecraft:equippable");
      const main = eq?.getEquipment(EquipmentSlot.Mainhand);
      const off = eq?.getEquipment(EquipmentSlot.Offhand);
      if (main?.typeId !== ev.itemStack?.typeId && off?.typeId === ev.itemStack?.typeId) hand = 2;
    } catch {
      /* assume mão principal */
    }
    s.counters.use = hand;
  });
  const stop = (ev) => {
    const s = sessions.get(ev.source.id);
    if (s) s.counters.use = 0;
  };
  world.afterEvents.itemStopUse.subscribe(stop);
  world.afterEvents.itemReleaseUse.subscribe(stop);
  world.afterEvents.itemCompleteUse.subscribe(stop);
}
