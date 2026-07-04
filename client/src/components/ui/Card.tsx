import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'interactive';
  className?: string;
  onClick?: () => void;
  padding?: boolean;
}

export default function Card({
  children,
  variant = 'default',
  className = '',
  onClick,
  padding = true,
}: CardProps) {
  const base = `
    rounded-2xl border transition-all duration-300
    ${padding ? 'p-6' : ''}
  `;

  if (variant === 'interactive' || onClick) {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className={`
          ${base}
          bg-surface-alt/80 border-border cursor-pointer
          hover:bg-surface-hover hover:border-primary/30
          hover:shadow-lg hover:shadow-primary/5
          ${className}
        `}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={`
        ${base}
        bg-surface-alt/80 border-border
        ${className}
      `}
    >
      {children}
    </div>
  );
}
