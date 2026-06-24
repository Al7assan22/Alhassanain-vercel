// ===== SAFETY: إغلاق أي overlay عالق عند تحميل الصفحة =====
(function() {
  function closeAllOverlays() {
    ['sidebar-overlay','surah-sidebar-overlay','mshf-overlay'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) { el.classList.remove('active'); el.classList.remove('show'); }
    });
    var sb = document.getElementById('surah-sidebar');
    if (sb) sb.classList.remove('open');
    var msb = document.getElementById('main-sidebar');
    if (msb) msb.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', closeAllOverlays);
  } else {
    closeAllOverlays();
  }
  window.__closeAllOverlays = closeAllOverlays;
  // Hook on showScreen ليقفل أي overlay عند تنقل المستخدم
  var origShow = window.showScreen;
  window.showScreen = function(name) {
    closeAllOverlays();
    if (typeof origShow === 'function') origShow(name);
  };
})();

// ===== SPLASH SCREEN =====
(function initSplash() {
  // Draw twinkling stars on canvas
  const canvas = document.getElementById('splash-stars');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random(),
      speed: 0.003 + Math.random() * 0.008,
      phase: Math.random() * Math.PI * 2,
    }));
    let frame;
    function drawStars(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        const alpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(s.phase + t * s.speed));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        // All stars gold/warm tones only — no blue/white
        const warmPalette = [
          `rgba(232,201,122,${alpha * 0.9})`,   // gold-light
          `rgba(201,168,76,${alpha * 0.85})`,   // gold
          `rgba(255,235,180,${alpha * 0.75})`,  // warm cream
          `rgba(245,220,150,${alpha * 0.8})`,   // soft gold
        ];
        ctx.fillStyle = warmPalette[Math.floor(s.r * 10) % warmPalette.length];
        ctx.fill();
      });
      frame = requestAnimationFrame(drawStars);
    }
    drawStars(0);
    // Stop animation when splash hides
    setTimeout(() => cancelAnimationFrame(frame), 3400);
  }

  // Generate floating particles
  const container = document.getElementById('splash-particles');
  if (container) {
    const sizes   = [6, 8, 10, 12, 14, 16, 20];
    const count   = 18;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'splash-particle';
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const left = Math.random() * 100;
      const dur  = 4 + Math.random() * 5;
      const del  = Math.random() * 4;
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${left}%;
        bottom: -${size}px;
        animation-duration:${dur}s;
        animation-delay:${del}s;
      `;
      container.appendChild(p);
    }
  }

  // Hide splash after 2.6s with smooth fade, then go to home screen
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  const doHideSplash = () => {
    let done = false;
    const proceed = () => {
      if (done) return;
      done = true;
      // Force remove from DOM completely
      splash.style.cssText = 'display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;position:fixed!important;z-index:-1!important;';
      try { splash.remove(); } catch(e) {}
      // Force home screen visible
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const home = document.getElementById('screen-home');
      if (home) home.classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      const navHome = document.getElementById('nav-home');
      if (navHome) navHome.classList.add('active');
      if (typeof updateHomeLabels === 'function') updateHomeLabels();
    };
    // Start fade animation
    splash.classList.add('hide');
    // After fade (0.7s transition + buffer), force hide
    splash.addEventListener('transitionend', proceed, { once: true });
    setTimeout(proceed, 800); // fallback if transitionend doesn't fire
  };

  setTimeout(doHideSplash, 2600);
})();
// ==========================

// ===== THEME =====
let isDark = false;
const SUN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const MOON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
function setThemeIcon(){ const btn=document.getElementById('theme-btn'); if(btn) btn.innerHTML = isDark ? SUN_SVG : MOON_SVG; }
function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  setThemeIcon();
  localStorage.setItem('quran_theme', isDark ? 'dark' : 'light');
}

(function initTheme() {
  const saved = localStorage.getItem('quran_theme') || 'dark';
  isDark = saved === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  setThemeIcon();
})();

// ===== STATE =====
const state = {
  surahs: [],
  currentSurah: null,
  currentVerses: [],
  currentVerseIdx: 0,
  playing: false,
  autoPlay: false,
  repeat: false,
  tafsirVisible: false,
  readMode: 'mushaf',
  quranFontSize: 26,
  currentReciter: 'minshawi',
  bookmarks: JSON.parse(localStorage.getItem('quran_bookmarks') || '[]'),
  streak: JSON.parse(localStorage.getItem('quran_streak') || '{"count":0,"lastDate":"","days":[]}'),
  lastRead: JSON.parse(localStorage.getItem('quran_lastread') || 'null'),
  stats: JSON.parse(localStorage.getItem('quran_stats') || '{"versesRead":0,"surahsCompleted":[],"memorized":0}'),
  goals: JSON.parse(localStorage.getItem('quran_goals') || '[]'),
  activity: JSON.parse(localStorage.getItem('quran_activity') || '[]'),
  memo: { verses: [], idx: 0, correct: 0, wrong: 0, revealed: false },
  selectedGoalType: null,
  azkarType: 'morning',
  originalPage: parseInt(localStorage.getItem('quran_original_page') || '1', 10),
  originalLoadedPage: null,
  azkarProgress: JSON.parse(localStorage.getItem('quran_azkar_progress') || '{}'),
  tasbih: JSON.parse(localStorage.getItem('quran_tasbih') || '{"count":0,"phrase":"سُبْحَانَ اللَّهِ","target":33}'),
};

// ===== TAFSIR DB =====
const TAFSIR_DB = {
  '1:1':'ابدأ كل شيء باسم الله، وهو الرحمن الذي وسعت رحمته كل شيء، الرحيم بعباده المؤمنين.',
  '1:2':'كل الشكر والحمد لله وحده، رب كل الخلق ومالكهم ومربيهم.',
  '1:3':'الرحمن الرحيم: صفتان تدلان على سعة رحمة الله وشمولها لكل الخلق.',
  '1:4':'الله وحده هو المالك الحقيقي ليوم القيامة حين يُحاسَب كل إنسان.',
  '1:5':'نعبد الله وحده ولا نشرك به أحداً، ومنه وحده نطلب العون والمساعدة.',
  '1:6':'اللهم دلّنا على الطريق المستقيم الصحيح الموصل إلى رضاك.',
  '1:7':'طريق الذين أنعمت عليهم بالهداية، لا طريق الضالين والغاضب عليهم.',
  '2:255':'آية الكرسي: الله لا يغفل ولا ينام، وملكه يشمل السماوات والأرض. من أعظم آيات القرآن.',
  '2:286':'الله لا يكلّف نفساً فوق طاقتها؛ لها ما كسبت وعليها ما اكتسبت.',
  '3:8':'دعاء المؤمن بأن يثبّت الله قلبه على الإيمان بعد أن هداه.',
  '3:173':'حسبنا الله ونعم الوكيل: الله يكفينا وهو خير من نثق به.',
  '65:3':'من يتوكل على الله ويفوّض أمره إليه، فالله يكفيه ويحقق له ما يريد.',
  '94:5':'مع كل ضيقة وصعوبة يأتي فرج ويسر، فلا تيأس أبداً.',
  '112:1':'قل يا محمد: الله واحد أحد لا شريك له ولا مثيل.',
  '112:2':'الله الصمد: الذي يقصده كل المخلوقات في حاجاتهم وهو لا يحتاج أحداً.',
  '112:3':'لم يلد أحداً ولم يُولد من أحد، فهو أزلي أبدي.',
  '112:4':'لا يشبهه ولا يماثله أحد من خلقه.',
};

function getSimpleTafsir(surahNum, verseNum) {
  const key = `${surahNum}:${verseNum}`;
  if (TAFSIR_DB[key]) return TAFSIR_DB[key];
  return `هذه الآية الكريمة رقم ${verseNum} من سورة ${state.currentSurah?.name_arabic || ''}، تدعو المؤمن إلى التأمل والتدبر في معاني كلام الله.`;
}

// ===== SEARCH TOPICS =====
const TOPIC_VERSES = {
  'الصبر': [{surah:2,verse:153,ref:'البقرة · 153',ar:'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',t:'الصبر والصلاة عون للمؤمن في مشاق الحياة كلها.'},{surah:39,verse:10,ref:'الزمر · 10',ar:'إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ',t:'أجر الصابرين عند الله لا حد له ولا نهاية.'}],
  'الصلاة': [{surah:2,verse:238,ref:'البقرة · 238',ar:'حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ',t:'المداومة على الصلوات في أوقاتها فريضة عظيمة.'},{surah:29,verse:45,ref:'العنكبوت · 45',ar:'إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ',t:'الصلاة الحقيقية تُطهّر صاحبها وتنهاه عن كل قبيح.'}],
  'الرزق': [{surah:65,verse:3,ref:'الطلاق · 3',ar:'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ',t:'من يتوكل على الله ويفوّض أمره إليه، فالله يكفيه ويحقق له ما يريد.'},{surah:51,verse:58,ref:'الذاريات · 58',ar:'إِنَّ اللَّهَ هُوَ الرَّزَّاقُ ذُو الْقُوَّةِ الْمَتِينُ',t:'الله هو الرزاق وحده؛ قوي الإرادة ثابت الوعد.'}],
  'التوبة': [{surah:39,verse:53,ref:'الزمر · 53',ar:'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ',t:'لا تيأس من رحمة الله مهما عظم ذنبك، فرحمته تسع كل شيء.'}],
  'الجنة': [{surah:3,verse:133,ref:'آل عمران · 133',ar:'وَسَارِعُوا إِلَىٰ مَغْفِرَةٍ مِّن رَّبِّكُمْ وَجَنَّةٍ عَرْضُهَا السَّمَاوَاتُ وَالْأَرْضُ',t:'الجنة واسعة بقدر السماوات والأرض، فبادر إلى العمل بها.'}],
  'الرحمة': [{surah:6,verse:12,ref:'الأنعام · 12',ar:'كَتَبَ رَبُّكُمْ عَلَىٰ نَفْسِهِ الرَّحْمَةَ',t:'الله كتب الرحمة على نفسه، فلا تيأس من رحمته أبداً.'}],
  'الشكر': [{surah:14,verse:7,ref:'إبراهيم · 7',ar:'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۖ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ',t:'الشكر سبب للمزيد من نعم الله، والكفران يُورث العذاب.'}],
  'التوكل': [{surah:3,verse:159,ref:'آل عمران · 159',ar:'فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ ۚ إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ',t:'بعد الاستشارة والتفكير، فوّض أمرك لله، فهو يحب المتوكلين عليه.'}],
};

// ===== VOD =====
const VOD_VERSES = [
  {surah:2,verse:286,ref:'البقرة · 286',tafsir:'الله لا يكلّف نفساً فوق طاقتها؛ لها ما كسبت وعليها ما اكتسبت.'},
  {surah:2,verse:255,ref:'البقرة · 255',tafsir:'الله الحي الدائم، لا ينام ولا يغفل، وملكه يشمل كل السماوات والأرض.'},
  {surah:3,verse:8,ref:'آل عمران · 8',tafsir:'دعاء المؤمن بأن يثبّت الله قلبه على الإيمان بعد أن هداه.'},
  {surah:65,verse:3,ref:'الطلاق · 3',tafsir:'من يتوكل على الله ويفوّض أمره إليه، فالله يكفيه ويحقق له ما يريد.'},
  {surah:94,verse:5,ref:'الشرح · 5',tafsir:'مع كل ضيقة وصعوبة يأتي فرج ويسر، فلا تيأس أبداً.'},
  {surah:3,verse:173,ref:'آل عمران · 173',tafsir:'حسبنا الله ونعم الوكيل: الله يكفينا وهو خير من نثق به.'},
  {surah:13,verse:28,ref:'الرعد · 28',tafsir:'في ذكر الله راحة للقلوب وسكينة وطمأنينة.'},
];

async function loadVOD() {
  const today = new Date().getDate();
  const pick = VOD_VERSES[today % VOD_VERSES.length];
  try {
    const r = await fetch(`https://api.alquran.cloud/v1/ayah/${pick.surah}:${pick.verse}`);
    const d = await r.json();
    document.getElementById('vod-text').textContent = d.data.text;
    document.getElementById('vod-ref').textContent = `📍 ${pick.ref}`;
    document.getElementById('vod-tafsir').textContent = `💡 ${pick.tafsir}`;
  } catch(e) {
    document.getElementById('vod-text').textContent = 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ';
    document.getElementById('vod-ref').textContent = '📍 الطلاق · 3';
    document.getElementById('vod-tafsir').textContent = '💡 من يتوكل على الله ويفوّض أمره إليه، فالله يكفيه ويحقق له ما يريد.';
  }
}

// ===== HELPERS =====
// إزالة التشكيل من النص العربي
function removeTashkeel(text) {
  return (text || '').replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '');
}

// ===== API =====
async function fetchSurahs() {
  try {
    const r = await fetch('https://api.alquran.cloud/v1/surah');
    const d = await r.json();
    return d.data;
  } catch(e) { showToast('تعذّر الاتصال'); return []; }
}

async function fetchVerses(surahNum) {
  try {
    const r = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
    const d = await r.json();
    return d.data.ayahs;
  } catch(e) { showToast('تعذّر تحميل الآيات'); return []; }
}

// ===== AUDIO (rebuilt for accurate per-ayah sync) =====
const audioEl = document.getElementById('audio-el');

// Number of ayahs per surah (1-indexed; index 0 unused)
const SURAH_AYAH_COUNTS = [0,7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,30,50,44,26,17,22,26,19,15,21,18,21,18,9,16,18,27,22,26,2,20,110,21,56,23,22,18,22,35,15,48,30,19,18,20,66,20,20,10,24,40,29,15,15,23,21,24,25,10,23,14,23,20,11,11,7,37,22,21,19,19,16,15,22,31,34,45,45,8,29,25,10,15,20,13,11,4,1,5,60,10,7];

function calculateVerseGlobal(surah, verse) {
  // Global ayah number (1..6236) used by cdn.islamic.network
  let total = 0;
  for (let i = 1; i < surah; i++) total += SURAH_AYAH_COUNTS[i] || 0;
  return total + verse;
}

// EveryAyah folders (verified) — primary source: one MP3 per ayah, perfect sync.
const EVERYAYAH_FOLDERS = {
  minshawi:           ['Minshawy_Murattal_128kbps'],
  abdulbasit:         ['Abdul_Basit_Murattal_64kbps', 'Abdul_Basit_Murattal_192kbps'],
  husary:             ['Husary_128kbps', 'Husary_64kbps'],
  alafasy:            ['Alafasy_128kbps', 'Alafasy_64kbps'],
  sudais:             ['Abdurrahmaan_As-Sudais_192kbps', 'Abdurrahmaan_As-Sudais_64kbps'],
  mishary_alafasy_64: ['Alafasy_64kbps'],
  dossari:            ['Yasser_Ad-Dussary_128kbps'],
  qatami:             ['Nasser_Alqatami_128kbps'],
};

// CDN fallback identifiers (correct slugs on cdn.islamic.network)
const CDN_RECITER = {
  minshawi:           'ar.minshawi',
  abdulbasit:         'ar.abdulbasitmurattal',
  husary:             'ar.husary',
  alafasy:            'ar.alafasy',
  sudais:             'ar.abdurrahmaansudais',
  mishary_alafasy_64: 'ar.alafasy',
  dossari:            'ar.yasseraldossari',
  qatami:             'ar.nasseralqatami',
};

const RECITER_NAMES = {
  minshawi: 'المنشاوي',
  abdulbasit: 'عبد الباسط',
  husary: 'الحصري',
  alafasy: 'العفاسي',
  sudais: 'السديس',
  mishary_alafasy_64: 'العفاسي',
  dossari: 'ياسر الدوسري',
  qatami: 'ناصر القطامي',
};

// Full-surah MP3 servers (mp3quran.net) — used by Listen screen for streaming + download
const FULL_SURAH_SERVERS = {
  minshawi:   'https://server10.mp3quran.net/minsh',
  abdulbasit: 'https://server7.mp3quran.net/basit',
  husary:     'https://server13.mp3quran.net/husr',
  alafasy:    'https://server8.mp3quran.net/afs',
  sudais:     'https://server11.mp3quran.net/sds',
  dossari:    'https://server11.mp3quran.net/yasser',
  qatami:     'https://server6.mp3quran.net/qtm',
};
const RECITER_SUBTITLES = {
  minshawi: 'محمد صديق المنشاوي',
  abdulbasit: 'عبد الباسط عبد الصمد',
  husary: 'محمود خليل الحصري',
  alafasy: 'مشاري راشد العفاسي',
  sudais: 'عبد الرحمن السديس',
  dossari: 'ياسر بن راشد الدوسري',
  qatami: 'ناصر بن علي القطامي',
};
function getFullSurahUrl(reciterKey, surahNum){
  const base = FULL_SURAH_SERVERS[reciterKey] || FULL_SURAH_SERVERS.alafasy;
  return base + '/' + String(surahNum).padStart(3,'0') + '.mp3';
}


function getAudioUrls(surahNum, verseNum) {
  const s = String(surahNum).padStart(3, '0');
  const v = String(verseNum).padStart(3, '0');
  const reciter = state.currentReciter;
  const urls = [];
  // Primary: EveryAyah (per-ayah file => guaranteed sync)
  (EVERYAYAH_FOLDERS[reciter] || EVERYAYAH_FOLDERS.alafasy).forEach(folder => {
    urls.push(`https://everyayah.com/data/${folder}/${s}${v}.mp3`);
  });
  // Fallback: islamic.network global numbering
  const globalNum = calculateVerseGlobal(surahNum, verseNum);
  const cdnId = CDN_RECITER[reciter] || 'ar.alafasy';
  urls.push(`https://cdn.islamic.network/quran/audio/128/${cdnId}/${globalNum}.mp3`);
  urls.push(`https://cdn.islamic.network/quran/audio/64/${cdnId}/${globalNum}.mp3`);
  return urls;
}

// Track what is currently playing so onended advances the right ayah
state.nowPlaying = state.nowPlaying || { surah: null, verse: null, context: null };

async function playVerseAudio(surahNum, verseNum, context) {
  const urls = getAudioUrls(surahNum, verseNum);
  audioEl.playbackRate = parseFloat(document.querySelector('.audio-controls .speed-select')?.value || '1');
  const usedContext = context || state.nowPlaying.context || 'surah';
  state.nowPlaying = { surah: surahNum, verse: verseNum, context: usedContext };
  showPlayer(surahNum, verseNum);
  state.playing = false;
  updatePlayBtn();
  // Highlight immediately for responsiveness
  highlightCurrentAyah(surahNum, verseNum);

  for (let i = 0; i < urls.length; i++) {
    try {
      audioEl.pause();
      audioEl.src = urls[i];
      audioEl.load();
      await audioEl.play();
      state.playing = true;
      updatePlayBtn();
      return;
    } catch (e) {
      if (i === urls.length - 1) {
        // All URLs failed — if we're in page-play mode, skip to next verse automatically
        if (state.pagePlayBoundary && usedContext === 'mushaf' && state.autoPlay) {
          setTimeout(() => nextVerse(), 300);
        } else {
          showToast('❌ تعذّر تشغيل الصوت، اضغط استمع مرة أخرى');
          state.playing = false;
          updatePlayBtn();
        }
      }
    }
  }
}

function togglePlay() {
  if (!state.nowPlaying.surah && !state.currentSurah) return;
  if (state.playing) { audioEl.pause(); state.playing = false; }
  else {
    if (audioEl.src) {
      audioEl.play().then(() => { state.playing = true; updatePlayBtn(); })
        .catch(() => showToast('اضغط استمع مرة أخرى'));
    } else if (state.currentSurah) {
      playVerseAudio(state.currentSurah.number, state.currentVerses[state.currentVerseIdx]?.numberInSurah || 1, 'surah');
    }
  }
  updatePlayBtn();
}

function updatePlayBtn() {
  const btn = document.getElementById('play-btn');
  btn.innerHTML = state.playing
    ? '<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"currentColor\"><rect x=\"5\" y=\"3\" width=\"4\" height=\"18\" rx=\"1\"/><rect x=\"15\" y=\"3\" width=\"4\" height=\"18\" rx=\"1\"/></svg>'
    : '<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"currentColor\"><polygon points=\"5,3 19,12 5,21\"/></svg>';
  // vplay-btn buttons are NOT updated here — they only change when the user clicks them directly
  // Update lc-play buttons in surah list (listen screen)
  document.querySelectorAll('.lc-btn.lc-play').forEach(b => {
    const sn = parseInt(b.getAttribute('data-surah') || '0');
    const isThis = sn === (LISTEN_STATE?.currentSurah || 0);
    const playing = isThis && state.playing;
    b.innerHTML = playing
      ? '<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"currentColor\"><rect x=\"5\" y=\"3\" width=\"4\" height=\"18\" rx=\"1\"/><rect x=\"15\" y=\"3\" width=\"4\" height=\"18\" rx=\"1\"/></svg>'
      : '<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"currentColor\"><polygon points=\"5,3 19,12 5,21\"/></svg>';
    b.classList.toggle('playing', playing);
    // Also highlight the whole card
    const card = b.closest('.listen-card');
    if(card) card.classList.toggle('playing-card', playing);
  });
}

// Handle verse play button click — isolated from global player
// The button shows ⏸ while THIS verse is playing, ▶ otherwise
// It never changes due to other screens or mushaf player
let _activeVplayBtn = null;
function handleVersePlay(btn, idx, surahNum, verseNum) {
  // If this button is already playing, pause
  if (btn.classList.contains('playing')) {
    audioEl.pause();
    state.playing = false;
    btn.innerHTML = '▶';
    btn.classList.remove('playing');
    _activeVplayBtn = null;
    updatePlayBtn();
    return;
  }
  // Reset previous active vplay-btn
  if (_activeVplayBtn && _activeVplayBtn !== btn) {
    _activeVplayBtn.innerHTML = '▶';
    _activeVplayBtn.classList.remove('playing');
  }
  // Mark this button as playing
  btn.innerHTML = '⏸';
  btn.classList.add('playing');
  _activeVplayBtn = btn;
  state.currentVerseIdx = idx;
  // When audio ends, reset only this button
  const resetBtn = () => {
    if (_activeVplayBtn === btn) {
      btn.innerHTML = '▶';
      btn.classList.remove('playing');
      _activeVplayBtn = null;
    }
  };
  audioEl.addEventListener('ended', resetBtn, { once: true });
  audioEl.addEventListener('pause', () => {
    // Only reset if not about to play next (autoPlay)
    setTimeout(() => {
      if (!state.playing && _activeVplayBtn === btn) {
        btn.innerHTML = '▶';
        btn.classList.remove('playing');
        _activeVplayBtn = null;
      }
    }, 400);
  }, { once: true });
  playVerseAudio(surahNum, verseNum, 'surah');
}

async function nextVerse() {
  const np = state.nowPlaying;
  if (np.context === 'mushaf' && np.surah) {
    // If we have a page ayah list, walk it directly — no calculation errors
    if (state.pagePlayBoundary?.ayahList) {
      const b = state.pagePlayBoundary;
      b.ayahIndex = (b.ayahIndex || 0) + 1;
      if (b.ayahIndex >= b.ayahList.length) {
        // Finished all ayahs on the page
        state.autoPlay = false;
        document.getElementById('auto-btn')?.classList.remove('on');
        state.playing = false; updatePlayBtn();
        showToast(`✅ انتهت صفحة ${toArabicDigits(b.pageNum)}`);
        state.pagePlayBoundary = null;
        return;
      }
      const next = b.ayahList[b.ayahIndex];
      return playVerseAudio(next.surah, next.verse, 'mushaf');
    }
    // Fallback: calculate next verse manually
    const max = SURAH_AYAH_COUNTS[np.surah] || 1;
    let next = np.verse + 1, surah = np.surah;
    if (next > max) { surah += 1; next = 1; if (surah > 114) return; }
    // Check page boundary before playing
    if (state.pagePlayBoundary) {
      const b = state.pagePlayBoundary;
      const pastEnd = (surah > b.endSurah) || (surah === b.endSurah && next > b.endVerse);
      if (pastEnd) {
        state.autoPlay = false;
        document.getElementById('auto-btn')?.classList.remove('on');
        state.playing = false; updatePlayBtn();
        showToast(`✅ انتهت صفحة ${toArabicDigits(b.pageNum)}`);
        state.pagePlayBoundary = null;
        return;
      }
    }
    return playVerseAudio(surah, next, 'mushaf');
  }
  if (!state.currentSurah) return;
  state.currentVerseIdx = Math.min(state.currentVerseIdx + 1, state.currentVerses.length - 1);
  await playVerseAudio(state.currentSurah.number, state.currentVerses[state.currentVerseIdx].numberInSurah, 'surah');
}

async function prevVerse() {
  const np = state.nowPlaying;
  if (np.context === 'mushaf' && np.surah) {
    let prev = np.verse - 1, surah = np.surah;
    if (prev < 1) { surah -= 1; if (surah < 1) return; prev = SURAH_AYAH_COUNTS[surah]; }
    return playVerseAudio(surah, prev, 'mushaf');
  }
  if (!state.currentSurah) return;
  state.currentVerseIdx = Math.max(state.currentVerseIdx - 1, 0);
  await playVerseAudio(state.currentSurah.number, state.currentVerses[state.currentVerseIdx].numberInSurah, 'surah');
}

function onAudioEnd() {
  if (state.repeat) { audioEl.play(); return; }
  // Handle page-play boundary (mushaf listen page)
  if (state.pagePlayBoundary && state.nowPlaying.context === 'mushaf') {
    const b = state.pagePlayBoundary;
    if (b.ayahList) {
      // Increment index to move to next ayah
      b.ayahIndex = (b.ayahIndex || 0) + 1;
      if (b.ayahIndex >= b.ayahList.length) {
        // All ayahs on page finished
        state.autoPlay = false;
        document.getElementById('auto-btn')?.classList.remove('on');
        state.playing = false; updatePlayBtn();
        showToast(`✅ انتهت صفحة ${toArabicDigits(b.pageNum)}`);
        state.pagePlayBoundary = null;
        return;
      }
      // Play next ayah in list
      const next = b.ayahList[b.ayahIndex];
      setTimeout(() => playVerseAudio(next.surah, next.verse, 'mushaf'), 350);
      return;
    } else {
      // Fallback boundary check (no ayahList)
      const np = state.nowPlaying;
      const pastEnd = (np.surah > b.endSurah) ||
                      (np.surah === b.endSurah && np.verse >= b.endVerse);
      if (pastEnd) {
        state.autoPlay = false;
        document.getElementById('auto-btn')?.classList.remove('on');
        state.playing = false; updatePlayBtn();
        showToast(`✅ انتهت صفحة ${toArabicDigits(b.pageNum)}`);
        state.pagePlayBoundary = null;
        return;
      }
      // Not past end — play next verse manually
      const max = SURAH_AYAH_COUNTS[np.surah] || 1;
      let next = np.verse + 1, surah = np.surah;
      if (next > max) { surah += 1; next = 1; if (surah > 114) return; }
      setTimeout(() => playVerseAudio(surah, next, 'mushaf'), 350);
      return;
    }
  }
  if (state.autoPlay) { setTimeout(() => nextVerse(), 350); return; }
  state.playing = false; updatePlayBtn();
}

function toggleRepeat() { state.repeat = !state.repeat; document.getElementById('repeat-btn').classList.toggle('on', state.repeat); showToast(state.repeat ? '🔁 إعادة مفعّلة' : 'إعادة مُلغاة'); }
function toggleAuto() { state.autoPlay = !state.autoPlay; document.getElementById('auto-btn').classList.toggle('on', state.autoPlay); showToast(state.autoPlay ? '▶▶ تشغيل تلقائي' : 'إيقاف التلقائي'); }
function changeSpeed(val) { audioEl.playbackRate = parseFloat(val); }
function changeReciter(val) {
  state.currentReciter = val;
  const wasPlaying = state.playing;
  const np = state.nowPlaying;
  audioEl.pause();
  audioEl.removeAttribute('src');
  audioEl.load();
  state.playing = false;
  updatePlayBtn();
  showToast('تم تغيير القارئ: ' + (RECITER_NAMES[val] || val));
  if (wasPlaying && np.surah && np.verse) {
    playVerseAudio(np.surah, np.verse, np.context);
  }
}


// ── Audio Bar Smart Controls ─────────────────────────────────────────────
function _activeScreen() {
  const active = document.querySelector('.screen.active');
  return active ? active.id : '';
}

async function barSkipNext() {
  const screen = _activeScreen();
  if (screen === 'screen-listen') {
    // listen screen → next surah
    const cur = LISTEN_STATE.currentSurah || 1;
    const next = Math.min(cur + 1, 114);
    if (typeof listenPlaySurah === 'function') listenPlaySurah(next);
    else { LISTEN_STATE.currentSurah = next; }
  } else {
    // reading/other → next verse
    await nextVerse();
  }
}

async function barSkipPrev() {
  const screen = _activeScreen();
  if (screen === 'screen-listen') {
    // listen screen → prev surah
    const cur = LISTEN_STATE.currentSurah || 1;
    const prev = Math.max(cur - 1, 1);
    if (typeof listenPlaySurah === 'function') listenPlaySurah(prev);
    else { LISTEN_STATE.currentSurah = prev; }
  } else {
    // reading/other → prev verse
    await prevVerse();
  }
}

function changeReciterBar(val) {
  // Update both contexts
  state.currentReciter = val;
  if (typeof LISTEN_STATE !== 'undefined') LISTEN_STATE.reciter = val;
  // Sync listen screen reciter chips if visible
  document.querySelectorAll('.reciter-chip').forEach(el => {
    el.classList.toggle('active', el.dataset.r === val);
  });
  const ctx = state.nowPlaying && state.nowPlaying.context;
  // In text/verse reading contexts → keep verse-by-verse behavior
  if (ctx === 'surah' || ctx === 'mushaf') {
    changeReciter(val);
  } else {
    // Listen / full-surah / unknown → switch full surah, preserve position
    const audio = document.getElementById('audio-el');
    const playingSurah = (LISTEN_STATE && LISTEN_STATE.currentSurah) || (state.nowPlaying && state.nowPlaying.surah);
    if (playingSurah && audio) {
      const savedTime = audio.currentTime || 0;
      const wasPlaying = !audio.paused && state.playing;
      const newUrl = getFullSurahUrl(val, playingSurah);
      LISTEN_STATE.currentSurah = playingSurah;
      state.nowPlaying = { surah: playingSurah, verse: 1, context: 'listen-full' };
      audio.pause();
      audio.src = newUrl;
      audio.load();
      const onMeta = function(){
        audio.removeEventListener('loadedmetadata', onMeta);
        try { audio.currentTime = Math.min(savedTime, (audio.duration||savedTime)); } catch(e){}
        if (wasPlaying) {
          audio.play().then(()=>{ state.playing = true; if(typeof updatePlayBtn==='function') updatePlayBtn(); })
            .catch(()=> showToast('تعذر التشغيل، حاول قارئاً آخر'));
        }
      };
      audio.addEventListener('loadedmetadata', onMeta, { once: true });
      const infoEl = document.getElementById('audio-verse-info');
      if (infoEl) infoEl.textContent = `سورة كاملة — ${RECITER_NAMES[val]||val}`;
    } else {
      // nothing playing yet — just update preference
    }
  }
  showToast('القارئ: ' + (RECITER_NAMES[val] || val));
}

function showPlayer(surahNum, verseNum) {
  document.getElementById('audio-player').classList.add('visible');
  document.body.classList.add('player-active');
  // Smoothly hide FAB while player is active (all screen sizes)
  const fabBtn = document.getElementById('fab-ai-btn');
  if (fabBtn) fabBtn.classList.add('fab-hidden');
  const surahName = (allSurahs.find(s => s.number === surahNum)?.name_arabic) || state.currentSurah?.name_arabic || `سورة ${surahNum}`;
  document.getElementById('audio-surah-name').textContent = surahName;
  document.getElementById('audio-verse-info').textContent = `الآية ${toArabicDigits(verseNum)} — ${RECITER_NAMES[state.currentReciter] || state.currentReciter}`;
  // Sync reciter dropdown in bar
  const sel = document.getElementById('reciter-select');
  if (sel) sel.value = state.currentReciter || 'minshawi';
}

function closePlayer() {
  audioEl.pause();
  audioEl.src = '';
  state.playing = false;
  state.nowPlaying = { surah: null, verse: null, context: null };
  document.getElementById('audio-player').classList.remove('visible');
  document.body.classList.remove('player-active');
  // Smoothly restore FAB visibility
  const fabBtn = document.getElementById('fab-ai-btn');
  if (fabBtn) fabBtn.classList.remove('fab-hidden');
  document.querySelectorAll('.mushaf-ayah.playing, .verse-block.playing').forEach(el => el.classList.remove('playing'));
}

function highlightCurrentAyah(surahNum, verseNum) {
  // Surah reading screen
  document.querySelectorAll('.verse-block').forEach(b => b.classList.remove('playing'));
  if (state.currentSurah && state.currentSurah.number === surahNum) {
    const idx = state.currentVerses.findIndex(v => v.numberInSurah === verseNum);
    if (idx >= 0) {
      const el = document.querySelectorAll('.verse-block')[idx];
      if (el) {
        el.classList.add('playing');
        if (state.nowPlaying.context === 'surah') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
  // Mushaf screen (legacy .mushaf-ayah + new text-page .mshf-verse)
  document.querySelectorAll('.mushaf-ayah, .mshf-verse').forEach(el => el.classList.remove('playing'));
  const mEl = document.querySelector(`.mushaf-ayah[data-surah="${surahNum}"][data-ayah="${verseNum}"]`);
  if (mEl) {
    mEl.classList.add('playing');
    if (state.nowPlaying.context === 'mushaf') mEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const tEl = document.querySelector(`.mshf-verse[data-surah="${surahNum}"][data-ayah="${verseNum}"]`);
  if (tEl) {
    tEl.classList.add('playing');
    if (state.nowPlaying.context === 'mushaf') tEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Back-compat alias used by older callers
function highlightVerse(idx) {
  if (!state.currentSurah || !state.currentVerses[idx]) return;
  highlightCurrentAyah(state.currentSurah.number, state.currentVerses[idx].numberInSurah);
}


// ===== NAVIGATION =====
function toggleSidebar() {
  const nav = document.getElementById('main-nav');
  const overlay = document.getElementById('sidebar-overlay');
  if (!nav) return;
  const isOpen = nav.classList.toggle('open');
  overlay?.classList.toggle('active', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
  // Hide surah sidebar toggle when main nav is open
  const surahToggle = document.getElementById('surah-sidebar-toggle');
  if (surahToggle) surahToggle.style.display = isOpen ? 'none' : '';
}
function closeSidebar() {
  const nav = document.getElementById('main-nav');
  const overlay = document.getElementById('sidebar-overlay');
  nav?.classList.remove('open');
  overlay?.classList.remove('active');
  document.body.style.overflow = '';
  // Restore surah toggle visibility if on quran screen
  setTimeout(function() {
    if (typeof updateToggleBtn === 'function') updateToggleBtn();
  }, 50);
}

// ── Nav scroll arrows ──────────────────────────────────────────────────────
function scrollNav(direction) {
  const wrap = document.getElementById('nav-scroll-wrap');
  if (!wrap) return;
  wrap.scrollBy({ left: direction * 160, behavior: 'smooth' });
}

// ── Close main sidebar when clicking outside (on the overlay) ──────────────
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeSidebar();
    });
  }
});

// ===== PRAYER TIMES =====
const PRAYER_NAMES = {
  Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر',
  Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء'
};
const PRAYER_ICONS = {
  Fajr:'🌙', Sunrise:'🌅', Dhuhr:'☀️', Asr:'🌤️', Maghrib:'🌇', Isha:'🌃'
};
const PRAYER_ORDER = ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];

let prayerState = {
  lat: null, lng: null, city: '', times: null,
  nextPrayerTimer: null, countdownTimer: null
};

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`screen-${name}`)?.classList.add('active');
  document.getElementById(`nav-${name}`)?.classList.add('active');
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name === 'home') updateHomeLabels();
  if (name === 'goals') renderGoals();
  if (name === 'azkar') renderAzkar(state.azkarType || 'morning');
  if (name === 'quran-duas') renderQuranDuas();
  if (name === 'tasbih') updateTasbihUI();
  if (name === 'original') { initMushafReader(); }
  if (name === 'prayer') initPrayerTimes();
}

async function initPrayerTimes() {
  if (prayerState.lat) { renderPrayerUI(); return; }
  detectLocation();
}

function detectLocation() {
  prayerState.lat = null;
  prayerState.lng = null;
  prayerState.city = '';
  document.getElementById('prayer-loading').style.display = 'block';
  document.getElementById('prayer-content').style.display = 'none';
  document.getElementById('prayer-error').style.display = 'none';

  // Try GPS first, fallback to IP geolocation
  if (navigator.geolocation) {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; fallbackToIP(); }
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      pos => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        prayerState.lat = pos.coords.latitude;
        prayerState.lng = pos.coords.longitude;
        reverseGeocode(prayerState.lat, prayerState.lng);
        fetchPrayerTimes(prayerState.lat, prayerState.lng, '');
      },
      err => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fallbackToIP();
      },
      { timeout: 5000, enableHighAccuracy: true, maximumAge: 300000 }
    );
  } else {
    fallbackToIP();
  }
}

async function fallbackToIP() {
  try {
    const r = await fetch('https://ipapi.co/json/');
    const d = await r.json();
    if (d.latitude && d.longitude) {
      prayerState.lat = d.latitude;
      prayerState.lng = d.longitude;
      const city = [d.city, d.country_name].filter(Boolean).join('، ');
      prayerState.city = city;
      fetchPrayerTimes(d.latitude, d.longitude, city);
      return;
    }
  } catch(e) {}
  // Final fallback: Cairo
  fetchPrayerTimes(30.0444, 31.2357, 'القاهرة');
}

async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const d = await r.json();
    const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || '';
    const country = d.address?.country || '';
    prayerState.city = [city, country].filter(Boolean).join('، ');
    document.getElementById('prayer-location-info').textContent = `📍 ${prayerState.city}`;
  } catch(e) {}
}

async function fetchPrayerTimes(lat, lng, cityFallback) {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    // Fetch current month for weekly view
    const r = await fetch(`https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=4`);
    const d = await r.json();
    if (d.code !== 200) throw new Error('API error');
    prayerState.lat = lat;
    prayerState.lng = lng;
    prayerState.monthData = d.data;
    prayerState.city = prayerState.city || cityFallback;
    if (prayerState.city) document.getElementById('prayer-location-info').textContent = `📍 ${prayerState.city}`;
    prayerState.times = d.data[today.getDate() - 1]?.timings;
    // Cache location
    localStorage.setItem('prayer_lat', lat);
    localStorage.setItem('prayer_lng', lng);
    localStorage.setItem('prayer_city', prayerState.city);
    document.getElementById('prayer-loading').style.display = 'none';
    document.getElementById('prayer-content').style.display = 'block';
    renderPrayerUI();
  } catch(e) {
    showPrayerError('تعذّر جلب أوقات الصلاة. تحقّق من الاتصال بالإنترنت وحاول مرة أخرى.');
  }
}

// Returns raw "HH:MM" (24h) stripped of timezone suffix
function rawTime(t) {
  if (!t) return '00:00';
  return t.replace(/\s*\(.*?\)/, '').trim();
}
// Returns minutes-since-midnight from raw API time string
function timeToMinutes(t) {
  const [h, m] = rawTime(t).split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}
// Formats raw API time string to 12-hour Arabic display
function cleanTime(t) {
  if (!t) return '--:--';
  const raw = rawTime(t);
  const [hStr, mStr] = raw.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ? mStr.padStart(2, '0') : '00';
  if (isNaN(h)) return raw;
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

function renderPrayerUI() {
  if (!prayerState.times) return;
  const today = new Date();
  const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const monthNamesAr = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  document.getElementById('prayer-date-bar').textContent =
    `${dayNames[today.getDay()]} ${today.getDate()} ${monthNamesAr[today.getMonth()]} ${today.getFullYear()}`;

  const now = today.getHours() * 60 + today.getMinutes();
  const timings = prayerState.times;

  // Find next prayer
  let nextIdx = -1;
  const minutesArr = PRAYER_ORDER.map(k => timeToMinutes(timings[k]));

  for (let i = 0; i < minutesArr.length; i++) {
    if (minutesArr[i] > now) { nextIdx = i; break; }
  }
  if (nextIdx === -1) nextIdx = 0; // next is Fajr tomorrow

  // Render prayer cards
  document.getElementById('prayer-grid').innerHTML = PRAYER_ORDER.map((k, i) => {
    const isNext = i === nextIdx;
    const isPast = minutesArr[i] < now && !isNext;
    return `<div class="prayer-card ${isNext ? 'next-prayer' : ''} ${isPast ? 'past-prayer' : ''}">
      ${isNext ? '<div class="next-badge">التالية</div>' : ''}
      <div style="font-size:26px;margin-bottom:6px">${PRAYER_ICONS[k]}</div>
      <div class="prayer-name">${PRAYER_NAMES[k]}</div>
      <div class="prayer-time">${cleanTime(timings[k])}</div>
    </div>`;
  }).join('');

  // Next prayer countdown card
  renderNextPrayerCard(nextIdx, minutesArr);

  // Weekly view
  renderWeekView();

  // Start countdown timer
  clearInterval(prayerState.countdownTimer);
  prayerState.countdownTimer = setInterval(() => {
    const n = new Date();
    const nowM = n.getHours() * 60 + n.getMinutes();
    let ni = -1;
    for (let i = 0; i < minutesArr.length; i++) {
      if (minutesArr[i] > nowM) { ni = i; break; }
    }
    if (ni === -1) ni = 0;
    renderNextPrayerCard(ni, minutesArr);
  }, 30000);
}

function renderNextPrayerCard(nextIdx, minutesArr) {
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const k = PRAYER_ORDER[nextIdx];
  let diff = minutesArr[nextIdx] - nowM;
  if (diff < 0) diff += 1440; // wrap to tomorrow
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  const countdown = hrs > 0 ? `${hrs} س ${mins} د` : `${mins} دقيقة`;
  document.getElementById('prayer-next-card').innerHTML = `
    <div class="prayer-next-icon">${PRAYER_ICONS[k]}</div>
    <div class="prayer-next-info">
      <div class="prayer-next-label">الصلاة القادمة</div>
      <div class="prayer-next-name">${PRAYER_NAMES[k]}</div>
      <div class="prayer-next-time">الساعة ${cleanTime(prayerState.times[k])}</div>
    </div>
    <div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;text-align:center">الوقت المتبقي</div>
      <div class="prayer-countdown">${countdown}</div>
    </div>`;
}

function renderWeekView() {
  if (!prayerState.monthData) return;
  const today = new Date();
  const todayDate = today.getDate();
  const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const dayIdx = todayDate - 1 + i;
    if (dayIdx >= prayerState.monthData.length) break;
    const dayData = prayerState.monthData[dayIdx];
    const date = new Date(today); date.setDate(todayDate + i);
    const dayLabel = i === 0 ? 'اليوم' : i === 1 ? 'غداً' : dayNames[date.getDay()];
    const t = dayData.timings;
    rows.push(`<div class="prayer-week-row">
      <div class="prayer-week-day">${dayLabel} ${date.getDate()}</div>
      <div class="prayer-week-times">
        ${['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(k=>`<span>${PRAYER_ICONS[k]}<b>${cleanTime(t[k])}</b></span>`).join('')}
      </div>
    </div>`);
  }
  document.getElementById('prayer-week-grid').innerHTML = rows.join('');
}

function showPrayerError(msg) {
  document.getElementById('prayer-loading').style.display = 'none';
  document.getElementById('prayer-error').style.display = 'block';
  document.getElementById('prayer-error').textContent = msg;
}



// ===== SURAH LIST =====
let allSurahs = [];

function renderSurahList(surahs) {
  const list = document.getElementById('surah-list');
  if (!surahs.length) { list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">لا توجد نتائج</div>'; return; }
  list.innerHTML = surahs.map(s => `
    <div class="surah-item ${state.currentSurah?.number === s.number ? 'active' : ''}" onclick="loadSurah(${s.number})" id="sitem-${s.number}">
      <div class="surah-num">${s.number}</div>
      <div class="surah-meta">
        <div class="surah-name-ar">${removeTashkeel((s.name_arabic || s.name || '').replace(/^سُورَةُ\s*/u,'').replace(/^سورة\s*/u,''))}</div>
        <div class="surah-type">${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${s.numberOfAyahs} آية</div>
      </div>
    </div>
  `).join('');
}

function filterSurahs(query) {
  if (!query) { renderSurahList(allSurahs); return; }
  const q = query.toLowerCase();
  renderSurahList(allSurahs.filter(s => (s.name_arabic||s.name).includes(q) || String(s.number).includes(q) || (s.englishName||'').toLowerCase().includes(q)));
}

async function loadSurah(num) {
  const pool = (allSurahs && allSurahs.length) ? allSurahs : (window.allSurahs || []);
  const surah = pool.find(s => s.number === num);
  if (!surah) { showToast && showToast('قائمة السور لم تُحمَّل بعد'); return; }
  // Ensure the lexical binding is in sync going forward
  if (!allSurahs.length && window.allSurahs?.length) { try { allSurahs = window.allSurahs; } catch(e){} }
  state.currentSurah = surah;
  state.currentVerseIdx = 0;

  document.querySelectorAll('.surah-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`sitem-${num}`)?.classList.add('active');
  document.getElementById('reading-surah-name').textContent = removeTashkeel(surah.name_arabic || surah.name);
  document.getElementById('reading-surah-info').textContent = `${surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${surah.numberOfAyahs} آية`;

  const vc = document.getElementById('verses-container');
  vc.innerHTML = '<div class="loading-verses"><div class="spinner"></div><div>جارٍ تحميل الآيات...</div></div>';

  const verses = await fetchVerses(num);
  state.currentVerses = verses;

  state.lastRead = { surahNum: num, surahName: surah.name_arabic || surah.name };
  localStorage.setItem('quran_lastread', JSON.stringify(state.lastRead));
  if (typeof window.saveUserDataToFirebase === 'function') window.saveUserDataToFirebase('quran_lastread', state.lastRead);
  markReadToday();

  // Stats
  if (!state.stats.surahsCompleted.includes(num)) {
    state.stats.surahsCompleted.push(num);
  }
  state.stats.versesRead += verses.length;
  saveStats();
  addActivity(`قرأ سورة ${surah.name_arabic || surah.name}`);

  renderVerses(verses, surah);
  updateGoalProgress();
}

function toArabicDigits(num) {
  return String(num).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function stripBasmala(text) {
  return text
    // fully vowelled
    .replace(/^بِسْمِ\s*اللَّهِ\s*الرَّحْمَٰنِ\s*الرَّحِيمِ\s*/u, '')
    // partially vowelled / mixed
    .replace(/^بِسْمِ\s*ٱللَّهِ\s*ٱلرَّحْمَٰنِ\s*ٱلرَّحِيمِ\s*/u, '')
    .replace(/^بِسْمِ\s*ٱللَّهِ\s*الرَّحْمَٰنِ\s*الرَّحِيمِ\s*/u, '')
    // plain (no vowels)
    .replace(/^بسم\s*الله\s*الرحمن\s*الرحيم\s*/u, '')
    // catch-all: anything starting with بسم up to الرحيم
    .replace(/^بِ?سْ?مِ?\s*[ٱا]لل[َّ]?هِ?\s*[ٱا]لرَّ?حْ?مَ?[ٰا]?نِ?\s*[ٱا]لرَّ?حِ?يمِ?\s*/u, '')
    .trim();
}

function renderVerses(verses, surah) {
  const vc = document.getElementById('verses-container');
  const showTafsir = state.tafsirVisible;
  const modeClass = state.readMode === 'mushaf' ? 'verse-mode-mushaf' : 'verse-mode-simple';
  vc.className = `verses-container ${modeClass}`;

  let html = '';
  // Show golden basmala header except for Al-Tawba (9)
  if (surah.number !== 9) html += `<div class="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>`;

  html += verses.map((v, i) => {
    const isBookmarked = state.bookmarks.some(b => b.surah === surah.number && b.verse === v.numberInSurah);
    const tafsir = getSimpleTafsir(surah.number, v.numberInSurah);
    const cleanText = (surah.number === 1) ? v.text : stripBasmala(v.text);
    const safeBookmarkText = cleanText.substring(0,50).replace(/'/g,"\'");
    return `
      <div class="verse-block ${isBookmarked ? 'bookmarked' : ''}" id="vb-${i}">
        <div class="verse-arabic-wrap">
          <div class="verse-actions-left">
            <button class="v-action-btn-top vplay-btn" id="vplay-${i}" data-verse-idx="${i}" onclick="handleVersePlay(this,${i},${surah.number},${v.numberInSurah})">▶</button>
            <button class="v-action-btn-top" onclick="toggleVerseTafsir(${i})" title="تفسير">💡</button>
          </div>
          <div class="verse-arabic" style="font-size:${state.quranFontSize}px">${cleanText}<span class="verse-num-badge">${toArabicDigits(v.numberInSurah)}</span></div>
        </div>
        <div class="verse-tafsir ${showTafsir ? 'visible' : ''}" id="tafsir-${i}" style="padding: 0 20px 14px; margin-top:-8px;">💡 ${tafsir}</div>
      </div>
    `;
  }).join('');
  vc.innerHTML = html;
}


// ===== PROFESSIONAL MUSHAF READER v2 =====
const MSHF_SURAH_PAGE = [0,1,2,50,77,106,128,151,177,187,208,221,235,249,255,262,267,282,293,305,312,322,332,342,350,359,367,377,385,396,404,411,415,418,428,434,440,446,453,458,467,477,483,489,496,499,502,507,511,515,518,520,523,526,528,531,534,537,542,545,549,551,553,554,556,558,560,562,564,566,568,570,572,574,575,577,578,580,582,583,585,586,587,587,589,590,591,591,592,593,594,595,595,596,596,597,597,598,599,599,600,600,601,601,601,602,602,602,603,603,603,604,604,604,604];
const MSHF_JUZ_PAGE  = [0,1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
const _mshfImgCache  = new Map();
const _mshfPreloading = new Set();

// State
const mshfState = {
  page: parseInt(localStorage.getItem('mshf_page')||'1',10),
  tab: 'surah',
  mode: localStorage.getItem('mshf_mode')||'normal', // normal | night | sepia
  bookmarks: JSON.parse(localStorage.getItem('mshf_bookmarks')||'[]'),
  animDir: null,
};

function mshfPageToJuz(p){ for(let j=30;j>=1;j--) if(p>=MSHF_JUZ_PAGE[j]) return j; return 1; }
function mshfPageToSurah(p){ for(let i=114;i>=1;i--) if(MSHF_SURAH_PAGE[i] && p>=MSHF_SURAH_PAGE[i]) return i; return 1; }

// Cache for page text data { page: { lines: [{verse_key, text}], surahs:[{num,name}], juz, hizb } }
const _mshfPageCache = new Map();
const _mshfPageInflight = new Map();

async function mshfFetchPage(p){
  if(_mshfPageCache.has(p)) return _mshfPageCache.get(p);
  if(_mshfPageInflight.has(p)) return _mshfPageInflight.get(p);
  const promise = (async () => {
    // Primary: api.quran.com
    const url = `https://api.quran.com/api/v4/verses/by_page/${p}?fields=text_uthmani,verse_key,chapter_id,page_number,juz_number,hizb_number&per_page=300`;
    const r = await fetch(url);
    if(!r.ok) throw new Error('api fail '+r.status);
    const data = await r.json();
    const verses = (data.verses||[]).map(v=>({
      key: v.verse_key,
      surah: v.chapter_id,
      ayah: parseInt(v.verse_key.split(':')[1],10),
      text: v.text_uthmani,
      juz: v.juz_number,
      hizb: v.hizb_number,
    }));
    const result = { page:p, verses };
    _mshfPageCache.set(p, result);
    return result;
  })();
  _mshfPageInflight.set(p, promise);
  promise.finally(()=>_mshfPageInflight.delete(p));
  return promise;
}

function mshfUpdateInfo(p){
  const juz     = mshfPageToJuz(p);
  const surahN  = mshfPageToSurah(p);
  const surahObj= (allSurahs||[]).find(s=>s.number===surahN);
  const sName   = surahObj?.name_arabic || `سورة ${surahN}`;
  const label   = `صفحة ${toArabicDigits(p)} من ٦٠٤  •  ${sName}  •  الجزء ${toArabicDigits(juz)}`;
  const el = document.getElementById('mshf-pinfo'); if(el) el.textContent = label;
  const lbl = document.getElementById('mshf-pg-lbl'); if(lbl) lbl.textContent = toArabicDigits(p);
  const inp = document.getElementById('mshf-pinput'); if(inp && document.activeElement!==inp) inp.value = p;
  const sld = document.getElementById('mshf-slider'); if(sld) sld.value = p;
  // Bookmark dot
  const dot = document.getElementById('mshf-bm-dot');
  if(dot) dot.classList.toggle('show', mshfState.bookmarks.includes(p));
  // Sync list highlights
  mshfRenderList('');
}

async function mshfLoadPage(p, dir=null){
  p = Math.max(1, Math.min(604, parseInt(p,10)||1));
  mshfState.page = p;
  localStorage.setItem('mshf_page', p);

  const wrap   = document.getElementById('mshf-book-wrap');
  const loader = document.getElementById('mshf-loading');
  const box    = document.getElementById('mshf-page-box');
  const img    = document.getElementById('mshf-page-img');
  const imgD   = document.getElementById('mshf-page-img-dual');
  // Hide legacy <img> elements — we render text now.
  if(img)  img.style.display = 'none';
  if(imgD) imgD.style.display = 'none';

  // Animation direction
  if(wrap && dir){
    wrap.classList.remove('mshf-anim-left','mshf-anim-right');
    void wrap.offsetWidth;
    wrap.classList.add(dir==='prev' ? 'mshf-anim-right' : 'mshf-anim-left');
  }

  mshfUpdateInfo(p);

  // Show loader if not cached
  const cached = _mshfPageCache.has(p);
  if(!cached && loader) loader.classList.remove('hidden');

  // Remove any prior error message
  const fb = document.getElementById('mshf-fallback-msg'); if(fb) fb.remove();

  try{
    const data = await mshfFetchPage(p);
    if(p !== mshfState.page) return; // user navigated away
    mshfRenderPageHTML(box, data);
    if(loader) loader.classList.add('hidden');
    mshfPreloadAdjacent(p);
    if(typeof mshfRenderDual === 'function') mshfRenderDual();
  } catch(err){
    if(loader) loader.classList.add('hidden');
    if(box){
      const existing = document.getElementById('mshf-fallback-msg');
      if(!existing){
        const msg = document.createElement('div');
        msg.id = 'mshf-fallback-msg';
        msg.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;color:var(--gold);font-family:"Cairo",sans-serif;gap:14px;min-height:300px';
        msg.innerHTML = `<div style="font-size:48px">📶</div><div style="font-size:16px;font-weight:700">تعذّر تحميل الصفحة</div><div style="font-size:13px;color:var(--text-muted)">تأكّد من الاتصال بالإنترنت ثم أعد المحاولة</div><button onclick="mshfRetryLoad()" style="background:linear-gradient(135deg,var(--gold),var(--gold-light));border:none;color:#0a0f1a;padding:10px 22px;border-radius:10px;font-family:'Cairo',sans-serif;font-weight:700;cursor:pointer;font-size:14px">🔄 إعادة المحاولة</button>`;
        box.appendChild(msg);
      }
    }
  }
}

// Convert digit to Arabic-Indic for ayah end markers
function _arDigit(n){
  const map=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(n).split('').map(d=> /[0-9]/.test(d) ? map[+d] : d).join('');
}

// Surah names mapping (lazy from allSurahs)
function _surahName(num){
  const s = (typeof allSurahs!=='undefined' && allSurahs) ? allSurahs.find(x=>x.number===num) : null;
  let name = (s ? (s.name_arabic||s.name||'') : '').trim();
  if(!name) return 'سُورَةُ رقم ' + num;
  // If the API name already starts with "سورة" / "سُورَة", use it as-is.
  // Otherwise, prepend "سُورَةُ".
  if(/^س[ُـ]?و[ـ]?ر[َـ]?ة/u.test(name)) return name;
  return 'سُورَةُ ' + name;
}

function mshfRenderPageHTML(box, data){
  if(!box) return;
  // Preserve the bookmark dot
  const dot = box.querySelector('#mshf-bm-dot');
  box.innerHTML = '';
  if(dot) box.appendChild(dot);

  const wrap = document.createElement('div');
  wrap.className = 'mshf-text-page';

  // === Compact info strip at the top of EVERY page ===
  // Shows the surah currently being read on this page + page/juz/hizb numbers.
  const firstVerse = data.verses[0];
  if(firstVerse){
    const pageNum = data.page || mshfState.page;
    const juz  = firstVerse.juz  || mshfPageToJuz(pageNum);
    const hizb = firstVerse.hizb || '';
    // If page contains multiple surahs, label with the dominant (first) one's name.
    const info = document.createElement('div');
    info.className = 'mshf-page-info';
    info.innerHTML = `
      <span class="mshf-pi-surah">${_surahName(firstVerse.surah)}</span>
      <span class="mshf-pi-sep">•</span>
      <span class="mshf-pi-item">صفحة ${_arDigit(pageNum)}</span>
      <span class="mshf-pi-sep">•</span>
      <span class="mshf-pi-item">جزء ${_arDigit(juz)}</span>
      ${hizb ? `<span class="mshf-pi-sep">•</span><span class="mshf-pi-item">حزب ${_arDigit(hizb)}</span>` : ''}
    `;
    wrap.appendChild(info);
  }

  // Group consecutive verses by surah. Show the BIG ornate banner ONLY when a
  // brand-new surah starts on this page (i.e. ayah === 1).
  let lastSurah = null;
  let currentSurahBlock = null;

  data.verses.forEach((v) => {
    if(v.surah !== lastSurah){
      lastSurah = v.surah;
      // Big ornate banner ONLY when surah truly starts here.
      if(v.ayah === 1){
        const header = document.createElement('div');
        header.className = 'mshf-surah-banner';
        header.innerHTML = `<span class="mshf-banner-deco">۞</span><span class="mshf-banner-name">${_surahName(v.surah)}</span><span class="mshf-banner-deco">۞</span>`;
        wrap.appendChild(header);
        // Bismillah for new surah (except At-Tawbah, and Al-Fatihah which contains it as ayah 1)
        if(v.surah !== 1 && v.surah !== 9){
          const bism = document.createElement('div');
          bism.className = 'mshf-bismillah';
          bism.textContent = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
          wrap.appendChild(bism);
        }
      } else if(currentSurahBlock !== null){
        // Continuing into a NEW surah mid-page — small inline marker, not a full banner.
        const mini = document.createElement('div');
        mini.className = 'mshf-surah-mini';
        mini.textContent = `— ${_surahName(v.surah)} —`;
        wrap.appendChild(mini);
      }
      currentSurahBlock = document.createElement('div');
      currentSurahBlock.className = 'mshf-verses-block';
      wrap.appendChild(currentSurahBlock);
    }
    const span = document.createElement('span');
    span.className = 'mshf-verse';
    span.dataset.surah = v.surah;
    span.dataset.ayah = v.ayah;
    span.dataset.key = v.key;
    span.innerHTML = `${v.text} <span class="mshf-ayah-num">${_arDigit(v.ayah)}</span> `;
    span.onclick = () => {
      try{ playVerseAudio(v.surah, v.ayah, 'mushaf'); } catch(e){}
    };
    currentSurahBlock.appendChild(span);
  });

  box.appendChild(wrap);
}

function mshfPreloadAdjacent(p){
  [p+1, p+2, p-1].forEach(n => {
    if(n<1 || n>604 || _mshfPageCache.has(n) || _mshfPageInflight.has(n)) return;
    mshfFetchPage(n).catch(()=>{});
  });
}

function mshfRetryLoad(){
  _mshfPageCache.delete(mshfState.page);
  const fb = document.getElementById('mshf-fallback-msg'); if(fb) fb.remove();
  mshfLoadPage(mshfState.page);
}

function mshfNext(){ mshfLoadPage(mshfState.page+1,'next'); }
function mshfPrev(){ mshfLoadPage(mshfState.page-1,'prev'); }
function mshfGoPage(v){ mshfLoadPage(v); }
function mshfOnSlider(v){ mshfLoadPage(v); }

function mshfTogglePanel(){
  const panel   = document.getElementById('mshf-panel');
  const overlay = document.getElementById('mshf-overlay');
  const isMob   = window.innerWidth <= 900;
  if(isMob){
    panel?.classList.toggle('mob-open');
    overlay?.classList.toggle('show');
  } else {
    document.getElementById('mshf-wrap')?.classList.toggle('panel-hidden');
  }
}
function mshfClosePanel(){
  document.getElementById('mshf-panel')?.classList.remove('mob-open');
  document.getElementById('mshf-overlay')?.classList.remove('show');
}

function mshfFullscreen(){
  // Use the whole reader wrap so toolbar (night mode, bookmark, etc.) stays visible
  const target = document.getElementById('mshf-wrap') || document.getElementById('mshf-stage');
  if(!target) return;
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if(!fsEl){ (target.requestFullscreen||target.webkitRequestFullscreen)?.call(target); }
  else { (document.exitFullscreen||document.webkitExitFullscreen)?.call(document); }
}

function mshfCycleMode(){
  const modes = ['normal','night','sepia'];
  const wrap = document.getElementById('mshf-wrap');
  const btn  = document.getElementById('mshf-mode-btn');
  let idx = modes.indexOf(mshfState.mode);
  idx = (idx+1)%modes.length;
  mshfState.mode = modes[idx];
  localStorage.setItem('mshf_mode', mshfState.mode);
  wrap?.classList.remove('night-mode','sepia-mode');
  if(mshfState.mode==='night')  { wrap?.classList.add('night-mode'); if(btn) btn.textContent='🌞 نهاري'; }
  else if(mshfState.mode==='sepia'){ wrap?.classList.add('sepia-mode'); if(btn) btn.textContent='📜 عادي'; }
  else { if(btn) btn.textContent='🌙 ليلي'; }
}

function mshfToggleBookmark(){
  const p = mshfState.page;
  const i = mshfState.bookmarks.indexOf(p);
  if(i>=0) mshfState.bookmarks.splice(i,1);
  else mshfState.bookmarks.push(p);
  localStorage.setItem('mshf_bookmarks', JSON.stringify(mshfState.bookmarks));
  const dot = document.getElementById('mshf-bm-dot');
  if(dot) dot.classList.toggle('show', mshfState.bookmarks.includes(p));
  showToast(i>=0 ? 'تم إلغاء حفظ الصفحة' : `🔖 تم حفظ صفحة ${toArabicDigits(p)}`);
}

function mshfGoLastPage(){
  // Prefer the last saved bookmark (from the 🔖 button), then fallback to last viewed page
  const bms = (mshfState && mshfState.bookmarks) || [];
  let target;
  if (bms.length) {
    target = bms[bms.length - 1];
  } else {
    target = parseInt(localStorage.getItem('mshf_page')||'1',10);
    showToast('لا توجد صفحة محفوظة — افتح آخر صفحة تصفّحت');
  }
  mshfLoadPage(target);
  mshfClosePanel();
}

// Panel tab & list
function mshfSwitchTab(tab){
  mshfState.tab = tab;
  ['surah','juz','page'].forEach(t=>{
    document.getElementById(`mptab-${t}`)?.classList.toggle('on', t===tab);
  });
  const s = document.getElementById('mshf-search'); if(s) s.value='';
  mshfRenderList('');
}

function mshfFilter(q){ mshfRenderList(q||''); }

function mshfRenderList(query){
  const list = document.getElementById('mshf-plist');
  if(!list) return;
  const q = (query||'').trim();
  let html = '';

  if(mshfState.tab==='surah'){
    const items = (allSurahs||[]).filter(su=>{
      if(!q) return true;
      return (su.name_arabic||su.name||'').includes(q)||String(su.number).includes(q)||(su.englishName||'').toLowerCase().includes(q.toLowerCase());
    });
    html = items.map(su=>{
      const page = MSHF_SURAH_PAGE[su.number]||1;
      const on   = mshfPageToSurah(mshfState.page)===su.number ? 'on':'';
      return `<div class="mshf-pitem ${on}" onclick="mshfLoadPage(${page});mshfClosePanel()">
        <div class="mshf-pitem-n">${toArabicDigits(su.number)}</div>
        <div class="mshf-pitem-info">
          <div class="mshf-pitem-name">${removeTashkeel(su.name_arabic||su.name)}</div>
          <div class="mshf-pitem-sub">${su.revelationType==='Meccan'?'مكية':'مدنية'} · ${toArabicDigits(su.numberOfAyahs)} آية · ص${toArabicDigits(page)}</div>
        </div>
      </div>`;
    }).join('');
  } else if(mshfState.tab==='juz'){
    const curJuz = mshfPageToJuz(mshfState.page);
    let arr = [];
    for(let j=1;j<=30;j++){
      if(q && !String(j).includes(q) && !toArabicDigits(j).includes(q)) continue;
      arr.push(j);
    }
    html = arr.map(j=>{
      const page = MSHF_JUZ_PAGE[j];
      const on = curJuz===j?'on':'';
      return `<div class="mshf-pitem ${on}" onclick="mshfLoadPage(${page});mshfClosePanel()">
        <div class="mshf-pitem-n">${toArabicDigits(j)}</div>
        <div class="mshf-pitem-info">
          <div class="mshf-pitem-name">الجزء ${toArabicDigits(j)}</div>
          <div class="mshf-pitem-sub">يبدأ من ص${toArabicDigits(page)}</div>
        </div>
      </div>`;
    }).join('');
  } else {
    // Pages tab - show bookmarks + search
    const bms = mshfState.bookmarks;
    if(!q && bms.length){
      html += `<div style="font-size:11px;color:var(--gold);padding:6px 8px 4px;font-weight:700">📌 الصفحات المحفوظة</div>`;
      html += bms.map(p=>{
        const on = mshfState.page===p?'on':'';
        return `<div class="mshf-pitem ${on}" onclick="mshfLoadPage(${p});mshfClosePanel()">
          <div class="mshf-pitem-n">${toArabicDigits(p)}</div>
          <div class="mshf-pitem-info">
            <div class="mshf-pitem-name">صفحة ${toArabicDigits(p)}</div>
            <div class="mshf-pitem-sub">الجزء ${toArabicDigits(mshfPageToJuz(p))}</div>
          </div>
        </div>`;
      }).join('');
      html += `<div style="font-size:11px;color:var(--text-muted);padding:10px 8px 4px;font-weight:700;border-top:1px solid var(--border);margin-top:8px">كل الصفحات</div>`;
    }
    let pages = [];
    for(let p=1;p<=604;p++){
      if(q && !String(p).includes(q) && !toArabicDigits(p).includes(q)) continue;
      pages.push(p);
      if(!q && pages.length>120) break;
    }
    html += pages.map(p=>{
      const on = mshfState.page===p?'on':'';
      const su = mshfPageToSurah(p);
      const sn = (allSurahs||[]).find(x=>x.number===su)?.name_arabic || `سورة ${su}`;
      return `<div class="mshf-pitem ${on}" onclick="mshfLoadPage(${p});mshfClosePanel()">
        <div class="mshf-pitem-n">${toArabicDigits(p)}</div>
        <div class="mshf-pitem-info">
          <div class="mshf-pitem-name">صفحة ${toArabicDigits(p)}</div>
          <div class="mshf-pitem-sub">${sn} · ج${toArabicDigits(mshfPageToJuz(p))}</div>
        </div>
      </div>`;
    }).join('');
    if(!q && pages.length===120)
      html += `<div style="text-align:center;color:var(--text-muted);padding:10px;font-size:11px">اكتب رقم للبحث...</div>`;
  }
  list.innerHTML = html || `<div style="text-align:center;color:var(--text-muted);padding:20px">لا نتائج</div>`;
}

async function mshfPlayPage(){
  const p = mshfState.page;
  showToast('⏳ جارٍ تحميل الصفحة للاستماع...');
  try{
    // Use same mshfFetchPage (cached, correct fields: .surah .ayah)
    const data = await mshfFetchPage(p);
    const ayahs = data.verses;
    if(!ayahs?.length){ showToast('تعذّر جلب آيات الصفحة'); return; }

    const first = ayahs[0];
    const last  = ayahs[ayahs.length - 1];
    state.pagePlayBoundary = {
      surah: first.surah,
      startVerse: first.ayah,
      endSurah: last.surah,
      endVerse: last.ayah,
      pageNum: p,
      ayahList: ayahs.map(a => ({ surah: a.surah, verse: a.ayah })),
      ayahIndex: 0  // 0 = first ayah is currently playing; onAudioEnd will increment to 1
    };
    state.autoPlay = true;
    document.getElementById('auto-btn')?.classList.add('on');
    playVerseAudio(first.surah, first.ayah, 'mushaf');
    showToast(`🎧 استماع صفحة ${toArabicDigits(p)}`);
  } catch(e){ showToast('تعذّر تشغيل الصفحة'); }
}

// Apply saved mode on load
function mshfApplyMode(){
  const wrap = document.getElementById('mshf-wrap');
  const btn  = document.getElementById('mshf-mode-btn');
  wrap?.classList.remove('night-mode','sepia-mode');
  if(mshfState.mode==='night')  { wrap?.classList.add('night-mode'); if(btn) btn.textContent='🌞 نهاري'; }
  else if(mshfState.mode==='sepia'){ wrap?.classList.add('sepia-mode'); if(btn) btn.textContent='📜 عادي'; }
}

// Initialize mushaf reader when screen becomes active
function initMushafReader(){
  mshfApplyMode();
  mshfSwitchTab('surah');
  mshfLoadPage(mshfState.page);
}

// Keyboard nav
document.addEventListener('keydown', e=>{
  if(!document.getElementById('screen-original')?.classList.contains('active')) return;
  if(e.target?.tagName==='INPUT') return;
  if(e.key==='ArrowRight') mshfPrev();
  else if(e.key==='ArrowLeft') mshfNext();
  else if(e.key==='f'||e.key==='F') mshfFullscreen();
  else if(e.key==='n'||e.key==='N') mshfCycleMode();
});

// Touch swipe
(function(){
  let sx=0,sy=0;
  document.addEventListener('touchstart', e=>{
    if(!document.getElementById('screen-original')?.classList.contains('active')) return;
    sx=e.changedTouches[0].screenX; sy=e.changedTouches[0].screenY;
  },{passive:true});
  document.addEventListener('touchend', e=>{
    if(!document.getElementById('screen-original')?.classList.contains('active')) return;
    const dx=e.changedTouches[0].screenX-sx, dy=e.changedTouches[0].screenY-sy;
    if(Math.abs(dx)<45||Math.abs(dy)>Math.abs(dx)*1.4) return;
    if(dx>0) mshfPrev(); else mshfNext();
  },{passive:true});
})();

// Keep backward compat aliases
function renderOriginalPage(p){ mshfLoadPage(p); }
function nextOriginalPage(){ mshfNext(); }
function prevOriginalPage(){ mshfPrev(); }
function markOriginalPage(){ mshfToggleBookmark(); }
function openLastOriginalPage(){ mshfGoLastPage(); }
function origSwitchTab(t){ mshfSwitchTab(t); }
function origFilter(q){ mshfFilter(q); }
function origRenderList(q){ mshfRenderList(q); }
function toggleOrigSidebar(){ mshfTogglePanel(); }
function toggleOriginalFullscreen(){ mshfFullscreen(); }
function playOriginalPageAudio(){ mshfPlayPage(); }

// Keep these for mushaf text reader (other screen)
const SURAH_START_PAGE = MSHF_SURAH_PAGE;
const JUZ_START_PAGE   = MSHF_JUZ_PAGE;
function pageToJuz(p){ return mshfPageToJuz(p); }
function pageToSurah(p){ return mshfPageToSurah(p); }


function toggleTafsir() {
  state.tafsirVisible = !state.tafsirVisible;
  document.getElementById('tafsir-btn').classList.toggle('active-ctrl', state.tafsirVisible);
  document.querySelectorAll('.verse-tafsir').forEach(el => el.classList.toggle('visible', state.tafsirVisible));
}

function toggleVerseTafsir(i) { document.getElementById(`tafsir-${i}`)?.classList.toggle('visible'); }

function toggleReadMode() {
  state.readMode = state.readMode === 'mushaf' ? 'simple' : 'mushaf';
  document.getElementById('mode-btn').querySelector('span').textContent = state.readMode === 'mushaf' ? 'مصحف' : 'بسيط';
  document.getElementById('mode-btn').classList.toggle('active-ctrl', state.readMode === 'simple');
  if (state.currentVerses.length && state.currentSurah) renderVerses(state.currentVerses, state.currentSurah);
}

function changeFontSize(delta) {
  state.quranFontSize = Math.max(16, Math.min(48, state.quranFontSize + delta));
  document.getElementById('font-size-label').textContent = state.quranFontSize;
  document.querySelectorAll('.verse-arabic').forEach(el => { el.style.fontSize = state.quranFontSize + 'px'; });
  document.documentElement.style.setProperty('--quran-size', state.quranFontSize + 'px');
}

function playCurrentSurah() {
  if (!state.currentSurah || !state.currentVerses.length) { showToast('اختر سورة أولاً'); return; }
  state.autoPlay = true;
  document.getElementById('auto-btn').classList.add('on');
  playVerseAudio(state.currentSurah.number, state.currentVerses[0].numberInSurah, 'surah');
  state.currentVerseIdx = 0;
}

// ===== BOOKMARKS =====
function toggleBookmark(surahNum, verseNum, text, idx) {
  const existing = state.bookmarks.findIndex(b => b.surah === surahNum && b.verse === verseNum);
  if (existing >= 0) {
    state.bookmarks.splice(existing, 1);
    showToast('تمّ حذف الآية من المحفوظات');
    const bmOff=document.getElementById(`bm-${idx}`); if(bmOff){bmOff.innerHTML='☆'; bmOff.classList.remove('gold');}
    document.getElementById(`vb-${idx}`)?.classList.remove('bookmarked');
  } else {
    state.bookmarks.push({ surah: surahNum, verse: verseNum, surahName: state.currentSurah?.name_arabic || '', text, date: new Date().toISOString() });
    showToast('⭐ تمّ حفظ الآية');
    const bmOn=document.getElementById(`bm-${idx}`); if(bmOn){bmOn.innerHTML='⭐'; bmOn.classList.add('gold');}
    document.getElementById(`vb-${idx}`)?.classList.add('bookmarked');
  }
  localStorage.setItem('quran_bookmarks', JSON.stringify(state.bookmarks));
  if (typeof window.saveUserDataToFirebase === 'function') window.saveUserDataToFirebase('quran_bookmarks', state.bookmarks);
  updateHomeLabels();
  updateTasbihUI();
}

function renderBookmarks() {
  const grid = document.getElementById('bookmarks-grid');
  if (!state.bookmarks.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div><h3>لا توجد آيات محفوظة بعد</h3><p style="color:var(--text-muted);margin-top:8px">اضغط على ☆ بجانب أي آية لحفظها هنا</p></div>`;
    return;
  }
  grid.innerHTML = state.bookmarks.map((b, i) => `
    <div class="bookmark-card">
      <button class="remove-bookmark" onclick="removeBookmarkFromScreen(${i})">✕</button>
      <div class="bookmark-ref">${b.surahName} · الآية ${b.verse}</div>
      <div class="bookmark-arabic">${b.text}...</div>
      <button class="v-action-btn" style="margin-top:8px" onclick="goToSurahVerse(${b.surah},${b.verse})">📖 اذهب للآية</button>
    </div>
  `).join('');
}

function removeBookmarkFromScreen(i) {
  state.bookmarks.splice(i, 1);
  localStorage.setItem('quran_bookmarks', JSON.stringify(state.bookmarks));
  if (typeof window.saveUserDataToFirebase === 'function') window.saveUserDataToFirebase('quran_bookmarks', state.bookmarks);
  renderBookmarks();
  updateHomeLabels();
}

function goToSurahVerse(surahNum) { showScreen('quran'); loadSurah(surahNum); }

// ===== STREAK =====
function markReadToday() {
  const isLoggedIn = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
  if (!isLoggedIn) { updateStreakUI(); return; }
  const today = new Date().toDateString();
  if (state.streak.lastDate === today) return;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (state.streak.lastDate === yesterday.toDateString()) { state.streak.count++; }
  else if (state.streak.lastDate !== today) { state.streak.count = 1; state.streak.days = []; }
  state.streak.lastDate = today;
  const dayOfWeek = new Date().getDay();
  if (!state.streak.days.includes(dayOfWeek)) state.streak.days.push(dayOfWeek);
  localStorage.setItem('quran_streak', JSON.stringify(state.streak));
  if (typeof window.saveUserDataToFirebase === 'function') window.saveUserDataToFirebase('quran_streak', state.streak);
  updateStreakUI();
}

function updateStreakUI() {
  const isLoggedIn = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
  const countEl = document.getElementById('streak-count');
  const dotsEl = document.getElementById('streak-dots');
  const badge = document.getElementById('streak-badge');
  const days = ['أ','إ','ث','أ','خ','ج','س'];

  if (!isLoggedIn) {
    if (countEl) countEl.textContent = '0';
    let dots = '';
    for (let i = 0; i < 7; i++) {
      dots += `<div class="streak-dot">${days[i]}</div>`;
    }
    if (dotsEl) dotsEl.innerHTML = dots;
    if (badge) badge.innerHTML = '';
    return;
  }

  if (countEl) countEl.textContent = state.streak.count;
  let dots = '';
  for (let i = 0; i < 7; i++) {
    const done = state.streak.days.includes(i);
    dots += `<div class="streak-dot ${done ? 'done' : ''}">${days[i]}</div>`;
  }
  if (dotsEl) dotsEl.innerHTML = dots;
  if (badge) {
    if (state.streak.count >= 7) badge.innerHTML = '<div class="badge">🏅 أسبوع مداومة</div>';
    else if (state.streak.count >= 3) badge.innerHTML = '<div class="badge">⭐ 3 أيام</div>';
    else badge.innerHTML = '';
  }
}

// ===== HOME LABELS =====
function updateHomeLabels() {
  // Detect login state via auth.js (firebase auth)
  const isLoggedIn = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
  function en(n) { return String(n); } // always English digits

  if (isLoggedIn) {
    const nudge = document.getElementById('stats-login-nudge');
    if (nudge) nudge.style.display = 'none';
    const sv = document.getElementById('stat-verses'); if (sv) sv.textContent = en(state.stats.versesRead);
    const ss = document.getElementById('stat-surahs'); if (ss) ss.textContent = en(state.stats.surahsCompleted.length);
    const sk = document.getElementById('stat-streak'); if (sk) sk.textContent = en(state.streak.count);
    // memo stats (stat-memorized-home) are updated by memorize.js syncToGlobalStats — don't override
  } else {
    const nudge = document.getElementById('stats-login-nudge');
    if (nudge) nudge.style.display = 'flex';
    ['stat-verses','stat-surahs','stat-memorized-home'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '0';
    });
    const sk = document.getElementById('stat-streak'); if (sk) sk.textContent = '0';
  }
  if (state.lastRead) { const lr = document.getElementById('last-read-label'); if (lr) lr.textContent = state.lastRead.surahName; }
  const activeGoals = state.goals.filter(g => !g.done).length;
  const gl = document.getElementById('goals-quick-label'); if (gl) gl.textContent = activeGoals ? `${activeGoals} هدف نشط` : 'ضع هدفاً الآن';
}

function openLastRead() {
  if (!state.lastRead) { showToast('لم تبدأ القراءة بعد'); return; }
  showScreen('quran');
  loadSurah(state.lastRead.surahNum);
}

function startListen() {
  showScreen('quran');
  if (state.currentSurah && state.currentVerses.length) {
    playCurrentSurah();
    return;
  }

  const fallbackSurah = { number: 1, name_arabic: 'الفاتحة', name: 'Al-Faatiha', revelationType: 'Meccan', numberOfAyahs: 7 };
  state.currentSurah = allSurahs.find(s => s.number === 1) || fallbackSurah;
  state.currentVerseIdx = 0;
  playVerseAudio(1, 1, 'surah');

  if (allSurahs.length) {
    loadSurah(1);
  } else {
    fetchSurahs().then(surahs => {
      allSurahs = surahs;
      state.surahs = surahs;
      if (surahs.length) {
        renderSurahList(surahs);
        loadSurah(1);
      }
    });
  }
}

// ===== SEARCH =====
function searchTopic(topic) {
  document.getElementById('search-input').value = topic;
  doSearch();
}

function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const results = document.getElementById('search-results');

  // Check topic keywords
  const topicKey = Object.keys(TOPIC_VERSES).find(k => q.includes(k));
  if (topicKey) {
    const verses = TOPIC_VERSES[topicKey];
    results.innerHTML = `<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">نتائج موضوع: <strong style="color:var(--gold)">${topicKey}</strong></div>` + verses.map(v => `
      <div class="result-card" onclick="goToSurahVerse(${v.surah},${v.verse})">
        <div class="result-ref">📍 ${v.ref}</div>
        <div class="result-arabic">${v.ar}</div>
        <div class="result-tafsir">💡 ${v.t}</div>
      </div>
    `).join('');
    return;
  }

  // Search in loaded verses
  if (!state.currentVerses.length && !allSurahs.length) {
    results.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>ابحث بكلمة قرآنية أو موضوع من الموضوعات أعلاه</h3></div>';
    return;
  }

  const found = [];
  // Search across topic verses
  for (const [topic, verses] of Object.entries(TOPIC_VERSES)) {
    for (const v of verses) {
      if (v.ar.includes(q) || v.t.includes(q)) found.push(v);
    }
  }

  if (!found.length) {
    results.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>لم يتم العثور على نتائج لـ "${q}"</h3><p>جرّب موضوعاً من الأعلى</p></div>`;
  } else {
    results.innerHTML = found.map(v => `
      <div class="result-card">
        <div class="result-ref">📍 ${v.ref}</div>
        <div class="result-arabic">${v.ar}</div>
        <div class="result-tafsir">💡 ${v.t}</div>
      </div>
    `).join('');
  }
}

// ===== GOALS =====
const GOAL_TEMPLATES = {
  khatma30: { title: 'ختم القرآن في 30 يوم', desc: '~208 آية يومياً', total: 6236, daily: 208, icon: '📚' },
  khatma60: { title: 'ختم القرآن في 60 يوم', desc: '~104 آية يومياً', total: 6236, daily: 104, icon: '📖' },
  amma: { title: 'حفظ جزء عم', desc: '37 سورة • 564 آية', total: 564, daily: 20, icon: '🧠' },
  daily10: { title: 'ورد يومي — 10 آيات', desc: 'يومياً', total: 3650, daily: 10, icon: '⚡' },
};

function openGoalModal() { document.getElementById('goal-modal').classList.add('open'); }
function closeGoalModal() { document.getElementById('goal-modal').classList.remove('open'); state.selectedGoalType = null; document.querySelectorAll('.goal-option').forEach(el => el.classList.remove('selected')); }

function selectGoalOption(type) {
  state.selectedGoalType = type;
  document.querySelectorAll('.goal-option').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

function confirmGoal() {
  if (!state.selectedGoalType) { showToast('اختر هدفاً أولاً'); return; }
  const tpl = GOAL_TEMPLATES[state.selectedGoalType];
  const newGoal = {
    id: Date.now(),
    type: state.selectedGoalType,
    title: tpl.title,
    desc: tpl.desc,
    total: tpl.total,
    daily: tpl.daily,
    icon: tpl.icon,
    progress: 0,
    startDate: new Date().toISOString(),
    done: false,
  };
  state.goals.push(newGoal);
  saveGoals();
  closeGoalModal();
  renderGoals();
  showToast(`🎯 تم إنشاء الهدف: ${tpl.title}`);
  addActivity(`أضاف هدفاً: ${tpl.title}`);
}

function renderGoals() {
  const grid = document.getElementById('goals-grid');
  if (!state.goals.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎯</div><h3>لا توجد أهداف بعد</h3><p style="color:var(--text-muted);margin-top:8px">اضغط على "هدف جديد" لتبدأ رحلتك</p></div>`;
    return;
  }
  grid.innerHTML = state.goals.map((g, i) => {
    const pct = Math.min(100, Math.round((g.progress / g.total) * 100));
    return `
      <div class="goal-card ${!g.done ? 'active-goal' : ''}">
        <div style="font-size:28px;margin-bottom:8px">${g.icon}</div>
        <h3>${g.title}</h3>
        <p>${g.desc}</p>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-label">
          <span>${g.progress} / ${g.total}</span>
          <span>${pct}%</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="goal-btn" onclick="progressGoal(${i},${g.daily})">+${g.daily} يومياً ✓</button>
          <button class="goal-btn secondary" onclick="removeGoal(${i})">حذف</button>
        </div>
      </div>
    `;
  }).join('');

  // Daily plan
  const active = state.goals.filter(g => !g.done);
  if (active.length) {
    document.getElementById('daily-plan-section').style.display = 'block';
    document.getElementById('daily-plan-content').innerHTML = active.map(g => `
      <div class="goal-card">
        <div style="font-size:22px;margin-bottom:8px">${g.icon}</div>
        <h3>اليوم: ${g.daily} آية</h3>
        <p>${g.title}</p>
      </div>
    `).join('');
  }
}

function progressGoal(i, amount) {
  state.goals[i].progress = Math.min(state.goals[i].total, state.goals[i].progress + amount);
  if (state.goals[i].progress >= state.goals[i].total) {
    state.goals[i].done = true;
    showToast('🎉 مبارك! أتممت هدفك');
    addActivity(`أتم هدف: ${state.goals[i].title}`);
  } else {
    showToast(`✓ تقدم محفوظ — ${state.goals[i].progress}/${state.goals[i].total}`);
  }
  saveGoals();
  renderGoals();
}

function removeGoal(i) { state.goals.splice(i, 1); saveGoals(); renderGoals(); }
function saveGoals() { localStorage.setItem('quran_goals', JSON.stringify(state.goals)); }

function updateGoalProgress() {
  state.goals.forEach((g, i) => {
    if (!g.done) state.goals[i].progress = Math.min(g.total, g.progress + 5);
  });
  saveGoals();
}

// ===== MEMORIZE =====
function populateMemoSurahList() {
  const sel = document.getElementById('memo-surah-select');
  if (sel.options.length > 1) return;
  allSurahs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.number;
    opt.textContent = `${s.number}. ${s.name_arabic || s.name}`;
    sel.appendChild(opt);
  });
}

async function loadMemoSurah() {
  const num = parseInt(document.getElementById('memo-surah-select').value);
  if (!num) return;
  const verses = await fetchVerses(num);
  const surah = allSurahs.find(s => s.number === num);
  state.memo = { verses, idx: 0, correct: 0, wrong: 0, revealed: false, surah };
  showMemoVerse();
  document.getElementById('memo-controls').style.display = 'flex';
}

function showMemoVerse() {
  const { verses, idx, surah } = state.memo;
  if (!verses.length) return;
  const v = verses[idx];
  document.getElementById('memo-ref').textContent = `${surah?.name_arabic || ''} · الآية ${v.numberInSurah}`;
  const words = v.text.split(' ');
  const half = Math.ceil(words.length / 2);
  const visible = words.slice(0, half).join(' ');
  const hidden = words.slice(half).join(' ');
  document.getElementById('memo-text').innerHTML = `${visible} <span class="memo-hidden" id="hidden-part">${hidden}</span>`;
  document.getElementById('memo-reveal-area').innerHTML = '';
  state.memo.revealed = false;
  updateMemoStats();
}

function revealVerse() {
  document.getElementById('hidden-part').style.background = 'transparent';
  document.getElementById('hidden-part').style.color = 'inherit';
  document.getElementById('hidden-part').style.animation = 'none';
  state.memo.revealed = true;
}

function markCorrect() { state.memo.correct++; state.stats.memorized++; saveStats(); nextMemo(); }
function markWrong() { state.memo.wrong++; nextMemo(); }

function nextMemo() {
  const { verses } = state.memo;
  state.memo.idx = (state.memo.idx + 1) % verses.length;
  showMemoVerse();
}

function startQuiz() {
  if (!state.memo.verses.length) { showToast('اختر سورة أولاً'); return; }
  const v = state.memo.verses[Math.floor(Math.random() * state.memo.verses.length)];
  const words = v.text.split(' ');
  const cutIdx = Math.floor(words.length / 2);
  const question = words.slice(0, cutIdx).join(' ') + ' ...';
  const correct = v.text;
  document.getElementById('memo-ref').textContent = `اكمل الآية من سورة ${state.memo.surah?.name_arabic || ''}`;
  document.getElementById('memo-text').textContent = question;
  document.getElementById('memo-reveal-area').innerHTML = `<div style="margin-top:16px;font-size:13px;color:var(--text-muted)">اضغط "أظهر" لترى الإجابة</div>`;
}

function updateMemoStats() {
  document.getElementById('memo-correct').textContent = state.memo.correct;
  document.getElementById('memo-wrong-count').textContent = state.memo.wrong;
  document.getElementById('memo-total').textContent = state.memo.verses.length;
}

// ===== AZKAR / DUAS / TASBIH DATA - COMPREHENSIVE =====
const AZKAR = {
  morning: [
    {n:'مرة', text:'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ\nاللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ', benefit:'آية الكرسي — من قالها حين يصبح أُجير من الجن حتى يمسي'},
    {n:'3 مرات', text:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', benefit:'سورة الإخلاص — تكفيه من كل شيء'},
    {n:'3 مرات', text:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', benefit:'سورة الفلق — استعاذة من الشرور'},
    {n:'3 مرات', text:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ', benefit:'سورة الناس — استعاذة من شر الوساوس'},
    {n:'مرة', text:'أَصْبَحْنَا وَأَصْبَحَ المُلْكُ لِلَّهِ، وَالحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ،\nرَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا اليَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا اليَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الكَسَلِ وَسُوءِ الكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي القَبْرِ', benefit:'افتتاح اليوم بالتوحيد والحمد والاستعاذة'},
    {n:'مرة', text:'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', benefit:'إقرار بأن كل شؤوننا بيد الله'},
    {n:'مرة', text:'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', benefit:'سيد الاستغفار — من قاله موقناً فمات من يومه دخل الجنة'},
    {n:'4 مرات', text:'اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ', benefit:'من قالها أعتقه الله ربعَه من النار، فإن قالها أربعاً أعتقه الله من النار'},
    {n:'3 مرات', text:'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الحَمْدُ وَلَكَ الشُّكْرُ', benefit:'من قالها حين يصبح فقد أدى شكر يومه'},
    {n:'3 مرات', text:'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ.\nاللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الكُفْرِ وَالفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ القَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ', benefit:'دعاء بالعافية وحفظ الجوارح'},
    {n:'7 مرات', text:'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ العَرْشِ العَظِيمِ', benefit:'كفاه الله ما أهمه من أمر الدنيا والآخرة'},
    {n:'مرة', text:'اللَّهُمَّ إِنِّي أَسْأَلُكَ العَفْوَ وَالعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ العَفْوَ وَالعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي،\nاللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي', benefit:'حفظ من جميع الجهات وحصن من الشرور'},
    {n:'مرة', text:'اللَّهُمَّ عَالِمَ الغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ', benefit:'استعاذة شاملة من شر النفس والشيطان'},
    {n:'3 مرات', text:'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ العَلِيمُ', benefit:'لم يضره شيء حتى يمسي'},
    {n:'3 مرات', text:'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا', benefit:'كان حقاً على الله أن يرضيه يوم القيامة'},
    {n:'مرة', text:'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ', benefit:'دعاء جامع لصلاح جميع الأحوال'},
    {n:'مرة', text:'أَصْبَحْنَا وَأَصْبَحَ المُلْكُ لِلَّهِ رَبِّ العَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا اليَوْمِ: فَتْحَهُ، وَنَصْرَهُ، وَنُورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ', benefit:'طلب الخير كله في اليوم والاستعاذة من شره'},
    {n:'مرة', text:'أَصْبَحْنَا عَلَى فِطْرَةِ الإِسْلَامِ، وَعَلَى كَلِمَةِ الإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ المُشْرِكِينَ', benefit:'تجديد الإيمان والانتساب للملة الحنيفية'},
    {n:'مرة', text:'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا', benefit:'دعاء جامع للعلم والرزق والعمل الصالح'},
    {n:'3 مرات', text:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ', benefit:'تعدل تسبيحاً كثيراً جزيلاً'},
    {n:'10 مرات', text:'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ، يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', benefit:'كتب له عشر حسنات ومحي عنه عشر سيئات ورفع عشر درجات'},
    {n:'100 مرة', text:'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', benefit:'حرز من الشيطان يومه ذلك وكانت له عدل عشر رقاب'},
    {n:'100 مرة', text:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', benefit:'حُطَّت خطاياه وإن كانت مثل زبد البحر'},
    {n:'مرة', text:'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الهَمِّ وَالحَزَنِ، وَأَعُوذُ بِكَ مِنَ العَجْزِ وَالكَسَلِ، وَأَعُوذُ بِكَ مِنَ الجُبْنِ وَالبُخْلِ، وَأَعُوذُ بِكَ مِنَ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ', benefit:'استعاذة جامعة من آفات النفس والبدن'},
    {n:'مرة', text:'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الكُفْرِ وَالفَقْرِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ القَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ', benefit:'استعاذة من أعظم البلايا'},
    {n:'مرة', text:'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ', benefit:'الصلاة على النبي ﷺ تُنير القلب وتفتح الأبواب'},
    {n:'10 مرات', text:'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', benefit:'من صلّى عليّ حين يصبح عشراً وحين يمسي عشراً أدركته شفاعتي'},
    {n:'33 مرة', text:'سُبْحَانَ اللَّهِ', benefit:'تسبيح يملأ الميزان'},
    {n:'33 مرة', text:'الْحَمْدُ لِلَّهِ', benefit:'الحمد لله تملأ الميزان'},
    {n:'33 مرة', text:'اللَّهُ أَكْبَرُ', benefit:'التكبير يملأ ما بين السماء والأرض'},
    {n:'مرة', text:'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', benefit:'تتمة التسبيح والتحميد والتكبير بكلمة التوحيد'},
    {n:'مرة', text:'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ المُتَطَهِّرِينَ', benefit:'دعاء للثبات على التوبة والطهارة'},
    {n:'مرة', text:'اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي', benefit:'دعاء الهداية والسداد في الأقوال والأفعال'},
    {n:'مرة', text:'اللَّهُمَّ إِنِّي أَسْأَلُكَ الجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ', benefit:'من سأل الله الجنة ثلاثاً، قالت الجنة: اللهم أدخله الجنة'},
    {n:'مرة', text:'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنَ الخَيْرِ كُلِّهِ عَاجِلِهِ وَآجِلِهِ، مَا عَلِمْتُ مِنْهُ وَمَا لَمْ أَعْلَمْ، وَأَعُوذُ بِكَ مِنَ الشَّرِّ كُلِّهِ عَاجِلِهِ وَآجِلِهِ، مَا عَلِمْتُ مِنْهُ وَمَا لَمْ أَعْلَمْ', benefit:'دعاء جامع لطلب الخير كله والاستعاذة من الشر كله'},
    {n:'مرة', text:'اللَّهُمَّ أَلِّفْ بَيْنَ قُلُوبِنَا، وَأَصْلِحْ ذَاتَ بَيْنِنَا، وَاهْدِنَا سُبُلَ السَّلَامِ، وَنَجِّنَا مِنَ الظُّلُمَاتِ إِلَى النُّورِ، وَجَنِّبْنَا الفَوَاحِشَ مَا ظَهَرَ مِنْهَا وَمَا بَطَنَ، وَبَارِكْ لَنَا فِي أَسْمَاعِنَا وَأَبْصَارِنَا وَقُلُوبِنَا وَأَزْوَاجِنَا وَذُرِّيَّاتِنَا', benefit:'دعاء جامع للألفة والهداية والبركة'},
    {n:'100 مرة', text:'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', benefit:'الاستغفار سبب لتفريج الكروب وسعة الرزق ونزول الغيث'},
  ],
  evening: [
    {n:'مرة', text:'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ\nاللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ', benefit:'آية الكرسي — من قالها حين يمسي أُجير من الجن حتى يصبح'},
    {n:'3 مرات', text:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', benefit:'سورة الإخلاص — تكفيه من كل شيء'},
    {n:'3 مرات', text:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', benefit:'سورة الفلق — حفظ من الشرور الظاهرة والخفية'},
    {n:'3 مرات', text:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ', benefit:'سورة الناس — استعاذة من وساوس الجن والإنس'},
    {n:'مرة', text:'أَمْسَيْنَا وَأَمْسَى المُلْكُ لِلَّهِ، وَالحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ،\nرَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الكَسَلِ وَسُوءِ الكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي القَبْرِ', benefit:'افتتاح المساء بالتوحيد والاستعاذة الشاملة'},
    {n:'مرة', text:'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ المَصِيرُ', benefit:'إقرار بأن الحياة والموت والمصير بيد الله'},
    {n:'مرة', text:'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', benefit:'سيد الاستغفار — من قاله موقناً فمات من ليلته دخل الجنة'},
    {n:'4 مرات', text:'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ', benefit:'من قالها أعتقه الله ربعَه من النار'},
    {n:'3 مرات', text:'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الحَمْدُ وَلَكَ الشُّكْرُ', benefit:'أداء شكر الليلة ومن أدّاه فقد أدى شكر يومه'},
    {n:'3 مرات', text:'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ.\nاللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الكُفْرِ وَالفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ القَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ', benefit:'دعاء بالعافية وحفظ الجوارح والسلامة من الفتن'},
    {n:'7 مرات', text:'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ العَرْشِ العَظِيمِ', benefit:'كفاه الله ما أهمه من أمر الدنيا والآخرة'},
    {n:'مرة', text:'اللَّهُمَّ إِنِّي أَسْأَلُكَ العَفْوَ وَالعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ العَفْوَ وَالعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي،\nاللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي', benefit:'حصن متكامل من الجهات الست'},
    {n:'مرة', text:'اللَّهُمَّ عَالِمَ الغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ', benefit:'استعاذة شاملة من الشر الداخلي والخارجي'},
    {n:'3 مرات', text:'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ العَلِيمُ', benefit:'لم يضره شيء حتى يصبح'},
    {n:'3 مرات', text:'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا', benefit:'كان حقاً على الله أن يرضيه يوم القيامة'},
    {n:'3 مرات', text:'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', benefit:'لم يضره سُمٌّ ولا هامَّة ولا سحر تلك الليلة'},
    {n:'مرة', text:'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ', benefit:'دعاء جامع لصلاح جميع الأحوال'},
    {n:'مرة', text:'أَمْسَيْنَا وَأَمْسَى المُلْكُ لِلَّهِ رَبِّ العَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ: فَتْحَهَا، وَنَصْرَهَا، وَنُورَهَا، وَبَرَكَتَهَا، وَهُدَاهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا', benefit:'طلب الخير كله في الليلة والاستعاذة من شرها'},
    {n:'مرة', text:'أَمْسَيْنَا عَلَى فِطْرَةِ الإِسْلَامِ، وَعَلَى كَلِمَةِ الإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ المُشْرِكِينَ', benefit:'تجديد الإيمان والانتساب للملة الحنيفية بعد انتهاء اليوم'},
    {n:'100 مرة', text:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', benefit:'حُطَّت خطاياه وإن كانت مثل زبد البحر'},
    {n:'10 مرات', text:'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', benefit:'كانت له عدل عشر رقاب وكتبت له مائة حسنة'},
    {n:'مرة', text:'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ غَضَبِهِ وَعِقَابِهِ، وَشَرِّ عِبَادِهِ، وَمِنْ هَمَزَاتِ الشَّيَاطِينِ وَأَنْ يَحْضُرُونِ', benefit:'استعاذة من غضب الله ومن شر الشياطين وعباده الأشرار'},
    {n:'مرة', text:'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الهَمِّ وَالحَزَنِ، وَأَعُوذُ بِكَ مِنَ العَجْزِ وَالكَسَلِ، وَأَعُوذُ بِكَ مِنَ الجُبْنِ وَالبُخْلِ، وَأَعُوذُ بِكَ مِنَ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ', benefit:'استعاذة جامعة من آفات النفس والبدن والمال'},
    {n:'مرة', text:'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', benefit:'دعاء الوقاية من عذاب يوم القيامة'},
    {n:'3 مرات', text:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ', benefit:'تعدل تسبيحاً كثيراً لا يحصيه أحد'},
    {n:'مرة', text:'اللَّهُمَّ إِنِّي أَسْأَلُكَ الجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ', benefit:'من سألها ثلاثاً قالت الجنة: اللهم أدخله الجنة، ومن استعاذ ثلاثاً قالت النار: اللهم أجِرْه'},
    {n:'مرة', text:'اللَّهُمَّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الغَفُورُ', benefit:'من قالها مئة مرة في مجلس كتب له مئة حسنة ومُحيت عنه مئة سيئة'},
    {n:'مرة', text:'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ', benefit:'الصلاة على النبي ﷺ تُنير القلب وتيسر الأمور'},
    {n:'10 مرات', text:'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', benefit:'من صلّى عليّ حين يصبح عشراً وحين يمسي عشراً أدركته شفاعتي'},
    {n:'33 مرة', text:'سُبْحَانَ اللَّهِ', benefit:'تُسبِّح مع ملائكة الليل'},
    {n:'33 مرة', text:'الْحَمْدُ لِلَّهِ', benefit:'الحمد تملأ الميزان'},
    {n:'33 مرة', text:'اللَّهُ أَكْبَرُ', benefit:'التكبير يملأ ما بين السماء والأرض'},
    {n:'مرة', text:'اللَّهُمَّ اقْسِمْ لَنَا مِنْ خَشْيَتِكَ مَا يَحُولُ بَيْنَنَا وَبَيْنَ مَعَاصِيكَ، وَمِنْ طَاعَتِكَ مَا تُبَلِّغُنَا بِهِ جَنَّتَكَ، وَمِنَ اليَقِينِ مَا تُهَوِّنُ بِهِ عَلَيْنَا مَصَائِبَ الدُّنْيَا', benefit:'دعاء جامع للخشية واليقين والطاعة'},
    {n:'100 مرة', text:'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', benefit:'الاستغفار يفرج الكروب ويوسع الأرزاق'},
    {n:'مرة', text:'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِيَ إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَنَبِيِّكَ الَّذِي أَرْسَلْتَ', benefit:'دعاء النوم — من قاله فمات من ليلته مات على الفطرة'},
  ]
};

// ===== أدعية القرآن الكريم الجامعة =====
const QURAN_DUAS = [
  {ref:'الفاتحة: 6-7', text:'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', who:'دعاء الهداية – أم الكتاب'},
  {ref:'البقرة: 127', text:'رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ', who:'إبراهيم وإسماعيل عليهما السلام عند بناء الكعبة'},
  {ref:'البقرة: 128', text:'رَبَّنَا وَاجْعَلْنَا مُسْلِمَيْنِ لَكَ وَمِن ذُرِّيَّتِنَا أُمَّةً مُّسْلِمَةً لَّكَ وَأَرِنَا مَنَاسِكَنَا وَتُبْ عَلَيْنَا ۖ إِنَّكَ أَنتَ التَّوَّابُ الرَّحِيمُ', who:'دعاء إبراهيم عليه السلام'},
  {ref:'البقرة: 201', text:'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', who:'دعاء جامع لخيري الدنيا والآخرة'},
  {ref:'البقرة: 250', text:'رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ', who:'دعاء جند طالوت قبل لقاء جالوت'},
  {ref:'البقرة: 285', text:'سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ', who:'دعاء المؤمنين عند سماع الوحي'},
  {ref:'البقرة: 286', text:'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ', who:'خاتمة سورة البقرة'},
  {ref:'آل عمران: 8-9', text:'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ ۝ رَبَّنَا إِنَّكَ جَامِعُ النَّاسِ لِيَوْمٍ لَّا رَيْبَ فِيهِ ۚ إِنَّ اللَّهَ لَا يُخْلِفُ الْمِيعَادَ', who:'دعاء الراسخين في العلم'},
  {ref:'آل عمران: 16', text:'رَبَّنَا إِنَّنَا آمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ', who:'دعاء عباد الرحمن المتقين'},
  {ref:'آل عمران: 26-27', text:'قُلِ اللَّهُمَّ مَالِكَ الْمُلْكِ تُؤْتِي الْمُلْكَ مَن تَشَاءُ وَتَنزِعُ الْمُلْكَ مِمَّن تَشَاءُ وَتُعِزُّ مَن تَشَاءُ وَتُذِلُّ مَن تَشَاءُ ۖ بِيَدِكَ الْخَيْرُ ۖ إِنَّكَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ ۝ تُولِجُ اللَّيْلَ فِي النَّهَارِ وَتُولِجُ النَّهَارَ فِي اللَّيْلِ ۖ وَتُخْرِجُ الْحَيَّ مِنَ الْمَيِّتِ وَتُخْرِجُ الْمَيِّتَ مِنَ الْحَيِّ ۖ وَتَرْزُقُ مَن تَشَاءُ بِغَيْرِ حِسَابٍ', who:'دعاء عظيم بأسماء الله الحسنى'},
  {ref:'آل عمران: 35', text:'رَبِّ إِنِّي نَذَرْتُ لَكَ مَا فِي بَطْنِي مُحَرَّرًا فَتَقَبَّلْ مِنِّي ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ', who:'دعاء امرأة عمران أم مريم'},
  {ref:'آل عمران: 38', text:'رَبِّ هَبْ لِي مِن لَّدُنكَ ذُرِّيَّةً طَيِّبَةً ۖ إِنَّكَ سَمِيعُ الدُّعَاءِ', who:'دعاء زكريا عليه السلام'},
  {ref:'آل عمران: 53', text:'رَبَّنَا آمَنَّا بِمَا أَنزَلْتَ وَاتَّبَعْنَا الرَّسُولَ فَاكْتُبْنَا مَعَ الشَّاهِدِينَ', who:'دعاء الحواريين'},
  {ref:'آل عمران: 147', text:'رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ', who:'دعاء الرَّبيين مع الأنبياء'},
  {ref:'آل عمران: 173', text:'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', who:'دعاء التوكل عند الشدائد'},
  {ref:'آل عمران: 191-194', text:'رَبَّنَا مَا خَلَقْتَ هَٰذَا بَاطِلًا سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ ۝ رَبَّنَا إِنَّكَ مَن تُدْخِلِ النَّارَ فَقَدْ أَخْزَيْتَهُ ۖ وَمَا لِلظَّالِمِينَ مِنْ أَنصَارٍ ۝ رَبَّنَا إِنَّنَا سَمِعْنَا مُنَادِيًا يُنَادِي لِلْإِيمَانِ أَنْ آمِنُوا بِرَبِّكُمْ فَآمَنَّا ۚ رَبَّنَا فَاغْفِرْ لَنَا ذُنُوبَنَا وَكَفِّرْ عَنَّا سَيِّئَاتِنَا وَتَوَفَّنَا مَعَ الْأَبْرَارِ ۝ رَبَّنَا وَآتِنَا مَا وَعَدتَّنَا عَلَىٰ رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ الْقِيَامَةِ ۖ إِنَّكَ لَا تُخْلِفُ الْمِيعَادَ', who:'دعاء أولي الألباب'},
  {ref:'النساء: 75', text:'رَبَّنَا أَخْرِجْنَا مِنْ هَٰذِهِ الْقَرْيَةِ الظَّالِمِ أَهْلُهَا وَاجْعَل لَّنَا مِن لَّدُنكَ وَلِيًّا وَاجْعَل لَّنَا مِن لَّدُنكَ نَصِيرًا', who:'دعاء المستضعفين'},
  {ref:'المائدة: 83', text:'رَبَّنَا آمَنَّا فَاكْتُبْنَا مَعَ الشَّاهِدِينَ', who:'دعاء أهل الكتاب المؤمنين'},
  {ref:'المائدة: 114', text:'اللَّهُمَّ رَبَّنَا أَنزِلْ عَلَيْنَا مَائِدَةً مِّنَ السَّمَاءِ تَكُونُ لَنَا عِيدًا لِّأَوَّلِنَا وَآخِرِنَا وَآيَةً مِّنكَ ۖ وَارْزُقْنَا وَأَنتَ خَيْرُ الرَّازِقِينَ', who:'دعاء عيسى عليه السلام'},
  {ref:'الأنعام: 79', text:'إِنِّي وَجَّهْتُ وَجْهِيَ لِلَّذِي فَطَرَ السَّمَاوَاتِ وَالْأَرْضَ حَنِيفًا ۖ وَمَا أَنَا مِنَ الْمُشْرِكِينَ', who:'دعاء إبراهيم عليه السلام'},
  {ref:'الأعراف: 23', text:'رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ', who:'دعاء آدم وحواء عليهما السلام'},
  {ref:'الأعراف: 47', text:'رَبَّنَا لَا تَجْعَلْنَا مَعَ الْقَوْمِ الظَّالِمِينَ', who:'دعاء أصحاب الأعراف'},
  {ref:'الأعراف: 89', text:'رَبَّنَا افْتَحْ بَيْنَنَا وَبَيْنَ قَوْمِنَا بِالْحَقِّ وَأَنتَ خَيْرُ الْفَاتِحِينَ', who:'دعاء شعيب عليه السلام'},
  {ref:'الأعراف: 126', text:'رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَتَوَفَّنَا مُسْلِمِينَ', who:'دعاء سحرة فرعون بعد إيمانهم'},
  {ref:'الأعراف: 151', text:'رَبِّ اغْفِرْ لِي وَلِأَخِي وَأَدْخِلْنَا فِي رَحْمَتِكَ ۖ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ', who:'دعاء موسى عليه السلام'},
  {ref:'الأعراف: 155-156', text:'أَنتَ وَلِيُّنَا فَاغْفِرْ لَنَا وَارْحَمْنَا ۖ وَأَنتَ خَيْرُ الْغَافِرِينَ ۝ وَاكْتُبْ لَنَا فِي هَٰذِهِ الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ إِنَّا هُدْنَا إِلَيْكَ', who:'دعاء موسى عليه السلام لقومه'},
  {ref:'الأنفال: 9', text:'أَنِّي مُمِدُّكُم بِأَلْفٍ مِّنَ الْمَلَائِكَةِ مُرْدِفِينَ', who:'(استغاثة المؤمنين يوم بدر)'},
  {ref:'يونس: 85-86', text:'عَلَى اللَّهِ تَوَكَّلْنَا رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلْقَوْمِ الظَّالِمِينَ ۝ وَنَجِّنَا بِرَحْمَتِكَ مِنَ الْقَوْمِ الْكَافِرِينَ', who:'دعاء قوم موسى عليه السلام'},
  {ref:'هود: 47', text:'رَبِّ إِنِّي أَعُوذُ بِكَ أَنْ أَسْأَلَكَ مَا لَيْسَ لِي بِهِ عِلْمٌ ۖ وَإِلَّا تَغْفِرْ لِي وَتَرْحَمْنِي أَكُن مِّنَ الْخَاسِرِينَ', who:'دعاء نوح عليه السلام'},
  {ref:'يوسف: 33', text:'رَبِّ السِّجْنُ أَحَبُّ إِلَيَّ مِمَّا يَدْعُونَنِي إِلَيْهِ ۖ وَإِلَّا تَصْرِفْ عَنِّي كَيْدَهُنَّ أَصْبُ إِلَيْهِنَّ وَأَكُن مِّنَ الْجَاهِلِينَ', who:'دعاء يوسف عليه السلام عند الفتنة'},
  {ref:'يوسف: 101', text:'رَبِّ قَدْ آتَيْتَنِي مِنَ الْمُلْكِ وَعَلَّمْتَنِي مِن تَأْوِيلِ الْأَحَادِيثِ ۚ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ أَنتَ وَلِيِّي فِي الدُّنْيَا وَالْآخِرَةِ ۖ تَوَفَّنِي مُسْلِمًا وَأَلْحِقْنِي بِالصَّالِحِينَ', who:'دعاء يوسف عليه السلام'},
  {ref:'إبراهيم: 35-37', text:'رَبِّ اجْعَلْ هَٰذَا الْبَلَدَ آمِنًا وَاجْنُبْنِي وَبَنِيَّ أَن نَّعْبُدَ الْأَصْنَامَ ۝ رَبِّ إِنَّهُنَّ أَضْلَلْنَ كَثِيرًا مِّنَ النَّاسِ ۖ فَمَن تَبِعَنِي فَإِنَّهُ مِنِّي ۖ وَمَنْ عَصَانِي فَإِنَّكَ غَفُورٌ رَّحِيمٌ', who:'دعاء إبراهيم عليه السلام لمكة'},
  {ref:'إبراهيم: 40-41', text:'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ ۝ رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ', who:'دعاء إبراهيم عليه السلام'},
  {ref:'الحجر: 36-39', text:'رَبِّ فَأَنظِرْنِي إِلَىٰ يَوْمِ يُبْعَثُونَ', who:'(من قصة إبليس – للعبرة)'},
  {ref:'الإسراء: 24', text:'رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', who:'دعاء للوالدين'},
  {ref:'الإسراء: 80', text:'رَّبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ وَاجْعَل لِّي مِن لَّدُنكَ سُلْطَانًا نَّصِيرًا', who:'دعاء النبي ﷺ عند الهجرة'},
  {ref:'الكهف: 10', text:'رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا', who:'دعاء أصحاب الكهف'},
  {ref:'الكهف: 24', text:'وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ وَقُلْ عَسَىٰ أَن يَهْدِيَنِ رَبِّي لِأَقْرَبَ مِنْ هَٰذَا رَشَدًا', who:'دعاء عند النسيان'},
  {ref:'مريم: 4-6', text:'رَبِّ إِنِّي وَهَنَ الْعَظْمُ مِنِّي وَاشْتَعَلَ الرَّأْسُ شَيْبًا وَلَمْ أَكُن بِدُعَائِكَ رَبِّ شَقِيًّا ۝ وَإِنِّي خِفْتُ الْمَوَالِيَ مِن وَرَائِي وَكَانَتِ امْرَأَتِي عَاقِرًا فَهَبْ لِي مِن لَّدُنكَ وَلِيًّا ۝ يَرِثُنِي وَيَرِثُ مِنْ آلِ يَعْقُوبَ ۖ وَاجْعَلْهُ رَبِّ رَضِيًّا', who:'دعاء زكريا عليه السلام'},
  {ref:'طه: 25-28', text:'رَبِّ اشْرَحْ لِي صَدْرِي ۝ وَيَسِّرْ لِي أَمْرِي ۝ وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي ۝ يَفْقَهُوا قَوْلِي', who:'دعاء موسى عليه السلام عند الذهاب لفرعون'},
  {ref:'طه: 114', text:'رَّبِّ زِدْنِي عِلْمًا', who:'دعاء النبي ﷺ بطلب العلم النافع'},
  {ref:'الأنبياء: 83', text:'أَنِّي مَسَّنِيَ الضُّرُّ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ', who:'دعاء أيوب عليه السلام عند البلاء'},
  {ref:'الأنبياء: 87', text:'لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ', who:'دعاء يونس عليه السلام في بطن الحوت'},
  {ref:'الأنبياء: 89', text:'رَبِّ لَا تَذَرْنِي فَرْدًا وَأَنتَ خَيْرُ الْوَارِثِينَ', who:'دعاء زكريا عليه السلام'},
  {ref:'المؤمنون: 26', text:'رَبِّ انصُرْنِي بِمَا كَذَّبُونِ', who:'دعاء نوح عليه السلام'},
  {ref:'المؤمنون: 29', text:'رَّبِّ أَنزِلْنِي مُنزَلًا مُّبَارَكًا وَأَنتَ خَيْرُ الْمُنزِلِينَ', who:'دعاء نوح عليه السلام عند النزول من السفينة'},
  {ref:'المؤمنون: 93-94', text:'رَّبِّ إِمَّا تُرِيَنِّي مَا يُوعَدُونَ ۝ رَبِّ فَلَا تَجْعَلْنِي فِي الْقَوْمِ الظَّالِمِينَ', who:'دعاء النبي ﷺ'},
  {ref:'المؤمنون: 97-98', text:'رَّبِّ أَعُوذُ بِكَ مِنْ هَمَزَاتِ الشَّيَاطِينِ ۝ وَأَعُوذُ بِكَ رَبِّ أَن يَحْضُرُونِ', who:'استعاذة من الشياطين'},
  {ref:'المؤمنون: 109', text:'رَبَّنَا آمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَأَنتَ خَيْرُ الرَّاحِمِينَ', who:'دعاء عباد الله المؤمنين'},
  {ref:'المؤمنون: 118', text:'رَّبِّ اغْفِرْ وَارْحَمْ وَأَنتَ خَيْرُ الرَّاحِمِينَ', who:'خاتمة سورة المؤمنون'},
  {ref:'الفرقان: 65-66', text:'رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ ۖ إِنَّ عَذَابَهَا كَانَ غَرَامًا ۝ إِنَّهَا سَاءَتْ مُسْتَقَرًّا وَمُقَامًا', who:'دعاء عباد الرحمن'},
  {ref:'الفرقان: 74', text:'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا', who:'دعاء عباد الرحمن للذرية'},
  {ref:'الشعراء: 83-89', text:'رَبِّ هَبْ لِي حُكْمًا وَأَلْحِقْنِي بِالصَّالِحِينَ ۝ وَاجْعَل لِّي لِسَانَ صِدْقٍ فِي الْآخِرِينَ ۝ وَاجْعَلْنِي مِن وَرَثَةِ جَنَّةِ النَّعِيمِ ۝ وَاغْفِرْ لِأَبِي إِنَّهُ كَانَ مِنَ الضَّالِّينَ ۝ وَلَا تُخْزِنِي يَوْمَ يُبْعَثُونَ ۝ يَوْمَ لَا يَنفَعُ مَالٌ وَلَا بَنُونَ ۝ إِلَّا مَنْ أَتَى اللَّهَ بِقَلْبٍ سَلِيمٍ', who:'دعاء إبراهيم عليه السلام الجامع'},
  {ref:'النمل: 19', text:'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ وَأَدْخِلْنِي بِرَحْمَتِكَ فِي عِبَادِكَ الصَّالِحِينَ', who:'دعاء سليمان عليه السلام'},
  {ref:'القصص: 16', text:'رَبِّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي', who:'دعاء موسى عليه السلام'},
  {ref:'القصص: 17', text:'رَبِّ بِمَا أَنْعَمْتَ عَلَيَّ فَلَنْ أَكُونَ ظَهِيرًا لِّلْمُجْرِمِينَ', who:'دعاء موسى عليه السلام'},
  {ref:'القصص: 21', text:'رَبِّ نَجِّنِي مِنَ الْقَوْمِ الظَّالِمِينَ', who:'دعاء موسى عليه السلام عند الهروب'},
  {ref:'القصص: 24', text:'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ', who:'دعاء موسى عليه السلام في مدين'},
  {ref:'العنكبوت: 30', text:'رَبِّ انصُرْنِي عَلَى الْقَوْمِ الْمُفْسِدِينَ', who:'دعاء لوط عليه السلام'},
  {ref:'الصافات: 100', text:'رَبِّ هَبْ لِي مِنَ الصَّالِحِينَ', who:'دعاء إبراهيم عليه السلام'},
  {ref:'ص: 35', text:'رَبِّ اغْفِرْ لِي وَهَبْ لِي مُلْكًا لَّا يَنبَغِي لِأَحَدٍ مِّن بَعْدِي ۖ إِنَّكَ أَنتَ الْوَهَّابُ', who:'دعاء سليمان عليه السلام'},
  {ref:'غافر: 7-9', text:'رَبَّنَا وَسِعْتَ كُلَّ شَيْءٍ رَّحْمَةً وَعِلْمًا فَاغْفِرْ لِلَّذِينَ تَابُوا وَاتَّبَعُوا سَبِيلَكَ وَقِهِمْ عَذَابَ الْجَحِيمِ ۝ رَبَّنَا وَأَدْخِلْهُمْ جَنَّاتِ عَدْنٍ الَّتِي وَعَدتَّهُمْ وَمَن صَلَحَ مِنْ آبَائِهِمْ وَأَزْوَاجِهِمْ وَذُرِّيَّاتِهِمْ ۚ إِنَّكَ أَنتَ الْعَزِيزُ الْحَكِيمُ ۝ وَقِهِمُ السَّيِّئَاتِ ۚ وَمَن تَقِ السَّيِّئَاتِ يَوْمَئِذٍ فَقَدْ رَحِمْتَهُ', who:'دعاء الملائكة حملة العرش للمؤمنين'},
  {ref:'غافر: 60', text:'ادْعُونِي أَسْتَجِبْ لَكُمْ', who:'(وعد الله بالإجابة)'},
  {ref:'الأحقاف: 15', text:'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ وَأَصْلِحْ لِي فِي ذُرِّيَّتِي ۖ إِنِّي تُبْتُ إِلَيْكَ وَإِنِّي مِنَ الْمُسْلِمِينَ', who:'دعاء بلوغ الأربعين'},
  {ref:'الذاريات: 18', text:'وَبِالْأَسْحَارِ هُمْ يَسْتَغْفِرُونَ', who:'(صفة المتقين – الاستغفار بالأسحار)'},
  {ref:'الحشر: 10', text:'رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ وَلَا تَجْعَلْ فِي قُلُوبِنَا غِلًّا لِّلَّذِينَ آمَنُوا رَبَّنَا إِنَّكَ رَءُوفٌ رَّحِيمٌ', who:'دعاء التابعين للسابقين'},
  {ref:'الممتحنة: 4', text:'رَّبَّنَا عَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ أَنَبْنَا وَإِلَيْكَ الْمَصِيرُ', who:'دعاء إبراهيم ومن معه'},
  {ref:'الممتحنة: 5', text:'رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلَّذِينَ كَفَرُوا وَاغْفِرْ لَنَا رَبَّنَا ۖ إِنَّكَ أَنتَ الْعَزِيزُ الْحَكِيمُ', who:'دعاء النجاة من الفتن'},
  {ref:'التحريم: 8', text:'رَبَّنَا أَتْمِمْ لَنَا نُورَنَا وَاغْفِرْ لَنَا ۖ إِنَّكَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', who:'دعاء المؤمنين يوم القيامة'},
  {ref:'التحريم: 11', text:'رَبِّ ابْنِ لِي عِندَكَ بَيْتًا فِي الْجَنَّةِ وَنَجِّنِي مِن فِرْعَوْنَ وَعَمَلِهِ وَنَجِّنِي مِنَ الْقَوْمِ الظَّالِمِينَ', who:'دعاء آسية امرأة فرعون'},
  {ref:'نوح: 28', text:'رَّبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَن دَخَلَ بَيْتِيَ مُؤْمِنًا وَلِلْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ وَلَا تَزِدِ الظَّالِمِينَ إِلَّا تَبَارًا', who:'دعاء نوح عليه السلام'},
  {ref:'الفلق: 1-5', text:'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', who:'استعاذة من جميع الشرور'},
  {ref:'الناس: 1-6', text:'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ', who:'استعاذة من شر الوسوسة'},
];

// ===== AZKAR RENDER =====
function renderAzkar(type) {
  type = type || 'morning';
  state.azkarType = type;
  const grid = document.getElementById('azkar-grid');
  if (!grid) return;

  document.getElementById('azkar-tab-morning')?.classList.toggle('active', type==='morning');
  document.getElementById('azkar-tab-evening')?.classList.toggle('active', type==='evening');

  const items = AZKAR[type] || [];
  const progKey = `azkar_prog_${type}`;
  const prog = JSON.parse(localStorage.getItem(progKey) || '{}');

  const total = items.length;
  const done  = items.filter((_,i) => (prog[i]||0) >= parseInt((items[i].n||'1').match(/\d+/)?.[0]||'1',10)).length;
  const lbl = document.getElementById('azkar-done-label');
  if(lbl) lbl.textContent = done === total ? '✅ أتممت جميع الأذكار!' : `${done} / ${total} أذكار`;

  grid.innerHTML = items.map((d, i) => {
    const target = parseInt((d.n||'1').match(/\d+/)?.[0]||'1', 10);
    const count  = prog[i] || 0;
    const isDone = count >= target;
    const pct    = Math.min(100, Math.round((count / target) * 100));
    return `
      <div class="dhikr-card ${isDone ? 'dhikr-done' : ''}" id="dhikr-${i}">
        <div class="dhikr-meta" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="background:rgba(201,168,76,0.12);border:1px solid var(--border-gold);color:var(--gold);padding:3px 10px;border-radius:14px;font-size:12px;font-weight:900">${d.n}</span>
          ${isDone ? '<span style="color:var(--teal-light);font-size:12px;font-weight:700">✓ مكتمل</span>' : ''}
        </div>
        <div class="dhikr-text" style="font-family:\'Amiri Quran\',serif;font-size:21px;line-height:2.1;margin:14px 0;white-space:pre-line;cursor:${isDone?'default':'pointer'};user-select:none;-webkit-tap-highlight-color:transparent" onclick="${isDone?'':`azkarClick(${i},\'${type}\')`}">${d.text}</div>
        <div class="dhikr-benefit" style="font-size:13px;color:var(--text-secondary);line-height:1.8;border-right:3px solid var(--teal);padding-right:10px;margin-bottom:14px">💡 ${d.benefit}</div>
        <div class="dhikr-tasbih">
          <div class="dhikr-counter">
            <strong id="dc-${i}-${type}">${count}</strong>
            <span style="font-size:12px;color:var(--text-muted)">/ ${target}</span>
          </div>
          <div class="dhikr-progress">
            <div class="dhikr-progress-fill" id="dpf-${i}-${type}" style="width:${pct}%"></div>
          </div>
          <div class="dhikr-tasbih-actions">
            <button class="dhikr-tasbih-btn" onclick="azkarClick(${i},'${type}')" ${isDone ? 'disabled style="opacity:.5;cursor:default"' : ''}>+١</button>
            <button class="dhikr-tasbih-btn reset" onclick="azkarReset(${i},'${type}')">↺</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function azkarClick(idx, type) {
  const items  = AZKAR[type] || [];
  const target = parseInt((items[idx]?.n||'1').match(/\d+/)?.[0]||'1', 10);
  const progKey= `azkar_prog_${type}`;
  const prog   = JSON.parse(localStorage.getItem(progKey) || '{}');
  if ((prog[idx]||0) >= target) return;
  prog[idx] = (prog[idx]||0) + 1;
  localStorage.setItem(progKey, JSON.stringify(prog));

  const el   = document.getElementById(`dc-${idx}-${type}`);
  const fill = document.getElementById(`dpf-${idx}-${type}`);
  const card = document.getElementById(`dhikr-${idx}`);
  const cnt  = prog[idx];
  const pct  = Math.min(100, Math.round((cnt/target)*100));
  if(el) el.textContent = cnt;
  if(fill) fill.style.width = pct + '%';
  if(cnt >= target) {
    card?.classList.add('dhikr-done');
    showToast('ما شاء الله، أكملت هذا الذكر 🌟');
    renderAzkar(type); // re-render to update done label & disable button
  }
}

function azkarReset(idx, type) {
  const progKey = `azkar_prog_${type}`;
  const prog    = JSON.parse(localStorage.getItem(progKey) || '{}');
  delete prog[idx];
  localStorage.setItem(progKey, JSON.stringify(prog));
  renderAzkar(type);
}

function mshfAzkarResetAll() {
  ['morning','evening'].forEach(t => localStorage.removeItem(`azkar_prog_${t}`));
  renderAzkar(state.azkarType || 'morning');
  showToast('🔄 تم إعادة جميع الأذكار');
}


function renderQuranDuas() {
  const grid = document.getElementById('quran-duas-grid');
  if (!grid || grid.dataset.ready) return;
  grid.dataset.ready = '1';
  grid.innerHTML = QURAN_DUAS.map(d => `
    <div class="dua-card">
      <div class="dua-meta" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
        <span style="color:var(--gold);font-weight:900">📍 ${d.ref}</span>
      </div>
      <div class="dua-text" style="font-family:'Amiri Quran',serif;font-size:22px;line-height:2.1;margin:14px 0">${d.text}</div>
      <div class="dua-benefit">🕊️ ${d.who}</div>
    </div>
  `).join('');
}

function updateTasbihUI() {
  const { count, phrase, target } = state.tasbih;
  // Legacy hidden elements
  const legacyCount = document.getElementById('tasbih-count');
  const legacyPhrase = document.getElementById('tasbih-phrase');
  const legacyTarget = document.getElementById('tasbih-target');
  if(legacyCount) legacyCount.textContent = count;
  if(legacyPhrase) legacyPhrase.textContent = phrase;
  if(legacyTarget) legacyTarget.textContent = `الهدف: ${target}`;
  // New visible UI
  const cEl = document.getElementById('tb-count');
  const pEl = document.getElementById('tb-progress');
  const dEl = document.getElementById('tasbih-phrase-display');
  const sEl = document.getElementById('tasbih-phrase-select');
  if(cEl) cEl.textContent = count;
  const progress = count % target;
  if(pEl) pEl.textContent = `${progress} / ${target}`;
  if(dEl) dEl.textContent = phrase;
  if(sEl && sEl.value !== phrase){
    const has = Array.from(sEl.options).some(o=>o.value===phrase);
    if(has) sEl.value = phrase;
  }
  document.querySelectorAll('.tasbih-targets .tt-btn[data-target]').forEach(b=>{
    b.classList.toggle('active', parseInt(b.dataset.target,10) === target);
  });
}
function saveTasbih() { localStorage.setItem('quran_tasbih', JSON.stringify(state.tasbih)); }
function incrementTasbih() {
  state.tasbih.count++;
  if (state.tasbih.count % state.tasbih.target === 0) {
    const total = state.tasbih.count;
    showToast(`ما شاء الله، أتممت ${toArabicDigits ? toArabicDigits(total) : total} ذكرًا 🌟`);
  }
  saveTasbih();
  updateTasbihUI();
}
function resetTasbih() { state.tasbih.count = 0; saveTasbih(); updateTasbihUI(); }
function setTasbihPhrase(phrase) { state.tasbih.phrase = phrase; state.tasbih.count = 0; saveTasbih(); updateTasbihUI(); }

// ===== AI =====
async function sendAI() {
  const input = document.getElementById('ai-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  askAI(q);
}

function buildLocalAIAnswer(question) {
  const q = question.toLowerCase();
  if (q.includes('آية الكرسي') || q.includes('الكرسي')) return 'آية الكرسي من أعظم آيات القرآن، وفيها بيان كمال حياة الله وقيوميته وملكه وعلمه وقدرته. من معانيها: أن الله لا ينام ولا يغفل، وأن حفظ السماوات والأرض لا يثقله. اقرأها بتدبر خصوصًا بعد الصلوات وقبل النوم.';
  if (q.includes('صبر') || q.includes('الصبر')) return 'الصبر في القرآن يشمل الصبر على الطاعة، والصبر عن المعصية، والصبر على البلاء. قال تعالى: «إِنَّ اللَّهَ مَعَ الصَّابِرِينَ». ومن تطبيقه: الثبات عند الشدة، وكثرة الصلاة والدعاء، وعدم استعجال الفرج.';
  if (q.includes('فاتحة') || q.includes('الفاتحة')) return 'سورة الفاتحة تجمع الحمد، والتوحيد، والاستعانة، وطلب الهداية. طبّقها بأن تبدأ أمرك بحمد الله، وتستعين به وحده، وتطلب منه الهداية في قراراتك اليومية.';
  if (q.includes('فضائل') || q.includes('قراءة القرآن')) return 'من فضائل قراءة القرآن أنه نور وهداية وطمأنينة، والحرف منه بحسنة والحسنة بعشر أمثالها. الأفضل أن تجعل لك وردًا ثابتًا ولو قليلًا مع تدبر المعنى والعمل به.';
  if (q.includes('رزق') || q.includes('الرزق')) return 'من أسباب البركة في الرزق: التقوى، الاستغفار، التوكل، صلة الرحم، وشكر النعمة. قال تعالى: «وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ».';
  if (q.includes('توبة') || q.includes('استغفار')) return 'باب التوبة مفتوح ما دام العبد حيًا. شروطها: الإقلاع عن الذنب، الندم، العزم على عدم الرجوع، ورد الحقوق لأصحابها إن وجدت. أكثر من: أستغفر الله وأتوب إليه.';
  const topicKey = Object.keys(TOPIC_VERSES).find(k => q.includes(k));
  if (topicKey) return TOPIC_VERSES[topicKey].map(v => `• ${v.ref}: ${v.ar}<br>المعنى: ${v.t}`).join('<br><br>');
  return 'سؤالك طيب. كإجابة إرشادية: ارجع لمعنى الآية في تفسير موثوق مثل السعدي أو ابن كثير، وانظر إلى ما تدلك عليه من توحيد الله، والعمل الصالح، وتهذيب القلب. ويمكنك سؤالي بصيغة أدق مثل: ما معنى آية كذا؟ أو أعطني آيات عن موضوع معين.';
}

async function askAI(question) {
  const messages = document.getElementById('ai-messages');
  messages.innerHTML += `<div class="ai-msg user"><div class="ai-avatar user-av">👤</div><div class="ai-bubble">${question}</div></div>`;
  const typingId = 'typing-' + Date.now();
  messages.innerHTML += `<div class="ai-msg" id="${typingId}"><div class="ai-avatar bot">☾</div><div class="ai-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>`;
  messages.scrollTop = messages.scrollHeight;

  const systemPrompt = `أنت مساعد قرآني متخصص اسمك "الحسنين". مهمتك مساعدة المسلمين في فهم القرآن الكريم وعلومه.
- أجب دائماً باللغة العربية الفصحى بأسلوب واضح ومبسط
- اذكر الآيات والأحاديث بدقة مع مراجعها
- كن ودوداً ومحترماً ومشجعاً
- لا تتجاوز موضوعات القرآن والإسلام والتفسير والفقه المتعلق بالعبادات
- إذا سُئلت عن شيء خارج اختصاصك قل ذلك باحترام
- لا تستخدم markdown أو نجوم أو علامات تنسيق، اكتب بنص عربي عادي`;

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const data = await response.json();
    document.getElementById(typingId)?.remove();

    if (!response.ok) throw new Error(data?.error || 'Server error');

    const answer = data?.answer || 'عذراً، تعذّر الحصول على إجابة. حاول مرة أخرى.';
    messages.innerHTML += `<div class="ai-msg"><div class="ai-avatar bot">☾</div><div class="ai-bubble">${answer.replace(/\n/g, '<br>')}</div></div>`;
  } catch (e) {
    document.getElementById(typingId)?.remove();
    const answer = buildLocalAIAnswer(question);
    messages.innerHTML += `<div class="ai-msg"><div class="ai-avatar bot">☾</div><div class="ai-bubble">${answer}</div></div>`;
  }

  messages.scrollTop = messages.scrollHeight;
  addActivity(`سأل: ${question.substring(0, 40)}...`);
}

// ===== DASHBOARD =====
function updateDashboard() {
  const isLoggedIn = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
  document.getElementById('dash-verses').textContent = isLoggedIn ? state.stats.versesRead : 0;
  document.getElementById('dash-surahs').textContent = isLoggedIn ? state.stats.surahsCompleted.length : 0;
  document.getElementById('dash-streak').textContent = isLoggedIn ? state.streak.count : 0;
  document.getElementById('dash-bookmarks').textContent = isLoggedIn ? state.bookmarks.length : 0;
  document.getElementById('dash-memorized').textContent = isLoggedIn ? (state.stats.memorized || 0) : 0;
  document.getElementById('dash-goals').textContent = isLoggedIn ? state.goals.filter(g => !g.done).length : 0;

  const pct = Math.round((state.stats.versesRead / 6236) * 100);
  document.getElementById('khatma-fill').style.width = Math.min(100, pct) + '%';
  document.getElementById('khatma-pct').textContent = pct + '%';

  if (state.activity.length) {
    document.getElementById('activity-list').innerHTML = state.activity.slice(-8).reverse().map(a => `
      <div class="activity-item">
        <div class="activity-icon">📗</div>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    `).join('');
  }
}

// ===== HELPERS =====
function saveStats() { localStorage.setItem('quran_stats', JSON.stringify(state.stats)); }

function addActivity(text) {
  state.activity.push({ text, time: new Date().toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' }) });
  if (state.activity.length > 20) state.activity.shift();
  localStorage.setItem('quran_activity', JSON.stringify(state.activity));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== INIT =====
async function init() {
  loadVOD();
  updateStreakUI();
  updateHomeLabels();

  const surahs = await fetchSurahs();
  allSurahs = surahs;
  state.surahs = surahs;

  if (surahs.length) { renderSurahList(surahs); mshfRenderList(''); }

  // Restore cached prayer location
  const savedLat = parseFloat(localStorage.getItem('prayer_lat') || '');
  const savedLng = parseFloat(localStorage.getItem('prayer_lng') || '');
  const savedCity = localStorage.getItem('prayer_city') || '';
  if (savedLat && savedLng) {
    prayerState.lat = savedLat;
    prayerState.lng = savedLng;
    prayerState.city = savedCity;
  }
}

init();

/* ===== v17: Toast helper ===== */
function mshfToast(text, ms=2000){
  let t = document.getElementById('mshf-toast-el');
  if(!t){
    t = document.createElement('div');
    t.id = 'mshf-toast-el';
    t.className = 'mshf-toast';
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(()=>t.classList.remove('show'), ms);
}

/* ===== v17: Share current page ===== */
async function mshfShare(){
  const p = mshfState.page;
  const url = `${location.origin}${location.pathname}#page=${p}`;
  const surahN = mshfPageToSurah(p);
  const surahObj = (allSurahs||[]).find(s=>s.number===surahN);
  const sName = surahObj?.name_arabic || `سورة ${surahN}`;
  const shareData = {
    title: 'الحَسَنَيْن — منصة القرآن الكريم',
    text: `📖 ${sName} — صفحة ${toArabicDigits(p)} من ٦٠٤`,
    url
  };
  try {
    if(navigator.share){
      await navigator.share(shareData);
      return;
    }
  } catch(e){ /* user cancelled */ return; }
  // Fallback: copy link
  try {
    await navigator.clipboard.writeText(`${shareData.text}\n${url}`);
    mshfToast('✓ تم نسخ رابط الصفحة');
  } catch(e){
    mshfToast('تعذّر النسخ');
  }
}

/* ===== v17: Download current page as PDF ===== */
async function mshfDownloadPDF(){
  const p = mshfState.page;
  const img = document.getElementById('mshf-page-img');
  if(!img || !img.src){ mshfToast('الصفحة لم تُحمَّل بعد'); return; }
  mshfToast('⏳ جارٍ إنشاء PDF...', 4000);
  try {
    // Load jsPDF on demand
    if(typeof window.jspdf === 'undefined'){
      await new Promise((res, rej)=>{
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    // Fetch image as blob (avoid canvas taint)
    const resp = await fetch(img.src, { mode: 'cors' }).catch(()=>null);
    let dataUrl;
    if(resp && resp.ok){
      const blob = await resp.blob();
      dataUrl = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(blob); });
    } else {
      // Fallback: try a no-cors fetch by drawing via Image -> canvas with crossOrigin
      dataUrl = await new Promise((resolve, reject)=>{
        const im = new window.Image();
        im.crossOrigin = 'anonymous';
        im.onload = ()=>{
          try {
            const c = document.createElement('canvas');
            c.width = im.naturalWidth; c.height = im.naturalHeight;
            c.getContext('2d').drawImage(im, 0, 0);
            resolve(c.toDataURL('image/png'));
          } catch(e){ reject(e); }
        };
        im.onerror = reject;
        im.src = img.src;
      }).catch(()=>null);
    }
    if(!dataUrl){ mshfToast('تعذّر تحميل الصورة'); return; }

    const { jsPDF } = window.jspdf;
    // Detect dimensions from data URL
    const tmp = new window.Image();
    await new Promise(r=>{ tmp.onload=r; tmp.src=dataUrl; });
    const ratio = tmp.naturalHeight / tmp.naturalWidth;
    const pdfW = 210; // A4 width mm
    const pdfH = pdfW * ratio;
    const pdf = new jsPDF({ orientation: ratio > 1 ? 'portrait' : 'landscape', unit:'mm', format:[pdfW, pdfH] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH);
    const surahN = mshfPageToSurah(p);
    const surahObj = (allSurahs||[]).find(s=>s.number===surahN);
    const sName = (surahObj?.name_arabic || `سورة ${surahN}`).replace(/\s+/g,'_');
    pdf.save(`المصحف_صفحة_${p}_${sName}.pdf`);
    mshfToast('✓ تم تحميل الصفحة');
  } catch(err){
    console.error('PDF error:', err);
    mshfToast('حدث خطأ أثناء إنشاء PDF');
  }
}

/* ===== v17: Dual-page mode (two pages side-by-side like a real Mushaf) ===== */
function mshfToggleDual(){
  const wrap = document.getElementById('mshf-book-wrap');
  const btn = document.getElementById('mshf-dual-btn');
  const dualBox = document.getElementById('mshf-page-box-dual');
  if(!wrap) return;
  const on = !wrap.classList.contains('dual-mode');
  wrap.classList.toggle('dual-mode', on);
  if(btn) btn.classList.toggle('active', on);
  if(dualBox) dualBox.style.display = on ? 'block' : 'none';
  localStorage.setItem('mshf_dual', on ? '1' : '0');
  if(on){ mshfRenderDual(); mshfToast('📖 وضع الصفحتين'); }
  else { mshfToast('📄 صفحة واحدة'); }
}

// Madinah mushaf page image URLs — try multiple CDNs (used by mshfRenderDual)
function mshfImageUrls(p){
  const pad3 = String(p).padStart(3,'0');
  return [
    `https://www.searchtruth.com/quran/images2/large/page-${pad3}.jpg`,
    `https://raw.githubusercontent.com/semarketir/quranjson/master/source/image/page${pad3}.png`,
    `https://everyayah.com/data/quran-images-png/page${pad3}.png`,
    `https://quran.com/images/pages/large/${pad3}.jpg`,
    `https://cdn.islamic.network/quran/images/high-resolution/${pad3}.png`,
  ];
}

function mshfRenderDual(){
  const wrap = document.getElementById('mshf-book-wrap');
  if(!wrap || !wrap.classList.contains('dual-mode')) return;
  const dualImg = document.getElementById('mshf-page-img-dual');
  if(!dualImg) return;
  const cur = mshfState.page;
  // In a Mushaf, odd pages are on the LEFT (right page-side) and even on the RIGHT.
  // Display: current page + the other page of the spread.
  // Convention: right side = even, left side = odd. Pair (2,3), (4,5)…
  // For simplicity show current and current+1 if odd, current-1 if even.
  const partner = cur % 2 === 1 ? cur + 1 : cur - 1;
  if(partner < 1 || partner > 604){ dualImg.style.visibility = 'hidden'; return; }
  dualImg.style.visibility = 'visible';
  const urls = mshfImageUrls(partner);
  if(_mshfImgCache.has(partner)){
    dualImg.src = _mshfImgCache.get(partner);
    return;
  }
  let i = 0;
  const tryIt = () => {
    if(i >= urls.length){ dualImg.style.visibility='hidden'; return; }
    const t = new window.Image();
    t.onload = () => { _mshfImgCache.set(partner, urls[i]); dualImg.src = urls[i]; };
    t.onerror = () => { i++; tryIt(); };
    t.src = urls[i];
  };
  tryIt();
}

/* ===== v17: Restore dual-mode + deep-link from URL hash on load ===== */
(function v17Boot(){
  // Deep-link: #page=123
  const m = location.hash.match(/page=(\d+)/);
  if(m){
    const p = Math.max(1, Math.min(604, parseInt(m[1],10)));
    mshfState.page = p;
    localStorage.setItem('mshf_page', p);
    if(typeof mshfLoadPage === 'function') setTimeout(()=>mshfLoadPage(p), 300);
  }
  // Restore dual-mode preference
  if(localStorage.getItem('mshf_dual') === '1'){
    setTimeout(mshfToggleDual, 400);
  }
})();


// ===== LISTEN SCREEN =====
const LISTEN_STATE = { reciter: 'minshawi', query: '', currentSurah: null };

function listenSetReciter(val){
  LISTEN_STATE.reciter = val;
  // sync with main player
  state.currentReciter = val;
  const sel = document.getElementById('reciter-select');
  if(sel) { try { sel.value = val; } catch(e){} }
  renderListenSurahs();
  showToast('القارئ: ' + (RECITER_NAMES[val]||val));

  // If a surah is currently playing, switch to same surah with new reciter from same position
  const audio = document.getElementById('audio-el');
  const playingSurah = LISTEN_STATE.currentSurah;
  if(playingSurah && audio && audio.src && state.playing) {
    const savedTime = audio.currentTime;
    const wasPlaying = !audio.paused;
    const surah = (allSurahs||[]).find(s=>s.number===playingSurah);
    const newUrl = getFullSurahUrl(val, playingSurah);
    audio.pause();
    audio.src = newUrl;
    audio.load();
    audio.addEventListener('canplay', function onCanPlay(){
      audio.removeEventListener('canplay', onCanPlay);
      audio.currentTime = savedTime;
      if(wasPlaying){
        audio.play().then(()=>{
          state.playing = true;
          if(typeof updatePlayBtn==='function') updatePlayBtn();
        }).catch(()=>{ showToast('تعذر التشغيل، حاول قارئاً آخر'); });
      }
    }, { once: true });
    // Update player info
    if(surah){
      document.getElementById('audio-verse-info').textContent = `سورة كاملة — ${RECITER_NAMES[val]||val}`;
    }
  }
}

function listenFilter(q){
  LISTEN_STATE.query = (q||'').trim();
  renderListenSurahs();
}

async function ensureSurahsLoaded(){
  if(!allSurahs || !allSurahs.length){
    try{
      const surahs = await fetchSurahs();
      allSurahs = surahs;
      state.surahs = surahs;
    }catch(e){}
  }
}

async function renderListenScreen(){
  // Build reciter chips
  const chipsWrap = document.getElementById('listen-reciters');
  if(chipsWrap && !chipsWrap.dataset.built){
    const order = ['minshawi','abdulbasit','husary','dossari','alafasy','qatami','sudais'];
    chipsWrap.innerHTML = order.map(k => `
      <button class="reciter-chip ${k===LISTEN_STATE.reciter?'active':''}" data-r="${k}" onclick="listenSetReciter('${k}')">
        <div class="rc-avatar">${(RECITER_NAMES[k]||'?').slice(0,1)}</div>
        <div class="rc-info">
          <div class="rc-name">${RECITER_NAMES[k]||k}</div>
          <div class="rc-sub">${RECITER_SUBTITLES[k]||''}</div>
        </div>
      </button>
    `).join('');
    chipsWrap.dataset.built = '1';
  }
  await ensureSurahsLoaded();
  renderListenSurahs();
}

function renderListenSurahs(){
  // active chip
  document.querySelectorAll('.reciter-chip').forEach(el=>{
    el.classList.toggle('active', el.dataset.r === LISTEN_STATE.reciter);
  });
  const grid = document.getElementById('listen-grid');
  if(!grid) return;
  if(!allSurahs || !allSurahs.length){
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="spinner"></div><h3>جارٍ التحميل...</h3></div>';
    return;
  }
  const q = LISTEN_STATE.query;
  const list = allSurahs.filter(s => !q || (s.name_arabic||s.name||'').includes(q) || String(s.number).includes(q) || (s.englishName||'').toLowerCase().includes(q.toLowerCase()));
  if(!list.length){
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>لا توجد نتائج</h3></div>';
    return;
  }
  grid.innerHTML = list.map(s => {
    const isPlaying = (LISTEN_STATE.currentSurah === s.number) && state.playing;
    const playIcon = isPlaying
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    return `
      <div class="listen-card${isPlaying?' playing-card':''}" data-surah="${s.number}">
        <div class="lc-num">${toArabicDigits(s.number)}</div>
        <div class="lc-body">
          <div class="lc-name">${s.name_arabic||s.name}</div>
          <div class="lc-meta">${s.revelationType==='Meccan'?'مكية':'مدنية'} • ${toArabicDigits(s.numberOfAyahs)} آية</div>
        </div>
        <div class="lc-actions">
          <button class="lc-btn lc-play${isPlaying?' playing':''}" data-surah="${s.number}" onclick="listenPlaySurah(${s.number})" title="استماع / إيقاف">${playIcon}</button>
          <button class="lc-btn lc-dl" onclick="listenDownloadSurah(${s.number},'${(s.englishName||'surah').replace(/'/g,'')}')" title="تحميل"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M7 11l5 5 5-5"/><rect x="3" y="18" width="18" height="3" rx="1.5" fill="currentColor" stroke="none"/></svg></button>
        </div>
      </div>
    `;
  }).join('');
}

function listenPlaySurah(surahNum){
  const surah = (allSurahs||[]).find(s=>s.number===surahNum);
  if(!surah) return;

  const audio = document.getElementById('audio-el');

  // === TOGGLE: if same surah playing → pause/resume ===
  if(LISTEN_STATE.currentSurah === surahNum && audio.src && !audio.paused){
    audio.pause();
    state.playing = false;
    if(typeof updatePlayBtn==='function') updatePlayBtn();
    return;
  }
  if(LISTEN_STATE.currentSurah === surahNum && audio.src && audio.paused){
    audio.play().then(()=>{ state.playing=true; if(typeof updatePlayBtn==='function') updatePlayBtn(); }).catch(()=>{});
    return;
  }

  // === NEW SURAH: start playing ===
  LISTEN_STATE.currentSurah = surahNum;
  const url = getFullSurahUrl(LISTEN_STATE.reciter, surahNum);
  // NOTE: do not overwrite state.currentSurah here — that belongs to the read-text screen
  state.nowPlaying = { surah: surahNum, verse: 1, context: 'listen-full' };
  audio.src = url;
  audio.playbackRate = parseFloat(document.querySelector('.audio-controls .speed-select')?.value || '1');
  document.getElementById('audio-player').classList.add('visible');
  document.body.classList.add('player-active');
  // Smoothly hide FAB while player is active (all screen sizes)
  const fabBtnListen = document.getElementById('fab-ai-btn');
  if (fabBtnListen) fabBtnListen.classList.add('fab-hidden');
  document.getElementById('audio-surah-name').textContent = surah.name_arabic || surah.name;
  document.getElementById('audio-verse-info').textContent = `سورة كاملة — ${RECITER_NAMES[LISTEN_STATE.reciter]||''}`;
  audio.play().then(()=>{
    state.playing = true;
    if(typeof updatePlayBtn==='function') updatePlayBtn();
  }).catch(()=>{
    showToast('تعذر التشغيل، حاول قارئاً آخر');
  });
}

// === DIRECT DOWNLOAD (no page navigation) ===
async function listenDownloadSurah(surahNum, surahEnName){
  const url = getFullSurahUrl(LISTEN_STATE.reciter, surahNum);
  const fname = `${String(surahNum).padStart(3,'0')}-${(surahEnName||'surah').replace(/\s+/g,'_')}-${LISTEN_STATE.reciter}.mp3`;
  showToast('⏳ جارٍ التحميل...');
  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 3000);
    showToast('✅ تم التحميل بنجاح!');
  } catch(e) {
    showToast('❌ تعذّر التحميل، تحقق من الاتصال');
  }
}

// Hook into showScreen to lazy-init listen screen
(function(){
  const _showScreen = window.showScreen;
  if(typeof _showScreen === 'function'){
    window.showScreen = function(name){
      _showScreen(name);
      if(name === 'listen'){ renderListenScreen(); }
    };
  }
})();

/* ===== v9.10: Robust surah-list loader for "قراءة بالنص" =====
   Fixes "جار التحميل..." that never resolves when the primary
   alquran.cloud API is slow / blocked. Adds:
   - Lazy load on entering screen-quran
   - Retry with multiple mirrors / fallbacks
   - Visible error + retry button
*/
(function(){
  const SURAH_API_MIRRORS = [
    'https://api.alquran.cloud/v1/surah',
    'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranindopak/surah_index.json',
  ];

  async function fetchSurahsRobust(){
    for(const url of SURAH_API_MIRRORS){
      try{
        const ctrl = new AbortController();
        const t = setTimeout(()=>ctrl.abort(), 8000);
        const r = await fetch(url, { signal: ctrl.signal });
        clearTimeout(t);
        if(!r.ok) continue;
        const d = await r.json();
        // Primary API shape: {data: [...]}
        if(Array.isArray(d?.data)) return d.data;
        // Fallback shape: array of {number, name, englishName, ...}
        if(Array.isArray(d)) {
          return d.map(s => ({
            number: s.number || s.id,
            name: s.name || s.englishName,
            name_arabic: s.name_arabic || s.arabicName || s.name,
            englishName: s.englishName || s.name,
            revelationType: s.revelationType || (s.type === 'meccan' ? 'Meccan' : 'Medinan'),
            numberOfAyahs: s.numberOfAyahs || s.ayahCount || 0,
          }));
        }
      } catch(e){ /* try next */ }
    }
    return [];
  }

  async function ensureSurahsLoaded(force){
    if(!force && Array.isArray(window.allSurahs) && window.allSurahs.length) return true;
    const list = document.getElementById('surah-list');
    if(list){
      list.innerHTML = '<div class="loading-verses" style="padding:24px;text-align:center"><div class="spinner"></div><div style="margin-top:8px;color:var(--text-muted)">جارٍ تحميل قائمة السور...</div></div>';
    }
    const surahs = await fetchSurahsRobust();
    if(surahs.length){
      // CRITICAL: assign to the lexical `allSurahs` binding (not just window.*)
      // so that loadSurah / filterSurahs / mshf* all see the data.
      try { allSurahs = surahs; } catch(e) { window.allSurahs = surahs; }
      window.allSurahs = surahs;
      if(window.state) window.state.surahs = surahs;
      if(typeof renderSurahList === 'function') renderSurahList(surahs);
      if(typeof mshfRenderList === 'function') try{ mshfRenderList(''); }catch(e){}
      return true;
    }
    if(list){
      list.innerHTML = `
        <div style="padding:24px;text-align:center">
          <div style="font-size:32px;margin-bottom:10px">⚠️</div>
          <div style="color:var(--text-muted);font-size:13px;margin-bottom:14px;line-height:1.6">
            تعذّر الاتصال بخدمة القرآن.<br>تحقق من اتصال الإنترنت ثم أعد المحاولة.
          </div>
          <button class="ctrl-btn" style="margin:0 auto" onclick="window.__retryLoadSurahs && window.__retryLoadSurahs()">🔄 إعادة المحاولة</button>
        </div>`;
    }
    return false;
  }

  window.__retryLoadSurahs = () => ensureSurahsLoaded(true);

  // Hook showScreen to lazy-load when entering quran screen
  const _show = window.showScreen;
  window.showScreen = function(name){
    if(typeof _show === 'function') _show(name);
    if(name === 'quran') ensureSurahsLoaded(false);
  };

  // Also retry shortly after page load if init didn't populate the list
  setTimeout(()=>{
    if(!window.allSurahs || !window.allSurahs.length) ensureSurahsLoaded(false);
  }, 3500);
})();

/* ===== v9.10: Tasbih new-UI sync ===== */
(function(){
  function syncTasbihUI(){
    if(!window.state || !state.tasbih) return;
    const { count, phrase, target } = state.tasbih;
    const cEl = document.getElementById('tb-count');
    const pEl = document.getElementById('tb-progress');
    const dEl = document.getElementById('tasbih-phrase-display');
    const sEl = document.getElementById('tasbih-phrase-select');
    if(cEl) cEl.textContent = count;
    const progress = count % target;
    if(pEl) pEl.textContent = `${progress} / ${target}`;
    if(dEl) dEl.textContent = phrase;
    if(sEl && sEl.value !== phrase){
      // try to set if option exists
      const has = Array.from(sEl.options).some(o=>o.value===phrase);
      if(has) sEl.value = phrase;
    }
    document.querySelectorAll('.tasbih-targets .tt-btn[data-target]').forEach(b=>{
      b.classList.toggle('active', parseInt(b.dataset.target,10) === target);
    });
  }

  // Wrap the existing updateTasbihUI to also sync new elements
  if(typeof window.updateTasbihUI === 'function'){
    const _orig = window.updateTasbihUI;
    window.updateTasbihUI = function(){
      try{ _orig(); }catch(e){}
      syncTasbihUI();
    };
  }

  // New helper: change target
  window.setTasbihTarget = function(t){
    if(!window.state || !state.tasbih) return;
    state.tasbih.target = parseInt(t,10) || 33;
    if(typeof saveTasbih === 'function') saveTasbih();
    if(typeof updateTasbihUI === 'function') updateTasbihUI();
  };

  // Initial sync on load
  document.addEventListener('DOMContentLoaded', syncTasbihUI);
  setTimeout(syncTasbihUI, 200);
})();

// ===== SURAH SIDEBAR (قائمة السور) TOGGLE =====
(function() {
  function getSidebar()  { return document.getElementById('surah-sidebar'); }
  function getOverlay()  { return document.getElementById('surah-sidebar-overlay'); }
  function getToggle()   { return document.getElementById('surah-sidebar-toggle'); }

  window.toggleSurahSidebar = function() {
    var sb = getSidebar();
    if (!sb) return;
    if (sb.classList.contains('open')) {
      closeSurahSidebar();
    } else {
      openSurahSidebar();
    }
  };

  window.openSurahSidebar = function() {
    var sb = getSidebar(), ov = getOverlay();
    if (sb) sb.classList.add('open');
    if (ov) ov.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeSurahSidebar = function() {
    var sb = getSidebar(), ov = getOverlay();
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('active');
    document.body.style.overflow = '';
  };

  // Close on ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSurahSidebar();
  });

  // Show/hide toggle button based on screen size
  function handleResize() {
    var toggle = getToggle();
    if (!toggle) return;
    // Only show when on quran screen
    var quranScreen = document.getElementById('screen-quran');
    var isQuranActive = quranScreen && quranScreen.classList.contains('active');
    var isMobileTablet = window.innerWidth <= 1024;
    toggle.style.display = (isQuranActive && isMobileTablet) ? 'flex' : 'none';
    // If switching to desktop, auto-close the sidebar
    if (window.innerWidth > 1024) closeSurahSidebar();
  }

  window.addEventListener('resize', handleResize);

  // Hook into showScreen to show/hide toggle
  var _origShowScreen = window.showScreen;
  window.showScreen = function(name) {
    if (typeof _origShowScreen === 'function') _origShowScreen(name);
    setTimeout(handleResize, 50);
    if (name !== 'quran') closeSurahSidebar();
  };

  // Initial check
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(handleResize, 100);
  });
  setTimeout(handleResize, 300);
})();

// Auto-close surah sidebar when a surah is selected on mobile/tablet
(function() {
  var _origLoadSurah = window.loadSurah;
  if (typeof _origLoadSurah === 'function') {
    window.loadSurah = function(num) {
      var result = _origLoadSurah(num);
      if (window.innerWidth <= 1024) {
        setTimeout(function() { if (typeof closeSurahSidebar === 'function') closeSurahSidebar(); }, 150);
      }
      return result;
    };
  }
})();

/* ===== AUTO-LOAD SURAT AL-FATIHA on first visit ===== */
(function () {
  // After surahs are rendered, auto-load surah 1 if nothing is loaded yet
  var _origRenderSurahList = window.renderSurahList;
  function hookRenderSurahList(fn) {
    window.renderSurahList = function (surahs) {
      if (typeof fn === 'function') fn(surahs);
      // Only auto-load if no surah is currently displayed
      var hasContent = document.querySelector('#verses-container .verse-block');
      var hasLastRead = window.state && window.state.lastRead && window.state.lastRead.surahNum;
      if (!hasContent && !hasLastRead) {
        setTimeout(function () {
          if (typeof loadSurah === 'function') loadSurah(1);
        }, 300);
      }
    };
  }

  if (typeof _origRenderSurahList === 'function') {
    hookRenderSurahList(_origRenderSurahList);
  } else {
    // renderSurahList not yet defined — wait for it
    var interval = setInterval(function () {
      if (typeof window.renderSurahList === 'function') {
        clearInterval(interval);
        hookRenderSurahList(window.renderSurahList);
      }
    }, 100);
  }

  // Also trigger when showScreen('quran') is called and surahs already loaded
  var _prevShowScreen = window.showScreen;
  window.showScreen = function (name) {
    if (typeof _prevShowScreen === 'function') _prevShowScreen(name);
    if (name === 'quran') {
      setTimeout(function () {
        var hasContent = document.querySelector('#verses-container .verse-block');
        var hasLastRead = window.state && window.state.lastRead && window.state.lastRead.surahNum;
        var surahs = window.allSurahs || [];
        if (!hasContent && !hasLastRead && surahs.length > 0) {
          if (typeof loadSurah === 'function') loadSurah(1);
        }
      }, 500);
    }
  };
})();

/* ===== FINAL: single reliable toggle-button visibility controller ===== */
(function () {
  window.updateToggleBtn = function updateToggleBtn() {
    var btn = document.getElementById('surah-sidebar-toggle');
    if (!btn) return;
    var qs = document.getElementById('screen-quran');
    var isQuran = qs && qs.classList.contains('active');
    var isMobile = window.innerWidth <= 1024;
    btn.style.display = (isQuran && isMobile) ? 'flex' : 'none';
  }

  // Run on every screen change and resize
  window.addEventListener('resize', updateToggleBtn);
  document.addEventListener('DOMContentLoaded', function () {
    // Patch showScreen one final time
    var _orig = window.showScreen;
    window.showScreen = function (name) {
      if (typeof _orig === 'function') _orig(name);
      setTimeout(updateToggleBtn, 80);
    };
    setTimeout(updateToggleBtn, 500);
  });
  // Safety: run a few times after load
  setTimeout(updateToggleBtn, 600);
  setTimeout(updateToggleBtn, 1500);
})();

// ===== Firebase User Data Sync =====
// Called by auth.js after loading user data from Firebase
window.refreshStatsUI = function() {
  // Reload state from localStorage (which auth.js just populated from Firebase)
  try {
    state.bookmarks = JSON.parse(localStorage.getItem('quran_bookmarks') || '[]');
    state.streak    = JSON.parse(localStorage.getItem('quran_streak')    || '{"count":0,"lastDate":"","days":[]}');
    state.lastRead  = JSON.parse(localStorage.getItem('quran_lastread')  || 'null');
    state.stats     = JSON.parse(localStorage.getItem('quran_stats')     || '{"versesRead":0,"surahsCompleted":[],"memorized":0}');
    state.goals     = JSON.parse(localStorage.getItem('quran_goals')     || '[]');
    state.activity  = JSON.parse(localStorage.getItem('quran_activity')  || '[]');
    state.tasbih    = JSON.parse(localStorage.getItem('quran_tasbih')    || '{"count":0,"phrase":"سُبْحَانَ اللَّهِ","target":33}');
  } catch(e) {}
  // Reload MEMO (memorize data) from localStorage after Firebase populated it
  try {
    if (typeof window.__reloadMEMO__ === 'function') window.__reloadMEMO__();
  } catch(e) {}
  // Refresh UI
  if (typeof updateHomeLabels === 'function') updateHomeLabels();
  if (typeof updateStreakUI   === 'function') updateStreakUI();
  if (typeof window.__syncMemoStats__ === 'function') window.__syncMemoStats__();
};

// Patch save functions to also sync to Firebase
(function() {
  function fbSave(key, val) {
    if (typeof window.saveUserDataToFirebase === 'function') {
      window.saveUserDataToFirebase(key, val);
    }
  }

  // Patch saveStats
  var _saveStats = window.saveStats || function(){};
  window.saveStats = function() {
    localStorage.setItem('quran_stats', JSON.stringify(state.stats));
    fbSave('quran_stats', state.stats);
  };

  // Patch saveGoals
  var _saveGoals = window.saveGoals || function(){};
  window.saveGoals = function() {
    localStorage.setItem('quran_goals', JSON.stringify(state.goals));
    fbSave('quran_goals', state.goals);
  };

  // Patch saveTasbih
  var _saveTasbih = window.saveTasbih || function(){};
  window.saveTasbih = function() {
    localStorage.setItem('quran_tasbih', JSON.stringify(state.tasbih));
    fbSave('quran_tasbih', state.tasbih);
  };
})();

/* ═══════════════════════════════════════════════════════════
   TAFSIR FEATURE — Complete Implementation
   ═══════════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────────────────────────
const tafsirState = {
  source: localStorage.getItem('tafsir_source') || 'ar.waseet',
  sourceLabel: localStorage.getItem('tafsir_source_label') || 'التفسير الوسيط',
  cache: {},           // key: "surah:ayah:source" → tafsir text
  currentSurah: null,
  currentAyah: null,
  currentVerseText: null,
  currentRef: null,
  isLoading: false,
};

// ── Source selector (reading header) ──────────────────────────────────────
function toggleTafsirDropdown() {
  const dd = document.getElementById('tafsir-dropdown');
  if (dd) dd.classList.toggle('open');
}

function selectTafsirSource(src, label) {
  tafsirState.source = src;
  tafsirState.sourceLabel = label;
  localStorage.setItem('tafsir_source', src);
  localStorage.setItem('tafsir_source_label', label);

  // Update button label
  const lbl = document.getElementById('tafsir-src-label');
  if (lbl) lbl.textContent = label;

  // Update dropdown active state using data-src attribute
  document.querySelectorAll('.tafsir-dd-item').forEach(el => {
    const isActive = el.dataset.src === src;
    el.classList.toggle('active', isActive);
    const check = el.querySelector('.tafsir-dd-check');
    if (check) check.textContent = isActive ? '✓' : '';
  });

  // Close dropdown
  document.getElementById('tafsir-dropdown')?.classList.remove('open');

  // Re-render verses to update inline tafsir text if visible
  if (state.currentVerses && state.currentVerses.length && state.currentSurah) {
    renderVerses(state.currentVerses, state.currentSurah);
  }

  // If modal is open, reload with new source
  const overlay = document.getElementById('tafsir-modal-overlay');
  if (overlay?.classList.contains('open') && tafsirState.currentSurah) {
    loadTafsirInModal(tafsirState.currentSurah, tafsirState.currentAyah, src);
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('tafsir-selector-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('tafsir-dropdown')?.classList.remove('open');
  }
});

// ── Fetch tafsir from API (with caching) ──────────────────────────────────
async function fetchTafsirAPI(surah, ayah, source) {
  const cacheKey = `${surah}:${ayah}:${source}`;
  if (tafsirState.cache[cacheKey]) return tafsirState.cache[cacheKey];

  const url = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/${source}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const text = data?.data?.text;
  if (!text) throw new Error('No tafsir text');
  tafsirState.cache[cacheKey] = text;
  return text;
}

// ── Prefetch tafsir for nearby verses ─────────────────────────────────────
function prefetchNearbyTafsir(surah, ayah, total) {
  const toFetch = [];
  for (let d = 1; d <= 3; d++) {
    if (ayah + d <= total) toFetch.push(ayah + d);
    if (ayah - d >= 1)    toFetch.push(ayah - d);
  }
  toFetch.forEach(a => {
    const key = `${surah}:${a}:${tafsirState.source}`;
    if (!tafsirState.cache[key]) {
      fetchTafsirAPI(surah, a, tafsirState.source).catch(() => {});
    }
  });
}

// ── Open tafsir modal ─────────────────────────────────────────────────────
function openTafsirModal(surahNum, ayahNum, verseText, ref) {
  tafsirState.currentSurah = surahNum;
  tafsirState.currentAyah  = ayahNum;
  tafsirState.currentVerseText = verseText;
  tafsirState.currentRef   = ref;

  // Populate header
  document.getElementById('tm-ref').textContent = ref;
  document.getElementById('tm-verse').textContent = verseText;

  // Sync source tabs
  document.querySelectorAll('.tm-src-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.src === tafsirState.source);
  });

  // Show overlay
  const overlay = document.getElementById('tafsir-modal-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Load tafsir
  loadTafsirInModal(surahNum, ayahNum, tafsirState.source);

  // Prefetch nearby
  const total = state.currentVerses?.length || 300;
  prefetchNearbyTafsir(surahNum, ayahNum, total);
}

async function loadTafsirInModal(surah, ayah, source) {
  const spinner = document.getElementById('tm-spinner');
  const textEl  = document.getElementById('tm-text');
  const errEl   = document.getElementById('tm-error');

  // Show spinner
  spinner.style.display = 'flex';
  textEl.style.display  = 'none';
  errEl.style.display   = 'none';
  textEl.textContent    = '';

  try {
    const text = await fetchTafsirAPI(surah, ayah, source);
    spinner.style.display = 'none';
    textEl.style.display  = 'block';
    textEl.textContent    = text;
  } catch (err) {
    spinner.style.display = 'none';
    errEl.style.display   = 'flex';
  }
}

// ── Close modal ───────────────────────────────────────────────────────────
function closeTafsirModal(event) {
  // Close only if clicking overlay background, or close button
  if (event && event.target !== document.getElementById('tafsir-modal-overlay')) return;
  _closeTafsirModal();
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') _closeTafsirModal();
});
function _closeTafsirModal() {
  document.getElementById('tafsir-modal-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Switch tafsir source from inside modal ────────────────────────────────
function switchModalTafsir(btn) {
  const src   = btn.dataset.src;
  const label = btn.dataset.label;
  document.querySelectorAll('.tm-src-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  tafsirState.source = src;
  tafsirState.sourceLabel = label;
  localStorage.setItem('tafsir_source', src);
  localStorage.setItem('tafsir_source_label', label);

  // Sync dropdown label
  const lbl = document.getElementById('tafsir-src-label');
  if (lbl) lbl.textContent = label;

  // Update dropdown items
  document.querySelectorAll('.tafsir-dd-item').forEach(el => {
    el.classList.remove('active');
    el.querySelector('.tafsir-dd-check').textContent = '';
  });
  const sources = ['ar.waseet', 'ar.muyassar', 'ar.jalalayn'];
  const items = document.querySelectorAll('.tafsir-dd-item');
  const idx = sources.indexOf(src);
  if (items[idx]) {
    items[idx].classList.add('active');
    items[idx].querySelector('.tafsir-dd-check').textContent = '✓';
  }

  // Reload
  loadTafsirInModal(tafsirState.currentSurah, tafsirState.currentAyah, src);
}

// ── Retry on error ────────────────────────────────────────────────────────
function retryTafsir() {
  loadTafsirInModal(tafsirState.currentSurah, tafsirState.currentAyah, tafsirState.source);
}

// ── Copy tafsir ───────────────────────────────────────────────────────────
function copyTafsir() {
  const verse  = tafsirState.currentVerseText || '';
  const tafsir = document.getElementById('tm-text')?.textContent || '';
  const ref    = tafsirState.currentRef || '';
  if (!tafsir) return;
  const text = `${verse}\n\n📖 ${ref}\n\nالتفسير (${tafsirState.sourceLabel}):\n${tafsir}`;
  navigator.clipboard?.writeText(text).then(() => {
    const btn = document.getElementById('tm-copy-btn');
    if (btn) {
      btn.classList.add('success');
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> تم النسخ!`;
      setTimeout(() => {
        btn.classList.remove('success');
        btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> نسخ التفسير`;
      }, 2000);
    }
  });
}

// ── Share tafsir ──────────────────────────────────────────────────────────
function shareTafsir() {
  const verse  = tafsirState.currentVerseText || '';
  const tafsir = document.getElementById('tm-text')?.textContent || '';
  const ref    = tafsirState.currentRef || '';
  if (!tafsir) return;
  const text = `${verse}\n\n📖 ${ref}\n\nالتفسير (${tafsirState.sourceLabel}):\n${tafsir}\n\n— منصة الحسنين`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    copyTafsir();
  }
}

// ── Hook verse buttons to open tafsir modal ───────────────────────────────
// Override renderVerses to add tafsir modal click on the verse Arabic text
const _origRenderVerses = renderVerses;
renderVerses = function(verses, surah) {
  _origRenderVerses(verses, surah);
  // After rendering, update tafsir buttons to open modal instead of inline
  const container = document.getElementById('verses-container');
  if (!container) return;

  // Re-wire the 💡 تفسير buttons to open modal
  const blocks = container.querySelectorAll('.verse-block');
  blocks.forEach((block, i) => {
    const v = verses[i];
    if (!v) return;
    const cleanText = block.querySelector('.verse-arabic')?.textContent?.replace(/[٠-٩]+/g, '').trim().substring(0, 100) || '';
    const ref = `${surah.name_arabic || surah.name || ('سورة ' + surah.number)} · ${v.numberInSurah}`;

    // Wire action button
    const actionBtns = block.querySelectorAll('.v-action-btn-top, .v-action-btn');
    actionBtns.forEach(btn => {
      if (btn.textContent.includes('💡')) {
        btn.onclick = (e) => {
          e.stopPropagation();
          openTafsirModal(surah.number, v.numberInSurah, cleanText, ref);
        };
      }
    });

    // Also click on verse text opens modal
    const arabicEl = block.querySelector('.verse-arabic');
    if (arabicEl) {
      arabicEl.style.cursor = 'pointer';
      arabicEl.title = 'اضغط لعرض التفسير';
      arabicEl.onclick = (e) => {
        e.stopPropagation();
        openTafsirModal(surah.number, v.numberInSurah, cleanText, ref);
      };
    }
  });
}

// ── Initialize tafsir source on load ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  const saved = localStorage.getItem('tafsir_source') || 'ar.waseet';
  const savedLabel = localStorage.getItem('tafsir_source_label') || 'التفسير الوسيط';
  // Mark active dropdown item
  document.querySelectorAll('.tafsir-dd-item').forEach(el => {
    const isActive = el.dataset.src === saved;
    el.classList.toggle('active', isActive);
    const check = el.querySelector('.tafsir-dd-check');
    if (check) check.textContent = isActive ? '✓' : '';
  });
  const lbl = document.getElementById('tafsir-src-label');
  if (lbl) lbl.textContent = savedLabel;
  tafsirState.source = saved;
  tafsirState.sourceLabel = savedLabel;
});
