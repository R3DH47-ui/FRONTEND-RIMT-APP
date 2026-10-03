import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Standard SHA-1 implementation in pure JavaScript.
 * Ensures zero dependency issues on any platform (Android, iOS, Web).
 */
export function sha1(message = '') {
  function rotateLeft(n, s) {
    return (n << s) | (n >>> (32 - s));
  }
  function cvtHex(val) {
    let str = '';
    for (let i = 7; i >= 0; i--) {
      const v = (val >>> (i * 4)) & 0x0f;
      str += v.toString(16);
    }
    return str;
  }

  const utf8 = unescape(encodeURIComponent(message));
  const words = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  const bitLength = utf8.length * 8;
  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  let H0 = 0x67452301;
  let H1 = 0xefcdab89;
  let H2 = 0x98badcfe;
  let H3 = 0x10325476;
  let H4 = 0xc3d2e1f0;

  const W = new Array(80);
  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      W[t] = words[i + t] | 0;
    }
    for (let t = 16; t < 80; t++) {
      W[t] = rotateLeft(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }

    let A = H0;
    let B = H1;
    let C = H2;
    let D = H3;
    let E = H4;

    for (let t = 0; t < 80; t++) {
      let f, k;
      if (t < 20) {
        f = (B & C) | (~B & D);
        k = 0x5a827999;
      } else if (t < 40) {
        f = B ^ C ^ D;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (B & C) | (B & D) | (C & D);
        k = 0x8f1bbcdc;
      } else {
        f = B ^ C ^ D;
        k = 0xca62c1d6;
      }
      const temp = (rotateLeft(A, 5) + f + E + k + W[t]) | 0;
      E = D;
      D = C;
      C = rotateLeft(B, 30);
      B = A;
      A = temp;
    }

    H0 = (H0 + A) | 0;
    H1 = (H1 + B) | 0;
    H2 = (H2 + C) | 0;
    H3 = (H3 + D) | 0;
    H4 = (H4 + E) | 0;
  }

  return (cvtHex(H0) + cvtHex(H1) + cvtHex(H2) + cvtHex(H3) + cvtHex(H4)).toLowerCase();
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Converts Base64 string directly to an ArrayBuffer in JS memory.
 * Bypasses native C++ / Java descriptor access so permission rejections never happen.
 */
export function base64ToArrayBuffer(base64 = '') {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const bufferLength = Math.floor(len * 0.75) - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0);
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = BASE64_CHARS.indexOf(clean[i]);
    const encoded2 = BASE64_CHARS.indexOf(clean[i + 1]);
    const encoded3 = BASE64_CHARS.indexOf(clean[i + 2]);
    const encoded4 = BASE64_CHARS.indexOf(clean[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== -1 && p < bufferLength) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== -1 && p < bufferLength) {
      bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }
  }
  return arrayBuffer;
}

/**
 * Ensures an Android content:// URI or external URI is copied to the app's local sandbox
 * vault directory so that standard file operations have full local read permissions and
 * are guaranteed to persist permanently across app reloads.
 */
export async function ensureLocalAccessibleUri(uri, fileName = 'file.bin') {
  if (Platform.OS === 'web' || !uri) return uri;
  if (FileSystem.documentDirectory && uri.startsWith(FileSystem.documentDirectory)) return uri;
  if (FileSystem.cacheDirectory && uri.startsWith(FileSystem.cacheDirectory)) return uri;
  return await persistFileToPermanentStorage(uri, fileName);
}

/**
 * Persists a file into the permanent document directory of the app.
 * Guarantees that documents saved on device are never deleted by cache sweepers.
 */
export async function persistFileToPermanentStorage(uri, fileName = 'file.bin') {
  if (Platform.OS === 'web' || !uri) return uri;
  try {
    const sanitizedName = (fileName || 'document.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetDir = `${FileSystem.documentDirectory}rimt_vault/`;
    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }
    const target = `${targetDir}${Date.now()}_${sanitizedName}`;

    // 1. Copy through the native file API. Android content:// picker URIs can
    // use their temporary read grant to move into app-owned storage.
    try {
      await FileSystem.copyAsync({ from: uri, to: target });
      return target;
    } catch (copyError) {
      console.warn('[fileUtils] copyAsync notice, trying a base64 file read:', copyError?.message || copyError);
    }

    // Reading through FileSystem avoids React Native Blob's base64 bridge.
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!base64) throw new Error('The selected file was empty or unreadable.');
      await FileSystem.writeAsStringAsync(target, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return target;
    } catch (readError) {
      throw new Error(`Could not access the selected file: ${readError?.message || readError}`);
    }
  } catch (error) {
    throw new Error(`Could not prepare the selected file for upload: ${error?.message || error}`);
  }
}

/**
 * Reads file binary data across Web and Native (Android/iOS) safely.
 * Picker cache URIs are read in place rather than copied a second time.
 */
export async function getFileArrayBuffer(uri, asset) {
  if (Platform.OS === 'web') {
    if (asset?.file && typeof asset.file.arrayBuffer === 'function') {
      return await asset.file.arrayBuffer();
    }
    const response = await fetch(uri);
    return await response.arrayBuffer();
  }

  // Native: Android / iOS
  const localUri = await ensureLocalAccessibleUri(uri, asset?.name || asset?.fileName);
  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToArrayBuffer(base64);
  } catch (error) {
    // Fetch directly as binary; converting through Blob adds an unnecessary base64 round trip.
    try {
      const response = await fetch(localUri);
      if (!response.ok) {
        throw new Error(`Could not read selected file (HTTP ${response.status}).`);
      }
      return await response.arrayBuffer();
    } catch {
      throw error;
    }
  }
}
