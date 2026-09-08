// Global window.alert override (replace ancient Android dialogs with modern in-app glass toast)
window.alert = function(msg) {
  if (typeof showToast === 'function') {
    showToast(String(msg), 'bi-exclamation-circle');
  } else {
    console.warn('[Alert]:', msg);
  }
};

// --- DOM Elements ---
const dom = {
  views: document.querySelectorAll('.view'),
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
playerA.addEventListener('play', ensureAudioContextResumed);
playerB.addEventListener('play', ensureAudioContextResumed);

let activePlayer = playerA;
let preloadPlayer = playerB;

Object.defineProperty(dom, 'audioPlayer', {
  get: () => activePlayer,
  set: (val) => { activePlayer = val; },
  configurable: true,
  enumerable: true
});

// --- State ---
const state = {
  token: localStorage.getItem('ym_token') || '',
  user: null,
  tracks: [], // Library tracks
  queue: [], // Current play queue
  queueIndex: 0,
  queueMode: 'library', // 'library', 'vibe', 'playlist', 'album', 'artist'
  currentStation: 'user:onyourwave',
  playbackContext: { subtitle: 'ИГРАЕТ ИЗ ВОЛНЫ', title: 'Моя Волна' },
  vibeBatchId: null, // For fetching next vibe tracks
  currentTrack: null,
  isPlaying: false
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
  });
});

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

let toastTimeout = null;
function showToast(text) {
  const toast = document.getElementById('global-toast');
  const toastText = document.getElementById('global-toast-text');
  if (!toast) return;
  if (toastText) toastText.textContent = text;
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

function renderTracks() {
  dom.likesCount.textContent = `${state.tracks.length} треков`;
  dom.tracksList.innerHTML = '';
  
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
  
  if (state.tracks.length === 0) {
    dom.tracksList.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-music-note-beamed"></i>
        <p>Нет загруженных треков</p>
      </div>`;
    return;
  }
  
  state.tracks.forEach(track => {
    if (!track) return;
    
    const div = document.createElement('div');
    div.className = 'track-item';
    
    const artist = track.artists || 'Unknown Artist';
    let coverUrl = track.coverUri || '/favicon.png';
    if (coverUrl.includes('%%')) coverUrl = `https://${coverUrl.replace('%%', '200x200')}`;
    if (!coverUrl.startsWith('http') && coverUrl !== '/favicon.png') {
      coverUrl = `https://${coverUrl}`;
    }
    const isExplicit = track.explicit || track.contentWarning === 'explicit';
    const badgeHtml = track.isLiberty ? `<span class="liberty-badge"><i class="bi bi-gem"></i></span>` : (isExplicit ? `<span class="explicit-badge">E</span>` : '');
    div._trackData = track;
    div.innerHTML = `
      <img src="${coverUrl}" loading="lazy" alt="cover">
      <div class="track-info">
        <div class="track-title"><span class="track-title-text">${track.title}</span>${badgeHtml}</div>
        <div class="track-artist">${artist}</div>
      </div>
      <i class="bi bi-three-dots track-dots" style="color: var(--text-secondary);"></i>
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

async function sendFeedback(type, trackId, duration) {
  if (state.queueMode !== 'vibe' || !state.vibeBatchId || !trackId) return;
  try {
    const playSec = duration !== undefined ? duration : (Math.floor(activePlayer.currentTime) || 0);
    await YandexClient.sendFeedback(
      type,
      trackId,
      state.vibeBatchId,
      playSec,
      state.token,
      state.currentStation || 'user:onyourwave'
    );
  } catch(e) {
    console.error("Feedback error", e);
  }
}

// Stream Cache & Gapless Audio Preloader
const streamCache = new Map(); // id -> Promise<{ streamUrl, ... }>
let preloadedTrack = null;     // { id, streamUrl, ... }
let preloadPromise = null;

async function fetchTrackStream(id) {
  const idStr = String(id);
  if (streamCache.has(idStr)) {
    return streamCache.get(idStr);
  }
  const p = YandexClient.getStreamUrl(idStr, state.token);
  streamCache.set(idStr, p);
  try {
    return await p;
  } catch(e) {
    streamCache.delete(idStr);
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

    let coverUrl = nextTrack.coverUri || nextTrack.cover || '/favicon.png';
    if (coverUrl.includes('%%')) coverUrl = `https://${coverUrl.replace('%%', '400x400')}`;
    if (!coverUrl.startsWith('http') && coverUrl !== '/favicon.png') {
      coverUrl = `https://${coverUrl}`;
    }
    const explicit = nextTrack.explicit || nextTrack.contentWarning === 'explicit';
    const artistId = nextTrack.artistId ||
                     nextTrack.artists?.[0]?.id ||
                     nextTrack.track?.artists?.[0]?.id ||
                     (Array.isArray(nextTrack.artists) ? nextTrack.artists[0]?.id : null);

    if (coverUrl && coverUrl !== '/favicon.png') {
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

  // Advance queue & stats
  if (state.queueMode === 'vibe') {
    state.queueIndex++;
    if (state.queueIndex >= state.queue.length) {
      fetchMoreVibeTracks().catch(() => {});
    }
    if (nextTrackInfo) {
      state.vibeHistory = state.vibeHistory || new Set();
      state.vibeHistory.add(String(nextTrackInfo.id));
      if (typeof saveVibeHistory === 'function') saveVibeHistory();
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

  if (state.queueMode === 'vibe' && isUserSkip) {
    sendFeedback('skip', state.queue[state.queueIndex]?.id, Math.floor(activePlayer.currentTime || 0));
  }
  
  if (state.isRepeat) {
    activePlayer.currentTime = 0;
    activePlayer.play();
    return;
  }
  
  if (state.queueMode === 'vibe') {
    state.queueIndex++;
    if (state.queueIndex >= state.queue.length) {
      await fetchMoreVibeTracks();
      if (state.queueIndex >= state.queue.length) {
        // Fallback: fetch a fresh batch directly to ensure continuous playback without repeating track 0
        try {
          const freshData = await YandexClient.getVibe(state.token, null, state.currentStation || 'user:onyourwave');
          if (freshData && freshData.tracks && freshData.tracks.length > 0) {
            state.queue = state.queue.concat(freshData.tracks);
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
  
  let coverUrl = track.coverUri || '/favicon.png';
  if (coverUrl.includes('%%')) coverUrl = `https://${coverUrl.replace('%%', '400x400')}`;
  if (!coverUrl.startsWith('http') && coverUrl !== '/favicon.png') {
    coverUrl = `https://${coverUrl}`;
  }
  
  const explicit = track.explicit || track.contentWarning === 'explicit';
  
  if (state.queueMode === 'vibe') {
    state.vibeHistory = state.vibeHistory || new Set();
    state.vibeHistory.add(String(track.id));
    if (state.vibeHistory.size > 1000) {
      const iter = state.vibeHistory.values();
      state.vibeHistory.delete(iter.next().value);
    }
    if (typeof saveVibeHistory === 'function') saveVibeHistory();
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
  resetCrossfadeState();
  const idStr = String(id);
  const trackInfo = { id: idStr, title, artist, cover, explicit, isLiberty, artistId, track: rawTrack };
  updateTrackUI(trackInfo);
  
  // Set Loading State
  state.isPlaying = false;
  updatePlayButtons();
  
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
      activePlayer.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
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
      if (!cover.startsWith('http') && cover && cover !== '/favicon.png') cover = `https://${cover}`;

      window.AndroidBridge.updateMedia(curTitle, curArtist, playing, posMs, durMs, cover);
    } catch (e) {
      console.warn("AndroidBridge updateMedia error:", e);
    }
  }
}

window.handleMediaAction = function(action) {
  console.log("Native media action:", action);
  if (action === 'play_pause') {
    handlePlayToggle();
  } else if (action === 'play') {
    if (!state.isPlaying) handlePlayToggle();
  } else if (action === 'pause') {
    try {
      activePlayer.pause();
      playerA.pause();
      playerB.pause();
    } catch(e) {}
    state.isPlaying = false;
    updatePlayButtons();
  } else if (action === 'next') {
    playNext();
  } else if (action === 'prev') {
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

function updateMediaSession(trackInfo) {
  if (trackInfo) {
    syncNativeMedia(trackInfo.title, trackInfo.artist, state.isPlaying, (activePlayer.currentTime || 0) * 1000, (activePlayer.duration || 0) * 1000, trackInfo.cover);
  }
  if (!('mediaSession' in navigator) || !trackInfo) return;
  try {
    let coverUrl = trackInfo.cover || '/favicon.png';
    if (coverUrl.includes('100x100')) coverUrl = coverUrl.replace('100x100', '400x400');
    if (!coverUrl.startsWith('http') && coverUrl !== '/favicon.png') coverUrl = `https://${coverUrl}`;

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

function savePlaybackState(force = false) {
  if (!state.currentTrack || !state.currentTrack.id) return;
  const now = Date.now();
  if (!force && now - lastSavedStateTime < 1500) return;
  lastSavedStateTime = now;

  try {
    const activeMood = localStorage.getItem('ym_active_vibe_mood') || (typeof getWaveStats === 'function' ? getWaveStats().mood : null);
    const dataToSave = {
      track: state.currentTrack,
      currentTime: activePlayer ? (activePlayer.currentTime || 0) : 0,
      duration: activePlayer ? (activePlayer.duration || 0) : 0,
      queue: state.queue || [],
      queueIndex: state.queueIndex || 0,
      queueMode: state.queueMode || 'library',
      currentStation: state.currentStation || 'user:onyourwave',
      playbackContext: state.playbackContext || null,
      vibeMood: activeMood,
      isShuffle: !!state.isShuffle,
      isRepeat: !!state.isRepeat,
      timestamp: now
    };
    localStorage.setItem('ym_last_session', JSON.stringify(dataToSave));
  } catch (e) {}
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
  dom.miniTitle.innerHTML = `<span class="track-title-text">${trackInfo.title}</span>${badgeHtml}`;
  dom.miniArtist.textContent = trackInfo.artist;
  dom.miniCover.src = trackInfo.cover;
  
  dom.fullTitle.innerHTML = `<span class="track-title-text">${trackInfo.title}</span>${badgeHtml}`;
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
  if (dom.progressSlider) dom.progressSlider.value = 0;
  if (dom.miniProgress) dom.miniProgress.style.width = '0%';
  if (dom.timeCurrent) dom.timeCurrent.textContent = "0:00";
  if (dom.timeTotal) dom.timeTotal.textContent = "0:00";
  
  if (dom.toggleDynamicBg.checked) {
    dom.dynamicBg.style.backgroundImage = `url(${trackInfo.cover})`;
  }
  
  const blobs = document.querySelectorAll('.blob');
  blobs.forEach(blob => {
    blob.style.backgroundImage = `url(${trackInfo.cover})`;
  });

  // Dynamic Full Player Colorful Cover Backdrop
  const fullPlayerBg = document.getElementById('full-player-bg');
  if (fullPlayerBg && trackInfo.cover) {
    let coverHigh = trackInfo.cover;
    if (coverHigh.includes('%%')) coverHigh = coverHigh.replace('%%', '400x400');
    if (coverHigh.includes('100x100')) coverHigh = coverHigh.replace('100x100', '400x400');
    if (!coverHigh.startsWith('http') && coverHigh && coverHigh !== '/favicon.png') {
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
}

// Like Button Logic
dom.btnLike = document.getElementById('btn-like');
if (dom.btnLike) {
  dom.btnLike.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!state.currentTrack || !state.currentTrack.id || !state.token) return;
    
    const trackId = String(state.currentTrack.id);
    const isLiked = state.likedTrackIds.has(trackId);
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
        coverUri: state.currentTrack.cover || '/favicon.png',
        explicit: state.currentTrack.explicit,
        isLiberty: state.currentTrack.isLiberty,
        artistId: state.currentTrack.artistId,
        track: state.currentTrack.track || state.currentTrack
      });
      renderTracks();
    }
    
    try {
      await YandexClient.like(trackId, action, state.token);
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

function updatePlayButtons() {
    const icon = state.isPlaying ? 'bi-pause-fill' : 'bi-play-fill';
    dom.miniBtnPlay.innerHTML = `<i class="bi ${icon}"></i>`;
    dom.fullBtnPlay.innerHTML = `<i class="bi ${icon}"></i>`;
    dom.vibePlayBtn.innerHTML = `<i class="bi ${icon}"></i>`;

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
      sendFeedback('trackFinished', state.queue[state.queueIndex]?.id, durSec);
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

function updateProgress() {
  if (state.isPlaying && activePlayer && activePlayer.duration && !isNaN(activePlayer.duration)) {
    checkAndTriggerCrossfade();
    const current = activePlayer.currentTime || 0;
    const duration = activePlayer.duration;
    const percent = (current / duration) * 100;
    
    if (dom.progressSlider && !state.isDraggingSlider) {
      dom.progressSlider.value = percent;
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
    savePlaybackState();
  }
  requestAnimationFrame(updateProgress);
}
requestAnimationFrame(updateProgress);

// Seeking logic
if (dom.progressSlider) {
  dom.progressSlider.addEventListener('input', (e) => {
    state.isDraggingSlider = true;
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
    // Only avoid the most recent 30 tracks so we do not exhaust recommendations
    const recentHistory = new Set(Array.from(state.vibeHistory || []).slice(-30));
    let freshTracks = tracks.filter(t => !recentHistory.has(String(t.id)));
    if (freshTracks.length === 0) {
      freshTracks = tracks;
    }
    
    if (freshTracks.length > 0) {
      state.queueMode = 'vibe';
      state.vibeBatchId = data.batchId;
      state.queue = freshTracks;
      state.queueIndex = 0;
      
      const firstTrack = state.queue[0];
      sendFeedback('radioStarted', firstTrack.id, 0);
      playQueueTrack(firstTrack);

      // Pre-fill queue with next tracks in background
      setTimeout(() => {
        fetchMoreVibeTracks().catch(() => {});
      }, 1200);
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
  try {
    const station = state.currentStation || 'user:onyourwave';
    // Use the track that actually played/is playing (registered with Rotor feedback)
    const currentTr = state.currentTrack || state.queue[state.queueIndex];
    const trackForQueue = currentTr ? currentTr.id : null;
    let data = await YandexClient.getVibe(state.token, trackForQueue, station);
    
    const existingIds = new Set(state.queue.map(t => String(t.id)));
    let freshTracks = (data && data.tracks ? data.tracks : []).filter(t => !existingIds.has(String(t.id)));
    
    // If Rotor returned duplicates, request fresh recommendation batch without queue
    if (freshTracks.length === 0) {
      data = await YandexClient.getVibe(state.token, null, station);
      freshTracks = (data && data.tracks ? data.tracks : []).filter(t => !existingIds.has(String(t.id)));
    }

    // If still empty, filter against recently played tracks (avoid last 15)
    if (freshTracks.length === 0 && data && data.tracks && data.tracks.length > 0) {
      const recentPlayed = new Set(state.queue.slice(Math.max(0, state.queueIndex - 15), state.queueIndex + 1).map(t => String(t.id)));
      freshTracks = data.tracks.filter(t => !recentPlayed.has(String(t.id)));
    }
    
    if (data && data.batchId) state.vibeBatchId = data.batchId;
    
    if (freshTracks.length > 0) {
      state.queue = state.queue.concat(freshTracks);
      // Prune played tracks far in the past to avoid unbounded queue growth
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

  activePlayer.pause();
  state.queueMode = 'vibe';
  state.currentStation = 'track:' + trackId;
  updatePlaybackContextHeader('ВОЛНА ПО ТРЕКУ', trackTitle);
  showToast(`Запущена Волна по треку: ${trackTitle}`);

  try {
    const data = await YandexClient.getVibe(state.token, null, state.currentStation);
    if (data.shadowbanned) {
      showToast('Яндекс вернул пустую Волну');
    }

    state.vibeBatchId = data.batchId || null;

    let coverUrl = seedTrack.coverUri || rawTrack.coverUri || '';
    if (coverUrl.includes('%%')) coverUrl = `https://${coverUrl.replace('%%', '400x400')}`;
    if (!coverUrl) coverUrl = '/favicon.png';

    const isExplicit = Boolean(seedTrack.explicit || rawTrack.explicit || rawTrack.contentWarning === 'explicit');
    const isLiberty = Boolean(seedTrack.isLiberty || rawTrack.isLiberty);

    const initialTrack = {
      id: trackId,
      title: trackTitle,
      artists: artistName,
      coverUri: coverUrl,
      explicit: isExplicit,
      isLiberty: isLiberty,
      track: rawTrack
    };

    let waveTracks = (data.tracks || []).filter(t => String(t.id) !== trackId);
    state.queue = [initialTrack, ...waveTracks];
    state.queueIndex = 0;

    sendFeedback('radioStarted', trackId, 0);
    playQueueTrack(initialTrack);
  } catch (err) {
    console.error('Error starting track wave:', err);
    showToast('Ошибка запуска Волны по треку');
    state.queue = [seedTrack];
    state.queueIndex = 0;
    playQueueTrack(seedTrack);
  }
}

// UI Play Toggles
function handlePlayToggle(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (!state.currentTrack) return;
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
        <img src="${a.coverUri || '/favicon.png'}" alt="cover" style="border-radius: 50%;">
        <div class="track-info">
          <div class="track-title">${a.name}</div>
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
      div.innerHTML = `
        <img src="${t.coverUri || '/favicon.png'}" loading="lazy" alt="cover">
        <div class="track-info">
          <div class="track-title"><span class="track-title-text">${t.title}</span>${badgeHtml}</div>
          <div class="track-artist">${t.artists}</div>
        </div>
        <i class="bi bi-play-fill" style="color: var(--text-secondary); font-size: 20px;"></i>
      `;
      
      div.addEventListener('click', () => {
        state.queueMode = 'library';
        state.queue = tracks.map(tr => tr.track);
        state.queueIndex = tracks.findIndex(tr => tr.id === t.id);
        playTrack(t.id, t.title, t.artists, t.coverUri || '/favicon.png');
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
  albumPageCover.src = coverUri || '/favicon.png';
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
        <img src="${t.coverUri || '/favicon.png'}" loading="lazy" alt="cover">
        <div class="track-info">
          <div class="track-title"><span class="track-title-text">${t.title}</span>${badgeHtml}</div>
          <div class="track-artist">${t.artists}</div>
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
  playlistPageCover.src = '/favicon.png';
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
        <img src="${t.coverUri || '/favicon.png'}" alt="cover">
        <div class="track-info">
          <div class="track-title"><span class="track-title-text">${t.title}</span>${badgeHtml}</div>
          <div class="track-artist">${t.artists}</div>
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
            <img src="${al.coverUri || '/favicon.png'}" style="width:120px; height:120px; border-radius:8px; object-fit:cover; margin-bottom:8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size:12px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;" title="${al.title}">${al.title}</div>
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
        <img src="${t.coverUri || '/favicon.png'}" alt="cover">
        <div class="track-info">
          <div class="track-title"><span class="track-title-text">${t.title}</span>${badgeHtml}</div>
          <div class="track-artist">${t.artists}</div>
        </div>
        <i class="bi bi-three-dots track-dots" style="color: var(--text-secondary);"></i>
      `;

      div.addEventListener('click', (e) => {
        if (e.target.classList.contains('track-dots') || e.target.closest('.track-dots')) return;
        state.queueMode = 'artist';
        updatePlaybackContextHeader('ТРЕКИ АРТИСТА', artistPageName.textContent || 'Артист');
        state.queue = currentArtistTracks.map(tr => ({ ...(tr.track || {}), id: tr.id, title: tr.title, isLiberty: tr.isLiberty, explicit: tr.explicit, artists: tr.artists, coverUri: tr.coverUri }));
        state.queueIndex = i;
        playTrack(t.id, t.title, t.artists, t.coverUri || '/favicon.png', t.explicit, t.isLiberty);
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
      playTrack(t.id, t.title, t.artists, t.coverUri || '/favicon.png', t.explicit, t.isLiberty);
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
dom.colorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.documentElement.style.setProperty('--accent-color', btn.getAttribute('data-color'));
  });
});

// --- Init ---
dom.fullPlayer.classList.add('translateY-100');
document.querySelectorAll('.blob').forEach(b => b.style.animationPlayState = 'paused');

// Setup System Media Controls & Restore Last Session
setupMediaSession();
restorePlaybackState();

// Auto Login
if (state.token) {
  fetchLibrary(state.token);
} else {
  setTimeout(() => dom.authModal.classList.remove('hidden'), 500);
}

// Segmented Control (Tracks / Playlists)
const segTracks = document.getElementById('seg-tracks');
const segPlaylists = document.getElementById('seg-playlists');
const viewLibraryTracks = document.getElementById('library-tracks-view');
const viewLibraryPlaylists = document.getElementById('library-playlists-view');

if (segTracks && segPlaylists) {
  segTracks.addEventListener('click', () => {
    segTracks.classList.add('active');
    segTracks.style.background = 'rgba(255,255,255,0.2)';
    segTracks.style.color = '#fff';
    segPlaylists.classList.remove('active');
    segPlaylists.style.background = 'transparent';
    segPlaylists.style.color = '#aaa';
    viewLibraryTracks.style.display = 'block';
    viewLibraryPlaylists.style.display = 'none';
  });

  segPlaylists.addEventListener('click', () => {
    segPlaylists.classList.add('active');
    segPlaylists.style.background = 'rgba(255,255,255,0.2)';
    segPlaylists.style.color = '#fff';
    segTracks.classList.remove('active');
    segTracks.style.background = 'transparent';
    segTracks.style.color = '#aaa';
    viewLibraryTracks.style.display = 'none';
    viewLibraryPlaylists.style.display = 'block';
    if (!state.playlistsLoaded) {
      fetchPlaylists();
    }
  });
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
            <div class="track-title">${pl.title}</div>
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
  if (coverUrl && !coverUrl.startsWith('http') && coverUrl !== '/favicon.png') {
    coverUrl = `https://${coverUrl}`;
  }
  if (!coverUrl) coverUrl = '/favicon.png';
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
    const isLiked = state.likedTrackIds.has(trackId);
    asBtnLike.querySelector('i').className = isLiked ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
    asBtnLike.querySelector('i').style.color = isLiked ? '#ff3333' : 'inherit';
    asLikeText.textContent = isLiked ? 'Удалить из коллекции' : 'Добавить в коллекцию';

    asBtnLike.onclick = async () => {
      closeActionSheet();
      try {
        const action = isLiked ? 'unlike' : 'like';
        if (action === 'like') {
          state.likedTrackIds.add(trackId);
          state.tracks.unshift({ id: trackId, title: track.title, artists: artistName, coverUri: track.coverUri, explicit: track.explicit || track.track?.explicit, isLiberty: track.isLiberty, track: track.track || track });
        } else {
          state.likedTrackIds.delete(trackId);
          state.tracks = state.tracks.filter(t => String(t.id) !== trackId);
        }
        renderTracks();
        if (state.currentTrack && String(state.currentTrack.id) === trackId) {
          const heartIcon = dom.btnLike?.querySelector('i');
          if (heartIcon) {
            heartIcon.className = action === 'like' ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
            heartIcon.style.color = action === 'like' ? '#ff3333' : 'inherit';
          }
        }
        await YandexClient.like(trackId, action, state.token);
      } catch (e) {
        console.error(e);
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
    asBtnPlaylist.onclick = () => {
      openPlaylistChooser(trackId);
    };
  }

  // Report censorship
  if (asBtnReport && trackId) {
    asBtnReport.onclick = async () => {
      asReportText.textContent = 'Отправка...';
      try {
        let sent = false;
        try {
          const r1 = await fetch('/api/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ track_id: Number(trackId), replaced: false })
          });
          const d1 = await r1.json();
          if (r1.ok && !d1.error) sent = true;
        } catch(e) {}

        if (!sent) {
          const r2 = await fetch('https://ym-liberty-bot.vercel.app/api/bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'report', track_id: Number(trackId), replaced: false })
          });
          if (r2.ok) sent = true;
        }

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
          <img src="${pl.coverUri || '/favicon.png'}" style="width: 44px; height: 44px; border-radius: 6px; margin-right: 12px; object-fit: cover;">
          <div style="flex: 1;">
            <div style="font-weight: bold; font-size: 15px;">${pl.title}</div>
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
      const cover = current.cover || current.coverUri || current.track?.coverUri || current.track?.albums?.[0]?.coverUri || '/favicon.png';
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
      coverUri: imgEl ? imgEl.src : '/favicon.png'
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
let lastAudioSampleTime = null;
let lastAudioCurrentTrackId = null;

function getWaveStats() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(WAVE_STATS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.tracks !== undefined && data.totalTracks === undefined) {
        data.totalTracks = data.tracks || 0;
        data.totalSeconds = data.seconds || 0;
        data.todayTracks = data.tracks || 0;
        data.todaySeconds = data.seconds || 0;
      }
      if (data.date !== today) {
        data.date = today;
        data.todayTracks = 0;
        data.todaySeconds = 0;
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
  } catch (e) {}
}

function accumulateListeningSeconds(sec) {
  if (!sec || sec <= 0) return;
  const stats = getWaveStats();
  stats.todaySeconds = (stats.todaySeconds || 0) + sec;
  stats.totalSeconds = (stats.totalSeconds || 0) + sec;
  saveWaveStats(stats);
  if (!document.hidden) {
    updateWaveStatsDisplay();
  }
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
}

// --- Cloud Account Persistence (Restores stats on app reinstall) ---
async function syncWaveStatsFromAccount() {
  if (!state.token || !YandexClient.getUserPlaylistsRaw) return;
  try {
    const playlists = await YandexClient.getUserPlaylistsRaw(state.token);
    const statPl = (playlists || []).find(p => p.title && p.title.startsWith(STATS_PLAYLIST_PREFIX));
    if (statPl) {
      syncPlaylistKind = statPl.kind;
      const parts = statPl.title.replace(STATS_PLAYLIST_PREFIX, '').split(':');
      if (parts.length >= 5) {
        const totalTracks = parseInt(parts[0], 10) || 0;
        const totalSeconds = parseInt(parts[1], 10) || 0;
        const todayTracks = parseInt(parts[2], 10) || 0;
        const todaySeconds = parseInt(parts[3], 10) || 0;
        const statDate = parts[4];

        const local = getWaveStats();
        const today = new Date().toISOString().slice(0, 10);

        local.totalTracks = Math.max(local.totalTracks || 0, totalTracks);
        local.totalSeconds = Math.max(local.totalSeconds || 0, totalSeconds);
        if (statDate === today) {
          local.todayTracks = Math.max(local.todayTracks || 0, todayTracks);
          local.todaySeconds = Math.max(local.todaySeconds || 0, todaySeconds);
        }
        saveWaveStats(local);
        updateWaveStatsDisplay();
      }

      // Restore previously played Wave tracks from account playlist so Wave never repeats tracks after reinstall
      try {
        if (YandexClient.getPlaylist) {
          const plData = await YandexClient.getPlaylist(statPl.kind, state.token);
          if (plData && plData.tracks && plData.tracks.length > 0) {
            state.vibeHistory = state.vibeHistory || new Set();
            plData.tracks.forEach(tr => {
              if (tr && tr.id) state.vibeHistory.add(String(tr.id));
            });
            if (typeof saveVibeHistory === 'function') saveVibeHistory();
          }
        }
      } catch (errPl) {
        console.warn('Could not load history tracks from sync playlist:', errPl);
      }
    } else {
      const local = getWaveStats();
      const today = new Date().toISOString().slice(0, 10);
      const title = `${STATS_PLAYLIST_PREFIX}${local.totalTracks || 0}:${local.totalSeconds || 0}:${local.todayTracks || 0}:${local.todaySeconds || 0}:${today}`;
      const created = await YandexClient.createPrivatePlaylist(title, state.token);
      if (created && created.kind) {
        syncPlaylistKind = created.kind;
      }
    }
  } catch (e) {
    console.warn('Sync stats with account error:', e);
  }
}

// Add played track to account sync playlist in background
let pendingSyncTracks = [];
let syncTracksTimeout = null;

function addTrackToCloudSync(trackId, albumId) {
  if (!state.token || !trackId) return;
  pendingSyncTracks.push({ id: String(trackId), albumId: String(albumId || 0) });
  if (syncTracksTimeout) return;
  syncTracksTimeout = setTimeout(async () => {
    syncTracksTimeout = null;
    const toSend = pendingSyncTracks.splice(0, pendingSyncTracks.length);
    if (!toSend.length || !syncPlaylistKind || !YandexClient.addTrackToPlaylist) return;
    try {
      for (const t of toSend) {
        await YandexClient.addTrackToPlaylist(syncPlaylistKind, t.id, t.albumId, state.token);
      }
    } catch (e) {
      console.warn("Cloud sync add track error:", e);
    }
  }, 8000);
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
    if (!state.token || !YandexClient.getUserPlaylistsRaw) return;
    try {
      const stats = getWaveStats();
      const today = new Date().toISOString().slice(0, 10);
      const newTitle = `${STATS_PLAYLIST_PREFIX}${stats.totalTracks || 0}:${stats.totalSeconds || 0}:${stats.todayTracks || 0}:${stats.todaySeconds || 0}:${today}`;

      if (!syncPlaylistKind) {
        const playlists = await YandexClient.getUserPlaylistsRaw(state.token);
        const statPl = (playlists || []).find(p => p.title && p.title.startsWith(STATS_PLAYLIST_PREFIX));
        if (statPl) {
          syncPlaylistKind = statPl.kind;
        } else {
          const created = await YandexClient.createPrivatePlaylist(newTitle, state.token);
          if (created && created.kind) syncPlaylistKind = created.kind;
          return;
        }
      }

      if (syncPlaylistKind && YandexClient.renamePlaylist) {
        await YandexClient.renamePlaylist(syncPlaylistKind, newTitle, state.token);
      }
    } catch (e) {
      console.warn('Stats account sync update error:', e);
    }
  }, immediate ? 100 : 20000);
}

// Global Lifecycle Listeners for Accurate Background Tracking
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    recordListeningProgress();
    updateWaveStatsDisplay();
  }
});
window.addEventListener('focus', () => {
  recordListeningProgress();
  updateWaveStatsDisplay();
});
window.addEventListener('beforeunload', () => {
  recordListeningProgress();
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
      showToast(`Настроение: ${moodName}`);

      const settings = VIBE_MOOD_SETTINGS_MAP[moodKey] || { moodEnergy: 'all', diversity: 'default' };

      // Отправляем настройки в Яндекс Ротор
      if (state.token && YandexClient.setVibeSettings) {
        YandexClient.setVibeSettings(settings.moodEnergy, settings.diversity, state.token).catch(e => {
          console.warn('Failed to update vibe settings:', e);
        });
      }

      if (state.queueMode === 'vibe' && (!state.currentStation || state.currentStation === 'user:onyourwave')) {
        updatePlaybackContextHeader('ИГРАЕТ ИЗ ВОЛНЫ', moodName === 'Всё подряд' ? 'Моя Волна' : `Моя Волна • ${moodName}`);

        // Бесшовно перестраиваем очередь под новое настроение
        try {
          state.isFetchingVibe = true;
          const data = await YandexClient.getVibe(state.token, null, 'user:onyourwave');
          if (data && data.tracks && data.tracks.length > 0) {
            state.vibeBatchId = data.batchId;
            const currentTr = state.queue[state.queueIndex];
            if (currentTr) {
              state.queue = [currentTr, ...data.tracks.filter(t => String(t.id) !== String(currentTr.id))];
              state.queueIndex = 0;
            } else {
              state.queue = data.tracks;
              state.queueIndex = 0;
            }
            if (typeof preloadNextTrack === 'function') {
              preloadNextTrack();
            }
          }
        } catch (err) {
          console.warn('Failed to reload vibe queue for new mood:', err);
        } finally {
          state.isFetchingVibe = false;
        }
      }
    });
  });
}

// ==========================================
// Web Audio API Equalizer & Audio Quality
// ==========================================
let eqAudioCtx = null;
let eqFilters = [];
let eqSourceA = null;
let eqSourceB = null;

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
    presetSelect.value = savedPreset;
    presetSelect.addEventListener('change', () => {
      const p = presetSelect.value;
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
  }

  // Audio Quality Setting
  const qualitySelect = document.getElementById('setting-audio-quality');
  const qualityLabel = document.getElementById('audio-quality-label');
  const savedQuality = localStorage.getItem('ym_audio_quality') || '320';
  if (qualitySelect) {
    qualitySelect.value = savedQuality;
    if (qualityLabel) qualityLabel.textContent = `${savedQuality} kbps`;
    qualitySelect.addEventListener('change', () => {
      const q = qualitySelect.value;
      localStorage.setItem('ym_audio_quality', q);
      if (qualityLabel) qualityLabel.textContent = `${q} kbps`;
      showToast(`Качество аудио: ${q} kbps`);
    });
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
  let versionCode = 16;
  let versionName = '1.0.15';
  if (window.AndroidBridge) {
    if (typeof window.AndroidBridge.getVersionCode === 'function') {
      try { versionCode = window.AndroidBridge.getVersionCode() || 4; } catch (e) {}
    }
    if (typeof window.AndroidBridge.getVersionName === 'function') {
      try { versionName = window.AndroidBridge.getVersionName() || '1.0.3'; } catch (e) {}
    }
  }
  return { versionCode, versionName };
}

async function fetchUpdateMetadata() {
  const endpoints = [
    'https://ym-liberty-bot.vercel.app/api/version?_t=' + Date.now(),
    'https://ym-liberty-bot.vercel.app/version.json?_t=' + Date.now()
  ];
  for (const url of endpoints) {
    try {
      const resp = await fetch(url, { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.versionCode) return data;
      }
    } catch (e) {
      console.warn('Update endpoint check failed:', url, e);
    }
  }
  return null;
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

    const coverUrl = t.coverUri || '/favicon.png';
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
let vibeAuraAnalyser = null;
let vibeAuraFreqData = null;

let auraCurrentColors = [
  { r: 254, g: 212, b: 43 },  // YM Gold
  { r: 35, g: 110, b: 240 },  // Electric Blue
  { r: 120, g: 30, b: 210 }   // Deep Violet
];
let auraTargetColors = [
  { r: 254, g: 212, b: 43 },
  { r: 35, g: 110, b: 240 },
  { r: 120, g: 30, b: 210 }
];

// Rich multi-blob parameters for deep organic chromatic glow
const AURA_BLOBS = [
  { baseX: 0.50, baseY: 0.25, radiusRatio: 0.72, speedX: 0.0006, speedY: 0.0008, phaseX: 0, phaseY: 1.0, colorIdx: 0, alpha: 0.75 },
  { baseX: 0.30, baseY: 0.30, radiusRatio: 0.58, speedX: 0.0009, speedY: 0.0007, phaseX: 2.3, phaseY: 3.2, colorIdx: 1, alpha: 0.50 },
  { baseX: 0.70, baseY: 0.28, radiusRatio: 0.60, speedX: 0.0008, speedY: 0.0010, phaseX: 4.1, phaseY: 0.9, colorIdx: 2, alpha: 0.50 }
];

// 5 High-Definition Concentric Fluid Contour Rings (Official Yandex Music Aesthetic)
const AURA_RINGS = [
  { baseRadius: 68,  speed1: 0.0013, speed2: 0.0019, amp1: 6,  amp2: 4,  colorIdx: 0, alpha: 0.85, coreWidth: 2.0 },
  { baseRadius: 105, speed1: 0.0010, speed2: 0.0015, amp1: 9,  amp2: 6,  colorIdx: 1, alpha: 0.75, coreWidth: 1.8 },
  { baseRadius: 150, speed1: 0.0008, speed2: 0.0012, amp1: 12, amp2: 8,  colorIdx: 2, alpha: 0.65, coreWidth: 1.6 },
  { baseRadius: 200, speed1: 0.0006, speed2: 0.0009, amp1: 15, amp2: 10, colorIdx: 0, alpha: 0.50, coreWidth: 1.4 },
  { baseRadius: 255, speed1: 0.0005, speed2: 0.0007, amp1: 18, amp2: 12, colorIdx: 1, alpha: 0.35, coreWidth: 1.2 }
];

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

  renderAuraFrame();
}

function updateVibeAmbientAura(coverUrl) {
  if (!coverUrl || coverUrl === '/favicon.png') return;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
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
      } catch (e) {}
    };
    img.src = coverUrl;
  } catch (e) {}
}

function getAudioSpectrumData() {
  let bass = 0;
  let mids = 0;
  let highs = 0;

  if (typeof eqAudioCtx !== 'undefined' && eqAudioCtx) {
    if (!vibeAuraAnalyser) {
      try {
        vibeAuraAnalyser = eqAudioCtx.createAnalyser();
        vibeAuraAnalyser.fftSize = 64;
        vibeAuraAnalyser.smoothingTimeConstant = 0.82;
        vibeAuraFreqData = new Uint8Array(vibeAuraAnalyser.frequencyBinCount);
        if (typeof eqFilters !== 'undefined' && eqFilters && eqFilters.length > 0) {
          eqFilters[eqFilters.length - 1].connect(vibeAuraAnalyser);
        } else if (typeof eqSourceA !== 'undefined' && eqSourceA) {
          eqSourceA.connect(vibeAuraAnalyser);
        }
      } catch (e) {}
    }
    if (vibeAuraAnalyser && state.isPlaying) {
      vibeAuraAnalyser.getByteFrequencyData(vibeAuraFreqData);
      bass = (vibeAuraFreqData[0] + vibeAuraFreqData[1] + vibeAuraFreqData[2] + vibeAuraFreqData[3]) / 4 / 255;
      mids = (vibeAuraFreqData[5] + vibeAuraFreqData[7] + vibeAuraFreqData[9]) / 3 / 255;
      highs = (vibeAuraFreqData[14] + vibeAuraFreqData[18]) / 2 / 255;
      return { bass, mids, highs, pulse: 1.0 + bass * 0.40 };
    }
  }

  if (state.isPlaying) {
    const t = Date.now() * 0.003;
    return {
      bass: Math.max(0, Math.sin(t * 1.5)) * 0.38,
      mids: Math.max(0, Math.cos(t * 2.1)) * 0.28,
      highs: 0.18,
      pulse: 1.0 + Math.sin(t) * 0.075 + Math.sin(t * 1.8) * 0.035
    };
  }

  const t = Date.now() * 0.0012;
  return {
    bass: 0.04,
    mids: 0.04,
    highs: 0.04,
    pulse: 1.0 + Math.sin(t) * 0.025
  };
}

function renderAuraFrame() {
  vibeAuraAnimFrame = requestAnimationFrame(renderAuraFrame);
  if (!vibeAuraCtx) return;

  const vibeView = document.getElementById('view-vibe');
  if (vibeView && !vibeView.classList.contains('active')) return;

  const now = Date.now();
  const audio = getAudioSpectrumData();

  // Smoothly interpolate colors (lerp)
  for (let i = 0; i < 3; i++) {
    auraCurrentColors[i].r += (auraTargetColors[i].r - auraCurrentColors[i].r) * 0.045;
    auraCurrentColors[i].g += (auraTargetColors[i].g - auraCurrentColors[i].g) * 0.045;
    auraCurrentColors[i].b += (auraTargetColors[i].b - auraCurrentColors[i].b) * 0.045;
  }

  vibeAuraCtx.clearRect(0, 0, vibeAuraWidth, vibeAuraHeight);

  // 1. Deep Atmospheric Gradient Cloud (Zero-GPU-overhead multi-stop diffusion)
  AURA_BLOBS.forEach((blob) => {
    const offsetX = Math.sin(now * blob.speedX + blob.phaseX) * (vibeAuraWidth * 0.16);
    const offsetY = Math.cos(now * blob.speedY + blob.phaseY) * (vibeAuraHeight * 0.12);
    const cx = vibeAuraWidth * blob.baseX + offsetX;
    const cy = vibeAuraHeight * blob.baseY + offsetY;
    const radius = Math.min(vibeAuraWidth, vibeAuraHeight) * blob.radiusRatio * audio.pulse;

    const col = auraCurrentColors[blob.colorIdx] || auraCurrentColors[0];
    const grad = vibeAuraCtx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
    grad.addColorStop(0,    `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, ${blob.alpha})`);
    grad.addColorStop(0.18, `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, ${blob.alpha * 0.72})`);
    grad.addColorStop(0.40, `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, ${blob.alpha * 0.42})`);
    grad.addColorStop(0.65, `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, ${blob.alpha * 0.16})`);
    grad.addColorStop(0.85, `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, ${blob.alpha * 0.04})`);
    grad.addColorStop(1,    `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, 0)`);

    vibeAuraCtx.fillStyle = grad;
    vibeAuraCtx.beginPath();
    vibeAuraCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    vibeAuraCtx.fill();
  });

  // 2. Razor-Sharp 3-Pass Luminous Visualizer Bands (Silky 120 FPS Bloom)
  const centerX = vibeAuraWidth * 0.5;
  const centerY = 110; // Center of play button

  // A. Concentric Fluid Contour Rings
  AURA_RINGS.forEach((ring, idx) => {
    const col = auraCurrentColors[ring.colorIdx] || auraCurrentColors[0];
    const baseR = ring.baseRadius * audio.pulse;
    const numPoints = 84;
    const step = (Math.PI * 2) / numPoints;

    vibeAuraCtx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const theta = i * step;
      const wave1 = Math.sin(theta * 2 + now * ring.speed1 + idx * 1.3) * ring.amp1;
      const wave2 = Math.cos(theta * 3 - now * ring.speed2 + idx * 2.1) * ring.amp2;
      const audioRipple = Math.sin(theta * 5 + now * 0.005) * (audio.mids * 15 + audio.bass * 11);
      const r = baseR + wave1 + wave2 + audioRipple;

      const px = centerX + Math.cos(theta) * r;
      const py = centerY + Math.sin(theta) * (r * 0.88);

      if (i === 0) vibeAuraCtx.moveTo(px, py);
      else vibeAuraCtx.lineTo(px, py);
    }
    vibeAuraCtx.closePath();

    // Pass 1: Soft Atmospheric Bloom
    vibeAuraCtx.strokeStyle = `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, ${ring.alpha * 0.16})`;
    vibeAuraCtx.lineWidth = ring.coreWidth * 4.5;
    vibeAuraCtx.stroke();

    // Pass 2: Vibrant Mid Glow
    vibeAuraCtx.strokeStyle = `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, ${ring.alpha * 0.42})`;
    vibeAuraCtx.lineWidth = ring.coreWidth * 2.2;
    vibeAuraCtx.stroke();

    // Pass 3: Crisp Bright Core
    vibeAuraCtx.strokeStyle = `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, ${Math.min(0.95, ring.alpha + audio.bass * 0.25)})`;
    vibeAuraCtx.lineWidth = ring.coreWidth;
    vibeAuraCtx.stroke();
  });

  // B. Upper Flowing Stream Ribbons behind "Моя Волна"
  const waveRibbons = [
    { y: centerY - 48, speed: 0.0016, freq: 0.009, amp: 15, colorIdx: 0 },
    { y: centerY + 62, speed: 0.0011, freq: 0.007, amp: 19, colorIdx: 1 }
  ];

  waveRibbons.forEach((ribbon, rIdx) => {
    const col = auraCurrentColors[ribbon.colorIdx] || auraCurrentColors[0];
    vibeAuraCtx.beginPath();
    const startX = -10;
    const endX = vibeAuraWidth + 10;
    const stepX = 14;

    for (let x = startX; x <= endX; x += stepX) {
      const h1 = Math.sin(x * ribbon.freq + now * ribbon.speed + rIdx) * ribbon.amp;
      const h2 = Math.cos(x * ribbon.freq * 1.8 - now * ribbon.speed * 0.7) * (ribbon.amp * 0.35);
      const audioBounce = Math.sin(x * 0.02 + now * 0.005) * (audio.mids * 11 + audio.highs * 7);
      const y = ribbon.y + h1 + h2 + audioBounce;

      if (x === startX) vibeAuraCtx.moveTo(x, y);
      else vibeAuraCtx.lineTo(x, y);
    }

    // Pass 1: Bloom
    vibeAuraCtx.strokeStyle = `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, 0.12)`;
    vibeAuraCtx.lineWidth = 6.0;
    vibeAuraCtx.stroke();

    // Pass 2: Core
    vibeAuraCtx.strokeStyle = `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, ${0.45 + audio.mids * 0.3})`;
    vibeAuraCtx.lineWidth = 1.8;
    vibeAuraCtx.stroke();
  });
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
      if (e.target.closest('#progress-slider') || e.target.closest('.full-controls') || e.target.closest('#btn-track-menu')) {
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

