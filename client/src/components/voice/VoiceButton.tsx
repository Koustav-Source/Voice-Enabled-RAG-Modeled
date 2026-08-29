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
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 18,
    md: 20,
    lg: 28,
  };

  if (!isSupported) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-[#f6f1e7] border border-[#e8dfc8] flex items-center justify-center text-[#063d2c]/30`}>
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
        transition-all duration-300 relative border
        ${isListening 
          ? 'bg-[#ef3e32] text-white border-[#ef3e32] shadow-[0_0_20px_rgba(239,62,50,0.4)] scale-105' 
          : 'bg-[#063d2c] text-white border-[#0a4d38] hover:bg-[#042e22] shadow-[0_4px_12px_rgba(6,61,44,0.2)] hover:shadow-[0_6px_20px_rgba(6,61,44,0.25)] hover:scale-[1.02]'
        }
        ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#063d2c] focus-visible:ring-offset-2
      `}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
    >
      {isListening && (
        <span 
          className="absolute inset-0 rounded-full bg-[#ef3e32] animate-ping opacity-30"
          style={{ animationDuration: '1.5s' }}
        />
      )}
      
      {isListening && (
        <span 
          className="absolute inset-0 rounded-full border-2 border-[#ffd21c]/50"
          style={{ 
            transform: `scale(${1 + audioLevel * 0.4})`,
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
