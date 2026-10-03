import { Platform, Linking, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

/**
 * Checks if a document is an image format that can be rendered inline.
 */
export function isImageDocument(document) {
  if (!document) return false;
  const mime = (document.mime_type || '').toLowerCase();
  const format = (document.format || '').toLowerCase();
  return (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp'].includes(format)
  );
}

/**
 * Gets a clean filename for saving or downloading.
 */
export function getCleanFileName(document) {
  const base = document?.original_filename || document?.title || 'document';
  const ext = document?.format || '';
  const existingExt = (base.split('.').pop() || '').toLowerCase();
  const knownExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'txt', 'gif', 'bmp'];

  // If the base already has a recognized file extension, don't append another one
  // (e.g., "Certificate.jpg" with format "pdf" should stay "Certificate.jpg", not "Certificate.jpg.pdf")
  if (knownExts.includes(existingExt)) {
    return base;
  }

  if (ext && !base.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
    return `${base}.${ext}`;
  }
  return base;
}

/**
 * Resolves the active access URI / URL of the document.
 */
export function getDocumentUri(document) {
  return document?.cloudinary_url
    || document?.file_url
    || document?.verification_url
    || document?.uri
    || document?.url
    || '';
}

/**
 * Returns the remote (http/https) URL of a document if one exists.
 * Checks cloudinary_url first, then uri/url fields.
 */
function getRemoteUrl(document) {
  const candidates = [
    document?.cloudinary_url,
    document?.file_url,
    document?.verification_url,
    document?.uri,
    document?.url,
  ];
  for (const c of candidates) {
    if (c && (c.startsWith('http://') || c.startsWith('https://'))) {
      return c;
    }
  }
  return null;
}

function resolveMimeType(document) {
  const mime = (document?.mime_type || '').toLowerCase();
  const fileName = document?.original_filename || document?.title || '';
  const ext = (document?.format || fileName.split('.').pop() || '').toLowerCase();

  const map = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    txt: 'text/plain',
  };

  if (map[ext]) return map[ext];
  if (mime && mime !== 'application/octet-stream') return mime;
  return 'application/octet-stream';
}

/**
 * Ensures a file URI is placed within the app's accessible cache directory
 * so that Android FileProvider and expo-sharing have guaranteed READ permissions.
 */
async function prepareFileForSharing(sourceUri, fileName) {
  const sanitizedName = (fileName || 'document.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetUri = `${FileSystem.cacheDirectory}share_${Date.now()}_${sanitizedName}`;

  if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
    let downloadRes;
    try {
      downloadRes = await FileSystem.downloadAsync(sourceUri, targetUri);
    } catch (e) {
      downloadRes = { status: 500 };
    }

    if (downloadRes.status !== 200 && downloadRes.status !== 206) {
      // Cloudinary PDF fallback: If direct PDF delivery returns 401/403 ACL error,
      // Cloudinary delivers high-res converted JPEG automatically
      if (sourceUri.includes('res.cloudinary.com') && /\.pdf($|\?)/i.test(sourceUri)) {
        const jpgUrl = sourceUri.replace(/\.pdf($|\?)/i, '.jpg$1');
        const jpgTargetUri = targetUri.replace(/\.pdf$/i, '.jpg');
        try {
          const fallbackRes = await FileSystem.downloadAsync(jpgUrl, jpgTargetUri);
          if (fallbackRes.status === 200 || fallbackRes.status === 206) {
            return jpgTargetUri;
          }
        } catch {}
      }
      throw new Error(`Failed to download remote document (Status ${downloadRes.status})`);
    }
    return targetUri;
  }

  // 1. If already in app's internal scoped storage, verify existence
  if (
    (FileSystem.documentDirectory && sourceUri.startsWith(FileSystem.documentDirectory)) ||
    (FileSystem.cacheDirectory && sourceUri.startsWith(FileSystem.cacheDirectory))
  ) {
    try {
      const info = await FileSystem.getInfoAsync(sourceUri);
      if (info.exists) {
        return sourceUri;
      }
    } catch {
      // Continue to copy/fetch fallbacks
    }
  }

  // 2. Try standard FileSystem.copyAsync
  try {
    await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
    return targetUri;
  } catch (copyErr) {
    console.warn('[documentViewer] copyAsync notice, trying native fetch read:', copyErr?.message || copyErr);
  }

  // 3. Fallback: Native fetch read (bypasses Expo Go unscoped DocumentPicker path rejection)
  try {
    const res = await fetch(sourceUri);
    const blob = await res.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const commaIdx = result.indexOf(',');
          resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
        } else {
          reject(new Error('FileReader did not return a string'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });

    if (base64) {
      await FileSystem.writeAsStringAsync(targetUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return targetUri;
    }
  } catch (fetchErr) {
    console.warn('[documentViewer] Native fetch read notice:', fetchErr?.message || fetchErr);
  }

  // 4. File is truly missing (e.g. wiped by Android OS cache cleaner across app reloads)
  throw new Error(
    'This document was stored in temporary cache from a previous session and is no longer available on this device.\n\nPlease upload the file again to store it permanently in your vault.'
  );
}

/**
 * Converts a `file://` URI from the Expo cache/document directory into a
 * `content://` URI via Expo's built-in FileProvider so that external apps
 * (Google Drive, Adobe Reader, etc.) can READ the file without triggering
 * Android's `FileUriExposedException`.
 *
 * Uses FileSystem.getContentUriAsync (available in expo-file-system).
 */
async function getContentUri(fileUri) {
  try {
    if (FileSystem.getContentUriAsync) {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      return contentUri;
    }
  } catch (err) {
    console.warn('[documentViewer] getContentUriAsync failed:', err?.message || err);
  }
  return fileUri;
}

/**
 * Cleanly formats errors for user presentation, stripping raw Java/native stack traces.
 */
function formatUserError(error) {
  const msg = error?.message || '';
  if (msg.includes('readable') || msg.includes('copyAsync') || msg.includes('temporary cache')) {
    return 'This document was stored in temporary cache from a previous session and has expired. Please re-upload the document to secure it in permanent storage.';
  }
  if (msg.includes('ECONNRESET') || msg.includes('Network') || msg.includes('network')) {
    return 'Network connection was interrupted. Please check your internet connection and try again.';
  }
  if (msg.includes('Failed to download')) {
    return 'Could not download this document from the cloud. Please check your internet connection and try again.';
  }
  return msg || 'Could not access this document.';
}

/**
 * Opens or views a document using the correct Android intent.
 *
 * KEY FIX: Previously used `Sharing.shareAsync()` which fires Android `ACTION_SEND`.
 * When the user picked "Drive" from the share sheet, Android interpreted it as
 * "upload this file TO Drive" — showing the "Upload to Drive" dialog.
 *
 * NEW BEHAVIOR:
 * - Remote URLs (Cloudinary/Supabase): Opens directly via `Linking.openURL(url)`
 *   → The browser or default app handles the file natively (PDF viewer, image viewer, etc.)
 *   → No download step, no share sheet, no upload prompt.
 *
 * - Local files: Uses `expo-intent-launcher` with `ACTION_VIEW` intent + correct MIME type
 *   → Android opens the file directly in the chosen app (Drive viewer, Adobe, Docs, etc.)
 *   → Drive opens the document for VIEWING, not uploading.
 *
 * - For Web: opens the URL in a new browser tab.
 */
export async function viewOrOpenDocument(document) {
  const uri = getDocumentUri(document);
  if (!uri) {
    Alert.alert('Document Unavailable', 'This document does not have a valid file address.');
    return { success: false, error: 'No URI' };
  }

  const fileName = getCleanFileName(document);

  // ── Web ──
  if (Platform.OS === 'web') {
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      window.open(uri, '_blank', 'noopener,noreferrer');
      return { success: true };
    }
    const a = window.document.createElement('a');
    a.href = uri;
    a.target = '_blank';
    a.rel = 'noopener,noreferrer';
    a.click();
    return { success: true };
  }

  // ── Native: Android / iOS ──
  try {
    const mimeType = resolveMimeType(document);
    const isWordDocument = ['docx', 'doc'].includes((document.format || '').toLowerCase()) ||
      mimeType.includes('word') ||
      mimeType.includes('officedocument');

    const remoteUrl = getRemoteUrl(document);
    const isCloudinaryPdf = remoteUrl && remoteUrl.includes('res.cloudinary.com') && /\.pdf($|\?)/i.test(remoteUrl);

    // Strategy 1: For standard remote web documents, open directly via Linking.
    // Cloudinary PDFs and Office docs are routed to Strategy 2 (local cache + ACTION_VIEW intent)
    // so Android opens native PDF/Word viewers and automatically falls back if CDN ACL denies raw PDF.
    if (remoteUrl && !isWordDocument && !isCloudinaryPdf) {
      console.log('[documentViewer] Opening remote URL directly:', remoteUrl);
      const canOpen = await Linking.canOpenURL(remoteUrl);
      if (canOpen) {
        await Linking.openURL(remoteUrl);
        return { success: true };
      }
      console.warn('[documentViewer] Linking.canOpenURL returned false for remote URL, falling back to local open');
    }

    // Strategy 2: Prepare a local cached copy and open with ACTION_VIEW intent.
    // This fires the Android "Open with" chooser where apps RECEIVE the file for VIEWING
    // (e.g., Microsoft Word, Google Docs, Adobe Acrobat, Drive PDF Viewer, Photos).
    const shareableUri = await prepareFileForSharing(uri, fileName);

    // Derive effective MIME type from the actual prepared file extension
    // (e.g., if Cloudinary PDF fallback downloaded a .jpg, use image/jpeg so PDF reader is not mistakenly launched)
    const fileExt = (shareableUri.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
    const effectiveMimeType = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
    }[fileExt] || mimeType || 'application/octet-stream';

    if (Platform.OS === 'android') {
      try {
        const contentUri = await getContentUri(shareableUri);
        console.log('[documentViewer] Opening with ACTION_VIEW intent:', contentUri, effectiveMimeType);

        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          type: effectiveMimeType,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        });
        return { success: true };
      } catch (intentErr) {
        console.warn('[documentViewer] IntentLauncher ACTION_VIEW notice, trying Sharing fallback:', intentErr?.message || intentErr);
      }
    }

    // Strategy 3 (iOS or Android fallback): Use Sharing.shareAsync as last resort.
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(shareableUri, {
        mimeType: effectiveMimeType,
        dialogTitle: `Open ${document.title || fileName}`,
        UTI: effectiveMimeType === 'application/pdf' ? 'com.adobe.pdf' : effectiveMimeType === 'image/jpeg' ? 'public.jpeg' : undefined,
      });
      return { success: true };
    }

    // Strategy 4: Direct Linking as absolute fallback
    const canOpen = await Linking.canOpenURL(shareableUri);
    if (canOpen) {
      await Linking.openURL(shareableUri);
      return { success: true };
    }

    Alert.alert('Document Ready', `Document has been prepared but no viewer app was found for this file type (${mimeType}).`);
    return { success: true };
  } catch (error) {
    console.warn('[documentViewer] Error opening document:', error?.message || error);
    Alert.alert('Cannot Open Document', formatUserError(error));
    return { success: false, error: error?.message };
  }
}

/**
 * Downloads and exports a document to device storage or user files.
 *
 * Strategy:
 * 1. Android: Uses Storage Access Framework (SAF) to let users pick any folder.
 *    If user selects a restricted folder (like Downloads on Android 11+) or cancels,
 *    gracefully falls back to the native Share/Export sheet ("Save to Files / Drive").
 * 2. iOS / Android fallback: Opens the native share/export sheet.
 */
export async function downloadDocumentToDevice(document) {
  const uri = getDocumentUri(document);
  if (!uri) {
    Alert.alert('Download Error', 'This document does not have a valid download address.');
    return { success: false, error: 'No URI' };
  }

  const fileName = getCleanFileName(document);

  // ── Web ──
  if (Platform.OS === 'web') {
    try {
      const a = window.document.createElement('a');
      a.href = uri;
      a.download = fileName;
      a.target = '_blank';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      return { success: true };
    } catch {
      window.open(uri, '_blank');
      return { success: true };
    }
  }

  // ── Native: Android / iOS ──
  try {
    const shareableUri = await prepareFileForSharing(uri, fileName);
    const mimeType = resolveMimeType(document);

    // Android: Try Storage Access Framework to write directly to device storage
    if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
      try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64Data = await FileSystem.readAsStringAsync(shareableUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            mimeType
          );
          await FileSystem.writeAsStringAsync(safFileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Alert.alert(
            'Download Complete ✅',
            `"${fileName}" has been saved successfully to your selected folder.`
          );
          return { success: true, localFilePath: safFileUri };
        }
      } catch (safError) {
        console.warn('[documentViewer] SAF direct save notice, falling back to share sheet:', safError?.message || safError);
      }
    }

    // iOS or Android fallback: Share sheet (allows "Save to Files", "Google Drive", "AirDrop", etc.)
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(shareableUri, {
        mimeType: mimeType,
        dialogTitle: `Save or Export "${fileName}"`,
        UTI: document.format === 'pdf' ? 'com.adobe.pdf' : undefined,
      });
      return { success: true, localFilePath: shareableUri };
    }

    Alert.alert('Saved to App Vault', `"${fileName}" is safely stored in your offline vault.`);
    return { success: true, localFilePath: shareableUri };
  } catch (error) {
    console.warn('[documentViewer] Error downloading document:', error?.message || error);
    Alert.alert('Download Failed', formatUserError(error));
    return { success: false, error: error?.message };
  }
}
