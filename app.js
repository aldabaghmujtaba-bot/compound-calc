(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const els = {
    principal: $('principal'),
    monthly: $('monthly'),
    rate: $('rate'),
    inflation: $('inflation'),
    inflationOut: $('inflationOut'),
    years: $('years'),
    yearsOut: $('yearsOut'),
    seg: document.querySelectorAll('.seg__btn'),

    finalBalance: $('finalBalance'),
    realBalance: $('realBalance'),
    metaPrincipal: $('metaPrincipal'),
    metaContrib: $('metaContrib'),
    metaInterest: $('metaInterest'),
    bdReal: $('bdReal'),
    tlRealBalance: $('tlRealBalance'),
    tlTotalReal: $('tlTotalReal'),

    chart: $('chart'),
    chartHint: $('chartHint'),
    tooltip: $('tooltip'),

    barPrincipal: $('barPrincipal'),
    barContrib: $('barContrib'),
    barInterest: $('barInterest'),

    bdPrincipal: $('bdPrincipal'),
    bdContrib: $('bdContrib'),
    bdInterest: $('bdInterest'),
    bdTotal: $('bdTotal'),

    cmpChart: $('cmpChart'),
    cmpTableBody: $('cmpTableBody'),

    modeBtns: document.querySelectorAll('[data-mode-btn]'),
    tlFinalBalance: $('tlFinalBalance'),
    tlMetaInvested: $('tlMetaInvested'),
    tlMetaInterest: $('tlMetaInterest'),
    tlMetaWithdrawn: $('tlMetaWithdrawn'),
    tlYears: $('tlYears'),
    tlBar: $('tlBar'),
    tlBarAxis: $('tlBarAxis'),
    tlChart: $('tlChart'),
    phasesList: $('phasesList'),
    addPhaseBtn: $('addPhase'),
    tlTotalInvested: $('tlTotalInvested'),
    tlTotalWithdrawn: $('tlTotalWithdrawn'),
    tlTotalInterest: $('tlTotalInterest'),
    tlTotalBalance: $('tlTotalBalance'),

    installState: $('installState'),
  };

  const TIERS = [1000, 2000, 3000, 4000, 5000, 6000, 7000];

  let phaseIdCounter = 0;
  const newPhaseId = () => ++phaseIdCounter;

  const state = {
    mode: 'simple',
    principal: 10000,
    monthly: 500,
    rate: 7,
    inflation: 3,
    years: 20,
    freq: 12,
    series: [],
    activeYear: null,
    phases: [
      { id: newPhaseId(), label: 'Accumulation', type: 'contribute', years: 25, amount: 1000 },
      { id: newPhaseId(), label: 'Retirement',   type: 'withdraw',   years: 20, amount: 4000 },
    ],
  };

  const PHASE_TYPES = ['contribute', 'coast', 'withdraw'];
  const PHASE_LABEL = { contribute: 'Contribute', coast: 'Coast', withdraw: 'Withdraw' };
  const PHASE_COLOR = { contribute: '#8cf0c4', coast: '#6ea8ff', withdraw: '#ffb86b' };

  // ---- Formatting helpers ----
  const fmtCurrency = (n) => {
    if (!isFinite(n)) return '$0';
    const sign = n < 0 ? '-' : '';
    const v = Math.abs(Math.round(n));
    return sign + '$' + v.toLocaleString('en-US');
  };
  const fmtCurrencyShort = (n) => {
    const a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
  };
  const parseNumber = (s) => {
    if (typeof s !== 'string') s = String(s ?? '');
    const cleaned = s.replace(/[^\d.\-]/g, '');
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  };
  const formatThousands = (n) => {
    if (!isFinite(n)) return '0';
    return Math.round(n).toLocaleString('en-US');
  };

  // Inflation: convert nominal $ to today's purchasing power.
  // real = nominal / (1 + inflation%)^years, capped to <= nominal.
  const realValue = (nominal, inflationPct, years) => {
    if (!isFinite(nominal)) return 0;
    const i = Math.max(0, inflationPct || 0);
    const y = Math.max(0, years || 0);
    if (i <= 0 || y <= 0) return nominal;
    const r = nominal / Math.pow(1 + i / 100, y);
    return Math.min(nominal, r);
  };
  const fmtReal = (n) => '~' + fmtCurrency(n);
  const fmtRealShort = (n) => '~' + fmtCurrencyShort(n);

  // Inflate a "today's $" amount forward to what it costs at year `years`.
  // inflated = nominal * (1 + i/100)^years
  const inflatedAmount = (amount, inflationPct, years) => {
    if (!isFinite(amount)) return 0;
    const i = Math.max(0, inflationPct || 0);
    const y = Math.max(0, years || 0);
    if (i <= 0 || y <= 0) return amount;
    return amount * Math.pow(1 + i / 100, y);
  };

  // ---- Compound interest engine (month-by-month simulation) ----
  function simulate(principal, monthly, annualRate, freq, years) {
    const r = annualRate / 100;
    const monthsPerCompound = 12 / freq;
    const ratePerCompound = r / freq;

    let balance = principal;
    let totalContrib = 0;
    let totalInterest = 0;

    const series = [{
      year: 0,
      balance: principal,
      principal: principal,
      contrib: 0,
      interest: 0,
    }];

    const totalMonths = years * 12;
    for (let m = 1; m <= totalMonths; m++) {
      if (monthly > 0) {
        balance += monthly;
        totalContrib += monthly;
      }
      if (m % monthsPerCompound === 0) {
        const interest = balance * ratePerCompound;
        balance += interest;
        totalInterest += interest;
      }
      if (m % 12 === 0) {
        series.push({
          year: m / 12,
          balance,
          principal,
          contrib: totalContrib,
          interest: totalInterest,
        });
      }
    }

    return {
      finalBalance: balance,
      totalContrib,
      totalInterest,
      principal,
      series,
    };
  }

  // ---- Year-by-year chart (SVG, no libs) ----
  function renderChart(series) {
    const svg = els.chart;
    const W = svg.clientWidth || 360;
    const H = 220;
    const padL = 40, padR = 8, padT = 10, padB = 22;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const data = series.slice(1);
    const n = data.length;
    if (n === 0) {
      svg.innerHTML = '';
      return;
    }
    const maxVal = Math.max(...data.map((d) => d.balance), 1);
    const niceMax = niceCeil(maxVal);

    const barGap = n > 20 ? 2 : 4;
    const barW = Math.max(3, (innerW - barGap * (n - 1)) / n);

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const ticks = 4;
    let yAxis = '';
    for (let i = 0; i <= ticks; i++) {
      const v = (niceMax * i) / ticks;
      const y = padT + innerH - (v / niceMax) * innerH;
      yAxis += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="currentColor" stroke-opacity="0.08"/>`;
      yAxis += `<text x="${padL - 6}" y="${y + 3}" text-anchor="end">${fmtCurrencyShort(v)}</text>`;
    }

    let xLabels = '';
    const labelStride = n <= 10 ? 1 : n <= 20 ? 2 : n <= 30 ? 5 : 10;
    for (let i = 0; i < n; i++) {
      const d = data[i];
      const showLabel = (i === 0) || ((i + 1) % labelStride === 0) || (i === n - 1);
      if (!showLabel) continue;
      const x = padL + i * (barW + barGap) + barW / 2;
      xLabels += `<text x="${x}" y="${H - 6}" text-anchor="middle">${d.year}y</text>`;
    }

    let bars = '';
    for (let i = 0; i < n; i++) {
      const d = data[i];
      const x = padL + i * (barW + barGap);
      const pPart = (d.principal / niceMax) * innerH;
      const cPart = (d.contrib / niceMax) * innerH;
      const iPart = (d.interest / niceMax) * innerH;

      const yP = padT + innerH - pPart;
      const yC = yP - cPart;
      const yI = yC - iPart;

      bars += `<g class="bar-stack" data-year="${d.year}">`;
      bars += `<rect class="seg-principal" x="${x}" y="${yP}" width="${barW}" height="${pPart}" rx="${Math.min(2, barW/3)}"/>`;
      if (cPart > 0) bars += `<rect class="seg-contrib" x="${x}" y="${yC}" width="${barW}" height="${cPart}"/>`;
      if (iPart > 0) bars += `<rect class="seg-interest" x="${x}" y="${yI}" width="${barW}" height="${iPart}" rx="${Math.min(2, barW/3)}"/>`;
      bars += `</g>`;
      bars += `<rect class="bar-hit" data-year="${d.year}" x="${x - barGap/2}" y="${padT}" width="${barW + barGap}" height="${innerH}"/>`;
    }

    svg.innerHTML =
      `<g class="axis" color="var(--muted)">${yAxis}${xLabels}</g>` +
      `<g class="bars">${bars}</g>`;

    bindChartInteraction(data);
  }

  function bindChartInteraction(data) {
    const svg = els.chart;
    const onTap = (evt) => {
      const target = evt.target.closest('[data-year]');
      if (!target) return hideTooltip();
      const year = parseInt(target.getAttribute('data-year'), 10);
      const d = data.find((x) => x.year === year);
      if (!d) return;
      showTooltip(evt, d);
      highlightBar(year);
    };
    svg.onclick = onTap;
    svg.ontouchstart = (e) => { onTap(e); };
    document.addEventListener('click', (e) => {
      if (!svg.contains(e.target)) hideTooltip();
    });
  }

  function highlightBar(year) {
    state.activeYear = year;
    els.chart.querySelectorAll('.bar-stack').forEach((g) => {
      g.classList.toggle('is-active', parseInt(g.getAttribute('data-year'), 10) === year);
    });
  }

  function showTooltip(evt, d) {
    const t = els.tooltip;
    t.innerHTML =
      `<strong>Year ${d.year}</strong>` +
      `<em>Balance ${fmtCurrency(d.balance)}</em><br/>` +
      `<em>+ Interest ${fmtCurrency(d.interest)}</em>`;
    t.hidden = false;
    const x = (evt.touches?.[0]?.clientX ?? evt.clientX) || window.innerWidth / 2;
    const y = (evt.touches?.[0]?.clientY ?? evt.clientY) || 200;
    t.style.left = x + 'px';
    t.style.top = (y - 12) + 'px';
    els.chartHint.textContent = `Year ${d.year}: ${fmtCurrency(d.balance)}`;
    clearTimeout(showTooltip._t);
    showTooltip._t = setTimeout(hideTooltip, 2500);
  }

  function hideTooltip() {
    els.tooltip.hidden = true;
    state.activeYear = null;
    els.chart.querySelectorAll('.bar-stack.is-active').forEach((g) => g.classList.remove('is-active'));
    els.chartHint.textContent = 'Tap a bar';
  }

  // ---- Contribution comparison ----
  function tierColor(idx, total) {
    const t = total <= 1 ? 0 : idx / (total - 1);
    const start = [167, 199, 255]; // light cool blue
    const end   = [40, 95, 220];   // deep saturated blue
    const c = start.map((s, i) => Math.round(s + (end[i] - s) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }

  function matchedTier(monthly) {
    if (!isFinite(monthly) || monthly <= 0) return null;
    const rounded = Math.round(monthly / 1000) * 1000;
    return TIERS.includes(rounded) ? rounded : null;
  }

  function tierLabel(amount) {
    return '$' + (amount / 1000) + 'k';
  }

  function renderComparison() {
    const rows = TIERS.map((m) => {
      const r = simulate(state.principal, m, state.rate, state.freq, state.years);
      return {
        monthly: m,
        contrib: r.totalContrib,
        interest: r.totalInterest,
        balance: r.finalBalance,
      };
    });

    const maxBalance = Math.max(...rows.map((r) => r.balance), 1);
    const matched = matchedTier(state.monthly);

    let chartHtml = '';
    rows.forEach((r, i) => {
      const pct = (r.balance / maxBalance) * 100;
      const isYou = r.monthly === matched;
      const color = tierColor(i, TIERS.length);
      chartHtml +=
        `<div class="cmp-row${isYou ? ' is-you' : ''}" data-tier="${r.monthly}" role="listitem" aria-label="${tierLabel(r.monthly)} per month: ${fmtCurrency(r.balance)}">` +
          `<span class="cmp-row__label">${tierLabel(r.monthly)}</span>` +
          `<div class="cmp-row__track">` +
            `<div class="cmp-row__bar" style="width: ${pct.toFixed(2)}%; background: ${color};"></div>` +
          `</div>` +
          `<span class="cmp-row__value">${fmtCurrencyShort(r.balance)}</span>` +
          (isYou ? `<span class="cmp-row__you" aria-hidden="true">← you</span>` : '') +
        `</div>`;
    });
    els.cmpChart.innerHTML = chartHtml;

    let tbody = '';
    rows.forEach((r) => {
      const isYou = r.monthly === matched;
      tbody +=
        `<tr${isYou ? ' class="is-you"' : ''}>` +
          `<td>${tierLabel(r.monthly)}/mo${isYou ? ' ←' : ''}</td>` +
          `<td>${fmtCurrency(r.contrib)}</td>` +
          `<td>${fmtCurrency(r.interest)}</td>` +
          `<td>${fmtCurrency(r.balance)}</td>` +
        `</tr>`;
    });
    els.cmpTableBody.innerHTML = tbody;
  }

  // ---- Timeline mode simulation ----
  function simulateTimeline(startBalance, phases, annualRate, freq, inflationPct) {
    const r = annualRate / 100;
    const monthsPerCompound = Math.max(1, Math.round(12 / freq));
    const ratePerCompound = r / freq;

    let balance = startBalance;
    let totalContrib = 0;
    let totalWithdraw = 0;
    let totalInterest = 0;
    let cumulMonth = 0;

    const phaseResults = [];
    const series = [{ year: 0, balance, realBalance: balance, contribCum: 0, withdrawCum: 0, interestCum: 0, phaseIndex: -1 }];
    const phaseBoundaries = [{ year: 0, phaseIndex: -1 }];

    phases.forEach((phase, pIdx) => {
      const years = Math.max(0, Math.min(120, phase.years || 0));
      const months = Math.round(years * 12);
      const amount = Math.max(0, phase.amount || 0);
      const startBal = balance;
      let phaseContrib = 0;
      let phaseWithdraw = 0;
      let phaseInterest = 0;

      for (let m = 1; m <= months; m++) {
        cumulMonth++;
        if (phase.type === 'contribute' && amount > 0) {
          balance += amount;
          phaseContrib += amount;
          totalContrib += amount;
        } else if (phase.type === 'withdraw' && amount > 0) {
          const w = Math.min(amount, Math.max(0, balance));
          balance -= w;
          phaseWithdraw += w;
          totalWithdraw += w;
        }
        if (cumulMonth % monthsPerCompound === 0 && balance > 0) {
          const interest = balance * ratePerCompound;
          balance += interest;
          phaseInterest += interest;
          totalInterest += interest;
        }
        if (cumulMonth % 12 === 0) {
          const y = cumulMonth / 12;
          series.push({
            year: y,
            balance,
            realBalance: realValue(balance, inflationPct, y),
            contribCum: totalContrib,
            withdrawCum: totalWithdraw,
            interestCum: totalInterest,
            phaseIndex: pIdx,
          });
        }
      }

      // Always record an end-of-phase boundary point even if duration isn't whole years
      const endYear = cumulMonth / 12;
      phaseBoundaries.push({ year: endYear, phaseIndex: pIdx });
      const last = series[series.length - 1];
      if (!last || Math.abs(last.year - endYear) > 1e-6) {
        series.push({
          year: endYear,
          balance,
          realBalance: realValue(balance, inflationPct, endYear),
          contribCum: totalContrib,
          withdrawCum: totalWithdraw,
          interestCum: totalInterest,
          phaseIndex: pIdx,
        });
      }

      phaseResults.push({
        ...phase,
        startBalance: startBal,
        endBalance: balance,
        realEndBalance: realValue(balance, inflationPct, endYear),
        contrib: phaseContrib,
        withdraw: phaseWithdraw,
        interest: phaseInterest,
        startYear: phaseBoundaries[phaseBoundaries.length - 2].year,
        endYear,
      });
    });

    const totalYears = cumulMonth / 12;
    return {
      finalBalance: balance,
      finalRealBalance: realValue(balance, inflationPct, totalYears),
      totalContrib,
      totalWithdraw,
      totalInterest,
      phaseResults,
      series,
      phaseBoundaries,
      totalYears,
      inflationPct: inflationPct || 0,
    };
  }

  // ---- Timeline bar (above the area chart) ----
  function renderTimelineBar(result) {
    const total = Math.max(0.0001, result.totalYears);
    let bar = '';
    result.phaseResults.forEach((p, i) => {
      const dur = Math.max(0, p.endYear - p.startYear);
      const pct = (dur / total) * 100;
      if (pct <= 0) return;
      const tip = `${PHASE_LABEL[p.type]}${p.label ? ' — ' + p.label : ''} (${formatYearLen(dur)})`;
      bar += `<div class="tl-seg tl-seg--${p.type}" style="width:${pct.toFixed(3)}%" title="${escapeHtml(tip)}">${pct >= 8 ? escapeHtml(p.label || PHASE_LABEL[p.type]) : ''}</div>`;
    });
    if (!bar) {
      bar = '<div class="tl-seg" style="width:100%; background: var(--card-2); color: var(--muted);">No phases</div>';
    }
    els.tlBar.innerHTML = bar;

    // Axis ticks: 0, ~5 internal, totalYears
    let axis = '';
    const ticks = chooseTicks(0, total);
    ticks.forEach((t) => {
      const pct = total > 0 ? (t / total) * 100 : 0;
      axis += `<span style="left:${pct.toFixed(2)}%">${formatYearTick(t)}</span>`;
    });
    els.tlBarAxis.innerHTML = axis;
    els.tlYears.textContent = formatYearLen(total) || '0 years';
  }

  function chooseTicks(min, max) {
    const span = max - min;
    if (span <= 0) return [0];
    const steps = [1, 2, 5, 10, 20, 25, 50];
    let step = 1;
    for (const s of steps) {
      if (span / s <= 8) { step = s; break; }
      step = s;
    }
    const out = [];
    for (let v = 0; v <= max + 1e-6; v += step) out.push(v);
    if (out[out.length - 1] !== max) out.push(max);
    return out;
  }

  function formatYearLen(y) {
    if (!isFinite(y) || y <= 0) return '0 years';
    if (Math.abs(y - Math.round(y)) < 0.01) return Math.round(y) + ' year' + (Math.round(y) === 1 ? '' : 's');
    return y.toFixed(1) + ' years';
  }
  function formatYearTick(y) {
    if (Math.abs(y - Math.round(y)) < 0.01) return Math.round(y) + 'y';
    return y.toFixed(1) + 'y';
  }

  // ---- Timeline area chart ----
  function renderTimelineChart(result) {
    const svg = els.tlChart;
    const W = svg.clientWidth || 360;
    const H = 220;
    const padL = 44, padR = 10, padT = 10, padB = 24;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const series = result.series;
    if (series.length < 2 || result.totalYears <= 0) {
      svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle" fill="var(--muted)" font-size="13">Add a phase to see the chart</text>`;
      return;
    }

    const maxBal = Math.max(1, ...series.map((s) => s.balance));
    const niceMax = niceCeil(maxBal);
    const xOf = (year) => padL + (year / result.totalYears) * innerW;
    const yOf = (val)  => padT + innerH - (val / niceMax) * innerH;

    // Phase background bands
    let bands = '';
    result.phaseResults.forEach((p) => {
      const x1 = xOf(p.startYear);
      const x2 = xOf(p.endYear);
      const w = Math.max(0, x2 - x1);
      bands += `<rect class="tl-phase-band" x="${x1}" y="${padT}" width="${w}" height="${innerH}" fill="${PHASE_COLOR[p.type]}"/>`;
    });

    // Y-axis grid + labels
    const ticksY = 4;
    let yAxis = '';
    for (let i = 0; i <= ticksY; i++) {
      const v = (niceMax * i) / ticksY;
      const y = padT + innerH - (v / niceMax) * innerH;
      yAxis += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="currentColor" stroke-opacity="0.08"/>`;
      yAxis += `<text x="${padL - 6}" y="${y + 3}" text-anchor="end">${fmtCurrencyShort(v)}</text>`;
    }

    // X-axis labels at phase boundaries
    let xAxis = '';
    const boundaryYears = [0, ...result.phaseResults.map((p) => p.endYear)];
    boundaryYears.forEach((y, i) => {
      if (i > 0 && i < boundaryYears.length) {
        const x = xOf(y);
        xAxis += `<line class="tl-phase-divider" x1="${x}" y1="${padT}" x2="${x}" y2="${padT + innerH}"/>`;
      }
      xAxis += `<text class="tl-phase-label" x="${xOf(y)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === boundaryYears.length - 1 ? 'end' : 'middle'}">${formatYearTick(y)}</text>`;
    });

    // Build the area path: balance over time, with a baseline at zero (clamped to chart area)
    const baseY = yOf(0);
    let path = `M ${xOf(series[0].year).toFixed(2)} ${baseY.toFixed(2)} `;
    series.forEach((s) => {
      path += `L ${xOf(s.year).toFixed(2)} ${yOf(Math.max(0, s.balance)).toFixed(2)} `;
    });
    path += `L ${xOf(series[series.length - 1].year).toFixed(2)} ${baseY.toFixed(2)} Z`;

    // Stroke just the top edge of the nominal area
    let line = `M ${xOf(series[0].year).toFixed(2)} ${yOf(Math.max(0, series[0].balance)).toFixed(2)} `;
    series.forEach((s, i) => { if (i > 0) line += `L ${xOf(s.year).toFixed(2)} ${yOf(Math.max(0, s.balance)).toFixed(2)} `; });

    // Real-balance dashed line (only when inflation > 0; otherwise overlaps nominal)
    let realLine = '';
    if ((result.inflationPct || 0) > 0) {
      let rl = `M ${xOf(series[0].year).toFixed(2)} ${yOf(Math.max(0, series[0].realBalance)).toFixed(2)} `;
      for (let i = 1; i < series.length; i++) {
        rl += `L ${xOf(series[i].year).toFixed(2)} ${yOf(Math.max(0, series[i].realBalance)).toFixed(2)} `;
      }
      realLine = `<path class="tl-real-line" d="${rl}"/>`;
    }

    const gradId = 'tl-grad-' + Date.now();
    svg.innerHTML =
      `<defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8cf0c4" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#6ea8ff" stop-opacity="0.05"/>
        </linearGradient>
      </defs>` +
      `<g class="bands">${bands}</g>` +
      `<g class="axis" color="var(--muted)">${yAxis}</g>` +
      `<path class="tl-area-fill" d="${path}" fill="url(#${gradId})"/>` +
      `<path class="tl-area-line" d="${line}"/>` +
      realLine +
      `<g class="x-axis">${xAxis}</g>`;
  }

  // ---- Scenario comparison helpers ----

  // Returns an array of 3 phase variants: [lower, current, higher]
  // Each variant has `_label` (for the strip header) and `_current` flag on the middle.
  function phaseScenarios(phase) {
    if (phase.type === 'coast') {
      const y = Math.max(0, phase.years || 0);
      const lo = Math.max(1, y - 5);
      const hi = y + 5;
      const yearWord = (n) => `${n} yr${n === 1 ? '' : 's'}`;
      return [
        { ...phase, years: lo, _label: yearWord(lo) },
        { ...phase, years: y,  _label: yearWord(y), _current: true },
        { ...phase, years: hi, _label: yearWord(hi) },
      ];
    }
    // contribute / withdraw — vary amount by ±50%
    const a = Math.max(0, phase.amount || 0);
    const lo = a * 0.5;
    const hi = a * 1.5;
    const lbl = (v) => `${fmtCurrency(v)}/mo`;
    return [
      { ...phase, amount: lo, _label: lbl(lo) },
      { ...phase, amount: a,  _label: lbl(a), _current: true },
      { ...phase, amount: hi, _label: lbl(hi) },
    ];
  }

  // Run simulateTimeline on a single phase to get its nominal ending balance.
  function phaseEndBalance(startBalance, phase, rate, freq) {
    const r = simulateTimeline(startBalance, [phase], rate, freq, 0);
    return r.finalBalance;
  }

  function renderCompareStripInner(phase, startBalance, rate, freq) {
    const variants = phaseScenarios(phase);
    const ends = variants.map((v) => phaseEndBalance(startBalance, v, rate, freq));
    const currentEnd = ends[1];
    const isWithdraw = phase.type === 'withdraw';

    let html = '';
    variants.forEach((v, i) => {
      const end = ends[i];
      let cls = 'cmp-card';
      let sub;
      if (v._current) {
        cls += ' cmp-card--current';
        sub = 'current';
      } else {
        const diff = end - currentEnd;
        const baseAbs = Math.max(1, Math.abs(currentEnd));
        const pct = (Math.abs(diff) / baseAbs) * 100;
        if (diff > 0.5) {
          cls += ' cmp-card--better';
          sub = `↑ ${pct < 1 ? pct.toFixed(1) : pct.toFixed(0)}%`;
        } else if (diff < -0.5) {
          cls += ' cmp-card--worse';
          sub = `↓ ${pct < 1 ? pct.toFixed(1) : pct.toFixed(0)}%`;
        } else {
          sub = '—';
        }
      }
      // Withdraw: replace the sub with a growing/shrinking indicator on EVERY card
      if (isWithdraw) {
        const grew = end > startBalance + 0.5;
        const shrank = end < startBalance - 0.5;
        sub = grew ? '↑ growing' : shrank ? '↓ shrinking' : '→ flat';
      }
      html +=
        `<div class="${cls}">` +
          `<span class="cmp-card__label">${escapeHtml(v._label)}</span>` +
          `<strong class="cmp-card__value">${fmtCurrencyShort(end)}</strong>` +
          `<span class="cmp-card__sub">${escapeHtml(sub)}</span>` +
        `</div>`;
    });
    return html;
  }

  function compareTitleFor(phase) {
    if (phase.type === 'coast') return 'If you coast longer or shorter';
    if (phase.type === 'withdraw') return 'If you withdraw more or less';
    return 'If you contribute more or less';
  }

  // Inflation-adjusted withdrawal hint: "what $X today costs by year Y"
  function renderInflationHintHTML(phase, phaseResult) {
    const startYear = phaseResult ? (phaseResult.startYear || 0) : 0;
    const today = Math.max(0, phase.amount || 0);
    if (startYear < 0.5 || (state.inflation || 0) <= 0 || today <= 0) return '';
    const inflated = inflatedAmount(today, state.inflation, startYear);
    const yr = Math.round(startYear);
    return `<strong>${fmtReal(inflated)}/mo</strong> <em>— what ${fmtCurrency(today)}/mo today costs by year ${yr}</em>`;
  }

  // ---- Phase cards ----
  function renderPhases(result) {
    const phases = state.phases;
    const items = result.phaseResults;
    let html = '';
    phases.forEach((p, i) => {
      const r = items[i] || { startBalance: 0, endBalance: 0, contrib: 0, withdraw: 0, interest: 0 };
      const showAmount = p.type !== 'coast';
      const amountLabel = p.type === 'withdraw' ? 'Monthly withdrawal' : 'Monthly contribution';
      html +=
        `<div class="phase phase--${p.type}" data-phase="${p.id}">` +
          `<div class="phase__head">` +
            `<span class="phase__num">${i + 1}</span>` +
            `<div class="phase__type" role="radiogroup" aria-label="Phase type">` +
              PHASE_TYPES.map((t) =>
                `<button type="button" role="radio" aria-checked="${t === p.type}" class="phase__type-btn is-${t}${t === p.type ? ' is-active' : ''}" data-set-type="${t}">${PHASE_LABEL[t]}</button>`
              ).join('') +
            `</div>` +
            `<div class="phase__actions">` +
              `<button type="button" class="phase-icon-btn" data-action="up" aria-label="Move up"${i === 0 ? ' disabled' : ''}>↑</button>` +
              `<button type="button" class="phase-icon-btn" data-action="down" aria-label="Move down"${i === phases.length - 1 ? ' disabled' : ''}>↓</button>` +
              `<button type="button" class="phase-icon-btn phase-icon-btn--del" data-action="delete" aria-label="Delete phase"${phases.length <= 1 ? ' disabled' : ''}>×</button>` +
            `</div>` +
          `</div>` +
          `<div class="phase__fields">` +
            `<div class="phase-field phase-field--full">` +
              `<label>Label (optional)</label>` +
              `<div class="input-prefix">` +
                `<input type="text" data-field="label" maxlength="40" autocomplete="off" placeholder="${PHASE_LABEL[p.type]}" value="${escapeHtml(p.label || '')}" />` +
              `</div>` +
            `</div>` +
            `<div class="phase-field">` +
              `<label>Years</label>` +
              `<div class="input-suffix">` +
                `<input type="text" data-field="years" inputmode="decimal" autocomplete="off" value="${p.years}" />` +
                `<span>yr</span>` +
              `</div>` +
            `</div>` +
            (showAmount ? (
              `<div class="phase-field">` +
                `<label>${amountLabel}</label>` +
                `<div class="input-prefix">` +
                  `<span>$</span>` +
                  `<input type="text" data-field="amount" inputmode="decimal" autocomplete="off" value="${formatThousands(p.amount || 0)}" />` +
                `</div>` +
                (p.type === 'withdraw'
                  ? `<p class="phase-field__hint" data-inflation-hint>${renderInflationHintHTML(p, r)}</p>`
                  : '') +
              `</div>`
            ) : '') +
          `</div>` +
          `<div class="phase__summary">` +
            `<div class="phase__summary-row">` +
              `<span>Balance</span>` +
              `<div class="phase__summary-arrow"><em>${fmtCurrency(r.startBalance)}</em> → <strong>${fmtCurrency(r.endBalance)}</strong></div>` +
            `</div>` +
            `<div class="phase__summary-row phase__summary-row--real">` +
              `<span>Real ending balance</span>` +
              `<strong data-real="end">${fmtReal(r.realEndBalance != null ? r.realEndBalance : 0)}</strong>` +
            `</div>` +
            (p.type === 'contribute' ? (
              `<div class="phase__summary-row"><span>Contributed this phase</span><strong>${fmtCurrency(r.contrib)}</strong></div>`
            ) : p.type === 'withdraw' ? (
              `<div class="phase__summary-row"><span>Withdrawn this phase</span><strong>${fmtCurrency(r.withdraw)}</strong></div>`
            ) : (
              `<div class="phase__summary-row"><span>Cash flow</span><strong>$0 (coast)</strong></div>`
            )) +
            `<div class="phase__summary-row"><span>Interest earned</span><strong>${fmtCurrency(r.interest)}</strong></div>` +
          `</div>` +
          `<div class="phase__compare" data-compare>` +
            `<p class="phase__compare-title">${escapeHtml(compareTitleFor(p))}</p>` +
            `<div class="phase__compare-grid" data-compare-grid>` +
              renderCompareStripInner(p, r.startBalance || 0, state.rate, state.freq) +
            `</div>` +
          `</div>` +
        `</div>`;
    });
    els.phasesList.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---- Phase manipulation ----
  function addPhase() {
    state.phases.push({
      id: newPhaseId(),
      label: '',
      type: 'contribute',
      years: 10,
      amount: 1000,
    });
    recalc();
  }
  function deletePhase(id) {
    if (state.phases.length <= 1) return;
    state.phases = state.phases.filter((p) => p.id !== id);
    recalc();
  }
  function movePhase(id, dir) {
    const i = state.phases.findIndex((p) => p.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= state.phases.length) return;
    [state.phases[i], state.phases[j]] = [state.phases[j], state.phases[i]];
    recalc();
  }
  function setPhaseField(id, field, value) {
    const p = state.phases.find((x) => x.id === id);
    if (!p) return;
    if (field === 'label') p.label = value;
    else if (field === 'years') p.years = Math.max(0, parseNumber(value));
    else if (field === 'amount') p.amount = Math.max(0, parseNumber(value));
    recalcTimelineOnly();
  }
  function setPhaseType(id, type) {
    const p = state.phases.find((x) => x.id === id);
    if (!p || !PHASE_TYPES.includes(type)) return;
    p.type = type;
    recalc(); // re-render the phase card so amount field appears/disappears
  }

  // Re-run timeline math + redraw chart/totals/summaries WITHOUT rebuilding
  // the whole phase list (preserves input focus while typing).
  function recalcTimelineOnly() {
    if (state.mode !== 'timeline') return;
    readSharedInputs();
    const result = simulateTimeline(state.principal, state.phases, state.rate, state.freq, state.inflation);
    updateTimelineOutputs(result);
    // Update only the per-phase summary numbers without rebuilding inputs
    state.phases.forEach((p, i) => {
      const card = els.phasesList.querySelector(`[data-phase="${p.id}"]`);
      if (!card) return;
      const r = result.phaseResults[i];
      const sum = card.querySelector('.phase__summary');
      if (!sum) return;
      sum.querySelector('.phase__summary-arrow').innerHTML =
        `<em>${fmtCurrency(r.startBalance)}</em> → <strong>${fmtCurrency(r.endBalance)}</strong>`;
      const rows = sum.querySelectorAll('.phase__summary-row');
      // rows: [balance arrow, real ending, contrib/withdraw/coast, interest]
      const realStrong = sum.querySelector('[data-real="end"]');
      if (realStrong) realStrong.textContent = fmtReal(r.realEndBalance != null ? r.realEndBalance : 0);
      const cashRow = rows[2];
      const interestRow = rows[3];
      if (cashRow) {
        const strong = cashRow.querySelector('strong');
        if (strong) {
          if (p.type === 'contribute') strong.textContent = fmtCurrency(r.contrib);
          else if (p.type === 'withdraw') strong.textContent = fmtCurrency(r.withdraw);
          else strong.textContent = '$0 (coast)';
        }
      }
      if (interestRow) {
        const strong = interestRow.querySelector('strong');
        if (strong) strong.textContent = fmtCurrency(r.interest);
      }
      // Inflation-adjusted withdrawal hint (only present on withdraw phases)
      const hint = card.querySelector('[data-inflation-hint]');
      if (hint && p.type === 'withdraw') {
        hint.innerHTML = renderInflationHintHTML(p, r);
      }
      // Scenario comparison strip — re-render its three cards
      const grid = card.querySelector('[data-compare-grid]');
      if (grid) {
        grid.innerHTML = renderCompareStripInner(p, r.startBalance || 0, state.rate, state.freq);
      }
      // Update the comparison title in case the user just changed phase type
      // (setPhaseType triggers full recalc, but defend anyway)
      const title = card.querySelector('.phase__compare-title');
      if (title) title.textContent = compareTitleFor(p);
    });
  }

  function updateTimelineOutputs(result) {
    els.tlFinalBalance.textContent = fmtCurrency(result.finalBalance);
    els.tlMetaInvested.textContent = fmtCurrency(result.totalContrib + state.principal);
    els.tlMetaInterest.textContent = fmtCurrency(result.totalInterest);
    els.tlMetaWithdrawn.textContent = fmtCurrency(result.totalWithdraw);

    els.tlTotalInvested.textContent = fmtCurrency(result.totalContrib + state.principal);
    els.tlTotalWithdrawn.textContent = fmtCurrency(result.totalWithdraw);
    els.tlTotalInterest.textContent = fmtCurrency(result.totalInterest);
    els.tlTotalBalance.textContent = fmtCurrency(result.finalBalance);

    // Inflation-adjusted final balance
    const realFinal = result.finalRealBalance != null
      ? result.finalRealBalance
      : realValue(result.finalBalance, state.inflation, result.totalYears);
    els.tlRealBalance.innerHTML = `${fmtReal(realFinal)} <em>in today's purchasing power</em>`;
    els.tlTotalReal.textContent = fmtReal(realFinal);

    renderTimelineBar(result);
    renderTimelineChart(result);
  }

  function readSharedInputs() {
    state.principal = Math.max(0, parseNumber(els.principal.value));
    state.rate = Math.max(0, parseNumber(els.rate.value));
    state.inflation = Math.min(10, Math.max(0, parseFloat(els.inflation.value) || 0));
    // freq is updated by segmented click handler
  }

  function recalcTimeline() {
    readSharedInputs();
    const result = simulateTimeline(state.principal, state.phases, state.rate, state.freq, state.inflation);
    updateTimelineOutputs(result);
    renderPhases(result);
  }

  // ---- Mode switching ----
  function setMode(mode) {
    if (mode !== 'simple' && mode !== 'timeline') return;
    state.mode = mode;
    document.body.setAttribute('data-mode', mode);
    els.modeBtns.forEach((b) => {
      const active = b.getAttribute('data-mode-btn') === mode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    // Update principal label depending on mode
    const principalLabel = $('principalLabel');
    if (principalLabel) {
      principalLabel.textContent = mode === 'timeline' ? 'Starting balance' : 'Initial principal';
    }
    recalc();
  }

  function niceCeil(v) {
    if (v <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / exp;
    let nf;
    if (f <= 1) nf = 1;
    else if (f <= 2) nf = 2;
    else if (f <= 2.5) nf = 2.5;
    else if (f <= 5) nf = 5;
    else nf = 10;
    return nf * exp;
  }

  // ---- Update flow ----
  function readInputs() {
    state.principal = Math.max(0, parseNumber(els.principal.value));
    state.monthly = Math.max(0, parseNumber(els.monthly.value));
    state.rate = Math.max(0, parseNumber(els.rate.value));
    state.inflation = Math.min(10, Math.max(0, parseFloat(els.inflation.value) || 0));
    state.years = Math.min(40, Math.max(1, parseInt(els.years.value, 10) || 1));
  }

  function recalc() {
    if (state.mode === 'timeline') {
      recalcTimeline();
      return;
    }
    readInputs();
    const result = simulate(state.principal, state.monthly, state.rate, state.freq, state.years);
    state.series = result.series;

    els.finalBalance.textContent = fmtCurrency(result.finalBalance);
    els.metaPrincipal.textContent = fmtCurrency(result.principal);
    els.metaContrib.textContent = fmtCurrency(result.totalContrib);
    els.metaInterest.textContent = fmtCurrency(result.totalInterest);

    els.bdPrincipal.textContent = fmtCurrency(result.principal);
    els.bdContrib.textContent = fmtCurrency(result.totalContrib);
    els.bdInterest.textContent = fmtCurrency(result.totalInterest);
    els.bdTotal.textContent = fmtCurrency(result.finalBalance);

    // Inflation-adjusted (real) value of final balance
    const real = realValue(result.finalBalance, state.inflation, state.years);
    els.realBalance.innerHTML = `${fmtReal(real)} <em>in today's purchasing power</em>`;
    els.bdReal.textContent = fmtReal(real);

    const total = Math.max(1, result.principal + result.totalContrib + result.totalInterest);
    els.barPrincipal.style.width = (result.principal / total * 100) + '%';
    els.barContrib.style.width = (result.totalContrib / total * 100) + '%';
    els.barInterest.style.width = (result.totalInterest / total * 100) + '%';

    els.yearsOut.textContent = state.years;

    renderChart(result.series);
    renderComparison();
  }

  // ---- Input handlers ----
  function attachNumericInput(el, opts = {}) {
    const { thousands = false } = opts;
    el.addEventListener('input', () => {
      const raw = el.value;
      const cleaned = raw.replace(/[^\d.]/g, '');
      const parts = cleaned.split('.');
      const intPart = parts[0] || '';
      const decPart = parts.length > 1 ? '.' + parts.slice(1).join('').slice(0, 2) : '';
      let formatted;
      if (thousands && intPart) {
        formatted = parseInt(intPart, 10).toLocaleString('en-US') + decPart;
      } else {
        formatted = intPart + decPart;
      }
      if (formatted !== raw) {
        const cursorAtEnd = el.selectionStart === raw.length;
        el.value = formatted;
        if (cursorAtEnd) {
          el.setSelectionRange(formatted.length, formatted.length);
        }
      }
      recalc();
    });
    el.addEventListener('blur', () => {
      const n = parseNumber(el.value);
      el.value = thousands ? formatThousands(n) : (n === 0 ? '0' : String(n));
      recalc();
    });
  }

  attachNumericInput(els.principal, { thousands: true });
  attachNumericInput(els.monthly, { thousands: true });
  attachNumericInput(els.rate, { thousands: false });

  els.years.addEventListener('input', () => {
    els.yearsOut.textContent = els.years.value;
    recalc();
  });

  els.inflation.addEventListener('input', () => {
    const v = parseFloat(els.inflation.value) || 0;
    els.inflationOut.textContent = (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1));
    recalc();
  });

  els.seg.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.seg.forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
      state.freq = parseInt(btn.getAttribute('data-value'), 10);
      recalc();
    });
  });

  window.addEventListener('resize', () => {
    if (state.mode === 'simple') renderChart(state.series);
    else recalcTimeline();
  });
  window.addEventListener('orientationchange', () => setTimeout(() => {
    if (state.mode === 'simple') renderChart(state.series);
    else recalcTimeline();
  }, 100));

  // ---- Mode toggle ----
  els.modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode-btn')));
  });

  // ---- Add phase ----
  els.addPhaseBtn.addEventListener('click', addPhase);

  // ---- Phase list event delegation ----
  els.phasesList.addEventListener('click', (e) => {
    const card = e.target.closest('[data-phase]');
    if (!card) return;
    const id = parseInt(card.getAttribute('data-phase'), 10);

    const typeBtn = e.target.closest('[data-set-type]');
    if (typeBtn) {
      setPhaseType(id, typeBtn.getAttribute('data-set-type'));
      return;
    }
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.getAttribute('data-action');
      if (action === 'up') movePhase(id, -1);
      else if (action === 'down') movePhase(id, +1);
      else if (action === 'delete') deletePhase(id);
    }
  });

  els.phasesList.addEventListener('input', (e) => {
    const card = e.target.closest('[data-phase]');
    if (!card) return;
    const id = parseInt(card.getAttribute('data-phase'), 10);
    const fieldEl = e.target.closest('[data-field]');
    if (!fieldEl) return;
    const field = fieldEl.getAttribute('data-field');
    if (field === 'amount' || field === 'years') {
      // Format thousands for amount as the user types
      if (field === 'amount') {
        const raw = fieldEl.value;
        const cleaned = raw.replace(/[^\d.]/g, '');
        const parts = cleaned.split('.');
        const intPart = parts[0] || '';
        const decPart = parts.length > 1 ? '.' + parts.slice(1).join('').slice(0, 2) : '';
        const formatted = (intPart ? parseInt(intPart, 10).toLocaleString('en-US') : '') + decPart;
        if (formatted !== raw) {
          const cursorAtEnd = fieldEl.selectionStart === raw.length;
          fieldEl.value = formatted;
          if (cursorAtEnd) fieldEl.setSelectionRange(formatted.length, formatted.length);
        }
      }
    }
    setPhaseField(id, field, fieldEl.value);
  });

  els.phasesList.addEventListener('blur', (e) => {
    if (!e.target.matches('[data-field]')) return;
    // Light cleanup on blur for amount/years
    const field = e.target.getAttribute('data-field');
    if (field === 'amount') {
      const n = parseNumber(e.target.value);
      e.target.value = formatThousands(n);
    } else if (field === 'years') {
      const n = parseNumber(e.target.value);
      e.target.value = String(n);
    }
  }, true);

  // ---- Service worker registration ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }

  // ---- Install state hint ----
  function updateInstallState() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (standalone) {
      els.installState.textContent = 'Installed — running offline.';
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      els.installState.textContent = isIOS
        ? 'Tap Share → Add to Home Screen to install.'
        : 'Tap menu → Install app to add to your home screen.';
    }
  }
  updateInstallState();

  recalc();
})();
