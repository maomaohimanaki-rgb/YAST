# Padrão para adicionar modelos

Regra: **nenhum modelo é editado à mão no add-on.** Tudo sai do conversor. Se um modelo
precisa de correção, ou o conversor aprende a regra (vale para todos), ou a fonte em
`modelos_ysm/` é corrigida. Assim um bug achado num personagem é corrigido em todos.

## Passo a passo

1. Coloque a pasta do modelo em `modelos_ysm/_<Coleção>/<Modelo>/` (formato YSM 2 `ysm.json`,
   YSM 1 `info.json` ou só `main.json` + `main.animation.json` + `texture.png`).
   Limpe animações de mods Java (TaC, CarryOn, TLM, SlashBlade...) como nas demais.
2. `python3 tools/yast.py ids` — gera o ID estável. **Commite `catalog/model_ids.json`.**
   Nunca edite/remova um ID existente: ele está salvo no mundo dos jogadores.
3. `python3 tools/yast.py audit --only '_<Coleção>/<Modelo>'` — deve dar 0 falhas e
   0 erros de Molang. Leia a lista de "não suportados": se for algo comum, ensine o conversor
   (`tools/ysm2bedrock/molang.py`, tabela `SIMPLE` ou um handler).
4. Inclua no pack de teste (`packs/debug.json`), `build`, teste no jogo.

## O que o conversor garante para todo modelo

* `yast:av_<id>`, `geometry.yast.<id>`, `animation.yast.<id>.*`, `controller.animation.yast.<id>.*`.
* As mesmas 32 propriedades e o mesmo shim (ver `docs/ARQUITETURA.md`).
* Ossos `rightItem`/`leftItem` filhos de `RightHandLocator`/`LeftHandLocator`.
* `head_look` no osso `Head` (o YSM faz isso em código); `ysm.head_pitch/yaw` já usados no
  próprio osso `Head` pelas animações são zerados para não somar duas vezes.
* Animações `pre_parallelN`/`parallelN` sempre ligadas; controladores próprios do modelo
  (YSM 2) traduzidos e ligados.
* Cores = texturas do `ysm.json` (até 16), nome vindo do `lang/en_us.json` quando existe.
* Emotes = `extraN` com nome (`extra_animation`, `extra_animation_classify`, `info.json`).
* Ajustes = `extra_animation_buttons[].config_forms` (checkbox, radio, range — até 12).

## Convenções de nome

* Coleção = pasta de primeiro nível sem o `_` (`_GenshinImpact` → "GenshinImpact").
* ID = nome da pasta em minúsculas com `_` (`GI_Furina` → `gi_furina`); começa com número →
  prefixo da coleção (`_WineFox/05_magical` → `winefox_05_magical`); colisão ou nome sem
  letras latinas → hash curto do caminho.
