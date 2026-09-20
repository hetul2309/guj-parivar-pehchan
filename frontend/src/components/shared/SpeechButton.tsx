import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface SpeechButtonProps {
  textToRead: string;
  lang?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SpeechButton: React.FC<SpeechButtonProps> = ({
  textToRead,
  lang = 'gu-IN',
  className = '',
  size = 'md'
}) => {
  const [speaking, setSpeaking] = useState(false);

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported in this browser.');
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = lang;
    utterance.rate = 0.9;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base'
  };

  return (
    <button
      type="button"
      onClick={speak}
      title={speaking ? "વાંચન રોકો (Stop)" : "સાંભળો (Listen)"}
      className={`inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition shadow-xs ${sizeClasses[size]} ${className}`}
    >
      {speaking ? (
        <>
          <VolumeX className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
          <span className="text-[11px] font-bold text-rose-700">રોકો</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-teal-700" />
          <span className="text-[11px] font-bold">સાંભળો</span>
        </>
      )}
    </button>
  );
};
