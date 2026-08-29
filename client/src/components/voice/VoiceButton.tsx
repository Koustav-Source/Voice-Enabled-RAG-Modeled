import { Mic, MicOff, Square } from 'lucide-react';
import { VoiceState } from '../../types/chat';

interface VoiceButtonProps {
  voiceState: VoiceState;
  isSupported: boolean;
  audioLevel: number;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function VoiceButton({ voiceState, isSupported, audioLevel, onToggle, size = 'lg' }: VoiceButtonProps) {
  const isListening = voiceState === 'listening';
  const isProcessing = ['transcribing', 'retrieving', 'generating'].includes(voiceState);

  const sizeClasses = {
    sm: 'w-11 h-11',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 28,
  };

  if (!isSupported) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400`}>
        <MicOff size={iconSizes[size]} />
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      disabled={isProcessing}
      className={`
        ${sizeClasses[size]} rounded-full flex items-center justify-center
        transition-all duration-300 relative
        ${isListening 
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-105' 
          : 'bg-forest-800 text-white hover:bg-forest-900 shadow-md hover:shadow-lg'
        }
        ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-800 focus-visible:ring-offset-2
      `}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
    >
      {isListening && (
        <span 
          className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30"
          style={{ animationDuration: '1.5s' }}
        />
      )}
      
      {isListening && (
        <span 
          className="absolute inset-0 rounded-full border-2 border-red-300"
          style={{ 
            transform: `scale(${1 + audioLevel * 0.3})`,
            opacity: 0.5 + audioLevel * 0.5,
            transition: 'transform 0.1s ease-out, opacity 0.1s ease-out'
          }}
        />
      )}

      <span className="relative z-10">
        {isListening ? <Square size={iconSizes[size] * 0.7} fill="white" /> : <Mic size={iconSizes[size]} />}
      </span>
    </button>
  );
}
