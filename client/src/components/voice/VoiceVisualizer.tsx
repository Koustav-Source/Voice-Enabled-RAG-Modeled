import { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  isActive: boolean;
  audioLevel: number;
  barCount?: number;
  className?: string;
}

export function VoiceVisualizer({ isActive, audioLevel, barCount = 12, className = '' }: VoiceVisualizerProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!isActive) return;

    let animationId: number;
    const updateBars = () => {
      barsRef.current.forEach((bar, idx) => {
        if (!bar) return;
        const center = barCount / 2;
        const distanceFromCenter = Math.abs(idx - center);
        const baseHeight = 8 + (1 - distanceFromCenter / center) * 12;
        const variance = Math.sin(Date.now() * 0.005 + idx) * 8 + audioLevel * 30;
        const height = Math.max(4, baseHeight + variance);
        bar.style.height = `${height}px`;
        bar.style.opacity = `${0.4 + audioLevel * 0.6}`;
      });
      animationId = requestAnimationFrame(updateBars);
    };

    updateBars();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, audioLevel, barCount]);

  return (
    <div className={`flex items-center justify-center gap-[3px] h-10 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={el => barsRef.current[i] = el}
          className={`w-[3px] rounded-full transition-all duration-100 ${
            isActive ? 'bg-emerald-400' : 'bg-zinc-300'
          }`}
          style={{ 
            height: isActive ? '8px' : '4px',
            opacity: isActive ? 0.8 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

export function Waveform({ isActive, className = '' }: { isActive: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-bounce' : 'bg-zinc-300'}`}
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.6s' }}
        />
      ))}
    </div>
  );
}
