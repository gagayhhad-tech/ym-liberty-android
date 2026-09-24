// Global window.alert override (replace ancient Android dialogs with modern in-app glass toast)
window.alert = function(msg) {
  if (typeof showToast === 'function') {
    showToast(String(msg), 'bi-exclamation-circle');
  } else {
    console.warn('[Alert]:', msg);
  }
};

// The WebView loads the UI from file:///android_asset/www/index.html, so an
// absolute "/favicon.png" would resolve to file:///favicon.png and never load.
// Always reference the bundled asset relatively.
const PLACEHOLDER_COVER = 'favicon.png';

// A compact personal hub keeps the main Wave action prominent while exposing
// the most-used collection destinations without changing the three-tab nav.
(() => {
  const stats = document.querySelector('.vibe-stats-panel');
  const animation = document.querySelector('.vibe-animation');
  const title = document.querySelector('.vibe-title');
  const subtitle = document.querySelector('.vibe-subtitle');
  if (animation && title && subtitle && !animation.closest('.vibe-hero')) {
    const hero = document.createElement('section');
    hero.className = 'vibe-hero';
    animation.parentNode.insertBefore(hero, animation);
    hero.append(animation, title, subtitle);
  }
  if (!stats || document.getElementById('home-hub')) return;
  const hub = document.createElement('section');
  hub.id = 'home-hub';
  hub.className = 'home-hub';
  hub.innerHTML = `
    <h2>Ваша музыка</h2>
    <div class="home-hub-grid">
      <button class="home-hub-card home-hub-continue" id="hub-continue"><i class="bi bi-play-circle-fill"></i><span>Продолжить</span></button>
      <button class="home-hub-card" id="hub-likes"><i class="bi bi-heart-fill"></i><span>Мне нравится</span></button>
      <button class="home-hub-card" id="hub-downloads"><i class="bi bi-download"></i><span>Загрузки</span></button>
      <button class="home-hub-card" id="hub-releases"><i class="bi bi-stars"></i><span>Новинки</span></button>
    </div>`;
  stats.parentNode.insertBefore(hub, stats);
})();

// --- DOM Elements ---
const dom = {
  navBtns: document.querySelectorAll('.nav-btn'),
  
  miniPlayer: document.getElementById('mini-player'),
  fullPlayer: document.getElementById('full-player'),
  dynamicBg: document.getElementById('dynamic-bg'),
  
  btnClosePlayer: document.getElementById('btn-close-player'),
  miniBtnPlay: document.getElementById('mini-btn-play'),
  fullBtnPlay: document.getElementById('btn-full-play'),
  vibePlayBtn: document.getElementById('btn-vibe-play'),
  
  miniCover: document.getElementById('mini-cover'),
  miniTitle: document.getElementById('mini-title'),
  miniArtist: document.getElementById('mini-artist'),
  fullCover: document.getElementById('full-cover'),
  fullTitle: document.getElementById('full-title'),
  fullArtist: document.getElementById('full-artist'),
  miniBtnNext: document.getElementById('mini-btn-next'),

  // Lyrics
  btnLyrics: document.getElementById('btn-lyrics'),
  fullLyrics: document.getElementById('full-lyrics'),
  fullLyricsLines: document.getElementById('full-lyrics-lines'),
  
  // Progress
  progressSlider: document.getElementById('progress-slider'),
  timeCurrent: document.getElementById('time-current'),
  timeTotal: document.getElementById('time-total'),
  miniProgress: document.getElementById('mini-progress'),
  
  toggleDynamicBg: document.getElementById('toggle-dynamic-bg'),
  colorBtns: document.querySelectorAll('.color-btn'),
  
  // Auth
  authModal: document.getElementById('auth-modal'),
  btnLoginModal: document.getElementById('btn-login-modal'),
  btnCloseAuth: document.getElementById('btn-close-auth'),
  inputToken: document.getElementById('input-token'),
  btnSubmitToken: document.getElementById('btn-submit-token'),
  authStatus: document.getElementById('auth-status'),
  
  // Settings Account Info
  accountName: document.getElementById('account-name'),
  accountSub: document.getElementById('account-sub'),
  headerAvatar: document.getElementById('header-avatar'),
  
  // Library
  tracksList: document.getElementById('tracks-list'),
  likesCount: document.getElementById('likes-count'),
};

// --- Dual Audio Engine (Instant Preload & Zero-Delay Playback) ---
let playerA = document.getElementById('audio-player') || new Audio();
let playerB = document.getElementById('audio-player-preload') || new Audio();
playerA.preload = 'auto';
playerB.preload = 'auto';
playerA.crossOrigin = 'anonymous';
playerB.crossOrigin = 'anonymous';

const ensureAudioContextResumed = () => {
  if (typeof eqAudioCtx !== 'undefined' && eqAudioCtx && eqAudioCtx.state === 'suspended') {
    eqAudioCtx.resume().catch(() => {});
  }
};
playerA.addEventListener('play', () => {
  ensureAudioContextResumed();
  ensureVibeAudioAnalysis();
});
playerB.addEventListener('play', () => {
  ensureAudioContextResumed();
  ensureVibeAudioAnalysis();
});

let activePlayer = playerA;
let preloadPlayer = playerB;
let autoPausedTrackId = null;
function clearNoisyAutoResume() {
  autoPausedTrackId = null;
  try {
    if (window.AndroidBridge && typeof window.AndroidBridge.clearNoisyAutoResume === 'function') {
      window.AndroidBridge.clearNoisyAutoResume();
    }
  } catch (_) {}
}

// --- State ---
const state = {
  token: localStorage.getItem('ym_token') || '',
  user: null,
  tracks: [], // Library tracks
  collectionTagFilter: null,
  queue: [], // Current play queue
  queueIndex: 0,
  queueMode: 'library', // 'library', 'vibe', 'playlist', 'album', 'artist'
  currentStation: 'user:onyourwave',
  playbackContext: { subtitle: 'ИГРАЕТ ИЗ ВОЛНЫ', title: 'Моя Волна' },
  vibeBatchId: null, // For fetching next vibe tracks
  vibeBatchByTrack: {}, // trackId -> batchId it was recommended in (correct feedback attribution)
  isFetchingVibe: false,
  // Bumped on every mood-chip switch. A vibe fetch that started before the
  // bump carries the old mood's recommendations, so its result is discarded
  // instead of being appended behind the new queue.
  moodRequestSeq: 0,
  currentTrack: null,
  isPlaying: false,

  // Lyrics panel state. lyricsOpen is a user preference that survives track
  // changes; the rest describe the current track's loaded document.
  lyricsOpen: false,
  lyricsTrackId: null,
  lyricsRequestSeq: 0,
  lyricsLines: [],   // [{time, text}] sorted by time, or [] for plain text
  lyricsActiveIndex: -1
};

function updatePlaybackContextHeader(subtitle, title) {
  if (subtitle !== undefined && title !== undefined) {
    state.playbackContext = { subtitle, title };
  } else if (!state.playbackContext || !state.playbackContext.title) {
    if (state.queueMode === 'vibe') {
      const isTrackWave = state.currentStation && state.currentStation.startsWith('track:');
      state.playbackContext = {
        subtitle: isTrackWave ? 'ВОЛНА ПО ТРЕКУ' : 'ИГРАЕТ ИЗ ВОЛНЫ',
        title: isTrackWave ? (state.currentTrack?.title || 'Трек') : 'Моя Волна'
      };
    } else if (state.queueMode === 'playlist') {
      state.playbackContext = { subtitle: 'ИГРАЕТ ИЗ ПЛЕЙЛИСТА', title: 'Плейлист' };
    } else if (state.queueMode === 'album') {
      state.playbackContext = { subtitle: 'ИГРАЕТ ИЗ АЛЬБОМА', title: 'Альбом' };
    } else if (state.queueMode === 'artist') {
      state.playbackContext = { subtitle: 'ТРЕКИ АРТИСТА', title: state.currentTrack?.artist || 'Артист' };
    } else if (state.queueMode === 'downloads') {
      state.playbackContext = { subtitle: 'ОФЛАЙН-ПРОСЛУШИВАНИЕ', title: 'Загрузки' };
    } else {
      state.playbackContext = { subtitle: 'ИГРАЕТ ИЗ КОЛЛЕКЦИИ', title: 'Любимые треки' };
    }
  }

  const subEl = document.getElementById('full-context-type');
  const titEl = document.getElementById('full-context-title');
  if (subEl && state.playbackContext) {
    subEl.textContent = state.playbackContext.subtitle || 'СЕЙЧАС ИГРАЕТ';
  }
  if (titEl && state.playbackContext) {
    titEl.textContent = state.playbackContext.title || '';
  }
}

// --- Navigation Logic ---
state.viewHistory = [];

function navigateToView(targetId) {
  const current = document.querySelector('.view.active');
  if (current && current.id !== targetId) {
    state.viewHistory.push(current.id);
  }
  document.querySelectorAll('.view').forEach(v => {
    if (v.id === targetId) v.classList.add('active');
    else v.classList.remove('active');
  });
  window.scrollTo(0, 0);
  if (typeof startAuraLoop === 'function') startAuraLoop();
}

function navigateBack() {
  const prevId = state.viewHistory.pop();
  if (prevId && document.getElementById(prevId)) {
    document.querySelectorAll('.view').forEach(v => {
      if (v.id === prevId) v.classList.add('active');
      else v.classList.remove('active');
    });
    window.scrollTo(0, 0);
  } else {
    document.querySelector('.nav-btn.active')?.click();
  }
  if (typeof startAuraLoop === 'function') startAuraLoop();
}

dom.navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    state.viewHistory = [];
    dom.navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const targetId = btn.getAttribute('data-target');
    document.querySelectorAll('.view').forEach(view => {
      if (view.id === targetId) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });
    if (typeof startAuraLoop === 'function') startAuraLoop();
  });
});

document.getElementById('hub-continue')?.addEventListener('click', () => {
  if (state.currentTrack && !state.isPlaying) handlePlayToggle();
  else if (state.isPlaying) return;
  else dom.vibePlayBtn?.click();
});
document.getElementById('hub-likes')?.addEventListener('click', () => {
  document.querySelector('.nav-btn[data-target="view-library"]')?.click();
  document.getElementById('seg-tracks')?.click();
});
document.getElementById('hub-downloads')?.addEventListener('click', () => {
  document.querySelector('.nav-btn[data-target="view-library"]')?.click();
  document.getElementById('seg-downloads')?.click();
});
document.getElementById('hub-releases')?.addEventListener('click', () => {
  document.getElementById('vibe-releases-track-list')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Edge swipes move only between the primary tabs. Ignore controls, nested
// scrollers, dialogs, and the full-screen player; vertical gestures always win.
(() => {
  const order = ['view-vibe', 'view-library', 'view-settings'];
  let startX = 0, startY = 0, startTarget = null;
  document.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTarget = event.target;
  }, { passive: true });
  document.addEventListener('touchend', (event) => {
    const fullPlayer = document.getElementById('full-player');
    if (!startTarget || (fullPlayer && !fullPlayer.classList.contains('translateY-100'))) return;
    const activeView = document.querySelector('.view.active');
    if (!order.includes(activeView?.id) || !activeView.contains(startTarget)) return;
    if (startTarget.closest('button,a,input,textarea,select,[role="dialog"],.modal,.tracks-list,.releases-carousel,.full-lyrics-lines,.vibe-mood-chips')) return;
    if (document.querySelector('.modal-overlay:not(.hidden), .modal:not(.hidden), [role="dialog"]:not([hidden])')) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX, dy = touch.clientY - startY;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    const current = document.querySelector('.nav-btn.active')?.dataset.target;
    const index = order.indexOf(current);
    const next = order[index + (dx < 0 ? 1 : -1)];
    const button = [...dom.navBtns].find(item => item.dataset.target === next);
    if (button) button.click();
    startTarget = null;
  }, { passive: true });
})();

// --- Auth Logic ---
let authPollTimer = null;

function clearAuthPoll() {
  if (authPollTimer) {
    clearInterval(authPollTimer);
    authPollTimer = null;
  }
}

dom.btnLoginModal.addEventListener('click', () => {
  dom.authModal.classList.remove('hidden');
});

dom.btnCloseAuth.addEventListener('click', () => {
  clearAuthPoll();
  dom.authModal.classList.add('hidden');
});

// Yandex ID Device Flow Login
const btnYandexLogin = document.getElementById('btn-yandex-login');
const deviceAuthStatus = document.getElementById('device-auth-status');
const deviceUserCode = document.getElementById('device-user-code');
const deviceAuthLink = document.getElementById('device-auth-link');
const btnToggleManual = document.getElementById('btn-toggle-manual');
const manualAuthBox = document.getElementById('manual-auth-box');

if (btnToggleManual && manualAuthBox) {
  btnToggleManual.addEventListener('click', () => {
    const isHidden = manualAuthBox.style.display === 'none';
    manualAuthBox.style.display = isHidden ? 'block' : 'none';
    btnToggleManual.textContent = isHidden ? 'Скрыть ручной ввод' : 'Другие способы (токен / логин)';
  });
}

function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch (e) {
    console.warn('Fallback copy error:', e);
  }
}

// --- Custom dropdown ---------------------------------------------------------
// Native <select> popups are rendered by the OS (white sheet, system radio
// buttons) and cannot be styled, so they looked nothing like the app. This is a
// drop-in replacement driven by data-value attributes.
function setupYmSelect(el, onChange) {
  if (!el) return null;
  const valueEl = el.querySelector('.ym-select-value');
  const menu = el.querySelector('.ym-select-menu');
  if (!menu) return null;
  const options = Array.from(menu.querySelectorAll('.ym-select-option'));

  const setLabel = (val) => {
    const match = options.find(o => o.dataset.value === String(val));
    if (valueEl) valueEl.textContent = match ? match.textContent.trim() : '';
    options.forEach(o => o.classList.toggle('is-selected', o.dataset.value === String(val)));
  };

  let current = options[0] ? options[0].dataset.value : '';
  setLabel(current);

  const close = () => { menu.classList.add('hidden'); el.classList.remove('is-open'); };
  const open = () => { menu.classList.remove('hidden'); el.classList.add('is-open'); };

  el.addEventListener('click', (e) => {
    if (e.target.closest('.ym-select-option')) return; // handled below
    menu.classList.contains('hidden') ? open() : close();
  });
  options.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      current = opt.dataset.value;
      setLabel(current);
      close();
      if (typeof onChange === 'function') onChange(current);
    });
  });
  // Tapping outside closes the menu.
  document.addEventListener('click', (e) => {
    if (!el.contains(e.target)) close();
  });

  return {
    get value() { return current; },
    set value(v) { current = String(v); setLabel(current); },
  };
}

// --- Diagnostics -------------------------------------------------------------
// Writes into the same file the native crash handler uses
// (Android/data/com.ymliberty.app/files/ymliberty-log.txt) so a single log
// covers both sides.
function ylog(tag, message) {
  try {
    if (window.AndroidBridge && typeof window.AndroidBridge.logLine === 'function') {
      window.AndroidBridge.logLine(String(tag || 'JS'), String(message));
    }
  } catch (e) {}
  console.log('[' + tag + ']', message);
}

function ylogError(tag, message) {
  try {
    if (window.AndroidBridge && typeof window.AndroidBridge.logError === 'function') {
      window.AndroidBridge.logError(String(tag || 'JS'), String(message));
    }
  } catch (e) {}
  console.warn('[' + tag + ']', message);
}

let toastTimeout = null;
function showToast(text, icon, tone) {
  const toast = document.getElementById('global-toast');
  const toastText = document.getElementById('global-toast-text');
  if (!toast) return;
  if (toastText) toastText.textContent = text;
  // The mark-up hardcoded a green checkmark, so every error toast also claimed
  // success. Drive both the glyph and its colour from the caller.
  const iconEl = toast.querySelector('i');
  if (iconEl) {
    if (icon) {
      iconEl.className = `bi ${icon}`;
    } else {
      iconEl.className = 'bi bi-check2-circle';
    }
    const isError = tone === 'error' ||
      (typeof icon === 'string' && /exclamation|wifi-off|x-circle|slash|triangle/.test(icon));
    iconEl.style.color = isError ? '#e63946' : (tone === 'warn' ? '#fed42b' : '#00ff88');
  }
  toast.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
}

if (deviceUserCode) {
  deviceUserCode.addEventListener('click', () => {
    const code = deviceUserCode.textContent.trim();
    if (code && code !== '--------') {
      copyToClipboard(code);
      const toast = document.getElementById('code-copied-toast');
      if (toast) {
        toast.innerHTML = '<i class="bi bi-clipboard-check-fill"></i> Скопировано в буфер обмена!';
        toast.style.color = '#00ff88';
      }
    }
  });
}

if (btnYandexLogin) {
  btnYandexLogin.addEventListener('click', async () => {
    clearAuthPoll();
    dom.authStatus.textContent = "Получение ссылки для входа...";
    dom.authStatus.style.color = "#fed42b";
    btnYandexLogin.disabled = true;

    try {
      const data = await YandexClient.authDeviceCode();

      if (!data || !data.device_code) {
        throw new Error(data?.error || 'Не удалось получить код авторизации');
      }

      const { device_code, user_code, verification_url, interval } = data;
      
      if (deviceUserCode) deviceUserCode.textContent = user_code;
      const targetUrl = `${verification_url || 'https://ya.ru/device'}?user_code=${encodeURIComponent(user_code)}`;
      if (deviceAuthLink) deviceAuthLink.href = targetUrl;
      if (deviceAuthStatus) deviceAuthStatus.style.display = 'block';

      // Auto-copy code to clipboard
      copyToClipboard(user_code);

      dom.authStatus.textContent = "Подтвердите вход на открывшейся странице Яндекса";
      dom.authStatus.style.color = "#fed42b";

      // Open ya.ru/device automatically
      try {
        window.open(targetUrl, '_blank');
      } catch(e) {
        console.warn("window.open error:", e);
      }

      // Start polling for token
      const pollDelay = (interval || 4) * 1000;
      authPollTimer = setInterval(async () => {
        try {
          const pollData = await YandexClient.authDevicePoll(device_code);

          if (pollData.status === 'success' && pollData.access_token) {
            clearAuthPoll();
            dom.authStatus.textContent = "✅ Вход выполнен успешно!";
            dom.authStatus.style.color = "#00ff88";
            
            state.token = pollData.access_token;
            localStorage.setItem('ym_token', pollData.access_token);

            setTimeout(() => {
              dom.authModal.classList.add('hidden');
              if (deviceAuthStatus) deviceAuthStatus.style.display = 'none';
              fetchLibrary(pollData.access_token);
            }, 800);
          } else if (pollData.status === 'error') {
            clearAuthPoll();
            dom.authStatus.textContent = `❌ ${pollData.error_description || 'Ошибка входа'}`;
            dom.authStatus.style.color = "#e63946";
            btnYandexLogin.disabled = false;
          }
        } catch (pollErr) {
          console.error("Poll error:", pollErr);
        }
      }, pollDelay);

    } catch (err) {
      console.error(err);
      dom.authStatus.textContent = `❌ ${err.message}`;
      dom.authStatus.style.color = "#e63946";
    } finally {
      btnYandexLogin.disabled = false;
    }
  });
}

dom.btnSubmitToken.addEventListener('click', async () => {
  clearAuthPoll();
  const token = dom.inputToken.value.trim();
  if (!token) return;
  
  dom.authStatus.textContent = "Проверка...";
  dom.authStatus.style.color = "#fed42b";
  
  await fetchLibrary(token);
});

async function fetchLibrary(token) {
  try {
    const data = await YandexClient.getLibrary(token);
    
    if (!data || data.error) {
      dom.authStatus.textContent = `Ошибка: ${data?.error || 'Неизвестная ошибка'}`;
      dom.authStatus.style.color = "#e63946";
      return;
    }
    
    // Success
    state.token = token;
    localStorage.setItem('ym_token', token);
    state.user = data.user;
    state.tracks = data.tracks || [];
    state.likedTrackIds = new Set(state.tracks.map(t => String(t.id)));
    
    // Update UI
    dom.authModal.classList.add('hidden');
    
    const login = data.user.login || 'User';
    dom.accountName.textContent = data.user.fullName || login;
    dom.accountSub.textContent = `@${login} | ${data.user.hasPlus ? 'Плюс Активен' : 'Без Плюса'}`;
    dom.headerAvatar.textContent = login[0].toUpperCase();
    
    dom.btnLoginModal.textContent = "Выйти";
    dom.btnLoginModal.onclick = () => {
      localStorage.removeItem('ym_token');
      location.reload();
    };
    
    renderTracks();
    if (typeof syncWaveStatsFromAccount === 'function') {
      syncWaveStatsFromAccount();
    }
    // Keep Rotor's stored mood in sync with what the UI shows.
    if (typeof reapplySavedVibeMood === 'function') {
      reapplySavedVibeMood();
    }
    // Загружаем новинки после авторизации (токен уже есть)
    loadHomeNewReleases(true);
    
  } catch (e) {
    console.error(e);
    if (dom.authStatus) {
       dom.authStatus.textContent = "Сетевая ошибка";
       dom.authStatus.style.color = "#e63946";
    }
  }
}

const COLLECTION_CATEGORY_ORDER = ['all', 'calm', 'road', 'energy', 'party', 'focus', 'sad'];
const COLLECTION_CATEGORY_LABELS = {
  all: '\u0412\u0441\u0451', calm: '\u0421\u043f\u043e\u043a\u043e\u0439\u043d\u043e\u0435', road: '\u0412 \u0434\u043e\u0440\u043e\u0433\u0443', energy: '\u0411\u043e\u0434\u0440\u043e\u0435',
  party: '\u0412\u0435\u0447\u0435\u0440\u0438\u043d\u043a\u0430', focus: '\u0424\u043e\u043a\u0443\u0441', sad: '\u0413\u0440\u0443\u0441\u0442\u044c'
};
const COLLECTION_CATEGORY_RULES = {
  calm: ['calm','chill','ambient','classical','\u043a\u043b\u0430\u0441\u0441\u0438\u043a\u0430','\u0434\u0436\u0430\u0437','jazz','\u0430\u043a\u0443\u0441\u0442','\u0440\u0435\u043b\u0430\u043a\u0441','\u0441\u043f\u043e\u043a\u043e\u0439'],
  road: ['road','\u0432 \u0434\u043e\u0440\u043e\u0433\u0443','rock','\u0440\u043e\u043a','pop','\u043f\u043e\u043f','indie','\u0438\u043d\u0434\u0438','alternative','\u0430\u043b\u044c\u0442\u0435\u0440'],
  energy: ['energy','dance','\u0442\u0430\u043d\u0446\u0435\u0432','electronic','\u044d\u043b\u0435\u043a\u0442\u0440\u043e','metal','\u043c\u0435\u0442\u0430\u043b','hardstyle','\u0431\u043e\u0434\u0440','workout'],
  party: ['party','\u0432\u0435\u0447\u0435\u0440\u0438\u043d','rap','\u0440\u044d\u043f','hip-hop','\u0445\u0438\u043f-\u0445\u043e\u043f','trap','\u0442\u0440\u044d\u043f','rnb','r&b','funk','\u0444\u0430\u043d\u043a'],
  focus: ['focus','\u0444\u043e\u043a\u0443\u0441','lofi','\u043b\u043e\u0443\u0444\u0430\u0439','instrumental','\u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442','soundtrack','\u0441\u0430\u0443\u043d\u0434\u0442\u0440\u0435\u043a','study'],
  sad: ['sad','\u0433\u0440\u0443\u0441\u0442','blues','\u0431\u043b\u044e\u0437','emo','\u044d\u043c\u043e','soul','\u0441\u043e\u0443\u043b','melancholy','\u043c\u0435\u043b\u0430\u043d\u0445\u043e\u043b']
};

function getCollectionLabels(entry) {
  const track = entry?.track || entry || {};
  const album = track.albums?.[0] || entry?.albums?.[0] || {};
  const labels = (value) => (Array.isArray(value) ? value : (value ? [value] : []))
    .map(item => typeof item === 'string' ? item : item?.name || item?.title || item?.value)
    .filter(Boolean).map(String);
  const moodRaw = [
    ...labels(track.moods), ...labels(track.moodTags), ...labels(track.mood),
    ...labels(album.moods), ...labels(album.moodTags)
  ];
  const genreRaw = [
    ...labels(track.genres), ...labels(track.genre),
    ...labels(album.genres), ...labels(album.genre)
  ];
  const matchCategories = (values) => {
    const haystack = values.join(' ').toLowerCase();
    return COLLECTION_CATEGORY_ORDER.filter(category =>
      category !== 'all' && COLLECTION_CATEGORY_RULES[category].some(term => haystack.includes(term))
    );
  };
  let categories = matchCategories(moodRaw);
  if (!categories.length) {
    categories = matchCategories(genreRaw);
  }
  return { type: moodRaw.length && categories.length ? 'mood' : 'genre', labels: categories.length ? categories : ['all'] };
}

function renderCollectionTags() {
  const list = document.getElementById('tracks-list');
  if (!list) return;
  let bar = document.getElementById('collection-tag-filters');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'collection-tag-filters';
    bar.className = 'collection-tag-filters';
    list.parentNode.insertBefore(bar, list);
  }
  const available = new Set(['all']);
  state.tracks.forEach(track => getCollectionLabels(track).labels.forEach(label => available.add(label)));
  if (state.collectionTagFilter && !available.has(state.collectionTagFilter)) state.collectionTagFilter = null;
  bar.hidden = false;
  bar.innerHTML = '<div class="collection-tag-row">' + COLLECTION_CATEGORY_ORDER
    .filter(category => available.has(category))
    .map(category => '<button type="button" class="collection-tag-chip ' +
      ((state.collectionTagFilter === category || (!state.collectionTagFilter && category === 'all')) ? 'active' : '') +
      '" data-tag="' + category + '">' + COLLECTION_CATEGORY_LABELS[category] + '</button>')
    .join('') + '</div>';
  bar.querySelectorAll('.collection-tag-chip').forEach(button => {
    button.addEventListener('click', () => {
      state.collectionTagFilter = button.dataset.tag === 'all' ? null : button.dataset.tag;
      renderTracks();
    });
  });
}

function renderTracks() {
  dom.likesCount.textContent = `${state.tracks.length} треков`;
  dom.tracksList.innerHTML = '';
  renderCollectionTags();
  
  const playAllBtn = document.querySelector('.play-all-btn');
  if (playAllBtn) {
    playAllBtn.onclick = () => {
      if (state.tracks.length === 0) return;
      state.queueMode = 'library';
      updatePlaybackContextHeader('ИГРАЕТ ИЗ КОЛЛЕКЦИИ', 'Любимые треки');
      state.queue = state.tracks.map(t => t.track);
      state.queueIndex = 0;
      playQueueTrack(state.queue[0]);
    };
  }

  const downloadAllBtn = document.getElementById('btn-download-all');
  if (downloadAllBtn) {
    // Only the Android build can hand a file to DownloadManager; in a browser
    // the button would do nothing, so hide it instead of failing on click.
    const native = window.AndroidBridge && typeof window.AndroidBridge.downloadTrack === 'function';
    downloadAllBtn.style.display = native ? 'flex' : 'none';
    downloadAllBtn.onclick = () => downloadWholeLibrary(downloadAllBtn);
  }
  
  const visibleTracks = state.collectionTagFilter
    ? state.tracks.filter(track => getCollectionLabels(track).labels.includes(state.collectionTagFilter))
    : state.tracks;
  if (visibleTracks.length === 0) {
    dom.tracksList.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-music-note-beamed"></i>
        <p>${state.tracks.length ? 'В этой категории пока нет треков' : 'Нет любимых треков'}</p>
      </div>`;
    return;
  }
  
  visibleTracks.forEach(track => {
    if (!track) return;
    
    const div = document.createElement('div');
    div.className = 'track-item';
    
    const artist = track.artists || 'Unknown Artist';
    let coverUrl = track.coverUri || PLACEHOLDER_COVER;
    if (coverUrl.includes('%%')) coverUrl = `https://${coverUrl.replace('%%', '200x200')}`;
    if (!coverUrl.startsWith('http') && coverUrl !== PLACEHOLDER_COVER) {
      coverUrl = `https://${coverUrl}`;
    }
    const isExplicit = track.explicit || track.contentWarning === 'explicit';
    const badgeHtml = track.isLiberty ? `<span class="liberty-badge"><i class="bi bi-gem"></i></span>` : (isExplicit ? `<span class="explicit-badge">E</span>` : '');
    const downloadedHtml = isTrackDownloaded(track.id, artist, track.title)
      ? '<span class="track-download-state" title="Загружено"><i class="bi bi-check-circle-fill"></i></span>'
      : '';
    div._trackData = track;
    div.innerHTML = `
      <img src="${coverUrl}" loading="lazy" alt="cover">
      <div class="track-info">
        <div class="track-title"><span class="track-title-text">${escapeHtml(track.title)}</span>${badgeHtml}</div>
        <div class="track-artist">${artist}</div>
      </div>
      ${downloadedHtml}<i class="bi bi-three-dots track-dots" style="color: var(--text-secondary);"></i>
    `;
    
    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('track-dots') || e.target.closest('.track-dots')) return;
      // Set queue to library and start playing this track
      state.queueMode = 'library';
      updatePlaybackContextHeader('ИГРАЕТ ИЗ КОЛЛЕКЦИИ', 'Любимые треки');
      state.queue = state.tracks;
      state.queueIndex = state.queue.findIndex(t => t.id === track.id);
      
      playTrack(track.id, track.title, artist, coverUrl, isExplicit, track.isLiberty);
    });
    
    dom.tracksList.appendChild(div);
  });
}

// --- Player Logic ---

async function sendFeedback(type, trackId, duration, trackLengthSeconds) {
  if (state.queueMode !== 'vibe' || !trackId) return;
  // Attribute every event to the batch the track was actually recommended in,
  // not to whichever batch happened to arrive last.
  const batchId = typeof vibeBatchForTrack === 'function' ? vibeBatchForTrack(trackId) : state.vibeBatchId;
  if (!batchId) return;
  try {
    const playSec = duration !== undefined ? duration : (Math.floor(activePlayer.currentTime) || 0);
    await YandexClient.sendFeedback(
      type,
      trackId,
      batchId,
      playSec,
      state.token,
      state.currentStation || 'user:onyourwave',
      trackLengthSeconds
    );
  } catch(e) {
    console.error("Feedback error", e);
  }
}

// Stream Cache & Gapless Audio Preloader
const streamCache = new Map(); // id -> Promise<{ streamUrl, ... }>
let preloadedTrack = null;     // { id, streamUrl, ... }
let preloadPromise = null;

async function fetchTrackStream(id, forceRefresh = false, qualityOverride = null) {
  const idStr = String(id);
  const cacheKey = qualityOverride ? `${idStr}:${qualityOverride}` : idStr;
  if (!forceRefresh && streamCache.has(cacheKey)) {
    return streamCache.get(cacheKey);
  }
  const p = YandexClient.getStreamUrl(idStr, state.token, qualityOverride);
  streamCache.set(cacheKey, p);
  try {
    return await p;
  } catch(e) {
    streamCache.delete(cacheKey);
    throw e;
  }
}

function getNextTrack() {
  if (!state.queue || state.queue.length === 0) return null;
  if (state.isRepeat) {
    return state.queue[state.queueIndex] || state.currentTrack?.track || state.currentTrack;
  }
  if (state.queueMode === 'vibe') {
    const nextIdx = state.queueIndex + 1;
    if (nextIdx < state.queue.length) {
      return state.queue[nextIdx];
    }
    return null;
  } else {
    if (state.isShuffle) {
      if (state.nextShuffleIndex === undefined || state.nextShuffleIndex === null) {
        state.nextShuffleIndex = Math.floor(Math.random() * state.queue.length);
      }
      return state.queue[state.nextShuffleIndex];
    } else {
      let nextIdx = state.queueIndex + 1;
      if (nextIdx >= state.queue.length) nextIdx = 0; // loop
      return state.queue[nextIdx];
    }
  }
}

async function preloadNextTrack() {
  try {
    if (state.queueMode === 'downloads') return;
    if (!state.token) return;
    if (state.queueMode === 'vibe' && state.queueIndex + 2 >= state.queue.length) {
      fetchMoreVibeTracks().catch(() => {});
    }

    const nextTrack = getNextTrack();
    if (!nextTrack || !nextTrack.id) return;
    const nextId = String(nextTrack.id);

    if (preloadedTrack && String(preloadedTrack.id) === nextId && preloadPlayer.src) {
      return;
    }

    let artist = 'Unknown';
    if (typeof nextTrack.artists === 'string') {
      artist = nextTrack.artists;
    } else if (Array.isArray(nextTrack.artists)) {
      artist = nextTrack.artists.map(a => a.name || a).join(', ') || 'Unknown';
    }

    let coverUrl = nextTrack.coverUri || nextTrack.cover || PLACEHOLDER_COVER;
    if (coverUrl.includes('%%')) coverUrl = `https://${coverUrl.replace('%%', '400x400')}`;
    if (!coverUrl.startsWith('http') && coverUrl !== PLACEHOLDER_COVER) {
      coverUrl = `https://${coverUrl}`;
    }
    const explicit = nextTrack.explicit || nextTrack.contentWarning === 'explicit';
    const artistId = nextTrack.artistId ||
                     nextTrack.artists?.[0]?.id ||
                     nextTrack.track?.artists?.[0]?.id ||
                     (Array.isArray(nextTrack.artists) ? nextTrack.artists[0]?.id : null);

    if (coverUrl && coverUrl !== PLACEHOLDER_COVER) {
      const img = new Image();
      img.src = coverUrl;
    }

    preloadedTrack = {
      id: nextId,
      title: nextTrack.title || 'Track',
      artist: artist,
      cover: coverUrl,
      explicit: explicit,
      isLiberty: nextTrack.isLiberty,
      artistId: artistId,
      track: nextTrack,
      streamUrl: null
    };

    preloadPromise = (async () => {
      const data = await fetchTrackStream(nextId);
      if (data && data.streamUrl && preloadedTrack && preloadedTrack.id === nextId) {
        preloadedTrack.streamUrl = data.streamUrl;
        preloadPlayer.src = data.streamUrl;
        preloadPlayer.load(); // Buffers beginning of the next track!
      }
    })();
    await preloadPromise;
  } catch (err) {
    console.warn("Preload next track warning:", err.message);
  }
}

// --- Crossfade Transition Engine (Dual Player Seamless Mixing) ---
let crossfadeEnabled = localStorage.getItem('ym_crossfade_enabled') !== 'false';
let crossfadeSec = parseInt(localStorage.getItem('ym_crossfade_sec') || '5', 10);
if (isNaN(crossfadeSec) || crossfadeSec < 1 || crossfadeSec > 12) crossfadeSec = 5;

let isCrossfading = false;
let crossfadeInterval = null;
let crossfadeTimer = null;

function resetCrossfadeState() {
  if (crossfadeInterval) {
    clearInterval(crossfadeInterval);
    crossfadeInterval = null;
  }
  if (crossfadeTimer) {
    clearTimeout(crossfadeTimer);
    crossfadeTimer = null;
  }
  isCrossfading = false;
  try {
    playerA.volume = 1;
    playerB.volume = 1;
  } catch (e) {}
}

function checkAndTriggerCrossfade() {
  if (!crossfadeEnabled || isCrossfading || !state.isPlaying) return;
  if (!activePlayer || !activePlayer.duration || isNaN(activePlayer.duration)) return;
  if (activePlayer.duration < (crossfadeSec * 1.8)) return;

  const remaining = activePlayer.duration - activePlayer.currentTime;
  if (remaining <= crossfadeSec && remaining > 0.4) {
    if (preloadedTrack && preloadPlayer && preloadPlayer.src && preloadPlayer.readyState >= 2) {
      startCrossfade(remaining);
    }
  }
}

async function startCrossfade(durationSec) {
  if (isCrossfading) return;
  isCrossfading = true;

  const outgoingPlayer = activePlayer;
  const incomingPlayer = preloadPlayer;
  const nextTrackInfo = preloadedTrack;

  try {
    incomingPlayer.volume = 0;
    await incomingPlayer.play();
  } catch (e) {
    console.warn("[Crossfade] Failed to start incoming player:", e);
    resetCrossfadeState();
    return;
  }

  const startTime = Date.now();
  const totalMs = Math.max(durationSec * 1000, 800);

  crossfadeInterval = setInterval(() => {
    if (!isCrossfading || outgoingPlayer !== activePlayer) {
      clearInterval(crossfadeInterval);
      return;
    }
    const elapsed = Date.now() - startTime;
    const progress = Math.min(Math.max(elapsed / totalMs, 0), 1);

    outgoingPlayer.volume = Math.max(1 - progress, 0);
    incomingPlayer.volume = Math.min(progress, 1);

    if (progress >= 1) {
      finishCrossfade(outgoingPlayer, incomingPlayer, nextTrackInfo);
    }
  }, 50);

  crossfadeTimer = setTimeout(() => {
    if (isCrossfading && outgoingPlayer === activePlayer) {
      finishCrossfade(outgoingPlayer, incomingPlayer, nextTrackInfo);
    }
  }, totalMs + 200);
}

function finishCrossfade(outgoingPlayer, incomingPlayer, nextTrackInfo) {
  if (crossfadeInterval) clearInterval(crossfadeInterval);
  if (crossfadeTimer) clearTimeout(crossfadeTimer);
  crossfadeInterval = null;
  crossfadeTimer = null;

  if (!isCrossfading) return;

  // The outgoing player is silenced before its own 'ended' event can fire, so the
  // completion must be reported here. Without this, every crossfaded track looked
  // like a skip to Rotor and the "tracks played" counters never moved.
  const outgoingTrackInfo = state.queueMode === 'vibe'
    ? (state.currentTrack || state.queue[state.queueIndex])
    : null;
  const outgoingPos = outgoingPlayer.currentTime || 0;
  const outgoingDur = outgoingPlayer.duration || 0;

  try {
    outgoingPlayer.pause();
    outgoingPlayer.currentTime = 0;
    outgoingPlayer.removeAttribute('src');
    outgoingPlayer.volume = 1;
  } catch (e) {}

  try {
    incomingPlayer.volume = 1;
  } catch (e) {}

  // Swap dual players
  const temp = activePlayer;
  activePlayer = preloadPlayer;
  preloadPlayer = temp;

  isCrossfading = false;
  preloadedTrack = null;
  preloadPromise = null;

  // Credit the played time of the outgoing track and report completion once.
  // recordListeningProgress() already accumulated time frame by frame, so only
  // the tail between the last animation frame and the end may still be missing —
  // exactly like the 'ended' handler does it. Adding the whole position here
  // would double-count the entire track.
  if (outgoingTrackInfo && state.queueMode === 'vibe') {
    const outDur = outgoingDur || outgoingPos;
    if (outDur && lastAudioSampleTime !== null && outDur > lastAudioSampleTime) {
      const remainder = outDur - lastAudioSampleTime;
      if (remainder > 0 && remainder < 900 && typeof accumulateListeningSeconds === 'function') {
        accumulateListeningSeconds(remainder);
      }
    }
    lastAudioSampleTime = null;
    lastAudioCurrentTrackId = null;

    if (typeof recordTrackFinished === 'function') recordTrackFinished();
    sendFeedback('trackFinished', outgoingTrackInfo.id, Math.floor(outDur || 180), Math.floor(outDur || 0));
  }

  // Advance queue & stats
  if (state.queueMode === 'vibe') {
    state.queueIndex++;
    if (state.queueIndex >= state.queue.length) {
      fetchMoreVibeTracks().catch(() => {});
    }
    if (nextTrackInfo) {
      vibeHistoryAdd(nextTrackInfo.id);
      sendFeedback('trackStarted', nextTrackInfo.id, 0);
      if (typeof addTrackToCloudSync === 'function') {
        addTrackToCloudSync(nextTrackInfo.id, nextTrackInfo.track?.albums?.[0]?.id || 0);
      }
    }
  } else {
    if (state.isShuffle) {
      state.queueIndex = (state.nextShuffleIndex !== undefined && state.nextShuffleIndex !== null)
        ? state.nextShuffleIndex
        : Math.floor(Math.random() * state.queue.length);
      state.nextShuffleIndex = null;
    } else {
      state.queueIndex++;
      if (state.queueIndex >= state.queue.length) state.queueIndex = 0;
    }
  }

  const targetTrack = nextTrackInfo || state.queue[state.queueIndex];
  if (targetTrack) {
    updateTrackUI(targetTrack);
  }

  state.isPlaying = true;
  updatePlayButtons();
  setTimeout(preloadNextTrack, 600);
}

let isNavigating = false;
async function playNext(isUserSkip = true) {
  resetCrossfadeState();
  if (isNavigating) return;
  isNavigating = true;
  setTimeout(() => isNavigating = false, 300);
  if (state.queue.length === 0) return;
  
  if (typeof recordListeningProgress === 'function') recordListeningProgress();
  lastAudioSampleTime = null;
  lastAudioCurrentTrackId = null;

  // Repeat means we are not really skipping — do not report a false skip to Rotor.
  if (state.isRepeat) {
    activePlayer.currentTime = 0;
    activePlayer.play();
    return;
  }

  if (state.queueMode === 'vibe' && isUserSkip) {
    sendFeedback('skip', state.queue[state.queueIndex]?.id, Math.floor(activePlayer.currentTime || 0));
  }
  
  if (state.queueMode === 'vibe') {
    state.queueIndex++;
    if (state.queueIndex >= state.queue.length) {
      await fetchMoreVibeTracks();
      if (state.queueIndex >= state.queue.length) {
        // Fallback: fetch a fresh batch directly so continuous playback never
        // falls back to track 0. Must be deduped too — this is exactly the
        // moment a naive concat() would loop the queue.
        try {
          const freshData = await YandexClient.getVibe(state.token, null, state.currentStation || 'user:onyourwave');
          const existingIds = new Set(state.queue.map(t => String(t.id)));
          const extra = dedupeVibeBatch(freshData && freshData.tracks, existingIds);
          if (extra.length > 0) {
            rememberVibeBatch(extra, freshData && freshData.batchId);
            state.queue = state.queue.concat(extra);
          }
        } catch(e) {}
      }
    }
    if (state.queueIndex < state.queue.length) {
      playQueueTrack(state.queue[state.queueIndex]);
    }
  } else {
    if (state.isShuffle) {
      state.queueIndex = (state.nextShuffleIndex !== undefined && state.nextShuffleIndex !== null)
        ? state.nextShuffleIndex
        : Math.floor(Math.random() * state.queue.length);
      state.nextShuffleIndex = null;
    } else {
      state.queueIndex++;
      if (state.queueIndex >= state.queue.length) state.queueIndex = 0; // loop
    }
    const track = state.queue[state.queueIndex];
    playQueueTrack(track);
  }
}

async function playPrev() {
  resetCrossfadeState();
  if (isNavigating) return;
  isNavigating = true;
  setTimeout(() => isNavigating = false, 300);
  if (state.queue.length === 0) return;
  if (activePlayer.currentTime > 3) {
    if (typeof recordListeningProgress === 'function') recordListeningProgress();
    lastAudioSampleTime = 0;
    activePlayer.currentTime = 0;
    return;
  }
  
  if (typeof recordListeningProgress === 'function') recordListeningProgress();
  lastAudioSampleTime = null;
  lastAudioCurrentTrackId = null;
  
  state.queueIndex--;
  if (state.queueIndex < 0) state.queueIndex = state.queue.length - 1;
  const track = state.queue[state.queueIndex];
  playQueueTrack(track);
}

function playQueueTrack(track) {
  if (!track) return;
  
  let artist = 'Unknown';
  if (typeof track.artists === 'string') {
    artist = track.artists;
  } else if (Array.isArray(track.artists)) {
    artist = track.artists.map(a => a.name).join(', ') || 'Unknown';
  }
  
  let coverUrl = track.coverUri || PLACEHOLDER_COVER;
  if (coverUrl.includes('%%')) coverUrl = `https://${coverUrl.replace('%%', '400x400')}`;
  if (!coverUrl.startsWith('http') && coverUrl !== PLACEHOLDER_COVER) {
    coverUrl = `https://${coverUrl}`;
  }
  
  const explicit = track.explicit || track.contentWarning === 'explicit';
  
  if (state.queueMode === 'vibe') {
    vibeHistoryAdd(track.id);
    sendFeedback('trackStarted', track.id, 0);
    if (typeof addTrackToCloudSync === 'function') {
      addTrackToCloudSync(track.id, track.albums?.[0]?.id || track.albumId || track.track?.albums?.[0]?.id || 0);
    }
  }
  
  const artistId = track.artistId ||
                   track.artists?.[0]?.id ||
                   track.track?.artists?.[0]?.id ||
                   (Array.isArray(track.artists) ? track.artists[0]?.id : null);

  playTrack(track.id, track.title, artist, coverUrl, explicit, track.isLiberty, artistId, track);
}

async function playTrack(id, title, artist, cover, explicit, isLiberty, artistId, rawTrack) {
  clearNoisyAutoResume();
  resetCrossfadeState();
  const idStr = String(id);
  const trackInfo = { id: idStr, title, artist, cover, explicit, isLiberty, artistId, track: rawTrack };
  updateTrackUI(trackInfo);
  
  // Set Loading State
  state.isPlaying = false;
  updatePlayButtons();

  if (rawTrack?.offlineUrl) {
    preloadPlayer.pause();
    preloadPlayer.removeAttribute('src');
    preloadedTrack = null;
    preloadPromise = null;
    activePlayer.pause();
    activePlayer.src = rawTrack.offlineUrl;
    try {
      await activePlayer.play();
      state.isPlaying = true;
      updatePlayButtons();
      return;
    } catch (e) {
      console.error('Offline playback failed:', e);
      showToast('Не удалось открыть загруженный файл', 'bi-exclamation-triangle');
      return;
    }
  }
  
  // Check if this track was preloaded and ready in preloadPlayer
  if (preloadedTrack && String(preloadedTrack.id) === idStr) {
    try {
      if (!preloadedTrack.streamUrl && preloadPromise) {
        await preloadPromise;
      }
      
      if (preloadPlayer.src && preloadedTrack.streamUrl) {
        activePlayer.pause();
        activePlayer.currentTime = 0;
        activePlayer.removeAttribute('src');
        
        const temp = activePlayer;
        activePlayer = preloadPlayer;
        preloadPlayer = temp;
        
        preloadedTrack = null;
        preloadPromise = null;
        
        await activePlayer.play();
        state.isPlaying = true;
        updatePlayButtons();
        
        setTimeout(preloadNextTrack, 500);
        return;
      }
    } catch(e) {
      console.warn("Preloaded switch fallback:", e);
    }
  }
  
  // Direct load fallback
  try {
    preloadPlayer.pause();
    preloadPlayer.removeAttribute('src');
    preloadedTrack = null;
    preloadPromise = null;
    
    const data = await fetchTrackStream(idStr);
    if (!data || !data.streamUrl) {
      showToast('Ошибка воспроизведения: нет ссылки на поток', 'bi-exclamation-circle');
      return;
    }
    
    activePlayer.src = data.streamUrl;
    await activePlayer.play();
    state.isPlaying = true;
    updatePlayButtons();
    
    setTimeout(preloadNextTrack, 500);
  } catch (e) {
    console.error("Play error:", e);
    showToast('Сетевая ошибка при загрузке трека', 'bi-wifi-off');
    if (state.queueMode === 'vibe' || state.queue.length > 1) { setTimeout(() => { if (!state.isPlaying) playNext(); }, 1400); }
  }
}

// --- Android / Web MediaSession (Notification Mini Player & Lockscreen) ---
function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.setActionHandler('play', () => {
      clearNoisyAutoResume();
      activePlayer.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      clearNoisyAutoResume();
      activePlayer.pause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrev();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNext();
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && activePlayer.duration) {
        activePlayer.currentTime = details.seekTime;
        updateMediaSessionPosition();
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skip = details.seekOffset || 10;
      activePlayer.currentTime = Math.min((activePlayer.currentTime || 0) + skip, activePlayer.duration || 0);
      updateMediaSessionPosition();
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skip = details.seekOffset || 10;
      activePlayer.currentTime = Math.max((activePlayer.currentTime || 0) - skip, 0);
      updateMediaSessionPosition();
    });
  } catch (e) {
    console.warn("MediaSession action handler error:", e);
  }
}

function syncNativeMedia(title, artist, isPlaying, positionMs, durationMs, coverUrl) {
  if (window.AndroidBridge && typeof window.AndroidBridge.updateMedia === 'function') {
    try {
      const curTitle = title || state.currentTrack?.title || 'YM Liberty';
      const curArtist = artist || state.currentTrack?.artist || 'Музыка';
      if (!curTitle || curTitle === 'YM Liberty') {
        if (!state.currentTrack) return;
      }
      const playing = isPlaying !== undefined ? !!isPlaying : !!state.isPlaying;
      
      let p = positionMs !== undefined ? positionMs : (activePlayer.currentTime || 0) * 1000;
      let d = durationMs !== undefined ? durationMs : (activePlayer.duration || 0) * 1000;
      if (isNaN(p) || !isFinite(p) || p < 0) p = 0;
      if (isNaN(d) || !isFinite(d) || d < 0) d = 0;
      let posMs = Math.round(p);
      let durMs = Math.round(d);
      if (posMs > 2147483647) posMs = 2147483647;
      if (durMs > 2147483647) durMs = 2147483647;

      let cover = coverUrl || state.currentTrack?.cover || '';
      if (cover.includes('100x100')) cover = cover.replace('100x100', '400x400');
      if (cover.includes('%%')) cover = cover.replace('%%', '400x400');
      if (!cover.startsWith('http') && cover && cover !== PLACEHOLDER_COVER) cover = `https://${cover}`;

      window.AndroidBridge.updateMedia(curTitle, curArtist, playing, posMs, durMs, cover);
    } catch (e) {
      console.warn("AndroidBridge updateMedia error:", e);
    }
  }
}

window.handleMediaAction = function(action) {
  console.log("Native media action:", action);
  if (action === 'play_pause') {
    clearNoisyAutoResume();
    handlePlayToggle();
  } else if (action === 'play') {
    clearNoisyAutoResume();
    if (!state.isPlaying) handlePlayToggle();
  } else if (action === 'pause') {
    clearNoisyAutoResume();
    try {
      activePlayer.pause();
      playerA.pause();
      playerB.pause();
    } catch(e) {}
    state.isPlaying = false;
    updatePlayButtons();
  } else if (action === 'noisy') {
    autoPausedTrackId = state.isPlaying && state.currentTrack ? String(state.currentTrack.id) : null;
    if (!autoPausedTrackId) return;
    const position = Number(activePlayer.currentTime);
    if (Number.isFinite(position)) {
      try { savePlaybackState(true); } catch (_) {}
    }
    activePlayer.pause();
    playerA.pause();
    playerB.pause();
    state.isPlaying = false;
    updatePlayButtons();
  } else if (action === 'output_connected') {
    const resumeId = autoPausedTrackId;
    clearNoisyAutoResume();
    if (!resumeId || !state.currentTrack || String(state.currentTrack.id) !== resumeId) return;
    activePlayer.play().then(() => {
      if (!state.currentTrack || String(state.currentTrack.id) !== resumeId) {
        activePlayer.pause();
        return;
      }
      state.isPlaying = true;
      updatePlayButtons();
    }).catch((error) => console.warn('Headphone reconnect resume blocked:', error));
  } else if (action === 'next') {
    clearNoisyAutoResume();
    playNext();
  } else if (action === 'prev') {
    clearNoisyAutoResume();
    playPrev();
  }
};

window.handleMediaSeek = function(posMs) {
  console.log("Native media seek to:", posMs);
  const sec = posMs / 1000;
  if (activePlayer && activePlayer.duration && !isNaN(activePlayer.duration)) {
    activePlayer.currentTime = Math.min(Math.max(sec, 0), activePlayer.duration);
    const percent = (activePlayer.currentTime / activePlayer.duration) * 100;
    if (dom.progressSlider) {
      dom.progressSlider.value = percent;
      setSliderProgress(percent);
    }
    if (dom.miniProgress) {
      dom.miniProgress.style.width = `${percent}%`;
    }
    if (dom.timeCurrent) {
      dom.timeCurrent.textContent = formatTime(activePlayer.currentTime);
    }
    updateMediaSessionPosition();
    savePlaybackState();
  }
};

// Native back button (MainActivity.onBackPressed -> evaluateJavascript).
// Return true when the gesture was consumed by the UI.
window.handleAndroidBack = function() {
  try {
    // 1. Action sheet (three-dots menu) closes first.
    const actionSheet = document.getElementById('action-sheet');
    if (actionSheet && actionSheet.style.display !== 'none' && actionSheet.style.display !== '') {
      if (typeof closeActionSheet === 'function') closeActionSheet();
      else actionSheet.style.display = 'none';
      return true;
    }

    // 2. Update modal, then the auth modal.
    const updateModal = document.getElementById('update-modal');
    if (updateModal && !updateModal.classList.contains('hidden')) {
      updateModal.classList.add('hidden');
      return true;
    }
    const authModal = document.getElementById('auth-modal');
    if (authModal && !authModal.classList.contains('hidden')) {
      authModal.classList.add('hidden');
      return true;
    }

    // 3. Full-screen player slides back down.
    const fullPlayer = document.getElementById('full-player');
    if (fullPlayer && !fullPlayer.classList.contains('translateY-100')) {
      fullPlayer.classList.add('translateY-100');
      return true;
    }

    // 4. Sub-views navigate back through the view history.
    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id !== 'view-vibe' && state.viewHistory && state.viewHistory.length > 0) {
      navigateBack();
      return true;
    }

    // 5. On the main tab: let the system handle it (minimise the app).
    return false;
  } catch (e) {
    console.warn('handleAndroidBack error:', e);
    return false;
  }
};

function updateMediaSession(trackInfo) {
  if (trackInfo) {
    syncNativeMedia(trackInfo.title, trackInfo.artist, state.isPlaying, (activePlayer.currentTime || 0) * 1000, (activePlayer.duration || 0) * 1000, trackInfo.cover);
  }
  if (!('mediaSession' in navigator) || !trackInfo) return;
  try {
    let coverUrl = trackInfo.cover || PLACEHOLDER_COVER;
    if (coverUrl.includes('100x100')) coverUrl = coverUrl.replace('100x100', '400x400');
    if (!coverUrl.startsWith('http') && coverUrl !== PLACEHOLDER_COVER) coverUrl = `https://${coverUrl}`;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: trackInfo.title || 'Unknown Title',
      artist: trackInfo.artist || 'Unknown Artist',
      album: 'YM Liberty',
      artwork: [
        { src: coverUrl, sizes: '96x96', type: 'image/png' },
        { src: coverUrl, sizes: '128x128', type: 'image/png' },
        { src: coverUrl, sizes: '192x192', type: 'image/png' },
        { src: coverUrl, sizes: '256x256', type: 'image/png' },
        { src: coverUrl, sizes: '384x384', type: 'image/png' },
        { src: coverUrl, sizes: '512x512', type: 'image/png' }
      ]
    });
    navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
    updateMediaSessionPosition();
  } catch (e) {
    console.warn("MediaSession metadata error:", e);
  }
}

function updateMediaSessionPosition() {
  if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
  try {
    if (activePlayer && activePlayer.duration && !isNaN(activePlayer.duration) && activePlayer.duration > 0) {
      navigator.mediaSession.setPositionState({
        duration: activePlayer.duration,
        playbackRate: activePlayer.playbackRate || 1,
        position: Math.min(Math.max(activePlayer.currentTime || 0, 0), activePlayer.duration)
      });
    }
  } catch (e) {}
}

// --- State Persistence (Save & Restore last played track) ---
let lastSavedStateTime = 0;
let lastProgressSavedPos = 0;

// Queue entries carry the raw Yandex track payload (`t.track`), which makes the
// serialised session balloon to hundreds of KB and get re-stringified every
// 1.5 s. Only the fields playback actually needs are persisted.
function slimQueueEntry(t) {
  if (!t) return t;
  return {
    id: t.id,
    title: t.title,
    version: t.version || '',
    artists: typeof t.artists === 'string'
      ? t.artists
      : (Array.isArray(t.artists) ? t.artists.map(a => (a && a.name) || a).join(', ') : ''),
    durationMs: t.durationMs || 0,
    coverUri: t.coverUri || t.cover || '',
    explicit: !!t.explicit,
    isLiberty: !!t.isLiberty,
    albumId: t.albumId || t.albums?.[0]?.id || 0,
    artistId: t.artistId || t.artists?.[0]?.id || null
  };
}

function savePlaybackState(force = false) {
  if (!state.currentTrack || !state.currentTrack.id) return;
  const now = Date.now();
  if (!force && now - lastSavedStateTime < 1500) return;
  lastSavedStateTime = now;

  try {
    const activeMood = localStorage.getItem('ym_active_vibe_mood') || (typeof getWaveStats === 'function' ? getWaveStats().mood : null);
    const dataToSave = {
      track: slimQueueEntry(state.currentTrack),
      currentTime: activePlayer ? (activePlayer.currentTime || 0) : 0,
      duration: activePlayer ? (activePlayer.duration || 0) : 0,
      queue: (state.queue || []).map(slimQueueEntry),
      queueIndex: state.queueIndex || 0,
      queueMode: state.queueMode || 'library',
      currentStation: state.currentStation || 'user:onyourwave',
      playbackContext: state.playbackContext || null,
      vibeMood: activeMood,
      // Persist batch attribution so feedback keeps working right after a restart.
      vibeBatchId: state.vibeBatchId || null,
      vibeBatchByTrack: state.vibeBatchByTrack || {},
      isShuffle: !!state.isShuffle,
      isRepeat: !!state.isRepeat,
      timestamp: now
    };
    localStorage.setItem('ym_last_session', JSON.stringify(dataToSave));
  } catch (e) {
    // QuotaExceededError used to fail silently, which killed session restore
    // with no diagnostic. Recover by dropping the queue payload.
    try {
      const fallback = {
        track: slimQueueEntry(state.currentTrack),
        currentTime: activePlayer ? (activePlayer.currentTime || 0) : 0,
        duration: activePlayer ? (activePlayer.duration || 0) : 0,
        queue: [],
        queueIndex: 0,
        queueMode: 'library',
        currentStation: state.currentStation || 'user:onyourwave',
        playbackContext: state.playbackContext || null,
        vibeMood: localStorage.getItem('ym_active_vibe_mood') || null,
        isShuffle: !!state.isShuffle,
        isRepeat: !!state.isRepeat,
        timestamp: Date.now()
      };
      localStorage.setItem('ym_last_session', JSON.stringify(fallback));
      console.warn('Session state exceeded storage quota; saved without queue.');
    } catch (e2) {
      console.warn('Could not persist playback state:', e2 && e2.message);
    }
  }
}

function restorePlaybackState() {
  try {
    const raw = localStorage.getItem('ym_last_session');
    if (!raw) return;
    const session = JSON.parse(raw);
    if (!session || !session.track || !session.track.id) return;

    state.queue = session.queue || [];
    state.queueIndex = session.queueIndex || 0;
    state.queueMode = session.queueMode || 'library';
    state.currentStation = session.currentStation || 'user:onyourwave';
    // Restore Rotor batch attribution so feedback is not silently dropped after
    // a restart (the gate in sendFeedback needs a batch id).
    state.vibeBatchId = session.vibeBatchId || null;
    state.vibeBatchByTrack = session.vibeBatchByTrack || {};
    if (session.playbackContext) {
      state.playbackContext = session.playbackContext;
      updatePlaybackContextHeader(session.playbackContext.subtitle, session.playbackContext.title);
    }
    const savedMood = session.vibeMood || (session.playbackContext?.title?.includes('•') ? session.playbackContext.title.split('•')[1]?.trim() : null) || localStorage.getItem('ym_active_vibe_mood');
    if (savedMood && typeof syncVibeMoodUI === 'function') {
      syncVibeMoodUI(savedMood);
    }
    state.isShuffle = !!session.isShuffle;
    state.isRepeat = !!session.isRepeat;

    const btnShuffle = document.getElementById('btn-full-shuffle');
    const btnRepeat = document.getElementById('btn-full-repeat');
    if (btnShuffle) {
      if (state.isShuffle) btnShuffle.classList.add('active');
      else btnShuffle.classList.remove('active');
    }
    if (btnRepeat) {
      if (state.isRepeat) btnRepeat.classList.add('active');
      else btnRepeat.classList.remove('active');
    }

    state.isPlaying = false;
    const track = session.track;
    updateTrackUI(track);
    updatePlayButtons();

    const savedTime = session.currentTime || 0;
    const duration = session.duration || 0;
    if (duration > 0 && dom.timeTotal) {
      dom.timeTotal.textContent = formatTime(duration);
    }
    if (dom.timeCurrent) {
      dom.timeCurrent.textContent = formatTime(savedTime);
    }
    if (dom.progressSlider && duration > 0) {
      dom.progressSlider.value = (savedTime / duration) * 100;
      setSliderProgress((savedTime / duration) * 100);
    }
    if (dom.miniProgress && duration > 0) {
      dom.miniProgress.style.width = `${(savedTime / duration) * 100}%`;
    }

    // Pre-stage stream URL into activePlayer without autoplaying
    fetchTrackStream(track.id).then(data => {
      if (data && data.streamUrl) {
        activePlayer.src = data.streamUrl;
        activePlayer.currentTime = savedTime;
      }
    }).catch(() => {});

    setTimeout(preloadNextTrack, 1000);
  } catch (e) {
    console.warn("Could not restore playback session:", e);
  }
}

window.addEventListener('beforeunload', () => savePlaybackState(true));
window.addEventListener('pagehide', () => savePlaybackState(true));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') savePlaybackState(true);
});

function updateTrackUI(trackInfo) {
  state.currentTrack = trackInfo;
  
  const badgeHtml = trackInfo.isLiberty ? `<span class="liberty-badge"><i class="bi bi-gem"></i></span>` : (trackInfo.explicit ? `<span class="explicit-badge">E</span>` : '');
  dom.miniTitle.innerHTML = `<span class="track-title-text">${escapeHtml(trackInfo.title)}</span>${badgeHtml}`;
  dom.miniArtist.textContent = trackInfo.artist;
  dom.miniCover.src = trackInfo.cover;
  
  dom.fullTitle.innerHTML = `<span class="track-title-text">${escapeHtml(trackInfo.title)}</span>${badgeHtml}`;
  dom.fullArtist.textContent = trackInfo.artist;
  
  if (trackInfo.cover.includes('1000x1000')) {
    dom.fullCover.src = trackInfo.cover;
    if (state.isPlaying) {
      dom.fullCover.classList.add('playing');
    } else {
      dom.fullCover.classList.remove('playing');
    }
  } else {
    dom.fullCover.src = trackInfo.cover.replace('100x100', '400x400');
  }
  
  // Instantly reset progress bar
  if (dom.progressSlider) {
    dom.progressSlider.value = 0;
    setSliderProgress(0);
  }
  if (dom.miniProgress) dom.miniProgress.style.width = '0%';
  if (dom.timeCurrent) dom.timeCurrent.textContent = "0:00";
  if (dom.timeTotal) dom.timeTotal.textContent = "0:00";
  
  if (dom.toggleDynamicBg.checked) {
    dom.dynamicBg.style.backgroundImage = `url(${trackInfo.cover})`;
  }
  
  // The legacy .blob layers are permanently hidden (app.css: display:none
  // !important) — the canvas aura replaced them. Setting backgroundImage on two
  // invisible nodes on every track change was pure dead work.

  // Dynamic Full Player Colorful Cover Backdrop
  const fullPlayerBg = document.getElementById('full-player-bg');
  if (fullPlayerBg && trackInfo.cover) {
    let coverHigh = trackInfo.cover;
    if (coverHigh.includes('%%')) coverHigh = coverHigh.replace('%%', '400x400');
    if (coverHigh.includes('100x100')) coverHigh = coverHigh.replace('100x100', '400x400');
    if (!coverHigh.startsWith('http') && coverHigh && coverHigh !== PLACEHOLDER_COVER) {
      coverHigh = `https://${coverHigh}`;
    }
    fullPlayerBg.style.backgroundImage = `url("${coverHigh}")`;
  }

  if (typeof updateVibeAmbientAura === 'function') {
    updateVibeAmbientAura(trackInfo.cover);
  }
  
  dom.miniPlayer.classList.remove('hidden');
  
  // Update like button
  const isLiked = state.likedTrackIds && state.likedTrackIds.has(String(trackInfo.id));
  const heartIcon = dom.btnLike.querySelector('i');
  if (isLiked) {
    heartIcon.className = 'bi bi-heart-fill text-danger';
    heartIcon.style.color = '#ff3333';
  } else {
    heartIcon.className = 'bi bi-heart';
    heartIcon.style.color = 'inherit';
  }

  // Update MediaSession notification & save state
  updateMediaSession(trackInfo);
  updatePlaybackContextHeader();
  savePlaybackState();

  // Fetch this track's lyrics and decide whether the button may be shown.
  // Fire-and-forget: a slow or missing response must never delay the UI.
  if (typeof loadLyricsForCurrentTrack === 'function') loadLyricsForCurrentTrack();
}

// Like Button Logic
dom.btnLike = document.getElementById('btn-like');
if (dom.btnLike) {
  dom.btnLike.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!state.currentTrack || !state.currentTrack.id || !state.token) return;
    
    const trackId = String(state.currentTrack.id);
    const isLiked = state.likedTrackIds ? state.likedTrackIds.has(trackId) : false;
    const action = isLiked ? 'unlike' : 'like';
    
    // Optimistic UI update
    const heartIcon = dom.btnLike.querySelector('i');
    if (isLiked) {
      state.likedTrackIds.delete(trackId);
      heartIcon.className = 'bi bi-heart';
      heartIcon.style.color = 'inherit';
      state.tracks = state.tracks.filter(t => String(t.id) !== trackId);
      renderTracks();
    } else {
      state.likedTrackIds.add(trackId);
      heartIcon.className = 'bi bi-heart-fill text-danger';
      heartIcon.style.color = '#ff3333';
      // inject to library
      state.tracks.unshift({
        id: trackId,
        title: state.currentTrack.title,
        artists: state.currentTrack.artist,
        coverUri: state.currentTrack.cover || PLACEHOLDER_COVER,
        explicit: state.currentTrack.explicit,
        isLiberty: state.currentTrack.isLiberty,
        artistId: state.currentTrack.artistId,
        track: state.currentTrack.track || state.currentTrack
      });
      renderTracks();
    }
    
    try {
      const res = await YandexClient.like(trackId, action, state.token);
      if (res && res.success === false) {
        throw new Error('Like rejected by API');
      }
    } catch (e) {
      console.error('Like failed', e);
      // Revert on failure
      if (isLiked) {
        state.likedTrackIds.add(trackId);
        heartIcon.className = 'bi bi-heart-fill text-danger';
        heartIcon.style.color = '#ff3333';
      } else {
        state.likedTrackIds.delete(trackId);
        heartIcon.className = 'bi bi-heart';
        heartIcon.style.color = 'inherit';
      }
    }
  });
}

// True only when the plain Wave station owns the player. Must stay in step
// with the guard in startVibe(): that function decides whether a click toggles
// playback or starts a fresh session, and the icon has to promise the same
// thing. A track from a library/album/playlist must not paint the Wave button
// as "now playing".
function isPlainVibePlaying() {
  return state.queueMode === 'vibe'
    && (!state.currentStation || state.currentStation === 'user:onyourwave')
    && state.queue.length > 0
    && state.queueIndex < state.queue.length;
}

function updatePlayButtons() {
    const icon = state.isPlaying ? 'bi-pause-fill' : 'bi-play-fill';
    dom.miniBtnPlay.innerHTML = `<i class="bi ${icon}"></i>`;
    dom.fullBtnPlay.innerHTML = `<i class="bi ${icon}"></i>`;
    dom.vibePlayBtn.innerHTML = `<i class="bi ${state.isPlaying && isPlainVibePlaying() ? 'bi-pause-fill' : 'bi-play-fill'}"></i>`;

    // Dynamic 3D Cover Pop / Recede on Play/Pause
    if (dom.fullCover) {
      if (state.isPlaying) {
        dom.fullCover.classList.add('playing');
      } else {
        dom.fullCover.classList.remove('playing');
      }
    }
  }

// Audio Events for Both Dual Players
function bindAudioPlayerEvents(player) {
  player.addEventListener('play', (e) => {
    if (e.target !== activePlayer) return;
    state.isPlaying = true;
      if (window.AndroidBridge && typeof window.AndroidBridge.requestNotificationPermission === 'function') {
        window.AndroidBridge.requestNotificationPermission();
      }
      lastAudioSampleTime = activePlayer.currentTime || 0;
    lastAudioCurrentTrackId = state.currentTrack?.id || 'current';
    updatePlayButtons();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    savePlaybackState(true);
    syncNativeMedia(state.currentTrack?.title, state.currentTrack?.artist, true, (activePlayer.currentTime || 0) * 1000, (activePlayer.duration || 0) * 1000, state.currentTrack?.cover);
    if (typeof applyEqualizerSettings === 'function') applyEqualizerSettings();
  });
  player.addEventListener('pause', (e) => {
    if (e.target !== activePlayer) return;
    if (typeof recordListeningProgress === 'function') recordListeningProgress();
    lastAudioSampleTime = null;
    state.isPlaying = false;
    updatePlayButtons();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    savePlaybackState(true);
    syncNativeMedia(state.currentTrack?.title, state.currentTrack?.artist, false, (activePlayer.currentTime || 0) * 1000, (activePlayer.duration || 0) * 1000, state.currentTrack?.cover);
    if (typeof scheduleAccountStatsSync === 'function') scheduleAccountStatsSync();
  });
  player.addEventListener('timeupdate', (e) => {
    if (e.target !== activePlayer) return;
    if (typeof recordListeningProgress === 'function') recordListeningProgress();
    checkAndTriggerCrossfade();
  });
  player.addEventListener('durationchange', (e) => {
    if (e.target !== activePlayer) return;
    syncNativeMedia(state.currentTrack?.title, state.currentTrack?.artist, state.isPlaying, (activePlayer.currentTime || 0) * 1000, (activePlayer.duration || 0) * 1000, state.currentTrack?.cover);
  });
  player.addEventListener('ended', (e) => {
    if (e.target !== activePlayer) return;
    if (isCrossfading) return; // Crossfade transition is in progress
    const dur = activePlayer.duration || activePlayer.currentTime;
    if (dur && lastAudioSampleTime !== null && dur > lastAudioSampleTime) {
      const rem = dur - lastAudioSampleTime;
      if (rem > 0 && rem < 900 && typeof accumulateListeningSeconds === 'function') {
        accumulateListeningSeconds(rem);
      }
    }
    lastAudioSampleTime = null;
    lastAudioCurrentTrackId = null;

    if (typeof recordTrackFinished === 'function') recordTrackFinished();
    if (state.queueMode === 'vibe') {
      const durSec = Math.floor(activePlayer.duration || activePlayer.currentTime || 180);
      sendFeedback('trackFinished', state.queue[state.queueIndex]?.id, durSec, Math.floor(activePlayer.duration || durSec));
    }
    state.isPlaying = false;
    updatePlayButtons();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
    syncNativeMedia(state.currentTrack?.title, state.currentTrack?.artist, false, 0, 0, state.currentTrack?.cover);
    playNext(false);
  });
}
bindAudioPlayerEvents(playerA);
bindAudioPlayerEvents(playerB);

// Format time utility
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// The fullscreen slider is a bare <input type=range> with
// -webkit-appearance:none, which strips Blink's built-in played-segment fill.
// The CSS paints that fill from a --progress custom property instead, so every
// writer of slider.value has to publish the percentage here too — otherwise
// the thumb moves but the track behind it stays flat.
function setSliderProgress(percent) {
  if (!dom.progressSlider) return;
  const p = Number(percent);
  const clamped = Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0;
  dom.progressSlider.style.setProperty('--progress', clamped + '%');
}

function updateProgress() {
  if (state.isPlaying && activePlayer && activePlayer.duration && !isNaN(activePlayer.duration)) {
    checkAndTriggerCrossfade();
    const current = activePlayer.currentTime || 0;
    const duration = activePlayer.duration;
    const percent = (current / duration) * 100;

    if (dom.progressSlider && !state.isDraggingSlider) {
      dom.progressSlider.value = percent;
      setSliderProgress(percent);
    }
    if (dom.miniProgress) {
      dom.miniProgress.style.width = `${percent}%`;
    }
    if (dom.timeCurrent) {
      dom.timeCurrent.textContent = formatTime(current);
    }
    if (dom.timeTotal && dom.timeTotal.textContent === "0:00") {
      dom.timeTotal.textContent = formatTime(duration);
    }
    if (typeof recordListeningProgress === 'function') recordListeningProgress();
    updateMediaSessionPosition();
    // No-ops unless the lyrics panel is open, so the rAF cost is one branch.
    if (typeof updateLyricsHighlight === 'function') updateLyricsHighlight();

    // savePlaybackState() throttles itself to 1.5 s, but calling it from the
    // animation loop still ran a full JSON.stringify many times per second.
    // Persist the position once every 5 s instead — that is plenty for session
    // restore, and the unload/visibility handlers still force an immediate save.
    if (typeof savePlaybackState === 'function' && current - lastProgressSavedPos >= 5) {
      lastProgressSavedPos = current;
      savePlaybackState();
    }
  }
  requestAnimationFrame(updateProgress);
}
requestAnimationFrame(updateProgress);

// Seeking logic
if (dom.progressSlider) {
  dom.progressSlider.addEventListener('input', (e) => {
    state.isDraggingSlider = true;
    // Follow the thumb while scrubbing: updateProgress deliberately skips the
    // slider during a drag, so without this the fill would freeze mid-gesture.
    setSliderProgress(e.target.value);
    const duration = activePlayer?.duration;
    if (duration && !isNaN(duration)) {
      dom.timeCurrent.textContent = formatTime((e.target.value / 100) * duration);
    }
  });
  
  dom.progressSlider.addEventListener('change', (e) => {
    state.isDraggingSlider = false;
    const duration = activePlayer?.duration;
    if (duration && !isNaN(duration)) {
      activePlayer.currentTime = (e.target.value / 100) * duration;
      lastAudioSampleTime = activePlayer.currentTime;
      syncNativeMedia(state.currentTrack?.title, state.currentTrack?.artist, state.isPlaying, (activePlayer.currentTime || 0) * 1000, duration * 1000, state.currentTrack?.cover);
    }
  });
}

// Vibe Logic & Playback Memory
const VIBE_HISTORY_KEY = 'ym_vibe_history';
function loadVibeHistory() {
  try {
    const raw = localStorage.getItem(VIBE_HISTORY_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map(String));
    }
  } catch (e) {}
  return new Set();
}

function saveVibeHistory() {
  try {
    const arr = Array.from(state.vibeHistory || []).slice(-1000);
    localStorage.setItem(VIBE_HISTORY_KEY, JSON.stringify(arr));
  } catch (e) {}
}

state.vibeHistory = loadVibeHistory();

// --- Anti-loop deduplication engine ---
// Rotor is free to recommend a track we already played. We keep a persisted,
// ordered history and never enqueue anything that is in it, unless the whole
// candidate batch is already known — then we fall back to the least-recently
// played candidates so playback never stalls.
const VIBE_DEDUP_LIMIT = 1000; // how many history ids we consider "recent enough" to avoid

function vibeHistoryAdd(trackId) {
  if (!trackId) return;
  state.vibeHistory = state.vibeHistory || new Set();
  const id = String(trackId);
  // Re-insert at the tail so the ordering reflects "most recently played".
  state.vibeHistory.delete(id);
  state.vibeHistory.add(id);
  while (state.vibeHistory.size > VIBE_DEDUP_LIMIT) {
    const iter = state.vibeHistory.values();
    state.vibeHistory.delete(iter.next().value);
  }
  if (typeof saveVibeHistory === 'function') saveVibeHistory();
}

function vibeIsKnown(trackId) {
  return !!(state.vibeHistory && state.vibeHistory.has(String(trackId)));
}

/**
 * Filter a freshly fetched Rotor batch against everything we must not repeat.
 * @param {Array} candidates raw normalised tracks from YandexClient.getVibe
 * @param {Set<string>} extraIds additional ids to exclude (e.g. current queue)
 * @param {number} lookback how many trailing history entries count as "too recent"
 */
function dedupeVibeBatch(candidates, extraIds, lookback = VIBE_DEDUP_LIMIT) {
  const list = Array.isArray(candidates) ? candidates.filter(t => t && t.id) : [];
  if (list.length === 0) return [];

  const historyArr = Array.from(state.vibeHistory || []);
  const recent = new Set(historyArr.slice(-Math.max(lookback, 1)).map(String));
  const blocked = new Set(recent);
  if (extraIds) extraIds.forEach(id => blocked.add(String(id)));

  let fresh = list.filter(t => !blocked.has(String(t.id)));
  if (fresh.length > 0) return fresh;

  // Everything is a repeat. Relax in stages so playback keeps going, but always
  // prefer the candidates we have not heard for the longest time (they are at
  // the head of the history array, so a plain order-preserving filter scores best).
  const older = new Set(historyArr.slice(0, Math.max(0, historyArr.length - lookback)).map(String));
  fresh = list.filter(t => !older.has(String(t.id)));
  if (fresh.length > 0) return fresh;

  // Absolute last resort: only avoid the track that is playing right now.
  return list;
}

function rememberVibeBatch(tracks, batchId) {
  if (!batchId) return;
  state.vibeBatchId = batchId;
  state.vibeBatchByTrack = state.vibeBatchByTrack || {};
  (tracks || []).forEach(t => {
    if (t && t.id) state.vibeBatchByTrack[String(t.id)] = batchId;
  });
}

function vibeBatchForTrack(trackId) {
  const byTrack = state.vibeBatchByTrack || {};
  if (trackId && byTrack[String(trackId)]) return byTrack[String(trackId)];
  return state.vibeBatchId || null;
}

async function startVibe() {
  if (state.queueMode === 'vibe' && (!state.currentStation || state.currentStation === 'user:onyourwave') && state.queue.length > 0 && state.queueIndex < state.queue.length) {
    // If already in standard Vibe mode, just toggle play/pause
    if (state.isPlaying) return activePlayer.pause();
    return activePlayer.play();
  }
  
  // Otherwise, stop current track and start a fresh Vibe session
  activePlayer.pause();
  state.currentStation = 'user:onyourwave';
  updatePlaybackContextHeader('ИГРАЕТ ИЗ ВОЛНЫ', 'Моя Волна');
  dom.vibePlayBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
  
  try {
    let data = await YandexClient.getVibe(state.token, null, 'user:onyourwave');
    
    if (data.shadowbanned) {
      showToast('Яндекс ограничил аккаунт. Попробуйте сменить станцию', 'bi-exclamation-triangle');
      dom.vibePlayBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
      return;
    }
    
    let tracks = data.tracks || [];
    // Avoid everything already played. Falls back gracefully inside the helper.
    let freshTracks = dedupeVibeBatch(tracks, null, VIBE_DEDUP_LIMIT);
    
    if (freshTracks.length > 0) {
      state.queueMode = 'vibe';
      rememberVibeBatch(freshTracks, data.batchId);
      state.queue = freshTracks;
      state.queueIndex = 0;
      
      const firstTrack = state.queue[0];
      sendFeedback('radioStarted', firstTrack.id, 0);
      playQueueTrack(firstTrack);

      // Pre-fill queue with next tracks in background
      setTimeout(() => {
        fetchMoreVibeTracks().catch(() => {});
      }, 1200);
    } else {
      // Rotor returned nothing usable (empty batch or shadowban without a hint).
      // Never leave the button stuck on the spinner.
      showToast('Волна не вернула треки. Попробуйте ещё раз', 'bi-exclamation-circle');
      dom.vibePlayBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
    }
  } catch (e) {
    console.error("Vibe start error", e);
    showToast('Ошибка загрузки Волны', 'bi-exclamation-circle');
    dom.vibePlayBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
  }
}

async function fetchMoreVibeTracks() {
  if (state.isFetchingVibe) return;
  state.isFetchingVibe = true;
  // Captured before the awaits: if the user switches the mood while this
  // refill is in flight, state.moodRequestSeq moves on and every track below
  // belongs to the previous mood. Appending them would undo the switch.
  const requestSeq = state.moodRequestSeq;
  try {
    const station = state.currentStation || 'user:onyourwave';
    // Use the track that actually played/is playing (registered with Rotor feedback)
    const currentTr = state.currentTrack || state.queue[state.queueIndex];
    const trackForQueue = currentTr ? currentTr.id : null;
    let data = await YandexClient.getVibe(state.token, trackForQueue, station);
    if (requestSeq !== state.moodRequestSeq) return;

    const existingIds = new Set(state.queue.map(t => String(t.id)));
    let freshTracks = dedupeVibeBatch(data && data.tracks, existingIds);

    // If Rotor returned duplicates, request fresh recommendation batch without queue
    if (freshTracks.length === 0) {
      data = await YandexClient.getVibe(state.token, null, station);
      if (requestSeq !== state.moodRequestSeq) return;
      freshTracks = dedupeVibeBatch(data && data.tracks, existingIds);
    }

    // If still empty, ask with a seeded queue anchored on an older track
    if (freshTracks.length === 0) {
      const anchor = state.queue[Math.max(0, state.queueIndex - 5)];
      data = await YandexClient.getVibe(state.token, anchor ? anchor.id : null, station);
      if (requestSeq !== state.moodRequestSeq) return;
      freshTracks = dedupeVibeBatch(data && data.tracks, existingIds);
    }

    if (freshTracks.length > 0) {
      rememberVibeBatch(freshTracks, data && data.batchId);
      state.queue = state.queue.concat(freshTracks);
      // Prune played tracks far in the past to avoid unbounded queue growth.
      // History (persisted, 1000 entries) is what actually prevents repeats,
      // so dropping old queue entries here is now safe.
      if (state.queueIndex > 25) {
        const dropCount = state.queueIndex - 10;
        state.queue.splice(0, dropCount);
        state.queueIndex -= dropCount;
      }
    }
  } catch(e) {
    console.error("Failed to fetch more vibe tracks", e);
  } finally {
    state.isFetchingVibe = false;
  }
}

async function startTrackVibe(seedTrack) {
  if (!seedTrack) return;
  const rawTrack = seedTrack.track || seedTrack;
  const trackId = String(rawTrack.id || seedTrack.id || '');
  const trackTitle = rawTrack.title || seedTrack.title || 'Трек';
  let artistName = '';
  if (typeof seedTrack.artists === 'string') {
    artistName = seedTrack.artists;
  } else if (Array.isArray(seedTrack.artists)) {
    artistName = seedTrack.artists.map(a => a.name || a).join(', ');
  } else if (rawTrack.artists) {
    artistName = rawTrack.artists.map(a => a.name || a).join(', ');
  }

  // When the seed is the track that is playing right now, playback must keep
  // running: pausing for the network round-trip and then playQueueTrack()
  // restarted it from 0:00, which is exactly what "Волна по треку" used to do
  // to the user's current position. Build the new queue underneath the live
  // audio instead and let the natural 'ended' handler advance into it.
  const seedIsLive = state.isPlaying && state.currentTrack
    && String(state.currentTrack.id) === trackId;

  if (!seedIsLive) {
    activePlayer.pause();
  }
  state.queueMode = 'vibe';
  state.currentStation = 'track:' + trackId;
  updatePlaybackContextHeader('ВОЛНА ПО ТРЕКУ', trackTitle);
  showToast(`Запущена Волна по треку: ${trackTitle}`);

  try {
    const data = await YandexClient.getVibe(state.token, null, state.currentStation);
    if (data.shadowbanned) {
      showToast('Яндекс вернул пустую Волну');
    }

    state.vibeBatchByTrack = {};
    rememberVibeBatch([{ id: trackId }], data.batchId);

    let coverUrl = seedTrack.coverUri || rawTrack.coverUri || '';
    if (coverUrl.includes('%%')) coverUrl = `https://${coverUrl.replace('%%', '400x400')}`;
    if (!coverUrl) coverUrl = PLACEHOLDER_COVER;

    const isExplicit = Boolean(seedTrack.explicit || rawTrack.explicit || rawTrack.contentWarning === 'explicit');
    const isLiberty = Boolean(seedTrack.isLiberty || rawTrack.isLiberty);

    // Reuse the live track object so the player keeps its identity (cover,
    // raw API object) while the queue is rebuilt around it.
    const initialTrack = seedIsLive ? state.currentTrack : {
      id: trackId,
      title: trackTitle,
      artists: artistName,
      coverUri: coverUrl,
      explicit: isExplicit,
      isLiberty: isLiberty,
      track: rawTrack
    };

    // The seed track is intentionally first, so exclude it before deduping.
    const excluded = new Set([String(trackId)]);
    let waveTracks = dedupeVibeBatch(data.tracks, excluded, 100);
    rememberVibeBatch(waveTracks, data.batchId);
    state.queue = [initialTrack, ...waveTracks];
    state.queueIndex = 0;

    if (seedIsLive) {
      // Don't re-announce a session/track that Rotor already knows is playing;
      // just make sure the first real Wave track is ready to take over.
      updatePlayButtons();
      if (typeof preloadNextTrack === 'function') preloadNextTrack();
    } else {
      sendFeedback('radioStarted', trackId, 0);
      playQueueTrack(initialTrack);
    }
  } catch (err) {
    console.error('Error starting track wave:', err);
    showToast('Ошибка запуска Волны по треку');
    state.queue = [seedTrack];
    state.queueIndex = 0;
    if (!seedIsLive) playQueueTrack(seedTrack);
  }
}

// UI Play Toggles
function handlePlayToggle(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (!state.currentTrack) return;
  clearNoisyAutoResume();
  if (state.isPlaying) {
    activePlayer.pause();
  } else {
    activePlayer.play();
  }
}

dom.miniBtnPlay.addEventListener('click', handlePlayToggle);
dom.fullBtnPlay.addEventListener('click', handlePlayToggle);
dom.vibePlayBtn.addEventListener('click', startVibe);

if (dom.miniBtnNext) dom.miniBtnNext.addEventListener('click', (e) => { e.stopPropagation(); playNext(); });

const btnFullNext = document.getElementById('btn-full-next');
const btnFullPrev = document.getElementById('btn-full-prev');
if (btnFullNext) btnFullNext.addEventListener('click', playNext);
if (btnFullPrev) btnFullPrev.addEventListener('click', playPrev);

const btnShuffle = document.getElementById('btn-full-shuffle');
const btnRepeat = document.getElementById('btn-full-repeat');
if (btnShuffle) btnShuffle.addEventListener('click', () => {
  state.isShuffle = !state.isShuffle;
  if (state.isShuffle) {
    btnShuffle.classList.add('active');
  } else {
    btnShuffle.classList.remove('active');
  }
  state.nextShuffleIndex = null;
  preloadNextTrack();
});
if (btnRepeat) btnRepeat.addEventListener('click', () => {
  state.isRepeat = !state.isRepeat;
  if (state.isRepeat) {
    btnRepeat.classList.add('active');
  } else {
    btnRepeat.classList.remove('active');
  }
  preloadNextTrack();
});

// Search Logic
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchTimeout;

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (!query) {
      searchResults.innerHTML = '';
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      try {
        const data = await YandexClient.search(query, state.token);
        renderSearchResults(data);
      } catch (err) {}
    }, 500);
  });
}

function renderSearchResults(data) {
  if (!searchResults) return;
  searchResults.innerHTML = '';
  
  const tracks = data.tracks || [];
  const artists = data.artists || [];
  
  if (tracks.length === 0 && artists.length === 0) {
    searchResults.innerHTML = '<div style="color:var(--text-secondary); text-align:center;">Ничего не найдено</div>';
    return;
  }
  
  // Render Artists First
  if (artists.length > 0) {
    const artistTitle = document.createElement('h3');
    artistTitle.textContent = 'Артисты';
    artistTitle.style.marginBottom = '10px';
    artistTitle.style.fontSize = '18px';
    searchResults.appendChild(artistTitle);
    
    artists.slice(0, 3).forEach(a => {
      const div = document.createElement('div');
      div.className = 'track-item';
      div.innerHTML = `
        <img src="${a.coverUri || PLACEHOLDER_COVER}" alt="cover" style="border-radius: 50%;">
        <div class="track-info">
          <div class="track-title">${escapeHtml(a.name)}</div>
          <div class="track-artist">Артист</div>
        </div>
      `;
      div.addEventListener('click', () => openArtist(a.id));
      searchResults.appendChild(div);
    });
  }
  
  // Render Tracks
  if (tracks.length > 0) {
    const tracksTitle = document.createElement('h3');
    tracksTitle.textContent = 'Треки';
    tracksTitle.style.marginTop = '20px';
    tracksTitle.style.marginBottom = '10px';
    tracksTitle.style.fontSize = '18px';
    searchResults.appendChild(tracksTitle);
    
    tracks.forEach(t => {
      const div = document.createElement('div');
      div.className = 'track-item';
      
      const isExplicit = t.explicit || t.contentWarning === 'explicit';
      const badgeHtml = t.isLiberty ? `<span class="liberty-badge"><i class="bi bi-gem"></i></span>` : (isExplicit ? `<span class="explicit-badge">E</span>` : '');
      // Search results are real tracks too, so expose the context menu.
      div._trackData = t;
      div.innerHTML = `
        <img src="${t.coverUri || PLACEHOLDER_COVER}" loading="lazy" alt="cover">
        <div class="track-info">
          <div class="track-title"><span class="track-title-text">${escapeHtml(t.title)}</span>${badgeHtml}</div>
          <div class="track-artist">${escapeHtml(t.artists)}</div>
        </div>
        <i class="bi bi-three-dots track-dots" style="color: var(--text-secondary);"></i>
      `;
      
      div.addEventListener('click', (e) => {
        if (e.target.classList.contains('track-dots') || e.target.closest('.track-dots')) return;
        state.queueMode = 'library';
        state.queue = tracks.map(tr => tr.track);
        state.queueIndex = tracks.findIndex(tr => tr.id === t.id);
        playTrack(t.id, t.title, t.artists, t.coverUri || PLACEHOLDER_COVER);
      });
      
      searchResults.appendChild(div);
    });
  }
}

// Artist Logic
const artistModal = document.getElementById('view-artist');
const btnCloseArtist = document.getElementById('btn-close-artist');
const artistHeaderBg = document.getElementById('artist-header-bg');
const artistPageName = document.getElementById('artist-page-name');
const artistTracksList = document.getElementById('artist-tracks-list');
const btnArtistPlay = document.getElementById('btn-artist-play');
let currentArtistTracks = [];

if (btnCloseArtist) {
  btnCloseArtist.addEventListener('click', () => {
    navigateBack();
  });
}

function getTrackCountWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'треков';
  if (mod10 === 1) return 'трек';
  if (mod10 >= 2 && mod10 <= 4) return 'трека';
  return 'треков';
}

// Album Logic (Dedicated Page)
const btnCloseAlbum = document.getElementById('btn-close-album');
const albumHeaderTitle = document.getElementById('album-header-title');
const albumPageCover = document.getElementById('album-page-cover');
const albumPageName = document.getElementById('album-page-name');
const albumPageArtist = document.getElementById('album-page-artist');
const albumPageMeta = document.getElementById('album-page-meta');
const albumTracksList = document.getElementById('album-tracks-list');
const btnAlbumPlay = document.getElementById('btn-album-play');
let currentAlbumTracks = [];
let currentAlbumArtistId = null;

if (btnCloseAlbum) {
  btnCloseAlbum.addEventListener('click', () => {
    navigateBack();
  });
}

if (albumPageArtist) {
  albumPageArtist.addEventListener('click', () => {
    if (currentAlbumArtistId) {
      openArtist(currentAlbumArtistId);
    }
  });
}

async function openAlbum(id, title, coverUri) {
  navigateToView('view-album');
  albumPageName.textContent = title || 'Альбом';
  if (albumHeaderTitle) albumHeaderTitle.textContent = title || 'Альбом';
  albumPageCover.src = coverUri || PLACEHOLDER_COVER;
  if (albumPageArtist) albumPageArtist.textContent = '...';
  if (albumPageMeta) albumPageMeta.textContent = 'Альбом';
  albumTracksList.innerHTML = '<div style="text-align:center; padding: 20px;">Загрузка треков...</div>';
  currentAlbumTracks = [];
  currentAlbumArtistId = null;

  try {
    const data = await YandexClient.getAlbum(id, state.token);

    albumPageName.textContent = data.title || title;
    if (albumHeaderTitle) albumHeaderTitle.textContent = data.title || title;
    if (data.coverUri) {
      albumPageCover.src = data.coverUri;
    }

    if (data.artists && data.artists.length > 0) {
      if (albumPageArtist) {
        albumPageArtist.textContent = data.artists.map(a => a.name).join(', ');
        albumPageArtist.style.display = 'block';
      }
      currentAlbumArtistId = data.artists[0].id;
    } else if (albumPageArtist) {
      albumPageArtist.textContent = '';
      albumPageArtist.style.display = 'none';
    }

    const yearStr = data.year ? `${data.year} • ` : '';
    const trackCount = data.trackCount || (data.tracks ? data.tracks.length : 0);
    if (albumPageMeta) {
      albumPageMeta.textContent = `${yearStr}${trackCount} ${getTrackCountWord(trackCount)}`;
    }

    currentAlbumTracks = data.tracks || [];
    albumTracksList.innerHTML = '';

    currentAlbumTracks.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'track-item';
      const isExplicit = t.explicit || t.contentWarning === 'explicit';
      const badgeHtml = t.isLiberty ? `<span class="liberty-badge"><i class="bi bi-gem"></i></span>` : (isExplicit ? `<span class="explicit-badge">E</span>` : '');
      div._trackData = t;
      div.innerHTML = `
        <img src="${t.coverUri || PLACEHOLDER_COVER}" loading="lazy" alt="cover">
        <div class="track-info">
          <div class="track-title"><span class="track-title-text">${escapeHtml(t.title)}</span>${badgeHtml}</div>
          <div class="track-artist">${escapeHtml(t.artists)}</div>
        </div>
        <i class="bi bi-three-dots track-dots" style="color: var(--text-secondary);"></i>
      `;
      div.onclick = (e) => {
        if (e.target.classList.contains('track-dots') || e.target.closest('.track-dots')) return;
        state.queueMode = 'album';
        updatePlaybackContextHeader('ИГРАЕТ ИЗ АЛЬБОМА', albumPageName.textContent || 'Альбом');
        state.queue = currentAlbumTracks.map(tr => ({ ...(tr.track || {}), id: tr.id, title: tr.title, isLiberty: tr.isLiberty, explicit: tr.explicit, artists: tr.artists, coverUri: tr.coverUri }));
        state.queueIndex = i;
        playQueueTrack(state.queue[state.queueIndex]);
      };
      albumTracksList.appendChild(div);
    });

    if (currentAlbumTracks.length === 0) {
      albumTracksList.innerHTML = '<p style="text-align:center; color:#aaa;">В альбоме нет треков</p>';
    }
  } catch (e) {
    console.error(e);
    albumTracksList.innerHTML = '<div style="text-align:center; color:red; padding: 20px;">Ошибка загрузки альбома</div>';
  }
}

if (btnAlbumPlay) {
  btnAlbumPlay.addEventListener('click', () => {
    if (currentAlbumTracks.length === 0) return;
    state.queueMode = 'album';
    updatePlaybackContextHeader('ИГРАЕТ ИЗ АЛЬБОМА', albumPageName.textContent || 'Альбом');
    state.queue = currentAlbumTracks.map(tr => ({ ...(tr.track || {}), id: tr.id, title: tr.title, isLiberty: tr.isLiberty, explicit: tr.explicit, artists: tr.artists, coverUri: tr.coverUri }));
    state.queueIndex = 0;
    playQueueTrack(state.queue[0]);
  });
}

// Playlist Logic (Dedicated Page)
const btnClosePlaylist = document.getElementById('btn-close-playlist');
const playlistHeaderTitle = document.getElementById('playlist-header-title');
const playlistPageCover = document.getElementById('playlist-page-cover');
const playlistPageName = document.getElementById('playlist-page-name');
const playlistTracksList = document.getElementById('playlist-tracks-list');
const btnPlaylistPlay = document.getElementById('btn-playlist-play');
let currentPlaylistTracks = [];

if (btnClosePlaylist) {
  btnClosePlaylist.addEventListener('click', () => {
    navigateBack();
  });
}

async function openPlaylist(kind, title) {
  navigateToView('view-playlist');
  playlistPageName.textContent = title || 'Плейлист';
  if (playlistHeaderTitle) playlistHeaderTitle.textContent = title || 'Плейлист';
  playlistPageCover.src = PLACEHOLDER_COVER;
  playlistTracksList.innerHTML = '<div style="text-align:center; padding: 20px;">Загрузка...</div>';
  currentPlaylistTracks = [];

  try {
    const data = await YandexClient.getPlaylist(kind, state.token);

    playlistPageName.textContent = data.title || title;
    if (playlistHeaderTitle) playlistHeaderTitle.textContent = data.title || title;
    if (data.coverUri) {
      playlistPageCover.src = data.coverUri;
    }

    currentPlaylistTracks = data.tracks || [];
    playlistTracksList.innerHTML = '';

    currentPlaylistTracks.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'track-item';
      div._trackData = t;
      const isExplicit = t.explicit || t.contentWarning === 'explicit';
      const badgeHtml = t.isLiberty ? `<span class="liberty-badge"><i class="bi bi-gem"></i></span>` : (isExplicit ? `<span class="explicit-badge">E</span>` : '');
      div.innerHTML = `
        <img src="${t.coverUri || PLACEHOLDER_COVER}" alt="cover">
        <div class="track-info">
          <div class="track-title"><span class="track-title-text">${escapeHtml(t.title)}</span>${badgeHtml}</div>
          <div class="track-artist">${escapeHtml(t.artists)}</div>
        </div>
        <i class="bi bi-three-dots track-dots" style="color: var(--text-secondary);"></i>
      `;
      div.onclick = (e) => {
        if (e.target.classList.contains('track-dots') || e.target.closest('.track-dots')) return;
        state.queueMode = 'playlist';
        updatePlaybackContextHeader('ИГРАЕТ ИЗ ПЛЕЙЛИСТА', playlistPageName.textContent || 'Плейлист');
        state.queue = currentPlaylistTracks.map(tr => ({ ...(tr.track || {}), id: tr.id, title: tr.title, isLiberty: tr.isLiberty, explicit: tr.explicit, artists: tr.artists, coverUri: tr.coverUri }));
        state.queueIndex = i;
        playQueueTrack(state.queue[state.queueIndex]);
      };
      playlistTracksList.appendChild(div);
    });

    if (currentPlaylistTracks.length === 0) {
      playlistTracksList.innerHTML = '<p style="text-align:center; color:#aaa;">В плейлисте нет треков</p>';
    }
  } catch (e) {
    console.error(e);
    playlistTracksList.innerHTML = '<div style="text-align:center; color:red; padding: 20px;">Ошибка загрузки</div>';
  }
}

if (btnPlaylistPlay) {
  btnPlaylistPlay.addEventListener('click', () => {
    if (currentPlaylistTracks.length === 0) return;
    state.queueMode = 'playlist';
    updatePlaybackContextHeader('ИГРАЕТ ИЗ ПЛЕЙЛИСТА', playlistPageName.textContent || 'Плейлист');
    state.queue = currentPlaylistTracks.map(tr => ({ ...(tr.track || {}), id: tr.id, title: tr.title, isLiberty: tr.isLiberty, explicit: tr.explicit, artists: tr.artists, coverUri: tr.coverUri }));
    state.queueIndex = 0;
    playQueueTrack(state.queue[0]);
  });
}

async function openArtist(id) {
  navigateToView('view-artist');
  artistPageName.textContent = "Загрузка...";
  artistTracksList.innerHTML = '<div style="text-align:center; padding: 20px;">Загрузка...</div>';

  try {
    const data = await YandexClient.getArtist(id, state.token);

    if (data.error) {
      artistPageName.textContent = "Ошибка";
      return;
    }

    artistPageName.textContent = data.name;
    if (data.coverUri) {
      artistHeaderBg.style.backgroundImage = `url(${data.coverUri})`;
    } else {
      artistHeaderBg.style.background = 'var(--bg-color)';
    }

    currentArtistTracks = data.tracks || [];
    artistTracksList.innerHTML = '';

    const artistAlbumsList = document.getElementById('artist-albums-list');
    if (artistAlbumsList) {
      artistAlbumsList.innerHTML = '';
      const albums = data.albums || [];
      if (albums.length === 0) {
        artistAlbumsList.innerHTML = '<p style="color:#aaa;">Нет альбомов</p>';
      } else {
        albums.forEach(al => {
          const aDiv = document.createElement('div');
          aDiv.style.flex = '0 0 120px';
          aDiv.style.width = '120px';
          aDiv.style.maxWidth = '120px';
          aDiv.style.minWidth = '0';
          aDiv.style.cursor = 'pointer';
          aDiv.style.overflow = 'hidden';
          aDiv.innerHTML = `
            <img src="${al.coverUri || PLACEHOLDER_COVER}" style="width:120px; height:120px; border-radius:8px; object-fit:cover; margin-bottom:8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size:12px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;" title="${escapeHtml(al.title)}">${escapeHtml(al.title)}</div>
            <div style="font-size:10px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${al.year || ''}</div>
          `;
          aDiv.onclick = () => openAlbum(al.id, al.title, al.coverUri);
          artistAlbumsList.appendChild(aDiv);
        });
      }
    }

    currentArtistTracks.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'track-item';
      const isExplicit = t.explicit || t.contentWarning === 'explicit';
      const badgeHtml = t.isLiberty ? `<span class="liberty-badge"><i class="bi bi-gem"></i></span>` : (isExplicit ? `<span class="explicit-badge">E</span>` : '');
      div._trackData = t;
      div.innerHTML = `
        <img src="${t.coverUri || PLACEHOLDER_COVER}" alt="cover">
        <div class="track-info">
          <div class="track-title"><span class="track-title-text">${escapeHtml(t.title)}</span>${badgeHtml}</div>
          <div class="track-artist">${escapeHtml(t.artists)}</div>
        </div>
        <i class="bi bi-three-dots track-dots" style="color: var(--text-secondary);"></i>
      `;

      div.addEventListener('click', (e) => {
        if (e.target.classList.contains('track-dots') || e.target.closest('.track-dots')) return;
        state.queueMode = 'artist';
        updatePlaybackContextHeader('ТРЕКИ АРТИСТА', artistPageName.textContent || 'Артист');
        state.queue = currentArtistTracks.map(tr => ({ ...(tr.track || {}), id: tr.id, title: tr.title, isLiberty: tr.isLiberty, explicit: tr.explicit, artists: tr.artists, coverUri: tr.coverUri }));
        state.queueIndex = i;
        playTrack(t.id, t.title, t.artists, t.coverUri || PLACEHOLDER_COVER, t.explicit, t.isLiberty);
      });

      artistTracksList.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    artistPageName.textContent = "Сетевая ошибка";
  }
}

if (btnArtistPlay) {
  btnArtistPlay.addEventListener('click', () => {
    if (currentArtistTracks.length > 0) {
      state.queueMode = 'artist';
      updatePlaybackContextHeader('ТРЕКИ АРТИСТА', artistPageName.textContent || 'Артист');
      state.queue = currentArtistTracks.map(tr => ({ ...(tr.track || {}), id: tr.id, title: tr.title, isLiberty: tr.isLiberty, explicit: tr.explicit, artists: tr.artists, coverUri: tr.coverUri }));
      state.queueIndex = 0;
      const t = currentArtistTracks[0];
      playTrack(t.id, t.title, t.artists, t.coverUri || PLACEHOLDER_COVER, t.explicit, t.isLiberty);
    }
  });
}

// Open/Close Full Player
dom.miniPlayer.addEventListener('click', (e) => {
  if (e.target.closest('.mini-controls')) return;
  dom.fullPlayer.classList.remove('translateY-100');
});
dom.btnClosePlayer.addEventListener('click', () => {
  dom.fullPlayer.classList.add('translateY-100');
});

// ==========================================
// Synchronized Lyrics
// ==========================================

// Parse an LRC document into [{time, text}] sorted by time. LRC lines look like
//   [mm:ss.xx]text
// and may carry several timestamps for one line. Everything else ([ar:...],
// [ti:...] metadata tags, bare lines without a timestamp) is handled too: a tag
// renders as metadata, and a line with no timestamp at all means the track only
// has plain text — the caller then falls back to unsynchronized rendering.
function parseLrc(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = [];
  let sawTimestamp = false;

  text.split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if (!line) return;

    // Pull every [..] prefix off the front of the line.
    const stamps = [];
    let rest = line;
    let m;
    const stampRe = /^\[([^\]]*)\]/;
    while ((m = rest.match(stampRe)) !== null) {
      const inner = m[1];
      rest = rest.slice(m[0].length);
      // Time stamps are [mm:ss.xx] or [mm:ss]; metadata is [key:value].
      const time = /^\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?$/.test(inner) ? lrcTimeToSeconds(inner) : null;
      if (time !== null) {
        stamps.push(time);
        sawTimestamp = true;
      } else if (/^\w+:/.test(inner)) {
        // [ar:Artist] / [ti:Title] / [al:Album] — metadata, skip the value.
        lines.push({ time: null, text: '', meta: inner });
      }
    }
    rest = rest.trim();

    if (stamps.length > 0) {
      stamps.forEach(t => lines.push({ time: t, text: rest }));
    } else if (rest) {
      lines.push({ time: null, text: rest });
    }
  });

  if (!sawTimestamp) return [];
  lines.sort((a, b) => (a.time === null ? -1 : b.time === null ? 1 : a.time - b.time));
  return lines;
}

function lrcTimeToSeconds(str) {
  const match = String(str).match(/^(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?$/);
  if (!match) return null;
  const mins = Number(match[1]);
  const secs = Number(match[2]);
  const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
  if (!Number.isFinite(mins) || !Number.isFinite(secs) || secs >= 60) return null;
  return mins * 60 + secs + fraction;
}

// Render the current state.lyricsLines into the panel. Synchronized lines get
// an index attribute so the playback loop can find and highlight the active one
// without re-rendering the whole list on every frame.
function renderLyrics() {
  if (!dom.fullLyricsLines) return;
  dom.fullLyricsLines.innerHTML = '';
  state.lyricsActiveIndex = -1;

  if (!state.lyricsLines || state.lyricsLines.length === 0) {
    dom.fullLyricsLines.innerHTML = `<div class="lyrics-empty"><i class="bi bi-music-note-beamed"></i><span>Текст недоступен для этого трека</span></div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  state.lyricsLines.forEach((ln, i) => {
    const div = document.createElement('div');
    if (ln.meta) {
      div.className = 'lyric-line meta';
      div.textContent = ln.meta;
    } else if (ln.text) {
      div.className = 'lyric-line';
      div.dataset.index = String(i);
      div.textContent = ln.text;
    } else {
      div.className = 'lyric-line empty';
    }
    frag.appendChild(div);
  });
  dom.fullLyricsLines.appendChild(frag);
}

async function loadLyricsForCurrentTrack() {
  const track = state.currentTrack;

  // The button is a permanent toggle, NOT gated on whether lyrics load.
  // Hiding it on a failed/empty fetch was the reported "no lyrics button": a
  // transient network error would remove it for the rest of the session. The
  // panel itself explains the absence ("Текст недоступен"), which is honest and
  // keeps the control where the user expects it.
  if (dom.btnLyrics && track && track.id) dom.btnLyrics.classList.remove('hidden');

  if (!track || !track.id || !state.token) {
    ylog('LYRICS', `skip track=${track?.id || 'none'} token=${state.token ? 'yes' : 'no'}`);
    state.lyricsLines = [];
    if (state.lyricsOpen) renderLyrics();
    return;
  }
  const trackId = String(track.id);
  const durationMs = Number(track.durationMs || track.track?.durationMs || 0);

  // The panel is already open from the previous track, so show a spinner until
  // this one's text arrives instead of leaving stale lines on screen.
  const seq = ++state.lyricsRequestSeq;
  if (state.lyricsOpen && dom.fullLyricsLines) {
    dom.fullLyricsLines.innerHTML = '<div class="lyrics-loading"><i class="bi bi-arrow-repeat"></i><span>Загружаю текст…</span></div>';
  }

  let result = null;
  try {
    result = await YandexClient.getLyrics(trackId, state.token, true, durationMs);
  } catch (e) {
    ylogError('LYRICS', `request exception track=${trackId}: ${e?.message || e}`);
    result = null;
  }
  // A newer track started while this was in flight — drop the stale result.
  if (seq !== state.lyricsRequestSeq) return;
  if (String(state.currentTrack?.id) !== trackId) return;

  state.lyricsTrackId = trackId;

  if (!result || !result.text) {
    ylogError('LYRICS', `empty result track=${trackId}`);
    state.lyricsLines = [];
    if (state.lyricsOpen) renderLyrics();
    return;
  }

  // Synchronized LRC parses to timed lines; if the track only had plain TEXT
  // (no timestamps), fall back to one line per paragraph, unhighlighted.
  const parsed = result.sync ? parseLrc(result.text) : [];
  ylog('LYRICS', `loaded track=${trackId} sync=${result.sync} chars=${result.text.length} lines=${parsed.length}`);
  if (parsed.length > 0) {
    state.lyricsLines = parsed;
  } else {
    state.lyricsLines = result.text
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => ({ time: null, text: s }));
  }

  if (state.lyricsOpen) {
    renderLyrics();
    updateLyricsHighlight();
  }
}

function toggleLyrics(force) {
  const willOpen = typeof force === 'boolean' ? force : !state.lyricsOpen;
  state.lyricsOpen = willOpen;
  if (!dom.fullLyrics || !dom.fullCover) return;

  if (willOpen) {
    dom.fullLyrics.classList.remove('hidden');
    dom.fullCover.style.opacity = '0';
    dom.fullPlayer.classList.add('lyrics-mode');
    if (btnLyricsIcon) btnLyricsIcon.className = 'bi bi-x-lg';
    renderLyrics();
    updateLyricsHighlight();
  } else {
    dom.fullLyrics.classList.add('hidden');
    dom.fullCover.style.opacity = '';
    dom.fullPlayer.classList.remove('lyrics-mode');
    // bi-music-note-text does not exist in Bootstrap Icons 1.11.3 — it
    // rendered as an empty glyph, so the button looked invisible.
    if (btnLyricsIcon) btnLyricsIcon.className = 'bi bi-card-text';
  }
}

let btnLyricsIcon = null;
if (dom.btnLyrics) {
  btnLyricsIcon = dom.btnLyrics.querySelector('i');
  dom.btnLyrics.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLyrics();
  });
}

// Highlight the line whose timestamp has passed, and keep it scrolled into
// view. Called from the playback loop; cheap because it only touches the DOM
// when the active index actually changes.
function updateLyricsHighlight() {
  if (!state.lyricsOpen || !state.lyricsLines || state.lyricsLines.length === 0) return;
  if (!activePlayer || typeof activePlayer.currentTime !== 'number') return;

  const now = activePlayer.currentTime;
  let idx = -1;
  for (let i = 0; i < state.lyricsLines.length; i++) {
    const t = state.lyricsLines[i].time;
    if (t !== null && t <= now) idx = i;
  }
  if (idx === state.lyricsActiveIndex || idx < 0) return;
  state.lyricsActiveIndex = idx;

  if (!dom.fullLyricsLines) return;
  const nodes = dom.fullLyricsLines.querySelectorAll('.lyric-line[data-index]');
  nodes.forEach(n => n.classList.remove('active'));
  // data-index matches the position in lyricsLines for sung lines, but the node
  // list skips meta/empty entries, so find by attribute rather than by position.
  const activeNode = dom.fullLyricsLines.querySelector(`.lyric-line[data-index="${idx}"]`);
  if (activeNode) {
    activeNode.classList.add('active');
    try {
      activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}
  }
}


// Click artist name in full player -> go to artist profile
if (dom.fullArtist) {
  dom.fullArtist.style.cursor = 'pointer';
  dom.fullArtist.title = 'Перейти к артисту';
  dom.fullArtist.addEventListener('click', async (e) => {
    e.stopPropagation();
    const current = state.currentTrack?.track || state.currentTrack || state.queue[state.queueIndex];
    let artistId = state.currentTrack?.artistId ||
                   current?.artistId ||
                   current?.track?.artists?.[0]?.id ||
                   (Array.isArray(current?.artists) ? current.artists[0]?.id : null);

    if (!artistId) {
      const artistName = dom.fullArtist.textContent.trim() || state.currentTrack?.artist;
      if (artistName && artistName !== 'Unknown') {
        try {
          const sData = await YandexClient.search(artistName, state.token);
          if (sData.artists && sData.artists.length > 0) {
            artistId = sData.artists[0].id;
          }
        } catch (err) {
          console.error("Search artist fallback error:", err);
        }
      }
    }

    if (artistId) {
      dom.fullPlayer.classList.add('translateY-100');
      openArtist(artistId);
    }
  });
}

// Dynamic BG Toggle
dom.toggleDynamicBg.addEventListener('change', (e) => {
  if (e.target.checked && state.currentTrack) {
    dom.dynamicBg.style.backgroundImage = `url(${state.currentTrack.cover})`;
  } else {
    dom.dynamicBg.style.backgroundImage = 'none';
  }
});

// Color Picker Logic
const ACCENT_COLOR_KEY = 'ym_accent_color';
function applyAccentColor(color) {
  if (!color) return;
  document.documentElement.style.setProperty('--accent-color', color);
}
// Restore the previously chosen accent instead of losing it on every reload.
(function initAccentColor() {
  const saved = localStorage.getItem(ACCENT_COLOR_KEY);
  if (saved) applyAccentColor(saved);
})();

dom.colorBtns.forEach(btn => {
  const color = btn.getAttribute('data-color');
  if (color && color === localStorage.getItem(ACCENT_COLOR_KEY)) {
    dom.colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  btn.addEventListener('click', () => {
    dom.colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const picked = btn.getAttribute('data-color');
    applyAccentColor(picked);
    try { localStorage.setItem(ACCENT_COLOR_KEY, picked); } catch (e) {}
  });
});

// --- Init ---
dom.fullPlayer.classList.add('translateY-100');

// Setup System Media Controls & Restore Last Session
setupMediaSession();
restorePlaybackState();

// Auto Login
if (state.token) {
  fetchLibrary(state.token);
} else {
  setTimeout(() => dom.authModal.classList.remove('hidden'), 500);
}

// Collection sub-navigation: liked tracks, playlists, and successful downloads.
const segTracks = document.getElementById('seg-tracks');
const segPlaylists = document.getElementById('seg-playlists');
const viewLibraryTracks = document.getElementById('library-tracks-view');
const viewLibraryPlaylists = document.getElementById('library-playlists-view');
const librarySegments = segTracks?.parentElement;
const libraryContent = viewLibraryTracks?.parentElement;
let segDownloads = document.getElementById('seg-downloads');
let viewLibraryDownloads = document.getElementById('library-downloads-view');

if (librarySegments && !segDownloads) {
  segDownloads = document.createElement('button');
  segDownloads.type = 'button';
  segDownloads.id = 'seg-downloads';
  segDownloads.className = 'segment';
  segDownloads.style.cssText = 'flex:1;border:none;background:transparent;color:#aaa;padding:8px;border-radius:6px;font-weight:600;';
  segDownloads.textContent = 'Загрузки';
  librarySegments.appendChild(segDownloads);
}
if (libraryContent && !viewLibraryDownloads) {
  viewLibraryDownloads = document.createElement('div');
  viewLibraryDownloads.id = 'library-downloads-view';
  viewLibraryDownloads.style.display = 'none';
  viewLibraryDownloads.innerHTML = '<div id="downloaded-tracks-list" class="tracks-list" style="padding-top:15px;"></div>';
  libraryContent.appendChild(viewLibraryDownloads);
}

function selectLibrarySegment(selected) {
  const controls = [
    [segTracks, 'tracks'],
    [segPlaylists, 'playlists'],
    [segDownloads, 'downloads']
  ];
  controls.forEach(([button, key]) => {
    if (!button) return;
    const active = key === selected;
    button.classList.toggle('active', active);
    button.style.background = active ? 'rgba(255,255,255,0.2)' : 'transparent';
    button.style.color = active ? '#fff' : '#aaa';
  });
  if (viewLibraryTracks) viewLibraryTracks.style.display = selected === 'tracks' ? 'block' : 'none';
  if (viewLibraryPlaylists) viewLibraryPlaylists.style.display = selected === 'playlists' ? 'block' : 'none';
  if (viewLibraryDownloads) viewLibraryDownloads.style.display = selected === 'downloads' ? 'block' : 'none';
  if (selected === 'playlists' && !state.playlistsLoaded) fetchPlaylists();
  if (selected === 'downloads') renderDownloadedTracks();
}

if (segTracks && segPlaylists) {
  segTracks.addEventListener('click', () => selectLibrarySegment('tracks'));
  segPlaylists.addEventListener('click', () => selectLibrarySegment('playlists'));
  segDownloads?.addEventListener('click', () => selectLibrarySegment('downloads'));
}

function renderDownloadedTracks() {
  const list = document.getElementById('downloaded-tracks-list');
  if (!list) return;
  const tracks = getDownloadedTrackRegistry().filter(track => track && track.id && track.fileName);
  if (!tracks.length) {
    list.innerHTML = '<div class="empty-state"><i class="bi bi-download"></i><p>\u0417\u0434\u0435\u0441\u044c \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u043d\u044b\u0435 \u0442\u0440\u0435\u043a\u0438</p></div>';
    return;
  }
  list.innerHTML = tracks.map(track =>
    '<div class="track-item downloaded-track-item" data-track-id="' + escapeHtml(track.id) + '">' +
      '<div class="track-download-art"><i class="bi bi-music-note-beamed"></i></div>' +
      '<div class="track-info"><div class="track-title">' + escapeHtml(track.title || '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u0442\u0440\u0435\u043a') + '</div>' +
      '<div class="track-artist">' + escapeHtml(track.artist || '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u0430\u0440\u0442\u0438\u0441\u0442') + '</div></div>' +
      '<button type="button" class="downloaded-track-action" data-action="play" aria-label="\u0412\u043e\u0441\u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0441\u0442\u0438"><i class="bi bi-play-circle-fill"></i></button>' +
      '<button type="button" class="downloaded-track-action" data-action="delete" aria-label="\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0443"><i class="bi bi-trash3"></i></button>' +
    '</div>'
  ).join('');
  list.querySelectorAll('.downloaded-track-item').forEach(row => {
    const trackId = row.dataset.trackId;
    row.querySelector('[data-action="play"]')?.addEventListener('click', () => playDownloadedTrack(trackId));
    row.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteDownloadedTrack(trackId));
  });
}

function playDownloadedTrack(trackId) {
  const bridge = window.AndroidBridge;
  if (!bridge || typeof bridge.getDownloadedTrackUrl !== 'function') {
    showToast('\u041e\0444\043b\0430\0439\043d-\0432\043e\0441\043f\0440\043e\0438\0437\0432\0435\0434\0435\043d\0438\0435 \0434\043e\0441\0442\0443\043f\043d\043e \0432 \043f\0440\0438\043b\043e\0436\0435\u043d\u0438\u0438', 'bi-exclamation-circle');
    return;
  }
  state.queue = getDownloadedTrackRegistry().map(track => {
    let offlineUrl = '';
    try { offlineUrl = bridge.getDownloadedTrackUrl(track.fileName) || ''; } catch (_) {}
    return { id: String(track.id), title: track.title, artists: track.artist || '', offlineUrl, coverUri: PLACEHOLDER_COVER, explicit: false, isLiberty: false };
  }).filter(track => track.offlineUrl);
  state.queueMode = 'downloads';
  state.queueIndex = state.queue.findIndex(track => String(track.id) === String(trackId));
  if (state.queueIndex < 0) {
    showToast('\u0417\0430\0433\0440\0443\0436\0435\043d\043d\044b\0439 \0444\0430\0439\043b \043d\0435 \043d\0430\0439\0434\0435\043d \043d\0430 \0443\0441\0442\0440\043e\0439\u0441\0442\0432\0435', 'bi-exclamation-triangle');
    return;
  }
  updatePlaybackContextHeader('\u041e\0424\041b\0410\0419\041d-\041f\0420\041e\0421\041b\0423\0428\0418\0412\0410\041d\0418\0415', '\u0417\0430\0433\0440\0443\0437\043a\0438');
  playQueueTrack(state.queue[state.queueIndex]);
}

function deleteDownloadedTrack(trackId) {
  const record = getDownloadedTrackRegistry().find(track => String(track.id) === String(trackId));
  if (!record) return;
  const bridge = window.AndroidBridge;
  if (!bridge || typeof bridge.deleteDownloadedTrack !== 'function') {
    showToast('\u0423\0434\0430\043b\0435\043d\0438\0435 \0437\0430\0433\0440\0443\0437\043e\043a \0434\043e\0441\0442\0443\043f\043d\043e \0432 \043f\0440\0438\043b\043e\0436\0435\u043d\0438\u0438', 'bi-exclamation-circle');
    return;
  }
  let deleted = false;
  try { deleted = Boolean(bridge.deleteDownloadedTrack(record.fileName)); } catch (_) {}
  if (!deleted) {
    showToast('\u041d\0435 \0443\0434\0430\043b\043e\0441\044c \0443\0434\0430\043b\0438\0442\044c \0444\0430\0439\043b \0437\0430\0433\0440\0443\0437\043a\0438', 'bi-exclamation-triangle');
    return;
  }
  localStorage.setItem(DOWNLOADED_TRACKS_KEY, JSON.stringify(getDownloadedTrackRegistry().filter(track => String(track.id) !== String(trackId))));
  localStorage.removeItem('ym_downloaded_track:' + String(trackId));
  localStorage.removeItem(downloadStorageKey(record.fileName));
  renderDownloadedTracks();
  if (state.currentTrack && String(state.currentTrack.id) === String(trackId)) { activePlayer.pause(); state.isPlaying = false; updatePlayButtons(); }
}

async function fetchPlaylists() {
  const plList = document.getElementById('playlists-list');
  plList.innerHTML = '<div style="text-align:center; padding: 20px;"><div class="spinner-border text-light" role="status"></div></div>';
  try {
    const data = await YandexClient.getPlaylists(state.token);
    plList.innerHTML = '';
    state.playlistsLoaded = true;
    if (data.playlists && data.playlists.length > 0) {
      data.playlists.forEach(pl => {
        const div = document.createElement('div');
        div.className = 'track-item';
        div.innerHTML = `
          <img src="${pl.coverUri}" alt="cover" style="width: 60px; height: 60px; border-radius: 8px;">
          <div class="track-info">
            <div class="track-title">${escapeHtml(pl.title)}</div>
            <div class="track-artist">${pl.trackCount} треков</div>
          </div>
          <i class="bi bi-chevron-right" style="color: var(--text-secondary);"></i>
        `;
        div.onclick = () => openPlaylist(pl.kind, pl.title);
        plList.appendChild(div);
      });
    } else {
      plList.innerHTML = '<p style="text-align:center; color:#aaa;">Нет плейлистов</p>';
    }
  } catch(e) {
    console.error(e);
    plList.innerHTML = '<p style="text-align:center; color:red;">Ошибка загрузки</p>';
  }
}

// Library Local Search
const libSearch = document.getElementById('library-search-input');
if (libSearch) {
  libSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const trackItems = document.querySelectorAll('#tracks-list .track-item');
    trackItems.forEach(item => {
      const title = item.querySelector('.track-title')?.textContent.toLowerCase() || '';
      const artist = item.querySelector('.track-artist')?.textContent.toLowerCase() || '';
      if (title.includes(query) || artist.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });
}

// --- Track Downloads ---
//
// The native side hands the URL to the system DownloadManager, which owns the
// transfer and posts its own progress notification. So there is no progress
// callback here on purpose — the only feedback this layer owes the user is that
// the request was accepted (or why it was not).

function formatDownloadQualityLabel() {
  const q = String(localStorage.getItem('ym_audio_quality') || '320');
  return q === '1000' ? 'FLAC' : `${q} kbps`;
}

function downloadStorageKey(fileName) {
  return `ym_downloaded:${fileName}`;
}

const DOWNLOADED_TRACKS_KEY = 'ym_downloaded_tracks_v1';
const pendingDownloadMetadata = new Map();
const activeDownloadIds = new Set();

function getDownloadedTrackRegistry() {
  try {
    const value = JSON.parse(localStorage.getItem(DOWNLOADED_TRACKS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function isTrackDownloaded(trackId, artist, title) {
  if (trackId && localStorage.getItem(`ym_downloaded_track:${String(trackId)}`) === '1') return true;
  return Boolean(artist && title && localStorage.getItem(
    downloadStorageKey(buildDownloadFileName(artist, title, 'flac'))
  ) === '1');
}

function setDownloadButtonsProgress(percent, active) {
  ['as-btn-download', 'as-btn-download-cache'].forEach((id) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.classList.toggle('download-active', active);
    button.style.setProperty('--download-progress', `${Math.max(0, Math.min(100, percent))}%`);
  });
}

window.onTrackDownloadProgress = function(fileName, percent, done, error) {
  if (error) {
    const metadata = pendingDownloadMetadata.get(fileName);
    if (metadata) activeDownloadIds.delete(metadata.id);
    pendingDownloadMetadata.delete(fileName);
    setDownloadButtonsProgress(0, false);
    showToast(`Ошибка загрузки: ${error}`, 'bi-exclamation-triangle');
    return;
  }
  setDownloadButtonsProgress(percent, !done);
  if (done) {
    const metadata = pendingDownloadMetadata.get(fileName);
    pendingDownloadMetadata.delete(fileName);
    if (metadata && !metadata.toCache) {
      activeDownloadIds.delete(metadata.id);
      localStorage.setItem(downloadStorageKey(fileName), '1');
      localStorage.setItem(`ym_downloaded_track:${metadata.id}`, '1');
      const records = getDownloadedTrackRegistry().filter(item => String(item.id) !== String(metadata.id));
      records.unshift({ ...metadata, fileName, completedAt: Date.now() });
      try { localStorage.setItem(DOWNLOADED_TRACKS_KEY, JSON.stringify(records)); } catch (_) {}
      if (document.getElementById('library-downloads-view')?.style.display !== 'none') {
        renderDownloadedTracks();
      }
    }
    showToast(`Файл загружен: ${fileName}`, 'bi-check-circle-fill', 'success');
    if (typeof renderTracks === 'function') renderTracks();
  }
};

// Filenames come from track titles, which can carry any character. Strip the
// ones that are illegal in a path or that the native guard rejects.
function buildDownloadFileName(artist, title, ext, trackId) {
  const clean = (s) => String(s || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim();
  const a = clean(artist);
  const t = clean(title) || 'track';
  const base = a ? `${a} - ${t}` : t;
  const idSuffix = trackId ? ` [${clean(trackId).slice(0, 18)}]` : '';
  return `${base.slice(0, Math.max(1, 120 - idSuffix.length))}${idSuffix}.${ext}`;
}

// The stream URL encodes the codec in its path (get-flac vs get-mp3), which is
// the only reliable signal — Liberty DB entries are always MP3.
function detectAudioFormat(streamUrl) {
  const url = String(streamUrl || '');
  if (url.includes('/get-flac/') || url.includes('.flac')) {
    return { ext: 'flac', mime: 'audio/flac' };
  }
  return { ext: 'mp3', mime: 'audio/mpeg' };
}

// Resolve one track's stream URL and hand it to DownloadManager. Deliberately
// silent so the batch path can enqueue a whole library without a toast per
// track; downloadTrackToDevice() wraps this with user-facing feedback.
async function enqueueTrackDownload(track, artistName, trackId, toCache) {
  if (!trackId || !state.token) return false;
  if (!(window.AndroidBridge && typeof window.AndroidBridge.downloadTrack === 'function')) return false;
  if (!toCache && isTrackDownloaded(trackId)) return true;
  if (!toCache && activeDownloadIds.has(String(trackId))) return true;

  let streamUrl;
  let downloadInfo;
  try {
    // User downloads are lossless FLAC; the private cache deliberately uses
    // 320 kbps MP3 to avoid consuming excessive storage.
    const downloadQuality = toCache ? 'nq' : 'lossless';
    downloadInfo = await YandexClient.getDownloadInfo(trackId, state.token, downloadQuality);
    // getDownloadInfo follows the PC client and returns `url`; the playback
    // resolver uses the older `streamUrl` field.
    streamUrl = downloadInfo && (downloadInfo.url || downloadInfo.streamUrl);
    let streamHost = 'none';
    try {
      streamHost = streamUrl ? new URL(streamUrl).hostname : 'none';
    } catch (_) {
      streamHost = 'invalid';
    }
    ylog('DOWNLOAD', `file info resolved track=${trackId} quality=${downloadQuality} host=${streamHost}`);
  } catch (e) {
    ylogError('DOWNLOAD', `stream resolve failed track=${trackId}: ${e?.message || e}`);
    return false;
  }

  if (!streamUrl) {
    ylogError('DOWNLOAD', `empty stream URL track=${trackId}`);
    return false;
  }
  // The native guard only accepts https; a relative URL would be rejected there.
  if (!/^https:\/\//i.test(streamUrl)) {
    ylogError('DOWNLOAD', `unsupported stream scheme track=${trackId}`);
    return false;
  }

  const { ext, mime } = downloadInfo.codec && String(downloadInfo.codec).includes('flac')
    ? { ext: 'flac', mime: 'audio/flac' }
    : detectAudioFormat(streamUrl);
  const title = track.title || track.track?.title || 'Трек';
  const artist = artistName || (typeof track.artists === 'string' ? track.artists : '') || '';
  const fileName = buildDownloadFileName(artist, title, ext, trackId);
  pendingDownloadMetadata.set(fileName, {
    id: String(trackId),
    title: String(title),
    artist: String(artist),
    mime,
    toCache: Boolean(toCache)
  });
  if (!toCache) activeDownloadIds.add(String(trackId));

  try {
    const ok = Boolean(window.AndroidBridge.downloadTrack(streamUrl, fileName, mime, toCache, downloadInfo.keyBase64));
    if (!ok) {
      pendingDownloadMetadata.delete(fileName);
      activeDownloadIds.delete(String(trackId));
    }
    ylog('DOWNLOAD', `bridge enqueue track=${trackId} ok=${ok} cache=${Boolean(toCache)} file=${fileName}`);
    return ok;
  } catch (e) {
    pendingDownloadMetadata.delete(fileName);
    activeDownloadIds.delete(String(trackId));
    ylogError('DOWNLOAD', `bridge exception track=${trackId}: ${e?.message || e}`);
    return false;
  }
}

async function downloadTrackToDevice(track, artistName, trackId, toCache) {
  if (!trackId) return;
  if (!state.token) {
    showToast('Сначала войдите в аккаунт', 'bi-exclamation-circle');
    return;
  }
  if (!(window.AndroidBridge && typeof window.AndroidBridge.downloadTrack === 'function')) {
    showToast('Скачивание доступно только в приложении', 'bi-exclamation-circle');
    return;
  }

  showToast('Получаю ссылку на аудио…', 'bi-cloud-arrow-down');
  let ok = false;
  try {
    ok = await enqueueTrackDownload(track, artistName, trackId, toCache);
  } catch (e) {
    ylogError('DOWNLOAD', `download preparation failed track=${trackId}: ${e?.message || e}`);
  }

  if (ok) {
    showToast(
      toCache ? `Скачиваю в кэш: ${track.title || 'Трек'}` : `Скачиваю в «Музыку»: ${track.title || 'Трек'}`,
      'bi-download',
      'success'
    );
  } else {
    showToast('Скачивание не началось', 'bi-exclamation-triangle');
  }
}

// Download every track in the collection. Stream URLs are resolved a few at a
// time: firing a few hundred download-info requests at once would trip Yandex
// rate limiting and fail the whole batch. Enqueueing itself is cheap, so the
// bottleneck is URL resolution, which is what the pool bounds.
let libraryDownloadRunning = false;

async function enqueueTrackDownloadWithRetry(track, artistName, trackId, toCache) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const ok = await enqueueTrackDownload(track, artistName, trackId, toCache);
    if (ok) return true;
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return false;
}

async function downloadWholeLibrary(btn) {
  if (libraryDownloadRunning) {
    showToast('Скачивание уже идёт…', 'bi-hourglass-split');
    return;
  }
  if (!state.token) {
    showToast('Сначала войдите в аккаунт', 'bi-exclamation-circle');
    return;
  }
  if (!(window.AndroidBridge && typeof window.AndroidBridge.downloadTrack === 'function')) {
    showToast('Скачивание доступно только в приложении', 'bi-exclamation-circle');
    return;
  }

  const tracks = state.tracks || [];
  if (tracks.length === 0) {
    showToast('В коллекции нет треков', 'bi-exclamation-circle');
    return;
  }

  libraryDownloadRunning = true;
  if (btn) {
    btn.disabled = true;
    btn.classList.add('downloading');
    btn.title = 'Скачиваю коллекцию…';
  }
  showToast(`Начинаю скачивание ${tracks.length} треков…`, 'bi-cloud-arrow-down');

  // Yandex/CDN frequently resets one of several simultaneous large audio
  // connections. Serializing the requests is slower but reliable and avoids
  // losing half of a collection download.
  const CONCURRENCY = 1;
  let cursor = 0;
  let ok = 0;
  let failed = 0;

  const worker = async () => {
    while (cursor < tracks.length) {
      const i = cursor++;
      const t = tracks[i];
      if (!t) continue;
      const raw = t.track || t;
      const id = String(raw.id || t.id || '');
      if (!id) { failed++; continue; }

      let artist = t.artists;
      if (Array.isArray(artist)) artist = artist.map(a => a && (a.name || a)).filter(Boolean).join(', ');
      else if (raw.artists) artist = raw.artists.map(a => a && a.name).filter(Boolean).join(', ');
      if (typeof artist !== 'string') artist = '';

      const enqueued = await enqueueTrackDownloadWithRetry(t, artist, id, false);
      if (enqueued) ok++; else failed++;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tracks.length) }, worker));
  } catch (e) {
    console.error('Library download failed:', e);
  }

  libraryDownloadRunning = false;
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('downloading');
    btn.title = 'Скачать все треки';
  }

  showToast(
    failed === 0
      ? `Передано на скачивание: ${ok}`
      : `Скачано ${ok}, не удалось ${failed}`,
    failed === 0 ? 'bi-check2-circle' : 'bi-exclamation-triangle',
    failed === 0 ? 'success' : 'warn'
  );
}

// --- Action Sheet (Three Dots) & Playlist Chooser ---
let activeMenuTrack = null;

function openActionSheet(track) {
  if (!track) return;
  activeMenuTrack = track;
  
  const actionSheet = document.getElementById('action-sheet');
  const actionSheetContent = document.getElementById('action-sheet-content');
  const asCover = document.getElementById('as-cover');
  const asTitle = document.getElementById('as-title');
  const asArtist = document.getElementById('as-artist');
  const asBtnArtist = document.getElementById('as-btn-artist');
  const asBtnLike = document.getElementById('as-btn-like');
  const asLikeText = document.getElementById('as-like-text');
  const asBtnPlaylist = document.getElementById('as-btn-playlist');
  const asBtnReport = document.getElementById('as-btn-report');
  const asReportText = document.getElementById('as-report-text');

  let coverUrl = track.coverUri || track.cover || track.track?.coverUri || track.track?.cover || track.track?.albums?.[0]?.coverUri || '';
  if (coverUrl.includes('%%')) coverUrl = `https://${coverUrl.replace('%%', '200x200')}`;
  if (coverUrl && !coverUrl.startsWith('http') && coverUrl !== PLACEHOLDER_COVER) {
    coverUrl = `https://${coverUrl}`;
  }
  if (!coverUrl) coverUrl = PLACEHOLDER_COVER;
  if (asCover) asCover.src = coverUrl;
  if (asTitle) asTitle.textContent = track.title || 'Трек';
  
  let artistName = '';
  if (typeof track.artists === 'string') {
    artistName = track.artists;
  } else if (Array.isArray(track.artists)) {
    artistName = track.artists.map(a => a.name || a).join(', ');
  } else if (track.track?.artists) {
    artistName = track.track.artists.map(a => a.name).join(', ');
  }
  if (asArtist) asArtist.textContent = artistName;

  if (asReportText) asReportText.textContent = 'Сообщить о цензуре';

  const trackId = String(track.track?.id || track.id || '');
  const artistId = track.track?.artists?.[0]?.id || (Array.isArray(track.artists) ? track.artists[0]?.id : null);

  // Track Vibe (Волна по треку)
  const asBtnTrackVibe = document.getElementById('as-btn-track-vibe');
  if (asBtnTrackVibe && trackId) {
    asBtnTrackVibe.style.display = 'flex';
    asBtnTrackVibe.onclick = () => {
      closeActionSheet();
      startTrackVibe(track);
    };
  }

  // Downloads. Both buttons share one handler; only the destination differs.
  // The label reflects the quality the user picked in settings, because
  // getStreamUrl already honours ym_audio_quality — so a lossless user gets a
  // FLAC file and everyone else an MP3 at their chosen bitrate.
  const asBtnDownload = document.getElementById('as-btn-download');
  const asBtnDownloadCache = document.getElementById('as-btn-download-cache');
  const asDownloadText = document.getElementById('as-download-text');

  const isNative = window.AndroidBridge && typeof window.AndroidBridge.downloadTrack === 'function';
  if (asDownloadText) {
    asDownloadText.textContent = isNative
      ? `Скачать трек (${formatDownloadQualityLabel()})`
      : 'Скачать трек (только в приложении)';
  }
  const showDownloads = isNative && Boolean(trackId);
  if (asBtnDownload) asBtnDownload.style.display = showDownloads ? 'flex' : 'none';
  if (asBtnDownloadCache) asBtnDownloadCache.style.display = showDownloads ? 'flex' : 'none';

  if (showDownloads) {
    const startDownload = (toCache) => downloadTrackToDevice(track, artistName, trackId, toCache);
    asBtnDownload.onclick = () => {
      closeActionSheet();
      startDownload(false);
    };
    asBtnDownloadCache.onclick = () => {
      closeActionSheet();
      startDownload(true);
    };
  }

  if (asBtnArtist) {
    if (artistId) {
      asBtnArtist.style.display = 'flex';
      asBtnArtist.onclick = () => {
        closeActionSheet();
        openArtist(artistId);
        dom.fullPlayer.classList.add('translateY-100');
      };
    } else {
      asBtnArtist.style.display = 'none';
    }
  }

  if (asBtnLike && trackId) {
    asBtnLike.style.display = 'flex';
    const isLiked = state.likedTrackIds ? state.likedTrackIds.has(trackId) : false;
    asBtnLike.querySelector('i').className = isLiked ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
    asBtnLike.querySelector('i').style.color = isLiked ? '#ff3333' : 'inherit';
    asLikeText.textContent = isLiked ? 'Удалить из коллекции' : 'Добавить в коллекцию';

    asBtnLike.onclick = async () => {
      closeActionSheet();
      const wasLiked = isLiked;
      const applyUI = (liked) => {
        if (state.likedTrackIds) {
          if (liked) state.likedTrackIds.add(trackId);
          else state.likedTrackIds.delete(trackId);
        }
        if (liked) {
          state.tracks.unshift({ id: trackId, title: track.title, artists: artistName, coverUri: track.coverUri, explicit: track.explicit || track.track?.explicit, isLiberty: track.isLiberty, track: track.track || track });
        } else {
          state.tracks = state.tracks.filter(t => String(t.id) !== trackId);
        }
        renderTracks();
        if (state.currentTrack && String(state.currentTrack.id) === trackId) {
          const heartIcon = dom.btnLike?.querySelector('i');
          if (heartIcon) {
            heartIcon.className = liked ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
            heartIcon.style.color = liked ? '#ff3333' : 'inherit';
          }
        }
      };
      try {
        applyUI(!wasLiked);
        const res = await YandexClient.like(trackId, wasLiked ? 'unlike' : 'like', state.token);
        if (res && res.success === false) {
          // fetch() does not reject on 4xx/5xx, so a failed like used to look
          // successful forever. Put the UI back.
          applyUI(wasLiked);
          showToast('Не удалось изменить коллекцию', 'bi-exclamation-circle');
        }
      } catch (e) {
        console.error(e);
        applyUI(wasLiked);
        showToast('Сетевая ошибка', 'bi-wifi-off');
      }
    };
  }

  // Copy track link
  const asBtnShare = document.getElementById('as-btn-share');
  if (asBtnShare && trackId) {
    asBtnShare.onclick = () => {
      const shareUrl = `https://music.yandex.ru/track/${trackId}`;
      copyToClipboard(shareUrl);
      showToast('Ссылка на трек скопирована');
      closeActionSheet();
    };
  }

  // Add to playlist
  if (asBtnPlaylist) {
    // Without a real track id the API call would be sent with an empty
    // track-ids list and produce a bogus result.
    if (trackId) {
      asBtnPlaylist.onclick = () => {
        openPlaylistChooser(trackId);
      };
    } else {
      asBtnPlaylist.style.display = 'none';
    }
  }

  // Report censorship
  if (asBtnReport && trackId) {
asBtnReport.onclick = async () => {
      asReportText.textContent = 'Отправляется...';
      try {
        let sent = false;
        // On file:// (the packaged app) a root-relative /api/ URL cannot resolve
        // at all, so go straight to the hosted endpoint.
        const canUseRelativeApi = typeof isLocal !== 'undefined' && isLocal;
        if (canUseRelativeApi) {
          try {
            const r1 = await fetch('/api/report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ track_id: Number(trackId), replaced: false })
            });
            const d1 = await r1.json();
            if (r1.ok && !d1.error) sent = true;
          } catch(e) {}
        }

        if (!sent) {
          const r2 = await fetch('https://ym-liberty-bot.vercel.app/api/bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'report', track_id: Number(trackId), replaced: false })
          });
          if (r2.ok) sent = true;
        }

        if (!sent) throw new Error('report failed');

        asReportText.textContent = '✅ Репорт отправлен в бот!';
        setTimeout(() => closeActionSheet(), 1400);
      } catch(err) {
        asReportText.textContent = '❌ Ошибка отправки';
        setTimeout(() => { if (asReportText) asReportText.textContent = 'Сообщить о цензуре'; }, 2000);
      }
    };
  }

  if (actionSheet) actionSheet.style.display = 'block';
  setTimeout(() => {
    if (actionSheetContent) actionSheetContent.style.transform = 'translateY(0)';
  }, 10);
}

function closeActionSheet() {
  const actionSheet = document.getElementById('action-sheet');
  const actionSheetContent = document.getElementById('action-sheet-content');
  if (actionSheetContent) actionSheetContent.style.transform = 'translateY(100%)';
  setTimeout(() => {
    if (actionSheet) actionSheet.style.display = 'none';
  }, 300);
}

// Playlist Chooser Logic
async function openPlaylistChooser(trackId) {
  const chooser = document.getElementById('playlist-chooser');
  const content = document.getElementById('playlist-chooser-content');
  const list = document.getElementById('playlist-chooser-list');
  
  chooser.style.display = 'block';
  setTimeout(() => { content.style.transform = 'translateY(0)'; }, 10);
  list.innerHTML = '<div style="text-align:center; padding: 20px;">Загрузка плейлистов...</div>';
  
  try {
    const data = await YandexClient.getPlaylists(state.token);
    list.innerHTML = '';
    
    if (data.playlists && data.playlists.length > 0) {
      data.playlists.forEach(pl => {
        const item = document.createElement('div');
        item.className = 'track-item';
        item.style.padding = '10px';
        item.style.borderRadius = '8px';
        item.style.background = 'rgba(255,255,255,0.05)';
        item.innerHTML = `
          <img src="${pl.coverUri || PLACEHOLDER_COVER}" style="width: 44px; height: 44px; border-radius: 6px; margin-right: 12px; object-fit: cover;">
          <div style="flex: 1;">
            <div style="font-weight: bold; font-size: 15px;">${escapeHtml(pl.title)}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">${pl.trackCount} треков</div>
          </div>
          <i class="bi bi-plus-circle" style="font-size: 20px; color: var(--accent-color);"></i>
        `;
        item.onclick = async () => {
          item.innerHTML = '<div style="padding: 10px; color: #fff;">Добавление...</div>';
          try {
            const addData = await YandexClient.addTrackToPlaylist(pl.kind, trackId, null, state.token);
            if (addData && addData.success) {
              showToast(`Трек добавлен в плейлист "${pl.title}"`, 'bi-check2-circle');
            } else {
              showToast('Не удалось добавить трек: ' + (addData.error || 'Ошибка'), 'bi-exclamation-circle');
            }
          } catch(err) {
            showToast('Сетевая ошибка при добавлении в плейлист', 'bi-wifi-off');
          }
          closePlaylistChooser();
          closeActionSheet();
        };
        list.appendChild(item);
      });
    } else {
      list.innerHTML = '<p style="text-align:center; color:#aaa;">Нет доступных плейлистов</p>';
    }
  } catch(e) {
    list.innerHTML = '<p style="text-align:center; color:red;">Ошибка загрузки</p>';
  }
}

function closePlaylistChooser() {
  const chooser = document.getElementById('playlist-chooser');
  const content = document.getElementById('playlist-chooser-content');
  if (content) content.style.transform = 'translateY(100%)';
  setTimeout(() => {
    if (chooser) chooser.style.display = 'none';
  }, 300);
}

document.getElementById('playlist-chooser-bg')?.addEventListener('click', closePlaylistChooser);
document.getElementById('playlist-chooser-cancel')?.addEventListener('click', closePlaylistChooser);
document.getElementById('action-sheet-bg')?.addEventListener('click', closeActionSheet);
document.getElementById('as-btn-cancel')?.addEventListener('click', closeActionSheet);

// Button on full player header
const btnTrackMenu = document.getElementById('btn-track-menu');
if (btnTrackMenu) {
  btnTrackMenu.addEventListener('click', () => {
    const current = state.currentTrack || state.queue[state.queueIndex];
    if (current) {
      const isExplicit = current.explicit || current.contentWarning === 'explicit';
      const cover = current.cover || current.coverUri || current.track?.coverUri || current.track?.albums?.[0]?.coverUri || PLACEHOLDER_COVER;
      const trackData = {
        id: current.id,
        title: current.title,
        artists: current.artists || current.artist || (current.track?.artists || []).map(a => a.name).join(', '),
        coverUri: cover,
        explicit: isExplicit,
        isLiberty: current.isLiberty,
        artistId: current.artistId || current.artists?.[0]?.id || current.track?.artists?.[0]?.id,
        track: current.track || current
      };
      openActionSheet(trackData);
    }
  });
}

// Global click delegate for track items three-dots
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('track-dots') || e.target.closest('.track-dots')) {
    e.stopPropagation();
    const trackItem = e.target.closest('.track-item');
    if (!trackItem) return;
    
    if (trackItem._trackData) {
      openActionSheet(trackItem._trackData);
      return;
    }
    
    const titleEl = trackItem.querySelector('.track-title');
    const artistEl = trackItem.querySelector('.track-artist');
    const imgEl = trackItem.querySelector('img');
    
    let titleText = '';
    if (titleEl) {
      titleText = Array.from(titleEl.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    }
    
    const trackData = {
      title: titleText || 'Unknown',
      artists: artistEl ? artistEl.textContent : '',
      coverUri: imgEl ? imgEl.src : PLACEHOLDER_COVER
    };
    openActionSheet(trackData);
  }
});

// ==========================================
// Wave Screen Stats & Moods + Cloud Account Sync
// ==========================================
const WAVE_STATS_KEY = 'ym_wave_stats';
const STATS_PLAYLIST_PREFIX = '_ym_stats:';
let syncPlaylistKind = null;
// Cloud history-playlist sync state (declared here so it is initialised long
// before any of the async sync paths can touch it).
let pendingSyncTracks = [];
let syncTracksTimeout = null;
let syncedTrackIds = new Set();
const SYNCED_TRACK_IDS_LIMIT = 3000;
let syncResolveAttempts = 0;
let syncRetries = 0;
// Set when the account-side stats sync is known to be failing, so the UI can
// stop pretending the counters are safe in the cloud.
let statsSyncFailed = false;
let lastAudioSampleTime = null;
let lastAudioCurrentTrackId = null;

function getWaveStats() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(WAVE_STATS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Legacy shape migration: older builds stored {tracks, seconds} with no
      // split between "today" and "all time". The old counters were lifetime
      // values, so carry them into the totals only — copying them into *today*
      // inflated the daily figure by the entire history on upgrade.
      if (data.tracks !== undefined && data.totalTracks === undefined) {
        data.totalTracks = data.tracks || 0;
        data.totalSeconds = data.seconds || 0;
        data.todayTracks = 0;
        data.todaySeconds = 0;
      }
      // Day rollover: reset the daily counters. Persist immediately so the
      // stored date is consistent and a later save cannot write stale values.
      if (data.date !== today) {
        data.date = today;
        data.todayTracks = 0;
        data.todaySeconds = 0;
        try { localStorage.setItem(WAVE_STATS_KEY, JSON.stringify(data)); } catch (e) {}
      }
      return data;
    }
  } catch (e) {}
  return {
    date: today,
    todayTracks: 0,
    todaySeconds: 0,
    totalTracks: 0,
    totalSeconds: 0,
    mood: 'Моя Волна'
  };
}

function saveWaveStats(stats) {
  try {
    localStorage.setItem(WAVE_STATS_KEY, JSON.stringify(stats));
    waveStatsDirty = false;
  } catch (e) {}
}

// The rAF loop calls accumulateListeningSeconds every frame. Writing to
// localStorage and repainting 5 DOM nodes 60-120x/second was the single biggest
// source of jank and battery drain. Accumulate in memory and persist at most
// once a second — getWaveStats() re-reads storage, so the pending delta has to
// be kept here or it would be thrown away.
let waveStatsDirty = false;
let lastWaveStatsPersist = 0;
let pendingSeconds = 0;

function accumulateListeningSeconds(sec) {
  if (!sec || sec <= 0) return;
  pendingSeconds += sec;
  waveStatsDirty = true;

  const now = Date.now();
  if (now - lastWaveStatsPersist >= 1000) {
    flushWaveStats();
  }
}

function flushWaveStats() {
  if (!waveStatsDirty && pendingSeconds === 0) return;
  const stats = getWaveStats();
  if (pendingSeconds > 0) {
    stats.todaySeconds = (stats.todaySeconds || 0) + pendingSeconds;
    stats.totalSeconds = (stats.totalSeconds || 0) + pendingSeconds;
    pendingSeconds = 0;
  }
  saveWaveStats(stats);
  lastWaveStatsPersist = Date.now();
  if (!document.hidden) updateWaveStatsDisplay();
}

function recordListeningProgress(forcedSeconds = 0) {
  if (forcedSeconds > 0) {
    accumulateListeningSeconds(forcedSeconds);
    if (typeof scheduleAccountStatsSync === 'function') scheduleAccountStatsSync();
    return;
  }

  if (!activePlayer || !state.isPlaying || activePlayer.paused) {
    lastAudioSampleTime = null;
    return;
  }

  const curTrackId = state.currentTrack?.id || 'current';
  const curPos = activePlayer.currentTime;
  if (typeof curPos !== 'number' || isNaN(curPos)) return;

  if (lastAudioCurrentTrackId !== curTrackId) {
    lastAudioCurrentTrackId = curTrackId;
    lastAudioSampleTime = curPos;
    return;
  }

  if (lastAudioSampleTime === null) {
    lastAudioSampleTime = curPos;
    return;
  }

  const delta = curPos - lastAudioSampleTime;
  lastAudioSampleTime = curPos;

  if (delta > 0 && delta < 900) {
    accumulateListeningSeconds(delta);
    if (typeof scheduleAccountStatsSync === 'function') scheduleAccountStatsSync();
  } else if (delta < 0) {
    lastAudioSampleTime = curPos;
  }
}

function recordTrackFinished() {
  const stats = getWaveStats();
  stats.todayTracks = (stats.todayTracks || 0) + 1;
  stats.totalTracks = (stats.totalTracks || 0) + 1;
  saveWaveStats(stats);
  updateWaveStatsDisplay();
  if (typeof scheduleAccountStatsSync === 'function') scheduleAccountStatsSync(true);
}

function formatDurationStats(totalSec) {
  if (!totalSec || totalSec <= 0) return '0 мин';
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) {
    return `${hours} ч ${mins} мин`;
  }
  return `${mins || 1} мин`;
}

function updateWaveStatsDisplay() {
  const stats = getWaveStats();
  const elTracks = document.getElementById('vibe-stat-tracks');
  const elTime = document.getElementById('vibe-stat-time');
  const elMood = document.getElementById('vibe-stat-mood');
  const elTotalTracks = document.getElementById('vibe-stat-total-tracks');
  const elTotalTime = document.getElementById('vibe-stat-total-time');

  // Top 3 original cards
  if (elTracks) elTracks.textContent = stats.todayTracks || 0;
  if (elTime) elTime.textContent = formatDurationStats(stats.todaySeconds || 0);
  if (elMood) elMood.textContent = stats.mood || 'Всё подряд';

  // Separate total cards below
  if (elTotalTracks) elTotalTracks.textContent = stats.totalTracks || 0;
  if (elTotalTime) elTotalTime.textContent = formatDurationStats(stats.totalSeconds || 0);

  // Surface a failing account sync instead of silently freezing the counters.
  const syncWarning = document.getElementById('vibe-sync-warning');
  if (syncWarning) {
    if (statsSyncFailed && state.token) syncWarning.classList.remove('hidden');
    else syncWarning.classList.add('hidden');
  }
}

// --- Cloud Account Persistence (Restores stats on app reinstall) ---
//
// Two independent mechanisms, which used to be conflated:
//  1. the listening counters live on the YM Liberty server, keyed by uid;
//  2. the Wave history playlist on the Yandex account only backs the
//     "never repeat a track" dedup window.
// A failure in (2) must not flag the counters as unsynced, so only (1) drives
// statsSyncFailed.
async function syncWaveStatsFromAccount() {
  if (!state.token) {
    ylog('SYNC', 'skipped: no token');
    return;
  }

  await syncStatsFromServer();
  await syncWaveHistoryPlaylist();
}

// The uid is resolved on-device because Yandex rejects the server's datacenter
// IP — the bot cannot call account/status itself. Prefer the value already
// fetched during login; fall back to a device-side lookup (which caches).
async function resolveStatsUid() {
  const fromUser = state.user && (state.user.uid || state.user.id);
  if (fromUser) return String(fromUser);
  if (YandexClient.cachedUid) return String(YandexClient.cachedUid);
  if (!state.token || !YandexClient.getUid) return null;
  try {
    const uid = await YandexClient.getUid(state.token);
    return uid ? String(uid) : null;
  } catch (e) {
    ylogError('SYNC', 'could not resolve uid on device: ' + (e && e.message ? e.message : e));
    return null;
  }
}

async function syncStatsFromServer() {
  if (!state.token || !YandexClient.getServerStats) {
    ylog('SYNC', 'skipped: no token or stats client unavailable');
    return;
  }
  const uid = await resolveStatsUid();
  if (!uid) {
    ylog('SYNC', 'skipped: uid unavailable');
    return;
  }
  try {
    const remote = await YandexClient.getServerStats(uid);
    if (!remote || typeof remote !== 'object' || remote.error) {
      // An empty object means the user simply has no stats yet: push the local
      // counters up instead of treating it as a sync failure.
      await pushStatsToServer(uid);
      return;
    }

    const local = getWaveStats();
    const today = new Date().toISOString().slice(0, 10);

    local.totalTracks = Math.max(local.totalTracks || 0, remote.totalTracks || 0);
    local.totalSeconds = Math.max(local.totalSeconds || 0, remote.totalSeconds || 0);
    if (remote.date === today) {
      local.todayTracks = Math.max(local.todayTracks || 0, remote.todayTracks || 0);
      local.todaySeconds = Math.max(local.todaySeconds || 0, remote.todaySeconds || 0);
    }
    saveWaveStats(local);
    updateWaveStatsDisplay();

    // The local copy may have been ahead (e.g. listening happened offline), so
    // write the merged result back rather than only pulling.
    await pushStatsToServer(uid);

    if (statsSyncFailed) ylog('SYNC', 'server stats sync recovered');
    statsSyncFailed = false;
  } catch (e) {
    ylogError('SYNC', 'read stats from server failed: ' + (e && e.message ? e.message : e));
    statsSyncFailed = true;
  }
}

async function pushStatsToServer(uidHint) {
  if (!state.token || !YandexClient.saveServerStats) return false;
  const uid = uidHint || await resolveStatsUid();
  if (!uid) {
    ylog('SYNC', 'write skipped: uid unavailable');
    return false;
  }
  try {
    const stats = getWaveStats();
    await YandexClient.saveServerStats(uid, {
      totalTracks: stats.totalTracks || 0,
      totalSeconds: stats.totalSeconds || 0,
      todayTracks: stats.todayTracks || 0,
      todaySeconds: stats.todaySeconds || 0,
      date: stats.date || new Date().toISOString().slice(0, 10)
    });
    if (statsSyncFailed) ylog('SYNC', 'server stats sync recovered');
    statsSyncFailed = false;
    updateWaveStatsDisplay();
    return true;
  } catch (e) {
    ylogError('SYNC', 'write stats to server failed: ' + (e && e.message ? e.message : e));
    statsSyncFailed = true;
    updateWaveStatsDisplay();
    return false;
  }
}

// Resolve (creating it if needed) the hidden account playlist that stores the
// Wave history. Its title carries no counters — only the marker prefix.
async function syncWaveHistoryPlaylist() {
  if (!state.token || !YandexClient.getUserPlaylistsRaw) return;
  try {
    const playlists = await YandexClient.getUserPlaylistsRaw(state.token);
    const statPl = (playlists || []).find(p => p.title && p.title.startsWith(STATS_PLAYLIST_PREFIX));
    if (statPl) {
      syncPlaylistKind = statPl.kind;

      // Restore previously played Wave tracks so the Wave never repeats after a reinstall
      if (YandexClient.getPlaylist) {
        const plData = await YandexClient.getPlaylist(statPl.kind, state.token);
        if (plData && plData.tracks && plData.tracks.length > 0) {
          state.vibeHistory = state.vibeHistory || new Set();
          // The playlist is newest-first (tracks are inserted at position 0),
          // so reverse it to get the chronological order the dedup engine expects.
          const ordered = plData.tracks.slice().reverse();
          ordered.forEach(tr => {
            if (tr && tr.id) state.vibeHistory.add(String(tr.id));
            if (tr && tr.id) syncedTrackIds.add(String(tr.id));
          });
          // Trim to the dedup window, keeping the most recent entries.
          while (state.vibeHistory.size > VIBE_DEDUP_LIMIT) {
            const iter = state.vibeHistory.values();
            state.vibeHistory.delete(iter.next().value);
          }
          if (typeof saveVibeHistory === 'function') saveVibeHistory();
        }
      }
      return;
    }

    const created = await YandexClient.createPrivatePlaylist(STATS_PLAYLIST_PREFIX + 'wave-history', state.token);
    if (created && created.kind) {
      syncPlaylistKind = created.kind;
      ylog('SYNC', 'created wave history playlist kind=' + created.kind);
    } else {
      ylogError('SYNC', 'could not create wave history playlist');
    }
  } catch (e) {
    // Dedup history is a nice-to-have: losing it only means the Wave may repeat
    // a few tracks, so it must not raise the "stats not syncing" warning.
    ylogError('SYNC', 'wave history playlist sync failed: ' + (e && e.message ? e.message : e));
  }
}

// Add played track to account sync playlist in background
function addTrackToCloudSync(trackId, albumId) {
  if (!state.token || !trackId) return;
  const id = String(trackId);
  if (syncedTrackIds.has(id)) return;
  pendingSyncTracks.push({ id, albumId: String(albumId || 0) });
  if (syncTracksTimeout) return;
  syncTracksTimeout = setTimeout(flushCloudSyncQueue, 8000);
}

async function flushCloudSyncQueue() {
  syncTracksTimeout = null;
  if (!pendingSyncTracks.length) return;
  // Resolve the target playlist BEFORE draining the buffer. The old code
  // splice()d the queue first and then bailed out when the playlist was not
  // known yet, silently throwing the whole batch away.
  if (!syncPlaylistKind || !YandexClient.addTrackToPlaylist) {
    // Bounded waiting: the playlist is created by scheduleAccountStatsSync, but
    // if that never happens we must not retry forever.
    if (syncResolveAttempts >= 8) {
      pendingSyncTracks = [];
      syncResolveAttempts = 0;
      return;
    }
    syncResolveAttempts++;
    syncTracksTimeout = setTimeout(flushCloudSyncQueue, 4000);
    return;
  }
  syncResolveAttempts = 0;
  const toSend = pendingSyncTracks.splice(0, pendingSyncTracks.length);
  try {
    for (const t of toSend) {
      await YandexClient.addTrackToPlaylist(syncPlaylistKind, t.id, t.albumId, state.token);
      syncedTrackIds.add(t.id);
    }
    while (syncedTrackIds.size > SYNCED_TRACK_IDS_LIMIT) {
      const iter = syncedTrackIds.values();
      syncedTrackIds.delete(iter.next().value);
    }
  } catch (e) {
    console.warn("Cloud sync add track error:", e);
    // Re-queue only what we failed to push (succeeded ids are already recorded),
    // capped so the buffer cannot grow without bound, and retry a limited
    // number of times instead of forever.
    const failed = toSend.filter(t => !syncedTrackIds.has(t.id));
    if (syncRetries < 4) {
      syncRetries++;
      pendingSyncTracks = failed.concat(pendingSyncTracks).slice(0, 500);
      if (!syncTracksTimeout) syncTracksTimeout = setTimeout(flushCloudSyncQueue, 15000);
    } else {
      syncRetries = 0;
      pendingSyncTracks = [];
    }
  }
}

let syncTimeout = null;
function scheduleAccountStatsSync(immediate = false) {
  if (syncTimeout) {
    if (!immediate) return;
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  syncTimeout = setTimeout(async () => {
    syncTimeout = null;
    if (!state.token) return;
    await pushStatsToServer();
  }, immediate ? 100 : 20000);
}

// Global Lifecycle Listeners for Accurate Background Tracking
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    recordListeningProgress();
    flushWaveStats();
    updateWaveStatsDisplay();
  } else {
    // Persist whatever is still pending before the WebView can be frozen.
    flushWaveStats();
  }
});
window.addEventListener('focus', () => {
  recordListeningProgress();
  flushWaveStats();
  updateWaveStatsDisplay();
});
window.addEventListener('beforeunload', () => {
  recordListeningProgress();
  flushWaveStats();
  scheduleAccountStatsSync(true);
});
window.addEventListener('pagehide', () => {
  flushWaveStats();
  scheduleAccountStatsSync(true);
});

function syncVibeMoodUI(moodName) {
  const targetMood = moodName || (typeof getWaveStats === 'function' ? getWaveStats().mood : null) || 'Всё подряд';
  const chips = document.querySelectorAll('.vibe-chip');
  let matched = false;
  chips.forEach(chip => {
    const text = chip.textContent.trim();
    if (text === targetMood) {
      chip.classList.add('active');
      matched = true;
      try {
        chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch (e) {}
    } else {
      chip.classList.remove('active');
    }
  });

  if (!matched && chips.length > 0) {
    chips[0].classList.add('active');
  }

  const elMood = document.getElementById('vibe-stat-mood');
  if (elMood) elMood.textContent = targetMood;

  const subEl = document.querySelector('.vibe-subtitle');
  if (subEl) {
    if (targetMood && targetMood !== 'Всё подряд') {
      subEl.textContent = `Настроение: ${targetMood}`;
    } else if (state.currentStation && state.currentStation.startsWith('track:')) {
      subEl.textContent = `Волна по треку: ${state.currentTrack?.title || ''}`;
    } else {
      subEl.textContent = 'Музыка, которая вам понравится';
    }
  }
}

const VIBE_MOOD_SETTINGS_MAP = {
  'all': { moodEnergy: 'all', diversity: 'default' },
  'energy': { moodEnergy: 'active', diversity: 'default' },
  'calm': { moodEnergy: 'calm', diversity: 'default' },
  'happy': { moodEnergy: 'fun', diversity: 'default' },
  'discover': { moodEnergy: 'all', diversity: 'discover' }
};

function initVibeMoodChips() {
  const stats = getWaveStats();
  const savedMood = localStorage.getItem('ym_active_vibe_mood') || stats.mood || 'Всё подряд';
  syncVibeMoodUI(savedMood);

  const chips = document.querySelectorAll('.vibe-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const moodName = chip.textContent.trim();
      const moodKey = chip.getAttribute('data-mood') || 'all';
      const curStats = getWaveStats();
      curStats.mood = moodName;
      saveWaveStats(curStats);
      localStorage.setItem('ym_active_vibe_mood', moodName);
      syncVibeMoodUI(moodName);
      updateWaveStatsDisplay();

      const settings = VIBE_MOOD_SETTINGS_MAP[moodKey] || { moodEnergy: 'all', diversity: 'default' };

      // Отправляем настройки в Яндекс Ротор
      if (state.token && YandexClient.setVibeSettings) {
        try {
          const res = await YandexClient.setVibeSettings(settings.moodEnergy, settings.diversity, state.token);
          if (res && res.success === false) {
            showToast(`Ротор не принял настроение «${moodName}»`, 'bi-exclamation-circle');
          } else {
            showToast(`Настроение: ${moodName}`, 'bi-check2-circle');
          }
        } catch (e) {
          console.warn('Failed to update vibe settings:', e);
          showToast('Не удалось применить настроение', 'bi-wifi-off');
        }
      } else {
        // Without a token the mood is only stored locally — say so instead of
        // silently showing a selected chip that Rotor knows nothing about.
        showToast(`Настроение: ${moodName} (применится после входа)`, 'bi-exclamation-circle');
      }

      if (state.queueMode === 'vibe' && (!state.currentStation || state.currentStation === 'user:onyourwave')) {
        updatePlaybackContextHeader('ИГРАЕТ ИЗ ВОЛНЫ', moodName === 'Всё подряд' ? 'Моя Волна' : `Моя Волна • ${moodName}`);

        // Start a track from the new mood right away. The old code kept the
        // currently playing (old-mood) track at the head of the rebuilt queue
        // and only preloaded, so the new mood was first heard after the rest of
        // the queue drained — "takes effect after several songs".
        //
        // A background refill may be in flight with the OLD settings. Instead
        // of bailing out, mark its result stale: fetchMoreVibeTracks appends to
        // state.queue, which would push old-mood tracks back in behind the new
        // ones.
        const moodRequestId = ++state.moodRequestSeq;
        state.isFetchingVibe = false;
        try {
          const data = await YandexClient.getVibe(state.token, null, 'user:onyourwave');
          if (moodRequestId !== state.moodRequestSeq) return; // a newer mood won
          if (data && data.tracks && data.tracks.length > 0) {
            let nextTracks = dedupeVibeBatch(data.tracks, null, 100);
            rememberVibeBatch(nextTracks, data.batchId);
            if (nextTracks.length === 0) return;
            state.queue = nextTracks;
            state.queueIndex = 0;
            const firstTrack = state.queue[0];
            sendFeedback('radioStarted', firstTrack.id, 0);
            playQueueTrack(firstTrack);
          }
        } catch (err) {
          console.warn('Failed to reload vibe queue for new mood:', err);
        }
      }
    });
  });
}

// The selected mood lives on the Rotor account server-side, but if it is ever
// reset there (or the user signs into another account) the chip would claim one
// mood while Rotor played another. Re-apply it once per session.
async function reapplySavedVibeMood() {
  if (!state.token || !YandexClient || !YandexClient.setVibeSettings) return;
  const savedMood = localStorage.getItem('ym_active_vibe_mood') || getWaveStats().mood;
  if (!savedMood) return;
  const chip = Array.from(document.querySelectorAll('.vibe-chip'))
    .find(c => c.textContent.trim() === savedMood);
  const moodKey = (chip && chip.getAttribute('data-mood')) || 'all';
  const settings = VIBE_MOOD_SETTINGS_MAP[moodKey] || { moodEnergy: 'all', diversity: 'default' };
  try {
    await YandexClient.setVibeSettings(settings.moodEnergy, settings.diversity, state.token);
  } catch (e) {
    console.warn('Could not re-apply saved vibe mood:', e);
  }
}

// ==========================================
// Web Audio API Equalizer & Audio Quality
// ==========================================
let eqAudioCtx = null;
let eqFilters = [];
let eqSourceA = null;
let eqSourceB = null;
let vibeAuraAnalyser = null;
let vibeAuraFreqData = null;

const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];
const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0],
  bass: [7, 5, 0, 0, -1],
  rock: [5, 3, -1, 3, 5],
  pop: [-1, 2, 4, 3, -1],
  electronic: [6, 4, 0, 2, 5],
  vocal: [-2, -1, 5, 3, 1],
  jazz: [3, 2, -1, 2, 3],
  custom: null
};

function initEqualizerAudioNode() {
  if (eqAudioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    eqAudioCtx = new AudioContextClass();

    eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = eqAudioCtx.createBiquadFilter();
      if (idx === 0) {
        filter.type = 'lowshelf';
      } else if (idx === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.0;
      }
      filter.frequency.value = freq;
      filter.gain.value = 0;
      return filter;
    });

    for (let i = 0; i < eqFilters.length - 1; i++) {
      eqFilters[i].connect(eqFilters[i + 1]);
    }
    eqFilters[eqFilters.length - 1].connect(eqAudioCtx.destination);

    if (playerA && !eqSourceA) {
      eqSourceA = eqAudioCtx.createMediaElementSource(playerA);
      eqSourceA.connect(eqFilters[0]);
    }
    if (playerB && !eqSourceB) {
      eqSourceB = eqAudioCtx.createMediaElementSource(playerB);
      eqSourceB.connect(eqFilters[0]);
    }
  } catch (e) {
    console.warn("Equalizer Web Audio init warning:", e);
  }
}

function ensureVibeAudioAnalysis() {
  try {
    if (!eqAudioCtx) initEqualizerAudioNode();
    if (eqAudioCtx && eqAudioCtx.state === 'suspended') {
      eqAudioCtx.resume().catch(() => {});
    }
    if (eqAudioCtx && !vibeAuraAnalyser) {
      vibeAuraAnalyser = eqAudioCtx.createAnalyser();
      vibeAuraAnalyser.fftSize = 64;
      vibeAuraAnalyser.smoothingTimeConstant = 0.78;
      vibeAuraFreqData = new Uint8Array(vibeAuraAnalyser.frequencyBinCount);
      const output = eqFilters[eqFilters.length - 1];
      if (output) {
        output.disconnect(eqAudioCtx.destination);
        output.connect(vibeAuraAnalyser);
        vibeAuraAnalyser.connect(eqAudioCtx.destination);
      }
    }
  } catch (e) {
    // If inserting the analyser failed after disconnecting the EQ output,
    // restore the original signal path so playback never becomes silent.
    try {
      const output = eqFilters[eqFilters.length - 1];
      if (output && eqAudioCtx) output.connect(eqAudioCtx.destination);
    } catch (_) {}
    console.warn('Vibe audio analysis unavailable:', e);
  }
}

function applyEqualizerSettings() {
  const isEnabled = localStorage.getItem('ym_eq_enabled') === 'true';
  const rawBands = localStorage.getItem('ym_eq_bands');
  const bands = rawBands ? JSON.parse(rawBands) : [0, 0, 0, 0, 0];

  if (isEnabled && !eqAudioCtx) {
    initEqualizerAudioNode();
  }

  if (eqAudioCtx && eqAudioCtx.state === 'suspended') {
    eqAudioCtx.resume().catch(() => {});
  }

  eqFilters.forEach((filter, i) => {
    const gainVal = isEnabled ? (bands[i] || 0) : 0;
    try {
      filter.gain.setValueAtTime(gainVal, eqAudioCtx?.currentTime || 0);
    } catch (e) {}
  });
}

function initEqualizerAndQualityUI() {
  const toggle = document.getElementById('toggle-equalizer');
  const controls = document.getElementById('eq-controls');
  const presetSelect = document.getElementById('setting-eq-preset');
  const tracks = [0, 1, 2, 3, 4].map(i => document.getElementById(`eq-track-${i}`));
  const hiddenInputs = [0, 1, 2, 3, 4].map(i => document.getElementById(`eq-band-${i}`));
  const valLabels = [0, 1, 2, 3, 4].map(i => document.getElementById(`eq-val-${i}`));
  const fillBars = [0, 1, 2, 3, 4].map(i => document.getElementById(`eq-fill-${i}`));
  const thumbs = [0, 1, 2, 3, 4].map(i => document.getElementById(`eq-thumb-${i}`));

  const isEnabled = localStorage.getItem('ym_eq_enabled') === 'true';
  const savedPreset = localStorage.getItem('ym_eq_preset') || 'flat';
  const rawBands = localStorage.getItem('ym_eq_bands');
  let bands = rawBands ? JSON.parse(rawBands) : [0, 0, 0, 0, 0];

  function updateSliderVisual(i, val) {
    const sl = hiddenInputs[i];
    const lbl = valLabels[i];
    const fill = fillBars[i];
    const thumb = thumbs[i];
    const num = parseInt(val, 10) || 0;
    if (sl) sl.value = num;

    if (lbl) {
      lbl.textContent = (num > 0 ? `+${num}` : `${num}`) + ' dB';
      lbl.classList.remove('boost', 'cut');
      if (num > 0) lbl.classList.add('boost');
      else if (num < 0) lbl.classList.add('cut');
    }

    const ratio = Math.max(0, Math.min(1, (num + 12) / 24));
    const topPx = 11 + (1 - ratio) * 118;

    if (thumb) {
      thumb.style.top = `${topPx}px`;
    }

    if (fill) {
      if (num > 0) {
        fill.style.top = `${topPx}px`;
        fill.style.height = `${70 - topPx}px`;
        fill.style.background = 'var(--accent-color, #fc3f1d)';
      } else if (num < 0) {
        fill.style.top = `70px`;
        fill.style.height = `${topPx - 70}px`;
        fill.style.background = '#4da3ff';
      } else {
        fill.style.top = `70px`;
        fill.style.height = '0px';
      }
    }
  }

  // Initial populate of sliders and fills
  bands.forEach((val, i) => {
    updateSliderVisual(i, val);
  });

  // Pointer drag handling on custom tracks
  function setBandFromPointer(i, clientY) {
    const track = tracks[i];
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const padding = 11;
    const trackHeight = rect.height - padding * 2;
    const clampedY = Math.max(rect.top + padding, Math.min(rect.bottom - padding, clientY));
    const ratio = 1 - (clampedY - (rect.top + padding)) / trackHeight;
    const val = Math.round(-12 + ratio * 24);
    bands[i] = val;
    updateSliderVisual(i, val);
    if (presetSelect) presetSelect.value = 'custom';
    localStorage.setItem('ym_eq_preset', 'custom');
    localStorage.setItem('ym_eq_bands', JSON.stringify(bands));
    applyEqualizerSettings();
  }

  tracks.forEach((track, i) => {
    if (!track) return;
    track.addEventListener('pointerdown', (e) => {
      track.setPointerCapture(e.pointerId);
      track.classList.add('dragging');
      setBandFromPointer(i, e.clientY);
    });
    track.addEventListener('pointermove', (e) => {
      if (track.hasPointerCapture(e.pointerId)) {
        setBandFromPointer(i, e.clientY);
      }
    });
    const release = (e) => {
      if (track.hasPointerCapture(e.pointerId)) {
        track.releasePointerCapture(e.pointerId);
      }
      track.classList.remove('dragging');
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
  });

  if (toggle) {
    toggle.checked = isEnabled;
    if (controls) {
      if (isEnabled) controls.classList.remove('disabled');
      else controls.classList.add('disabled');
    }
    toggle.addEventListener('change', () => {
      const en = toggle.checked;
      localStorage.setItem('ym_eq_enabled', en ? 'true' : 'false');
      if (controls) {
        if (en) controls.classList.remove('disabled');
        else controls.classList.add('disabled');
      }
      if (eqAudioCtx && eqAudioCtx.state === 'suspended') {
        eqAudioCtx.resume().catch(() => {});
      }
      initEqualizerAudioNode();
      applyEqualizerSettings();
      showToast(en ? 'Эквалайзер включен' : 'Эквалайзер выключен');
    });
  }

  if (presetSelect) {
    setupYmSelect(presetSelect, (p) => {
      localStorage.setItem('ym_eq_preset', p);
      if (EQ_PRESETS[p]) {
        bands = [...EQ_PRESETS[p]];
        localStorage.setItem('ym_eq_bands', JSON.stringify(bands));
        bands.forEach((val, i) => {
          updateSliderVisual(i, val);
        });
      }
      applyEqualizerSettings();
    });
    presetSelect.value = savedPreset;
  }

// Audio Quality Setting
  const qualitySelect = document.getElementById('setting-audio-quality');
  const qualityLabel = document.getElementById('audio-quality-label');
  const savedQuality = localStorage.getItem('ym_audio_quality') || '320';
  const qualityText = (q) => (String(q) === '1000' ? 'Lossless (FLAC)' : `${q} kbps`);
  if (qualitySelect) {
    setupYmSelect(qualitySelect, (q) => {
      localStorage.setItem('ym_audio_quality', q);
      if (qualityLabel) qualityLabel.textContent = qualityText(q);
      showToast(`Качество звука: ${qualityText(q)}`, 'bi-check2-circle');
    });
    qualitySelect.value = savedQuality;
    if (qualityLabel) qualityLabel.textContent = qualityText(savedQuality);
  }

  // Crossfade Setting
  const toggleCrossfade = document.getElementById('toggle-crossfade');
  const crossfadeDurationWrap = document.getElementById('crossfade-duration-wrap');
  const crossfadeSlider = document.getElementById('crossfade-slider');
  const crossfadeVal = document.getElementById('crossfade-val');

  if (toggleCrossfade) {
    toggleCrossfade.checked = crossfadeEnabled;
    if (crossfadeDurationWrap) {
      crossfadeDurationWrap.style.display = crossfadeEnabled ? 'flex' : 'none';
    }
    toggleCrossfade.addEventListener('change', () => {
      crossfadeEnabled = toggleCrossfade.checked;
      localStorage.setItem('ym_crossfade_enabled', crossfadeEnabled ? 'true' : 'false');
      if (crossfadeDurationWrap) {
        crossfadeDurationWrap.style.display = crossfadeEnabled ? 'flex' : 'none';
      }
      showToast(crossfadeEnabled ? `Кроссфейд включен (${crossfadeSec} сек)` : 'Кроссфейд отключен');
    });
  }

  if (crossfadeSlider) {
    crossfadeSlider.value = crossfadeSec;
    if (crossfadeVal) crossfadeVal.textContent = `${crossfadeSec} сек`;
    crossfadeSlider.addEventListener('input', () => {
      crossfadeSec = parseInt(crossfadeSlider.value, 10);
      if (crossfadeVal) crossfadeVal.textContent = `${crossfadeSec} сек`;
    });
    crossfadeSlider.addEventListener('change', () => {
      crossfadeSec = parseInt(crossfadeSlider.value, 10);
      localStorage.setItem('ym_crossfade_sec', String(crossfadeSec));
      if (crossfadeVal) crossfadeVal.textContent = `${crossfadeSec} сек`;
      showToast(`Длительность кроссфейда: ${crossfadeSec} сек`);
    });
  }
}

// ==========================================
// In-App Auto-Update System (Vercel Host)
// ==========================================
function getAppVersionInfo() {
  // Fallbacks must stay in sync with android:versionCode / android:versionName
  // in AndroidManifest.xml. They previously read 4 / '1.0.3', which made a
  // failed bridge lookup silently claim an ancient version and could hide or
  // fake an update.
  let versionCode = 23;
  let versionName = '1.1.6';
  if (window.AndroidBridge) {
    if (typeof window.AndroidBridge.getVersionCode === 'function') {
      try {
        const code = window.AndroidBridge.getVersionCode();
        if (code) versionCode = code;
      } catch (e) {}
    }
    if (typeof window.AndroidBridge.getVersionName === 'function') {
      try {
        const name = window.AndroidBridge.getVersionName();
        if (name) versionName = name;
      } catch (e) {}
    }
  }
  return { versionCode, versionName };
}

async function fetchUpdateMetadata() {
  const endpoints = [
    'https://ym-liberty-bot.vercel.app/api/version?_t=' + Date.now(),
    'https://ym-liberty-bot.vercel.app/version.json?_t=' + Date.now()
  ];
  let best = null;
  for (const url of endpoints) {
    try {
      const resp = await fetch(url, { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && Number.isFinite(Number(data.versionCode))) {
          if (!best || Number(data.versionCode) > Number(best.versionCode)) {
            best = data;
          }
        }
      }
    } catch (e) {
      console.warn('Update endpoint check failed:', url, e);
    }
  }
  return best;
}

async function checkForUpdates(isManual = false) {
  const current = getAppVersionInfo();
  const btnCheck = document.getElementById('btn-check-update');
  const originalBtnHtml = btnCheck ? btnCheck.innerHTML : '';

  if (isManual && btnCheck) {
    btnCheck.disabled = true;
    btnCheck.innerHTML = '<div style="width: 14px; height: 14px; border: 2px solid #fff; border-right-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div> <span>Проверка...</span>';
  }

  try {
    const data = await fetchUpdateMetadata();
    if (!data) {
      if (isManual) showToast('Не удалось проверить обновления');
      return;
    }

    if (data.versionCode > current.versionCode) {
      showUpdateModal(data, current);
    } else {
      if (isManual) {
        showToast(`У вас установлена последняя версия (v${current.versionName})`);
      }
    }
  } catch (err) {
    console.error('Update check error:', err);
    if (isManual) showToast('Ошибка при проверке обновлений');
  } finally {
    if (isManual && btnCheck) {
      btnCheck.disabled = false;
      btnCheck.innerHTML = originalBtnHtml;
    }
  }
}

function showUpdateModal(updateData, current) {
  const modal = document.getElementById('update-modal');
  const verTag = document.getElementById('update-version-tag');
  const changelogList = document.getElementById('update-changelog-list');
  const progressContainer = document.getElementById('update-progress-container');
  const progressFill = document.getElementById('update-progress-fill');
  const progressPct = document.getElementById('update-progress-pct');
  const progressLabel = document.getElementById('update-progress-label');
  const statusMsg = document.getElementById('update-status-msg');
  const btnInstall = document.getElementById('btn-update-install');
  const btnLater = document.getElementById('btn-update-later');
  const btnCloseX = document.getElementById('btn-close-update-x');

  if (!modal) return;

  if (verTag) verTag.textContent = `v${updateData.versionName || updateData.versionCode}`;
  const directLink = document.getElementById('link-direct-download');
  if (directLink && updateData.apkUrl) {
    directLink.href = updateData.apkUrl;
  }
  if (statusMsg) statusMsg.textContent = '';

  if (changelogList) {
    changelogList.innerHTML = '';
    const lines = typeof updateData.changelog === 'string'
      ? updateData.changelog.split('\n').map(s => s.trim()).filter(Boolean)
      : Array.isArray(updateData.changelog) ? updateData.changelog : ['Улучшения стабильности и новые функции'];
    lines.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line.replace(/^[•\-\*]\s*/, '');
      changelogList.appendChild(li);
    });
  }

  if (progressContainer) progressContainer.style.display = 'none';
  if (progressFill) progressFill.style.width = '0%';
  if (progressPct) progressPct.textContent = '0%';
  if (progressLabel) progressLabel.textContent = 'Загрузка обновления...';

  if (btnInstall) {
    btnInstall.disabled = false;
    btnInstall.innerHTML = '<i class="bi bi-download"></i> <span>Обновить</span>';
    btnInstall.onclick = () => {
      if (progressContainer) progressContainer.style.display = 'block';
      btnInstall.disabled = true;
      btnInstall.innerHTML = '<div style="width: 14px; height: 14px; border: 2px solid #000; border-right-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div> <span>Загрузка...</span>';

      if (window.AndroidBridge && typeof window.AndroidBridge.downloadAndInstall === 'function') {
        window.AndroidBridge.downloadAndInstall(updateData.apkUrl);
      } else {
        // Fallback for browser testing
        window.open(updateData.apkUrl, '_blank');
        setTimeout(() => {
          btnInstall.disabled = false;
          btnInstall.innerHTML = '<i class="bi bi-download"></i> <span>Обновить</span>';
        }, 1500);
      }
    };
  }

  const closeModal = () => modal.classList.add('hidden');
  if (btnLater) btnLater.onclick = closeModal;
  if (btnCloseX) btnCloseX.onclick = closeModal;

  modal.classList.remove('hidden');
}

// Global callbacks from native Android download thread (ApkDownloadRunnable / UpdateProgressRunnable)
window.onUpdateDownloadProgress = function(percent) {
  const progressFill = document.getElementById('update-progress-fill');
  const progressPct = document.getElementById('update-progress-pct');
  const progressLabel = document.getElementById('update-progress-label');
  const btnInstall = document.getElementById('btn-update-install');

  if (progressFill) progressFill.style.width = percent + '%';
  if (progressPct) progressPct.textContent = percent + '%';
  if (progressLabel) {
    progressLabel.textContent = percent >= 100 ? 'Открытие установщика пакетов...' : 'Загрузка обновления...';
  }
  if (percent >= 100 && btnInstall) {
    btnInstall.innerHTML = '<i class="bi bi-check-circle-fill"></i> <span>Установка...</span>';
  }
};

window.onUpdateDownloadError = function(errorMsg) {
  console.error('Update download error:', errorMsg);
  const statusMsg = document.getElementById('update-status-msg');
  const btnInstall = document.getElementById('btn-update-install');
  const progressFill = document.getElementById('update-progress-fill');

  if (statusMsg) {
    statusMsg.style.color = '#ff4d4f';
    statusMsg.textContent = 'Ошибка загрузки: ' + (errorMsg || 'сбой сети');
  }
  if (progressFill) progressFill.style.width = '0%';
  if (btnInstall) {
    btnInstall.disabled = false;
    btnInstall.innerHTML = '<i class="bi bi-arrow-repeat"></i> <span>Повторить</span>';
  }
  showToast('Ошибка загрузки обновления');
};

function initAppUpdater() {
  const current = getAppVersionInfo();
  const verLabel = document.getElementById('app-version-label');
  if (verLabel) {
    verLabel.textContent = `v${current.versionName} (Сборка ${current.versionCode})`;
  }

  const btnCheck = document.getElementById('btn-check-update');
  if (btnCheck) {
    btnCheck.addEventListener('click', () => {
      checkForUpdates(true);
    });
  }

  // Automatic background update check with 6h throttle
  setTimeout(() => {
    const lastCheck = parseInt(localStorage.getItem('ym_last_update_check') || '0', 10);
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;
    if (now - lastCheck > sixHours) {
      localStorage.setItem('ym_last_update_check', now.toString());
      checkForUpdates(false);
    }
  }, 3500);
}

// ==========================================
// Home Screen: Personalized New Releases (Новинки и Премьеры)
// ==========================================
let homeReleasesCache = null;
let homeReleasesCacheTime = 0;
const HOME_RELEASES_TTL_MS = 30 * 60 * 1000; // 30 минут
let homeReleasesLoading = false;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadHomeNewReleases(force = false) {
  const container = document.getElementById('vibe-releases-track-list');
  const refreshBtn = document.getElementById('btn-refresh-releases');
  if (!container) return;

  if (homeReleasesLoading) return;

  // Инвалидируем кэш по TTL (30 минут)
  const now = Date.now();
  const cacheExpired = (now - homeReleasesCacheTime) > HOME_RELEASES_TTL_MS;

  if (!force && homeReleasesCache && homeReleasesCache.length > 0 && !cacheExpired) {
    renderHomeReleases(homeReleasesCache);
    return;
  }

  homeReleasesLoading = true;
  if (refreshBtn) refreshBtn.classList.add('spinning');

  // Render Skeleton Placeholders
  container.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="release-card release-card-skeleton">
      <div class="release-cover-wrap skeleton-box"></div>
      <div class="release-meta">
        <div class="skeleton-box" style="height: 14px; width: 85%; margin-bottom: 6px;"></div>
        <div class="skeleton-box" style="height: 11px; width: 60%;"></div>
      </div>
    </div>
  `).join('');

  try {
    const data = await YandexClient.getFeed(state.token);
    const tracks = (data && Array.isArray(data.tracks)) ? data.tracks : [];
    
    if (tracks.length > 0) {
      homeReleasesCache = tracks;
      homeReleasesCacheTime = Date.now(); // Сохраняем время загрузки
      renderHomeReleases(tracks);
    } else {
      container.innerHTML = `
        <div style="padding: 24px 16px; color: var(--text-secondary); font-size: 13px; width: 100%; text-align: center;">
          Новинки формируются на основе вашей коллекции. Включите Мою Волну!
        </div>
      `;
    }
  } catch (err) {
    console.warn("Failed to load new releases:", err);
    if (!homeReleasesCache) {
      container.innerHTML = `
        <div style="padding: 24px 16px; color: var(--text-secondary); font-size: 13px; width: 100%; text-align: center;">
          Не удалось загрузить новинки
        </div>
      `;
    }
  } finally {
    homeReleasesLoading = false;
    if (refreshBtn) refreshBtn.classList.remove('spinning');
  }
}

function renderHomeReleases(tracks) {
  const container = document.getElementById('vibe-releases-track-list');
  if (!container) return;

  container.innerHTML = '';
  tracks.forEach((t, idx) => {
    const card = document.createElement('div');
    card.className = 'release-card';
    card.setAttribute('data-track-id', t.id);

    const coverUrl = t.coverUri || PLACEHOLDER_COVER;
    let shortTag = t.source || 'Новинка';
    if (shortTag.includes(':')) shortTag = shortTag.split(':')[0].trim();
    if (shortTag.length > 15) shortTag = shortTag.slice(0, 14) + '…';
    const tagBadge = shortTag ? `<span class="release-badge-tag">${escapeHtml(shortTag)}</span>` : '';
    const libertyBadge = t.isLiberty ? `<span class="release-liberty-badge">LIBERTY</span>` : '';

    card.innerHTML = `
      <div class="release-cover-wrap">
        <img src="${coverUrl}" class="release-cover-img" loading="lazy" alt="${escapeHtml(t.title)}">
        <div class="release-play-btn"><i class="bi bi-play-fill"></i></div>
        ${tagBadge}
        ${libertyBadge}
      </div>
      <div class="release-meta">
        <div class="release-title" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</div>
        <div class="release-artist" title="${escapeHtml(t.artists)}">${escapeHtml(t.artists)}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      state.queue = [...tracks];
      state.queueIndex = idx;
      state.queueMode = 'feed';
      updatePlaybackContextHeader('НОВИНКИ И ПРЕМЬЕРЫ', t.title);
      playQueueTrack(t);
      showToast(`Играет: ${t.title}`);
    });

    container.appendChild(card);
  });
}

function initHomeNewReleases() {
  const refreshBtn = document.getElementById('btn-refresh-releases');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      loadHomeNewReleases(true);
    });
  }
  loadHomeNewReleases();
}

// ==========================================
// Vibe Ambient Fluid Aura & Visualizer Bands (High-Definition 120Hz)
// ==========================================
let vibeAuraCanvas = null;
let vibeAuraCtx = null;
let vibeAuraWidth = 0;
let vibeAuraHeight = 0;
let vibeAuraAnimFrame = null;
let auraCurrentColors = [
  { r: 0, g: 226, b: 90 },    // Wave green
  { r: 255, g: 213, b: 0 },   // Warm yellow
  { r: 207, g: 0, b: 236 }    // Magenta
];
let auraTargetColors = [
  { r: 0, g: 226, b: 90 },
  { r: 255, g: 213, b: 0 },
  { r: 207, g: 0, b: 236 }
];
let auraCoverRequestSeq = 0;

function initVibeAmbientAura() {
  vibeAuraCanvas = document.getElementById('vibe-ambient-canvas');
  if (!vibeAuraCanvas) return;
  vibeAuraCtx = vibeAuraCanvas.getContext('2d');

  function resizeAura() {
    const parent = vibeAuraCanvas.parentElement || document.getElementById('view-vibe') || document.body;
    const rect = parent.getBoundingClientRect();
    vibeAuraWidth = Math.max(rect.width, window.innerWidth || 360);
    vibeAuraHeight = 580;

    // Crisp native high-definition rendering (clamped to 2.0 for razor-sharp OLED lines)
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    vibeAuraCanvas.width = Math.round(vibeAuraWidth * dpr);
    vibeAuraCanvas.height = Math.round(vibeAuraHeight * dpr);
    if (vibeAuraCtx) {
      vibeAuraCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  window.addEventListener('resize', resizeAura);
  resizeAura();

  startAuraLoop();
}

function updateVibeAmbientAura(coverUrl) {
  if (!coverUrl || coverUrl === PLACEHOLDER_COVER) return;
  const requestSeq = ++auraCoverRequestSeq;
  const ambientWrap = document.getElementById('vibe-ambient-wrap');
  if (ambientWrap) {
    let normalizedCover = String(coverUrl);
    if (normalizedCover.includes('%%')) normalizedCover = normalizedCover.replace('%%', '400x400');
    if (!normalizedCover.startsWith('http')) normalizedCover = `https://${normalizedCover}`;
    ambientWrap.style.setProperty('--vibe-cover-image', `url("${normalizedCover}")`);
    ambientWrap.classList.add('has-cover');
  }
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (requestSeq !== auraCoverRequestSeq) return;
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 16;
        offCanvas.height = 16;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(img, 0, 0, 16, 16);
        const data = offCtx.getImageData(0, 0, 16, 16).data;
        const candidates = [];
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (r * 299 + g * 587 + b * 114) / 1000;
          if (lum > 25 && lum < 235 && sat > 0.15) {
            candidates.push({ r, g, b, sat, lum });
          }
        }
        candidates.sort((a, b) => b.sat - a.sat);
        if (candidates.length >= 3) {
          auraTargetColors[0] = { r: candidates[0].r, g: candidates[0].g, b: candidates[0].b };
          auraTargetColors[1] = { r: candidates[Math.floor(candidates.length / 3)].r, g: candidates[Math.floor(candidates.length / 3)].g, b: candidates[Math.floor(candidates.length / 3)].b };
          auraTargetColors[2] = { r: candidates[Math.floor(candidates.length * 2 / 3)].r, g: candidates[Math.floor(candidates.length * 2 / 3)].g, b: candidates[Math.floor(candidates.length * 2 / 3)].b };
        } else if (candidates.length >= 1) {
          const p = candidates[0];
          auraTargetColors[0] = { r: p.r, g: p.g, b: p.b };
          auraTargetColors[1] = { r: Math.min(255, p.r + 30), g: Math.max(0, p.g - 20), b: Math.min(255, p.b + 60) };
          auraTargetColors[2] = { r: Math.max(0, p.r - 40), g: Math.min(255, p.g + 50), b: Math.min(255, p.b + 20) };
        }
      } catch (e) {
        console.warn('Cannot sample cover color (canvas/CORS):', e);
      }
    };
    img.onerror = (e) => {
      if (requestSeq === auraCoverRequestSeq) {
        console.warn('Cannot load cover for Wave colors:', e);
      }
    };
    // Keep the original direct-image path. Cover sampling worked this way
    // before; sending it through the updater backend added an unnecessary
    // deployment dependency and changed which cache/CORS path WebView uses.
    img.src = coverUrl;
  } catch (e) {
    console.warn('Cannot create cover sampler:', e);
  }
}

function getAudioSpectrumData() {
  let bass = 0;
  let mids = 0;
  let highs = 0;

  if (!vibeAuraAnalyser && eqAudioCtx) ensureVibeAudioAnalysis();
  if (vibeAuraAnalyser && vibeAuraFreqData && state.isPlaying && activePlayer && !activePlayer.paused) {
    vibeAuraAnalyser.getByteFrequencyData(vibeAuraFreqData);
    const count = vibeAuraFreqData.length;
    const bandMean = (from, to) => {
      let total = 0, n = 0;
      for (let i = from; i <= to && i < count; i++) { total += vibeAuraFreqData[i]; n++; }
      return n ? total / n / 255 : 0;
    };
    bass = bandMean(0, 3);
    mids = bandMean(4, 11);
    highs = bandMean(12, 24);
    const level = Math.min(1, bass * 0.56 + mids * 0.29 + highs * 0.15);
    return { bass, mids, highs, pulse: 1.0 + level * 0.32, level };
  }

  if (state.isPlaying && activePlayer && !activePlayer.paused) {
    const fallbackTime = Date.now() * 0.0024;
    const fallbackBass = (0.5 + 0.5 * Math.sin(fallbackTime * 1.7)) * 0.18;
    const fallbackMids = (0.5 + 0.5 * Math.cos(fallbackTime * 2.3)) * 0.12;
    return {
      bass: fallbackBass,
      mids: fallbackMids,
      highs: 0.08,
      pulse: 1.0 + fallbackBass * 0.22,
      level: fallbackBass
    };
  }

  const t = Date.now() * 0.0012;
  return {
    bass: 0.04,
    mids: 0.04,
    highs: 0.04,
    pulse: 1.0 + Math.sin(t) * 0.018,
    level: 0
  };
}

function auraViewIsActive() {
  const vibeView = document.getElementById('view-vibe');
  return !!(vibeView && vibeView.classList.contains('active'));
}

function startAuraLoop() {
  if (vibeAuraAnimFrame) return;
  vibeAuraAnimFrame = requestAnimationFrame(renderAuraFrame);
}

function renderAuraFrame() {
  // Soft, flowing color haze; unlike the old visualizer this draws no hard rings or ribbons.
  vibeAuraAnimFrame = 0;
  if (!vibeAuraCtx || !auraViewIsActive()) return;
  vibeAuraAnimFrame = requestAnimationFrame(renderAuraFrame);

  const now = Date.now();
  const audio = getAudioSpectrumData();
  for (let i = 0; i < 3; i++) {
    auraCurrentColors[i].r += (auraTargetColors[i].r - auraCurrentColors[i].r) * 0.035;
    auraCurrentColors[i].g += (auraTargetColors[i].g - auraCurrentColors[i].g) * 0.035;
    auraCurrentColors[i].b += (auraTargetColors[i].b - auraCurrentColors[i].b) * 0.035;
  }

  const ctx = vibeAuraCtx;
  ctx.clearRect(0, 0, vibeAuraWidth, vibeAuraHeight);
  const hero = document.querySelector('.vibe-hero');
  const heroRect = hero?.getBoundingClientRect();
  const canvasRect = vibeAuraCanvas.getBoundingClientRect();
  const cx = vibeAuraWidth * 0.5;
  const cy = heroRect ? heroRect.top - canvasRect.top + heroRect.height * 0.57 : vibeAuraHeight * 0.42;
  const radius = Math.min(vibeAuraWidth * 0.72, vibeAuraHeight * 0.68) * audio.pulse;
  const phase = now * 0.00012;
  const pools = [
    { dx: 0, dy: 0, sx: 1.08, sy: 0.82, color: 1, opacity: 0.77, phase: 0 },
    { dx: -0.32, dy: -0.06, sx: 0.8, sy: 1.0, color: 2, opacity: 0.58, phase: 2.1 },
    { dx: 0.32, dy: 0.04, sx: 0.86, sy: 0.76, color: 0, opacity: 0.56, phase: 4.0 }
  ];

  ctx.globalCompositeOperation = 'screen';
  pools.forEach((pool) => {
    const color = auraCurrentColors[pool.color];
    const x = cx + pool.dx * vibeAuraWidth * 0.38 + Math.sin(phase + pool.phase + audio.mids * 2) * vibeAuraWidth * (0.025 + audio.mids * 0.035);
    const y = cy + pool.dy * vibeAuraHeight + Math.cos(phase * 0.8 + pool.phase + audio.highs) * vibeAuraHeight * (0.02 + audio.highs * 0.025);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(phase + pool.phase) * 0.12);
    ctx.scale(pool.sx, pool.sy);
    const gradient = ctx.createRadialGradient(0, 0, radius * 0.025, 0, 0, radius);
    const rgb = Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b);
    const reactiveOpacity = pool.opacity * (0.78 + audio.level * 0.55);
    gradient.addColorStop(0, 'rgba(' + rgb + ',' + reactiveOpacity + ')');
    gradient.addColorStop(0.22, 'rgba(' + rgb + ',' + (reactiveOpacity * 0.72) + ')');
    gradient.addColorStop(0.5, 'rgba(' + rgb + ',' + (reactiveOpacity * 0.28) + ')');
    gradient.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.globalCompositeOperation = 'source-over';
}

// ==========================================
// 120Hz Gesture Engine (Full Player, Mini Player, Artist & Album)
// ==========================================
function initSwipeGestures() {
  const fullPlayer = dom.fullPlayer;
  const miniPlayer = dom.miniPlayer;

  // 1. Full Player Gestures (Silky 120Hz Drag Down to Close + Cover Swipe)
  if (fullPlayer) {
    let startX = 0, startY = 0, startTime = 0;
    let isSwiping = false;
    let swipeDirection = null; // 'v' or 'h'

    fullPlayer.addEventListener('touchstart', (e) => {
      if (e.target.closest('#progress-slider') || e.target.closest('.full-controls') || e.target.closest('#btn-track-menu') || e.target.closest('#full-lyrics')) {
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      isSwiping = true;
      swipeDirection = null;
    }, { passive: true });

    fullPlayer.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (!swipeDirection) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          swipeDirection = 'v';
        } else if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          swipeDirection = 'h';
        }
      }

      // Drag down to close (120Hz smooth tracking)
      if (swipeDirection === 'v') {
        if (dy > 0) {
          const dampedY = Math.pow(dy, 0.96);
          fullPlayer.style.transition = 'none';
          fullPlayer.style.transform = `translate3d(0, ${dampedY}px, 0)`;
          fullPlayer.style.opacity = Math.max(0.65, 1 - (dampedY / (window.innerHeight || 800)) * 0.45);
        }
      }
      // Horizontal swipe over cover
      else if (swipeDirection === 'h' && dom.fullCover) {
        dom.fullCover.style.transition = 'none';
        dom.fullCover.style.transform = `translate3d(${dx * 0.75}px, 0, 0) scale(${Math.max(0.88, 1 - Math.abs(dx) / 1200)})`;
        dom.fullCover.style.opacity = Math.max(0.4, 1 - Math.abs(dx) / 380);
      }
    }, { passive: true });

    const endHandler = (e) => {
      if (!isSwiping) return;
      isSwiping = false;
      const dx = (e.changedTouches ? e.changedTouches[0].clientX : 0) - startX;
      const dy = (e.changedTouches ? e.changedTouches[0].clientY : 0) - startY;
      const duration = Math.max(Date.now() - startTime, 1);
      const velocityY = dy / duration;
      const velocityX = dx / duration;

      if (swipeDirection === 'v') {
        if (dy > 110 || (dy > 40 && velocityY > 0.35)) {
          // Smooth 120Hz dismiss
          fullPlayer.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.38s ease';
          fullPlayer.style.transform = 'translate3d(0, 100%, 0)';
          fullPlayer.style.opacity = '0';
          setTimeout(() => {
            fullPlayer.classList.add('translateY-100');
            fullPlayer.style.transform = '';
            fullPlayer.style.transition = '';
            fullPlayer.style.opacity = '';
          }, 380);
          if (navigator.vibrate) navigator.vibrate(10);
        } else {
          // Smooth 120Hz snap back
          fullPlayer.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.32s ease';
          fullPlayer.style.transform = 'translate3d(0, 0, 0)';
          fullPlayer.style.opacity = '1';
          setTimeout(() => {
            fullPlayer.style.transform = '';
            fullPlayer.style.transition = '';
            fullPlayer.style.opacity = '';
          }, 320);
        }
      } else if (swipeDirection === 'h') {
        if (dom.fullCover) {
          if (dx < -60 || (dx < -25 && velocityX < -0.3)) {
            // Next track
            dom.fullCover.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease';
            dom.fullCover.style.transform = 'translate3d(-100px, 0, 0) scale(0.85)';
            dom.fullCover.style.opacity = '0';
            playNext();
            setTimeout(() => {
              dom.fullCover.style.transition = 'none';
              dom.fullCover.style.transform = 'translate3d(80px, 0, 0) scale(0.9)';
              dom.fullCover.style.opacity = '0';
              requestAnimationFrame(() => {
                dom.fullCover.style.transition = 'transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.34s ease';
                dom.fullCover.style.transform = 'translate3d(0, 0, 0) scale(1)';
                dom.fullCover.style.opacity = '1';
              });
            }, 180);
            if (navigator.vibrate) navigator.vibrate(15);
          } else if (dx > 60 || (dx > 25 && velocityX > 0.3)) {
            // Prev track
            dom.fullCover.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease';
            dom.fullCover.style.transform = 'translate3d(100px, 0, 0) scale(0.85)';
            dom.fullCover.style.opacity = '0';
            playPrev();
            setTimeout(() => {
              dom.fullCover.style.transition = 'none';
              dom.fullCover.style.transform = 'translate3d(-80px, 0, 0) scale(0.9)';
              dom.fullCover.style.opacity = '0';
              requestAnimationFrame(() => {
                dom.fullCover.style.transition = 'transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.34s ease';
                dom.fullCover.style.transform = 'translate3d(0, 0, 0) scale(1)';
                dom.fullCover.style.opacity = '1';
              });
            }, 180);
            if (navigator.vibrate) navigator.vibrate(15);
          } else {
            dom.fullCover.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';
            dom.fullCover.style.transform = 'translate3d(0, 0, 0) scale(1)';
            dom.fullCover.style.opacity = '1';
          }
        }
      }
      swipeDirection = null;
    };

    fullPlayer.addEventListener('touchend', endHandler, { passive: true });
    fullPlayer.addEventListener('touchcancel', endHandler, { passive: true });
  }

  // 2. Mini Player Gestures (Interactive 120Hz Slide + Swipe Up to Open)
  if (miniPlayer) {
    let mStartX = 0, mStartY = 0, mStartTime = 0;
    let mIsDragging = false;
    const miniContent = miniPlayer.querySelector('.mini-player-content') || miniPlayer;

    miniPlayer.addEventListener('touchstart', (e) => {
      if (e.target.closest('.mini-controls')) return;
      mStartX = e.touches[0].clientX;
      mStartY = e.touches[0].clientY;
      mStartTime = Date.now();
      mIsDragging = true;
    }, { passive: true });

    miniPlayer.addEventListener('touchmove', (e) => {
      if (!mIsDragging) return;
      const mDx = e.touches[0].clientX - mStartX;
      const mDy = e.touches[0].clientY - mStartY;

      if (Math.abs(mDx) > Math.abs(mDy) && Math.abs(mDx) > 8) {
        miniContent.style.transition = 'none';
        miniContent.style.transform = `translate3d(${mDx * 0.85}px, 0, 0)`;
        miniContent.style.opacity = Math.max(0.35, 1 - Math.abs(mDx) / 260);
      }
    }, { passive: true });

    const miniEndHandler = (e) => {
      if (!mIsDragging) return;
      mIsDragging = false;
      const mDx = (e.changedTouches ? e.changedTouches[0].clientX : 0) - mStartX;
      const mDy = (e.changedTouches ? e.changedTouches[0].clientY : 0) - mStartY;
      const duration = Math.max(Date.now() - mStartTime, 1);
      const velocityX = mDx / duration;

      if (mDy < -45 && Math.abs(mDy) > Math.abs(mDx)) {
        // Swipe Up -> Open Full Player smoothly
        miniContent.style.transform = '';
        miniContent.style.opacity = '';
        dom.fullPlayer.classList.remove('translateY-100');
        if (navigator.vibrate) navigator.vibrate(10);
      } else if (Math.abs(mDx) > 45 || (Math.abs(mDx) > 20 && Math.abs(velocityX) > 0.3)) {
        if (mDx < 0) {
          // Slide out left -> Next Track
          miniContent.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease';
          miniContent.style.transform = 'translate3d(-100%, 0, 0)';
          miniContent.style.opacity = '0';
          playNext();
          setTimeout(() => {
            miniContent.style.transition = 'none';
            miniContent.style.transform = 'translate3d(60px, 0, 0)';
            miniContent.style.opacity = '0';
            requestAnimationFrame(() => {
              miniContent.style.transition = 'transform 0.30s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.30s ease';
              miniContent.style.transform = 'translate3d(0, 0, 0)';
              miniContent.style.opacity = '1';
            });
          }, 160);
        } else {
          // Slide out right -> Prev Track
          miniContent.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease';
          miniContent.style.transform = 'translate3d(100%, 0, 0)';
          miniContent.style.opacity = '0';
          playPrev();
          setTimeout(() => {
            miniContent.style.transition = 'none';
            miniContent.style.transform = 'translate3d(-60px, 0, 0)';
            miniContent.style.opacity = '0';
            requestAnimationFrame(() => {
              miniContent.style.transition = 'transform 0.30s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.30s ease';
              miniContent.style.transform = 'translate3d(0, 0, 0)';
              miniContent.style.opacity = '1';
            });
          }, 160);
        }
        if (navigator.vibrate) navigator.vibrate(15);
      } else {
        // Snap back
        miniContent.style.transition = 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.26s ease';
        miniContent.style.transform = 'translate3d(0, 0, 0)';
        miniContent.style.opacity = '1';
      }
    };

    miniPlayer.addEventListener('touchend', miniEndHandler, { passive: true });
    miniPlayer.addEventListener('touchcancel', miniEndHandler, { passive: true });
  }

  // 3. Artist & Album Views Gestures (Smooth 120Hz Swipe Right to Back)
  ['view-artist', 'view-album', 'view-search'].forEach((viewId) => {
    const viewEl = document.getElementById(viewId);
    if (!viewEl) return;

    let vStartX = 0, vStartY = 0, vStartTime = 0;
    let vIsSwiping = false;

    viewEl.addEventListener('touchstart', (e) => {
      vStartX = e.touches[0].clientX;
      vStartY = e.touches[0].clientY;
      vStartTime = Date.now();
      vIsSwiping = false;
    }, { passive: true });

    viewEl.addEventListener('touchmove', (e) => {
      const vDx = e.touches[0].clientX - vStartX;
      const vDy = e.touches[0].clientY - vStartY;

      if (!vIsSwiping) {
        // Trigger swipe back if moving right and horizontal dominance
        if (vDx > 12 && Math.abs(vDx) > Math.abs(vDy) * 1.3) {
          vIsSwiping = true;
        }
      }

      if (vIsSwiping && vDx > 0) {
        viewEl.style.transition = 'none';
        viewEl.style.transform = `translate3d(${vDx}px, 0, 0)`;
        viewEl.style.boxShadow = '-12px 0 35px rgba(0,0,0,0.6)';
      }
    }, { passive: true });

    const vEndHandler = (e) => {
      if (!vIsSwiping) return;
      vIsSwiping = false;
      const vDx = (e.changedTouches ? e.changedTouches[0].clientX : 0) - vStartX;
      const duration = Math.max(Date.now() - vStartTime, 1);
      const velocityX = vDx / duration;

      if (vDx > 85 || (vDx > 35 && velocityX > 0.35)) {
        // Smoothly dismiss to the right and navigate back
        viewEl.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
        viewEl.style.transform = 'translate3d(100%, 0, 0)';
        setTimeout(() => {
          navigateBack();
          viewEl.style.transform = '';
          viewEl.style.transition = '';
          viewEl.style.boxShadow = '';
        }, 280);
        if (navigator.vibrate) navigator.vibrate(10);
      } else {
        // Snap back
        viewEl.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        viewEl.style.transform = 'translate3d(0, 0, 0)';
        setTimeout(() => {
          viewEl.style.transform = '';
          viewEl.style.transition = '';
          viewEl.style.boxShadow = '';
        }, 250);
      }
    };

    viewEl.addEventListener('touchend', vEndHandler, { passive: true });
    viewEl.addEventListener('touchcancel', vEndHandler, { passive: true });
  });
}

// Initialize on DOM load and user interaction
document.addEventListener('DOMContentLoaded', () => {
  // Global Search Triggers (Spotify & Yandex Music style in top-right)
  const handleOpenSearch = () => {
    navigateToView('view-search');
    dom.navBtns.forEach(b => b.classList.remove('active'));
    setTimeout(() => {
      const input = document.getElementById('search-input');
      if (input) input.focus();
    }, 120);
  };
  const btnVibeSearch = document.getElementById('btn-vibe-search');
  if (btnVibeSearch) btnVibeSearch.addEventListener('click', handleOpenSearch);
  const btnLibSearch = document.getElementById('btn-library-search');
  if (btnLibSearch) btnLibSearch.addEventListener('click', handleOpenSearch);

  // Search Back Button -> Return to previous view
  const btnCloseSearch = document.getElementById('btn-close-search');
  if (btnCloseSearch) {
    btnCloseSearch.addEventListener('click', () => {
      navigateBack();
    });
  }


  initVibeMoodChips();
  updateWaveStatsDisplay();
  initEqualizerAndQualityUI();
  initAppUpdater();
  initHomeNewReleases();
  initVibeAmbientAura();
  initSwipeGestures();
});

// Also initialize immediately in case DOM is already ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initVibeMoodChips();
  updateWaveStatsDisplay();
  initEqualizerAndQualityUI();
  initAppUpdater();
  initHomeNewReleases();
  initVibeAmbientAura();
  initSwipeGestures();
}

// Lazy audio context unlock on first user click/touch
const unlockAudioCtx = () => {
  if (localStorage.getItem('ym_eq_enabled') === 'true') {
    initEqualizerAudioNode();
    applyEqualizerSettings();
  }
  window.removeEventListener('click', unlockAudioCtx);
  window.removeEventListener('touchstart', unlockAudioCtx);
};
window.addEventListener('click', unlockAudioCtx, { once: true });
window.addEventListener('touchstart', unlockAudioCtx, { once: true });

