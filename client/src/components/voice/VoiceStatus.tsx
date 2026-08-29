import { VoiceState } from '../../types/chat';
import { Badge } from '../ui/Badge';

interface VoiceStatusProps {
  state: VoiceState;
  transcript?: string;
  className?: string;
}

const stateConfig: Record<VoiceState, { label: string; variant: 'default' | 'forest' | 'gold' | 'red'; dot: string }> = {
  idle: { label: 'Ready', variant: 'default', dot: 'bg-zinc-400' },
  listening: { label: 'Listening...', variant: 'red', dot: 'bg-red-500 animate-pulse' },
  transcribing: { label: 'Transcribing...', variant: 'gold', dot: 'bg-amber-500 animate-pulse' },
  retrieving: { label: 'Retrieving knowledge...', variant: 'forest', dot: 'bg-emerald-500 animate-pulse' },
  generating: { label: 'Generating answer...', variant: 'forest', dot: 'bg-emerald-500 animate-pulse' },
  speaking: { label: 'Speaking...', variant: 'forest', dot: 'bg-emerald-500 animate-pulse' },
  error: { label: 'Error', variant: 'red', dot: 'bg-red-500' },
};

export function VoiceStatus({ state, transcript, className = '' }: VoiceStatusProps) {
  const config = stateConfig[state];

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
      
      {transcript && state !== 'idle' && (
        <div className="max-w-sm text-center">
          <p className="text-xs text-zinc-500 mb-1">You said:</p>
          <p className="text-sm font-medium text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
            "{transcript}"
          </p>
        </div>
      )}
    </div>
  );
}

export function PipelineStatus({ 
  steps, 
  className = '' 
}: { 
  steps: { id: string; label: string; status: 'pending' | 'active' | 'done' | 'error'; durationMs?: number }[];
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-center gap-3 text-sm">
          <div className={`
            w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
            ${step.status === 'done' ? 'bg-emerald-500 text-white' : ''}
            ${step.status === 'active' ? 'bg-forest-800 text-white animate-pulse' : ''}
            ${step.status === 'pending' ? 'bg-zinc-100 text-zinc-400 border border-zinc-200' : ''}
            ${step.status === 'error' ? 'bg-red-500 text-white' : ''}
          `}>
            {step.status === 'done' ? '✓' : idx + 1}
          </div>
          <span className={`
            flex-1
            ${step.status === 'done' ? 'text-zinc-700' : ''}
            ${step.status === 'active' ? 'text-forest-800 font-medium' : ''}
            ${step.status === 'pending' ? 'text-zinc-400' : ''}
            ${step.status === 'error' ? 'text-red-600' : ''}
          `}>
            {step.label}
          </span>
          {step.durationMs !== undefined && step.status === 'done' && (
            <span className="text-[11px] text-zinc-500 font-mono">
              {step.durationMs}ms
            </span>
          )}
          {step.status === 'active' && (
            <span className="w-3 h-3 border-2 border-forest-800 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      ))}
    </div>
  );
}
