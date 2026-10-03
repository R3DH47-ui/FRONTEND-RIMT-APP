import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { ensureLocalAccessibleUri } from '../utils/fileUtils';

const DOCUMENTS_TABLE = 'student_documents';
const LOCAL_DOCUMENTS_PREFIX = '@rimt_student_documents_';

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'cka7ipqa';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
const CLOUDINARY_SIGNING_URL = process.env.EXPO_PUBLIC_CLOUDINARY_SIGNING_URL || '';

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'text/plain',
  'application/octet-stream',
  '*/*',
];

const normalizeRollNo = (rollNo) => (rollNo || '').trim().toUpperCase();
const isProjectLogo = (document) => String(document?.document_type || '').toUpperCase() === 'PROJECT_LOGO';
const localKey = (rollNo) => `${LOCAL_DOCUMENTS_PREFIX}${normalizeRollNo(rollNo)}`;

const readLocalDocuments = async (rollNo) => {
  try {
    const raw = await AsyncStorage.getItem(localKey(rollNo));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLocalDocuments = async (rollNo, documents) => {
  await AsyncStorage.setItem(localKey(rollNo), JSON.stringify(documents));
};

const getFileExtension = (name = '') => {
  const extension = name.split('.').pop()?.toLowerCase();
  return ['docx', 'doc', 'pdf', 'txt', 'jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'].includes(extension)
    ? extension
    : '';
};

const getContentType = (extension, providedType) => {
  const extensionTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  return extensionTypes[extension] || (providedType && providedType !== 'application/octet-stream' ? providedType : 'application/octet-stream');
};

export const formatDocumentSize = (bytes) => {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getDocumentIcon = (document) => (
  document.mime_type?.startsWith('image/')
    ? 'image'
    : document.mime_type === 'application/pdf' || document.format === 'pdf'
    ? 'picture-as-pdf'
    : 'description'
);

export const listStudentDocuments = async (rollNo) => {
  const normalizedRoll = normalizeRollNo(rollNo);
  if (!normalizedRoll) return { success: false, documents: [], error: 'No active student.' };

  let localDocs = (await readLocalDocuments(normalizedRoll)).filter((document) => !isProjectLogo(document));
  let remoteDocs = [];
  let projectLogoUrls = new Set();

  // 1. Try student_documents table if it exists
  try {
    const { data, error } = await supabase
      .from(DOCUMENTS_TABLE)
      .select('*')
      .eq('roll_no', normalizedRoll)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      remoteDocs = data.filter((document) => !isProjectLogo(document));
    }
  } catch (error) {
    console.warn('[documentService] Supabase list exception notice:', error?.message || error);
  }

  // 2. Also check students.admin_notes in Supabase for cloud-synced certificates
  try {
    const { data: studentData, error: sErr } = await supabase
      .from('students')
      .select('admin_notes, resume_url, projects')
      .ilike('roll_no', normalizedRoll)
      .maybeSingle();

    if (!sErr && studentData?.admin_notes) {
      try {
        const parsed = JSON.parse(studentData.admin_notes);
        if (Array.isArray(parsed?.certificates) && parsed.certificates.length > 0) {
          const seen = new Set(remoteDocs.map((d) => d.id || d.cloudinary_public_id || d.url));
          parsed.certificates.forEach((c) => {
            if (isProjectLogo(c)) return;
            const cId = c.id || c.cloudinary_public_id || c.url;
            if (!seen.has(cId)) {
              seen.add(cId);
              remoteDocs.push(c);
            }
          });
        }
      } catch {}
    }

    if (!sErr && studentData?.projects) {
      let projects = studentData.projects;
      if (typeof projects === 'string') {
        try {
          projects = JSON.parse(projects);
        } catch {
          projects = [];
        }
      }
      if (Array.isArray(projects)) {
        projectLogoUrls = new Set(projects.map((project) => project?.logo_url || project?.logoUrl).filter(Boolean));
      }
    }

    if (!sErr && studentData?.resume_url) {
      const isUnsplash = typeof studentData.resume_url === 'string' && studentData.resume_url.includes('images.unsplash.com');
      if (isUnsplash) {
        // Automatically sanitize dummy unsplash resume_url from Supabase
        supabase
          .from('students')
          .update({ resume_url: null, updated_at: new Date().toISOString() })
          .ilike('roll_no', normalizedRoll)
          .then(() => {})
          .catch(() => {});
      } else {
        const seen = new Set(remoteDocs.map((d) => d.url || d.cloudinary_url));
        if (!projectLogoUrls.has(studentData.resume_url) && !seen.has(studentData.resume_url)) {
          remoteDocs.push({
            id: `resume_${normalizedRoll}`,
            title: 'Official Academic Resume / Credential',
            original_filename: 'resume.pdf',
            mime_type: /\.(jpg|jpeg|png|webp)/i.test(studentData.resume_url) ? 'image/jpeg' : 'application/pdf',
            format: /\.(jpg|jpeg|png|webp)/i.test(studentData.resume_url) ? 'image' : 'pdf',
            cloudinary_url: studentData.resume_url,
            url: studentData.resume_url,
            status: 'Verified',
            storage_provider: 'supabase',
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[documentService] Supabase student check notice:', err?.message || err);
  }

  remoteDocs = remoteDocs.filter((document) => {
    const url = document.url || document.cloudinary_url || document.file_url;
    return !isProjectLogo(document) && (!url || !projectLogoUrls.has(url));
  });
  localDocs = localDocs.filter((document) => {
    const url = document.url || document.cloudinary_url || document.file_url;
    return !isProjectLogo(document) && (!url || !projectLogoUrls.has(url));
  });

  if (remoteDocs.length > 0) {
    const remoteIds = new Set(remoteDocs.map((d) => d.id || d.cloudinary_public_id || d.url));
    const unsyncedLocal = localDocs.filter(
      (d) => !remoteIds.has(d.id) && !remoteIds.has(d.cloudinary_public_id) && !remoteIds.has(d.url)
    );
    const merged = [...remoteDocs, ...unsyncedLocal];
    // Cache merged for offline
    await writeLocalDocuments(normalizedRoll, merged);
    return { success: true, documents: merged, source: 'supabase' };
  }

  return { success: true, documents: localDocs, source: 'local' };
};

const saveDocumentMetadata = async (document) => {
  let savedToRemote = false;
  let resultDoc = { ...document };
  let remoteSaveError = null;

  // 1. Try student_documents table
  try {
    const insertDocument = { ...document };
    delete insertDocument.id;
    let { data, error } = await supabase
      .from(DOCUMENTS_TABLE)
      .insert(insertDocument)
      .select()
      .single();

    if (error?.code === 'PGRST204') {
      const legacyDocument = { ...insertDocument };
      delete legacyDocument.storage_provider;
      ({ data, error } = await supabase
        .from(DOCUMENTS_TABLE)
        .insert(legacyDocument)
        .select()
        .single());
    }

    if (!error && data) {
      savedToRemote = true;
      resultDoc = data;
    } else if (error) {
      remoteSaveError = error;
    }
  } catch (dbError) {
    remoteSaveError = dbError;
    console.warn('[documentService] Supabase document insert notice:', dbError?.message || dbError);
  }

  // 2. Sync to students.admin_notes JSON — ONLY if we have a real remote URL (never file://)
  const remoteUrl = (resultDoc.url || resultDoc.cloudinary_url || '');
  const hasRemoteUrl = remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://');

  if (hasRemoteUrl) {
    try {
      const { data: curStudent, error: studentReadError } = await supabase
        .from('students')
        .select('admin_notes, resume_url, projects')
        .ilike('roll_no', document.roll_no)
        .maybeSingle();
      if (studentReadError) throw studentReadError;
      if (!curStudent) throw new Error(`No Supabase student record found for ${document.roll_no}.`);

      let notesObj = {};
      if (curStudent?.admin_notes) {
        try { notesObj = JSON.parse(curStudent.admin_notes); } catch {}
      }
      if (!notesObj || typeof notesObj !== 'object') notesObj = {};

      // Strip any existing certs with file:// URLs while adding the new one
      const existingCerts = Array.isArray(notesObj.certificates) ? notesObj.certificates : [];
      const cleanedExisting = existingCerts.filter((c) => {
        if (isProjectLogo(c)) return false;
        const cUrl = c.url || c.cloudinary_url || '';
        if (cUrl.startsWith('file://')) return false; // discard broken local refs
        return c.id !== resultDoc.id && c.cloudinary_public_id !== resultDoc.cloudinary_public_id;
      });
      notesObj.certificates = [resultDoc, ...cleanedExisting];

      const studentUpdate = {
        admin_notes: JSON.stringify(notesObj),
        updated_at: new Date().toISOString(),
      };

      // Only set resume_url if it's a valid remote URL
      let studentProjects = curStudent?.projects || [];
      if (typeof studentProjects === 'string') {
        try {
          studentProjects = JSON.parse(studentProjects);
        } catch {
          studentProjects = [];
        }
      }
      const projectLogoUrls = new Set(
        (Array.isArray(studentProjects) ? studentProjects : [])
          .map((project) => project?.logo_url || project?.logoUrl)
          .filter(Boolean)
      );
      if (!curStudent?.resume_url || curStudent.resume_url.startsWith('file://') || projectLogoUrls.has(curStudent.resume_url)) {
        studentUpdate.resume_url = remoteUrl;
      }

      const { data: updatedStudent, error: studentUpdateError } = await supabase
        .from('students')
        .update(studentUpdate)
        .ilike('roll_no', document.roll_no)
        .select('roll_no')
        .maybeSingle();
      if (studentUpdateError) throw studentUpdateError;
      if (!updatedStudent) throw new Error('Supabase did not confirm saving the certificate metadata.');
      savedToRemote = true;
    } catch (syncErr) {
      remoteSaveError = syncErr;
      console.warn('[documentService] Student admin_notes sync notice:', syncErr?.message || syncErr);
    }
  }

  if (!savedToRemote) {
    return {
      success: false,
      error: `The file uploaded to Cloudinary, but its metadata could not be saved to Supabase: ${remoteSaveError?.message || 'No remote record was confirmed.'}`,
    };
  }

  // 3. Cache metadata locally after Supabase has confirmed the durable record.
  try {
    const localDoc = {
      ...resultDoc,
      id: resultDoc.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      storage_provider: resultDoc.storage_provider || 'cloudinary',
      created_at: resultDoc.created_at || new Date().toISOString(),
    };
    const existing = await readLocalDocuments(document.roll_no);
    const updated = [localDoc, ...existing.filter((d) => d.id !== localDoc.id && d.cloudinary_public_id !== localDoc.cloudinary_public_id)];
    await writeLocalDocuments(document.roll_no, updated);
    return { success: true, document: localDoc, source: 'supabase' };
  } catch (localErr) {
    return { success: false, error: 'File metadata could not be recorded: ' + (localErr?.message || localErr) };
  }
};

/**
 * Uploads through an unsigned preset or a server-generated signature.
 * Cloudinary secrets must never be bundled into the app.
 */
const tryCloudinaryUpload = async ({ asset, localUri, normalizedRoll, fileName, contentType, extension }) => {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME.');
  }

  if (!CLOUDINARY_UPLOAD_PRESET && !CLOUDINARY_SIGNING_URL) {
    throw new Error(
      'Cloudinary upload is not configured. Set EXPO_PUBLIC_CLOUDINARY_SIGNING_URL to the deployed admin portal /api/cloudinary/sign endpoint.'
    );
  }

  const safeRoll = normalizedRoll.replace(/[^A-Z0-9_-]/g, '_').slice(0, 32);
  const folder = `rimt-academic-trust/${safeRoll}`;
  let parameters;
  let cloudName = CLOUDINARY_CLOUD_NAME;

  if (CLOUDINARY_UPLOAD_PRESET) {
    parameters = { folder, upload_preset: CLOUDINARY_UPLOAD_PRESET };
  } else {
    const signingResponse = await fetch(CLOUDINARY_SIGNING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    });
    const signingResult = await signingResponse.json().catch(() => ({}));
    if (!signingResponse.ok) {
      throw new Error(signingResult.error || `Cloudinary signing failed (${signingResponse.status}).`);
    }
    if (!signingResult.signature || !signingResult.timestamp || !signingResult.api_key || !signingResult.cloud_name) {
      throw new Error('Cloudinary signing endpoint returned incomplete upload credentials.');
    }

    cloudName = signingResult.cloud_name;
    parameters = {
      folder: signingResult.folder || folder,
      timestamp: String(signingResult.timestamp),
      api_key: signingResult.api_key,
      signature: signingResult.signature,
    };
  }

  const targetUploadUrl = `https://api.cloudinary.com/v1_1/${cloudName || CLOUDINARY_CLOUD_NAME}/auto/upload`;
  if (Platform.OS === 'web') {
    const formData = new FormData();
    formData.append('file', asset.file || await fetch(localUri).then((response) => response.blob()), fileName);
    Object.entries(parameters).forEach(([key, value]) => formData.append(key, String(value)));

    const response = await fetch(targetUploadUrl, { method: 'POST', body: formData });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error || !result.secure_url) {
      throw new Error(result.error?.message || `Cloudinary upload failed (${response.status}).`);
    }
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format || extension,
      bytes: result.bytes || asset.size,
    };
  }

  const nativeResult = await FileSystem.uploadAsync(targetUploadUrl, localUri, {
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: contentType,
    httpMethod: 'POST',
    parameters,
  });
  const result = JSON.parse(nativeResult.body || '{}');
  if (nativeResult.status < 200 || nativeResult.status >= 300 || result.error || !result.secure_url) {
    throw new Error(result.error?.message || `Cloudinary upload failed (${nativeResult.status}).`);
  }
  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    resource_type: result.resource_type,
    format: result.format || extension,
    bytes: result.bytes || asset.size,
  };
};

export const uploadStudentDocument = async ({ asset, rollNo, title, documentType, issuer, credentialId }) => {
  const normalizedRoll = normalizeRollNo(rollNo);
  const mimeExtension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  }[asset?.mimeType?.toLowerCase()] || '';
  const uriName = asset?.uri?.split(/[?#]/)[0]?.split('/').pop() || '';
  const fileName = asset?.name || asset?.fileName || uriName || (mimeExtension ? `upload.${mimeExtension}` : '');
  const extension = getFileExtension(fileName);
  const contentType = getContentType(extension, asset?.mimeType);

  if (!normalizedRoll) return { success: false, error: 'Sign in before uploading a document.' };
  if (!asset?.uri || !fileName || !extension) {
    return { success: false, error: 'Choose a PDF, DOC, DOCX, TXT, JPG, PNG, WebP, MP4, WebM, or MOV file.' };
  }
  if (asset.size && asset.size > 20 * 1024 * 1024) {
    return { success: false, error: 'Documents must be 20 MB or smaller.' };
  }

  let localUri = asset.uri;

  try {
    // 1. Ensure file is locally accessible in sandbox cache on native
    localUri = await ensureLocalAccessibleUri(asset.uri, fileName);

    let fileUrl = null;
    let publicId = null;
    let storageProvider = null;
    let format = extension;
    let uploadedBytes = asset.size;

    // Binary content is stored in Cloudinary; Supabase stores metadata only.
    const cloudinaryResult = await tryCloudinaryUpload({
      asset,
      localUri,
      normalizedRoll,
      fileName,
      contentType,
      extension,
    });
    if (!cloudinaryResult?.secure_url || !cloudinaryResult.public_id) {
      throw new Error('Cloudinary did not return a complete public upload result.');
    }
    fileUrl = cloudinaryResult.secure_url;
    publicId = cloudinaryResult.public_id;
    storageProvider = 'cloudinary';
    format = cloudinaryResult.format || extension;
    uploadedBytes = cloudinaryResult.bytes || asset.size;

    if (documentType === 'PROJECT_LOGO') {
      return {
        success: true,
        document: {
          title: title || fileName.replace(/\.[^/.]+$/, ''),
          original_filename: fileName,
          mime_type: contentType,
          file_size: uploadedBytes || null,
          cloudinary_url: fileUrl,
          url: fileUrl,
          cloudinary_public_id: publicId,
          storage_provider: 'cloudinary',
          resource_type: cloudinaryResult.resource_type || 'image',
          format,
          document_type: 'PROJECT_LOGO',
        },
        source: 'cloudinary',
      };
    }

    // 4. Save metadata to Supabase table or local storage
    const metadata = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      roll_no: normalizedRoll,
      title: title || fileName.replace(/\.[^/.]+$/, ''),
      original_filename: fileName,
      mime_type: contentType,
      file_size: uploadedBytes || null,
      cloudinary_url: fileUrl,
      url: fileUrl,
      cloudinary_public_id: publicId,
      storage_provider: storageProvider,
      resource_type: cloudinaryResult.resource_type || (storageProvider === 'cloudinary' ? 'auto' : 'raw'),
      format,
      status: 'Verified',
      document_type: documentType || 'CERTIFICATE',
      issuer: issuer || 'RIMT University Registrar',
      credential_id: credentialId || `CERT-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };

    const saved = await saveDocumentMetadata(metadata);
    if (!saved.success) {
      return saved;
    }
    return {
      success: true,
      document: { ...saved.document, url: fileUrl, cloudinary_url: fileUrl },
      source: saved.source,
    };
  } catch (error) {
    return { success: false, error: error?.message || 'Document upload failed.' };
  }
};

export const toDocumentCardProps = (document) => ({
  icon: getDocumentIcon(document),
  iconColor: document.format === 'pdf' ? '#A31321' : '#3E6186',
  iconBgColor: document.format === 'pdf' ? 'rgba(163, 19, 33, 0.08)' : 'rgba(62, 97, 134, 0.08)',
  statusBadge: document.status || 'Uploaded',
  statusBadgeColor: '#2E7D4F',
  statusBadgeBg: 'rgba(46, 125, 79, 0.1)',
  fileMeta: `${(document.format || 'file').toUpperCase()} · ${formatDocumentSize(document.file_size)}`,
  title: document.title || document.original_filename,
  verificationLabel: document.storage_provider === 'local'
    ? 'Saved on this device'
    : document.storage_provider === 'supabase'
    ? 'Stored in Academic Vault'
    : 'Stored in Cloudinary',
  verificationIcon: 'cloud-done',
});

export const deleteStudentDocument = async ({ documentId, rollNo }) => {
  const normalizedRoll = normalizeRollNo(rollNo);
  if (!normalizedRoll || !documentId) {
    return { success: false, error: 'Invalid document.' };
  }

  // 1. Try deleting from DOCUMENTS_TABLE if table exists
  try {
    const { error } = await supabase
      .from(DOCUMENTS_TABLE)
      .delete()
      .eq('id', documentId)
      .eq('roll_no', normalizedRoll);
    if (error && !['PGRST205', '42P01'].includes(error.code)) {
      console.warn('[documentService] Delete from DOCUMENTS_TABLE notice:', error.message);
    }
  } catch (err) {
    console.warn('[documentService] Delete exception from DOCUMENTS_TABLE:', err?.message || err);
  }

  // 2. Also permanently remove from students.admin_notes (certificates) and students.resume_url in Supabase
  try {
    const { data: studentData } = await supabase
      .from('students')
      .select('admin_notes, resume_url')
      .ilike('roll_no', normalizedRoll)
      .maybeSingle();

    if (studentData) {
      let needsUpdate = false;
      const updatePayload = { updated_at: new Date().toISOString() };

      if (studentData.admin_notes) {
        try {
          const notesObj = JSON.parse(studentData.admin_notes);
          if (Array.isArray(notesObj?.certificates)) {
            const originalLength = notesObj.certificates.length;
            notesObj.certificates = notesObj.certificates.filter(
              (c) => c.id !== documentId && c.cloudinary_public_id !== documentId && c.url !== documentId
            );
            if (notesObj.certificates.length !== originalLength) {
              updatePayload.admin_notes = JSON.stringify(notesObj);
              needsUpdate = true;
            }
          }
        } catch {}
      }

      const isResume =
        documentId === `resume_${normalizedRoll}` ||
        documentId.startsWith('resume_') ||
        studentData.resume_url === documentId ||
        (typeof studentData.resume_url === 'string' && studentData.resume_url.includes('images.unsplash.com'));

      if (isResume) {
        updatePayload.resume_url = null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await supabase
          .from('students')
          .update(updatePayload)
          .ilike('roll_no', normalizedRoll);
      }
    }
  } catch (syncErr) {
    console.warn('[documentService] Supabase delete sync notice:', syncErr?.message || syncErr);
  }

  // 3. Update device local cache
  try {
    const currentDocs = await readLocalDocuments(normalizedRoll);
    const updatedDocs = currentDocs.filter(
      (doc) => doc.id !== documentId && doc.cloudinary_public_id !== documentId && doc.url !== documentId
    );
    await writeLocalDocuments(normalizedRoll, updatedDocs);
    return { success: true };
  } catch (localErr) {
    return { success: false, error: localErr?.message || 'Failed to remove document.' };
  }
};
