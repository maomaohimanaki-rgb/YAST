# Roadmap

Status: ✅ feito · 🧪 feito, falta testar no jogo · ⏳ próximo · 💭 ideia

## 0.5.0 — arquitetura nova (este commit)

| Fase | O quê | Status |
|---|---|---|
| 1 | Menu (Chave do Menu → roda → coleções/modelos), DynamicProperty com id estável, restauração no `playerSpawn` | 🧪 |
| 2 | Gate de render: `yast:avatar_on` no player + animação de escala 0 (corpo, armadura, capa, item) | 🧪 |
| 3 | Entidade sombra: spawn/troca/teardown, teleporte por tick, yaw do corpo emulado, varredura de órfãos | 🧪 |
| 4 | Animações YSM na entidade: tradutor Molang, shim de propriedades, controlador principal, física second/first order, emotes, configs | 🧪 |
| 5 | Item na mão: ossos `rightItem`/`leftItem` nos locators, `replaceitem` espelhando a mão do player | 🧪 |
| 6 | Ações: golpe/dano/uso → contadores → controladores `swing`/`use`/`hurt`/`hold_*` | 🧪 |
| 7 | Teardown: reset (opção 0), morte, saída, troca de dimensão, `/reload` | 🧪 |
| — | Conversor roda nos 1136 modelos sem falha; Molang validado; IDs estáveis; packs por glob | ✅ |

### Checklist do primeiro teste no jogo (pack `debug`)

Abra o Content Log (Configurações → Criador → Content Log) antes de entrar.

- [ ] Nenhum erro de JSON/Molang no Content Log ao carregar o mundo.
- [ ] Chave do Menu abre a roda; **Avatares** lista os 29 modelos.
- [ ] Ao escolher: player some (3ª pessoa, F5), avatar aparece no lugar, nome do player continua visível.
- [ ] 1ª pessoa: avatar **não** tapa a câmera; braço vanilla aparece.
- [ ] Andar/correr/agachar/pular/nadar/elytra/dormir/barco: animação certa.
- [ ] Olhar para cima/baixo/lados: a cabeça segue **no sentido certo** (se inverter: trocar o sinal em `head_look`, `convert.py`).
- [ ] Corpo gira atrás da cabeça como no vanilla (não "trava" na câmera).
- [ ] Item na mão aparece na mão do avatar (se deslocado/rotacionado: ajustar o pivô do `rightItem` no conversor).
- [ ] Golpear mob/bloco anima o braço; levar dano anima `attacked`; comer/arco anima `use_*`.
- [ ] Magical Wine Fox: troca das 6 cores; Ajustes (esconder cajado / círculo) funcionam.
- [ ] Emote começa, termina sozinho (não-loop) e para ao andar ou em **Parar emote**.
- [ ] Sair e entrar no mundo: avatar e cor voltam sozinhos. Morrer e renascer: idem.
- [ ] Portal (Nether/End): avatar acompanha.
- [ ] **Resetar**: player volta a aparecer.
- [ ] Mobs continuam atacando/perseguindo normalmente; outro jogador consegue bater no player (o avatar não "rouba" o clique).
- [ ] Duas pessoas com avatar: cada uma vê o avatar da outra.
- [ ] `/kill @e[family=yast_avatar]`: avatar reaparece em ~1 s, sem dropar o item da mão.

## 0.5.x — polimento depois do primeiro teste

- ⏳ Ajustes finos que só o jogo mostra (sinal da cabeça, pivô do item, escala, limiar de 1ª pessoa).
- ⏳ Suavizar o atraso do teleporte (testar `minecraft:rideable` no player com assento para a
  família `yast_avatar` — o cliente posiciona o passageiro sem atraso; risco: lógica de
  desmontar dos papagaios).
- ⏳ Configs além de 12 por modelo: paginar por "grupo" ou empacotar checkboxes em bits.
- ⏳ Animações de armadura do YSM (`head:default`, `chest$minecraft:...`) e `hold_*` restantes.
- ⏳ Ícone por modelo no menu (renderizar a textura `avatar/` ou um recorte da skin).
- ⏳ Nome traduzido (pt-BR) por modelo: hoje usa en_us do YSM ou o nome da pasta.

## 0.6 — conteúdo

- 💭 Braço YSM em 1ª pessoa (attachable com `models/arm.json` + `arm.animation.json`).
- 💭 Acessórios por attachable em cima da entidade (chapéu, mochila) — os dois sistemas convivem.
- 💭 Sons de emote (`sounds/` dos modelos YSM) via `sound_definitions.json` gerado.
- 💭 Partículas YSM (`ysm.particle`) mapeadas para partículas vanilla.
- 💭 Revisão manual dos ~130 modelos com mais queries sem equivalente (ver `audit --report`).

## Versão final — distribuição em packs

Os 1100+ modelos somam ~2,6 GB de fonte; um único add-on é inviável no mobile.

- ⏳ Definir os packs em `packs/*.json` (ex.: `top100`, `300`, `500`, `1000`, `all`) por glob ou lista.
- ⏳ Medir tamanho/tempo de carregamento por pack no mobile e fixar um teto por pack.
- 💭 Packs "complementares" que adicionam modelos a um núcleo comum (exige mover
  `player.json`/menu para um pack base e cada pack de modelos registrar seu catálogo).
