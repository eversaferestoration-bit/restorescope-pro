import { createContext, useContext, useState, useCallback } from 'react';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [isDemo, setIsDemo] = useState(() => sessionStorage.getItem('demo_mode') === 'true');

  const enterDemo = useCallback(() => {
    sessionStorage.setItem('demo_mode', 'true');
    setIsDemo(true);
  }, []);

  const exitDemo = useCallback(() => {
    sessionStorage.removeItem('demo_mode');
    setIsDemo(false);
  }, []);

  return (
    <DemoContext.Provider value={{ isDemo, enterDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}