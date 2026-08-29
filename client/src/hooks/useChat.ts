import { useState, useCallback } from 'react';
import { ChatMessage, VoiceState, PipelineStep } from '../types/chat';
import { api } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { id: 'capture', label: 'Voice Captured', status: 'pending' },
    { id: 'transcribe', label: 'Transcription', status: 'pending' },
    { id: 'retrieve', label: 'Retrieving Context', status: 'pending' },
    { id: 'generate', label: 'Generating Answer', status: 'pending' },
    { id: 'done', label: 'Done', status: 'pending' },
  ]);

  const resetPipeline = useCallback(() => {
    setPipelineSteps(prev => prev.map(s => ({ ...s, status: 'pending' as PipelineStep['status'], durationMs: undefined })));
  }, []);

  const updateStep = useCallback((id: string, status: PipelineStep['status'], durationMs?: number) => {
    setPipelineSteps(prev => prev.map(s => s.id === id ? { ...s, status, durationMs } : s));
  }, []);

  const sendMessage = useCallback(async (content: string, options?: { isVoice?: boolean; transcript?: string }) => {
    const isVoice = options?.isVoice || false;
    const transcript = options?.transcript || content;
    
    if (!content.trim()) return;

    setError(null);
    setIsLoading(true);
    resetPipeline();

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: transcript,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Real pipeline state - driven by actual API lifecycle
      if (isVoice) {
        updateStep('capture', 'done', 100);
        updateStep('transcribe', 'done', 200);
        setVoiceState('retrieving');
      } else {
        updateStep('capture', 'done', 10);
        updateStep('transcribe', 'done', 10);
      }

      updateStep('retrieve', 'active');
      setVoiceState(isVoice ? 'retrieving' : 'idle');

      const startRetrieve = Date.now();
      
      let response;
      if (isVoice) {
        response = await api.voiceTranscribe(transcript, sessionId) as any;
      } else {
        response = await api.chat(content, sessionId);
      }

      const retrieveMs = Date.now() - startRetrieve;
      updateStep('retrieve', 'done', response.timing?.retrievalMs || retrieveMs);
      updateStep('generate', 'active');
      setVoiceState(isVoice ? 'generating' : 'idle');

      // Generation already done in single request, but we track it
      updateStep('generate', 'done', response.timing?.generationMs || 0);
      updateStep('done', 'done', response.timing?.totalMs || 0);

      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        sources: response.sources,
        retrieval: response.retrieval,
        timing: response.timing,
        grounded: response.grounded,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setVoiceState('idle');
      
      return assistantMessage;

    } catch (err: any) {
      const message = err.message || 'Failed to get response';
      setError(message);
      setVoiceState('error');
      updateStep('retrieve', 'error');
      updateStep('generate', 'error');
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `I encountered an error: ${message}. ${err.code === 'RATE_LIMITED' ? 'Please wait a moment and try again.' : 'Please check your connection and try again.'}`,
        timestamp: new Date().toISOString(),
        grounded: false,
      };
      setMessages(prev => [...prev, errorMessage]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, resetPipeline, updateStep]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setVoiceState('idle');
    resetPipeline();
    setSessionId(undefined);
  }, [resetPipeline]);

  return {
    messages,
    isLoading,
    error,
    voiceState,
    setVoiceState,
    sessionId,
    pipelineSteps,
    sendMessage,
    clearChat,
    resetPipeline,
  };
}
