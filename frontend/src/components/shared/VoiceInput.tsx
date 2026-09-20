import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { showToast } from '../../helpers/showToast';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  lang?: string;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  lang = 'gu-IN',
  className = ''
}) => {
  const [listening, setListening] = useState(false);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('warning', 'Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setListening(false);
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={listening ? "સાંભળી રહ્યું છે... (Listening...)" : "બોલો (Speak in Gujarati)"}
      className={`p-2.5 rounded-xl transition shadow-xs flex items-center justify-center ${
        listening
          ? 'bg-rose-600 text-white animate-bounce shadow-sm'
          : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 shadow-xs'
      } ${className}`}
    >
      {listening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-teal-700" />}
    </button>
  );
};
