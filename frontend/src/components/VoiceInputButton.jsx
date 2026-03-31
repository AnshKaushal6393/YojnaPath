import { useState } from "react";

export default function VoiceInputButton({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("");

  function handleVoiceCapture() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!SpeechRecognition) {
      setMessage("Voice input is not supported on this device. You can skip this field.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setMessage(
      "\u092c\u094b\u0932\u093f\u090f... \u091c\u094b \u091c\u0930\u0942\u0930\u0940 \u0932\u0917\u0947 \u0939\u092e \u0935\u0939 \u0932\u093f\u0916 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964"
    );

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      onTranscript(transcript);
      setMessage(
        transcript ? `Captured: ${transcript}` : "No speech detected. You can type or skip."
      );
    };

    recognition.onerror = () => {
      setMessage("Could not capture voice. You can type instead or leave it blank.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }

  return (
    <div className="voice-input-block">
      <button
        type="button"
        className={`voice-input-button tap-target ${isListening ? "voice-input-button--live" : ""}`}
        onClick={handleVoiceCapture}
      >
        <span aria-hidden="true">{"\u{1F3A4}"}</span>
        <span className="type-label">{isListening ? "Listening..." : "Add by voice"}</span>
      </button>
      {message ? <p className="type-caption">{message}</p> : null}
    </div>
  );
}
