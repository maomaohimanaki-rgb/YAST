# YAST

Adaptação do **Yes Steve Model (YSM)** do Java para o Minecraft Bedrock.

A partir da **0.5** o avatar não é mais um peitoral (attachable) preso ao player: é uma
**entidade sombra** que segue o jogador, enquanto o player real fica escondido só na
renderização. A IA dos mobs continua vendo o player normal (hitbox 1.8, sem `/effect invisibility`).

```
modelos_ysm/        ~1100 modelos YSM de origem (não editar à mão: é a "fonte")
tools/              conversor YSM -> Bedrock e montador de packs
  yast.py             CLI: ids | audit | build
  ysm2bedrock/        loader (3 formatos), tradutor Molang, gerador de entidade
addon/              núcleo escrito à mão (igual para todo pack)
  BP/                 scripts, player.json, Chave do Menu
  RP/                 player.entity.json (gate), render controller, roda de ações
packs/              definição dos add-ons gerados (debug, top100, all...)
catalog/            model_ids.json — ID estável de cada modelo (vai no save do jogador)
legacy/v0.4.25/     add-on antigo (attachable), guardado para referência
docs/               ARQUITETURA, ROADMAP, BUGS_LEGADO, PADRAO_MODELO
dist/               saída do build (ignorado pelo git)
```

## Gerar o add-on

Requer só Python 3.9+ (sem dependências).

```bash
python3 tools/yast.py ids                  # só quando entrar modelo novo em modelos_ysm/
python3 tools/yast.py build packs/debug.json
# -> dist/YAST_debug_v0.5.0.mcaddon  (abra no Minecraft para importar)
```

`python3 tools/yast.py audit --clean` converte **todos** os modelos sem montar pack e
lista falhas, Molang inválido e queries YSM sem equivalente. Rode antes de mexer no conversor.

## Usar no jogo

1. Ative BP + RP no mundo (os dois vêm no `.mcaddon`).
2. `/give @s yast:menu_key` e use o item.
3. **Avatares** → coleção → modelo. Se o modelo tem várias cores, a roda de **Cor** abre em seguida.
4. **Emotes**, **Ajustes** (opções do YSM: checkbox / rádio / slider) e **Resetar** ficam na roda principal.

O avatar escolhido fica salvo no jogador e volta sozinho ao entrar no mundo.

## Estado atual

0.5.0 é a primeira versão da arquitetura nova: **ainda não foi testada dentro do jogo**.
O conversor foi validado em todos os 1136 modelos (JSON, sintaxe Molang e referências), e os
scripts foram checados contra as definições oficiais da Script API 2.9.0 (Minecraft 1.26.50 ou mais novo) — mas comportamento
visual (alinhamento do item na mão, sentido de rotação, atraso do teleporte) só o jogo confirma.
Veja o checklist em [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Licenças

Cada modelo mantém a licença declarada pelo autor no `ysm.json`/`info.json`; o build gera um
`CREDITS.txt` dentro do BP e do RP com nome, licença e autores de cada modelo incluído.
Modelos CC BY-NC-SA não podem ser usados comercialmente.
