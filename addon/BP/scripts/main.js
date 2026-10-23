// =====================================================================
// YAST 0.5 — avatares YSM como entidade sombra.
//
//   [Chave do Menu] -> menu (ui/menu.js)
//   escolha         -> DynamicProperty yast:avatar (avatar/store.js)
//                   -> player.setProperty("yast:avatar_on") esconde o player no RP
//                   -> spawna yast:av_<id> (avatar/manager.js)
//   todo tick       -> teleporte + Entity Properties (avatar/sync.js)
//   eventos         -> golpe/uso/dano viram animação (avatar/actions.js)
// =====================================================================
import { world, system } from "@minecraft/server";
import { ITEM_MENU_KEY, SWEEP_INTERVAL_TICKS } from "./config.js";
import { openMenu } from "./ui/menu.js";
import { sessions, restore, dropSession, sweep } from "./avatar/manager.js";
import { syncSession } from "./avatar/sync.js";
import { registerActionEvents } from "./avatar/actions.js";

world.afterEvents.itemUse.subscribe((ev) => {
  if (ev.itemStack?.typeId === ITEM_MENU_KEY && ev.source?.typeId === "minecraft:player") {
    openMenu(ev.source).catch((e) => console.warn(`[YAST] menu: ${e}`));
  }
});

// Login, respawn após morte e troca de dimensão por portal passam por aqui.
world.afterEvents.playerSpawn.subscribe((ev) => restore(ev.player));

world.afterEvents.entityDie.subscribe(
  (ev) => {
    const s = sessions.get(ev.deadEntity.id);
    if (s?.entity?.isValid) {
      try {
        s.entity.remove();
      } catch {
        /* ignore */
      }
    }
  },
  { entityTypes: ["minecraft:player"] },
);

world.beforeEvents.playerLeave.subscribe((ev) => {
  const id = ev.player.id;
  system.run(() => dropSession(id));   // before-event é somente leitura
});

registerActionEvents();

// /reload ou mundo carregado com jogadores já dentro: reconstrói tudo.
system.run(() => {
  sweep();
  for (const p of world.getAllPlayers()) restore(p);
});

system.runInterval(() => {
  for (const s of sessions.values()) {
    try {
      syncSession(s);
    } catch (e) {
      console.warn(`[YAST] sync ${s.model.id}: ${e}`);
    }
  }
}, 1);

system.runInterval(sweep, SWEEP_INTERVAL_TICKS);
