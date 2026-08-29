import { ChatMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { SourceList } from './SourceList';
import { useEffect, useRef } from 'react';
import { Sparkles, Palmtree, Sun } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSpeak: (text: string) => void;
  onStop: () => void;
  speakingMessageId?: string;
}

export function ChatWindow({ messages, isLoading, onSpeak, onStop, speakingMessageId }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center relative">
        {/* Decorative */}
        <div className="absolute top-[10%] right-[10%] w-20 h-20 bg-[#ffd21c]/10 rounded-full blur-[20px]" />
        <div className="absolute bottom-[15%] left-[8%] w-24 h-24 bg-[#49e46f]/10 rounded-full blur-[20px]" />
        
        <div className="relative">
          <div className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-[#063d2c] to-[#042e22] border border-[#0a4d38] flex items-center justify-center mb-6 shadow-[0_8px_32px_rgba(6,61,44,0.25)]">
            <Palmtree size={32} className="text-[#ffd21c]" />
          </div>
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#ffd21c] border-2 border-white flex items-center justify-center shadow-lg">
            <Sun size={14} className="text-[#063d2c]" />
          </div>
        </div>
        
        <div className="inline-flex items-center gap-2 bg-[#063d2c] text-white rounded-full px-3 py-1 text-[11px] font-bold tracking-widest uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#49e46f] animate-pulse" />
          Hacker House Goa • 28–31 Oct 2026
        </div>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#063d2c] mb-3 font-display">
          VOICE-ENABLED
          <br />
          <span className="text-[#ef3e32]">RAG MODEL</span>
        </h2>

        <div className="inline-block bg-[#ffd21c] text-[#063d2c] px-4 py-1.5 rounded-full text-[13px] font-bold tracking-wide mb-4 shadow-sm">
          Speak a question, get a grounded answer.
        </div>

        <p className="text-[14px] text-[#063d2c]/70 max-w-md leading-relaxed mb-8 font-medium">
          A full voice-to-answer RAG pipeline — transcription, hybrid retrieval, grounded generation — wired together end to end. Try saying <span className="font-bold text-[#063d2c]">Hii</span>!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[560px] text-left">
          {[
            { q: "What is Baga Beach known for?", cat: "🏖️ Beaches", color: "bg-[#f6f1e7] border-[#e8dfc8]" },
            { q: "Tell me about South Goa vs North Goa", cat: "🗺️ Comparison", color: "bg-white border-[#e8dfc8]" },
            { q: "What historic forts are in Goa?", cat: "🏰 History", color: "bg-[#f6f1e7] border-[#e8dfc8]" },
            { q: "Which beaches are quieter?", cat: "✨ Recommendations", color: "bg-white border-[#e8dfc8]" },
          ].map((item) => (
            <div key={item.q} className={`${item.color} border rounded-[14px] p-3.5 hover:shadow-[0_4px_16px_rgba(6,61,44,0.08)] hover:border-[#063d2c]/20 transition-all cursor-default group`}>
              <div className="text-[11px] font-bold tracking-wide uppercase text-[#063d2c] mb-1 flex items-center gap-1">
                {item.cat}
              </div>
              <div className="text-[13px] font-medium text-[#063d2c]/80 group-hover:text-[#063d2c] leading-snug">{item.q}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-2 text-[11px] text-[#063d2c] bg-white border border-[#e8dfc8] rounded-full px-3.5 py-1.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-[#49e46f] animate-pulse" />
            <span className="font-bold">28 docs</span>
            <span className="text-[#063d2c]/50">• 28 chunks • Hybrid search</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] bg-[#063d2c] text-white rounded-full px-3 py-1.5">
            <Sparkles size={12} className="text-[#ffd21c]" />
            Grounded • Cited • No fake timers
          </div>
        </div>

        <div className="mt-6 text-[11px] text-[#063d2c]/50 max-w-sm leading-relaxed">
          Tip: Say <span className="font-bold text-[#063d2c] bg-[#ffd21c]/30 px-1.5 py-0.5 rounded">Hii</span> for a friendly welcome, or click the mic 🎙️ to speak!
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {messages.map((msg) => (
          <div key={msg.id}>
            <MessageBubble
              message={msg}
              onSpeak={onSpeak}
              onStop={onStop}
              isSpeaking={speakingMessageId === msg.id}
            />
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <div className="ml-0 mb-8 max-w-[85%]">
                <SourceList sources={msg.sources} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 mb-6">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#063d2c] to-[#042e22] border border-[#0a4d38] flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-[11px] font-black text-[#ffd21c]">AI</span>
            </div>
            <div className="bg-white border border-[#e8dfc8] rounded-2xl rounded-bl-md px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#063d2c]/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#063d2c]/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#063d2c]/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-medium text-[#063d2c]/60 ml-2">Generating grounded answer...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
