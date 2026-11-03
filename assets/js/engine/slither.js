// Slitherlink core: grid model, logic solver (difficulty levels 1-3) and solution counter.
// Edge states: -1 unknown, 0 off, 1 on.
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ grid
  const gridCache = new Map();

  // Precomputed topology for a W x H cell grid.
  function grid(W, H) {
    const key = W + 'x' + H;
    if (gridCache.has(key)) return gridCache.get(key);
    const NH = (H + 1) * W, NV = H * (W + 1), E = NH + NV, ND = (H + 1) * (W + 1), NC = W * H;
    const hId = (r, c) => r * W + c;
    const vId = (r, c) => NH + r * (W + 1) + c;
    const dId = (r, c) => r * (W + 1) + c;
    const cellEdges = new Int32Array(NC * 4);
    const edgeDots = new Int32Array(E * 2);
    const edgeCells = new Int32Array(E * 2).fill(-1); // -1 = outside the grid
    const dotEdges = new Int32Array(ND * 4).fill(-1);
    const dotDeg = new Uint8Array(ND);
    const addDotEdge = (d, e) => { dotEdges[d * 4 + dotDeg[d]++] = e; };

    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const i = r * W + c;
      cellEdges[i * 4] = hId(r, c);
      cellEdges[i * 4 + 1] = hId(r + 1, c);
      cellEdges[i * 4 + 2] = vId(r, c);
      cellEdges[i * 4 + 3] = vId(r, c + 1);
    }
    for (let r = 0; r <= H; r++) for (let c = 0; c < W; c++) {
      const e = hId(r, c);
      edgeDots[e * 2] = dId(r, c); edgeDots[e * 2 + 1] = dId(r, c + 1);
      if (r > 0) edgeCells[e * 2] = (r - 1) * W + c;
      if (r < H) edgeCells[e * 2 + 1] = r * W + c;
      addDotEdge(dId(r, c), e); addDotEdge(dId(r, c + 1), e);
    }
    for (let r = 0; r < H; r++) for (let c = 0; c <= W; c++) {
      const e = vId(r, c);
      edgeDots[e * 2] = dId(r, c); edgeDots[e * 2 + 1] = dId(r + 1, c);
      if (c > 0) edgeCells[e * 2] = r * W + c - 1;
      if (c < W) edgeCells[e * 2 + 1] = r * W + c;
      addDotEdge(dId(r, c), e); addDotEdge(dId(r + 1, c), e);
    }
    const g = { W, H, NH, NV, E, ND, NC, hId, vId, dId, cellEdges, edgeDots, edgeCells, dotEdges, dotDeg };
    gridCache.set(key, g);
    return g;
  }

  // Solution edges from an inside-cell mask: an edge is on when exactly one side is inside.
  function edgesFromMask(g, inside) {
    const sol = new Int8Array(g.E);
    for (let e = 0; e < g.E; e++) {
      const a = g.edgeCells[e * 2], b = g.edgeCells[e * 2 + 1];
      sol[e] = ((a >= 0 && inside[a]) ? 1 : 0) !== ((b >= 0 && inside[b]) ? 1 : 0) ? 1 : 0;
    }
    return sol;
  }

  function cluesFromEdges(g, edges) {
    const clues = new Int8Array(g.NC);
    for (let i = 0; i < g.NC; i++) {
      let n = 0;
      for (let k = 0; k < 4; k++) n += edges[g.cellEdges[i * 4 + k]] === 1 ? 1 : 0;
      clues[i] = n;
    }
    return clues;
  }

  // Checks that `edges` (no unknowns) form exactly one loop matching every clue.
  function isValidSolution(g, clues, edges) {
    let on = 0, start = -1;
    for (let d = 0; d < g.ND; d++) {
      let deg = 0;
      for (let k = 0; k < g.dotDeg[d]; k++) deg += edges[g.dotEdges[d * 4 + k]] === 1 ? 1 : 0;
      if (deg !== 0 && deg !== 2) return false;
    }
    for (let e = 0; e < g.E; e++) if (edges[e] === 1) { on++; if (start < 0) start = e; }
    if (!on) return false;
    for (let i = 0; i < g.NC; i++) {
      if (clues[i] < 0) continue;
      let n = 0;
      for (let k = 0; k < 4; k++) n += edges[g.cellEdges[i * 4 + k]] === 1 ? 1 : 0;
      if (n !== clues[i]) return false;
    }
    return loopOrder(g, edges).length === on;
  }

  // Walks the loop containing the first on-edge; returns edge ids in order.
  function loopOrder(g, edges, startEdge) {
    let start = startEdge;
    if (start === undefined) for (let e = 0; e < g.E; e++) if (edges[e] === 1) { start = e; break; }
    if (start === undefined || start < 0) return [];
    const order = [start];
    let prevEdge = start, dot = g.edgeDots[start * 2 + 1];
    const target = g.edgeDots[start * 2];
    for (let guard = 0; guard < g.E; guard++) {
      if (dot === target) return order;
      let next = -1;
      for (let k = 0; k < g.dotDeg[dot]; k++) {
        const e = g.dotEdges[dot * 4 + k];
        if (e !== prevEdge && edges[e] === 1) { next = e; break; }
      }
      if (next < 0) return order;
      order.push(next);
      dot = g.edgeDots[next * 2] === dot ? g.edgeDots[next * 2 + 1] : g.edgeDots[next * 2];
      prevEdge = next;
    }
    return order;
  }

  // ------------------------------------------------------------------ solver state
  // State holds edge values plus path bookkeeping: for a dot at the end of a path,
  // mate[d] is the other end and plen[d] the path length in edges.
  function newState(g) {
    return {
      edges: new Int8Array(g.E).fill(-1),
      mate: new Int32Array(g.ND).fill(-1),
      plen: new Int32Array(g.ND),
      deg: new Uint8Array(g.ND),
      onTotal: 0,
      unknown: g.E,
      closed: false,
      // Inside/outside colouring (level 3): parity union-find over cells + OUT node.
      uf: null, ufp: null
    };
  }

  function cloneState(s) {
    return {
      edges: s.edges.slice(), mate: s.mate.slice(), plen: s.plen.slice(), deg: s.deg.slice(),
      onTotal: s.onTotal, unknown: s.unknown, closed: s.closed,
      uf: s.uf ? s.uf.slice() : null, ufp: s.ufp ? s.ufp.slice() : null
    };
  }

  function copyInto(dst, src) {
    dst.edges.set(src.edges); dst.mate.set(src.mate); dst.plen.set(src.plen); dst.deg.set(src.deg);
    dst.onTotal = src.onTotal; dst.unknown = src.unknown; dst.closed = src.closed;
    if (src.uf) { dst.uf.set(src.uf); dst.ufp.set(src.ufp); }
  }

  // ------------------------------------------------------------------ solver
  // Builds a solver for one puzzle. `clues` is Int8Array (-1 = no clue).
  function Solver(g, clues, level) {
    this.g = g;
    this.clues = clues;
    this.level = level;
    this.queue = new Int32Array(g.E * 4 + 16);
    this.inQueue = new Uint8Array(g.E);
    this.qh = 0;
    this.qt = 0;
  }

  Solver.prototype.initial = function () {
    const s = newState(this.g);
    if (this.level >= 3) {
      s.uf = new Int32Array(this.g.NC + 1);
      for (let i = 0; i <= this.g.NC; i++) s.uf[i] = i;
      s.ufp = new Uint8Array(this.g.NC + 1);
    }
    return s;
  };

  // Union-find with parity (level 3). Node NC = outside of the grid.
  function ufFind(s, x) {
    let p = 0, r = x;
    while (s.uf[r] !== r) { p ^= s.ufp[r]; r = s.uf[r]; }
    // Path compression.
    let cur = x, cp = p;
    while (s.uf[cur] !== cur) {
      const next = s.uf[cur], np = cp ^ s.ufp[cur];
      s.uf[cur] = r; s.ufp[cur] = cp;
      cur = next; cp = np;
    }
    return [r, p];
  }

  // Sets edge e to v (0/1). Returns false on contradiction.
  Solver.prototype.set = function (s, e, v) {
    const cur = s.edges[e];
    if (cur === v) return true;
    if (cur !== -1) return false;
    if (s.closed && v === 1) return false;
    const g = this.g;
    s.edges[e] = v;
    s.unknown--;
    if (v === 1) {
      const a = g.edgeDots[e * 2], b = g.edgeDots[e * 2 + 1];
      if (s.deg[a] >= 2 || s.deg[b] >= 2) return false;
      const ea = s.deg[a] === 0 ? a : s.mate[a];
      const eb = s.deg[b] === 0 ? b : s.mate[b];
      const la = s.deg[a] === 0 ? 0 : s.plen[a];
      const lb = s.deg[b] === 0 ? 0 : s.plen[b];
      s.deg[a]++; s.deg[b]++;
      if (ea === b) {
        // Closing a loop: only allowed if this path holds every on-edge.
        if (la !== s.onTotal) return false;
        s.onTotal++;
        s.closed = true;
      } else {
        s.onTotal++;
        const len = la + lb + 1;
        s.mate[ea] = eb; s.mate[eb] = ea;
        s.plen[ea] = len; s.plen[eb] = len;
      }
    }
    if (s.uf) {
      const ca = g.edgeCells[e * 2], cb = g.edgeCells[e * 2 + 1];
      const na = ca < 0 ? g.NC : ca, nb = cb < 0 ? g.NC : cb;
      const [ra, pa] = ufFind(s, na), [rb, pb] = ufFind(s, nb);
      if (ra === rb) {
        if ((pa ^ pb) !== v) return false;
      } else {
        s.uf[ra] = rb; s.ufp[ra] = pa ^ pb ^ v;
      }
    }
    if (!this.inQueue[e]) { this.inQueue[e] = 1; this.queue[this.qt++] = e; }
    return true;
  };

  Solver.prototype.checkDot = function (s, d) {
    const g = this.g;
    let on = 0, unk = 0, lastUnk = -1;
    for (let k = 0; k < g.dotDeg[d]; k++) {
      const e = g.dotEdges[d * 4 + k], v = s.edges[e];
      if (v === 1) on++;
      else if (v === -1) { unk++; lastUnk = e; }
    }
    if (on > 2) return false;
    if (on === 2) {
      if (unk) for (let k = 0; k < g.dotDeg[d]; k++) { const e = g.dotEdges[d * 4 + k]; if (s.edges[e] === -1 && !this.set(s, e, 0)) return false; }
    } else if (on === 1) {
      if (unk === 0) return false;
      if (unk === 1 && !this.set(s, lastUnk, 1)) return false;
    } else if (unk === 1) {
      if (!this.set(s, lastUnk, 0)) return false;
    }
    return true;
  };

  // Cell rule by enumerating the (at most 16) assignments of its unknown edges.
  // At level 3 the inside/outside colouring adds "these two edges are equal/opposite" links.
  Solver.prototype.checkCell = function (s, i) {
    const k = this.clues[i];
    if (k < 0) return true;
    const g = this.g;
    let on = 0;
    const unk = [];
    for (let j = 0; j < 4; j++) {
      const e = g.cellEdges[i * 4 + j], v = s.edges[e];
      if (v === 1) on++;
      else if (v === -1) unk.push(e);
    }
    const need = k - on;
    if (need < 0 || need > unk.length) return false;
    if (!unk.length) return true;
    if (need === 0) { for (const e of unk) if (!this.set(s, e, 0)) return false; return true; }
    if (need === unk.length) { for (const e of unk) if (!this.set(s, e, 1)) return false; return true; }
    if (!s.uf || unk.length < 2) return true;

    // Level 3: neighbour colours relative to this cell.
    const rel = unk.map((e) => {
      const a = g.edgeCells[e * 2], b = g.edgeCells[e * 2 + 1];
      const other = a === i ? b : a;
      return ufFind(s, other < 0 ? g.NC : other);
    });
    let any = false;
    for (let x = 0; x < rel.length; x++) for (let y = x + 1; y < rel.length; y++) if (rel[x][0] === rel[y][0]) any = true;
    if (!any) return true;
    const n = unk.length;
    let andMask = (1 << n) - 1, orMask = 0, found = 0;
    for (let m = 0; m < (1 << n); m++) {
      let bits = 0;
      for (let x = 0; x < n; x++) bits += (m >> x) & 1;
      if (bits !== need) continue;
      let ok = true;
      for (let x = 0; x < n && ok; x++) for (let y = x + 1; y < n && ok; y++) {
        if (rel[x][0] !== rel[y][0]) continue;
        // Same set: edge values differ exactly when the neighbours' colours differ.
        const differ = rel[x][1] ^ rel[y][1];
        if ((((m >> x) & 1) ^ ((m >> y) & 1)) !== differ) ok = false;
      }
      if (!ok) continue;
      found++; andMask &= m; orMask |= m;
    }
    if (!found) return false;
    for (let x = 0; x < n; x++) {
      if ((andMask >> x) & 1) { if (!this.set(s, unk[x], 1)) return false; }
      else if (!((orMask >> x) & 1)) { if (!this.set(s, unk[x], 0)) return false; }
    }
    return true;
  };

  // Global checks run when the queue is empty: premature-loop rule and colour links.
  Solver.prototype.globalPass = function (s) {
    const g = this.g;
    if (s.closed) {
      for (let e = 0; e < g.E; e++) if (s.edges[e] === -1 && !this.set(s, e, 0)) return false;
      return true;
    }
    for (let e = 0; e < g.E; e++) {
      if (s.edges[e] !== -1) continue;
      const a = g.edgeDots[e * 2], b = g.edgeDots[e * 2 + 1];
      if (s.deg[a] === 1 && s.deg[b] === 1 && s.mate[a] === b) {
        if (s.plen[a] < s.onTotal) { if (!this.set(s, e, 0)) return false; continue; }
        // Closing would finish the loop: allowed only if every clue would then be satisfied.
        if (!this.closingSatisfies(s, e) && !this.set(s, e, 0)) return false;
        continue;
      }
      if (s.uf) {
        const ca = g.edgeCells[e * 2], cb = g.edgeCells[e * 2 + 1];
        const [ra, pa] = ufFind(s, ca < 0 ? g.NC : ca), [rb, pb] = ufFind(s, cb < 0 ? g.NC : cb);
        if (ra === rb && !this.set(s, e, pa ^ pb)) return false;
      }
    }
    return true;
  };

  Solver.prototype.closingSatisfies = function (s, e) {
    const g = this.g;
    for (let i = 0; i < g.NC; i++) {
      const k = this.clues[i];
      if (k < 0) continue;
      let n = 0;
      for (let j = 0; j < 4; j++) {
        const x = g.cellEdges[i * 4 + j];
        if (s.edges[x] === 1 || x === e) n++;
      }
      if (n !== k) return false;
    }
    return true;
  };

  // Runs rules to a fixpoint. Returns false on contradiction.
  Solver.prototype.propagate = function (s, seedAll) {
    const g = this.g;
    if (seedAll) {
      for (let i = 0; i < g.NC; i++) if (!this.checkCell(s, i)) return this.fail();
      for (let d = 0; d < g.ND; d++) if (!this.checkDot(s, d)) return this.fail();
    }
    for (;;) {
      while (this.qh < this.qt) {
        const e = this.queue[this.qh++];
        this.inQueue[e] = 0;
        const a = g.edgeDots[e * 2], b = g.edgeDots[e * 2 + 1];
        if (!this.checkDot(s, a) || !this.checkDot(s, b)) return this.fail();
        const ca = g.edgeCells[e * 2], cb = g.edgeCells[e * 2 + 1];
        if (ca >= 0 && !this.checkCell(s, ca)) return this.fail();
        if (cb >= 0 && !this.checkCell(s, cb)) return this.fail();
        if (s.uf) {
          // Colour links can affect any clue cell next to the cells of this edge.
          for (const c of [ca, cb]) {
            if (c < 0) continue;
            const r = (c / g.W) | 0, col = c % g.W;
            if (r > 0 && !this.checkCell(s, c - g.W)) return this.fail();
            if (r < g.H - 1 && !this.checkCell(s, c + g.W)) return this.fail();
            if (col > 0 && !this.checkCell(s, c - 1)) return this.fail();
            if (col < g.W - 1 && !this.checkCell(s, c + 1)) return this.fail();
          }
        }
        if (this.qh === this.qt) { this.qh = this.qt = 0; }
      }
      const before = s.unknown;
      if (!this.globalPass(s)) return this.fail();
      if (s.unknown === before && this.qh === this.qt) break;
    }
    this.qh = this.qt = 0;
    return true;
  };

  Solver.prototype.fail = function () {
    for (let i = this.qh; i < this.qt; i++) this.inQueue[this.queue[i]] = 0;
    this.qh = this.qt = 0;
    return false;
  };

  Solver.prototype.isSolved = function (s) {
    return s.unknown === 0 && s.closed;
  };

  // Level 2+: assume an edge value, propagate, and keep the opposite on contradiction.
  Solver.prototype.trialPass = function (s, scratch) {
    const g = this.g;
    let progress = false;
    for (let e = 0; e < g.E; e++) {
      if (s.edges[e] !== -1) continue;
      for (const v of [1, 0]) {
        copyInto(scratch, s);
        this.qh = this.qt = 0;
        if (this.set(scratch, e, v) && this.propagate(scratch, false)) continue;
        // Contradiction: the edge must take the other value.
        this.qh = this.qt = 0;
        if (!this.set(s, e, 1 - v) || !this.propagate(s, false)) return -1;
        progress = true;
        break;
      }
      if (s.closed) break;
    }
    return progress ? 1 : 0;
  };

  // Full logic solve at this solver's level. Returns { state, solved, contradiction }.
  Solver.prototype.solve = function (startState) {
    this.qh = this.qt = 0;
    const s = startState || this.initial();
    if (!this.propagate(s, true)) return { state: s, solved: false, contradiction: true };
    if (this.level >= 2) {
      const scratch = cloneState(s);
      while (!this.isSolved(s)) {
        const r = this.trialPass(s, scratch);
        if (r < 0) return { state: s, solved: false, contradiction: true };
        if (r === 0) break;
      }
    }
    return { state: s, solved: this.isSolved(s), contradiction: false };
  };

  // ------------------------------------------------------------------ solution counter
  // Independent check: depth-first search with propagation but no trials (level 1, or
  // level 3 to add the inside/outside colouring), stops at `limit` solutions or when the
  // node budget runs out (returns -1).
  function countSolutions(g, clues, limit = 2, budget = 200000, level = 1) {
    const solver = new Solver(g, clues, level);
    const s0 = solver.initial();
    solver.qh = solver.qt = 0;
    if (!solver.propagate(s0, true)) return 0;
    let count = 0, nodes = 0;
    const seen = new Uint8Array(g.ND);
    const stack = new Int32Array(g.ND);

    // Prune: every on-edge and every clue cell still needing edges must lie in one
    // component of the graph made of on + unknown edges, or no single loop can exist.
    function connectable(s) {
      if (s.closed) return true;
      let start = -1;
      for (let d = 0; d < g.ND; d++) if (s.deg[d] > 0) { start = d; break; }
      if (start < 0) return true;
      seen.fill(0);
      let sp = 0;
      stack[sp++] = start; seen[start] = 1;
      while (sp) {
        const d = stack[--sp];
        for (let k = 0; k < g.dotDeg[d]; k++) {
          const e = g.dotEdges[d * 4 + k];
          if (s.edges[e] === 0) continue;
          const o = g.edgeDots[e * 2] === d ? g.edgeDots[e * 2 + 1] : g.edgeDots[e * 2];
          if (!seen[o]) { seen[o] = 1; stack[sp++] = o; }
        }
      }
      for (let d = 0; d < g.ND; d++) if (s.deg[d] > 0 && !seen[d]) return false;
      for (let i = 0; i < g.NC; i++) {
        if (clues[i] <= 0) continue;
        let any = false;
        for (let k = 0; k < 4 && !any; k++) {
          const e = g.cellEdges[i * 4 + k];
          if (s.edges[e] !== 0 && seen[g.edgeDots[e * 2]]) any = true;
        }
        if (!any) return false;
      }
      return true;
    }

    function pickEdge(s) {
      // Most constrained clue cell first (fewest ways to place its remaining edges),
      // then the end of a path.
      let best = -1, bestWays = 1e9;
      for (let i = 0; i < g.NC; i++) {
        const k = clues[i];
        if (k < 0) continue;
        let on = 0, unk = 0, firstUnk = -1;
        for (let j = 0; j < 4; j++) {
          const e = g.cellEdges[i * 4 + j], v = s.edges[e];
          if (v === 1) on++;
          else if (v === -1) { unk++; if (firstUnk < 0) firstUnk = e; }
        }
        if (!unk) continue;
        const need = k - on;
        const ways = unk === 4 ? 6 : unk === 3 ? 3 : 2; // C(unk, need) upper bound for need in 1..unk-1
        const w = need === 1 || need === unk - 1 ? unk : ways;
        if (w < bestWays) { bestWays = w; best = firstUnk; if (w <= 2) break; }
      }
      if (best >= 0) return best;
      for (let d = 0; d < g.ND; d++) {
        if (s.deg[d] !== 1) continue;
        for (let k = 0; k < g.dotDeg[d]; k++) {
          const e = g.dotEdges[d * 4 + k];
          if (s.edges[e] === -1) return e;
        }
      }
      for (let e = 0; e < g.E; e++) if (s.edges[e] === -1) return e;
      return -1;
    }

    function dfs(s) {
      if (count >= limit) return;
      if (++nodes > budget) { count = -1e9; return; }
      if (!connectable(s)) return;
      if (s.unknown === 0) {
        if (s.closed && isValidSolution(g, clues, s.edges)) count++;
        return;
      }
      const e = pickEdge(s);
      if (e < 0) return;
      for (const v of [1, 0]) {
        const t = cloneState(s);
        solver.qh = solver.qt = 0;
        if (solver.set(t, e, v) && solver.propagate(t, false)) dfs(t);
        if (count >= limit || count < 0) return;
      }
    }
    dfs(s0);
    return count < 0 ? -1 : count;
  }

  root.Slither = { grid, edgesFromMask, cluesFromEdges, isValidSolution, loopOrder, Solver, countSolutions, cloneState };
})(typeof self !== 'undefined' ? self : globalThis);
