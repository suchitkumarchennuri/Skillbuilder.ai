import { useMotionValue, motion, useMotionTemplate } from 'framer-motion';
import React, { MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '../../lib/utils';

export function CardSpotlight({
  children,
  className,
  radius = 350,
  ...props
}: {
  radius?: number;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: ReactMouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn(
        "group/spotlight relative rounded-xl border border-dark-700/50 bg-gradient-to-br from-dark-800 to-dark-800/95 p-6 shadow-xl",
        "transition-all duration-300 hover:border-dark-600/50 hover:from-dark-800/95 hover:to-dark-800/90",
        "hover:shadow-primary-500/5 overflow-hidden",
        className
      )}
      onMouseMove={handleMouseMove}
      {...props}
    >
      {/* Base grain texture */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Spotlight effect with enhanced grain and increased brightness */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 mix-blend-soft-light transition duration-300 group-hover/spotlight:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              rgba(244, 63, 94, 0.35),
              transparent 80%
            )
          `,
          backgroundImage: `
            radial-gradient(
              circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
              rgba(244, 63, 94, 0.35),
              transparent 40%
            ),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")
          `,
        }}
      />

      {/* Additional grain overlay with increased opacity */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 mix-blend-overlay transition duration-300 group-hover/spotlight:opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}