/* =====================================================================
   pages.js — أوقات الصلاة · أذكار الصباح والمساء · أدعية القرآن
   (يعتمد على AZKAR و QURAN_DUAS و showToast و state من script.js)
   ===================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const ls = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* =================================================================
     1) PRAYER TIMES
     ================================================================= */
  const EV = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const NAME = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
  const ICON = { Fajr: '🌙', Sunrise: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌃' };

  // طرق الحساب (أرقام Aladhan) + معاملات الحساب المحلي الاحتياطي
  const METHODS = {
    5:  { n: 'الهيئة المصرية العامة للمساحة', f: 19.5, i: 17.5 },
    4:  { n: 'أم القرى — مكة المكرمة',       f: 18.5, im: 90 },
    3:  { n: 'رابطة العالم الإسلامي',         f: 18,   i: 17 },
    2:  { n: 'أمريكا الشمالية (ISNA)',        f: 15,   i: 15 },
    1:  { n: 'جامعة العلوم الإسلامية — كراتشي', f: 18, i: 18 },
    9:  { n: 'الكويت',                        f: 18,   i: 17.5 },
    10: { n: 'قطر',                           f: 18,   im: 90 },
    8:  { n: 'منطقة الخليج',                  f: 19.5, im: 90 },
    13: { n: 'رئاسة الشؤون الدينية — تركيا',  f: 18,   i: 17 },
    16: { n: 'دبي',                           f: 18.2, i: 18.2 },
    21: { n: 'المغرب',                        f: 19,   i: 17 },
    19: { n: 'الجزائر',                       f: 18,   i: 17 },
    18: { n: 'تونس',                          f: 18,   i: 18 },
    23: { n: 'الأردن',                        f: 18,   i: 18 }
  };
  const CC_METHOD = { EG: 5, SD: 5, LY: 5, SA: 4, KW: 9, QA: 10, AE: 16, BH: 8, OM: 8, TR: 13, MA: 21, DZ: 19, TN: 18, JO: 23, PK: 1, US: 2, CA: 2 };

  const P = Object.assign({ lat: null, lng: null, city: '', cc: '', tz: '', method: 'auto', school: 0, days: null, src: '', timer: null },
    ls.get('pg_prayer_v2', {}));
  P.days = null; P.timer = null;
  const savePref = () => ls.set('pg_prayer_v2', { lat: P.lat, lng: P.lng, city: P.city, cc: P.cc, tz: P.tz, method: P.method, school: P.school });
  const methodId = () => P.method === 'auto' ? (CC_METHOD[P.cc] || 3) : +P.method;
  const deviceTZ = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };

  /* ---- أدوات المنطقة الزمنية: كل الأوقات تُخزَّن كلحظات مطلقة (ms) ---- */
  function partsIn(tz, ms) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const o = {}; f.formatToParts(new Date(ms)).forEach(p => { o[p.type] = +p.value; });
    return o;
  }
  function tzOffsetMin(tz, ms) { const p = partsIn(tz, ms); return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000) / 60000; }
  function zonedToMs(tz, y, m, d, h, mi) { // y,m(1-12),d,h,mi في المنطقة tz
    const guess = Date.UTC(y, m - 1, d, h, mi);
    let ms = guess - tzOffsetMin(tz, guess) * 60000;
    ms = guess - tzOffsetMin(tz, ms) * 60000; // تصحيح حول تغيير التوقيت الصيفي
    return ms;
  }
  const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayKey = tz => { const p = partsIn(tz, Date.now()); return ymd(p.year, p.month, p.day); };

  /* ---- حساب فلكي محلي (احتياطي عند انقطاع الإنترنت) ---- */
  function localDay(y, m, d, lat, lng, tz, mid, school) {
    const R = Math.PI / 180, md = (a, n) => ((a % n) + n) % n;
    const jd0 = Date.UTC(y, m - 1, d) / 864e5 + 2440587.5 - lng / 360;
    const sun = t => {
      const D = jd0 + t - 2451545.0, g = md(357.529 + 0.98560028 * D, 360), q = md(280.459 + 0.98564736 * D, 360);
      const L = md(q + 1.915 * Math.sin(g * R) + 0.020 * Math.sin(2 * g * R), 360), e = 23.439 - 0.00000036 * D;
      const RA = md(Math.atan2(Math.cos(e * R) * Math.sin(L * R), Math.cos(L * R)) / R / 15, 24);
      let eq = q / 15 - RA; eq = md(eq + 12, 24) - 12;
      return { decl: Math.asin(Math.sin(e * R) * Math.sin(L * R)) / R, eq };
    };
    const noon = t => md(12 - sun(t).eq, 24);
    const at = (ang, t, ccw) => {
      const dc = sun(t).decl;
      const c = (-Math.sin(ang * R) - Math.sin(dc * R) * Math.sin(lat * R)) / (Math.cos(dc * R) * Math.cos(lat * R));
      if (c < -1 || c > 1) return NaN;
      const v = Math.acos(c) / R / 15; return noon(t) + (ccw ? -v : v);
    };
    const asrAng = (f, t) => { const dc = sun(t).decl; return -Math.atan(1 / (f + Math.tan(Math.abs(lat - dc) * R))) / R; };
    const off = tz - lng / 15, M = METHODS[mid] || METHODS[3];
    const rise = 0.833;
    let T = {
      Fajr: at(M.f, 5 / 24, true) , Sunrise: at(rise, 6 / 24, true), Dhuhr: noon(12 / 24),
      Asr: at(asrAng(school ? 2 : 1, 13 / 24), 13 / 24, false), Maghrib: at(rise, 18 / 24, false)
    };
    T.Isha = M.im ? T.Maghrib + M.im / 60 : at(M.i, 18 / 24, false);
    const out = {};
    EV.forEach(k => { out[k] = T[k] + off; });
    return out; // ساعات عشرية بتوقيت المنطقة
  }
  function localRange(startKey, n, tz) {
    const [y0, m0, d0] = startKey.split('-').map(Number), res = [], id = methodId();
    for (let i = 0; i < n; i++) {
      const dt = new Date(Date.UTC(y0, m0 - 1, d0 + i)), y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
      const noonMs = zonedToMs(tz, y, m, d, 12, 0), off = tzOffsetMin(tz, noonMs) / 60;
      const T = localDay(y, m, d, P.lat, P.lng, off, id, P.school), ts = {};
      EV.forEach(k => { const h = T[k]; ts[k] = isNaN(h) ? NaN : zonedToMs(tz, y, m, d, 0, 0) + Math.round(h * 3600) * 1000; });
      res.push({ key: ymd(y, m, d), ts, hijri: '' });
    }
    return res;
  }

  /* ---- جلب الأوقات من Aladhan (مصدر أساسي) ---- */
  const hhmm = s => { const m = /(\d{1,2}):(\d{2})/.exec(s || ''); return m ? [+m[1], +m[2]] : null; };
  async function apiMonth(y, m) {
    const gps = P.src === 'gps';
    const url = `https://api.aladhan.com/v1/calendar/${y}/${m}?latitude=${P.lat}&longitude=${P.lng}&method=${methodId()}&school=${P.school}` + (gps ? `&timezonestring=${encodeURIComponent(deviceTZ())}` : '');
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch(url, { signal: ctl.signal }); const j = await r.json();
      if (j.code !== 200 || !Array.isArray(j.data)) throw new Error('bad');
      const tz = (j.data[0].meta && j.data[0].meta.timezone) || deviceTZ();
      return { tz, days: j.data.map(o => {
        const [dd, mm, yy] = o.date.gregorian.date.split('-').map(Number), ts = {};
        EV.forEach(k => { const t = hhmm(o.timings[k]); ts[k] = t ? zonedToMs(tz, yy, mm, dd, t[0], t[1]) : NaN; });
        const h = o.date.hijri;
        return { key: ymd(yy, mm, dd), ts, hijri: `${AR(+h.day)} ${h.month.ar} ${AR(h.year)} هـ` };
      }) };
    } finally { clearTimeout(to); }
  }
  async function loadDays() {
    const tz0 = P.tz || deviceTZ(), now = new Date(), p = partsIn(tz0, now.getTime());
    const need = [[p.year, p.month]]; const nx = new Date(Date.UTC(p.year, p.month, 1)); need.push([nx.getUTCFullYear(), nx.getUTCMonth() + 1]);
    try {
      const rs = await Promise.all(need.map(([y, m]) => apiMonth(y, m)));
      P.tz = rs[0].tz; P.days = [].concat(rs[0].days, rs[1].days); P.mode = 'api';
    } catch (e) {
      P.tz = P.tz || deviceTZ();
      P.days = localRange(ymd(p.year, p.month, 1), 40, P.tz); P.mode = 'local';
    }
  }

  /* ---- تحديد الموقع ---- */
  async function reverse(lat, lng) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar&zoom=10`);
      const d = await r.json(), a = d.address || {};
      return { city: [a.city || a.town || a.village || a.state || a.county, a.country].filter(Boolean).join('، '), cc: (a.country_code || '').toUpperCase() };
    } catch (e) { return { city: '', cc: '' }; }
  }
  function gps() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error('nogeo'));
      navigator.geolocation.getCurrentPosition(p => res(p.coords), rej, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
  }
  async function ipLoc() {
    try { const j = await (await fetch('https://ipapi.co/json/')).json(); if (j.latitude) return { lat: j.latitude, lng: j.longitude, city: [j.city, j.country_name].filter(Boolean).join('، '), cc: j.country_code || '' }; } catch (e) {}
    return null;
  }
  async function searchCity(q) {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1&accept-language=ar`);
    const j = await r.json(); if (!j[0]) return null;
    const a = j[0].address || {};
    return { lat: +j[0].lat, lng: +j[0].lon, city: [a.city || a.town || a.village || a.state || j[0].name, a.country].filter(Boolean).join('، '), cc: (a.country_code || '').toUpperCase() };
  }

  function setState(html, err) { const el = $('pg-prayer-state'); el.className = 'pg-state' + (err ? ' err' : ''); el.innerHTML = html; el.style.display = html ? 'block' : 'none'; }

  async function refresh(keepOld) {
    if (!keepOld) { $('pg-prayer-body').style.display = 'none'; setState('<div class="spinner" style="margin:0 auto 12px"></div>جارٍ تحميل الأوقات...'); }
    await loadDays(); savePref(); setState(''); render();
  }
  window.detectLocation = async function () {
    $('pg-prayer-body').style.display = 'none'; setState('<div class="spinner" style="margin:0 auto 12px"></div>جارٍ تحديد موقعك بدقة...');
    try {
      const c = await gps(); P.lat = c.latitude; P.lng = c.longitude; P.src = 'gps'; P.tz = deviceTZ();
      const g = await reverse(P.lat, P.lng); P.city = g.city || 'موقعك الحالي'; P.cc = g.cc;
    } catch (e) {
      const ip = await ipLoc();
      if (ip) { Object.assign(P, ip, { src: 'ip', tz: '' }); }
      else { Object.assign(P, { lat: 30.0444, lng: 31.2357, city: 'القاهرة، مصر', cc: 'EG', src: 'def', tz: 'Africa/Cairo' }); }
      if (typeof showToast === 'function') showToast('تعذّر الوصول لـ GPS — فعّل إذن الموقع لدقة أعلى');
    }
    await refresh(false);
  };
  window.initPrayerTimes = async function () {
    if (P.lat == null) return window.detectLocation();
    if (P.days) return render();
    await refresh(false);
  };
  window.pgCitySearch = async function () {
    const q = $('pg-city-q').value.trim(); if (!q) return;
    setState('<div class="spinner" style="margin:0 auto 12px"></div>جارٍ البحث عن المدينة...'); $('pg-prayer-body').style.display = 'none';
    try {
      const c = await searchCity(q);
      if (!c) { setState('لم يتم العثور على المدينة، جرّب اسمًا آخر.', true); $('pg-prayer-body').style.display = 'block'; return; }
      Object.assign(P, c, { src: 'city', tz: '' }); await refresh(false);
    } catch (e) { setState('تعذّر البحث، تحقّق من الاتصال.', true); $('pg-prayer-body').style.display = 'block'; }
  };
  window.pgSetMethod = v => { P.method = v; savePref(); refresh(true); };
  window.pgSetSchool = v => { P.school = +v; savePref(); refresh(true); };

  /* ---- العرض ---- */
  const fmt = (ms, tz) => {
    if (isNaN(ms)) return '--:--';
    const p = partsIn(tz, ms), h12 = p.hour % 12 || 12;
    return `${AR(h12)}:${AR(String(p.minute).padStart(2, '0'))} ${p.hour < 12 ? 'ص' : 'م'}`;
  };
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  function eventsFlat(idx) { // 6 أحداث اليوم + فجر الغد
    const a = P.days[idx], b = P.days[idx + 1], out = EV.map(k => ({ k, t: a.ts[k] }));
    if (b) out.push({ k: 'Fajr', t: b.ts.Fajr, tomorrow: true });
    return out;
  }
  function render() {
    if (!P.days) return;
    const tz = P.tz || deviceTZ(), key = todayKey(tz); let idx = P.days.findIndex(d => d.key === key);
    if (idx < 0) { refresh(true); return; }
    const day = P.days[idx], now = Date.now(), ev = eventsFlat(idx);
    let ni = ev.findIndex(e => e.t > now); if (ni < 0) ni = ev.length - 1;
    // اليوم قبل الفجر → "الأخيرة" هي عشاء الأمس
    const curK = ni > 0 ? ev[ni - 1].k : (idx > 0 ? 'Isha' : null);
    const p = partsIn(tz, now), wd = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
    $('pg-prayer-sub').textContent = `${DAYS[wd]} ${AR(p.day)} ${MONTHS[p.month - 1]} ${AR(p.year)}` + (day.hijri ? ` — ${day.hijri}` : '');
    $('pg-prayer-city').textContent = '📍 ' + (P.city || 'موقعك');

    $('pg-times').innerHTML = EV.map((k, i) => {
      const isNext = i === ni, isPast = ev[i].t <= now && !isNext, isNow = k === curK && !isNext && k !== 'Sunrise';
      return `<div class="pg-time ${isNext ? 'next' : ''} ${isPast ? 'past' : ''} ${isNow ? 'now' : ''} ${k === 'Sunrise' ? 'minor' : ''}">
        ${isNext ? '<span class="pg-tag">التالية</span>' : isNow ? '<span class="pg-tag">الحالية</span>' : ''}
        <div class="i">${ICON[k]}</div><div class="n">${NAME[k]}</div><div class="t">${fmt(ev[i].t, tz)}</div></div>`;
    }).join('');

    const mid = METHODS[methodId()] || METHODS[3];
    $('pg-method-note').innerHTML = `طريقة الحساب: <b>${mid.n}</b> · ${P.school ? 'العصر على المذهب الحنفي' : 'العصر على مذهب الجمهور'} · ` +
      (P.mode === 'api' ? 'المصدر: Aladhan' : 'حساب فلكي محلي (وضع عدم الاتصال)') + `<br>المنطقة الزمنية: ${tz.replace('_', ' ')}`;
    $('pg-method-sel').value = P.method; $('pg-school-sel').value = P.school;

    // الأسبوع
    const rows = P.days.slice(idx, idx + 7).map((d, i) => {
      const dd = d.key.split('-').map(Number), w = new Date(Date.UTC(dd[0], dd[1] - 1, dd[2])).getUTCDay();
      return `<tr class="${i === 0 ? 'today' : ''}"><td>${i === 0 ? 'اليوم' : i === 1 ? 'غدًا' : DAYS[w]} ${AR(dd[2])}</td>` +
        EV.map(k => `<td>${fmt(d.ts[k], tz)}</td>`).join('') + '</tr>';
    });
    $('pg-week').innerHTML = `<table><thead><tr><th></th>${EV.map(k => `<th>${NAME[k]}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
    $('pg-prayer-body').style.display = 'block';

    clearInterval(P.timer); tick(ev, ni, tz);
    P.timer = setInterval(() => {
      if (!$('screen-prayer').classList.contains('active')) return;
      if (Date.now() >= ev[ni].t) { render(); return; }
      tick(ev, ni, tz);
    }, 1000);
  }
  function tick(ev, ni, tz) {
    const now = Date.now(), nx = ev[ni], prevT = ni > 0 ? ev[ni - 1].t : nx.t - 6 * 36e5;
    let diff = Math.max(0, Math.round((nx.t - now) / 1000));
    const h = Math.floor(diff / 3600), m = Math.floor(diff % 3600 / 60), s = diff % 60;
    const pad = n => String(n).padStart(2, '0'), frac = Math.min(1, Math.max(0, (now - prevT) / (nx.t - prevT)));
    const C = 2 * Math.PI * 54;
    $('pg-next').innerHTML = `
      <div class="pg-ring"><svg viewBox="0 0 128 128"><circle class="trk" cx="64" cy="64" r="54"/><circle class="bar" cx="64" cy="64" r="54" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg><div class="ico">${ICON[nx.k]}</div></div>
      <div class="pg-next-info"><div class="pg-next-label">${nx.k === 'Sunrise' ? 'الحدث القادم' : 'الصلاة القادمة'}</div>
        <div class="pg-next-name">${NAME[nx.k]}${nx.tomorrow ? ' (غدًا)' : ''}</div>
        <div class="pg-next-at">الساعة ${fmt(nx.t, tz)}</div>
        <div class="pg-countdown">${pad(h)}:${pad(m)}:${pad(s)}</div></div>`;
  }
  // إعادة الحساب عند عودة التبويب للواجهة
  document.addEventListener('visibilitychange', () => { if (!document.hidden && P.days && $('screen-prayer').classList.contains('active')) render(); });

  /* =================================================================
     2) AZKAR
     ================================================================= */
  const C_AZ = 2 * Math.PI * 30;
  const targetOf = it => parseInt(((it.n || '1').match(/\d+/) || ['1'])[0], 10);
  const progOf = type => ls.get(`azkar_prog_${type}`, {});
  window.autoAzkarType = () => (new Date().getHours() < 15 ? 'morning' : 'evening');

  function azHeaderUpdate(type) {
    const items = AZKAR[type] || [], pr = progOf(type);
    const done = items.filter((it, i) => (pr[i] || 0) >= targetOf(it)).length;
    $('pg-az-lbl').textContent = done === items.length && items.length ? '✅ أتممت جميع الأذكار' : `${AR(done)} / ${AR(items.length)} أذكار`;
    $('pg-az-bar').style.width = (items.length ? done / items.length * 100 : 0) + '%';
    const g = $('pg-az-done'); if (g) g.style.display = done === items.length && items.length ? 'block' : 'none';
  }
  window.renderAzkar = function (type) {
    type = type || 'morning'; state.azkarType = type;
    $('azkar-tab-morning').classList.toggle('active', type === 'morning');
    $('azkar-tab-evening').classList.toggle('active', type === 'evening');
    $('pg-az-sub').textContent = type === 'morning' ? 'من بعد صلاة الفجر حتى ارتفاع الشمس — وتجزئ إلى الزوال.' : 'من بعد صلاة العصر حتى غروب الشمس — وتجزئ إلى منتصف الليل.';
    const items = AZKAR[type] || [], pr = progOf(type);
    $('azkar-grid').innerHTML = items.map((it, i) => {
      const t = targetOf(it), c = Math.min(pr[i] || 0, t), done = c >= t;
      return `<article class="zk ${done ? 'done' : ''}" id="zk-${i}">
        <div class="zk-top"><span class="zk-idx">${AR(i + 1)}</span><span class="zk-rep">${it.n}</span></div>
        <div class="zk-text" onclick="azkarClick(${i},'${type}')">${it.text}</div>
        ${it.benefit ? `<div class="zk-benefit">💡 ${it.benefit}</div>` : ''}
        <div class="zk-foot">
          <div class="zk-side"><small id="zs-${i}">${done ? '✓ مكتمل' : 'اضغط للعدّ'}</small><button class="pg-btn sm" onclick="azkarReset(${i},'${type}')">↺ إعادة</button></div>
          <button class="zk-tap" onclick="azkarClick(${i},'${type}')" aria-label="عدّ">
            <svg viewBox="0 0 70 70"><circle class="trk" cx="35" cy="35" r="30"/><circle class="bar" id="zr-${i}" cx="35" cy="35" r="30" stroke-dasharray="${C_AZ}" stroke-dashoffset="${C_AZ * (1 - c / t)}"/></svg>
            <b id="zc-${i}">${AR(c)}</b>
          </button>
        </div></article>`;
    }).join('') + `<div class="pg-done-banner" id="pg-az-done" style="display:none">🌟 ما شاء الله، أتممت أذكار ${type === 'morning' ? 'الصباح' : 'المساء'} — تقبّل الله منك</div>`;
    azHeaderUpdate(type);
  };
  window.azkarClick = function (i, type) {
    const items = AZKAR[type] || [], t = targetOf(items[i]), pr = progOf(type);
    if ((pr[i] || 0) >= t) return;
    pr[i] = (pr[i] || 0) + 1; ls.set(`azkar_prog_${type}`, pr);
    $('zc-' + i).textContent = AR(pr[i]); $('zr-' + i).style.strokeDashoffset = C_AZ * (1 - pr[i] / t);
    if (navigator.vibrate) navigator.vibrate(12);
    if (pr[i] >= t) {
      const card = $('zk-' + i); card.classList.add('done'); $('zs-' + i).textContent = '✓ مكتمل';
      const nxt = items.findIndex((it, j) => j > i && (pr[j] || 0) < targetOf(it));
      if (nxt >= 0) setTimeout(() => $('zk-' + nxt).scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
    }
    azHeaderUpdate(type);
  };
  window.azkarReset = function (i, type) { const pr = progOf(type); delete pr[i]; ls.set(`azkar_prog_${type}`, pr); renderAzkar(type); };
  window.mshfAzkarResetAll = function () {
    ['morning', 'evening'].forEach(t => { try { localStorage.removeItem(`azkar_prog_${t}`); } catch (e) {} });
    renderAzkar(state.azkarType || 'morning'); if (typeof showToast === 'function') showToast('🔄 تم إعادة جميع الأذكار');
  };

  /* =================================================================
     3) QURANIC DUAS
     ================================================================= */
  const norm = s => (s || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
  const D = { fav: new Set(ls.get('quran_duas_fav', [])), onlyFav: false, q: '', ready: false };
  const favSave = () => ls.set('quran_duas_fav', [...D.fav]);

  function duasDraw() {
    const q = norm(D.q.trim());
    const list = QURAN_DUAS.map((d, i) => ({ d, i })).filter(({ d, i }) => (!D.onlyFav || D.fav.has(i)) && (!q || norm(d.text + ' ' + d.ref + ' ' + d.who).includes(q)));
    $('pg-du-count').textContent = `${AR(list.length)} دعاء`;
    $('quran-duas-grid').innerHTML = list.length ? list.map(({ d, i }) => `
      <article class="du"><div class="du-top">
        <span class="du-ref"><i>${AR(i + 1)}</i>${d.ref}</span>
        <div class="du-actions">
          <button class="${D.fav.has(i) ? 'on' : ''}" onclick="duaFav(${i})" aria-label="مفضلة">${D.fav.has(i) ? '★' : '☆'}</button>
          <button onclick="duaCopy(${i})" aria-label="نسخ">⧉</button>
          <button onclick="duaShare(${i})" aria-label="مشاركة">↗</button>
        </div></div>
        <div class="du-text">${d.text}</div><div class="du-who">🕊️ ${d.who}</div></article>`).join('')
      : `<div class="pg-state" style="grid-column:1/-1">${D.onlyFav ? 'لم تضف أي دعاء للمفضلة بعد ☆' : 'لا توجد نتائج مطابقة'}</div>`;
  }
  window.renderQuranDuas = function () { if (!D.ready) D.ready = true; duasDraw(); };
  window.duaSearch = v => { D.q = v; duasDraw(); };
  window.duaOnlyFav = el => { D.onlyFav = !D.onlyFav; el.classList.toggle('active', D.onlyFav); duasDraw(); };
  window.duaFav = i => { D.fav.has(i) ? D.fav.delete(i) : D.fav.add(i); favSave(); duasDraw(); };
  const duaStr = i => `${QURAN_DUAS[i].text}\n— ${QURAN_DUAS[i].ref}\n\nمنصة الحَسَنَيْن`;
  window.duaCopy = i => { (navigator.clipboard ? navigator.clipboard.writeText(duaStr(i)) : Promise.reject()).then(() => showToast('تم نسخ الدعاء ✓')).catch(() => showToast('تعذّر النسخ')); };
  window.duaShare = i => { if (navigator.share) navigator.share({ text: duaStr(i) }).catch(() => {}); else duaCopy(i); };

  /* =================================================================
     4) QIBLA
     ================================================================= */
  const KAABA = { lat: 21.4225, lng: 39.8262 };
  const Q = { lat: null, lng: null, acc: null, city: '', bearing: null, target: null, shown: null, on: false, raf: 0, aligned: false, gotAbs: false };
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI, mod360 = a => ((a % 360) + 360) % 360;
  const diff180 = a => ((a + 540) % 360) - 180; // أقصر فرق بين زاويتين
  const DIRS = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];

  function qBearing(lat, lng) {
    const p1 = rad(lat), p2 = rad(KAABA.lat), dl = rad(KAABA.lng - lng);
    return mod360(deg(Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl))));
  }
  function qDistance(lat, lng) {
    const p1 = rad(lat), p2 = rad(KAABA.lat), dp = p2 - p1, dl = rad(KAABA.lng - lng);
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  const qStatus = m => { const e = $('qb-status'); if (e) e.textContent = m || ''; };

  function buildDial() {
    let t = '';
    for (let i = 0; i < 72; i++) {
      const a = i * 5, major = a % 30 === 0, len = major ? 14 : 7;
      t += `<line x1="0" y1="-172" x2="0" y2="${-172 + len}" class="${major ? 'qb-tk-m' : 'qb-tk'}" transform="rotate(${a})"/>`;
    }
    $('qb-dial').innerHTML = `
      <svg viewBox="-200 -200 400 400" role="img" aria-label="بوصلة القبلة">
        <defs>
          <radialGradient id="qbBg" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="var(--bg-card)"/><stop offset="100%" stop-color="var(--bg-secondary)"/></radialGradient>
        </defs>
        <circle r="196" class="qb-ring" id="qb-ring"/>
        <circle r="186" fill="url(#qbBg)" stroke="var(--border)" stroke-width="1"/>
        <g id="qb-rot">
          ${t}
          <circle r="120" fill="none" stroke="var(--border)" stroke-dasharray="2 6"/>
          <g id="qb-labels"></g>
          <g id="qb-qibla">
            <line x1="0" y1="-18" x2="0" y2="-112" class="qb-needle"/>
            <circle cy="-136" r="25" class="qb-kb-bg"/>
            <text y="-135" class="qb-kb" text-anchor="middle" dominant-baseline="central">🕋</text>
          </g>
        </g>
        <path d="M0 -204 L11 -186 L-11 -186 Z" class="qb-ptr"/>
        <circle r="9" class="qb-hub"/><circle r="3.5" fill="var(--bg-primary)"/>
      </svg>`;
    const L = $('qb-labels');
    [['ش', 0], ['شر', 90], ['ج', 180], ['غ', 270]].forEach(([s, a]) => {
      const x = Math.sin(rad(a)) * 92, y = -Math.cos(rad(a)) * 92;
      const e = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('class', a === 0 ? 'qb-n' : 'qb-l');
      e.setAttribute('text-anchor', 'middle'); e.setAttribute('dominant-baseline', 'central'); e.dataset.a = a; e.textContent = s; L.appendChild(e);
    });
  }

  function qRender() {
    const rot = $('qb-rot'); if (!rot) return;
    const hd = Q.shown == null ? 0 : Q.shown;
    rot.setAttribute('transform', `rotate(${-hd})`);
    $('qb-labels').childNodes.forEach(e => e.setAttribute('transform', `rotate(${hd} ${e.getAttribute('x')} ${e.getAttribute('y')})`)); // نصوص مستقيمة
    const kb = $('qb-qibla');
    if (Q.bearing != null) { kb.setAttribute('transform', `rotate(${Q.bearing})`); kb.style.display = ''; } else kb.style.display = 'none';
    if (Q.bearing != null && Q.shown != null) {
      const d = diff180(Q.bearing - Q.shown), ad = Math.abs(d), ok = ad <= 3;
      $('qb-ring').classList.toggle('ok', ok);
      $('qb-turn').className = 'qb-turn' + (ok ? ' ok' : '');
      $('qb-turn').textContent = ok ? '✓ أنت تواجه القبلة' : `${d > 0 ? 'لف يمينًا ↻' : 'لف يسارًا ↺'} ${AR(Math.round(ad))}°`;
      if (ok && !Q.aligned && navigator.vibrate) navigator.vibrate([30, 40, 30]);
      Q.aligned = ok;
    }
    if (Q.shown != null) $('qb-head').textContent = `${AR(Math.round(Q.shown))}° ${DIRS[Math.round(Q.shown / 45) % 8]}`;
  }
  function qLoop() {
    if (!Q.on) return;
    if (Q.target != null) {
      if (Q.shown == null) Q.shown = Q.target;
      const d = diff180(Q.target - Q.shown);
      if (Math.abs(d) > 0.05) { Q.shown = mod360(Q.shown + d * 0.18); qRender(); }
    }
    Q.raf = requestAnimationFrame(qLoop);
  }

  function qUpdateInfo() {
    if (Q.lat == null) return;
    Q.bearing = qBearing(Q.lat, Q.lng);
    $('qb-angle').textContent = `${AR(Math.round(Q.bearing))}° ${DIRS[Math.round(Q.bearing / 45) % 8]}`;
    $('qb-dist').textContent = AR(Math.round(qDistance(Q.lat, Q.lng)).toLocaleString('en-US')) + ' كم';
    $('qb-acc').textContent = Q.acc ? `±${AR(Math.round(Q.acc))} م` : '—';
    $('qb-city').textContent = '📍 ' + (Q.city || 'موقعك الحالي');
    qRender();
  }
  function qSave() { ls.set('qibla_pos_v2', { lat: Q.lat, lng: Q.lng, city: Q.city }); }

  // ---- مستشعر الاتجاه ----
  function heading(e) {
    if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) return e.webkitCompassHeading; // iOS
    if (e.alpha == null) return null;
    if (e.type === 'deviceorientation' && !e.absolute && Q.gotAbs) return null;
    if (e.type === 'deviceorientationabsolute') Q.gotAbs = true;
    if (!e.absolute && e.type !== 'deviceorientationabsolute') return null; // قراءة نسبية غير صالحة للبوصلة
    let h;
    if (e.beta != null && e.gamma != null) { // تعويض ميل الهاتف
      const a = rad(e.alpha), b = rad(e.beta), g = rad(e.gamma);
      const rA = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
      const rB = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);
      h = deg(Math.atan(rA / rB)); if (rB < 0) h += 180; else if (rA < 0) h += 360;
    } else h = 360 - e.alpha;
    return h;
  }
  function onOrient(e) {
    let h = heading(e); if (h == null || isNaN(h)) return;
    const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    Q.target = mod360(h + ang);
    if (!Q.compass) { Q.compass = true; $('qb-compass-btn').textContent = '🧭 البوصلة تعمل ✓'; qStatus('حرّك الهاتف حتى يستقر السهم الذهبي أعلى القرص على الكعبة 🕋'); }
  }
  function startCompass() {
    stopCompass();
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
    setTimeout(() => { if (!Q.compass) qStatus('لم تصل قراءات من البوصلة. تأكد من وجود مستشعر واسمح للمتصفح بالوصول إليه، أو استخدم زاوية القبلة المعروضة.'); }, 2500);
  }
  function stopCompass() { window.removeEventListener('deviceorientationabsolute', onOrient, true); window.removeEventListener('deviceorientation', onOrient, true); }

  window.qiblaEnableCompass = async function () {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const p = await DeviceOrientationEvent.requestPermission();
        if (p !== 'granted') { qStatus('لم يتم السماح باستخدام البوصلة. فعّل الإذن من إعدادات المتصفح.'); return; }
      }
      Q.compass = false; startCompass(); qStatus('جارٍ قراءة البوصلة...');
    } catch (e) { qStatus('تعذّر تفعيل البوصلة على هذا الجهاز.'); }
  };
  window.qiblaRequestLocation = function () {
    if (!navigator.geolocation) { qStatus('المتصفح لا يدعم تحديد الموقع.'); return; }
    qStatus('جارٍ تحديد موقعك بدقة...');
    navigator.geolocation.getCurrentPosition(async pos => {
      Q.lat = pos.coords.latitude; Q.lng = pos.coords.longitude; Q.acc = pos.coords.accuracy; Q.city = '';
      qUpdateInfo(); qSave(); qStatus('تم تحديد الموقع ✓');
      const g = await reverse(Q.lat, Q.lng); Q.city = g.city; qUpdateInfo(); qSave();
      if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') startCompass();
      else qStatus('تم تحديد الموقع ✓ — اضغط «تفعيل البوصلة» للسماح بالوصول للمستشعر.');
    }, err => qStatus(err.code === 1 ? 'تم رفض إذن الموقع. فعّله من إعدادات المتصفح أو ابحث عن مدينتك.' : 'تعذّر تحديد الموقع، جرّب مرة أخرى أو ابحث عن مدينتك.'),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  };
  window.qiblaCity = async function () {
    const q = $('qb-city-q').value.trim(); if (!q) return;
    qStatus('جارٍ البحث...');
    try { const c = await searchCity(q); if (!c) { qStatus('لم يتم العثور على المدينة.'); return; }
      Object.assign(Q, { lat: c.lat, lng: c.lng, city: c.city, acc: null }); qUpdateInfo(); qSave(); qStatus('تم ضبط الموقع على ' + c.city + ' ✓'); }
    catch (e) { qStatus('تعذّر البحث، تحقّق من الاتصال.'); }
  };
  window.initQibla = function () {
    if (!$('qb-dial').firstChild) buildDial();
    if (Q.lat == null) {
      const s = ls.get('qibla_pos_v2', null) || ls.get('pg_prayer_v2', null);
      if (s && s.lat != null) { Q.lat = s.lat; Q.lng = s.lng; Q.city = s.city || ''; }
    }
    Q.on = true; cancelAnimationFrame(Q.raf); qUpdateInfo(); qLoop();
    if (Q.lat != null) {
      qStatus('تم استخدام آخر موقع محفوظ. اضغط «تحديد موقعي» لتحديث دقيق.');
      if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') startCompass();
    }
  };
  window.stopQibla = function () { if (!Q.on) return; Q.on = false; cancelAnimationFrame(Q.raf); stopCompass(); Q.compass = false; Q.target = null; Q.shown = null; };
})();
