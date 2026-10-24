# Arquitetura 0.5 — entidade sombra

## Fluxo ponta a ponta

```
[Chave do Menu yast:menu_key]
   └─ world.afterEvents.itemUse ─► ui/menu.js (roda + listas)
        └─ escolhe modelo ─► avatar/manager.activate()
              ├─ DynamicProperty  yast:avatar = "<id>"            (fonte única de verdade)
              ├─ player.setProperty("yast:avatar_on", true) ─► RP esconde o player (gate)
              └─ dimension.spawnEntity("yast:av_<id>")            (entidade sombra)
   todo tick: avatar/sync.js
        ├─ teleport(posição do player, rotação do CORPO emulada)
        └─ setProperty(yast:*) só quando muda ─► shim no RP ─► v.yq_* ─► animações YSM
   eventos: avatar/actions.js  golpe → yast:swing++, dano → yast:hurt++, uso → yast:use
   playerSpawn ─► manager.restore() (login, respawn, portal)
   playerLeave ─► remove a entidade (save fica)
   a cada 100 ticks ─► sweep() remove avatares órfãos
```

## Onde segui a spec e onde mudei (e por quê)

| Spec | Implementado | Motivo |
|---|---|---|
| `setDynamicProperty("meuaddon:avatar_ativo", índice)` | `yast:avatar = "<id estável>"` | Com índice, o "avatar 37" do pack de 100 vira outro personagem no pack de 500. O id vem de `catalog/model_ids.json` e nunca muda. |
| Gate com `query.has_tag('avatar_ativo')` | `query.property('yast:avatar_on')` (propriedade do player) | Tags **não** chegam ao cliente no Molang; propriedades com `client_sync` chegam. Exige sobrescrever `BP/entities/player.json` (ver Limitações). |
| Esconder ossos com `part_visibility` | animação `animation.yast.player.hide` com `scale: 0` em root/body/braços/rightItem/leftItem | `part_visibility` esconde os cubos mas o item da mão continua sendo desenhado no osso. Escala 0 no osso some com corpo, armadura, capa **e** item. |
| Menu com 51 botões | roda principal + lista por coleção (40 por página) | Com 1100 modelos, 51 botões não cabem. A roda de 0.4.x foi mantida (mesmo protocolo de 15 botões). Opção 0 = **Resetar**. |
| Uma página por variação de cor | um modelo, várias texturas (`yast:var`) | Ex.: Magical Wine Fox = 1 entrada com 6 cores. Render controller único indexa `Texture.v0..v15`. |
| Reaproveitar `animation.player.*` com hierarquia canônica | animações do próprio YSM | Os modelos YSM já trazem idle/walk/run/sneak/swim/... feitos para o rig deles; reaproveitar as do player perderia toda a fidelidade. Só foram adicionados `rightItem`/`leftItem` (filhos de `RightHandLocator`/`LeftHandLocator`). |
| `entity.getComponent('equippable').setEquipment` na entidade | `replaceitem entity @s slot.weapon.mainhand` | Até a API 2.9.0 o componente `equippable` só existe em players. Encantamento (brilho) não é copiado. |
| Prefixo `ysm_` nos ossos | removido | Ele existia porque o attachable usava o rig do player e ossos chamados `Head`, `Body`... herdavam a pose vanilla. Numa entidade própria nenhum osso tem comportamento automático. |

## O contrato padronizado (todo modelo igual)

Todo `yast:av_<id>` tem **as mesmas 32 propriedades** (`tools/ysm2bedrock/convert.py: PROPERTIES`)
e o mesmo *shim* no `pre_animation`, que converte propriedade → variável:

| Propriedade | Shim | Origem (sync.js) |
|---|---|---|
| `yast:st` (bits) | `q.is_sneaking`, `q.is_on_ground`, ... | `player.isSneaking` etc. |
| `yast:vx/vy/vz` | `v.yq_ground_speed`, `v.yq_vertical_speed`, `q.position_delta` | `getVelocity()` × 20 |
| `yast:pitch`, `yast:hyaw` | `ysm.head_pitch` = −pitch (YSM: positivo = cima), `ysm.head_yaw` (suavizados) | `getRotation()` (pitch positivo = baixo, como o Bedrock) − yaw do corpo |
| `yast:yspd` | `q.yaw_speed` | variação do yaw do corpo |
| `yast:hp/mhp/food` | `q.health`, `q.max_health`, `ysm.food_level` | componentes health/hunger |
| `yast:main/off` | `ctrl.hold(...)`, `ysm.has_mainhand` | categoria do item (espada, arco...) |
| `yast:armor` (bits) | `ysm.has_helmet`... | slots de armadura |
| `yast:swing/hurt` (contadores) | estados de golpe/dano | eventos |
| `yast:use` | `ctrl.use(...)`, `q.is_using_item` | itemStartUse/Stop |
| `yast:veh` | escolhe boat / ride / ride_pig / sit | entidade montada |
| `yast:act/aseq` | estados `extra_N` do controlador principal | menu de emotes |
| `yast:var` | textura | menu de cor |
| `yast:c0..c11` | `v.roaming.*` das configs do YSM | menu de ajustes |

O conversor reescreve **toda** expressão Molang dos modelos com essa tabela
(`tools/ysm2bedrock/molang.py`). Query sem equivalente vira `0` e entra no relatório;
expressão que não compila no Bedrock é descartada (o parser `molang_check.py` roda em todo build).

Física do YSM (`ysm.second_order(nome, x, f, ζ, r)`, `ysm.first_order`) é reimplementada
no `pre_animation` com a fórmula de *Second Order Dynamics* (k1 = ζ/πf, k2 = 1/(2πf)², k3 = rζ/2πf),
um estado por nome — igual ao YSM.

### Controlador principal

YSM decide a pose (idle/walk/run/...) em código Java. Aqui, um `pre_animation` calcula
`v.yq_want` com a mesma prioridade do conversor 0.4.x (morte > dormir > montado > elytra >
nadar > escada > agachado > voando/caindo > correr > andar > idle) e o controlador `main` só
transiciona para `v.yq_want`. Os emotes são estados do **mesmo** controlador: no Bedrock as
animações somam, então emote e idle ao mesmo tempo dariam pose dobrada.

## Limitações conhecidas

* **`player.json` e `player.entity.json` são sobrescritos.** Outro add-on que também sobrescreve
  o player conflita (o último da lista vence). Sem `yast:avatar_on` o player não some.
* **Hitbox** é a do player (1.8). O avatar é só visual — inclusive o tamanho (`width/height_scale` do YSM é ignorado).
* **Primeira pessoa:** o avatar some quando a câmera está a menos de 1,9 bloco dele
  (`q.distance_from_camera`); fica o braço vanilla. Braço YSM em 1ª pessoa está no roadmap.
* **Predição linear (dead reckoning):** o servidor recebe a posição do player com atraso e o
  cliente ainda interpola a entidade, então o avatar ficaria ~1 passo atrás. `sync.js` posiciona
  o avatar em `posição + velocidade × leadTicks`, com a velocidade **medida** pelo deslocamento
  real entre ticks (vale montado/knockback), filtro exponencial (0,6), limite de 1,5 bloco,
  sem prever Y no chão e sem prever em teleporte (> 4 blocos/tick). O giro da cabeça/corpo é
  previsto igual (máx. 35°). Padrão: 2 ticks; calibre no jogo com `/scriptevent yast:lead <0..6>`
  (fica salvo no mundo; sem número mostra o valor atual). Com ping alto, aumente.
* **Versão mínima: Minecraft 1.26.50** (`@minecraft/server` 2.9.0, `@minecraft/server-ui` 2.1.0).
  O golpe (inclusive no ar) vem de `playerSwingStart`; se o evento não existir, o código cai para
  os eventos de acerto em entidade/bloco.
* Máximo de 12 configs e 16 cores por modelo (limite de 32 propriedades por entidade).
* Física/partículas que dependem de `ysm.bone_rot`, `ysm.particle`, mods (TaC, SlashBlade...) viram 0.

## Regras do YSM reproduzidas (teste 02)

* **Prioridade**: `pre_parallelN` < animação principal (idle, run, emote...) < `parallelN`.
  No Bedrock tudo soma/multiplica; o conversor neutraliza o canal do `pre_parallel` enquanto um
  estado principal que mexe no mesmo osso está ativo (`_pre_parallel_priority`).
* **Brilho**: ossos `ysmGlow*` (13.550 nos modelos) saem num 2º render controller com
  `ignore_lighting`, então brilham no escuro independente do alfa da textura.
* **Configs**: `yast:cN = -99999` significa "o jogador nunca mexeu" e o modelo usa o próprio
  padrão (`v.x ?? N`). A propriedade só é aplicada quando muda, para não desfazer variáveis que
  o próprio modelo altera (transformação).
* **Física de busto padrão** para modelos que têm o osso e não o animam.
* **Emotes** acabam com Parar, outro emote, morte, fim (sem loop) ou ao se mexer. Extras listados em
  `catalog/estados.json` (ex.: "Hide" da Momo) são **estados**: liga/desliga na roda principal, não cancelam ao andar.
* **Versão**: `0.5.<build>` (`catalog/build.json`), visível no título da roda.

## Regras do Bedrock descobertas no jogo (teste 04)

* **Keyframes até o fim da animação** (teste 05, confirmado com cópias de diagnóstico): depois do último
  keyframe o Bedrock não segura o valor. O conversor repete o último keyframe em `animation_length`.
* **Keyframe objeto precisa de `pre` e `post`.** O YSM grava muitos keyframes só com `post`.
  Entre keyframes funciona, mas depois do último o Bedrock usa o `pre` ausente (0): uma escala
  vira 0. O piscar da Mini (0–0,29 s de 4 s) e da Furina (0–0,5 s de 7 s) deixava o olho com
  escala 0 o resto do tempo — ele só aparecia durante o piscar. O conversor sempre grava os dois.
* **Canal com valor solto** (`"scale": 0`, `"scale": "expr"`) vira `[x, x, x]` (uniforme, como no YSM).
* **Sinal do olhar:** `ysm.head_pitch` é positivo olhando para **cima** (o olho da Furina/Hanfu sobe
  com ele); a rotação X do Bedrock é positiva para **baixo**. A animação do olhar usa `-v.yq_pitch`.

## Ajustes em jogo (sem rebuild)

| Comando | Efeito |
|---|---|
| `/scriptevent yast:lead <0..6>` | ticks de predição (padrão 3) |
| `/scriptevent yast:sync impulse\|teleport` | modo de movimento do avatar |
| `/scriptevent yast:axis pitch\|yaw 1\|-1` | sinal do olhar (cabeça/cabelo) |

Todos ficam salvos no mundo.

## Diagnóstico sem o jogo

`tools/ysm2bedrock/simulate.py` + `molang_eval.py`: interpretador de Molang com a semântica do
Bedrock (variável inexistente zera a expressão etc.). Roda initialize, pre_animation,
controladores e animações dos primeiros frames e calcula a escala real de cada osso —
mostra modelo invisível, tamanho errado e acessórios ligados/desligados.
