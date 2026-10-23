# Packs

Cada arquivo `*.json` aqui define **um add-on** gerado por `python3 tools/yast.py build packs/<arquivo>.json`.

```json
{
  "name": "top100",            // vira YAST_top100_BP / _RP e o nome do .mcaddon
  "version": [0, 5, 0],
  "uuid_seed": "top100",       // opcional; UUIDs são derivados disso (estáveis entre builds)
  "models": ["_GenshinImpact/*", "_WineFox/05_magical"],   // globs sobre modelos_ysm/
  "exclude": ["_GenshinImpact/*_old"]
}
```

* Os IDs dos modelos vêm de `catalog/model_ids.json`, então o mesmo avatar tem o mesmo ID em
  qualquer pack — o save do jogador sobrevive à troca de pack de 100 para 500.
* Packs diferentes têm UUIDs diferentes: **não ative dois packs YAST no mesmo mundo**
  (os dois sobrescrevem `player.json`/`player.entity.json`).
