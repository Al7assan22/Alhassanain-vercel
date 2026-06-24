/* ==========================================================
   MEMORIZE FEATURE — منصة الحَسَنَيْن
   Standalone module. Reuses existing globals from script.js:
   - allSurahs, fetchSurahs, fetchSurahVerses
   - getAudioUrls (per-ayah audio via everyayah / cdn fallback)
   - RECITER_NAMES
   - state, saveStats, updateHomeLabels, showToast, toArabicDigits
   ========================================================== */

(function () {
  'use strict';

  // ---------- Persistent state ----------
  const STORAGE_KEY = 'quran_memorize_v1';
  const defaultMemo = {
    // { [surahNum]: { name, total, memorized: [verseNumbers] } }
    surahs: {},
    sessionsCount: 0,
    lastConfig: { surah: 1, from: 1, to: 7, reciter: 'minshawi', repeats: 5, sessionMin: 15 },
  };
  function loadMemo() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultMemo));
      const parsed = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(defaultMemo)), parsed);
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultMemo));
    }
  }
  function saveMemo() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(MEMO)); } catch (e) {}
    // Sync to Firebase if user is logged in
    if (typeof window.saveUserDataToFirebase === 'function') {
      window.saveUserDataToFirebase(STORAGE_KEY, MEMO);
    }
    syncToGlobalStats();
  }
  let MEMO = loadMemo();

  // expose for debug
  window.__MEMO__ = () => MEMO;

  // Called by refreshStatsUI (auth.js) after Firebase loads user data into localStorage
  window.__reloadMEMO__ = function() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        MEMO = Object.assign(JSON.parse(JSON.stringify(defaultMemo)), parsed);
      } else {
        MEMO = JSON.parse(JSON.stringify(defaultMemo));
      }
    } catch(e) {}
    syncToGlobalStats();
  };

  // Called by refreshStatsUI to update memorize stats in home screen
  window.__syncMemoStats__ = function() {
    syncToGlobalStats();
  };

  // ---------- Sync with home dashboard ----------
  function totalMemorized() {
    let n = 0;
    Object.values(MEMO.surahs || {}).forEach(s => { n += (s.memorized || []).length; });
    return n;
  }
  function totalKhatmaPct() {
    // total verses in Quran ≈ 6236
    return Math.min(100, (totalMemorized() / 6236) * 100);
  }
  function syncToGlobalStats() {
    try {
      // Use a more reliable login check: firebase currentUser OR a flag set by auth.js
      const isLoggedIn = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)
        || (window.__userLoggedIn__ === true)
        || (localStorage.getItem('quran_memorize_v1') !== null && MEMO.sessionsCount > 0);
      if (typeof state !== 'undefined' && state && state.stats) {
        state.stats.memorized = totalMemorized();
        state.stats.sessionsCount = MEMO.sessionsCount || 0;
        if (typeof saveStats === 'function') saveStats();
      }
      // Home screen cards
      const smh = document.getElementById('stat-memorized-home');
      if (smh) smh.textContent = isLoggedIn ? String(totalMemorized()) : '0';
      // Memorize screen stats (always English digits for readability)
      const a = document.getElementById('memo-stat-verses');
      if (a) a.textContent = isLoggedIn ? String(totalMemorized()) : '0';
      const b = document.getElementById('memo-stat-surahs');
      if (b) b.textContent = isLoggedIn ? String(Object.values(MEMO.surahs).filter(s => s.memorized.length >= s.total && s.total > 0).length) : '0';
      const c = document.getElementById('memo-stat-sessions');
      if (c) c.textContent = isLoggedIn ? String(MEMO.sessionsCount || 0) : '0';

      if (typeof updateHomeLabels === 'function') updateHomeLabels();
    } catch (e) {}
  }

  function toAr(n) {
    if (typeof toArabicDigits === 'function') return toArabicDigits(n);
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  }
  function formatMS(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // ---------- Safe API wrappers ----------
  async function ensureSurahs() {
    try {
      if (typeof allSurahs !== 'undefined' && allSurahs && allSurahs.length) return allSurahs;
      if (typeof fetchSurahs === 'function') {
        const list = await fetchSurahs();
        return list || [];
      }
    } catch (e) {}
    // fallback minimal fetch
    try {
      const r = await fetch('https://api.alquran.cloud/v1/surah');
      const j = await r.json();
      return (j.data || []).map(s => ({
        number: s.number,
        name_arabic: s.name,
        name: s.name,
        englishName: s.englishName,
        numberOfAyahs: s.numberOfAyahs,
        revelationType: s.revelationType
      }));
    } catch (e) { return []; }
  }
  async function fetchSurahVersesSafe(num) {
    try {
      if (typeof fetchSurahVerses === 'function') {
        const v = await fetchSurahVerses(num);
        if (v && v.length) return v;
      }
    } catch (e) {}
    try {
      const r = await fetch(`https://api.alquran.cloud/v1/surah/${num}`);
      const j = await r.json();
      const data = j.data;
      return (data.ayahs || []).map(a => ({
        numberInSurah: a.numberInSurah,
        text: a.text
      }));
    } catch (e) { return []; }
  }
  function getVerseAudioUrls(surah, verse) {
    // Use the global getAudioUrls with the memorize reciter selection
    if (typeof getAudioUrls === 'function') {
      try {
        // Temporarily set state.currentReciter to the memorize reciter
        const prev = typeof state !== 'undefined' ? state.currentReciter : null;
        if (typeof state !== 'undefined') state.currentReciter = M.reciter || 'minshawi';
        const urls = getAudioUrls(surah, verse);
        if (typeof state !== 'undefined') state.currentReciter = prev;
        return urls;
      } catch (e) {}
    }
    // Fallback: build URLs directly from EVERYAYAH_FOLDERS if available
    const s = String(surah).padStart(3, '0');
    const v = String(verse).padStart(3, '0');
    const reciter = M.reciter || 'minshawi';
    const urls = [];
    if (typeof EVERYAYAH_FOLDERS !== 'undefined' && EVERYAYAH_FOLDERS[reciter]) {
      EVERYAYAH_FOLDERS[reciter].forEach(folder => {
        urls.push(`https://everyayah.com/data/${folder}/${s}${v}.mp3`);
      });
    }
    if (typeof CDN_RECITER !== 'undefined') {
      const cdnId = CDN_RECITER[reciter] || 'ar.minshawi';
      if (typeof calculateVerseGlobal === 'function') {
        const globalNum = calculateVerseGlobal(surah, verse);
        urls.push(`https://cdn.islamic.network/quran/audio/128/${cdnId}/${globalNum}.mp3`);
      }
    }
    // Last-resort hardcoded fallbacks
    if (urls.length === 0) {
      urls.push(`https://everyayah.com/data/Minshawy_Murattal_128kbps/${s}${v}.mp3`);
      urls.push(`https://everyayah.com/data/Husary_128kbps/${s}${v}.mp3`);
      urls.push(`https://everyayah.com/data/Alafasy_128kbps/${s}${v}.mp3`);
    }
    return urls;
  }

  // ---------- Working state ----------
  const M = {
    surahsList: [],
    currentSurah: null,    // surah meta
    verses: [],            // [{numberInSurah,text}]
    fromV: 1,
    toV: 1,
    cursor: 0,             // index in verses subset
    repeats: 5,
    repeatLeft: 0,
    autoRepeat: false,
    playing: false,
    hidden: false,
    testMode: false,
    reciter: 'minshawi',
    // session
    sessionMin: 15,
    sessionTotal: 0,       // seconds
    sessionElapsed: 0,
    sessionTimer: null,
    sessionActive: false,
    // audio
    audio: null,
  };

  // Dedicated audio element (we don't fight the global player)
  function ensureAudio() {
    if (M.audio) return M.audio;
    const a = new Audio();
    a.preload = 'auto';
    a.addEventListener('ended', onAyahEnded);
    a.addEventListener('error', onAudioError);
    M.audio = a;
    return a;
  }

  // ---------- Rendering ----------
  function $(id) { return document.getElementById(id); }

  async function buildSurahSelect() {
    const sel = $('memo-surah-select');
    if (!sel) return;
    if (sel.dataset.built === '1') return;
    M.surahsList = await ensureSurahs();
    if (!M.surahsList.length) {
      sel.innerHTML = '<option value="">— تعذر تحميل السور —</option>';
      return;
    }
    sel.innerHTML = M.surahsList.map(s =>
      `<option value="${s.number}">${toAr(s.number)}. ${s.name_arabic || s.name}</option>`
    ).join('');
    sel.dataset.built = '1';
    // restore last
    sel.value = String(MEMO.lastConfig.surah || 1);
    onSurahChange();
  }

  function buildReciterChips() {
    const wrap = $('memo-reciter-chips');
    if (!wrap || wrap.dataset.built === '1') return;
    const order = ['minshawi', 'husary', 'abdulbasit', 'alafasy', 'dossari'];
    const names = (typeof RECITER_NAMES !== 'undefined') ? RECITER_NAMES : {
      minshawi: 'المنشاوي', husary: 'الحصري', abdulbasit: 'عبد الباسط',
      alafasy: 'العفاسي', dossari: 'الدوسري'
    };
    wrap.innerHTML = order.map(k =>
      `<button class="memo-reciter-chip${k === M.reciter ? ' active' : ''}" data-r="${k}" type="button">${names[k] || k}</button>`
    ).join('');
    wrap.querySelectorAll('.memo-reciter-chip').forEach(b => {
      b.addEventListener('click', () => {
        M.reciter = b.dataset.r;
        MEMO.lastConfig.reciter = M.reciter;
        saveMemo();
        wrap.querySelectorAll('.memo-reciter-chip').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        // If currently playing, restart with new reciter
        if (M.playing && M.audio) {
          M.audio.pause();
          M.playing = false;
          playCurrent();
        }
      });
    });
    wrap.dataset.built = '1';
  }

  function onSurahChange() {
    const sel = $('memo-surah-select');
    if (!sel) return;
    const num = parseInt(sel.value, 10);
    const meta = M.surahsList.find(s => s.number === num);
    if (!meta) return;
    const fromI = $('memo-from'); const toI = $('memo-to');
    if (fromI) { fromI.min = 1; fromI.max = meta.numberOfAyahs; fromI.value = 1; }
    if (toI)   { toI.min = 1;   toI.max = meta.numberOfAyahs;   toI.value = Math.min(7, meta.numberOfAyahs); }
    // restore if same surah as last config
    if (num === MEMO.lastConfig.surah) {
      if (fromI) fromI.value = MEMO.lastConfig.from || 1;
      if (toI)   toI.value   = MEMO.lastConfig.to   || Math.min(7, meta.numberOfAyahs);
    }
  }

  // ---------- Load passage ----------
  async function loadPassage() {
    const sel = $('memo-surah-select');
    const fromI = $('memo-from'); const toI = $('memo-to');
    const repI  = $('memo-repeats');
    const sessI = $('memo-session-min');
    const num = parseInt(sel.value, 10);
    let from = parseInt(fromI.value, 10);
    let to   = parseInt(toI.value, 10);
    const meta = M.surahsList.find(s => s.number === num);
    if (!meta) { showToast && showToast('اختر سورة أولاً'); return; }
    if (isNaN(from) || from < 1) from = 1;
    if (isNaN(to)   || to > meta.numberOfAyahs) to = meta.numberOfAyahs;
    if (from > to) { const t = from; from = to; to = t; }

    M.repeats = Math.max(1, Math.min(50, parseInt(repI.value, 10) || 5));
    M.sessionMin = Math.max(1, Math.min(120, parseInt(sessI.value, 10) || 15));

    MEMO.lastConfig = { surah: num, from, to, reciter: M.reciter, repeats: M.repeats, sessionMin: M.sessionMin };
    saveMemo();

    const btn = $('memo-load-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border:2px solid #1a1209;border-top-color:transparent;border-radius:50%;display:inline-block;animation:memo-spin 0.7s linear infinite"></span> جارٍ التحميل...'; }

    try {
      const all = await fetchSurahVersesSafe(num);
      if (!all.length) throw new Error('no verses');
      const subset = all.filter(v => v.numberInSurah >= from && v.numberInSurah <= to);
      M.currentSurah = meta;
      M.verses = subset;
      M.fromV = from; M.toV = to;
      M.cursor = 0;
      M.repeatLeft = M.repeats;
      ensureSurah(num, meta.name_arabic || meta.name, meta.numberOfAyahs);
      renderVerses();
      renderProgress();
      $('memo-workspace').classList.add('visible');
      const info = $('memo-current-info');
      if (info) info.innerHTML = `<strong>${meta.name_arabic || meta.name}</strong> • الآيات ${toAr(from)} – ${toAr(to)}`;
      // scroll into view
      $('memo-workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      showToast && showToast('تعذّر تحميل الآيات، حاول مجدداً');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '🚀 ابدأ الحفظ'; }
    }
  }

  function ensureSurah(num, name, total) {
    if (!MEMO.surahs[num]) {
      MEMO.surahs[num] = { name, total, memorized: [] };
    } else {
      MEMO.surahs[num].name = name;
      MEMO.surahs[num].total = total;
    }
    saveMemo();
  }

  // ---------- Render verses ----------
  function renderVerses() {
    const wrap = $('memo-verses');
    if (!wrap) return;
    wrap.classList.toggle('hidden-mode', M.hidden);
    if (!M.verses.length) { wrap.innerHTML = '<div class="memo-loading">— لا توجد آيات —</div>'; return; }
    wrap.innerHTML = M.verses.map((v, i) => {
      const text = M.testMode ? renderTestText(v.text) : v.text;
      const cls = (i === M.cursor) ? 'memo-verse current' : 'memo-verse';
      return `<span class="${cls}" data-i="${i}">
        <span class="memo-verse-text">${text}</span>
        <span class="memo-verse-num">${toAr(v.numberInSurah)}</span>
      </span>`;
    }).join(' ');
    wrap.querySelectorAll('.memo-verse').forEach(el => {
      el.addEventListener('click', () => {
        M.cursor = parseInt(el.dataset.i, 10);
        M.repeatLeft = M.repeats;
        if (M.playing) playCurrent();
        else renderVerses();
      });
    });
    // test-mode click handlers
    if (M.testMode) {
      wrap.querySelectorAll('.memo-blank').forEach(b => {
        b.addEventListener('click', () => b.classList.toggle('revealed'));
      });
    }
  }

  function renderTestText(text) {
    // hide ~50% of words, leaving first letter as a hint
    const words = text.split(/\s+/);
    return words.map((w, i) => {
      // keep punctuation-ish small tokens visible
      if (w.length < 2) return w;
      // hide every other meaningful word (deterministic)
      if (i % 2 === 1) {
        const first = w.charAt(0);
        const rest  = w.slice(1).replace(/\S/g, '·');
        return `<span class="memo-blank" title="اضغط للكشف">${first}<span class="memo-hint">${rest}</span></span>`;
      }
      return w;
    }).join(' ');
  }

  // ---------- Audio playback ----------
  function playCurrent() {
    const v = M.verses[M.cursor];
    if (!v || !M.currentSurah) return;
    const a = ensureAudio();
    const urls = getVerseAudioUrls(M.currentSurah.number, v.numberInSurah);
    M._urlIdx = 0; M._urls = urls;
    a.src = urls[0];
    a.play().then(() => {
      M.playing = true;
      updatePlayBtn();
      renderVerses();
    }).catch(() => {
      tryNextUrl();
    });
  }
  function tryNextUrl() {
    M._urlIdx = (M._urlIdx || 0) + 1;
    if (!M._urls || M._urlIdx >= M._urls.length) {
      M.playing = false; updatePlayBtn();
      showToast && showToast('تعذّر تشغيل الآية');
      return;
    }
    const a = ensureAudio();
    a.src = M._urls[M._urlIdx];
    a.play().catch(tryNextUrl);
  }
  function onAudioError() { tryNextUrl(); }

  function onAyahEnded() {
    // repeat logic
    if (M.repeatLeft > 1) {
      M.repeatLeft--;
      const a = ensureAudio();
      a.currentTime = 0;
      a.play().catch(() => {});
      return;
    }
    if (M.autoRepeat) {
      M.repeatLeft = M.repeats;
      const a = ensureAudio();
      a.currentTime = 0;
      a.play().catch(() => {});
      return;
    }
    // advance to next verse
    if (M.cursor < M.verses.length - 1) {
      M.cursor++;
      M.repeatLeft = M.repeats;
      playCurrent();
    } else {
      M.playing = false;
      updatePlayBtn();
      renderVerses();
      showToast && showToast('🎉 انتهت الجلسة');
    }
  }

  function togglePlay() {
    if (!M.verses.length) { showToast && showToast('حمّل آيات أولاً'); return; }
    const a = ensureAudio();
    if (M.playing && !a.paused) {
      a.pause();
      M.playing = false; updatePlayBtn();
      return;
    }
    if (a.src && a.paused && a.currentTime > 0) {
      a.play().then(() => { M.playing = true; updatePlayBtn(); }).catch(() => {});
      return;
    }
    M.repeatLeft = M.repeats;
    playCurrent();
  }
  function nextVerse() {
    if (!M.verses.length) return;
    if (M.cursor < M.verses.length - 1) M.cursor++;
    else M.cursor = 0;
    M.repeatLeft = M.repeats;
    if (M.playing) playCurrent();
    else renderVerses();
  }
  function prevVerse() {
    if (!M.verses.length) return;
    if (M.cursor > 0) M.cursor--;
    else M.cursor = M.verses.length - 1;
    M.repeatLeft = M.repeats;
    if (M.playing) playCurrent();
    else renderVerses();
  }
  function updatePlayBtn() {
    const b = $('memo-play-btn');
    if (!b) return;
    b.innerHTML = M.playing
      ? '⏸ إيقاف'
      : '▶ تشغيل التلاوة';
    b.classList.toggle('active', M.playing);
  }

  function toggleHidden() {
    M.hidden = !M.hidden;
    if (M.hidden) M.testMode = false;
    renderVerses();
    const b = $('memo-hide-btn');
    if (b) { b.classList.toggle('active', M.hidden); b.innerHTML = M.hidden ? '👁 إظهار النص' : '🙈 إخفاء النص'; }
    const t = $('memo-test-btn');
    if (t) t.classList.remove('active');
  }
  function toggleTest() {
    M.testMode = !M.testMode;
    if (M.testMode) M.hidden = false;
    renderVerses();
    const b = $('memo-test-btn');
    if (b) { b.classList.toggle('active', M.testMode); b.innerHTML = M.testMode ? '✅ خروج من الاختبار' : '🧠 وضع الاختبار'; }
    const h = $('memo-hide-btn');
    if (h) h.classList.remove('active');
  }
  function toggleAutoRepeat() {
    M.autoRepeat = !M.autoRepeat;
    const b = $('memo-auto-btn');
    if (b) { b.classList.toggle('active', M.autoRepeat); b.innerHTML = M.autoRepeat ? '🔁 إيقاف التكرار التلقائي' : '🔁 تكرار تلقائي'; }
    showToast && showToast(M.autoRepeat ? 'تم تفعيل التكرار التلقائي' : 'تم إيقاف التكرار التلقائي');
  }

  // ---------- Mark memorized ----------
  function markCurrentMemorized() {
    if (!M.currentSurah) return;
    const v = M.verses[M.cursor];
    if (!v) return;
    const rec = MEMO.surahs[M.currentSurah.number];
    if (!rec.memorized.includes(v.numberInSurah)) {
      rec.memorized.push(v.numberInSurah);
      saveMemo();
      showToast && showToast(`✅ تم حفظ الآية ${toAr(v.numberInSurah)}`);
    } else {
      showToast && showToast('الآية محفوظة بالفعل');
    }
    renderProgress();
  }
  function markAllMemorized() {
    if (!M.currentSurah) return;
    const rec = MEMO.surahs[M.currentSurah.number];
    let added = 0;
    M.verses.forEach(v => {
      if (!rec.memorized.includes(v.numberInSurah)) {
        rec.memorized.push(v.numberInSurah); added++;
      }
    });
    saveMemo();
    showToast && showToast(added ? `✅ تم حفظ ${toAr(added)} آية` : 'كلها محفوظة بالفعل');
    renderProgress();
  }
  function unmarkCurrent() {
    if (!M.currentSurah) return;
    const v = M.verses[M.cursor];
    const rec = MEMO.surahs[M.currentSurah.number];
    rec.memorized = rec.memorized.filter(n => n !== v.numberInSurah);
    saveMemo();
    showToast && showToast('تم إلغاء الحفظ');
    renderProgress();
  }

  // ---------- Progress rendering ----------
  function renderProgress() {
    // current passage progress
    if (M.currentSurah) {
      const rec = MEMO.surahs[M.currentSurah.number];
      const memSet = new Set(rec.memorized);
      const inRange = M.verses.filter(v => memSet.has(v.numberInSurah)).length;
      const pct = M.verses.length ? (inRange / M.verses.length) * 100 : 0;
      const lbl = $('memo-progress-label-text');
      if (lbl) lbl.textContent = `${toAr(inRange)} / ${toAr(M.verses.length)} آية`;
      const fill = $('memo-progress-fill');
      if (fill) fill.style.width = pct.toFixed(1) + '%';
      const pctEl = $('memo-progress-pct');
      if (pctEl) pctEl.textContent = pct.toFixed(0) + '%';
    }

    // overall stats
    const list = Object.entries(MEMO.surahs)
      .map(([num, s]) => ({ num: parseInt(num, 10), ...s }))
      .filter(s => s.memorized && s.memorized.length)
      .sort((a, b) => (b.memorized.length / b.total) - (a.memorized.length / a.total));

    const wrap = $('memo-surah-list');
    if (wrap) {
      if (!list.length) {
        wrap.innerHTML = '<div class="memo-empty-progress">📖 لم تبدأ الحفظ بعد. اختر سورة من الأعلى للبداية.</div>';
      } else {
        wrap.innerHTML = list.map(s => {
          const pct = (s.memorized.length / s.total) * 100;
          return `<div class="memo-surah-row" data-num="${s.num}">
            <div class="ms-num-mini">${toAr(s.num)}</div>
            <div class="ms-info">
              <div class="ms-name">${s.name}</div>
              <div class="ms-mini-bar"><div class="ms-mini-fill" style="width:${pct.toFixed(1)}%"></div></div>
            </div>
            <div class="ms-pct">${pct.toFixed(0)}%</div>
          </div>`;
        }).join('');
        wrap.querySelectorAll('.memo-surah-row').forEach(r => {
          r.addEventListener('click', () => {
            const sel = $('memo-surah-select');
            if (sel) { sel.value = r.dataset.num; onSurahChange(); }
            $('memo-surah-select')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }
    }

    syncToGlobalStats();
  }

  // ---------- Session timer ----------
  function startSession() {
    if (M.sessionActive) return;
    M.sessionTotal = M.sessionMin * 60;
    M.sessionElapsed = 0;
    M.sessionActive = true;
    MEMO.sessionsCount = (MEMO.sessionsCount || 0) + 1;
    saveMemo();
    updateTimerUI();
    M.sessionTimer = setInterval(() => {
      M.sessionElapsed++;
      if (M.sessionElapsed % 5 === 0) saveMemo();
      updateTimerUI();
      if (M.sessionElapsed >= M.sessionTotal) {
        stopSession(true);
      }
    }, 1000);
    showToast && showToast(`⏳ بدأت جلسة ${toAr(M.sessionMin)} دقيقة`);
    renderProgress();
  }
  function stopSession(finished) {
    if (!M.sessionActive) return;
    clearInterval(M.sessionTimer);
    M.sessionTimer = null;
    M.sessionActive = false;
    saveMemo();
    updateTimerUI();
    if (finished) showToast && showToast('🎉 انتهت الجلسة! بارك الله فيك');
    else showToast && showToast('تم إيقاف الجلسة');
    renderProgress();
  }
  function updateTimerUI() {
    const disp = $('memo-timer-display');
    if (disp) {
      const remain = Math.max(0, M.sessionTotal - M.sessionElapsed);
      disp.textContent = formatMS(M.sessionActive ? remain : (M.sessionMin * 60));
    }
    const sub = $('memo-timer-sub');
    if (sub) sub.textContent = M.sessionActive ? `جلسة نشطة • ${toAr(Math.floor(M.sessionElapsed/60))} دقيقة منقضية` : 'جلسة غير نشطة';
    const sBtn = $('memo-session-start');
    const eBtn = $('memo-session-stop');
    if (sBtn) sBtn.style.display = M.sessionActive ? 'none' : 'inline-flex';
    if (eBtn) eBtn.style.display = M.sessionActive ? 'inline-flex' : 'none';
  }

  // ---------- Init ----------
  async function initMemorize() {
    // restore last config into form
    M.reciter   = MEMO.lastConfig.reciter   || 'minshawi';
    M.repeats   = MEMO.lastConfig.repeats   || 5;
    M.sessionMin= MEMO.lastConfig.sessionMin|| 15;
    const repI  = $('memo-repeats');   if (repI)  repI.value  = M.repeats;
    const sessI = $('memo-session-min'); if (sessI) sessI.value = M.sessionMin;
    buildReciterChips();
    await buildSurahSelect();
    updateTimerUI();
    renderProgress();
    // bind once
    if (!initMemorize._bound) {
      $('memo-surah-select')?.addEventListener('change', onSurahChange);
      $('memo-load-btn')?.addEventListener('click', loadPassage);
      $('memo-play-btn')?.addEventListener('click', togglePlay);
      $('memo-prev-btn')?.addEventListener('click', prevVerse);
      $('memo-next-btn')?.addEventListener('click', nextVerse);
      $('memo-hide-btn')?.addEventListener('click', toggleHidden);
      $('memo-test-btn')?.addEventListener('click', toggleTest);
      $('memo-auto-btn')?.addEventListener('click', toggleAutoRepeat);
      $('memo-mark-one')?.addEventListener('click', markCurrentMemorized);
      $('memo-mark-all')?.addEventListener('click', markAllMemorized);
      $('memo-unmark')?.addEventListener('click', unmarkCurrent);
      $('memo-session-start')?.addEventListener('click', startSession);
      $('memo-session-stop')?.addEventListener('click', () => stopSession(false));
      initMemorize._bound = true;
    }
  }

  // Hook into showScreen
  function hookShowScreen() {
    const _orig = window.showScreen;
    window.showScreen = function (name) {
      if (typeof _orig === 'function') _orig(name);
      if (name === 'memorize') { initMemorize(); syncToGlobalStats(); }
    };
  }

  // Init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { hookShowScreen(); syncToGlobalStats(); });
  } else {
    hookShowScreen();
    syncToGlobalStats();
  }

  // Expose for inline onclick fallback
  window.memorize = {
    init: initMemorize,
    open: () => window.showScreen && window.showScreen('memorize'),
    sync: syncToGlobalStats,
  };
})();
