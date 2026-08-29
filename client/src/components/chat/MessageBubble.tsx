import { ChatMessage } from '../../types/chat';
import { Copy, Volume2, VolumeX, Clock, Database, Sparkles } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useState } from 'react';

interface MessageBubbleProps {
  message: ChatMessage;
  onSpeak?: (text: string) => void;
  onStop?: () => void;
  isSpeaking?: boolean;
}

export function MessageBubble({ message, onSpeak, onStop, isSpeaking }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[80%]">
          <div className="bg-gradient-to-br from-[#063d2c] to-[#042e22] border border-[#0a4d38] text-white rounded-[18px] rounded-br-[6px] px-4 py-3 shadow-[0_4px_16px_rgba(6,61,44,0.15)]">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
          </div>
          <div className="flex justify-end mt-1.5 mr-1">
            <span className="text-[11px] text-[#063d2c]/50">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const isGreeting = !message.grounded && message.sources?.length === 0 && (message.content.includes("Welcome to Voice RAG") || message.content.includes("Hii!"));

  return (
    <div className="flex justify-start mb-8">
      <div className="max-w-[85%] w-full">
        <div className="bg-white border border-[#e8dfc8] rounded-[18px] rounded-bl-[6px] shadow-[0_4px_20px_rgba(6,61,44,0.06)] overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-[#063d2c] to-[#042e22] border border-[#0a4d38] flex items-center justify-center shadow-sm">
                <span className="text-[11px] font-black text-[#ffd21c]">AI</span>
              </div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#063d2c]">
                {isGreeting ? 'Welcome' : 'Grounded Answer'}
              </span>
              {isGreeting && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#ffd21c] text-[#063d2c] rounded-full px-2 py-0.5">
                  👋 Friendly
                </span>
              )}
              {message.grounded === false && !isGreeting && (
                <Badge variant="red" size="sm">Insufficient Evidence</Badge>
              )}
              {message.grounded === true && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#063d2c] text-white rounded-full px-2 py-0.5">
                  <span className="w-1 h-1 rounded-full bg-[#49e46f] animate-pulse" />
                  Grounded ✓
                </span>
              )}
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p className="text-[15px] leading-[1.7] text-[#1a1a1a] whitespace-pre-wrap">
                {message.content}
              </p>
            </div>

            {message.retrieval && (message.retrieval.returned > 0 || message.timing) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {message.retrieval.returned > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-[#f6f1e7] border border-[#e8dfc8] rounded-full px-3 py-1 text-[11px] font-medium text-[#063d2c]">
                    <Database size={12} />
                    {message.retrieval.returned} sources
                  </span>
                )}
                {message.timing && message.timing.retrievalMs > 0 && (
                  <>
                    <span className="inline-flex items-center gap-1.5 bg-white border border-[#e8dfc8] rounded-full px-3 py-1 text-[11px] text-[#063d2c]/70">
                      <Clock size={12} />
                      {message.timing.retrievalMs}ms retrieval
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white border border-[#e8dfc8] rounded-full px-3 py-1 text-[11px] text-[#063d2c]/70">
                      {message.timing.generationMs}ms generation
                    </span>
                  </>
                )}
                {message.retrieval.rewrittenQuery && (
                  <span className="inline-flex items-center gap-1.5 bg-[#ffd21c]/20 border border-[#ffd21c]/30 rounded-full px-3 py-1 text-[11px] font-bold text-[#063d2c]">
                    <Sparkles size={12} />
                    Query expanded
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#f6f1e7]/70 border-t border-[#e8dfc8] px-4 py-2.5 flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs text-[#063d2c] hover:bg-[#063d2c]/5">
              <Copy size={14} className="mr-1.5" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            
            {onSpeak && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => isSpeaking ? onStop?.() : onSpeak(message.content)}
                className="h-7 text-xs text-[#063d2c] hover:bg-[#063d2c]/5"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX size={14} className="mr-1.5" />
                    Stop
                  </>
                ) : (
                  <>
                    <Volume2 size={14} className="mr-1.5" />
                    Speak
                  </>
                )}
              </Button>
            )}

            <div className="ml-auto text-[11px] text-[#063d2c]/40">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
