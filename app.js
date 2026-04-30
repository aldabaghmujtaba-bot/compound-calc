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

    // Toolbar
    shareBtn: $('shareBtn'),
    printBtn: $('printBtn'),
    toast: $('toast'),
    printFooterUrl: $('printFooterUrl'),

    // Goal mode
    currentAge: $('currentAge'),               // shared with timeline
    goalIncome: $('goalIncome'),
    goalRetireAge: $('goalRetireAge'),
    goalRetireYears: $('goalRetireYears'),

    // Goal-mode hero card
    heroRetireAge: $('heroRetireAge'),
    heroIncome: $('heroIncome'),
    heroContrib: $('heroContrib'),
    heroHitAge: $('heroHitAge'),
    heroForeverLabel: $('heroForeverLabel'),
    heroForever: $('heroForever'),
    heroForeverSub: $('heroForeverSub'),
    goalContribValue: $('goalContribValue'),
    goalContribHint: $('goalContribHint'),
    goalNestEggValue: $('goalNestEggValue'),
    goalNestEggReal: $('goalNestEggReal'),
    goalIncomeAtRetire: $('goalIncomeAtRetire'),
    goalIncomeNote: $('goalIncomeNote'),
    goalSpan: $('goalSpan'),
    goalBar: $('goalBar'),
    goalBarAxis: $('goalBarAxis'),
    goalMarker: $('goalMarker'),
    goalTableBody: $('goalTableBody'),
    goalDetail: $('goalDetail'),
    whatifAge: $('whatifAge'),
    whatifMonthly: $('whatifMonthly'),
    whatifOutput: $('whatifOutput'),

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

    // Shared age input — used by Goal mode (current age for retirement math)
    // and Timeline mode (decorating phase cards with absolute ages). null
    // means "not set" → Timeline shows years, Goal falls back to 35.
    currentAge: null,

    // Goal-planner inputs
    goalIncome: 5000,        // monthly income needed (today's $)
    goalRetireAge: 65,
    goalRetireYears: 30,

    // Detail panel — which scenario tier is currently expanded (or null)
    goalExpandedTier: null,

    // What-if widget — null means "use the auto pre-fill from the on-track tier"
    whatifAge: null,
    whatifMonthly: null,
  };

  const GOAL_TIERS = [500, 1000, 2000, 3000, 4000, 5000, 6000];

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

    // Axis ticks: 0, ~5 internal, totalYears. Show ages (e.g. "age 33") when
    // the user has set their current age in the shared input; otherwise show
    // year offsets ("0y / 10y / 25y") as before.
    let axis = '';
    const ticks = chooseTicks(0, total);
    const showAges = state.currentAge != null && state.currentAge > 0;
    ticks.forEach((t) => {
      const pct = total > 0 ? (t / total) * 100 : 0;
      const label = showAges
        ? `age ${Math.round(state.currentAge + t)}`
        : formatYearTick(t);
      axis += `<span style="left:${pct.toFixed(2)}%">${label}</span>`;
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
          <stop offset="0%"   class="tl-grad-top"    stop-opacity="0.55"/>
          <stop offset="100%" class="tl-grad-bottom" stop-opacity="0.05"/>
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

  // Compact "$X.Xk" / "$X.XM" formatter — used inside scenario cards where
  // space is tight but we want one decimal of precision.
  function fmtCompactMoney(n) {
    if (!isFinite(n)) return '$0';
    const a = Math.abs(n);
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'k';
    return '$' + Math.round(n);
  }

  function renderCompareStripInner(phase, startBalance, startYear, rate, freq) {
    const variants = phaseScenarios(phase);
    const ends = variants.map((v) => phaseEndBalance(startBalance, v, rate, freq));
    const currentEnd = ends[1];
    const isWithdraw = phase.type === 'withdraw';
    const inflPct = state.inflation || 0;
    const sy = Math.max(0, startYear || 0);

    let html = '';
    variants.forEach((v, i) => {
      const end = ends[i];
      // End year for this scenario: contribute/withdraw keep the phase length,
      // coast scenarios vary it. realValue uses cumulative year from t=0.
      const scenarioYears = Math.max(0, v.years || 0);
      const endYear = sy + scenarioYears;
      const realEnd = realValue(end, inflPct, endYear);

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

      // Inflated monthly amount (withdraw only) — what scenario.amount today
      // costs at the year this phase begins.
      let inflatedLine = '';
      if (isWithdraw && inflPct > 0 && sy >= 0.5 && (v.amount || 0) > 0) {
        const inflated = inflatedAmount(v.amount, inflPct, sy);
        const yr = Math.round(sy);
        inflatedLine =
          `<span class="cmp-card__inflated">~${fmtCompactMoney(inflated)}/mo @ y${yr}</span>`;
      }

      html +=
        `<div class="${cls}">` +
          `<span class="cmp-card__label">${escapeHtml(v._label)}</span>` +
          inflatedLine +
          `<strong class="cmp-card__value">${fmtCurrencyShort(end)}</strong>` +
          `<span class="cmp-card__real">${fmtRealShort(realEnd)}</span>` +
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
      const r = items[i] || { startBalance: 0, endBalance: 0, contrib: 0, withdraw: 0, interest: 0, startYear: 0, endYear: 0 };
      const showAmount = p.type !== 'coast';
      const amountLabel = p.type === 'withdraw' ? 'Monthly withdrawal' : 'Monthly contribution';
      // Optional age annotation: only shown when the shared "Your current
      // age" input is set. Maps phase start/end years onto absolute ages.
      const ageLine = (state.currentAge != null && state.currentAge > 0)
        ? `<p class="phase__age">Age <strong>${Math.round(state.currentAge + r.startYear)}</strong> → <strong>${Math.round(state.currentAge + r.endYear)}</strong></p>`
        : '';
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
          ageLine +
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
              renderCompareStripInner(p, r.startBalance || 0, r.startYear || 0, state.rate, state.freq) +
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
        grid.innerHTML = renderCompareStripInner(p, r.startBalance || 0, r.startYear || 0, state.rate, state.freq);
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
    // currentAge is shared between Timeline and Goal. Empty input → null
    // (Timeline shows year numbers, Goal falls back to 35).
    if (els.currentAge) {
      const ageRaw = parseNumber(els.currentAge.value);
      state.currentAge = (els.currentAge.value || '').trim() === '' || ageRaw <= 0
        ? null
        : Math.min(120, ageRaw);
    }
    // freq is updated by segmented click handler
  }

  function recalcTimeline() {
    readSharedInputs();
    const result = simulateTimeline(state.principal, state.phases, state.rate, state.freq, state.inflation);
    updateTimelineOutputs(result);
    renderPhases(result);
  }

  // ---- Goal planner ----

  // Target nest egg at retirement (in retirement-year nominal $) needed to fund
  // an inflation-growing annuity for `yearsInRetire`. Uses a real monthly rate
  // so withdrawals can grow with inflation each year.
  function targetNestEgg(monthlyToday, yearsToRetire, yearsInRetire, annualRatePct, inflationPct) {
    const monthlyAtRetire = inflatedAmount(monthlyToday, inflationPct, yearsToRetire);
    const realAnnual = (1 + annualRatePct / 100) / (1 + (inflationPct || 0) / 100) - 1;
    const monthlyReal = Math.pow(1 + realAnnual, 1 / 12) - 1;
    const months = Math.max(0, yearsInRetire * 12);
    if (months <= 0) return 0;
    if (monthlyReal <= 0) return monthlyAtRetire * months;
    return monthlyAtRetire * (1 - Math.pow(1 + monthlyReal, -months)) / monthlyReal;
  }

  // Monthly contribution needed to grow `currentSavings` to `target` over `years`
  // at the shared annual rate + frequency. Uses simulate() so it matches the
  // rest of the app's compounding semantics, with binary search for the C value.
  function findRequiredMonthly(currentSavings, years, target, annualRatePct, freq) {
    if (years <= 0) return Math.max(0, target - currentSavings);
    // If we're already there with $0/mo, no contribution needed
    if (simulate(currentSavings, 0, annualRatePct, freq, years).finalBalance >= target) return 0;
    let lo = 0;
    let hi = Math.max(100, target / Math.max(1, years * 12));
    // Expand hi until we overshoot the target
    for (let i = 0; i < 30; i++) {
      if (simulate(currentSavings, hi, annualRatePct, freq, years).finalBalance >= target) break;
      hi *= 2;
      if (hi > 1e9) break;
    }
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (simulate(currentSavings, mid, annualRatePct, freq, years).finalBalance < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // Age at which `monthly` contribution from `currentSavings` first reaches
  // `target`. Returns a fractional age, or null if not reached within 80 years.
  function ageAtTarget(currentAge, currentSavings, monthly, target, annualRatePct, freq) {
    if (currentSavings >= target) return currentAge;
    if (target <= 0) return currentAge;
    const r = annualRatePct / 100;
    const monthsPerCompound = Math.max(1, Math.round(12 / freq));
    const ratePerCompound = r / freq;
    let bal = currentSavings;
    const maxMonths = 80 * 12;
    for (let m = 1; m <= maxMonths; m++) {
      if (monthly > 0) bal += monthly;
      if (m % monthsPerCompound === 0 && bal > 0) bal += bal * ratePerCompound;
      if (bal >= target) return currentAge + m / 12;
    }
    return null;
  }

  // Forever-sustainable monthly withdrawal in TODAY's $ — the perpetuity
  // amount where real interest income equals the withdrawal so the real
  // balance never declines. Returns 0 when real return ≤ 0 (no perpetual
  // withdrawal possible — money must eventually deplete).
  function perpetualMonthlyWithdrawal(balanceAtRetire, yearsToRetire, ratePct, inflPct) {
    if (!isFinite(balanceAtRetire) || balanceAtRetire <= 0) return 0;
    const i = Math.max(0, inflPct || 0);
    const realAnnual = (1 + ratePct / 100) / (1 + i / 100) - 1;
    if (realAnnual <= 0) return 0;
    const monthlyReal = Math.pow(1 + realAnnual, 1 / 12) - 1;
    const realBalance = balanceAtRetire / Math.pow(1 + i / 100, Math.max(0, yearsToRetire));
    return realBalance * monthlyReal;
  }

  // Maximum monthly withdrawal in TODAY's $ that can be sustained for
  // `yearsInRetire` years out of a nominal `balanceAtRetire` (in retirement-year $).
  // Uses the real return rate so the resulting monthly figure represents
  // constant purchasing power.
  function maxSustainableWithdrawal(balanceAtRetire, yearsToRetire, yearsInRetire, ratePct, inflPct) {
    if (!isFinite(balanceAtRetire) || balanceAtRetire <= 0 || yearsInRetire <= 0) return 0;
    const i = Math.max(0, inflPct || 0);
    const pvToday = balanceAtRetire / Math.pow(1 + i / 100, Math.max(0, yearsToRetire));
    const realAnnual = (1 + ratePct / 100) / (1 + i / 100) - 1;
    const monthlyReal = Math.pow(1 + realAnnual, 1 / 12) - 1;
    const months = yearsInRetire * 12;
    if (monthlyReal <= 0) return pvToday / months;
    return pvToday * monthlyReal / (1 - Math.pow(1 + monthlyReal, -months));
  }

  // Years until balance hits zero given an inflation-growing monthly withdrawal
  // (anchored to `monthlyTodayDollars` in today's purchasing power).
  // Returns a fractional year count, or `Infinity` if it never depletes.
  function yearsUntilDepletion(startBalance, monthlyTodayDollars, yearsToRetire, ratePct, freq, inflPct) {
    if (!isFinite(startBalance) || startBalance <= 0) return 0;
    if (!isFinite(monthlyTodayDollars) || monthlyTodayDollars <= 0) return Infinity;
    const r = ratePct / 100;
    const monthsPerCompound = Math.max(1, Math.round(12 / freq));
    const ratePerCompound = r / freq;
    const i = Math.max(0, inflPct || 0);
    const monthlyInfl = Math.pow(1 + i / 100, 1 / 12) - 1;
    let bal = startBalance;
    // Withdrawal at month 1 of retirement, in retirement-year nominal $
    let withdraw = monthlyTodayDollars * Math.pow(1 + i / 100, Math.max(0, yearsToRetire));
    const cap = 100 * 12;
    for (let m = 1; m <= cap; m++) {
      bal -= withdraw;
      if (bal <= 0) return m / 12;
      if (m % monthsPerCompound === 0) bal += bal * ratePerCompound;
      withdraw *= (1 + monthlyInfl);
    }
    return Infinity;
  }

  // Project balance year-by-year through accumulation + retirement, withdrawing
  // `monthlyIncomeToday` (in today's $) once retirement starts, growing with
  // inflation each month. Used by the detail panel mini chart.
  function projectFullPlan(P, monthly, yearsToRetire, yearsInRetire, monthlyIncomeToday, ratePct, freq, inflPct) {
    const r = ratePct / 100;
    const monthsPerCompound = Math.max(1, Math.round(12 / freq));
    const ratePerCompound = r / freq;
    const i = Math.max(0, inflPct || 0);
    const monthlyInfl = Math.pow(1 + i / 100, 1 / 12) - 1;

    let bal = Math.max(0, P);
    let cumMonth = 0;
    const series = [{ year: 0, balance: bal }];

    // Accumulation
    const accumMonths = Math.round(yearsToRetire * 12);
    for (let m = 1; m <= accumMonths; m++) {
      cumMonth++;
      if (monthly > 0) bal += monthly;
      if (cumMonth % monthsPerCompound === 0 && bal > 0) bal += bal * ratePerCompound;
      if (cumMonth % 12 === 0) series.push({ year: cumMonth / 12, balance: bal });
    }
    const balanceAtRetire = bal;

    // Retirement
    const retireMonths = Math.round(yearsInRetire * 12);
    let withdrawNominal = monthlyIncomeToday * Math.pow(1 + i / 100, Math.max(0, yearsToRetire));
    let depletedAtYear = null;
    for (let m = 1; m <= retireMonths; m++) {
      cumMonth++;
      bal = Math.max(0, bal - withdrawNominal);
      if (cumMonth % monthsPerCompound === 0 && bal > 0) bal += bal * ratePerCompound;
      withdrawNominal *= (1 + monthlyInfl);
      if (bal <= 0 && depletedAtYear == null) depletedAtYear = cumMonth / 12;
      if (cumMonth % 12 === 0) series.push({ year: cumMonth / 12, balance: bal });
    }
    // Make sure the very last point is recorded
    if (series[series.length - 1].year !== cumMonth / 12) {
      series.push({ year: cumMonth / 12, balance: bal });
    }

    return { series, balanceAtRetire, finalBalance: bal, depletedAtYear };
  }

  // Render the mini line chart inside a detail panel.
  function renderProjectionChart(svg, series, target, milestones) {
    const W = svg.clientWidth || 360;
    const H = 180;
    const padL = 44, padR = 12, padT = 10, padB = 26;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    if (!series || series.length < 2) { svg.innerHTML = ''; return; }
    const maxYear = series[series.length - 1].year || 1;
    const maxVal = Math.max(target || 0, ...series.map(s => s.balance), 1);
    const niceMax = niceCeil(maxVal);
    const xOf = (y) => padL + (y / maxYear) * innerW;
    const yOf = (v) => padT + innerH - (v / niceMax) * innerH;

    // Y grid + labels
    const ticks = 3;
    let yAxis = '';
    for (let k = 0; k <= ticks; k++) {
      const v = (niceMax * k) / ticks;
      const yy = padT + innerH - (v / niceMax) * innerH;
      yAxis += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke-opacity="0.06"/>`;
      yAxis += `<text x="${padL - 6}" y="${yy + 3}" text-anchor="end">${fmtCurrencyShort(v)}</text>`;
    }

    // Balance line + soft fill
    const baseY = yOf(0);
    let line = `M ${xOf(series[0].year).toFixed(2)} ${yOf(Math.max(0, series[0].balance)).toFixed(2)} `;
    for (let i = 1; i < series.length; i++) {
      line += `L ${xOf(series[i].year).toFixed(2)} ${yOf(Math.max(0, series[i].balance)).toFixed(2)} `;
    }
    let fill = `M ${xOf(series[0].year).toFixed(2)} ${baseY.toFixed(2)} `;
    series.forEach((s) => {
      fill += `L ${xOf(s.year).toFixed(2)} ${yOf(Math.max(0, s.balance)).toFixed(2)} `;
    });
    fill += `L ${xOf(series[series.length - 1].year).toFixed(2)} ${baseY.toFixed(2)} Z`;

    // Target horizontal line
    let targetEl = '';
    if (target > 0 && target <= niceMax) {
      const ty = yOf(target);
      targetEl =
        `<line class="target-line" x1="${padL}" y1="${ty}" x2="${W - padR}" y2="${ty}"/>` +
        `<text class="target-label" x="${W - padR}" y="${Math.max(padT + 10, ty - 4)}" text-anchor="end">target ${fmtCurrencyShort(target)}</text>`;
    }

    // Milestone vertical lines (today, hit-target, retire)
    let milestoneEls = '';
    (milestones || []).forEach((m) => {
      if (m.year == null || m.year < 0 || m.year > maxYear + 0.01) return;
      const x = xOf(m.year);
      const cls = m.kind === 'hit' ? 'milestone-line is-hit'
                : m.kind === 'retire' ? 'milestone-line is-retire'
                : 'milestone-line';
      milestoneEls += `<line class="${cls}" x1="${x}" y1="${padT}" x2="${x}" y2="${padT + innerH}"/>`;
      milestoneEls += `<text class="milestone-label" x="${x}" y="${H - 8}" text-anchor="middle">${escapeHtml(m.label)}</text>`;
    });

    svg.innerHTML =
      `<g class="axis" stroke="currentColor">${yAxis}</g>` +
      `<path class="balance-fill" d="${fill}"/>` +
      `<path class="balance-line" d="${line}"/>` +
      targetEl +
      milestoneEls;
  }

  function renderGoalDetail(tier, ctx) {
    const el = els.goalDetail;
    if (tier == null) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    const { yearsToRetire, target, realTarget } = ctx;
    const projection = projectFullPlan(
      state.principal, tier, yearsToRetire, state.goalRetireYears,
      state.goalIncome, state.rate, state.freq, state.inflation
    );
    const balanceAtRetire = projection.balanceAtRetire;
    const realBalance = realValue(balanceAtRetire, state.inflation, yearsToRetire);
    const ageHit = ageAtTarget(effectiveGoalAge(), state.principal, tier, target, state.rate, state.freq);
    const maxWithdraw = maxSustainableWithdrawal(balanceAtRetire, yearsToRetire, state.goalRetireYears, state.rate, state.inflation);
    const interestEarned = balanceAtRetire - state.principal - tier * yearsToRetire * 12;

    const milestones = [
      { year: 0, kind: 'today', label: `today (age ${Math.round(effectiveGoalAge())})` },
    ];
    if (ageHit != null && ageHit <= effectiveGoalAge() + yearsToRetire + state.goalRetireYears) {
      const hitYear = ageHit - effectiveGoalAge();
      if (hitYear > 0.5 && Math.abs(hitYear - yearsToRetire) > 0.5) {
        milestones.push({ year: hitYear, kind: 'hit', label: `hits target (${ageHit.toFixed(1)})` });
      }
    }
    milestones.push({ year: yearsToRetire, kind: 'retire', label: `retire (${state.goalRetireAge})` });

    const ageHitLabel = ageHit == null
      ? 'never'
      : ageHit > state.goalRetireAge + 80 ? 'never' : `age ${ageHit.toFixed(1)}`;

    el.innerHTML =
      `<div class="goal-detail__head">` +
        `<p class="goal-detail__title">${fmtCurrency(tier)}/mo · projected balance over time</p>` +
        `<button type="button" class="goal-detail__close" id="goalDetailClose" aria-label="Close detail">×</button>` +
      `</div>` +
      `<div class="goal-detail__chart-wrap">` +
        `<svg class="goal-detail__chart" id="goalDetailChart" role="img" aria-label="Projected balance"></svg>` +
      `</div>` +
      `<ul class="goal-detail__legend">` +
        `<li><span class="legend-line legend-line--solid" style="border-top-color: var(--accent-2)"></span>Balance</li>` +
        `<li><span class="legend-line legend-line--dashed" style="border-top-color: var(--accent)"></span>Target nest egg</li>` +
        (ageHit != null && ageHit <= state.goalRetireAge ? `<li><span class="legend-line legend-line--dashed" style="border-top-color: var(--contrib)"></span>Hits target</li>` : '') +
      `</ul>` +
      `<div class="goal-detail__stats">` +
        `<div class="goal-stat"><span class="goal-stat__label">Earliest retire</span><strong class="goal-stat__value">${ageHitLabel}</strong></div>` +
        `<div class="goal-stat"><span class="goal-stat__label">Bal @ age ${Math.round(state.goalRetireAge)}</span><strong class="goal-stat__value">${fmtCurrencyShort(balanceAtRetire)}</strong><span class="goal-stat__sub">${fmtRealShort(realBalance)} today</span></div>` +
        `<div class="goal-stat"><span class="goal-stat__label">Sustainable monthly</span><strong class="goal-stat__value">${fmtRealShort(maxWithdraw)}</strong><span class="goal-stat__sub">today's $</span></div>` +
        `<div class="goal-stat"><span class="goal-stat__label">Interest earned</span><strong class="goal-stat__value">${fmtCurrencyShort(Math.max(0, interestEarned))}</strong><span class="goal-stat__sub">accumulation</span></div>` +
      `</div>`;
    el.hidden = false;

    // Render the mini chart now that the SVG exists in the DOM
    const svg = document.getElementById('goalDetailChart');
    if (svg) renderProjectionChart(svg, projection.series, target, milestones);
  }

  // What-if widget — auto pre-fill the monthly contribution from the smallest
  // GOAL_TIER that hits the real target (or the largest tier if none does).
  function whatifPreFillMonthly(yearsToRetire, realTarget) {
    let best = null;
    for (const tier of GOAL_TIERS) {
      const bal = simulate(state.principal, tier, state.rate, state.freq, yearsToRetire).finalBalance;
      const real = realValue(bal, state.inflation, yearsToRetire);
      if (real >= realTarget) { best = tier; break; }
    }
    return best != null ? best : GOAL_TIERS[GOAL_TIERS.length - 1];
  }

  function renderWhatIf(target, realTarget) {
    // Resolve effective inputs (auto-fill if user hasn't touched the input)
    const userAge = state.whatifAge != null ? state.whatifAge : state.goalRetireAge;
    const yearsToRetire = Math.max(0, userAge - effectiveGoalAge());
    const autoMonthly = whatifPreFillMonthly(yearsToRetire, realTarget);
    const userMonthly = state.whatifMonthly != null ? state.whatifMonthly : autoMonthly;

    // Only overwrite the input if the user hasn't typed there yet
    if (state.whatifAge == null && document.activeElement !== els.whatifAge) {
      els.whatifAge.value = String(state.goalRetireAge);
    }
    if (state.whatifMonthly == null && document.activeElement !== els.whatifMonthly) {
      els.whatifMonthly.value = formatThousands(autoMonthly);
    }

    // Compute outcomes
    const balAtAge = simulate(state.principal, userMonthly, state.rate, state.freq, yearsToRetire).finalBalance;
    const realBalAtAge = realValue(balAtAge, state.inflation, yearsToRetire);
    // Target needs to be re-computed for THIS retirement age (different from the chosen one)
    const whatifTarget = targetNestEgg(state.goalIncome, yearsToRetire, state.goalRetireYears, state.rate, state.inflation);
    const whatifRealTarget = realValue(whatifTarget, state.inflation, yearsToRetire);
    const hits = realBalAtAge >= whatifRealTarget - 0.5;
    const maxWithdraw = maxSustainableWithdrawal(balAtAge, yearsToRetire, state.goalRetireYears, state.rate, state.inflation);
    const yearsLast = yearsUntilDepletion(balAtAge, state.goalIncome, yearsToRetire, state.rate, state.freq, state.inflation);

    const yearsLastLabel = !isFinite(yearsLast)
      ? 'never runs out'
      : yearsLast >= state.goalRetireYears
        ? `lasts the full ${state.goalRetireYears}+ years`
        : `lasts ~${yearsLast.toFixed(1)} years`;

    const verdictText = hits
      ? `On track to retire at ${userAge}`
      : yearsToRetire <= 0
        ? `Set an age above ${effectiveGoalAge()}`
        : `Short of the target at ${userAge}`;

    const diff = realBalAtAge - whatifRealTarget;
    const diffLabel = Math.abs(diff) < 1
      ? '—'
      : diff > 0
        ? `+${fmtCurrency(diff)} surplus`
        : `−${fmtCurrency(Math.abs(diff))} short`;

    els.whatifOutput.innerHTML =
      `<div class="goal-whatif__verdict ${hits ? 'is-hit' : 'is-miss'}">` +
        `<span class="goal-whatif__verdict-text">${escapeHtml(verdictText)}</span>` +
        `<span class="goal-whatif__verdict-sub">${escapeHtml(diffLabel)} <em>(today's $)</em></span>` +
      `</div>` +
      `<div class="goal-whatif__stats">` +
        `<div class="goal-stat"><span class="goal-stat__label">Balance @ ${Math.round(userAge)}</span><strong class="goal-stat__value">${fmtCurrencyShort(balAtAge)}</strong><span class="goal-stat__sub">${fmtRealShort(realBalAtAge)} today</span></div>` +
        `<div class="goal-stat"><span class="goal-stat__label">Sustainable monthly</span><strong class="goal-stat__value">${fmtRealShort(maxWithdraw)}</strong><span class="goal-stat__sub">today's $ for ${state.goalRetireYears}y</span></div>` +
        `<div class="goal-stat"><span class="goal-stat__label">At your goal income</span><strong class="goal-stat__value">${escapeHtml(yearsLastLabel)}</strong><span class="goal-stat__sub">${fmtCurrency(state.goalIncome)}/mo today</span></div>` +
      `</div>`;
  }

  function readGoalInputs() {
    state.goalIncome = Math.max(0, parseNumber(els.goalIncome.value));
    // currentAge is shared. Empty input → null (Timeline hides age, Goal falls back).
    const ageRaw = parseNumber(els.currentAge.value);
    state.currentAge = (els.currentAge.value || '').trim() === '' || ageRaw <= 0
      ? null
      : Math.min(120, ageRaw);
    state.goalRetireAge = Math.max(0, Math.min(120, parseNumber(els.goalRetireAge.value) || 0));
    state.goalRetireYears = Math.max(0, Math.min(80, parseNumber(els.goalRetireYears.value) || 0));
  }
  // Goal-mode helper: effective current age (35 when blank, since the math
  // needs *some* anchor and 35 is the long-standing pre-existing default).
  function effectiveGoalAge() { return state.currentAge != null ? state.currentAge : 35; }

  function recalcGoal() {
    readSharedInputs();
    readGoalInputs();
    const yearsToRetire = Math.max(0, state.goalRetireAge - effectiveGoalAge());
    const totalSpan = yearsToRetire + state.goalRetireYears;

    // Card 1: Target nest egg
    const nestEgg = targetNestEgg(state.goalIncome, yearsToRetire, state.goalRetireYears, state.rate, state.inflation);
    const nestEggReal = realValue(nestEgg, state.inflation, yearsToRetire);
    els.goalNestEggValue.textContent = fmtCurrency(nestEgg);
    els.goalNestEggReal.innerHTML = `${fmtReal(nestEggReal)} <em>in today's purchasing power</em>`;

    // Inflation-adjusted monthly income at retirement
    const monthlyAtRetire = inflatedAmount(state.goalIncome, state.inflation, yearsToRetire);
    els.goalIncomeAtRetire.textContent = fmtCurrency(monthlyAtRetire) + '/mo';
    els.goalIncomeNote.innerHTML =
      `<em>what ${fmtCurrency(state.goalIncome)}/mo today costs by age ${Math.round(state.goalRetireAge)}</em>`;

    // Card 2: Monthly contribution needed
    const requiredMonthly = findRequiredMonthly(state.principal, yearsToRetire, nestEgg, state.rate, state.freq);
    els.goalContribValue.textContent = fmtCurrency(requiredMonthly) + '/mo';
    if (yearsToRetire <= 0) {
      els.goalContribHint.innerHTML = `<em>set a retirement age above your current age</em>`;
    } else if (requiredMonthly < 0.5) {
      els.goalContribHint.innerHTML = state.principal >= nestEgg
        ? `<em>you're already past the target — no new contributions needed</em>`
        : `<em>compound growth alone reaches the target</em>`;
    } else {
      const yearsLabel = Math.round(yearsToRetire);
      els.goalContribHint.innerHTML = `<em>over the next ${yearsLabel} year${yearsLabel === 1 ? '' : 's'} to hit ${fmtCurrencyShort(nestEgg)}</em>`;
    }

    // ---- Hero card — the plain-language answer at the top of Goal mode ----
    // Project the balance you'd actually have if you contributed the required
    // monthly, then read three numbers off it: hit-target age, perpetual
    // (forever) monthly draw, or finite years if real return ≤ 0.
    const projectedBalance = simulate(state.principal, requiredMonthly, state.rate, state.freq, yearsToRetire).finalBalance;
    const heroAgeHit = ageAtTarget(effectiveGoalAge(), state.principal, requiredMonthly, nestEgg, state.rate, state.freq);
    const perpetual = perpetualMonthlyWithdrawal(projectedBalance, yearsToRetire, state.rate, state.inflation);

    els.heroRetireAge.textContent = Math.round(state.goalRetireAge);
    els.heroIncome.textContent = fmtCurrency(state.goalIncome);
    els.heroContrib.textContent = requiredMonthly < 0.5
      ? '$0'
      : fmtCurrency(requiredMonthly) + '/mo';

    if (heroAgeHit == null || heroAgeHit > state.goalRetireAge + 80) {
      els.heroHitAge.textContent = 'never';
    } else {
      els.heroHitAge.textContent = `age ${heroAgeHit.toFixed(1)}`;
    }

    if (perpetual > 0.5) {
      // Real return is positive → there's a perpetual draw rate
      els.heroForeverLabel.textContent = "Max you can withdraw without ever running out";
      els.heroForever.textContent = fmtCurrency(perpetual) + '/mo';
      const vsGoal = perpetual >= state.goalIncome
        ? `covers your ${fmtCurrency(state.goalIncome)}/mo goal`
        : `${fmtCurrency(state.goalIncome - perpetual)}/mo short of your goal`;
      els.heroForeverSub.textContent = `today's $ · ${vsGoal}`;
    } else {
      // Real return ≤ 0 → no perpetual draw possible. Show finite runway at goal income.
      const yearsLast = yearsUntilDepletion(projectedBalance, state.goalIncome, yearsToRetire, state.rate, state.freq, state.inflation);
      els.heroForeverLabel.textContent = "At your goal income, money lasts";
      if (!isFinite(yearsLast)) {
        els.heroForever.textContent = 'forever';
        els.heroForeverSub.textContent = '';
      } else {
        els.heroForever.textContent = `${yearsLast.toFixed(1)} years`;
        els.heroForeverSub.textContent = `at ${fmtCurrency(state.goalIncome)}/mo (real return ≤ 0)`;
      }
    }

    // Plan timeline bar (today → retirement → end)
    renderGoalTimeline(yearsToRetire, state.goalRetireYears, effectiveGoalAge(), state.goalRetireAge, nestEgg);

    // Card 3: Contribution scenarios — pass real target so green/red is
    // decided on purchasing power, not nominal numbers.
    renderGoalScenarios(yearsToRetire, nestEgg, nestEggReal);

    // Detail panel for the currently-expanded tier (if any)
    const ctx = { yearsToRetire, target: nestEgg, realTarget: nestEggReal };
    renderGoalDetail(state.goalExpandedTier, ctx);

    // What-if widget
    renderWhatIf(nestEgg, nestEggReal);

    els.goalSpan.textContent = `${effectiveGoalAge()} → ${Math.round(effectiveGoalAge() + totalSpan)}`;
  }

  function renderGoalTimeline(yearsToRetire, yearsInRetire, currentAge, retireAge, target) {
    const total = Math.max(0.0001, yearsToRetire + yearsInRetire);
    const accumPct = (yearsToRetire / total) * 100;
    const retirePct = (yearsInRetire / total) * 100;

    let bar = '';
    if (accumPct > 0.05) {
      bar += `<div class="tl-seg tl-seg--contribute" style="width:${accumPct.toFixed(3)}%">${accumPct >= 12 ? 'Accumulate' : ''}</div>`;
    }
    if (retirePct > 0.05) {
      bar += `<div class="tl-seg tl-seg--withdraw" style="width:${retirePct.toFixed(3)}%">${retirePct >= 12 ? 'Retirement' : ''}</div>`;
    }
    if (!bar) bar = '<div class="tl-seg" style="width:100%; background:var(--card-2); color:var(--muted);">Set retirement age</div>';
    els.goalBar.innerHTML = bar;

    // Axis ticks: current age, retire age, end age
    const endAge = currentAge + yearsToRetire + yearsInRetire;
    const ticks = [
      { age: currentAge, pct: 0 },
      { age: retireAge,  pct: accumPct },
      { age: endAge,     pct: 100 },
    ];
    let axis = '';
    ticks.forEach((t) => {
      axis += `<span style="left:${t.pct.toFixed(2)}%">age ${Math.round(t.age)}</span>`;
    });
    els.goalBarAxis.innerHTML = axis;

    // Target marker pin above the retirement boundary
    if (yearsToRetire > 0 && target > 0) {
      els.goalMarker.innerHTML =
        `<div class="goal-target-marker__pin" style="left:${accumPct.toFixed(2)}%">` +
          `<span>target ${fmtCurrencyShort(target)}</span>` +
        `</div>`;
    } else {
      els.goalMarker.innerHTML = '';
    }
  }

  function renderGoalScenarios(yearsToRetire, target, realTarget) {
    let tbody = '';
    GOAL_TIERS.forEach((m) => {
      const balanceAtRetire = simulate(state.principal, m, state.rate, state.freq, yearsToRetire).finalBalance;
      const ageHit = ageAtTarget(effectiveGoalAge(), state.principal, m, target, state.rate, state.freq);
      const realBalance = realValue(balanceAtRetire, state.inflation, yearsToRetire);
      const diff = realBalance - realTarget;
      // Sustainable monthly withdrawal (today's $) given balance at chosen retire age
      const sustainableMonthly = maxSustainableWithdrawal(
        balanceAtRetire, yearsToRetire, state.goalRetireYears, state.rate, state.inflation
      );

      // Hit/miss compares purchasing power, not nominal $
      const hits = realBalance >= realTarget - 0.5;
      let cls = hits ? 'is-hit' : 'is-miss';
      if (state.goalExpandedTier === m) cls += ' is-expanded';

      // Earliest retirement age — fractional, always 1 decimal
      let ageLabel;
      if (ageHit == null || ageHit > state.goalRetireAge + 80) {
        ageLabel = '<span class="cmp-card__sub">never</span>';
      } else {
        ageLabel = `age ${ageHit.toFixed(1)}`;
      }

      const pill = hits
        ? `<span class="result-pill result-pill--hit">on track</span>`
        : `<span class="result-pill result-pill--miss">short</span>`;

      // vs-target diff in today's dollars: + green / − red
      let diffStr;
      if (Math.abs(diff) < 1) {
        diffStr = `<span class="vs-target">—</span>`;
      } else if (diff > 0) {
        diffStr = `<span class="vs-target vs-target--pos">+${fmtCurrency(diff)}</span>`;
      } else {
        diffStr = `<span class="vs-target vs-target--neg">−${fmtCurrency(Math.abs(diff))}</span>`;
      }

      // Sustainable monthly withdrawal cell with runway indicator.
      // "forever" (green) when the user's planned goalIncome is sustainable
      // indefinitely at this tier's balance; otherwise shows years until
      // depletion at goalIncome (amber).
      let withdrawCell;
      if (sustainableMonthly > 0) {
        const yearsAtGoal = yearsUntilDepletion(
          balanceAtRetire, state.goalIncome, yearsToRetire,
          state.rate, state.freq, state.inflation
        );
        const runway = !isFinite(yearsAtGoal)
          ? `<span class="runway runway--forever">forever</span>`
          : `<span class="runway runway--finite">${Math.round(yearsAtGoal)} years</span>`;
        withdrawCell =
          `<span class="withdraw-cell">${fmtRealShort(sustainableMonthly)}` +
            `<span class="cell-meta">/mo for ${state.goalRetireYears}y</span>` +
            runway +
          `</span>`;
      } else {
        withdrawCell = `<span class="cmp-card__sub">—</span>`;
      }

      tbody +=
        `<tr class="${cls}" data-tier="${m}" tabindex="0" aria-expanded="${state.goalExpandedTier === m}">` +
          `<td>${fmtCurrency(m)}/mo<span class="row-chevron" aria-hidden="true"></span></td>` +
          `<td>${ageLabel}</td>` +
          `<td><strong>${fmtCurrency(balanceAtRetire)}</strong><span class="cell-meta">(nominal)</span></td>` +
          `<td><span class="real-cell">${fmtReal(realBalance)}</span></td>` +
          `<td>${withdrawCell}</td>` +
          `<td>${diffStr}</td>` +
          `<td>${pill}</td>` +
        `</tr>`;
    });
    els.goalTableBody.innerHTML = tbody;
  }

  // ---- Mode switching ----
  function setMode(mode) {
    if (mode !== 'simple' && mode !== 'timeline' && mode !== 'goal') return;
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
      principalLabel.textContent =
        mode === 'timeline' ? 'Starting balance' :
        mode === 'goal'     ? 'Current savings' :
                              'Initial principal';
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
    if (els.currentAge) {
      const ageRaw = parseNumber(els.currentAge.value);
      state.currentAge = (els.currentAge.value || '').trim() === '' || ageRaw <= 0
        ? null
        : Math.min(120, ageRaw);
    }
  }

  function recalc() {
    if (state.mode === 'timeline') {
      recalcTimeline();
      return;
    }
    if (state.mode === 'goal') {
      recalcGoal();
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
  attachNumericInput(els.goalIncome, { thousands: true });
  attachNumericInput(els.currentAge, { thousands: false });
  attachNumericInput(els.goalRetireAge, { thousands: false });
  attachNumericInput(els.goalRetireYears, { thousands: false });

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
    else if (state.mode === 'timeline') recalcTimeline();
    else recalcGoal();
  });
  window.addEventListener('orientationchange', () => setTimeout(() => {
    if (state.mode === 'simple') renderChart(state.series);
    else if (state.mode === 'timeline') recalcTimeline();
    else recalcGoal();
  }, 100));

  // ---- Share + Print: URL state encoding ----
  // Compact param keys keep the shareable URL short. Phases use a custom
  // packed form: type:years:amount:encodedLabel joined by commas.
  const PHASE_TYPE_CODE = { contribute: 'c', coast: 'o', withdraw: 'w' };
  const PHASE_TYPE_DECODE = { c: 'contribute', o: 'coast', w: 'withdraw' };

  function encodePhases(phases) {
    return phases.map((p) => {
      const t = PHASE_TYPE_CODE[p.type] || 'c';
      const y = +p.years || 0;
      const a = +p.amount || 0;
      const lbl = encodeURIComponent(p.label || '');
      return `${t}:${y}:${a}:${lbl}`;
    }).join(',');
  }
  function decodePhases(str) {
    if (!str) return null;
    return str.split(',').map((chunk) => {
      const parts = chunk.split(':');
      return {
        id: newPhaseId(),
        type: PHASE_TYPE_DECODE[parts[0]] || 'contribute',
        years: Math.max(0, parseFloat(parts[1]) || 0),
        amount: Math.max(0, parseFloat(parts[2]) || 0),
        label: decodeURIComponent(parts[3] || ''),
      };
    });
  }

  function buildShareURL() {
    // Make sure state reflects what's actually in the inputs right now
    if (state.mode === 'simple') readInputs();
    else readSharedInputs();
    if (state.mode === 'goal') readGoalInputs();

    const p = new URLSearchParams();
    p.set('m', state.mode);
    p.set('p', String(state.principal));
    p.set('mo', String(state.monthly));
    p.set('r', String(state.rate));
    p.set('inf', String(state.inflation));
    p.set('y', String(state.years));
    p.set('f', String(state.freq));
    if (state.currentAge != null) p.set('a', String(state.currentAge));
    p.set('gi', String(state.goalIncome));
    p.set('gra', String(state.goalRetireAge));
    p.set('gry', String(state.goalRetireYears));
    if (state.phases && state.phases.length) p.set('ph', encodePhases(state.phases));
    const theme = document.body.getAttribute('data-theme');
    if (theme === 'dark' || theme === 'light') p.set('th', theme);
    return window.location.origin + window.location.pathname + '?' + p.toString();
  }

  function loadFromURL() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (_) { return false; }
    if (![...params.keys()].length) return false;

    try {
      // Numbers — use parseFloat with sensible clamping
      const setNum = (key, max, min) => {
        if (!params.has(key)) return null;
        const v = parseFloat(params.get(key));
        if (!isFinite(v)) return null;
        return Math.max(min ?? 0, Math.min(max ?? Infinity, v));
      };

      const principal = setNum('p', 1e12);
      if (principal != null) {
        state.principal = principal;
        els.principal.value = formatThousands(principal);
      }
      const monthly = setNum('mo', 1e9);
      if (monthly != null) {
        state.monthly = monthly;
        els.monthly.value = formatThousands(monthly);
      }
      const rate = setNum('r', 50);
      if (rate != null) {
        state.rate = rate;
        els.rate.value = String(rate);
      }
      const inflation = setNum('inf', 10);
      if (inflation != null) {
        state.inflation = inflation;
        els.inflation.value = String(inflation);
        if (els.inflationOut) {
          els.inflationOut.textContent = Number.isInteger(inflation) ? inflation.toFixed(0) : inflation.toFixed(1);
        }
      }
      const years = setNum('y', 40, 1);
      if (years != null) {
        state.years = Math.round(years);
        els.years.value = String(state.years);
        if (els.yearsOut) els.yearsOut.textContent = String(state.years);
      }
      if (params.has('f')) {
        const f = parseInt(params.get('f'), 10);
        if (f === 1 || f === 4 || f === 12) {
          state.freq = f;
          els.seg.forEach((b) => {
            const active = parseInt(b.getAttribute('data-value'), 10) === f;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-checked', active ? 'true' : 'false');
          });
        }
      }
      if (params.has('a')) {
        const a = parseFloat(params.get('a'));
        if (isFinite(a) && a > 0) {
          state.currentAge = Math.min(120, a);
          els.currentAge.value = String(Math.round(state.currentAge));
        }
      } else {
        state.currentAge = null;
        if (els.currentAge) els.currentAge.value = '';
      }
      const gi = setNum('gi', 1e9);
      if (gi != null) {
        state.goalIncome = gi;
        els.goalIncome.value = formatThousands(gi);
      }
      const gra = setNum('gra', 120);
      if (gra != null) {
        state.goalRetireAge = gra;
        els.goalRetireAge.value = String(Math.round(gra));
      }
      const gry = setNum('gry', 80);
      if (gry != null) {
        state.goalRetireYears = gry;
        els.goalRetireYears.value = String(Math.round(gry));
      }
      if (params.has('ph')) {
        const phases = decodePhases(params.get('ph'));
        if (phases && phases.length) state.phases = phases;
      }
      if (params.has('th')) {
        const t = params.get('th');
        if (t === 'dark' || t === 'light') {
          document.documentElement.setAttribute('data-theme', t);
          document.body.setAttribute('data-theme', t);
          try { localStorage.setItem('compound-theme', t); } catch (_) {}
        }
      }
      if (params.has('m')) {
        const m = params.get('m');
        if (m === 'simple' || m === 'timeline' || m === 'goal') {
          state.mode = m;
          document.body.setAttribute('data-mode', m);
          els.modeBtns.forEach((b) => {
            const active = b.getAttribute('data-mode-btn') === m;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-checked', active ? 'true' : 'false');
          });
          const principalLabel = document.getElementById('principalLabel');
          if (principalLabel) {
            principalLabel.textContent =
              m === 'timeline' ? 'Starting balance' :
              m === 'goal'     ? 'Current savings' :
                                 'Initial principal';
          }
        }
      }
      return true;
    } catch (e) {
      // Bad URL params — leave state at defaults
      return false;
    }
  }

  // ---- Toast ----
  let toastTimer = null;
  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2000);
  }

  // ---- Share button ----
  async function copyShareURL() {
    const url = buildShareURL();
    // Reflect the current state in the address bar so refresh / bookmark
    // captures the same plan, without adding a history entry.
    try { window.history.replaceState(null, '', url); } catch (_) {}
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(url); copied = true; } catch (_) {}
    }
    if (!copied) {
      // Fallback for non-secure contexts (http://) and older browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); copied = true; } catch (_) {}
      document.body.removeChild(ta);
    }
    showToast(copied ? 'Link copied!' : 'Could not copy — URL is in the address bar');
  }

  // ---- Print: refresh the URL footer right before the print dialog opens ----
  function syncPrintFooter() {
    if (!els.printFooterUrl) return;
    els.printFooterUrl.textContent = buildShareURL();
  }
  window.addEventListener('beforeprint', syncPrintFooter);

  // ---- Mode toggle ----
  els.modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode-btn')));
  });

  // Wire the toolbar buttons
  if (els.shareBtn) els.shareBtn.addEventListener('click', copyShareURL);
  if (els.printBtn) {
    els.printBtn.addEventListener('click', () => {
      // Make sure the footer URL reflects the latest state even when print
      // is fired from a button (some browsers don't fire beforeprint reliably
      // for window.print() called by user code).
      syncPrintFooter();
      window.print();
    });
  }

  // ---- Theme toggle ----
  // Wired EARLY (right after mode-toggle) so it's independent of any
  // goal-mode-specific handlers further down. setTheme writes the attribute
  // to both <html> and <body>, persists to localStorage, and re-syncs the
  // <meta name="theme-color"> from the resolved --bg.
  const THEME_KEY = 'compound-theme';
  function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* ignore */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
      if (bg) meta.setAttribute('content', bg);
    }
  }
  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    const onThemeToggle = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const cur = document.body.getAttribute('data-theme');
      const next = cur === 'light' ? 'dark' : 'light';
      setTheme(next);
    };
    themeToggleBtn.addEventListener('click', onThemeToggle);
    // Belt-and-suspenders: some mobile browsers can lose synthesised clicks
    // on the first tap on a fixed element with a transition. A touchend
    // listener guarantees the toggle responds to the very first tap too.
    themeToggleBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      onThemeToggle(e);
    }, { passive: false });
  }
  // Sync meta theme-color on initial load (the inline bootstrap already set
  // the data-theme attribute, but the meta tag still reflects the dark default).
  (function syncMetaThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
    if (bg) meta.setAttribute('content', bg);
  })();
  // If the user hasn't explicitly chosen a theme, follow live OS-level changes.
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e) => {
      let saved = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
      if (saved !== 'dark' && saved !== 'light') {
        setTheme(e.matches ? 'light' : 'dark');
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // ---- Goal scenarios — row-tap to expand detail panel ----
  if (els.goalTableBody) {
    els.goalTableBody.addEventListener('click', (e) => {
      const row = e.target.closest('[data-tier]');
      if (!row) return;
      const tier = parseInt(row.getAttribute('data-tier'), 10);
      // Toggle: tap the same row again to collapse
      state.goalExpandedTier = (state.goalExpandedTier === tier) ? null : tier;
      recalcGoal();
      // Smooth-scroll the detail into view if we just expanded
      if (state.goalExpandedTier != null && els.goalDetail && !els.goalDetail.hidden) {
        els.goalDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    // Keyboard support for accessibility
    els.goalTableBody.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('[data-tier]');
      if (!row) return;
      e.preventDefault();
      row.click();
    });
  }
  // Close button inside the detail panel (event-delegated since the panel
  // is re-rendered on every recalc)
  if (els.goalDetail) {
    els.goalDetail.addEventListener('click', (e) => {
      if (e.target.closest('#goalDetailClose')) {
        state.goalExpandedTier = null;
        recalcGoal();
      }
    });
  }

  // ---- What-if widget ----
  // Mark the inputs as "touched" so auto pre-fill stops overwriting them.
  if (els.whatifAge) {
    els.whatifAge.addEventListener('input', () => {
      const v = parseNumber(els.whatifAge.value);
      state.whatifAge = isFinite(v) && v > 0 ? Math.min(120, v) : null;
      recalcGoal();
    });
    els.whatifAge.addEventListener('blur', () => {
      if (state.whatifAge == null) return;
      els.whatifAge.value = String(Math.round(state.whatifAge));
    });
  }
  if (els.whatifMonthly) {
    els.whatifMonthly.addEventListener('input', () => {
      const raw = els.whatifMonthly.value;
      const cleaned = raw.replace(/[^\d.]/g, '');
      const parts = cleaned.split('.');
      const intPart = parts[0] || '';
      const decPart = parts.length > 1 ? '.' + parts.slice(1).join('').slice(0, 2) : '';
      const formatted = (intPart ? parseInt(intPart, 10).toLocaleString('en-US') : '') + decPart;
      if (formatted !== raw) {
        const cursorAtEnd = els.whatifMonthly.selectionStart === raw.length;
        els.whatifMonthly.value = formatted;
        if (cursorAtEnd) els.whatifMonthly.setSelectionRange(formatted.length, formatted.length);
      }
      const v = parseNumber(els.whatifMonthly.value);
      state.whatifMonthly = v >= 0 ? v : null;
      recalcGoal();
    });
    els.whatifMonthly.addEventListener('blur', () => {
      if (state.whatifMonthly == null) return;
      els.whatifMonthly.value = formatThousands(state.whatifMonthly);
    });
  }

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

  // Restore state from ?p=...&mo=... URL params if present (lets users
  // bookmark or share a specific plan). Runs before the initial recalc so
  // the first render reflects the shared scenario, not the defaults.
  loadFromURL();

  recalc();
})();
