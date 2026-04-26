(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const els = {
    principal: $('principal'),
    monthly: $('monthly'),
    rate: $('rate'),
    years: $('years'),
    yearsOut: $('yearsOut'),
    seg: document.querySelectorAll('.seg__btn'),

    finalBalance: $('finalBalance'),
    metaPrincipal: $('metaPrincipal'),
    metaContrib: $('metaContrib'),
    metaInterest: $('metaInterest'),

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

    installState: $('installState'),
  };

  const TIERS = [1000, 2000, 3000, 4000, 5000, 6000, 7000];

  const state = {
    principal: 10000,
    monthly: 500,
    rate: 7,
    years: 20,
    freq: 12,
    series: [],
    activeYear: null,
  };

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
    state.years = Math.min(40, Math.max(1, parseInt(els.years.value, 10) || 1));
  }

  function recalc() {
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

  window.addEventListener('resize', () => renderChart(state.series));
  window.addEventListener('orientationchange', () => setTimeout(() => renderChart(state.series), 100));

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
