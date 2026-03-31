import { useEffect, useMemo, useRef } from "react";

const OTP_LENGTH = 6;

export default function OTPInput({ value, onChange, disabled = false }) {
  const inputsRef = useRef([]);
  const digits = useMemo(() => {
    const padded = `${value}`.slice(0, OTP_LENGTH).padEnd(OTP_LENGTH, " ");
    return padded.split("").map((digit) => (digit === " " ? "" : digit));
  }, [value]);

  useEffect(() => {
    inputsRef.current = inputsRef.current.slice(0, OTP_LENGTH);
  }, []);

  function updateDigit(index, nextValue) {
    const onlyDigit = nextValue.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = onlyDigit;
    onChange(nextDigits.join(""));

    if (onlyDigit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(event, index) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(event) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    onChange(pasted);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  return (
    <div className="flex items-center justify-between gap-2" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className="h-14 w-12 rounded-2xl border border-slate-200 bg-white text-center text-xl font-semibold text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      ))}
    </div>
  );
}
