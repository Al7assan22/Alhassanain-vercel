/* ===================== NEW FEATURES =====================
 * 1) PWA install + Service Worker registration
 * 2) Hijri date display
 * 3) Qibla compass (Device Orientation)
 * 4) Share verse as image (Canvas → image)
 * 5) Media Session API integration for background audio
 * ======================================================= */

(function(){
  'use strict';

  /* ---------- Mini Toast ---------- */
  window.miniToast = function(msg, ms){
    var t = document.createElement('div');
    t.className = 'mini-toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(()=>t.classList.add('show'));
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(), 400); }, ms||2200);
  };

  /* ===================== 1) PWA ===================== */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    });
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallToast();
  });

  function showInstallToast(){
    if (document.getElementById('pwa-install-toast')) return;
    if (localStorage.getItem('pwa-install-dismissed')) return;
    const el = document.createElement('div');
    el.id = 'pwa-install-toast';
    el.className = 'pwa-install-toast';
    el.innerHTML = `
      <span>📲 ثبّت تطبيق الحَسَنَيْن على جهازك</span>
      <button class="pi-yes">تثبيت</button>
      <button class="pi-no">لاحقاً</button>`;
    document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));
    el.querySelector('.pi-yes').onclick = async () => {
      if (deferredPrompt){
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      }
      el.classList.remove('show'); setTimeout(()=>el.remove(),400);
    };
    el.querySelector('.pi-no').onclick = () => {
      localStorage.setItem('pwa-install-dismissed','1');
      el.classList.remove('show'); setTimeout(()=>el.remove(),400);
    };
  }

  /* ===================== 2) Hijri Date ===================== */
  // Arithmetic fallback (Kuwaiti algorithm) — only used if the browser lacks
  // built-in Umm al-Qura support. This algorithm drifts 1-3 days from the
  // official Umm al-Qura calendar, so it's a last resort, not the default.
  function toHijriFallback(date){
    const jd = Math.floor((date.getTime()/86400000) + 2440587.5);
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631*n + 354;
    const j = (Math.floor((10985 - l2)/5316))*(Math.floor((50*l2)/17719)) + (Math.floor(l2/5670))*(Math.floor((43*l2)/15238));
    const l3 = l2 - (Math.floor((30-j)/15))*(Math.floor((17719*j)/50)) - (Math.floor(j/16))*(Math.floor((15238*j)/43)) + 29;
    const m = Math.floor((24*l3)/709);
    const d = l3 - Math.floor((709*m)/24);
    const y = 30*n + j - 30;
    return { y, m, d };
  }
  const HIJRI_MONTHS = ['محرّم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوّال','ذو القعدة','ذو الحجة'];
  const AR_DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

  // Uses the browser's built-in Umm al-Qura calendar (ICU), which matches the
  // official Saudi calendar far more closely than a fixed arithmetic formula.
  function toHijriAccurate(date){
    try{
      const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day:'numeric', month:'numeric', year:'numeric'
      }).formatToParts(date);
      const get = (t) => Number(parts.find(p => p.type === t)?.value);
      const y = get('year'), m = get('month'), d = get('day');
      if (!y || !m || !d) return null;
      return { y, m, d };
    }catch(e){ return null; }
  }

  window.formatHijriToday = function(){
    const now = new Date();
    const h = toHijriAccurate(now) || toHijriFallback(now);
    const day = AR_DAYS[now.getDay()];
    const greg = now.toLocaleDateString('ar-EG',{ day:'numeric', month:'long', year:'numeric' });
    return { text: `${day} ${h.d} ${HIJRI_MONTHS[h.m-1]} ${h.y} هـ`, greg };
  };

  function mountHijriPill(){
    const home = document.getElementById('screen-home');
    if (!home || document.getElementById('hijri-pill-mount')) return;
    const info = formatHijriToday();
    const wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    wrap.innerHTML = `<div id="hijri-pill-mount" class="hijri-pill"><span class="hp-ico">🌙</span><span>${info.text}</span><span class="hp-greg">— ${info.greg}</span></div>`;
    // Insert near the top of home screen
    const firstChild = home.firstElementChild;
    home.insertBefore(wrap, firstChild?.nextSibling || null);
  }

  /* ===================== 3) Qibla Compass ===================== */
  const KAABA = { lat: 21.4225, lng: 39.8262 };
  let userPos = null;
  let qiblaBearing = null;
  let currentHeading = 0;

  function toRad(d){return d*Math.PI/180}
  function toDeg(r){return r*180/Math.PI}

  function bearingToQibla(lat, lng){
    const φ1 = toRad(lat), φ2 = toRad(KAABA.lat);
    const Δλ = toRad(KAABA.lng - lng);
    const y = Math.sin(Δλ)*Math.cos(φ2);
    const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
    let θ = toDeg(Math.atan2(y,x));
    return (θ + 360) % 360;
  }

  function updateQiblaUI(){
    const rose = document.getElementById('qibla-rose');
    const angle = document.getElementById('qibla-angle');
    const dist = document.getElementById('qibla-dist');
    if (!rose || qiblaBearing == null) return;
    const rot = qiblaBearing - currentHeading;
    rose.style.transform = `rotate(${rot}deg)`;
    if (angle) angle.textContent = Math.round(qiblaBearing) + '°';
    if (userPos && dist){
      const R = 6371;
      const φ1 = toRad(userPos.lat), φ2 = toRad(KAABA.lat);
      const Δφ = toRad(KAABA.lat - userPos.lat);
      const Δλ = toRad(KAABA.lng - userPos.lng);
      const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
      const d = 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      dist.textContent = Math.round(d).toLocaleString('ar-EG') + ' كم';
    }
  }

  function setQiblaStatus(msg){
    const el = document.getElementById('qibla-status');
    if (el) el.textContent = msg || '';
  }

  function handleOrientation(e){
    let heading;
    if (e.webkitCompassHeading != null) heading = e.webkitCompassHeading; // iOS
    else if (e.alpha != null) heading = 360 - e.alpha;
    if (heading != null && !isNaN(heading)){
      currentHeading = heading;
      updateQiblaUI();
    }
  }

  window.qiblaRequestLocation = function(){
    setQiblaStatus('جاري تحديد موقعك...');
    if (!navigator.geolocation){ setQiblaStatus('المتصفح لا يدعم تحديد الموقع'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        qiblaBearing = bearingToQibla(userPos.lat, userPos.lng);
        setQiblaStatus('تم تحديد الموقع. وجّه أعلى الجهاز نحو السهم الذهبي.');
        updateQiblaUI();
        startCompass();
      },
      (err) => setQiblaStatus('تعذّر تحديد الموقع: ' + (err.message||'')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  window.qiblaEnableCompass = async function(){
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'){
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted'){ setQiblaStatus('لم يتم السماح باستخدام البوصلة'); return; }
      }
      startCompass();
      setQiblaStatus('البوصلة مفعّلة ✓');
    } catch(e){ setQiblaStatus('تعذّر تفعيل البوصلة'); }
  };

  function startCompass(){
    window.removeEventListener('deviceorientationabsolute', handleOrientation);
    window.removeEventListener('deviceorientation', handleOrientation);
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
  }

  /* ===================== 4) Share Verse as Image ===================== */
  window.shareVerseAsImage = async function(verseText, refText){
    try{
      const W = 1080, H = 1080;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Background gradient
      const g = ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,'#0b1d3a'); g.addColorStop(.5,'#13325e'); g.addColorStop(1,'#0b1d3a');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

      // Decorative border
      ctx.strokeStyle = 'rgba(255,212,128,.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(40,40,W-80,H-80);
      ctx.strokeStyle = 'rgba(255,212,128,.15)';
      ctx.strokeRect(64,64,W-128,H-128);

      // Header
      ctx.fillStyle = '#ffd28a';
      ctx.font = 'bold 44px "Amiri", serif';
      ctx.textAlign = 'center';
      ctx.fillText('☾  منصة الحَسَنَيْن', W/2, 140);

      // Verse text wrapped
      const verse = '﴿ ' + (verseText||'') + ' ﴾';
      ctx.fillStyle = '#ffffff';
      ctx.font = '54px "Amiri Quran","Amiri",serif';
      ctx.direction = 'rtl';
      wrapText(ctx, verse, W/2, H/2 - 60, W - 200, 78);

      // Reference
      ctx.fillStyle = '#9fc4ff';
      ctx.font = '32px "Cairo", sans-serif';
      ctx.fillText(refText || '', W/2, H - 180);

      // Footer
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.font = '24px "Cairo", sans-serif';
      ctx.fillText('alhassanein  •  منصة القرآن الكريم', W/2, H - 110);

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], 'ayah.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({ files:[file], title:'آية من القرآن الكريم', text: refText||'' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'ayah.png'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 1500);
        miniToast('تم تنزيل الصورة 📥');
      }
    } catch(e){ miniToast('تعذّر إنشاء الصورة'); }
  };

  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (const w of words){
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line){
        lines.push(line); line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    const startY = y - ((lines.length-1)*lineHeight)/2;
    lines.forEach((ln,i)=>ctx.fillText(ln, x, startY + i*lineHeight));
  }

  // Add share button into tafsir modal
  function injectShareButton(){
    const modal = document.getElementById('tafsir-modal');
    if (!modal || modal.dataset.shareReady) return;
    modal.dataset.shareReady = '1';
    const obs = new MutationObserver(()=>{
      const verseEl = document.getElementById('tm-verse');
      const refEl = document.getElementById('tm-ref');
      if (!verseEl) return;
      if (modal.querySelector('.share-verse-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'share-verse-btn';
      btn.innerHTML = '📤 مشاركة الآية كصورة';
      btn.onclick = () => shareVerseAsImage(verseEl.textContent?.replace(/[﴿﴾]/g,'').trim(), refEl?.textContent?.trim());
      verseEl.insertAdjacentElement('afterend', btn);
    });
    obs.observe(modal, { childList:true, subtree:true, characterData:true });
  }

  /* ===================== 5) Media Session API ===================== */
  function setupMediaSession(){
    if (!('mediaSession' in navigator)) return;
    const audios = document.querySelectorAll('audio');
    audios.forEach(a => {
      a.addEventListener('play', () => {
        try {
          const title = document.getElementById('audio-surah')?.textContent || 'تلاوة قرآنية';
          const artist = document.getElementById('audio-reciter')?.textContent || 'منصة الحَسَنَيْن';
          navigator.mediaSession.metadata = new MediaMetadata({
            title, artist, album: 'القرآن الكريم',
            artwork: [{ src:'/assets/apple-touch-icon.png', sizes:'180x180', type:'image/png' }]
          });
          navigator.mediaSession.setActionHandler('play',  () => a.play());
          navigator.mediaSession.setActionHandler('pause', () => a.pause());
          navigator.mediaSession.setActionHandler('previoustrack', () => window.playPrevAyah && window.playPrevAyah());
          navigator.mediaSession.setActionHandler('nexttrack',    () => window.playNextAyah && window.playNextAyah());
        } catch(e){}
      });
    });
  }

  /* ===================== 6) Islamic Occasions Countdown ===================== */
  // Reuses the accurate Umm al-Qura converter from section 2 above.
  const OCCASIONS = [
    { m:9,  d:1,  label:'رمضان',        icon:'🌙' },
    { m:10, d:1,  label:'عيد الفطر',     icon:'🎉' },
    { m:12, d:9,  label:'يوم عرفة',      icon:'🕋' },
    { m:12, d:10, label:'عيد الأضحى',    icon:'🐑' },
    { m:1,  d:10, label:'عاشوراء',       icon:'📿' },
    { m:1,  d:1,  label:'رأس السنة الهجرية', icon:'🌕' },
  ];

  function findNextOccasion(){
    const today = new Date(); today.setHours(0,0,0,0);
    let best = null;
    for (const occ of OCCASIONS){
      // Walk forward day by day (max 400 days covers a full hijri year + buffer)
      for (let i=0;i<400;i++){
        const d = new Date(today); d.setDate(d.getDate()+i);
        const h = toHijriAccurate(d) || toHijriFallback(d);
        if (h.m === occ.m && h.d === occ.d){
          if (i>0 || (h.m && i===0)){
            if (!best || i < best.daysLeft){ best = { ...occ, date:d, daysLeft:i }; }
          }
          break;
        }
      }
    }
    return best;
  }

  function mountOccasionCountdown(){
    const home = document.getElementById('screen-home');
    const hijriInner = document.getElementById('hijri-pill-mount');
    if (!home || !hijriInner || document.getElementById('occasion-pill-mount')) return;
    const next = findNextOccasion();
    if (!next) return;
    const hijriWrap = hijriInner.parentElement; // the outer <div style="text-align:center"> from mountHijriPill
    const wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    const daysTxt = next.daysLeft === 0 ? 'اليوم' : `بعد ${next.daysLeft} يوم`;
    wrap.innerHTML = `<div id="occasion-pill-mount" class="occasion-pill">
      <span class="hp-ico">${next.icon}</span>
      <span>${next.label}</span>
      <span class="occ-days">${daysTxt}</span>
    </div>`;
    hijriWrap.parentElement.insertBefore(wrap, hijriWrap.nextSibling);
  }

  /* ===================== 7) Khatma / Reading Progress Widget ===================== */
  const KHATMA_TOTAL_PAGES = 604;

  function getKhatmaState(){
    const currentPage = parseInt(localStorage.getItem('mshf_page')||'1',10);
    const goalDays = parseInt(localStorage.getItem('khatma_goal_days')||'0',10);
    const startPage = parseInt(localStorage.getItem('khatma_start_page')||'1',10);
    const startDate = localStorage.getItem('khatma_start_date');
    return { currentPage, goalDays, startPage, startDate };
  }

  function setKhatmaGoal(days){
    localStorage.setItem('khatma_goal_days', String(days));
    localStorage.setItem('khatma_start_page', String(parseInt(localStorage.getItem('mshf_page')||'1',10)));
    localStorage.setItem('khatma_start_date', new Date().toISOString());
    renderKhatmaWidget();
  }

  window.mshfSetKhatmaGoal = function(){
    const val = prompt('في كام يوم عايز تختم القرآن؟', '30');
    const days = parseInt(val,10);
    if (days && days > 0) setKhatmaGoal(days);
  };

  function renderKhatmaWidget(){
    const box = document.getElementById('khatma-widget');
    if (!box) return;
    const st = getKhatmaState();
    const pct = Math.min(100, Math.round((st.currentPage / KHATMA_TOTAL_PAGES) * 100));

    let goalHtml = '';
    if (st.goalDays > 0){
      const pagesTotal = KHATMA_TOTAL_PAGES - st.startPage;
      const perDay = Math.max(1, Math.ceil(pagesTotal / st.goalDays));
      const daysPassed = st.startDate ? Math.floor((Date.now() - new Date(st.startDate).getTime())/86400000) : 0;
      const expectedPage = Math.min(KHATMA_TOTAL_PAGES, st.startPage + perDay*daysPassed);
      const onTrack = st.currentPage >= expectedPage;
      goalHtml = `<div class="khatma-goal ${onTrack?'on-track':'behind'}">
        📖 ${perDay} صفحة/يوم عشان تختم في ${st.goalDays} يوم${onTrack ? ' — ماشي تمام 👏' : ' — حاول تلحّق 💪'}
      </div>`;
    } else {
      goalHtml = `<button class="khatma-set-goal" onclick="mshfSetKhatmaGoal()">🎯 حدد هدف ختمة</button>`;
    }

    box.innerHTML = `
      <div class="khatma-head">
        <span>📗 تقدّمك في القرآن</span>
        <span class="khatma-pct">${pct}%</span>
      </div>
      <div class="khatma-bar"><div class="khatma-bar-fill" style="width:${pct}%"></div></div>
      <div class="khatma-sub">صفحة ${st.currentPage} من ${KHATMA_TOTAL_PAGES}</div>
      ${goalHtml}
    `;
  }

  function mountKhatmaWidget(){
    const home = document.getElementById('screen-home');
    if (!home || document.getElementById('khatma-widget')) return;
    const occInner = document.getElementById('occasion-pill-mount');
    const hijriInner = document.getElementById('hijri-pill-mount');
    const anchorInner = occInner || hijriInner;
    const anchorWrap = anchorInner ? anchorInner.parentElement : home.firstElementChild;
    const box = document.createElement('div');
    box.id = 'khatma-widget';
    box.className = 'khatma-widget';
    if (anchorWrap && anchorWrap.parentElement){
      anchorWrap.parentElement.insertBefore(box, anchorWrap.nextSibling);
    } else {
      home.appendChild(box);
    }
    renderKhatmaWidget();
    // Keep it fresh if the user reads and comes back to home without a reload
    window.addEventListener('storage', (e) => { if (e.key === 'mshf_page') renderKhatmaWidget(); });
    setInterval(renderKhatmaWidget, 5000);
  }

  /* ===================== 8) Offline Mushaf Download ===================== */
  const MUSHAF_TOTAL_PAGES = 604;
  const MUSHAF_API = (p) =>
    `https://api.quran.com/api/v4/verses/by_page/${p}?fields=text_uthmani,verse_key,chapter_id,page_number,juz_number,hizb_number&per_page=300`;

  let offlineDownloadRunning = false;

  window.mshfDownloadOffline = async function(){
    if (offlineDownloadRunning) return;
    if (!('serviceWorker' in navigator)){
      window.miniToast && miniToast('المتصفح ده مش بيدعم التخزين الأوفلاين', 2500);
      return;
    }
    offlineDownloadRunning = true;
    const btn = document.getElementById('mshf-offline-btn');
    const originalLabel = btn ? btn.textContent : '';
    if (btn) btn.disabled = true;

    const CONCURRENCY = 6;
    let done = 0, failed = 0;
    let nextPage = 1;

    async function worker(){
      while (true){
        const p = nextPage++;
        if (p > MUSHAF_TOTAL_PAGES) return;
        try {
          const r = await fetch(MUSHAF_API(p));
          if (!r.ok) throw new Error('http '+r.status);
          await r.blob(); // ensure body is consumed so SW finishes caching it
          done++;
        } catch(e){
          failed++;
        }
        if (btn && (done + failed) % 5 === 0){
          btn.textContent = `⬇️ جاري التنزيل... ${done + failed}/${MUSHAF_TOTAL_PAGES}`;
        }
      }
    }

    await Promise.all(Array.from({length: CONCURRENCY}, worker));

    if (btn){
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
    offlineDownloadRunning = false;
    window.miniToast && miniToast(
      failed === 0
        ? `✅ اتحمّل المصحف كامل للأوفلاين (${done}/${MUSHAF_TOTAL_PAGES})`
        : `⚠️ اتحمّل ${done} صفحة، وفشل ${failed} — جرّب تاني وانت متصل`,
      3200
    );
  };

  /* ===================== Boot ===================== */
  function boot(){
    mountHijriPill();
    injectShareButton();
    setupMediaSession();
    // Re-run when audio elements appear later
    new MutationObserver(setupMediaSession).observe(document.body, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
