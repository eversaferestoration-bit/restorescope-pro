import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Preserves navigation stack per tab so switching tabs doesn't reset current page.
 * Stores route history in sessionStorage keyed by tab path.
 */
export function useNavigationStack(tabPath) {
  const location = useLocation();
  const stackRef = useRef([]);

  useEffect(() => {
    const storageKey = `nav_stack_${tabPath}`;
    const saved = sessionStorage.getItem(storageKey);
    stackRef.current = saved ? JSON.parse(saved) : [];

    // Add current route if not already at top
    if (!stackRef.current.includes(location.pathname)) {
      stackRef.current.push(location.pathname);
    }
    sessionStorage.setItem(storageKey, JSON.stringify(stackRef.current.slice(-10))); // keep last 10
  }, [location.pathname, tabPath]);

  const clearStack = () => {
    const storageKey = `nav_stack_${tabPath}`;
    stackRef.current = [];
    sessionStorage.removeItem(storageKey);
  };

  return { currentPath: location.pathname, clearStack };
}