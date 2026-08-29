import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Trash2 } from 'lucide-react';
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
    <div className="border-t border-zinc-200 bg-white/80 backdrop-blur-xl sticky bottom-0">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Transcript preview when voice active */}
        {transcript && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold tracking-wide uppercase text-amber-800 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                You said
              </div>
              <p className="text-sm text-zinc-800">"{transcript}"</p>
              <p className="text-[11px] text-zinc-500 mt-1">You can edit before sending</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 w-7 p-0">
              <Trash2 size={14} />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
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
                  ? 'Listening...'
                  : isVoiceSupported
                  ? 'Ask about Goa, or click mic to speak...'
                  : 'Ask anything about Goa...'
              }
              disabled={isLoading || disabled || isListening}
              className="
                w-full h-12 pl-4 pr-12
                bg-zinc-50 border border-zinc-200 rounded-xl
                text-[15px] text-zinc-900 placeholder:text-zinc-400
                focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-800 focus:bg-white
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all
              "
            />
            
            {input && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                <span className="text-xs">✕</span>
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
              className="w-12 h-12 rounded-xl"
              aria-label="Send message"
            >
              {!isLoading && <Send size={18} />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2.5 px-1">
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[10px]">Enter</kbd>
              to send
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              Grounded RAG
            </span>
            <span className="hidden sm:inline">Hybrid search • Sources cited</span>
          </div>

          {voiceState !== 'idle' && (
            <span className="text-[11px] font-medium text-forest-700">
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
