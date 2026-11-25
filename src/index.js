import { Room } from './room.js';
export { Room };

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
let ready;
// Self-creating table: no manual SQL step needed.
const init = db => (ready ??= db.batch([
  db.prepare('CREATE TABLE IF NOT EXISTS lb(pid TEXT PRIMARY KEY,name TEXT NOT NULL,best_ms INTEGER NOT NULL,races INTEGER NOT NULL DEFAULT 0,updated INTEGER)'),
  db.prepare('CREATE INDEX IF NOT EXISTS i_best ON lb(best_ms)')
]).catch(e => { ready = undefined; throw e; }));

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname.startsWith('/ws/')) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket only', { status: 426 });
      const code = u.pathname.slice(4).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (!code) return new Response('Bad room', { status: 400 });
      return env.ROOM.get(env.ROOM.idFromName(code)).fetch(req); // one Durable Object per room code
    }
    if (u.pathname === '/api/lb') {
      await init(env.DB);
      const r = await env.DB.prepare('SELECT name,best_ms,races FROM lb ORDER BY best_ms LIMIT 25').all();
      return J(r.results);
    }
    if (u.pathname === '/api/score' && req.method === 'POST') {
      let b; try { b = await req.json(); } catch { return J({ e: 'bad json' }, 400); }
      const ms = Math.round(b.ms), pid = String(b.pid || '').slice(0, 40),
        name = String(b.name || '').replace(/[^\w \-]/g, '').trim().slice(0, 12);
      // 18000 units at max speed can't be beaten under ~60s: reject impossible times
      if (!pid || !name || !(ms >= 55000 && ms <= 900000)) return J({ e: 'rejected' }, 400);
      await init(env.DB);
      await env.DB.prepare('INSERT INTO lb(pid,name,best_ms,races,updated) VALUES(?1,?2,?3,1,?4) ON CONFLICT(pid) DO UPDATE SET name=?2,best_ms=MIN(best_ms,?3),races=races+1,updated=?4')
        .bind(pid, name, ms, Date.now()).run();
      return J({ ok: 1 });
    }
    return env.ASSETS.fetch(req);
  }
};
