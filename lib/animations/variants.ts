import { Variants } from 'framer-motion';

// Standard easing curves
export const easeExpo = [0.16, 1, 0.3, 1] as const;
export const easeSmooth = [0.25, 0.1, 0.25, 1] as const;

// Stagger configurations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Fade animations
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeExpo },
  },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeExpo },
  },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: easeExpo },
  },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: easeExpo },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: easeSmooth },
  },
};

// Scale animations
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: easeExpo },
  },
};

export const scaleDown: Variants = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: easeExpo },
  },
};

// Modals/Overlays
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeExpo },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -10,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

export const overlayVariants: Variants = {
  hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(8px)',
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: { duration: 0.2 },
  },
};
