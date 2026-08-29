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
                  w-6 h-6 rounded-full flex items-center justify-center
                  ${step.status === 'done' ? 'bg-emerald-500 text-white' : ''}
                  ${step.status === 'active' ? 'bg-forest-800 text-white animate-pulse' : ''}
                  ${step.status === 'pending' ? 'bg-zinc-100 text-zinc-400 border border-zinc-200' : ''}
                  ${step.status === 'error' ? 'bg-red-500 text-white' : ''}
                `}
              >
                {step.status === 'done' ? (
                  <CheckCircle2 size={12} />
                ) : step.status === 'active' ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon size={12} />
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-4 h-0.5 ${step.status === 'done' ? 'bg-emerald-300' : 'bg-zinc-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-zinc-200 rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-widest uppercase text-zinc-600 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-forest-800 animate-pulse" />
          RAG Pipeline
        </h3>
        <span className="text-[11px] text-zinc-500">Live</span>
      </div>

      <div className="space-y-2.5">
        {steps.map((step, idx) => {
          const Icon = stepIcons[step.id] || FileText;
          const isActive = step.status === 'active';
          const isDone = step.status === 'done';

          return (
            <div
              key={step.id}
              className={`
                flex items-center gap-3 p-2.5 rounded-xl border transition-all
                ${isActive ? 'bg-forest-50 border-forest-200 shadow-sm' : ''}
                ${isDone ? 'bg-zinc-50/50 border-zinc-100' : ''}
                ${step.status === 'pending' ? 'border-transparent' : ''}
                ${step.status === 'error' ? 'bg-red-50 border-red-200' : ''}
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                  ${isDone ? 'bg-emerald-500 text-white' : ''}
                  ${isActive ? 'bg-forest-800 text-white' : ''}
                  ${step.status === 'pending' ? 'bg-zinc-100 text-zinc-400 border border-zinc-200' : ''}
                  ${step.status === 'error' ? 'bg-red-500 text-white' : ''}
                `}
              >
                {isDone ? (
                  <CheckCircle2 size={16} />
                ) : isActive ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon size={16} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={`
                    text-sm font-medium
                    ${isActive ? 'text-forest-900' : ''}
                    ${isDone ? 'text-zinc-700' : ''}
                    ${step.status === 'pending' ? 'text-zinc-400' : ''}
                    ${step.status === 'error' ? 'text-red-700' : ''}
                  `}
                >
                  {step.label}
                </div>
                {isActive && (
                  <div className="text-[11px] text-forest-600 mt-0.5">Processing...</div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {step.durationMs !== undefined && isDone && (
                  <span className="text-[11px] font-mono bg-white border border-zinc-200 rounded-full px-2 py-0.5 text-zinc-600">
                    {step.durationMs}ms
                  </span>
                )}
                {isDone && <span className="text-emerald-500 text-xs">✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-100">
        <div className="text-[11px] text-zinc-500 leading-relaxed">
          Real pipeline — no fake timers. Status driven by actual API lifecycle events.
        </div>
      </div>
    </div>
  );
}
