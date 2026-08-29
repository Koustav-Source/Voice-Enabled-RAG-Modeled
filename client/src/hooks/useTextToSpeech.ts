import { useState, useCallback, useRef, useEffect } from 'react';

export type TTSState = 'idle' | 'speaking' | 'paused' | 'error';

interface UseTTSOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStateChange?: (state: TTSState) => void;
}

export function useTextToSpeech(options: UseTTSOptions = {}) {
  const { language = 'en-IN', rate = 0.95, pitch = 1, volume = 1, onStateChange } = options;
  
  const [state, setState] = useState<TTSState>('idle');
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const updateState = useCallback((newState: TTSState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Try to find a suitable voice
    const preferredVoice = voices.find(v => v.lang.includes(language.split('-')[0]) && v.name.toLowerCase().includes('female'))
      || voices.find(v => v.lang.startsWith(language))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => updateState('speaking');
    utterance.onend = () => updateState('idle');
    utterance.onerror = (e) => {
      console.error('TTS error:', e);
      updateState('error');
    };
    utterance.onpause = () => updateState('paused');
    utterance.onresume = () => updateState('speaking');

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, language, rate, pitch, volume, voices, updateState]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    updateState('idle');
  }, [updateState]);

  const pause = useCallback(() => {
    if (state === 'speaking') {
      window.speechSynthesis.pause();
      updateState('paused');
    }
  }, [state, updateState]);

  const resume = useCallback(() => {
    if (state === 'paused') {
      window.speechSynthesis.resume();
      updateState('speaking');
    }
  }, [state, updateState]);

  const toggle = useCallback((text?: string) => {
    if (state === 'speaking') {
      stop();
    } else if (text) {
      speak(text);
    }
  }, [state, speak, stop]);

  return {
    state,
    isSupported,
    isSpeaking: state === 'speaking',
    speak,
    stop,
    pause,
    resume,
    toggle,
    voices,
  };
}
