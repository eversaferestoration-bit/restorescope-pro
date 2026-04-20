import { useEffect, useRef, useState } from 'react';

/**
 * Pull-to-refresh hook for mobile.
 * Returns: { isRefreshing, startY, onTouchStart, onTouchMove, onTouchEnd }
 * 
 * Usage:
 *   const { isRefreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(() => refetch())
 *   <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
 */
export function usePullToRefresh(onRefresh, threshold = 80) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef(0);
  const scrollPosRef = useRef(0);

  const onTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientY;
    scrollPosRef.current = e.currentTarget.scrollTop;
  };

  const onTouchMove = (e) => {
    const scrollEl = e.currentTarget;
    const pullDistance = e.touches[0].clientY - touchStartRef.current;

    // Only trigger pull-to-refresh at top of scroll
    if (scrollEl.scrollTop === 0 && pullDistance > 0) {
      // Visual feedback: scale down content slightly
      scrollEl.style.transform = `translateY(${Math.min(pullDistance, threshold)}px)`;
    }
  };

  const onTouchEnd = async (e) => {
    const scrollEl = e.currentTarget;
    const pullDistance = touchStartRef.current - e.changedTouches[0].clientY;
    scrollEl.style.transform = 'translateY(0)';

    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return { isRefreshing, onTouchStart, onTouchMove, onTouchEnd };
}