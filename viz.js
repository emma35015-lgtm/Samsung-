/* ===========================================================
   Métodos Cuantitativos · Samsung — motor interactivo
   SVG charts + EOQ math + transporte
   =========================================================== */
(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const DAYS = 365;

  /* ---------- helpers ---------- */
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const fmt1 = (n) => (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n) => "$" + fmt(n);
  const moneyM = (n) => "$" + (n / 1e6).toFixed(2) + "M";

  function svgEl(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function chart(w, h) {
    const s = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, class: "chart", preserveAspectRatio: "xMidYMid meet" });
    return s;
  }
  function line(x1, y1, x2, y2, cls) { return svgEl("line", { x1, y1, x2, y2, class: cls || "" }); }
  function text(x, y, str, cls, anchor) {
    const t = svgEl("text", { x, y, class: cls || "", "font-size": 11 });
    if (anchor) t.setAttribute("text-anchor", anchor);
    t.textContent = str;
    return t;
  }
  function path(d, cls) { return svgEl("path", { d, class: cls || "" }); }
  function poly(points, cls) { return svgEl("polygon", { points: points.map(p => p.join(",")).join(" "), class: cls || "" }); }

  /* ---------- generic lab scaffold ---------- */
  function scaffold(container, vizTitle) {
    container.innerHTML =
      '<div class="lab-viz"><div class="lab-title"><span class="live"></span> ' + vizTitle +
      '</div><div class="viz-slot"></div></div>' +
      '<div class="lab-panel"><div class="controls"></div><div class="readouts"></div>' +
      '<div class="formula"></div><button class="reset-btn">↺ Restablecer valores</button></div>';
    return {
      slot: container.querySelector(".viz-slot"),
      controls: container.querySelector(".controls"),
      readouts: container.querySelector(".readouts"),
      formula: container.querySelector(".formula"),
      reset: container.querySelector(".reset-btn"),
    };
  }

  function buildSliders(el, prefix, defs, state, onInput) {
    el.innerHTML = defs.map(d =>
      '<div class="ctrl"><div class="ctrl-top"><label for="' + prefix + d.id + '">' + d.label +
      '</label><span class="val" id="v-' + prefix + d.id + '"></span></div>' +
      '<input class="rng" type="range" id="' + prefix + d.id + '" min="' + d.min + '" max="' + d.max +
      '" step="' + d.step + '" value="' + state[d.id] + '"></div>'
    ).join("");
    defs.forEach(d => {
      const inp = el.querySelector("#" + prefix + d.id);
      inp.addEventListener("input", () => { state[d.id] = +inp.value; onInput(); });
    });
  }
  function setSliderVals(prefix, defs, state) {
    defs.forEach(d => {
      const v = document.getElementById("v-" + prefix + d.id);
      if (v) v.innerHTML = d.fmt ? d.fmt(state[d.id]) : fmt(state[d.id]) + (d.unit ? ' <small>' + d.unit + '</small>' : '');
    });
  }
  function renderReadouts(el, items) {
    el.innerHTML = items.map(it =>
      '<div class="ro' + (it.accent ? ' accent' : '') + '"><div class="ro-k">' + it.k +
      '</div><div class="ro-v">' + it.v + '</div></div>'
    ).join("");
  }

  /* ===========================================================
     LAB 1 — Compra CON déficit  (sawtooth)
     =========================================================== */
  function purchaseShortage(container) {
    const defs = [
      { id: "D", label: "Demanda anual (D)", min: 40000, max: 200000, step: 5000, unit: "u/año" },
      { id: "C2", label: "Costo por ordenar (C₂)", min: 1000, max: 6000, step: 100, fmt: v => "$" + fmt(v) },
      { id: "C3", label: "Costo almacenar (C₃)", min: 2, max: 20, step: 1, fmt: v => "$" + v + " /u" },
      { id: "C4", label: "Costo por déficit (C₄)", min: 6, max: 40, step: 1, fmt: v => "$" + v + " /u" },
    ];
    const def0 = { D: 120000, C2: 3500, C3: 8, C4: 20, C1: 45 };
    const state = Object.assign({}, def0);
    const ui = scaffold(container, "Nivel de inventario en el tiempo");
    ui.formula.innerHTML = 'Q* = √( 2·D·C<sub>2</sub> / C<sub>3</sub> ) · √( (C<sub>3</sub>+C<sub>4</sub>) / C<sub>4</sub> ) &nbsp;<span class="op">·</span>&nbsp; S = Q·C<sub>3</sub>/(C<sub>3</sub>+C<sub>4</sub>)';

    function calc(s) {
      const Q = Math.sqrt(2 * s.D * s.C2 / s.C3) * Math.sqrt((s.C3 + s.C4) / s.C4);
      const IM = Q * s.C4 / (s.C3 + s.C4);
      const S = Q * s.C3 / (s.C3 + s.C4);
      const N = s.D / Q, T = Q / s.D * DAYS;
      const CT = s.D * s.C1 + (s.D / Q) * s.C2 + s.C3 * IM * IM / (2 * Q) + s.C4 * S * S / (2 * Q);
      return { Q, IM, S, N, T, CT };
    }
    function draw(r) {
      const W = 620, H = 330, mL = 24, mR = 92, mT = 26, mB = 30;
      const pw = W - mL - mR, ph = H - mT - mB;
      const top = r.IM * 1.18, bot = -r.S * 1.18;
      const sy = v => mT + (top - v) / (top - bot) * ph;
      const y0 = sy(0);
      const cycW = pw / 2;
      const s = chart(W, H);
      // grid + zero
      s.appendChild(line(mL, mT, mL, mT + ph, "axis-line"));
      s.appendChild(line(mL, y0, mL + pw, y0, "zero-line"));
      s.appendChild(text(mL - 6, sy(r.IM) + 4, "", "")); // spacer
      for (let i = 0; i < 2; i++) {
        const xs = mL + i * cycW, xe = xs + cycW;
        const xz = xs + cycW * (r.IM / (r.IM + r.S));
        // positive fill
        s.appendChild(poly([[xs, y0], [xs, sy(r.IM)], [xz, y0]], "series-fill"));
        // negative fill
        s.appendChild(poly([[xz, y0], [xe, y0], [xe, sy(-r.S)]], "region-short"));
        // line
        s.appendChild(path(`M ${xs} ${sy(r.IM)} L ${xe} ${sy(-r.S)}`, "series"));
        if (i < 1) s.appendChild(path(`M ${xe} ${sy(-r.S)} L ${xe} ${sy(r.IM)}`, "series"));
      }
      // IM & S guides
      s.appendChild(line(mL, sy(r.IM), mL + pw, sy(r.IM), "guide"));
      s.appendChild(line(mL, sy(-r.S), mL + pw, sy(-r.S), "guide"));
      s.appendChild(text(mL + pw + 6, sy(r.IM) + 4, "I.M", "lbl-strong", "start"));
      s.appendChild(text(mL + pw + 6, sy(r.IM) + 18, fmt(r.IM), "", "start"));
      s.appendChild(text(mL + pw + 6, sy(-r.S) + 4, "S", "lbl-strong", "start"));
      s.appendChild(text(mL + pw + 6, sy(-r.S) + 18, fmt(r.S), "", "start"));
      s.appendChild(text(mL + pw + 6, y0 + 4, "0", "", "start"));
      s.appendChild(text(mL, H - 8, "tiempo →", "", "start"));
      ui.slot.innerHTML = ""; ui.slot.appendChild(s);
    }
    function update() {
      const r = calc(state); draw(r);
      setSliderVals("ps_", defs, state);
      renderReadouts(ui.readouts, [
        { k: "Q · pedido", v: fmt(r.Q) },
        { k: "S · déficit", v: fmt(r.S) },
        { k: "I.M · inv. máx", v: fmt(r.IM) },
        { k: "CT · costo anual", v: moneyM(r.CT), accent: true },
      ]);
    }
    buildSliders(ui.controls, "ps_", defs, state, update);
    ui.reset.addEventListener("click", () => { Object.assign(state, def0); buildSliders(ui.controls, "ps_", defs, state, update); update(); });
    update();
  }

  /* ===========================================================
     LAB 2 — Compra SIN déficit  (curva de costo total)
     =========================================================== */
  function purchaseNoShortage(container) {
    const defs = [
      { id: "D", label: "Demanda anual (D)", min: 30000, max: 160000, step: 5000, unit: "u/año" },
      { id: "C2", label: "Costo por ordenar (C₂)", min: 800, max: 5000, step: 100, fmt: v => "$" + fmt(v) },
      { id: "C3", label: "Costo almacenar (C₃)", min: 2, max: 16, step: 1, fmt: v => "$" + v + " /u" },
    ];
    const def0 = { D: 90000, C2: 2200, C3: 6, C1: 32 };
    const state = Object.assign({}, def0);
    let qRatio = 1; // current Q relative to Q*
    const ui = scaffold(container, "Costo anual vs. tamaño de pedido (Q)");
    ui.formula.innerHTML = 'Q* = √( 2·D·C<sub>2</sub> / C<sub>3</sub> ) &nbsp;<span class="op">→ mínimo de</span>&nbsp; CT = D·C<sub>2</sub>/Q + C<sub>3</sub>·Q/2';

    const W = 620, H = 330, mL = 50, mR = 18, mT = 22, mB = 40;
    const pw = W - mL - mR, ph = H - mT - mB;
    let geo = null; // {Qmin,Qmax,yMax,Qopt}

    function order(Q, s) { return s.D * s.C2 / Q; }
    function hold(Q, s) { return s.C3 * Q / 2; }
    function total(Q, s) { return order(Q, s) + hold(Q, s); }

    function draw() {
      const s = state;
      const Qopt = Math.sqrt(2 * s.D * s.C2 / s.C3);
      const minCost = Math.sqrt(2 * s.D * s.C2 * s.C3);
      const Qmin = Qopt * 0.28, Qmax = Qopt * 2.6;
      const yMax = total(Qmin, s) * 1.04;
      geo = { Qmin, Qmax, yMax, Qopt };
      const sx = Q => mL + (Q - Qmin) / (Qmax - Qmin) * pw;
      const sy = c => (mT + ph) - Math.min(c, yMax) / yMax * ph;
      const svg = chart(W, H);
      // axes
      svg.appendChild(line(mL, mT, mL, mT + ph, "axis-line"));
      svg.appendChild(line(mL, mT + ph, mL + pw, mT + ph, "axis-line"));
      // gridlines y
      for (let i = 1; i <= 4; i++) { const yy = mT + ph - (i / 4) * ph; svg.appendChild(line(mL, yy, mL + pw, yy, "grid-line")); }
      // curves
      const N = 80;
      const build = fn => { let d = ""; for (let i = 0; i <= N; i++) { const Q = Qmin + (Qmax - Qmin) * i / N; const x = sx(Q), y = sy(fn(Q, s)); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " "; } return d; };
      svg.appendChild(path(build(order), "series-2"));
      svg.appendChild(path(build(hold), "series-2"));
      const tot = path(build(total), "series"); svg.appendChild(tot);
      // optimum marker
      svg.appendChild(line(sx(Qopt), sy(minCost), sx(Qopt), mT + ph, "guide"));
      svg.appendChild(svgEl("circle", { cx: sx(Qopt), cy: sy(minCost), r: 4, class: "cost-min" }));
      svg.appendChild(text(sx(Qopt), mT + ph + 16, "Q* " + fmt(Qopt), "lbl-strong", "middle"));
      // current handle
      const Qcur = Qopt * qRatio, Ccur = total(Qcur, s);
      const hx = sx(Qcur), hy = sy(Ccur);
      svg.appendChild(line(hx, hy, hx, mT + ph, "guide"));
      svg.appendChild(line(mL, hy, hx, hy, "guide"));
      svg.appendChild(text(mL - 8, hy + 4, moneyM(Ccur).replace("$", "$"), "lbl-strong", "end"));
      const hit = svgEl("circle", { cx: hx, cy: hy, r: 16, class: "handle-hit" });
      const handle = svgEl("circle", { cx: hx, cy: hy, r: 7, class: "handle" });
      svg.appendChild(hit); svg.appendChild(handle);
      // labels for curves
      svg.appendChild(text(sx(Qmax) - 4, sy(hold(Qmax, s)) - 6, "almacenar", "", "end"));
      svg.appendChild(text(sx(Qmin) + 30, sy(order(Qmin * 1.1, s)), "ordenar", "", "start"));
      svg.appendChild(text(mL + 6, mT + 12, "costo $", "", "start"));
      svg.appendChild(text(mL + pw, mT + ph + 16, "Q →", "", "end"));
      ui.slot.innerHTML = ""; ui.slot.appendChild(svg);
      // drag
      function startDrag(ev) {
        ev.preventDefault();
        const rect = svg.getBoundingClientRect();
        const move = e => {
          const cx = (e.touches ? e.touches[0].clientX : e.clientX);
          const px = (cx - rect.left) / rect.width * W; // viewBox x
          let Q = Qmin + (px - mL) / pw * (Qmax - Qmin);
          Q = Math.max(Qmin, Math.min(Qmax, Q));
          qRatio = Q / Qopt;
          draw(); update();
        };
        const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
        window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
      }
      hit.addEventListener("pointerdown", startDrag);
      handle.addEventListener("pointerdown", startDrag);
    }
    function update() {
      const s = state;
      const Qopt = Math.sqrt(2 * s.D * s.C2 / s.C3);
      const minCost = Math.sqrt(2 * s.D * s.C2 * s.C3) + s.D * s.C1;
      const Qcur = Qopt * qRatio;
      const Ccur = total(Qcur, s) + s.D * s.C1;
      const over = ((Ccur - minCost) / minCost) * 100;
      setSliderVals("pn_", defs, state);
      renderReadouts(ui.readouts, [
        { k: "Q actual", v: fmt(Qcur) },
        { k: "Costo actual", v: moneyM(Ccur) },
        { k: "Q óptimo", v: fmt(Qopt) },
        { k: over < 0.05 ? "✓ en el óptimo" : "Sobrecosto", v: over < 0.05 ? moneyM(minCost) : "+" + over.toFixed(1) + "%", accent: true },
      ]);
    }
    buildSliders(ui.controls, "pn_", defs, state, () => { draw(); update(); });
    ui.reset.addEventListener("click", () => { Object.assign(state, def0); qRatio = 1; buildSliders(ui.controls, "pn_", defs, state, () => { draw(); update(); }); draw(); update(); });
    draw(); update();
  }

  /* ===========================================================
     LAB 3 & 4 — Producción (con / sin déficit)
     =========================================================== */
  function production(container, withShortage) {
    const defsBase = [
      { id: "D", label: "Demanda anual (D)", min: 30000, max: 200000, step: 5000, unit: "u/año" },
      { id: "R", label: "Tasa de producción (R)", min: 60000, max: 320000, step: 5000, unit: "u/año" },
      { id: "C2", label: "Costo de preparación (C₂)", min: 1000, max: 8000, step: 100, fmt: v => "$" + fmt(v) },
      { id: "C3", label: "Costo almacenar (C₃)", min: 4, max: 260, step: 2, fmt: v => "$" + v + " /u" },
    ];
    const defsShort = defsBase.concat([{ id: "C4", label: "Costo por déficit (C₄)", min: 8, max: 60, step: 1, fmt: v => "$" + v + " /u" }]);
    const defs = withShortage ? defsShort : defsBase;
    const def0 = withShortage
      ? { D: 150000, R: 240000, C2: 4200, C3: 10, C4: 25, C1: 52 }
      : { D: 60000, R: 90000, C2: 5280, C3: 210, C1: 55 };
    const state = Object.assign({}, def0);
    const pfx = withShortage ? "p3_" : "p4_";
    const ui = scaffold(container, "Acumulación y consumo de inventario");
    ui.formula.innerHTML = withShortage
      ? 'Q* = √( 2·D·C<sub>2</sub>/C<sub>3</sub> ) · √( R/(R−D) ) · √( (C<sub>3</sub>+C<sub>4</sub>)/C<sub>4</sub> )'
      : 'Q* = √( 2·D·C<sub>2</sub> / ( C<sub>3</sub>·(1−D/R) ) ) &nbsp;<span class="op">·</span>&nbsp; I.M = Q·(1−D/R)';

    function calc(s) {
      const k = 1 - s.D / s.R;
      let Q, IM, S = 0, CT;
      if (withShortage) {
        Q = Math.sqrt(2 * s.D * s.C2 / s.C3) * Math.sqrt(1 / k) * Math.sqrt((s.C3 + s.C4) / s.C4);
        IM = Q * k * s.C4 / (s.C3 + s.C4);
        S = Q * k * s.C3 / (s.C3 + s.C4);
        CT = s.D * s.C1 + (s.D / Q) * s.C2 + s.C3 * IM * IM / (2 * Q * k) + s.C4 * S * S / (2 * Q * k);
      } else {
        Q = Math.sqrt(2 * s.D * s.C2 / (s.C3 * k));
        IM = Q * k;
        CT = s.D * s.C1 + (s.D / Q) * s.C2 + s.C3 * Q * k / 2;
      }
      const N = s.D / Q, T = Q / s.D * DAYS;
      return { k, Q, IM, S, N, T, CT };
    }
    function draw(r, s) {
      const W = 620, H = 330, mL = 24, mR = 86, mT = 26, mB = 30;
      const pw = W - mL - mR, ph = H - mT - mB;
      const top = r.IM * 1.18, bot = withShortage ? -r.S * 1.25 : -top * 0.06;
      const sy = v => mT + (top - v) / (top - bot) * ph;
      const y0 = sy(0);
      const cycW = pw / 2;
      const peakFrac = s.D / s.R; // fraction of cycle at which inventory peaks
      const svg = chart(W, H);
      svg.appendChild(line(mL, mT, mL, mT + ph, "axis-line"));
      svg.appendChild(line(mL, y0, mL + pw, y0, "zero-line"));
      const lo = withShortage ? -r.S : 0;
      for (let i = 0; i < 2; i++) {
        const xs = mL + i * cycW, xp = xs + cycW * peakFrac, xe = xs + cycW;
        // fill under positive region
        if (withShortage) {
          // rising crosses zero at x where value=0 between xs(lo) and xp(IM)
          const xz1 = xs + (xp - xs) * (0 - lo) / (r.IM - lo);
          const xz2 = xp + (xe - xp) * (r.IM - 0) / (r.IM - lo);
          svg.appendChild(poly([[xz1, y0], [xp, sy(r.IM)], [xz2, y0]], "series-fill"));
          svg.appendChild(poly([[xs, y0], [xs, sy(lo)], [xz1, y0]], "region-short"));
          svg.appendChild(poly([[xz2, y0], [xe, sy(lo)], [xe, y0]], "region-short"));
        } else {
          svg.appendChild(poly([[xs, y0], [xp, sy(r.IM)], [xe, y0]], "series-fill"));
        }
        svg.appendChild(path(`M ${xs} ${sy(lo)} L ${xp} ${sy(r.IM)} L ${xe} ${sy(lo)}`, "series"));
        if (i < 1) svg.appendChild(path(`M ${xe} ${sy(lo)} L ${xe} ${sy(lo)}`, "series"));
      }
      // slope annotations
      svg.appendChild(line(mL, sy(r.IM), mL + pw, sy(r.IM), "guide"));
      svg.appendChild(text(mL + pw + 6, sy(r.IM) + 4, "I.M", "lbl-strong", "start"));
      svg.appendChild(text(mL + pw + 6, sy(r.IM) + 18, fmt(r.IM), "", "start"));
      if (withShortage) {
        svg.appendChild(line(mL, sy(-r.S), mL + pw, sy(-r.S), "guide"));
        svg.appendChild(text(mL + pw + 6, sy(-r.S) + 4, "S", "lbl-strong", "start"));
        svg.appendChild(text(mL + pw + 6, sy(-r.S) + 18, fmt(r.S), "", "start"));
      }
      svg.appendChild(text(mL + pw + 6, y0 + 4, "0", "", "start"));
      // rate labels
      svg.appendChild(text(mL + cycW * peakFrac * 0.5, sy(r.IM * 0.5) - 4, "+ (R−D)", "", "middle"));
      svg.appendChild(text(mL + cycW * (peakFrac + (1 - peakFrac) * 0.5), sy(r.IM * 0.5) - 4, "− D", "", "middle"));
      svg.appendChild(text(mL, H - 8, "tiempo →", "", "start"));
      ui.slot.innerHTML = ""; ui.slot.appendChild(svg);
    }
    function update() {
      const r = calc(state);
      // guard against R<=D
      if (state.R <= state.D + 1000) { state.R = state.D + 5000; }
      draw(r, state);
      setSliderVals(pfx, defs, state);
      const items = withShortage
        ? [{ k: "Q · producción", v: fmt(r.Q) }, { k: "S · agotadas", v: fmt(r.S) }, { k: "I.M · inv. máx", v: fmt(r.IM) }, { k: "CT · costo anual", v: moneyM(r.CT), accent: true }]
        : [{ k: "Q · lote", v: fmt(r.Q) }, { k: "I.M · inv. máx", v: fmt(r.IM) }, { k: "T · entre corridas", v: fmt(r.T) + " d" }, { k: "CT · costo anual", v: moneyM(r.CT), accent: true }];
      renderReadouts(ui.readouts, items);
    }
    buildSliders(ui.controls, pfx, defs, state, update);
    ui.reset.addEventListener("click", () => { Object.assign(state, def0); buildSliders(ui.controls, pfx, defs, state, update); update(); });
    update();
  }

  /* ===========================================================
     TRANSPORTE
     =========================================================== */
  function transport(container) {
    const dest = ["Norteamérica", "Europa", "Latinoamérica"];
    const plant = ["Planta A", "Planta B", "Planta C"];
    const supply = [5000, 6000, 2500];
    const demand = [6000, 4000, 3500];
    // cost[plant][dest]  (N,E,L)
    const cost = [[18, 12, 15], [13, 20, 11], [10, 14, 16]];
    // solutions: list of [p,d,qty]
    const sol = {
      eno: { name: "Esquina Noroeste", total: 234000, optimal: false,
        alloc: [[0, 0, 5000], [1, 0, 1000], [1, 1, 4000], [1, 2, 1000], [2, 2, 2500]],
        note: "Asigna desde la esquina superior izquierda sin mirar los costos. Es rápido y siempre factible, pero no óptimo: cae en las rutas penalizadas de $18 y $20. Representa un gasto base de <b>$234 000</b> al mes." },
      vogel: { name: "Aproximación de Vogel", total: 162000, optimal: true,
        alloc: [[0, 1, 4000], [0, 0, 1000], [1, 0, 2500], [1, 2, 3500], [2, 0, 2500]],
        note: "Analiza los costos de oportunidad globales: bloquea y evita por completo las rutas más caras de la matriz (las tarifas de $18 y $20). Garantiza cubrir la demanda al <b>menor costo: $162 000</b>." },
      min: { name: "Costo Mínimo", total: 162000, optimal: true,
        alloc: [[0, 1, 4000], [0, 0, 1000], [1, 2, 3500], [1, 0, 2500], [2, 0, 2500]],
        note: "Asigna primero a la celda más barata disponible. La Planta A envía 4 000 a Europa y 1 000 a Norteamérica; la B, 3 500 a Latinoamérica y 2 500 a Norteamérica; la C dirige sus 2 500 a Norteamérica. Total óptimo: <b>$162 000</b>." },
    };
    let current = "eno";

    container.innerHTML =
      '<div class="method-tabs" role="tablist">' +
      Object.keys(sol).map(k => '<button class="method-tab" role="tab" data-m="' + k + '">' + sol[k].name + '</button>').join("") +
      '</div>' +
      '<div class="transport-grid">' +
        '<div class="matrix-wrap"><table class="matrix"><thead><tr><th></th>' +
          dest.map(d => '<th>' + d + '</th>').join("") + '<th>Oferta</th></tr></thead><tbody id="tBody"></tbody>' +
          '<tfoot><tr><th>Demanda</th>' + demand.map(d => '<td class="demand-cell">' + fmt(d) + '</td>').join("") + '<td>13,500</td></tr></tfoot>' +
        '</table></div>' +
        '<div class="flow-card"><div class="flow" id="flow"></div>' +
          '<p class="text-body" id="methodNote" style="font-size:.92rem;margin-top:16px"></p></div>' +
      '</div>' +
      '<div class="cost-summary">' +
        Object.keys(sol).map(k => '<div class="cost-pill' + (sol[k].optimal ? ' optimal' : '') + '" data-pill="' + k + '">' +
          '<div class="cp-m">' + sol[k].name + '</div><div class="cp-v">' + money(sol[k].total) + '</div>' +
          '<div class="cp-tag">' + (sol[k].optimal ? '✓ Óptimo' : 'Factible, no óptimo') + '</div></div>').join("") +
      '</div>' +
      '<div class="savings-bar"><div class="ctrl-top"><label>Ahorro vs. solución inicial (Esquina Noroeste)</label>' +
        '<span class="val" id="savePct"></span></div><div class="savings-track"><div class="savings-fill" id="saveFill"></div></div></div>';

    const tBody = container.querySelector("#tBody");
    function renderMatrix() {
      const a = sol[current].alloc;
      const map = {};
      a.forEach(([p, d, q]) => map[p + "-" + d] = q);
      tBody.innerHTML = plant.map((pn, pi) =>
        '<tr><th>' + pn + '</th>' +
        dest.map((dn, di) => {
          const q = map[pi + "-" + di];
          return '<td><div class="cell ' + (q ? "used basic" : "") + '"><span class="cost">$' + cost[pi][di] + '</span>' +
            '<span class="alloc">' + (q ? fmt(q) : "") + '</span></div></td>';
        }).join("") +
        '<td class="supply-cell">' + fmt(supply[pi]) + '</td></tr>'
      ).join("");
    }

    const flow = container.querySelector("#flow");
    function renderFlow() {
      const W = 460, H = 290;
      const px = 64, dx = 396, bw = 96, bh = 44;
      const py = [54, 145, 236];
      const a = sol[current].alloc;
      const svg = chart(W, H);
      // paths first (under nodes)
      a.forEach(([p, d, q]) => {
        const y1 = py[p], y2 = py[d];
        const x1 = px + bw / 2, x2 = dx - bw / 2;
        const mx = (x1 + x2) / 2;
        const pth = path(`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, "flow-path");
        pth.setAttribute("stroke-width", (1.5 + q / 600).toFixed(1));
        svg.appendChild(pth);
        svg.appendChild(text((x1 + x2) / 2, (y1 + y2) / 2 - 4, fmt(q), "flow-cost", "middle"));
      });
      // plant nodes
      const pnames = ["A", "B", "C"], dnames = ["N. América", "Europa", "Latinoam."];
      plant.forEach((pn, i) => {
        svg.appendChild(svgEl("rect", { x: px - bw / 2, y: py[i] - bh / 2, width: bw, height: bh, rx: 6, class: "node-box" }));
        svg.appendChild(text(px, py[i] - 2, "Planta " + pnames[i], "node-label", "middle"));
        svg.appendChild(text(px, py[i] + 13, "oferta " + fmt(supply[i]), "node-sub", "middle"));
      });
      dest.forEach((dn, i) => {
        svg.appendChild(svgEl("rect", { x: dx - bw / 2, y: py[i] - bh / 2, width: bw, height: bh, rx: 6, class: "node-box" }));
        svg.appendChild(text(dx, py[i] - 2, dnames[i], "node-label", "middle"));
        svg.appendChild(text(dx, py[i] + 13, "demanda " + fmt(demand[i]), "node-sub", "middle"));
      });
      flow.innerHTML = ""; flow.appendChild(svg);
    }

    function update() {
      renderMatrix(); renderFlow();
      container.querySelector("#methodNote").innerHTML = sol[current].note;
      container.querySelectorAll(".method-tab").forEach(b => b.setAttribute("aria-selected", b.dataset.m === current));
      container.querySelectorAll(".cost-pill").forEach(p => p.classList.toggle("active", p.dataset.pill === current));
      const save = (234000 - sol[current].total) / 234000 * 100;
      container.querySelector("#saveFill").style.width = save + "%";
      container.querySelector("#savePct").textContent = save < 0.1 ? "—" : "−" + save.toFixed(0) + "% · " + money(234000 - sol[current].total);
    }
    container.querySelectorAll(".method-tab").forEach(b => b.addEventListener("click", () => { current = b.dataset.m; update(); }));
    container.querySelectorAll(".cost-pill").forEach(p => p.addEventListener("click", () => { current = p.dataset.pill; update(); }));
    update();
  }

  /* ===========================================================
     INIT — labs, nav, reveal
     =========================================================== */
  const builders = { purchaseShortage, purchaseNoShortage, prodShortage: c => production(c, true), prodNoShortage: c => production(c, false) };

  function init() {
    document.querySelectorAll("[data-lab]").forEach(el => { const b = builders[el.dataset.lab]; if (b) b(el); });
    const tl = document.getElementById("transportLab"); if (tl) transport(tl);

    // nav scroll + progress
    const nav = document.getElementById("nav"), prog = document.getElementById("navProgress");
    function onScroll() {
      const st = window.scrollY || document.documentElement.scrollTop;
      nav.classList.toggle("scrolled", st > 40);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // reveal
    const ro = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } }), { threshold: 0.12 });
    document.querySelectorAll(".reveal:not(.in)").forEach(el => ro.observe(el));

    // active nav link
    const links = [...document.querySelectorAll(".nav-links a")];
    const map = {}; links.forEach(a => { const id = a.getAttribute("href").slice(1); const s = document.getElementById(id); if (s) map[id] = a; });
    const so = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { links.forEach(l => l.classList.remove("active")); if (map[e.target.id]) map[e.target.id].classList.add("active"); } }), { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(map).forEach(id => so.observe(document.getElementById(id)));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
