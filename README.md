# Road Rage Rush Online

Your game plus: rooms for 2-10 riders, a 5-stage career with upgrades, and a worldwide leaderboard.
Runs 100% on Cloudflare's free plan.

## Do you need a database?
| Feature | Needs a database? | What it uses |
|---|---|---|
| Rooms / racing with friends | No | A Durable Object per room, kept in memory |
| Career progress and cash | No | The player's browser (localStorage) |
| Worldwide leaderboard | Yes | Cloudflare D1 (free). The table is created automatically |

## Deploy (free)
Note: Pages alone cannot keep WebSocket rooms open. This project deploys as one Cloudflare Worker that also serves the game files. It is the same free dashboard and the same kind of GitHub auto-deploy.

**Option A: GitHub, no terminal**
1. Upload this folder to a new GitHub repo.
2. Cloudflare dashboard > Workers & Pages > Create > Import a repository.
3. Deploy command: `npx wrangler deploy`. Save and Deploy.
4. Open the `*.workers.dev` link. Done. Wrangler creates the D1 database for you.

**Option B: terminal**
```
npm install
npx wrangler login
npx wrangler deploy
```
If D1 is not auto-created: `npx wrangler d1 create rrr-leaderboard`, then paste the `database_id` into the `d1_databases` entry in `wrangler.jsonc`, and deploy again.

Test locally with `npx wrangler dev` and open two browser tabs.

## Playing
Multiplayer > Create new room > send the 4-letter code to friends > the host presses START RACE.
Punch other riders (Z / X) to slow them down.

## Free-tier math
Each player sends 10 updates/second. Cloudflare bills incoming WebSocket messages at 20:1 against 100,000 requests/day.
A 10-player, 100-second race is about 500 requests, so roughly 200 full races a day.

## Honest limits
- Clients are trusted for their own bike. The server only rejects impossible leaderboard times (under 55s). A determined cheater could still fake a plausible time.
- Traffic cars are random per player, so everyone has equal difficulty but not identical traffic.
- The finished game is `public/index.html`. Edit that file directly. `tools/` only holds the script that patched your original.
