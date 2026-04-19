/**
 * Offline photo queue.
 * - Metadata (status, ids, etc.) stored in localStorage (small, fast)
 * - Image binary data stored in IndexedDB (no quota issues)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const QUEUE_META_KEY = 'photo_offline_queue_meta';
const DB_NAME = 'RestoreScopePhotos';
const DB_STORE = 'photo_blobs';
const MAX_RETRIES = 3;

// ── IndexedDB helpers ──────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(DB_STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveBlob(localId, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(blob, localId);
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function loadBlob(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(localId);
    req.onsuccess = (e) => resolve(e.target.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function deleteBlob(localId) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(localId);
    tx.oncomplete = resolve;
    tx.onerror = resolve; // ignore errors on delete
  });
}

// ── Metadata helpers (localStorage — no blobs) ────────────────────────────────

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(QUEUE_META_KEY) || '[]'); } catch { return []; }
}

function saveMeta(meta) {
  try {
    localStorage.setItem(QUEUE_META_KEY, JSON.stringify(meta));
  } catch {
    // If even metadata exceeds quota, trim old uploaded entries
    const trimmed = meta.filter((i) => i.status !== 'uploaded');
    try { localStorage.setItem(QUEUE_META_KEY, JSON.stringify(trimmed)); } catch { /* give up */ }
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOfflinePhotoQueue() {
  const [queue, setQueue] = useState(loadMeta);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncingRef = useRef(false);

  const updateQueue = useCallback((updater) => {
    setQueue((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveMeta(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (isOnline) syncPending(); // eslint-disable-line
  }, [isOnline]); // eslint-disable-line

  /**
   * Add files to the queue. Blobs go to IndexedDB; metadata to localStorage.
   */
  const enqueue = useCallback(async (files, { jobId, roomId, companyId, takenBy }) => {
    for (const file of Array.from(files)) {
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      // Store blob in IndexedDB
      await saveBlob(localId, file);

      // Generate a small local preview URL (lives only in memory — not persisted)
      const previewUrl = URL.createObjectURL(file);

      const meta = {
        localId,
        jobId,
        roomId: roomId || null,
        companyId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        takenBy: takenBy || '',
        takenAt: new Date().toISOString(),
        status: navigator.onLine ? 'queued' : 'local_only',
        retries: 0,
        entityId: null,
        previewUrl, // object URL — in-memory only, cleared on reload (that's fine)
      };

      updateQueue((prev) => [...prev, meta]);
    }

    if (navigator.onLine) setTimeout(() => syncPending(), 100); // eslint-disable-line
  }, [updateQueue]); // eslint-disable-line

  /**
   * Upload all pending items.
   */
  const syncPending = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const currentMeta = loadMeta();
    const toSync = currentMeta.filter(
      (i) => ['queued', 'local_only', 'failed'].includes(i.status) && i.retries < MAX_RETRIES
    );

    for (const item of toSync) {
      // Mark uploading
      setQueue((prev) => {
        const next = prev.map((i) => i.localId === item.localId ? { ...i, status: 'uploading' } : i);
        saveMeta(next);
        return next;
      });

      try {
        const blob = await loadBlob(item.localId);
        if (!blob) throw new Error('Blob not found in IndexedDB');

        const file = new File([blob], item.fileName, { type: item.mimeType });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        const entity = await base44.entities.Photo.create({
          company_id: item.companyId,
          job_id: item.jobId,
          room_id: item.roomId || undefined,
          file_url,
          mime_type: item.mimeType,
          file_size: item.fileSize,
          taken_by: item.takenBy,
          taken_at: item.takenAt,
          sync_status: 'uploaded',
          offline_status: 'synced',
          analysis_status: 'analysis_pending',
          is_deleted: false,
        });

        // Blob no longer needed
        await deleteBlob(item.localId);

        setQueue((prev) => {
          const next = prev.map((i) =>
            i.localId === item.localId ? { ...i, status: 'uploaded', entityId: entity.id } : i
          );
          saveMeta(next);
          return next;
        });

        // Remove from queue after brief success flash
        setTimeout(() => {
          setQueue((prev) => {
            const next = prev.filter((i) => i.localId !== item.localId);
            saveMeta(next);
            return next;
          });
        }, 2000);

      } catch {
        setQueue((prev) => {
          const next = prev.map((i) =>
            i.localId === item.localId
              ? { ...i, status: i.retries + 1 >= MAX_RETRIES ? 'failed' : 'queued', retries: i.retries + 1 }
              : i
          );
          saveMeta(next);
          return next;
        });
      }
    }

    syncingRef.current = false;
  }, []);

  const retryFailed = useCallback(() => {
    updateQueue((prev) => prev.map((i) => i.status === 'failed' ? { ...i, status: 'queued', retries: 0 } : i));
    setTimeout(syncPending, 100);
  }, [updateQueue, syncPending]);

  const removeFromQueue = useCallback(async (localId) => {
    await deleteBlob(localId);
    updateQueue((prev) => prev.filter((i) => i.localId !== localId));
  }, [updateQueue]);

  const queueForJob = useCallback((jobId) => queue.filter((i) => i.jobId === jobId), [queue]);

  const pendingCount = queue.filter((i) => ['local_only', 'queued', 'uploading'].includes(i.status)).length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;

  return { queue, queueForJob, isOnline, pendingCount, failedCount, enqueue, syncPending, retryFailed, removeFromQueue };
}