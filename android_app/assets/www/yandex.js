// --- Pure JS MD5 Implementation (RFC 1321) ---
function md5(string) {
  function rotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
  function addUnsigned(lX, lY) {
    var lX4 = lX & 0x40000000, lY4 = lY & 0x40000000, lX8 = lX & 0x80000000, lY8 = lY & 0x80000000;
    var lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) return (lResult & 0x40000000) ? (lResult ^ 0xC0000000 ^ lX8 ^ lY8) : (lResult ^ 0x40000000 ^ lX8 ^ lY8);
    return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | (~z)); }
  function FF(a, b, c, d, x, s, ac) { return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, F(b, c, d)), addUnsigned(x, ac)), s), b); }
  function GG(a, b, c, d, x, s, ac) { return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, G(b, c, d)), addUnsigned(x, ac)), s), b); }
  function HH(a, b, c, d, x, s, ac) { return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, H(b, c, d)), addUnsigned(x, ac)), s), b); }
  function II(a, b, c, d, x, s, ac) { return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, I(b, c, d)), addUnsigned(x, ac)), s), b); }
  function convertToWordArray(string) {
    var lMessageLength = string.length;
    var lNumberOfWords = (((lMessageLength + 8) - ((lMessageLength + 8) % 64)) / 64 + 1) * 16;
    var lWordArray = Array(lNumberOfWords - 1);
    for (var i = 0; i < lNumberOfWords; i++) lWordArray[i] = 0;
    for (var i = 0; i < lMessageLength; i++) {
      lWordArray[i >> 2] |= (string.charCodeAt(i) & 255) << ((i % 4) * 8);
    }
    lWordArray[lMessageLength >> 2] |= 0x80 << ((lMessageLength % 4) * 8);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue) {
    var WordToHexValue = '';
    for (var lCount = 0; lCount <= 3; lCount++) {
      var lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue += ('0' + lByte.toString(16)).slice(-2);
    }
    return WordToHexValue;
  }
  var x = convertToWordArray(string);
  var a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
  var S11=7, S12=12, S13=17, S14=22, S21=5, S22=9, S23=14, S24=20, S31=4, S32=11, S33=16, S34=23, S41=6, S42=10, S43=15, S44=21;
  for (var k = 0; k < x.length; k += 16) {
    var AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k+0], S11, 0xD76AA478); d = FF(d, a, b, c, x[k+1], S12, 0xE8C7B756); c = FF(c, d, a, b, x[k+2], S13, 0x242070DB); b = FF(b, c, d, a, x[k+3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k+4], S11, 0xF57C0FAF); d = FF(d, a, b, c, x[k+5], S12, 0x4787C62A); c = FF(c, d, a, b, x[k+6], S13, 0xA8304613); b = FF(b, c, d, a, x[k+7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k+8], S11, 0x698098D8); d = FF(d, a, b, c, x[k+9], S12, 0x8B44F7AF); c = FF(c, d, a, b, x[k+10], S13, 0xFFFF5BB1); b = FF(b, c, d, a, x[k+11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k+12], S11, 0x6B901122); d = FF(d, a, b, c, x[k+13], S12, 0xFD987193); c = FF(c, d, a, b, x[k+14], S13, 0xA679438E); b = FF(b, c, d, a, x[k+15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k+1], S21, 0xF61E2562); d = GG(d, a, b, c, x[k+6], S22, 0xC040B340); c = GG(c, d, a, b, x[k+11], S23, 0x265E5A51); b = GG(b, c, d, a, x[k+0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k+5], S21, 0xD62F105D); d = GG(d, a, b, c, x[k+10], S22, 0x02441453); c = GG(c, d, a, b, x[k+15], S23, 0xD8A1E681); b = GG(b, c, d, a, x[k+4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k+9], S21, 0x21E1CDE6); d = GG(d, a, b, c, x[k+14], S22, 0xC33707D6); c = GG(c, d, a, b, x[k+3], S23, 0xF4D50D87); b = GG(b, c, d, a, x[k+8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k+13], S21, 0xA9E3E905); d = GG(d, a, b, c, x[k+2], S22, 0xFCEFA3F8); c = GG(c, d, a, b, x[k+7], S23, 0x676F02D9); b = GG(b, c, d, a, x[k+12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k+5], S31, 0xFFFA3942); d = HH(d, a, b, c, x[k+8], S32, 0x8771F681); c = HH(c, d, a, b, x[k+11], S33, 0x6D9D6122); b = HH(b, c, d, a, x[k+14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k+1], S31, 0xA4BEEA44); d = HH(d, a, b, c, x[k+4], S32, 0x4BDECFA9); c = HH(c, d, a, b, x[k+7], S33, 0xF6BB4B60); b = HH(b, c, d, a, x[k+10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k+13], S31, 0x289B7EC6); d = HH(d, a, b, c, x[k+0], S32, 0xEAA127FA); c = HH(c, d, a, b, x[k+3], S33, 0xD4EF3085); b = HH(b, c, d, a, x[k+6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k+9], S31, 0xD9D4D039); d = HH(d, a, b, c, x[k+12], S32, 0xE6DB99E5); c = HH(c, d, a, b, x[k+15], S33, 0x1FA27CF8); b = HH(b, c, d, a, x[k+2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k+0], S41, 0xF4292244); d = II(d, a, b, c, x[k+7], S42, 0x432AFF97); c = II(c, d, a, b, x[k+14], S43, 0xAB9423A7); b = II(b, c, d, a, x[k+5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k+12], S41, 0x655B59C3); d = II(d, a, b, c, x[k+3], S42, 0x8F0CCC92); c = II(c, d, a, b, x[k+10], S43, 0xFFEFF47D); b = II(b, c, d, a, x[k+1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k+8], S41, 0x6FA87E4F); d = II(d, a, b, c, x[k+15], S42, 0xFE2CE6E0); c = II(c, d, a, b, x[k+6], S43, 0xA3014314); b = II(b, c, d, a, x[k+13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k+4], S41, 0xF7537E82); d = II(d, a, b, c, x[k+11], S42, 0xBD3AF235); c = II(c, d, a, b, x[k+2], S43, 0x2AD7D2BB); b = II(b, c, d, a, x[k+9], S44, 0xEB86D391);
    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// --- Direct Client-Side Yandex API (All traffic from User's IP) ---
const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  (window.location.origin && window.location.origin.includes('localhost:3000'))
);

const YandexClient = {
  CLIENT_ID: '23cabbbdc6cd418abb4b39c32c41195d',
  CLIENT_SECRET: '53bc75238f0c4d08a118e51fe9203300',
  libertyCache: null,
  libertyCacheTime: 0,
  cachedUid: null,

  async getLibertyList() {
    const now = Date.now();
    if (this.libertyCache && now - this.libertyCacheTime < 60000) {
      return this.libertyCache;
    }
    const urls = [
      'https://cdn.jsdelivr.net/gh/gagayhhad-tech/ym-liberty-db@main/list.json',
      'https://raw.githubusercontent.com/gagayhhad-tech/ym-liberty-db/refs/heads/main/list.json'
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        const data = await res.json();
        this.libertyCache = data.tracks ? data.tracks : data;
        this.libertyCacheTime = now;
        return this.libertyCache;
      } catch (e) {}
    }
    return this.libertyCache || {};
  },

  getHeaders(token) {
    const raw = (token || '').replace(/^OAuth\s+/i, '').replace(/^Bearer\s+/i, '').trim();
    return {
      'Authorization': raw ? `OAuth ${raw}` : '',
      'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621',
      'Accept': 'application/json'
    };
  },

  async getAccountStatus(token) {
    if (isLocal) {
      const libData = await this.getLibrary(token);
      return libData.user || {};
    }
    const res = await fetch('https://api.music.yandex.net/account/status', {
      headers: this.getHeaders(token)
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Status error');
    const account = data.result?.account || {};
    this.cachedUid = account.uid;
    return {
      uid: account.uid,
      login: account.login,
      fullName: account.fullName || account.displayName || account.login,
      name: account.fullName || account.displayName || account.login,
      hasPlus: Boolean(data.result?.plus?.hasPlus)
    };
  },

  async getUid(token) {
    if (this.cachedUid) return this.cachedUid;
    const status = await this.getAccountStatus(token);
    return status.uid;
  },

  async getStreamUrl(trackId, token) {
    const idStr = String(trackId);
    if (isLocal) {
      const res = await fetch(`/api/stream?trackId=${encodeURIComponent(idStr)}&token=${encodeURIComponent(token || '')}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Stream error');
      if (data.streamUrl && !data.streamUrl.startsWith('/api/proxy-audio')) {
        data.streamUrl = `/api/proxy-audio?url=${encodeURIComponent(data.streamUrl)}`;
      }
      return data;
    }

    // 1. Check Liberty DB
    const libertyList = await this.getLibertyList();
    if (libertyList && libertyList[idStr]) {
      return {
        trackId: idStr,
        streamUrl: libertyList[idStr],
        isLiberty: true
      };
    }

    // 2. Official Track Download Info
    const res = await fetch(`https://api.music.yandex.net/tracks/${idStr}/download-info`, {
      headers: this.getHeaders(token)
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Download info error');

    const options = data.result || [];
    if (!options.length) throw new Error('No download info available');
    const targetBitrate = parseInt(localStorage.getItem('ym_audio_quality') || '320', 10);
    const mp3Options = options.filter(o => o.codec === 'mp3');
    const pool = mp3Options.length > 0 ? mp3Options : options;
    pool.sort((a, b) => {
      const diffA = Math.abs((a.bitrateInKbps || 0) - targetBitrate);
      const diffB = Math.abs((b.bitrateInKbps || 0) - targetBitrate);
      if (diffA !== diffB) return diffA - diffB;
      return (b.bitrateInKbps || 0) - (a.bitrateInKbps || 0);
    });
    const selected = pool[0] || options[0];

    const xmlRes = await fetch(selected.downloadInfoUrl, {
      headers: this.getHeaders(token)
    });
    const xmlText = await xmlRes.text();

    const parseField = (field) => {
      const m = xmlText.match(new RegExp(`<${field}>([^<]+)<\/${field}>`));
      return m ? m[1] : null;
    };

    const host = parseField('host');
    const path = parseField('path');
    const ts = parseField('ts');
    const s = parseField('s');

    if (!host || !path || !ts || !s) throw new Error('XML parsing failed');

    const hash = md5('XGRSTTXRwy' + path.slice(1) + s);
    const directStreamUrl = `https://${host}/get-mp3/${hash}/${ts}${path}`;

    return {
      trackId: idStr,
      streamUrl: directStreamUrl,
      isLiberty: false
    };
  },

  async getLibrary(token) {
    if (isLocal) {
      const res = await fetch(`/api/library?token=${encodeURIComponent(token || '')}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Library error');
      return data;
    }

    const status = await this.getAccountStatus(token);
    const uid = status.uid;
    const [likesRes, libertyTracks] = await Promise.all([
      fetch(`https://api.music.yandex.net/users/${uid}/likes/tracks`, { headers: this.getHeaders(token) }),
      this.getLibertyList()
    ]);
    const likesData = await likesRes.json();
    const trackShorts = likesData.result?.library?.tracks || [];
    if (!trackShorts.length) return { tracks: [], user: status, totalLiked: 0 };

    const trackIds = trackShorts.map(t => t.id);
    const chunkSize = 200;
    const tracks = [];

    for (let i = 0; i < trackIds.length; i += chunkSize) {
      const chunk = trackIds.slice(i, i + chunkSize);
      const tracksRes = await fetch('https://api.music.yandex.net/tracks', {
        method: 'POST',
        headers: {
          ...this.getHeaders(token),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `track-ids=${chunk.join(',')}`
      });
      const tracksData = await tracksRes.json();
      const chunkTracks = (tracksData.result || []).map(t => {
        const cover = t.coverUri
          ? 'https://' + t.coverUri.replace('%%', '400x400')
          : t.albums?.[0]?.coverUri
          ? 'https://' + t.albums[0].coverUri.replace('%%', '400x400')
          : '';
        return {
          id: t.id,
          title: t.title,
          version: t.version || '',
          artists: (t.artists || []).map(a => a.name).join(', '),
          durationMs: t.durationMs || 0,
          coverUri: cover,
          explicit: Boolean(t.contentWarning === 'explicit' || t.explicit),
          isLiberty: Boolean(libertyTracks && libertyTracks[String(t.id)]),
          track: t
        };
      });
      tracks.push(...chunkTracks);
    }

    return {
      user: status,
      totalLiked: trackShorts.length,
      tracks
    };
  },

  async getVibe(token, queueTrackId, station = 'user:onyourwave') {
    const queueParam = queueTrackId ? `&queue=${encodeURIComponent(queueTrackId)}` : '';
    const cleanStation = station || 'user:onyourwave';
    if (isLocal) {
      const res = await fetch(`/api/vibe?token=${encodeURIComponent(token || '')}&station=${encodeURIComponent(cleanStation)}${queueParam}`);
      return res.json();
    }

    const url = `https://api.music.yandex.net/rotor/station/${cleanStation}/tracks?settings2=true${queueParam}`;
    const [res, libertyTracks] = await Promise.all([
      fetch(url, { headers: this.getHeaders(token) }),
      this.getLibertyList()
    ]);
    const data = await res.json();
    const seq = data.result?.sequence || [];
    const tracks = seq.filter(t => t.track && t.track.title !== 'Музыкальное Upgrade').map(t => {
      const tr = t.track;
      const cover = tr.coverUri
        ? 'https://' + tr.coverUri.replace('%%', '400x400')
        : tr.albums?.[0]?.coverUri
        ? 'https://' + tr.albums[0].coverUri.replace('%%', '400x400')
        : '';
      return {
        id: tr.id,
        title: tr.title,
        version: tr.version || '',
        artists: (tr.artists || []).map(a => a.name).join(', '),
        durationMs: tr.durationMs || 0,
        coverUri: cover,
        explicit: Boolean(tr.contentWarning === 'explicit' || tr.explicit),
        isLiberty: Boolean(libertyTracks && libertyTracks[String(tr.id)]),
        track: tr
      };
    });
    return {
      shadowbanned: tracks.length === 0 && seq.length > 0,
      tracks,
      batchId: data.result?.batchId
    };
  },

  async sendFeedback(type, trackId, batchId, duration, token, station = 'user:onyourwave') {
    const cleanStation = station || 'user:onyourwave';
    if (isLocal) {
      return fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, batchId, trackId, type, duration, station: cleanStation })
      });
    }

    const body = {
      type,
      timestamp: new Date().toISOString(),
      trackId: String(trackId),
      from: cleanStation.startsWith('track:') ? 'mobile-radio-track' : 'mobile-radio-user-onyourwave',
      totalPlayedSeconds: duration !== undefined ? duration : 0
    };
    const batchParam = batchId ? `?batch-id=${encodeURIComponent(batchId)}` : '';
    return fetch(`https://api.music.yandex.net/rotor/station/${cleanStation}/feedback${batchParam}`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  },

  async setVibeSettings(moodEnergy = 'all', diversity = 'default', token) {
    if (!token) return { success: false };
    if (isLocal) {
      try {
        const res = await fetch('/api/vibe?action=settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, moodEnergy, diversity })
        });
        return res.json();
      } catch (e) {
        console.warn('Vibe settings local error:', e);
        return { success: false };
      }
    }

    try {
      const res = await fetch('https://api.music.yandex.net/rotor/station/user:onyourwave/settings3', {
        method: 'POST',
        headers: {
          ...this.getHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          moodEnergy: moodEnergy || 'all',
          diversity: diversity || 'default',
          type: 'rotor'
        })
      });
      return { success: res.ok };
    } catch (e) {
      console.warn('Vibe settings error:', e);
      return { success: false };
    }
  },

  async search(query, token) {
    if (isLocal) {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&token=${encodeURIComponent(token || '')}`);
      return res.json();
    }

    const [res, libertyTracks] = await Promise.all([
      fetch(`https://api.music.yandex.net/search?text=${encodeURIComponent(query)}&type=all&page=0&nocorrect=false`, { headers: this.getHeaders(token) }),
      this.getLibertyList()
    ]);
    const data = await res.json();
    const tracks = (data.result?.tracks?.results || []).map(t => {
      const cover = t.coverUri
        ? 'https://' + t.coverUri.replace('%%', '400x400')
        : t.albums?.[0]?.coverUri
        ? 'https://' + t.albums[0].coverUri.replace('%%', '400x400')
        : '';
      return {
        id: t.id,
        title: t.title,
        version: t.version || '',
        artists: (t.artists || []).map(a => a.name).join(', '),
        durationMs: t.durationMs || 0,
        coverUri: cover,
        explicit: Boolean(t.contentWarning === 'explicit' || t.explicit),
        isLiberty: Boolean(libertyTracks && libertyTracks[String(t.id)]),
        track: t
      };
    });
    const artists = (data.result?.artists?.results || []).map(a => ({
      id: a.id,
      name: a.name,
      coverUri: a.cover?.uri ? 'https://' + a.cover.uri.replace('%%', '400x400') : ''
    }));
    return { tracks, artists };
  },

  async getArtist(artistId, token) {
    if (isLocal) {
      const res = await fetch(`/api/artist?id=${encodeURIComponent(artistId)}&token=${encodeURIComponent(token || '')}`);
      return res.json();
    }

    const [res, libertyTracks] = await Promise.all([
      fetch(`https://api.music.yandex.net/artists/${artistId}/brief-info`, { headers: this.getHeaders(token) }),
      this.getLibertyList()
    ]);
    const data = await res.json();
    const artist = data.result?.artist || {};
    const popularTracks = (data.result?.popularTracks || []).map(t => {
      const cover = t.coverUri
        ? 'https://' + t.coverUri.replace('%%', '400x400')
        : t.albums?.[0]?.coverUri
        ? 'https://' + t.albums[0].coverUri.replace('%%', '400x400')
        : '';
      return {
        id: t.id,
        title: t.title,
        version: t.version || '',
        artists: (t.artists || []).map(a => a.name).join(', '),
        durationMs: t.durationMs || 0,
        coverUri: cover,
        explicit: Boolean(t.contentWarning === 'explicit' || t.explicit),
        isLiberty: Boolean(libertyTracks && libertyTracks[String(t.id)]),
        track: t
      };
    });

    const rawAlbums = data.result?.albums || [];
    const alsoAlbums = data.result?.alsoAlbums || [];
    const mergedAlbums = [...rawAlbums, ...alsoAlbums];
    const uniqueAlbums = [];
    const albumIds = new Set();
    mergedAlbums.forEach(a => {
      if (!albumIds.has(a.id)) {
        uniqueAlbums.push(a);
        albumIds.add(a.id);
      }
    });

    const albums = uniqueAlbums.map(a => ({
      id: a.id,
      title: a.title,
      year: a.year,
      trackCount: a.trackCount,
      coverUri: a.coverUri ? 'https://' + a.coverUri.replace('%%', '400x400') : ''
    }));

    const artistCover = artist.cover?.uri ? 'https://' + artist.cover.uri.replace('%%', '1000x1000') : '';

    return {
      id: artist.id,
      name: artist.name,
      coverUri: artistCover,
      tracks: popularTracks,
      albums
    };
  },

  async getAlbum(albumId, token) {
    if (isLocal) {
      const res = await fetch(`/api/album?id=${encodeURIComponent(albumId)}&token=${encodeURIComponent(token || '')}`);
      return res.json();
    }

    const [res, libertyTracks] = await Promise.all([
      fetch(`https://api.music.yandex.net/albums/${albumId}/with-tracks`, { headers: this.getHeaders(token) }),
      this.getLibertyList()
    ]);
    const data = await res.json();
    const album = data.result || {};
    const rawTracks = (album.volumes || []).flat();
    const tracks = rawTracks.map(t => {
      const cover = t.coverUri
        ? 'https://' + t.coverUri.replace('%%', '400x400')
        : album.coverUri
        ? 'https://' + album.coverUri.replace('%%', '400x400')
        : '';
      return {
        id: t.id,
        title: t.title,
        version: t.version || '',
        artists: (t.artists || []).map(a => a.name).join(', '),
        durationMs: t.durationMs || 0,
        coverUri: cover,
        explicit: Boolean(t.contentWarning === 'explicit' || t.explicit),
        isLiberty: Boolean(libertyTracks && libertyTracks[String(t.id)]),
        track: t
      };
    });
    return {
      id: album.id,
      title: album.title,
      artists: album.artists || [],
      year: album.year,
      coverUri: album.coverUri ? 'https://' + album.coverUri.replace('%%', '400x400') : 'favicon.png',
      tracks
    };
  },

  async getPlaylists(token) {
    if (isLocal) {
      const res = await fetch(`/api/playlists?token=${encodeURIComponent(token || '')}`);
      const data = await res.json();
      if (data.playlists) {
        data.playlists = data.playlists.filter(p => !p.title || !p.title.startsWith('_ym_stats:'));
      }
      return data;
    }

    const uid = await this.getUid(token);
    const res = await fetch(`https://api.music.yandex.net/users/${uid}/playlists/list`, {
      headers: this.getHeaders(token)
    });
    const data = await res.json();
    const playlists = (data.result || [])
      .filter(p => !p.title || !p.title.startsWith('_ym_stats:'))
      .map(p => ({
        kind: p.kind,
        title: p.title,
        trackCount: p.trackCount,
        coverUri: p.cover?.uri ? 'https://' + p.cover.uri.replace('%%', '400x400') : (p.ogImage ? 'https://' + p.ogImage.replace('%%', '400x400') : 'favicon.png')
      }));
    return { playlists };
  },

  async getUserPlaylistsRaw(token) {
    if (isLocal) {
      try {
        const res = await fetch(`/api/playlists?raw=1&token=${encodeURIComponent(token || '')}`);
        const data = await res.json();
        return data.playlists || [];
      } catch(e) {
        return [];
      }
    }
    const uid = await this.getUid(token);
    const res = await fetch(`https://api.music.yandex.net/users/${uid}/playlists/list`, {
      headers: this.getHeaders(token)
    });
    const data = await res.json();
    return data.result || [];
  },

  async createPrivatePlaylist(title, token) {
    if (isLocal) {
      try {
        const res = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', title, token })
        });
        return res.json();
      } catch(e) {
        return null;
      }
    }
    const uid = await this.getUid(token);
    const params = new URLSearchParams();
    params.append('title', title);
    params.append('visibility', 'private');
    const res = await fetch(`https://api.music.yandex.net/users/${uid}/playlists/create`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(token),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    const data = await res.json();
    return data.result;
  },

  async renamePlaylist(kind, newTitle, token) {
    if (isLocal) {
      try {
        const res = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'rename', kind, title: newTitle, token })
        });
        return res.json();
      } catch(e) {
        return null;
      }
    }
    const uid = await this.getUid(token);
    const params = new URLSearchParams();
    params.append('value', newTitle);
    const res = await fetch(`https://api.music.yandex.net/users/${uid}/playlists/${kind}/name`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(token),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    const data = await res.json();
    return data.result;
  },

  async getPlaylist(kind, token) {
    if (isLocal) {
      const res = await fetch(`/api/playlist?kind=${encodeURIComponent(kind)}&token=${encodeURIComponent(token || '')}`);
      return res.json();
    }

    const uid = await this.getUid(token);
    const [res, libertyTracks] = await Promise.all([
      fetch(`https://api.music.yandex.net/users/${uid}/playlists/${kind}`, { headers: this.getHeaders(token) }),
      this.getLibertyList()
    ]);
    const data = await res.json();
    const pl = data.result || {};
    const rawTracks = pl.tracks || [];
    const trackIds = rawTracks.map(t => t.id || t.track?.id).filter(Boolean);
    let tracks = [];

    if (trackIds.length > 0) {
      const hasFullTracks = rawTracks[0]?.track?.title || rawTracks[0]?.title;
      if (hasFullTracks) {
        tracks = rawTracks.map(item => {
          const t = item.track || item;
          const cover = t.coverUri
            ? 'https://' + t.coverUri.replace('%%', '400x400')
            : t.albums?.[0]?.coverUri
            ? 'https://' + t.albums[0].coverUri.replace('%%', '400x400')
            : '';
          return {
            id: t.id,
            title: t.title,
            version: t.version || '',
            artists: (t.artists || []).map(a => a.name).join(', '),
            durationMs: t.durationMs || 0,
            coverUri: cover,
            explicit: Boolean(t.contentWarning === 'explicit' || t.explicit),
            isLiberty: Boolean(libertyTracks && libertyTracks[String(t.id)]),
            track: t
          };
        });
      } else {
        const chunkSize = 200;
        for (let i = 0; i < trackIds.length; i += chunkSize) {
          const chunk = trackIds.slice(i, i + chunkSize);
          const tracksRes = await fetch('https://api.music.yandex.net/tracks', {
            method: 'POST',
            headers: {
              ...this.getHeaders(token),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `track-ids=${chunk.join(',')}`
          });
          const tracksData = await tracksRes.json();
          const batch = (tracksData.result || []).map(t => {
            const cover = t.coverUri
              ? 'https://' + t.coverUri.replace('%%', '400x400')
              : t.albums?.[0]?.coverUri
              ? 'https://' + t.albums[0].coverUri.replace('%%', '400x400')
              : '';
            return {
              id: t.id,
              title: t.title,
              version: t.version || '',
              artists: (t.artists || []).map(a => a.name).join(', '),
              durationMs: t.durationMs || 0,
              coverUri: cover,
              explicit: Boolean(t.contentWarning === 'explicit' || t.explicit),
              isLiberty: Boolean(libertyTracks && libertyTracks[String(t.id)]),
              track: t
            };
          });
          tracks.push(...batch);
        }
      }
    }

    return {
      title: pl.title,
      coverUri: pl.cover?.uri ? 'https://' + pl.cover.uri.replace('%%', '400x400') : 'favicon.png',
      tracks
    };
  },

  async addTrackToPlaylist(kind, trackId, albumId, token) {
    if (isLocal) {
      const res = await fetch('/api/playlist-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, trackId, albumId, token })
      });
      return res.json();
    }

    const uid = await this.getUid(token);
    const plRes = await fetch(`https://api.music.yandex.net/users/${uid}/playlists/${kind}`, { headers: this.getHeaders(token) });
    const plData = await plRes.json();
    const revision = plData.result?.revision || 0;

    const trackObj = { id: String(trackId) };
    if (albumId) trackObj.albumId = String(albumId);

    const diff = JSON.stringify([{ op: 'insert', at: 0, tracks: [trackObj] }]);
    const res = await fetch(`https://api.music.yandex.net/users/${uid}/playlists/${kind}/change-relative`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(token),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `diff=${encodeURIComponent(diff)}&revision=${revision}`
    });
    return { success: res.ok };
  },

  async like(trackId, action, token) {
    if (isLocal) {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, action, token })
      });
      return res.json();
    }

    const uid = await this.getUid(token);
    const endpoint = action === 'like' ? 'add-multiple' : 'remove';
    const res = await fetch(`https://api.music.yandex.net/users/${uid}/likes/tracks/${endpoint}`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(token),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `track-ids=${trackId}`
    });
    return { success: res.ok };
  },

  async getFeed(token) {
    if (isLocal) {
      const res = await fetch(`/api/feed?token=${encodeURIComponent(token || '')}`);
      return res.json();
    }

    try {
      const libertyTracks = await this.getLibertyList();
      const extractedTracks = [];
      const seenTrackIds = new Set();

      function addTrack(t, source = 'Новинка') {
        if (!t || !t.id) return;
        const idStr = String(t.id);
        if (seenTrackIds.has(idStr)) return;
        seenTrackIds.add(idStr);

        const cover = t.coverUri
          ? 'https://' + t.coverUri.replace('%%', '400x400')
          : t.albums?.[0]?.coverUri
          ? 'https://' + t.albums[0].coverUri.replace('%%', '400x400')
          : '';

        extractedTracks.push({
          id: idStr,
          title: t.title,
          version: t.version || '',
          artists: (t.artists || []).map(a => a.name).join(', '),
          durationMs: t.durationMs || 0,
          coverUri: cover,
          explicit: Boolean(t.contentWarning === 'explicit' || t.explicit),
          isLiberty: Boolean(libertyTracks && libertyTracks[idStr]),
          source: source,
          track: t
        });
      }

      // 1. Официальный плейлист редакции Яндекса «Громкие новинки месяца» (103372440:1175)
      try {
        const plRes = await fetch('https://api.music.yandex.net/users/103372440/playlists/1175', {
          headers: this.getHeaders(token)
        });
        const plData = await plRes.json();
        const items = plData.result?.tracks || [];
        for (const item of items.slice(0, 30)) {
          const t = item.track || item;
          addTrack(t, 'Новинка');
        }
      } catch (plErr) {
        console.warn('Feed 1175 error:', plErr);
      }

      // 2. Если мало треков, дополняем «Громкие новинки: поп» (103372440:2440)
      if (extractedTracks.length < 15) {
        try {
          const popRes = await fetch('https://api.music.yandex.net/users/103372440/playlists/2440', {
            headers: this.getHeaders(token)
          });
          const popData = await popRes.json();
          const items = popData.result?.tracks || [];
          for (const item of items.slice(0, 20)) {
            const t = item.track || item;
            addTrack(t, 'Новинка');
          }
        } catch (popErr) {
          console.warn('Feed 2440 error:', popErr);
        }
      }

      return {
        tracks: extractedTracks.slice(0, 30),
        generatedPlaylists: []
      };
    } catch (e) {
      console.error('getFeed error:', e);
      return { tracks: [], generatedPlaylists: [] };
    }
  },


  async authDeviceCode() {
    if (isLocal) {
      const res = await fetch('/api/auth?action=code');
      return res.json();
    }

    const body = new URLSearchParams({
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET,
      device_id: 'ym_client_' + Math.random().toString(36).substring(2, 12),
      device_name: 'Yandex Music Mobile'
    });
    const res = await fetch('https://oauth.yandex.ru/device/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    return res.json();
  },

  async authDevicePoll(device_code) {
    if (isLocal) {
      const res = await fetch(`/api/auth?action=poll&device_code=${encodeURIComponent(device_code)}`);
      return res.json();
    }

    const body = new URLSearchParams({
      grant_type: 'device_code',
      code: device_code,
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET
    });
    try {
      const res = await fetch('https://oauth.yandex.ru/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      const data = await res.json();
      if (data.access_token) {
        return { status: 'success', access_token: data.access_token };
      }
      if (data.error === 'authorization_pending') {
        return { status: 'pending' };
      }
      return { status: 'error', error: data.error, error_description: data.error_description };
    } catch(e) {
      return { status: 'pending' };
    }
  }
};
