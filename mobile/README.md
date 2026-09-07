# devconcursado

App Android/iOS do banco de questões. Porte do PWA em `frontend/`, seguindo
`docs/SDD-MOBILE.md`.

## Rodar

Da raiz do repositório:

```
npm run mobile:android    # abre no emulador/dispositivo Android
npm run mobile            # abre o Metro e deixa você escolher
```

O Android SDK precisa estar no ambiente:

```
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH
```

## Estado

Esqueleto visual (SDD Fase 1, parcial):

- Expo Router com as 6 abas do `BottomTab` do web.
- Os dois temas (fantasy/cyberpunk), com os mesmos tokens de `frontend/src/index.css`,
  aplicados por `vars()` do NativeWind em vez de `[data-theme]`.
- Adapters de armazenamento das ports do SDD §4.1: `expo-sqlite/kv-store` (síncrono de
  verdade) e `expo-secure-store` com espelho em memória hidratado no arranque (§6.1).

Ainda **não** fala com a API. Isso depende da extração do núcleo compartilhado
(`packages/core`, Fase 0), para não duplicar regra de negócio entre web e mobile.
