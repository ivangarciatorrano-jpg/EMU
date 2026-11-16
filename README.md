# CrisVan Juegos 🕹️

Web app de juegos para el móvil (se instala en la pantalla de inicio y funciona sin conexión).

- **Arcade**: Serpiente, Bloques, Rompeladrillos, 2048, Pajarito y Buscaminas, con récords.
- **Consolas**: NES, Super Nintendo, Game Boy / Color, Game Boy Advance, Mega Drive, Master System, Game Gear, Nintendo DS, Nintendo 64, PlayStation, PC Engine y Neo Geo Pocket. Mando táctil (o encima de la imagen en horizontal), mando Bluetooth, turbo, avance rápido y guardado de partida. Acepta `.zip` y `.7z`.
- **Copia de seguridad**: exporta/importa juegos, partidas y récords en un archivo `.cvj`.
- **Juegos gratis**: ~300 juegos *homebrew* (colección [retrobrews](https://github.com/retrobrews)) que se añaden con un toque.

Todo se guarda en el propio móvil (IndexedDB). Las consolas se descargan solas la primera vez desde jsDelivr.

## Ver en el iPhone

1. En GitHub: *Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save*.
2. Abre en Safari `https://ivangarciatorrano-jpg.github.io/EMU/`.
3. Toca **Compartir ⬆️ → Añadir a pantalla de inicio**.

## Créditos

Emuladores: [jsnes](https://github.com/bfirsh/jsnes) (Apache-2.0), los motores de [wasm-gaming](https://github.com/wasm-gaming) (Snes9x, mGBA, BlastEm) y [EmulatorJS](https://emulatorjs.org) (GPL-3.0; melonDS, Mupen64Plus, PCSX-ReARMed, Genesis Plus GX, Mednafen) para DS, N64, PS1, Game Gear, PC Engine y Neo Geo Pocket. Se cargan desde jsDelivr y el CDN de EmulatorJS; no se incluyen en este repo.
El Hub no incluye juegos comerciales: usa homebrew o copias de tus propios cartuchos.
