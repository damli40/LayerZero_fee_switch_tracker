'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number; // Animation duration in ms
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  separator?: boolean; // Add commas to thousands
}

export function AnimatedNumber({
  value,
  duration = 1500,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  separator = true,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    // If value hasn't changed, don't animate
    if (prevValueRef.current === value) return;

    setIsAnimating(true);
    const startValue = prevValueRef.current;
    const endValue = value;
    const difference = endValue - startValue;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth deceleration (easeOutCubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + difference * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        startTimeRef.current = undefined;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    if (!separator) return fixed;

    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  return (
    <span
      className={`inline-block transition-all ${
        isAnimating ? 'blur-[0.5px]' : ''
      } ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </span>
  );
}
