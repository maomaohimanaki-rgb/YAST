// =====================================================================
// chestplate_registry.js — Perfis da roda integrada YAST mobile 0.4.24
// Os perfis foram mapeados a partir de extra_animation / extra_animation_buttons
// do YSM 2.6.5 e limitados às animações/variáveis que existem nesta portabilidade Bedrock.
// Guia do menu: GUIA_COMPLETO.md (mantido no pacote-fonte do projeto).
// =====================================================================
export const DEBUG = false;
export const FECHAR_AO_ALTERNAR = true;
export const ITEM_ABRIR_MENU = "yast:menu_key";

const profile_wf01 = {
  "name": "Wine Fox • Taisho",
  "menu": [
    "emotes"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra0",
          "label": "Forma",
          "command": "scriptevent yast:action wf01 extra0"
        },
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf01 extra1"
        },
        {
          "id": "extra2",
          "label": "Palmas",
          "command": "scriptevent yast:action wf01 extra2"
        },
        {
          "id": "extra3",
          "label": "Get Down",
          "command": "scriptevent yast:action wf01 extra3"
        },
        {
          "id": "extra4",
          "label": "Dança 1",
          "command": "scriptevent yast:action wf01 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf01 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf01 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança 2",
          "command": "scriptevent yast:action wf01 extra7"
        }
      ]
    }
  }
};

const profile_wf02 = {
  "name": "Wine Fox • Ano Novo",
  "menu": [
    "emotes"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra0",
          "label": "Forma",
          "command": "scriptevent yast:action wf02 extra0"
        },
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf02 extra1"
        },
        {
          "id": "extra2",
          "label": "Palmas",
          "command": "scriptevent yast:action wf02 extra2"
        },
        {
          "id": "extra3",
          "label": "Sim",
          "command": "scriptevent yast:action wf02 extra3"
        },
        {
          "id": "extra4",
          "label": "Não",
          "command": "scriptevent yast:action wf02 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf02 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf02 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança",
          "command": "scriptevent yast:action wf02 extra7"
        }
      ]
    }
  }
};

const profile_wf03 = {
  "name": "Wine Fox • Astronauta",
  "menu": [
    "emotes"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "auto_extra0",
          "label": "Emote 1",
          "command": "scriptevent yast:action wf03 extra0"
        },
        {
          "id": "auto_extra1",
          "label": "Emote 2",
          "command": "scriptevent yast:action wf03 extra1"
        },
        {
          "id": "auto_extra2",
          "label": "Emote 3",
          "command": "scriptevent yast:action wf03 extra2"
        },
        {
          "id": "auto_extra3",
          "label": "Emote 4",
          "command": "scriptevent yast:action wf03 extra3"
        },
        {
          "id": "auto_extra4",
          "label": "Emote 5",
          "command": "scriptevent yast:action wf03 extra4"
        },
        {
          "id": "auto_extra5",
          "label": "Emote 6",
          "command": "scriptevent yast:action wf03 extra5"
        }
      ]
    }
  }
};

const profile_wf04 = {
  "name": "Wine Fox • Kung Fu",
  "menu": [],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {}
};

const profile_wf05 = {
  "name": "Wine Fox • Mágica",
  "menu": [
    "emotes",
    "acessorios"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "acessorios": {
      "label": "Acessórios",
      "exclusivo": false,
      "itens": [
        {
          "id": "staff",
          "label": "Esconder",
          "command": "scriptevent yast:set wf05 roaming_staffhide 1",
          "commandOff": "scriptevent yast:set wf05 roaming_staffhide 0"
        },
        {
          "id": "circulo",
          "label": "Círculo",
          "command": "scriptevent yast:set wf05 roaming_c 1",
          "commandOff": "scriptevent yast:set wf05 roaming_c 0"
        }
      ]
    },
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "auto_extra2",
          "label": "Emote 3",
          "command": "scriptevent yast:action wf05 extra2"
        }
      ]
    }
  }
};

const profile_wf06 = {
  "name": "Wine Fox • Hanfu",
  "menu": [],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {}
};

const profile_wf07 = {
  "name": "Wine Fox • JK",
  "menu": [
    "emotes"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra0",
          "label": "Adereço",
          "command": "scriptevent yast:action wf07 extra0"
        },
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf07 extra1"
        },
        {
          "id": "extra2",
          "label": "Palmas",
          "command": "scriptevent yast:action wf07 extra2"
        },
        {
          "id": "extra3",
          "label": "Sim",
          "command": "scriptevent yast:action wf07 extra3"
        },
        {
          "id": "extra4",
          "label": "Não",
          "command": "scriptevent yast:action wf07 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf07 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf07 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança",
          "command": "scriptevent yast:action wf07 extra7"
        }
      ]
    }
  }
};

const profile_wf11 = {
  "name": "Wine Fox • Vendedora",
  "menu": [],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {}
};

const profile_wf12 = {
  "name": "Wine Fox • Little",
  "menu": [
    "emotes"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra0",
          "label": "Forma",
          "command": "scriptevent yast:action wf12 extra0"
        },
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf12 extra1"
        },
        {
          "id": "extra2",
          "label": "Palmas",
          "command": "scriptevent yast:action wf12 extra2"
        },
        {
          "id": "extra3",
          "label": "Get Down",
          "command": "scriptevent yast:action wf12 extra3"
        },
        {
          "id": "extra4",
          "label": "Dança",
          "command": "scriptevent yast:action wf12 extra4"
        },
        {
          "id": "extra5",
          "label": "Abanar",
          "command": "scriptevent yast:action wf12 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf12 extra6"
        },
        {
          "id": "extra7",
          "label": "Chorar",
          "command": "scriptevent yast:action wf12 extra7"
        }
      ]
    }
  }
};

const profile_wf13 = {
  "name": "Wine Fox • Madura",
  "menu": [
    "emotes",
    "acessorios"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf13 extra1"
        },
        {
          "id": "extra2",
          "label": "Palmas",
          "command": "scriptevent yast:action wf13 extra2"
        },
        {
          "id": "extra3",
          "label": "Get Down",
          "command": "scriptevent yast:action wf13 extra3"
        },
        {
          "id": "extra4",
          "label": "Dança",
          "command": "scriptevent yast:action wf13 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf13 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf13 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança 2",
          "command": "scriptevent yast:action wf13 extra7"
        }
      ]
    },
    "acessorios": {
      "label": "Acessórios",
      "exclusivo": false,
      "itens": [
        {
          "id": "guarda_chuva",
          "label": "Guarda-ch.",
          "command": "scriptevent yast:set wf13 roaming_umbrella 1",
          "commandOff": "scriptevent yast:set wf13 roaming_umbrella 0"
        }
      ]
    }
  }
};

const profile_wf14 = {
  "name": "Wine Fox • Momo",
  "menu": [
    "emotes",
    "tamanho",
    "espada",
    "acessorios"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "esconder",
          "label": "Esconder",
          "command": "scriptevent yast:action wf14 a011b70"
        },
        {
          "id": "danca_fox",
          "label": "Dança Fox",
          "command": "scriptevent yast:action wf14 a5e774d"
        },
        {
          "id": "acenar",
          "label": "Acenar",
          "command": "scriptevent yast:action wf14 a61bcda"
        },
        {
          "id": "auto_a6f370b",
          "label": "Emote 2",
          "command": "scriptevent yast:action wf14 a6f370b"
        },
        {
          "id": "auto_a1f5b0b",
          "label": "Emote 4",
          "command": "scriptevent yast:action wf14 a1f5b0b"
        },
        {
          "id": "auto_acbc8fc",
          "label": "Emote 5",
          "command": "scriptevent yast:action wf14 acbc8fc"
        },
        {
          "id": "auto_af7ce99",
          "label": "Emote 6",
          "command": "scriptevent yast:action wf14 af7ce99"
        },
        {
          "id": "auto_ab57a33",
          "label": "Emote 7",
          "command": "scriptevent yast:action wf14 ab57a33"
        },
        {
          "id": "auto_a224e2c",
          "label": "Emote 8",
          "command": "scriptevent yast:action wf14 a224e2c"
        },
        {
          "id": "auto_dooble",
          "label": "Emote 9",
          "command": "scriptevent yast:action wf14 dooble"
        },
        {
          "id": "auto_a5fcf14",
          "label": "Emote 10",
          "command": "scriptevent yast:action wf14 a5fcf14"
        },
        {
          "id": "auto_a98f4e2",
          "label": "Emote 12",
          "command": "scriptevent yast:action wf14 a98f4e2"
        },
        {
          "id": "auto_extra_ciallo",
          "label": "Emote 13",
          "command": "scriptevent yast:action wf14 extra_ciallo"
        }
      ]
    },
    "tamanho": {
      "label": "Tamanho",
      "exclusivo": true,
      "itens": [
        {
          "id": "tam_min",
          "label": "Mínimo",
          "command": "scriptevent yast:set wf14 player_size 0.2",
          "commandOff": "scriptevent yast:set wf14 player_size 1"
        },
        {
          "id": "tam_peq",
          "label": "Pequeno",
          "command": "scriptevent yast:set wf14 player_size 0.6",
          "commandOff": "scriptevent yast:set wf14 player_size 1"
        },
        {
          "id": "tam_normal",
          "label": "Normal",
          "command": "scriptevent yast:set wf14 player_size 1",
          "commandOff": "scriptevent yast:set wf14 player_size 1"
        },
        {
          "id": "tam_grande",
          "label": "Grande",
          "command": "scriptevent yast:set wf14 player_size 2",
          "commandOff": "scriptevent yast:set wf14 player_size 1"
        },
        {
          "id": "tam_max",
          "label": "Máximo",
          "command": "scriptevent yast:set wf14 player_size 5",
          "commandOff": "scriptevent yast:set wf14 player_size 1"
        }
      ]
    },
    "espada": {
      "label": "Espada",
      "exclusivo": true,
      "itens": [
        {
          "id": "espada_0",
          "label": "Nenhuma",
          "command": "scriptevent yast:set wf14 hold 0",
          "commandOff": "scriptevent yast:set wf14 hold 0"
        },
        {
          "id": "espada_1",
          "label": "Nível 1",
          "command": "scriptevent yast:set wf14 hold 1",
          "commandOff": "scriptevent yast:set wf14 hold 0"
        },
        {
          "id": "espada_3",
          "label": "Nível 3",
          "command": "scriptevent yast:set wf14 hold 3",
          "commandOff": "scriptevent yast:set wf14 hold 0"
        },
        {
          "id": "espada_5",
          "label": "Nível 5",
          "command": "scriptevent yast:set wf14 hold 5",
          "commandOff": "scriptevent yast:set wf14 hold 0"
        },
        {
          "id": "espada_10",
          "label": "Nível 10",
          "command": "scriptevent yast:set wf14 hold 10",
          "commandOff": "scriptevent yast:set wf14 hold 0"
        }
      ]
    },
    "acessorios": {
      "label": "Acessórios",
      "exclusivo": false,
      "itens": [
        {
          "id": "mochila",
          "label": "Mochila",
          "command": "scriptevent yast:set wf14 roaming_back 1",
          "commandOff": "scriptevent yast:set wf14 roaming_back 0"
        }
      ]
    }
  }
};

const profile_wf16 = {
  "name": "Wine Fox • Táticas",
  "menu": [
    "emotes",
    "acessorios"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf16 extra1"
        },
        {
          "id": "extra2",
          "label": "Cintura",
          "command": "scriptevent yast:action wf16 extra2"
        },
        {
          "id": "extra3",
          "label": "Get Down",
          "command": "scriptevent yast:action wf16 extra3"
        },
        {
          "id": "extra4",
          "label": "Dança",
          "command": "scriptevent yast:action wf16 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf16 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf16 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança 2",
          "command": "scriptevent yast:action wf16 extra7"
        }
      ]
    },
    "acessorios": {
      "label": "Acessórios",
      "exclusivo": false,
      "itens": [
        {
          "id": "arma",
          "label": "Arma",
          "command": "scriptevent yast:set wf16 roaming_gun 1",
          "commandOff": "scriptevent yast:set wf16 roaming_gun 0"
        },
        {
          "id": "oculos",
          "label": "Óculos",
          "command": "scriptevent yast:set wf16 roaming_humujing 1",
          "commandOff": "scriptevent yast:set wf16 roaming_humujing 0"
        }
      ]
    }
  }
};

const profile_wf17 = {
  "name": "Wine Fox • Mini",
  "menu": [
    "emotes",
    "olhos",
    "boca",
    "tipo_olho",
    "tamanho"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf17 extra1"
        },
        {
          "id": "extra2",
          "label": "Palmas",
          "command": "scriptevent yast:action wf17 extra2"
        },
        {
          "id": "extra3",
          "label": "Perform.",
          "command": "scriptevent yast:action wf17 extra3"
        },
        {
          "id": "extra4",
          "label": "Negar",
          "command": "scriptevent yast:action wf17 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf17 extra5"
        },
        {
          "id": "extra6",
          "label": "Swing",
          "command": "scriptevent yast:action wf17 extra6"
        },
        {
          "id": "auto_2",
          "label": "Emote 1",
          "command": "scriptevent yast:action wf17 2"
        },
        {
          "id": "auto_3",
          "label": "Emote 2",
          "command": "scriptevent yast:action wf17 3"
        },
        {
          "id": "auto_4",
          "label": "Emote 3",
          "command": "scriptevent yast:action wf17 4"
        },
        {
          "id": "auto_5",
          "label": "Emote 4",
          "command": "scriptevent yast:action wf17 5"
        },
        {
          "id": "auto_extra7",
          "label": "Emote 11",
          "command": "scriptevent yast:action wf17 extra7"
        },
        {
          "id": "auto_extra0",
          "label": "Emote 12",
          "command": "scriptevent yast:action wf17 extra0"
        },
        {
          "id": "auto_new",
          "label": "Emote 13",
          "command": "scriptevent yast:action wf17 new"
        },
        {
          "id": "auto_new2",
          "label": "Emote 14",
          "command": "scriptevent yast:action wf17 new2"
        },
        {
          "id": "auto_new3",
          "label": "Emote 15",
          "command": "scriptevent yast:action wf17 new3"
        },
        {
          "id": "auto_new4",
          "label": "Emote 16",
          "command": "scriptevent yast:action wf17 new4"
        },
        {
          "id": "auto_up",
          "label": "Emote 17",
          "command": "scriptevent yast:action wf17 up"
        }
      ]
    },
    "olhos": {
      "label": "Olhos",
      "exclusivo": true,
      "itens": [
        {
          "id": "olho_padrao",
          "label": "Padrão",
          "command": "scriptevent yast:set wf17 hh 0",
          "commandOff": "scriptevent yast:set wf17 hh 0"
        },
        {
          "id": "olho_choro",
          "label": "Chorar",
          "command": "scriptevent yast:set wf17 hh 1",
          "commandOff": "scriptevent yast:set wf17 hh 0"
        },
        {
          "id": "olho_fechado",
          "label": "Fechar",
          "command": "scriptevent yast:set wf17 hh 2",
          "commandOff": "scriptevent yast:set wf17 hh 0"
        },
        {
          "id": "olho_zoeira",
          "label": "Zoeira",
          "command": "scriptevent yast:set wf17 hh 3",
          "commandOff": "scriptevent yast:set wf17 hh 0"
        },
        {
          "id": "olho_tonto",
          "label": "Tonto",
          "command": "scriptevent yast:set wf17 hh 4",
          "commandOff": "scriptevent yast:set wf17 hh 0"
        },
        {
          "id": "olho_pisca_d",
          "label": "Pisca D",
          "command": "scriptevent yast:set wf17 hh 5",
          "commandOff": "scriptevent yast:set wf17 hh 0"
        },
        {
          "id": "olho_pisca_e",
          "label": "Pisca E",
          "command": "scriptevent yast:set wf17 hh 6",
          "commandOff": "scriptevent yast:set wf17 hh 0"
        }
      ]
    },
    "boca": {
      "label": "Boca",
      "exclusivo": true,
      "itens": [
        {
          "id": "boca_padrao",
          "label": "Padrão",
          "command": "scriptevent yast:set wf17 hhh 0",
          "commandOff": "scriptevent yast:set wf17 hhh 0"
        },
        {
          "id": "boca_w",
          "label": "W",
          "command": "scriptevent yast:set wf17 hhh 1",
          "commandOff": "scriptevent yast:set wf17 hhh 0"
        },
        {
          "id": "boca_v",
          "label": "V invert.",
          "command": "scriptevent yast:set wf17 hhh 2",
          "commandOff": "scriptevent yast:set wf17 hhh 0"
        },
        {
          "id": "boca_ww",
          "label": "WW",
          "command": "scriptevent yast:set wf17 hhh 3",
          "commandOff": "scriptevent yast:set wf17 hhh 0"
        },
        {
          "id": "boca_baba",
          "label": "Babar",
          "command": "scriptevent yast:set wf17 hhh 4",
          "commandOff": "scriptevent yast:set wf17 hhh 0"
        }
      ]
    },
    "tipo_olho": {
      "label": "Tipo olho",
      "exclusivo": true,
      "itens": [
        {
          "id": "tipo_padrao",
          "label": "Padrão",
          "command": "scriptevent yast:set wf17 yj 0",
          "commandOff": "scriptevent yast:set wf17 yj 0"
        },
        {
          "id": "tipo_1",
          "label": "Tipo 1",
          "command": "scriptevent yast:set wf17 yj 1",
          "commandOff": "scriptevent yast:set wf17 yj 0"
        },
        {
          "id": "tipo_2",
          "label": "Tipo 2",
          "command": "scriptevent yast:set wf17 yj 2",
          "commandOff": "scriptevent yast:set wf17 yj 0"
        }
      ]
    },
    "tamanho": {
      "label": "Tamanho",
      "exclusivo": true,
      "itens": [
        {
          "id": "corpo_mini",
          "label": "Mini",
          "command": "scriptevent yast:set wf17 player_root_size -1",
          "commandOff": "scriptevent yast:set wf17 player_root_size 0"
        },
        {
          "id": "corpo_normal",
          "label": "Normal",
          "command": "scriptevent yast:set wf17 player_root_size 0",
          "commandOff": "scriptevent yast:set wf17 player_root_size 0"
        },
        {
          "id": "corpo_grande",
          "label": "Grande",
          "command": "scriptevent yast:set wf17 player_root_size 1",
          "commandOff": "scriptevent yast:set wf17 player_root_size 0"
        },
        {
          "id": "corpo_gigante",
          "label": "Gigante",
          "command": "scriptevent yast:set wf17 player_root_size 2",
          "commandOff": "scriptevent yast:set wf17 player_root_size 0"
        }
      ]
    }
  }
};

const profile_wf18 = {
  "name": "Wine Fox • Casamento",
  "menu": [
    "emotes",
    "acessorios"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf18 extra1"
        },
        {
          "id": "extra2",
          "label": "Palmas",
          "command": "scriptevent yast:action wf18 extra2"
        },
        {
          "id": "extra3",
          "label": "Get Down",
          "command": "scriptevent yast:action wf18 extra3"
        },
        {
          "id": "extra4",
          "label": "Dança",
          "command": "scriptevent yast:action wf18 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf18 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf18 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança 2",
          "command": "scriptevent yast:action wf18 extra7"
        }
      ]
    },
    "acessorios": {
      "label": "Acessórios",
      "exclusivo": false,
      "itens": [
        {
          "id": "veu",
          "label": "Véu",
          "command": "scriptevent yast:set wf18 roaming_hairderss 1",
          "commandOff": "scriptevent yast:set wf18 roaming_hairderss 0"
        }
      ]
    }
  }
};

const profile_wf19 = {
  "name": "Wine Fox • Nove Caudas",
  "menu": [
    "emotes",
    "acessorios"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra0",
          "label": "Forma",
          "command": "scriptevent yast:action wf19 extra0"
        },
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf19 extra1"
        },
        {
          "id": "extra2",
          "label": "Palmas",
          "command": "scriptevent yast:action wf19 extra2"
        },
        {
          "id": "extra4",
          "label": "Dança",
          "command": "scriptevent yast:action wf19 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf19 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf19 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança 2",
          "command": "scriptevent yast:action wf19 extra7"
        }
      ]
    },
    "acessorios": {
      "label": "Acessórios",
      "exclusivo": false,
      "itens": [
        {
          "id": "luz_cauda",
          "label": "Luz cauda",
          "command": "scriptevent yast:set wf19 roaming_b 1",
          "commandOff": "scriptevent yast:set wf19 roaming_b 0"
        }
      ]
    }
  }
};

const profile_wf20 = {
  "name": "Wine Fox • Sobrevivente",
  "menu": [
    "emotes"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra0",
          "label": "Forma",
          "command": "scriptevent yast:action wf20 extra0"
        },
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf20 extra1"
        },
        {
          "id": "extra2",
          "label": "Inspec.",
          "command": "scriptevent yast:action wf20 extra2"
        },
        {
          "id": "extra3",
          "label": "Sim",
          "command": "scriptevent yast:action wf20 extra3"
        },
        {
          "id": "extra4",
          "label": "Capacete",
          "command": "scriptevent yast:action wf20 extra4"
        },
        {
          "id": "extra5",
          "label": "Máscara",
          "command": "scriptevent yast:action wf20 extra5"
        },
        {
          "id": "extra6",
          "label": "Tirar cap.",
          "command": "scriptevent yast:action wf20 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança",
          "command": "scriptevent yast:action wf20 extra7"
        }
      ]
    }
  }
};

const profile_wf21 = {
  "name": "Wine Fox • Santa",
  "menu": [
    "emotes",
    "acessorios"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf21 extra1"
        },
        {
          "id": "extra2",
          "label": "Meditar",
          "command": "scriptevent yast:action wf21 extra2"
        },
        {
          "id": "extra3",
          "label": "Get Down",
          "command": "scriptevent yast:action wf21 extra3"
        },
        {
          "id": "extra4",
          "label": "Dança",
          "command": "scriptevent yast:action wf21 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf21 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf21 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança 2",
          "command": "scriptevent yast:action wf21 extra7"
        }
      ]
    },
    "acessorios": {
      "label": "Acessórios",
      "exclusivo": false,
      "itens": [
        {
          "id": "veu",
          "label": "Véu",
          "command": "scriptevent yast:set wf21 roaming_hairderss 1",
          "commandOff": "scriptevent yast:set wf21 roaming_hairderss 0"
        },
        {
          "id": "asas",
          "label": "Asas",
          "command": "scriptevent yast:set wf21 roaming_wings 1",
          "commandOff": "scriptevent yast:set wf21 roaming_wings 0"
        }
      ]
    }
  }
};

const profile_wf22 = {
  "name": "Wine Fox • Elfo",
  "menu": [
    "emotes",
    "acessorios"
  ],
  "configs": [
    null,
    null,
    null,
    null
  ],
  "submenus": {
    "emotes": {
      "label": "Emotes",
      "modo": "disparo",
      "exclusivo": true,
      "itens": [
        {
          "id": "extra0",
          "label": "Forma",
          "command": "scriptevent yast:action wf22 extra0"
        },
        {
          "id": "extra1",
          "label": "Acenar",
          "command": "scriptevent yast:action wf22 extra1"
        },
        {
          "id": "extra2",
          "label": "Sentar",
          "command": "scriptevent yast:action wf22 extra2"
        },
        {
          "id": "extra4",
          "label": "Dança",
          "command": "scriptevent yast:action wf22 extra4"
        },
        {
          "id": "extra5",
          "label": "Fofo",
          "command": "scriptevent yast:action wf22 extra5"
        },
        {
          "id": "extra6",
          "label": "YubiYao",
          "command": "scriptevent yast:action wf22 extra6"
        },
        {
          "id": "extra7",
          "label": "Dança 2",
          "command": "scriptevent yast:action wf22 extra7"
        }
      ]
    },
    "acessorios": {
      "label": "Acessórios",
      "exclusivo": false,
      "itens": [
        {
          "id": "borboletas",
          "label": "Borboletas",
          "command": "scriptevent yast:set wf22 roaming_f 1",
          "commandOff": "scriptevent yast:set wf22 roaming_f 0"
        }
      ]
    }
  }
};


export const CHESTPLATE_PROFILES = {

  "pa:ey": {
    "name": "Traje de Emily",
    "menu": [],
    "configs": [
      null,
      null,
      null,
      null
    ],
    "submenus": {}
  },

  "pa:obito": {
    "name": "Traje de Obito",
    "menu": [],
    "configs": [
      null,
      null,
      null,
      null
    ],
    "submenus": {}
  },

  "pa:janedoe": {
    "name": "Traje de Jane",
    "menu": [],
    "configs": [
      null,
      null,
      null,
      null
    ],
    "submenus": {}
  },

  "pa:jessy": {
    "name": "Traje de Jessica",
    "menu": [],
    "configs": [
      null,
      null,
      null,
      null
    ],
    "submenus": {}
  },

  "pa:ty": {
    "name": "Traje de Tyara",
    "menu": [],
    "configs": [
      null,
      null,
      null,
      null
    ],
    "submenus": {}
  },

  "pa:ward": {
    "name": "Traje Warden Girl",
    "menu": [],
    "configs": [
      null,
      null,
      null,
      null
    ],
    "submenus": {}
  },

  "ysm:wf01_taisho_maid_skin": profile_wf01,

  "ysm:wf01_taisho_maid_skin_white": profile_wf01,

  "ysm:wf02_new_year_skin": profile_wf02,

  "ysm:wf03_astronaut_skin": profile_wf03,

  "ysm:wf04_kongfu_black": profile_wf04,

  "ysm:wf04_kongfu_default": profile_wf04,

  "ysm:wf04_kongfu_default_red": profile_wf04,

  "ysm:wf04_kongfu_red": profile_wf04,

  "ysm:wf04_kongfu_red_more": profile_wf04,

  "ysm:wf04_kongfu_yellow": profile_wf04,

  "ysm:wf05_magical_blood": profile_wf05,

  "ysm:wf05_magical_flower": profile_wf05,

  "ysm:wf05_magical_ice": profile_wf05,

  "ysm:wf05_magical_magic": profile_wf05,

  "ysm:wf05_magical_water": profile_wf05,

  "ysm:wf05_magical_winefox": profile_wf05,

  "ysm:wf06_hanfu_default": profile_wf06,

  "ysm:wf07_jk_skin": profile_wf07,

  "ysm:wf11_salesperson_blue": profile_wf11,

  "ysm:wf11_salesperson_default": profile_wf11,

  "ysm:wf12_little_skin": profile_wf12,

  "ysm:wf13_matured_default": profile_wf13,

  "ysm:wf14_momo_skin_green": profile_wf14,

  "ysm:wf14_momo_skin_pink": profile_wf14,

  "ysm:wf16_tactics_tactics": profile_wf16,

  "ysm:wf17_mini_texture": profile_wf17,

  "ysm:wf18_wedding_skin": profile_wf18,

  "ysm:wf19_nine_tailed_skin": profile_wf19,

  "ysm:wf19_nine_tailed_skin_white": profile_wf19,

  "ysm:wf20_survivor_mitao": profile_wf20,

  "ysm:wf21_saint_skin": profile_wf21,

  "ysm:wf21_saint_skinblack": profile_wf21,

  "ysm:wf22_elf_skin": profile_wf22,

};
