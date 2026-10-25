import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = '',
  threshold = 70
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const isTouchActiveRef = useRef<boolean>(false);

  // Handle Touch Start
  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Only enable pull-to-refresh if container is scrolled at the very top
    if (container.scrollTop <= 0) {
      startYRef.current = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      isTouchActiveRef.current = true;
      setIsPulling(true);
    }
  }, []);

  // Handle Touch Move
  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!isTouchActiveRef.current || isRefreshing) return;
    const container = containerRef.current;
    if (!container) return;

    // If user scrolled down inside container, cancel pull gesture
    if (container.scrollTop > 0) {
      setPullDistance(0);
      return;
    }

    const currentY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const deltaY = currentY - startYRef.current;

    if (deltaY > 0 && container.scrollTop <= 0) {
      // Apply smooth logarithmic dampening effect
      const dampened = Math.min(110, Math.pow(deltaY, 0.82) * 1.6);
      setPullDistance(dampened);
      
      // Prevent default page elastic bounce on iOS if pulling
      if (e.cancelable && deltaY > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [isRefreshing]);

  // Handle Touch End / Cancel
  const handleTouchEnd = useCallback(async () => {
    if (!isTouchActiveRef.current) return;
    isTouchActiveRef.current = false;
    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Hold indicator at threshold height during refresh

      const startTime = Date.now();
      try {
        await onRefresh();
      } catch (err) {
        console.error('Error during pull to refresh:', err);
      } finally {
        // Enforce minimum animation time (750ms) for smooth feedback
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 750 - elapsedTime);
        
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, remainingTime);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  // Desktop Mouse Drag Emulation Support
  const isMouseDownRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    isMouseDownRef.current = true;
    startYRef.current = e.clientY;
    isTouchActiveRef.current = true;
    setIsPulling(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    handleTouchMove(e as any);
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    handleTouchEnd();
  };

  const isPastThreshold = pullDistance >= threshold;
  const rotationDegrees = Math.min(180, (pullDistance / threshold) * 180);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative overflow-y-auto custom-scrollbar select-none sm:select-auto ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: pullDistance > 0 ? 'none' : 'pan-y'
      }}
    >
      {/* Pull To Refresh Visual Banner Indicator */}
      <div
        className="absolute left-0 right-0 top-0 flex items-center justify-center pointer-events-none z-30 transition-transform duration-75"
        style={{
          transform: `translateY(${Math.max(0, pullDistance - 48)}px)`,
          opacity: pullDistance > 10 ? 1 : 0
        }}
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-800/95 text-blue-600 dark:text-blue-400 shadow-md border border-blue-100 dark:border-slate-700 backdrop-blur-sm transition-all">
          <div className="flex items-center justify-center">
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <ArrowDown
                className="h-4 w-4 transition-transform duration-200"
                style={{
                  transform: `rotate(${isPastThreshold ? 180 : rotationDegrees}deg)`
                }}
              />
            )}
          </div>
          <span className="text-xs font-bold tracking-tight select-none">
            {isRefreshing
              ? 'Atualizando...'
              : isPastThreshold
              ? 'Solte para atualizar'
              : 'Puxe para atualizar'}
          </span>
        </div>
      </div>

      {/* Main Content Container with dynamic smooth pull offset transform */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.55}px)` : 'none',
          transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className="h-full w-full"
      >
        {children}
      </div>
    </div>
  );
};
