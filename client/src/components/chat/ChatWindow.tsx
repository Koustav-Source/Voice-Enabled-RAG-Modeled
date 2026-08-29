import { ChatMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { SourceList } from './SourceList';
import { useEffect, useRef } from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';

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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-forest-800 flex items-center justify-center mb-6 shadow-lg">
          <Sparkles size={28} className="text-white" />
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2 font-display">
          Voice-Enabled RAG
        </h2>
        <p className="text-sm text-zinc-600 max-w-md leading-relaxed mb-8">
          Speak or type a question about Goa. The system retrieves grounded knowledge,
          generates an answer with sources, and can read it aloud.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg text-left">
          {[
            { q: "What is Baga Beach known for?", cat: "Beaches" },
            { q: "Tell me about South Goa vs North Goa", cat: "Comparison" },
            { q: "What historic forts are in Goa?", cat: "History" },
            { q: "Which beaches are quieter?", cat: "Recommendations" },
          ].map((item) => (
            <div key={item.q} className="bg-white border border-zinc-200 rounded-xl p-3 hover:border-forest-200 hover:shadow-sm transition-all">
              <div className="text-[11px] font-semibold tracking-wide uppercase text-forest-700 mb-1">{item.cat}</div>
              <div className="text-sm text-zinc-700">{item.q}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-2 text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          RAG pipeline ready • Hybrid search • Grounded generation
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
            <div className="w-8 h-8 rounded-full bg-forest-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-white">AI</span>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-zinc-500 ml-2">Generating grounded answer...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <MessageCircle size={32} className="text-zinc-300 mb-3" />
      <p className="text-sm text-zinc-500">No messages yet. Start a conversation!</p>
    </div>
  );
}
