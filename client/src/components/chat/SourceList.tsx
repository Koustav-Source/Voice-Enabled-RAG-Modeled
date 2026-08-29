import { Source } from '../../types/chat';
import { ExternalLink, MapPin, FileText } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface SourceListProps {
  sources: Source[];
  className?: string;
}

export function SourceList({ sources, className = '' }: SourceListProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 ${className}`}>
        <div className="flex gap-2">
          <FileText size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900">No matching chunks</p>
            <p className="text-xs text-amber-700 mt-1">
              The RAG index did not find supporting evidence for this query.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold tracking-widest uppercase text-zinc-600 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-forest-800" />
          Sources • {sources.length} chunks
        </h4>
        <span className="text-[11px] text-zinc-500">Live RAG</span>
      </div>

      <div className="grid gap-2.5">
        {sources.map((source, idx) => (
          <div
            key={source.chunkId}
            className="group bg-white border border-zinc-200 rounded-xl p-3.5 hover:border-forest-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono font-bold text-forest-700 bg-forest-50 border border-forest-100 rounded px-1.5 py-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-semibold text-zinc-800 truncate">
                    {source.title}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
                  <MapPin size={12} className="flex-shrink-0" />
                  <span className="truncate">{source.source}</span>
                  {source.category && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" size="sm" className="text-[10px]">{source.category}</Badge>
                    </>
                  )}
                </div>

                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-forest-700 hover:text-forest-800 mt-1.5 hover:underline"
                  >
                    {source.url}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="text-[11px] font-mono bg-zinc-50 border border-zinc-200 rounded-full px-2 py-0.5 text-zinc-700">
                  {source.retrievalScore.toFixed(2)}
                </div>
                <span className="text-[10px] text-zinc-400">relevance</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
        <span className="font-medium">Retrieval scores</span> are real similarity metrics (cosine + keyword fusion), not fake confidence.
        Scores above 0.3 indicate strong relevance.
      </div>
    </div>
  );
}

export function CompactSourceList({ sources }: { sources: Source[] }) {
  if (!sources?.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {sources.map((s, i) => (
        <span
          key={s.chunkId}
          className="inline-flex items-center gap-1 text-[11px] bg-white border border-zinc-200 rounded-full px-2.5 py-1 text-zinc-700"
          title={`${s.title} — ${s.retrievalScore.toFixed(3)}`}
        >
          <span className="w-4 h-4 rounded-full bg-forest-800 text-white flex items-center justify-center text-[9px] font-bold">
            {i + 1}
          </span>
          {s.title}
          <span className="text-zinc-400">({s.retrievalScore.toFixed(2)})</span>
        </span>
      ))}
    </div>
  );
}
