# Bugs encontrados no 0.4.25 (attachable)

Análise do código em `legacy/v0.4.25/`. Todos ficam resolvidos pela arquitetura 0.5
(não há mais peitoral, item-sinal nem efeito de invisibilidade), mas ficam registrados
porque alguns são de perda de item.

## Graves

1. **Perda do item da mão secundária** — `MoreSkinsB/scripts/main.js`, `pulseOffhand()`.
   O item original da mão esquerda fica só num `Map` em memória durante os 6 ticks do sinal.
   Se o jogador desconectar, morrer ou trocar de dimensão nesse intervalo, o `runTimeout`
   não restaura (ou o jogador já não é válido) e o item-sinal `yast:signal_*` fica salvo no
   lugar — o item original (totem, escudo, mapa…) é apagado.
2. **Item-sinal vaza para o inventário** — mesmo trecho. Se nos 6 ticks o jogador mover o
   item-sinal da mão secundária (ou trocar mão principal/secundária), a restauração só olha se
   o slot ainda começa com `yast:signal_`; não começa, então não restaura: o sinal fica no
   inventário e o item original some.
3. **Totem desativado por 6 ticks** — durante cada emote/toggle o totem da mão secundária sai
   do slot; dano letal nesse intervalo mata sem o totem disparar. Idem escudo erguido.
4. **Estado dos toggles dessincroniza** — os toggles (`v.roaming_*`) vivem em variáveis do
   cliente, mas o ON/OFF é salvo em DynamicProperty. Não existe `playerSpawn` reaplicando os
   sinais: ao reentrar no mundo o menu mostra "ON" e o modelo está no padrão. Jogadores que
   entram depois (ou que estavam longe/fora do alcance de render) nunca recebem o pulso e
   veem o estado padrão. Com ping > ~300 ms o cliente pode perder o pulso de 6 ticks inteiro.

## Médios

5. **Invisibilidade todo tick** (`functions/tick.json` → `ysm_effects.mcfunction`, `*_eff`):
   `effect ... invisibility` em quem usa o peitoral quebra a detecção dos mobs (era o problema
   que motivou a 0.5) e roda 7 funções com seletores `hasitem` sobre `@a`/**`@e`** a cada tick.
6. **Avatar ocupa o slot de peito**: sem armadura de peito (proteção 0) e sem elytra enquanto
   o avatar está ativo.
7. **Duas fontes de verdade para as ações**: `VALID_ACTIONS`/`SET_VALUES` em `main.js` repetem
   os comandos de `chestplate_registry.js`. Hoje estão consistentes (199 comandos conferidos),
   mas qualquer edição em um só dos dois quebra o botão silenciosamente.
8. **Round-trip por comando**: o menu executa `scriptevent yast:action ...` via
   `player.runCommand` para o próprio script ler de volta — custo e um ponto de falha a mais.
9. **185 itens-sinal registrados** (`items/signals/`), obtêm-se por `/give` e aparecem em busca.

## Fidelidade de conversão (conversor antigo)

10. A física `second_order` usava `k3 * entrada` no lugar de `k3 * derivada da entrada`
    (fórmula diferente da do YSM): o parâmetro `r` (resposta/antecipação) não tinha efeito.
11. Parte das expressões com `ysm.head_yaw`/`head_pitch` fora do osso da cabeça foi descartada
    (ex.: `parallel1` do Magical Wine Fox perdeu o movimento dos olhos seguindo a câmera).
12. Olhar para cima/baixo limitado a ±60° (`head_look`); o player vai a ±90°.

## Já corrigido no 0.5 (problemas que apareceriam na migração)

* IDs por índice no save → IDs estáveis (`catalog/model_ids.json`).
* Modelos com nomes de arquivo em chinês extraídos com `#Uxxxx` (Kluonoa perdia todas as
  animações) → nomes decodificados em `modelos_ysm/_WineFox`.
* 4 `ysm.json` com JSON inválido (vírgula faltando, caractere de controle) → leitor tolerante.
