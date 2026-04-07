import { useState } from "react";
import { useTranslation } from "react-i18next";
import { parseVoiceProfileTranscript } from "../lib/voiceProfileParser";

export default function VoiceInputButton({
  availableFields = [],
  onApply,
  appendTranscriptToNotes = false,
}) {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("");

  function handleVoiceCapture() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!SpeechRecognition) {
      setMessage(t("adaptiveForm.voiceUnsupported"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setMessage(t("adaptiveForm.voiceListeningHint"));

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      const parsed = parseVoiceProfileTranscript(transcript, availableFields);
      onApply({
        ...parsed,
        appendTranscriptToNotes,
      });
      setMessage(
        parsed.matchedFields.length
          ? t("adaptiveForm.voiceFieldsUpdated", {
              fields: parsed.matchedFields.join(", "),
            })
          : t("adaptiveForm.voiceNoMatch")
      );
    };

    recognition.onerror = () => {
      setMessage(t("adaptiveForm.voiceError"));
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
        <span className="type-label">
          {isListening ? t("adaptiveForm.voiceListening") : t("adaptiveForm.voiceButton")}
        </span>
      </button>
      {message ? <p className="type-caption">{message}</p> : null}
    </div>
  );
}
