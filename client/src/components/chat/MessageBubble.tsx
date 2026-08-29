import { ChatMessage } from '../../types/chat';
import { Copy, Volume2, VolumeX, Clock, Database } from 'lucide-react';
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
          <div className="bg-forest-800 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex justify-end mt-1.5 mr-1">
            <span className="text-[11px] text-zinc-500">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-8">
      <div className="max-w-[85%] w-full">
        <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-md shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-forest-800 flex items-center justify-center">
                <span className="text-[11px] font-bold text-white">AI</span>
              </div>
              <span className="text-xs font-semibold text-zinc-700 tracking-wide uppercase">Grounded Answer</span>
              {message.grounded === false && (
                <Badge variant="red" size="sm">Insufficient Evidence</Badge>
              )}
              {message.grounded === true && (
                <Badge variant="forest" size="sm">Grounded ✓</Badge>
              )}
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p className="text-[15px] leading-[1.65] text-zinc-800 whitespace-pre-wrap">
                {message.content}
              </p>
            </div>

            {message.retrieval && (
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1">
                  <Database size={12} />
                  {message.retrieval.returned} sources
                </span>
                {message.timing && (
                  <>
                    <span className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1">
                      <Clock size={12} />
                      {message.timing.retrievalMs}ms retrieval
                    </span>
                    <span className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1">
                      {message.timing.generationMs}ms generation
                    </span>
                  </>
                )}
                {message.retrieval.rewrittenQuery && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 text-amber-800">
                    Query expanded
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="bg-zinc-50 border-t border-zinc-100 px-4 py-2.5 flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
              <Copy size={14} className="mr-1.5" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            
            {onSpeak && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => isSpeaking ? onStop?.() : onSpeak(message.content)}
                className="h-7 text-xs"
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

            <div className="ml-auto text-[11px] text-zinc-400">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
