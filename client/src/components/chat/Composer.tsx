import { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { VoiceButton } from '../voice/VoiceButton';
import { VoiceState } from '../../types/chat';

interface ComposerProps {
  onSend: (message: string, opts?: { isVoice?: boolean; transcript?: string }) => void;
  isLoading: boolean;
  voiceState: VoiceState;
  isVoiceSupported: boolean;
  audioLevel: number;
  transcript: string;
  onVoiceToggle: () => void;
  onTranscriptChange: (t: string) => void;
  disabled?: boolean;
}

export function Composer({
  onSend,
  isLoading,
  voiceState,
  isVoiceSupported,
  audioLevel,
  transcript,
  onVoiceToggle,
  onTranscriptChange,
  disabled,
}: ComposerProps) {
  const [input, setInput] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isListening = voiceState === 'listening';

  useEffect(() => {
    if (transcript && !isEditingTranscript) {
      setInput(transcript);
    }
  }, [transcript]);

  const handleSend = () => {
    const message = input.trim();
    if (!message || isLoading || disabled) return;

    const isVoice = !!transcript && message === transcript;
    onSend(message, { isVoice, transcript: isVoice ? transcript : undefined });
    setInput('');
    onTranscriptChange('');
    setIsEditingTranscript(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setInput('');
    onTranscriptChange('');
    setIsEditingTranscript(false);
    inputRef.current?.focus();
  };

  return (
    <div className="border-t border-[#e8dfc8] bg-white/90 backdrop-blur-xl sticky bottom-0 shadow-[0_-8px_32px_rgba(6,61,44,0.06)]">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {transcript && (
          <div className="mb-3 bg-[#063d2c] border border-[#0a4d38] rounded-[14px] px-3.5 py-3 flex items-start gap-3 shadow-[0_4px_16px_rgba(6,61,44,0.15)]">
            <div className="w-8 h-8 rounded-full bg-[#ffd21c] flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[12px]">🎙️</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold tracking-widest uppercase text-[#ffd21c] mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#49e46f] animate-pulse" />
                You said
              </div>
              <p className="text-[14px] font-medium text-white">"{transcript}"</p>
              <p className="text-[11px] text-white/60 mt-1">You can edit before sending • Press Enter</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 w-8 p-0 bg-white/10 hover:bg-white/15 text-white border border-white/10">
              <Trash2 size={14} />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2.5">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (transcript) setIsEditingTranscript(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? 'Listening... speak now!'
                  : isVoiceSupported
                  ? 'Ask about Goa, or click mic 🎙️ to speak... try Hii!'
                  : 'Ask anything about Goa... try Hii!'
              }
              disabled={isLoading || disabled || isListening}
              className="
                w-full h-[48px] pl-4 pr-12
                bg-[#f6f1e7] border border-[#e8dfc8] rounded-[14px]
                text-[15px] font-medium text-[#063d2c] placeholder:text-[#063d2c]/40
                focus:outline-none focus:ring-2 focus:ring-[#063d2c]/20 focus:border-[#063d2c] focus:bg-white
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-sm
              "
            />
            
            {input && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#063d2c]/10 hover:bg-[#063d2c]/15 flex items-center justify-center text-[#063d2c]/60 hover:text-[#063d2c] transition-colors"
              >
                <span className="text-xs font-bold">✕</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <VoiceButton
              voiceState={voiceState}
              isSupported={isVoiceSupported}
              audioLevel={audioLevel}
              onToggle={onVoiceToggle}
              size="md"
            />

            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || disabled}
              isLoading={isLoading}
              size="icon"
              className="w-12 h-12 rounded-[14px] bg-[#063d2c] hover:bg-[#042e22] text-white border border-[#0a4d38] shadow-[0_4px_12px_rgba(6,61,44,0.2)]"
              aria-label="Send message"
            >
              {!isLoading && <Send size={18} />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-2.5 text-[11px]">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[#063d2c]/60">
              <kbd className="px-1.5 py-0.5 bg-[#f6f1e7] border border-[#e8dfc8] rounded text-[10px] font-bold">Enter</kbd>
              to send
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#063d2c] text-white rounded-full px-2.5 py-1 text-[11px] font-bold">
              <span className="w-1 h-1 rounded-full bg-[#49e46f] animate-pulse" />
              Grounded RAG
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[#063d2c]/50">
              <span className="w-1 h-1 rounded-full bg-[#ffd21c]" />
              28 docs • Sources cited
            </span>
          </div>

          {voiceState !== 'idle' && (
            <span className="text-[11px] font-bold text-[#063d2c] bg-[#ffd21c]/20 border border-[#ffd21c]/30 rounded-full px-2.5 py-1">
              {voiceState === 'listening' && '🎙 Listening...'}
              {voiceState === 'transcribing' && '📝 Transcribing...'}
              {voiceState === 'retrieving' && '🔍 Retrieving...'}
              {voiceState === 'generating' && '✨ Generating...'}
              {voiceState === 'speaking' && '🔊 Speaking...'}
              {voiceState === 'error' && '⚠️ Error'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
