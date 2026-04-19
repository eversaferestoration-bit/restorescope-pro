/**
 * Offline photo queue using localStorage.
 * Each queued item: { localId, jobId, roomId, companyId, dataUrl, fileName, mimeType, fileSize, takenBy, takenAt, status, retries }
 * status: 'local_only' | 'queued' | 'uploading' | 'uploaded' | 'failed'
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const QUEUE_KEY = 'photo_offline_queue';
const MAX_RETRIES = 3;

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

function saveQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl, fileName, mimeType) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: mimeType });
}

export function useOfflinePhotoQueue() {
  const [queue, setQueue] = useState(loadQueue);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncingRef = useRef(false);

  // Keep queue in sync with localStorage
  const updateQueue = useCallback((updater) => {
    setQueue((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveQueue(next);
      return next;
    });
  }, []);

  // Online/offline detection
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Sync when coming online
  useEffect(() => {
    if (isOnline) syncPending();
  }, [isOnline]); // eslint-disable-line

  /**
   * Add photos to the queue (works offline).
   */
  const enqueue = useCallback(async (files, { jobId, roomId, companyId, takenBy }) => {
    const newItems = [];
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      newItems.push({
        localId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        jobId,
        roomId: roomId || null,
        companyId,
        dataUrl,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        takenBy: takenBy || '',
        takenAt: new Date().toISOString(),
        status: navigator.onLine ? 'queued' : 'local_only',
        retries: 0,
        entityId: null,
      });
    }
    updateQueue((prev) => [...prev, ...newItems]);
    if (navigator.onLine) setTimeout(() => syncPending(), 100);
  }, [updateQueue]); // eslint-disable-line

  /**
   * Attempt to upload all queued/failed items.
   */
  const syncPending = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const currentQueue = loadQueue();
    const toSync = currentQueue.filter((i) => ['queued', 'local_only', 'failed'].includes(i.status) && i.retries < MAX_RETRIES);
    if (!toSync.length) { syncingRef.current = false; return; }

    for (const item of toSync) {
      // Mark as uploading
      setQueue((prev) => {
        const next = prev.map((i) => i.localId === item.localId ? { ...i, status: 'uploading' } : i);
        saveQueue(next);
        return next;
      });

      try {
        const file = await dataUrlToFile(item.dataUrl, item.fileName, item.mimeType);
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

        // Mark as uploaded, keep a brief record then remove from queue
        setQueue((prev) => {
          const next = prev.map((i) =>
            i.localId === item.localId
              ? { ...i, status: 'uploaded', entityId: entity.id, dataUrl: null } // clear dataUrl to free memory
              : i
          );
          saveQueue(next);
          return next;
        });

        // Remove uploaded after short delay
        setTimeout(() => {
          setQueue((prev) => {
            const next = prev.filter((i) => i.localId !== item.localId);
            saveQueue(next);
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
          saveQueue(next);
          return next;
        });
      }
    }

    syncingRef.current = false;
  }, []);

  /**
   * Retry all failed items.
   */
  const retryFailed = useCallback(() => {
    updateQueue((prev) => prev.map((i) => i.status === 'failed' ? { ...i, status: 'queued', retries: 0 } : i));
    setTimeout(syncPending, 100);
  }, [updateQueue, syncPending]);

  /**
   * Remove a specific item from queue.
   */
  const removeFromQueue = useCallback((localId) => {
    updateQueue((prev) => prev.filter((i) => i.localId !== localId));
  }, [updateQueue]);

  // Items for this job
  const queueForJob = useCallback((jobId) => queue.filter((i) => i.jobId === jobId), [queue]);

  const pendingCount = queue.filter((i) => ['local_only', 'queued', 'uploading'].includes(i.status)).length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;

  return { queue, queueForJob, isOnline, pendingCount, failedCount, enqueue, syncPending, retryFailed, removeFromQueue };
}