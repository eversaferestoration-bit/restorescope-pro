import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * Wraps page content with Framer Motion slide transitions.
 * Slides in from right on navigation, slides out to left on back.
 */
export default function PageTransition({ children }) {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}