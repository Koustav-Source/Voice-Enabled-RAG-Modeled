import { Mic, FileText, Search, Sparkles, CheckCircle2 } from 'lucide-react';

interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  durationMs?: number;
}

interface PipelineStatusProps {
  steps: PipelineStep[];
  className?: string;
  compact?: boolean;
}

const stepIcons: Record<string, any> = {
  capture: Mic,
  transcribe: FileText,
  retrieve: Search,
  generate: Sparkles,
  done: CheckCircle2,
};

export function PipelineStatus({ steps, className = '', compact = false }: PipelineStatusProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {steps.map((step, idx) => {
          const Icon = stepIcons[step.id] || FileText;
          return (
            <div key={step.id} className="flex items-center gap-1.5">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center border
                  ${step.status === 'done' ? 'bg-[#49e46f] text-[#063d2c] border-[#49e46f] shadow-[0_0_8px_rgba(73,228,111,0.4)]' : ''}
                  ${step.status === 'active' ? 'bg-[#ffd21c] text-[#063d2c] border-[#ffd21c] animate-pulse shadow-[0_0_12px_rgba(255,210,28,0.5)]' : ''}
                  ${step.status === 'pending' ? 'bg-white/10 text-white/40 border-white/15' : ''}
                  ${step.status === 'error' ? 'bg-[#ef3e32] text-white border-[#ef3e32]' : ''}
                `}
              >
                {step.status === 'done' ? (
                  <CheckCircle2 size={12} />
                ) : step.status === 'active' ? (
                  <span className="w-3.5 h-3.5 border-2 border-[#063d2c] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon size={12} />
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-5 h-0.5 ${step.status === 'done' ? 'bg-[#49e46f]/50' : 'bg-white/15'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="space-y-2.5">
        {steps.map((step) => {
          const Icon = stepIcons[step.id] || FileText;
          const isActive = step.status === 'active';
          const isDone = step.status === 'done';

          return (
            <div
              key={step.id}
              className={`
                flex items-center gap-3 p-2.5 rounded-[12px] border transition-all
                ${isActive ? 'bg-[#ffd21c]/15 border-[#ffd21c]/30 shadow-[0_2px_12px_rgba(255,210,28,0.15)]' : ''}
                ${isDone ? 'bg-white/[0.06] border-white/10' : ''}
                ${step.status === 'pending' ? 'border-transparent' : ''}
                ${step.status === 'error' ? 'bg-[#ef3e32]/10 border-[#ef3e32]/20' : ''}
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 border
                  ${isDone ? 'bg-[#49e46f] text-[#063d2c] border-[#49e46f] shadow-[0_0_10px_rgba(73,228,111,0.3)]' : ''}
                  ${isActive ? 'bg-[#ffd21c] text-[#063d2c] border-[#ffd21c]' : ''}
                  ${step.status === 'pending' ? 'bg-white/5 text-white/30 border-white/10' : ''}
                  ${step.status === 'error' ? 'bg-[#ef3e32] text-white border-[#ef3e32]' : ''}
                `}
              >
                {isDone ? (
                  <CheckCircle2 size={16} />
                ) : isActive ? (
                  <span className="w-4 h-4 border-2 border-[#063d2c] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon size={16} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={`
                    text-[13px] font-bold tracking-wide
                    ${isActive ? 'text-[#ffd21c]' : ''}
                    ${isDone ? 'text-white' : ''}
                    ${step.status === 'pending' ? 'text-white/40' : ''}
                    ${step.status === 'error' ? 'text-[#ef3e32]' : ''}
                  `}
                >
                  {step.label}
                </div>
                {isActive && (
                  <div className="text-[11px] text-[#ffd21c]/70 mt-0.5 font-medium">Processing...</div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {step.durationMs !== undefined && isDone && (
                  <span className="text-[11px] font-mono bg-white/10 border border-white/10 rounded-full px-2 py-0.5 text-white/70">
                    {step.durationMs}ms
                  </span>
                )}
                {isDone && <span className="text-[#49e46f] text-xs font-bold">✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
