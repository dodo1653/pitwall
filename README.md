# Squad GP

The pump.fun $2.5M Squads Competition (26 Oct – 9 Nov 2026) as a live Grand Prix:
- **The race:** every squad is a car on a 3D night circuit, ordered by profit; the spacing between cars is the gap in dollars.
- **The overlay:** an F1-style timing tower.
- **Pit Wall:** shows what the top squads hold.
- **Broadcast cards:** overtakes, new leader, fastest lap.
- **Squad cards:** profit split, SOL spent, members, holdings.

## Run locally
`node serve.mjs` → http://127.0.0.1:8792

The page reads `/api/board` (the live standings) and falls back to `data/snapshot.json`.

## Capture
`node render.mjs "http://127.0.0.1:8792/?capture=1&dur=40" frames 30` renders frames for videos.

## Data source
**Open decision:** pump.fun's live leaderboard sits behind Cloudflare, so there is no live `/api/board` yet. `data/snapshot.json` is the top 100 as of 26 Oct, 20:13 UTC.

Independent fan project. Not affiliated with pump.fun.
