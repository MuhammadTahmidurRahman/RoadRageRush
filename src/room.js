import { DurableObject } from 'cloudflare:workers';

// One instance = one room. Live race state lives in memory (no database needed for rooms).
export class Room extends DurableObject {
  P = new Map(); st = 'lobby'; host = null; res = []; fins = new Set(); tm = 0; n = 0;

  async fetch(req) {
    const [c, s] = Object.values(new WebSocketPair());
    s.accept();
    if (this.P.size >= 10 || this.st !== 'lobby') {
      s.send(JSON.stringify({ t: 'err', m: this.st !== 'lobby' ? 'Race in progress, try again in a minute' : 'Room is full (10 riders)' }));
      s.close(1000, 'x');
      return new Response(null, { status: 101, webSocket: c });
    }
    const id = crypto.randomUUID().slice(0, 6);
    const nm = (new URL(req.url).searchParams.get('n') || '').replace(/[^\w \-]/g, '').slice(0, 12) || 'Rider';
    const p = { id, s, n: nm, ci: this.n++ };
    this.P.set(id, p); this.host ??= id;
    s.send(JSON.stringify({ t: 'hi', i: id }));
    s.addEventListener('message', e => this.msg(p, e.data));
    const bye = () => this.leave(id);
    s.addEventListener('close', bye); s.addEventListener('error', bye);
    this.cast();
    return new Response(null, { status: 101, webSocket: c });
  }

  msg(p, d) {
    if (typeof d !== 'string' || d.length > 300) return;
    let m; try { m = JSON.parse(d); } catch { return; }
    if (m.t === 's') { // position relay (clients are trusted for their own bike)
      if (this.st === 'race') this.bc({ t: 's', i: p.id, z: m.z, x: m.x, v: m.v, a: m.a, y: m.y, l: m.l }, p.id);
    } else if (m.t === 'h') { // punch -> only the victim
      const q = this.P.get(m.to); if (q) try { q.s.send(JSON.stringify({ t: 'h', s: m.s < 0 ? -1 : 1, i: p.id })); } catch {}
    } else if (m.t === 'go') {
      if (p.id === this.host && this.st === 'lobby') { this.st = 'race'; this.res = []; this.fins = new Set(); this.bc({ t: 'go' }); }
    } else if (m.t === 'f') {
      if (this.st !== 'race' || this.fins.has(p.id)) return;
      this.fins.add(p.id);
      this.res.push({ i: p.id, n: p.n, ms: m.ms > 0 ? Math.round(m.ms) : 0 });
      if (this.fins.size >= this.P.size) this.end();
      else if (!this.tm) this.tm = setTimeout(() => this.end(), 25000); // stragglers get 25s
    }
  }

  end() {
    if (this.st !== 'race') return;
    clearTimeout(this.tm); this.tm = 0; this.st = 'lobby';
    const r = this.res.sort((a, b) => (a.ms || 9e9) - (b.ms || 9e9));
    for (const p of this.P.values()) if (!this.fins.has(p.id)) r.push({ i: p.id, n: p.n, ms: 0 });
    this.bc({ t: 'end', r }); this.cast();
  }

  leave(id) {
    if (!this.P.delete(id)) return;
    if (this.host === id) this.host = this.P.keys().next().value ?? null;
    this.bc({ t: 'x', i: id });
    if (this.st === 'race' && this.P.size && this.fins.size >= this.P.size) this.end();
    this.cast();
  }

  cast() { this.bc({ t: 'room', h: this.host, st: this.st, p: [...this.P.values()].map(p => ({ i: p.id, n: p.n, c: p.ci })) }); }
  bc(o, except) { const d = JSON.stringify(o); for (const p of this.P.values()) if (p.id !== except) try { p.s.send(d); } catch {} }
}
