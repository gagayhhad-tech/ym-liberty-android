#!/usr/bin/env node

/**
 * Local Yandex Music download diagnostic.
 *
 * Usage:
 *   node tools/test-yandex-download.js 155854302 lossless
 *
 * The token is read from YANDEX_TOKEN or requested interactively.
 * It is never printed, written to disk, or included in error messages.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const trackId = String(process.argv[2] || '');
const quality = String(process.argv[3] || 'lossless');
const codecs = 'flac,aac,he-aac,mp3,flac-mp4,aac-mp4,he-aac-mp4';
const codecSign = codecs.replaceAll(',', '');
const transports = 'encraw';
const secret = 'kzqU4XhfCaY6B6JTHODeq5';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function askToken() {
  if (process.env.YANDEX_TOKEN) return Promise.resolve(process.env.YANDEX_TOKEN.trim());
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write('Yandex OAuth token (input is hidden): ');
    stdin.setRawMode?.(true);
    stdin.resume();
    let value = '';
    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      for (const char of text) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(value.trim());
          return;
        }
        if (char === '\u0003') {
          stdout.write('\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdin.on('data', onData);
  });
}

function authHeader(token) {
  const raw = token.replace(/^OAuth\s+/i, '').replace(/^Bearer\s+/i, '').trim();
  return raw ? `OAuth ${raw}` : '';
}

function getSign(data) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64').slice(0, -1);
}

async function main() {
  if (!trackId) {
    fail('track id is required');
    return;
  }
  if (!['lossless', 'nq', 'lq'].includes(quality)) {
    fail('quality must be lossless, nq, or lq');
    return;
  }

  const token = await askToken();
  if (!token) {
    fail('empty token');
    return;
  }

  const ts = Math.floor(Date.now() / 1000);
  const signData = `${ts}${trackId}${quality}${codecSign}${transports}`;
  const sign = getSign(signData);
  const url = new URL('https://api.music.yandex.net/get-file-info');
  url.searchParams.set('ts', String(ts));
  url.searchParams.set('trackId', trackId);
  url.searchParams.set('quality', quality);
  url.searchParams.set('codecs', codecs);
  url.searchParams.set('transports', transports);
  url.searchParams.set('sign', sign);

  const headers = {
    Authorization: authHeader(token),
    'X-Yandex-Music-Client': 'YandexMusicDesktopAppWindows/2.2.0',
    'X-Yandex-Music-Frontend': 'new',
    'X-Yandex-Music-Without-Invocation-Info': '1',
    Accept: 'application/json',
  };

  console.log(`Checking track ${trackId}, quality ${quality}...`);
  const infoResponse = await fetch(url, { headers });
  const infoText = await infoResponse.text();
  let info;
  try {
    info = JSON.parse(infoText);
  } catch {
    fail(`get-file-info returned non-JSON HTTP ${infoResponse.status}`);
    return;
  }
  console.log(`get-file-info HTTP: ${infoResponse.status}`);
  if (!infoResponse.ok || !info.downloadInfo) {
    console.log(`API error: ${info.error || info.message || 'downloadInfo is missing'}`);
    fail('file info request failed');
    return;
  }

  const downloadInfo = info.downloadInfo;
  const mediaUrl = new URL(downloadInfo.url);
  console.log(`Media host: ${mediaUrl.hostname}`);
  console.log(`Codec: ${downloadInfo.codec || 'unknown'}`);
  console.log(`Key bytes: ${Buffer.from(downloadInfo.key, 'hex').length}`);

  const mediaResponse = await fetch(downloadInfo.url, {
    headers: {
      'User-Agent': 'YandexMusicAndroid/24023621',
      Accept: 'audio/*,*/*;q=0.8',
    },
  });
  const encrypted = Buffer.from(await mediaResponse.arrayBuffer());
  console.log(`Media HTTP: ${mediaResponse.status}, encrypted bytes: ${encrypted.length}`);
  if (!mediaResponse.ok) {
    fail('media request failed');
    return;
  }

  const key = Buffer.from(downloadInfo.key, 'hex');
  const iv = Buffer.alloc(16);
  const decipher = crypto.createDecipheriv('aes-128-ctr', key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const extension = String(downloadInfo.codec || '').includes('flac') ? 'flac' : 'mp3';
  const outputDir = path.join(__dirname, '..', 'scratch');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `yandex-download-test-${trackId}.${extension}`);
  fs.writeFileSync(outputPath, decrypted);

  console.log(`Decrypted bytes: ${decrypted.length}`);
  console.log(`Saved diagnostic file: ${outputPath}`);
  console.log('OK: API, media download, and AES-CTR decryption passed.');
}

main().catch((error) => {
  fail(error && error.message ? error.message : 'unexpected diagnostic error');
});
