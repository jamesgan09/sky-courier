[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/jamesgan09/sky-courier/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/jamesgan09/sky-courier/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# Sky Courier

A 3D arcade flight game for the [make.fun best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057). Fly a cargo plane across an island archipelago: thread the glowing rings, watch your fuel, and land on the runway to deliver the cargo. Three deliveries, each a longer route than the last.

## How to play

Serve `game/` with any static server and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

- **Arrow keys** — fly (Down pulls up, Up pushes down, Left/Right bank)
- **W / S** — throttle up / down
- **C** — chase / cockpit camera
- **M** — mute, **P** — pause, **R** — restart, **Enter** — take off / continue

Thread every ring in order (each one tops the fuel tank up), then land gently on the runway: level wings, low sink rate, under 62 kt. Land early for a free refuel stop. Crash into terrain or ditch in the sea and the delivery is lost.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `game/index.html` — the page and HUD.
- `game/src/` — the game's own source, one job per file: `config.js` (tuning and missions), `random.js` (seeded noise), `terrain.js` (island, sea, sky, runway, rings), `aircraft.js` (the plane model), `physics.js` (arcade flight model), `input.js`, `audio.js` (synth sounds), `hud.js`, `render.js` (three.js scene and cameras), `world.js` (missions and scoring), `shots.js` (deterministic screenshot scenes), `main.js` (bootstrap).
- `game/vendor/three.module.min.js` — vendored three.js (MIT).
- `screenshots/` — 3 renders of the game's own code (`?shot=start|play|end`).

## License

MIT — see [LICENSE](LICENSE).
