// Web Speech API wrapper. Chromium + Safari support
// `webkitSpeechRecognition`; Firefox lacks the API entirely.
//
// Designed to drive a single mic button: caller passes callbacks for
// transcript updates, end (stopped or auto-stopped), and errors.

const SpeechRecognitionCtor =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export function isSupported() {
  return Boolean(SpeechRecognitionCtor);
}

export function createRecognizer({ onResult, onEnd, onError } = {}) {
  if (!isSupported()) {
    return {
      supported: false,
      start: () => { onError?.({ kind: "unsupported" }); },
      stop: () => {},
      isListening: () => false,
    };
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";
  recognition.maxAlternatives = 1;

  let listening = false;

  recognition.addEventListener("result", (event) => {
    let transcript = "";
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    onResult?.({ transcript: transcript.trim(), isFinal });
  });

  recognition.addEventListener("end", () => {
    listening = false;
    onEnd?.();
  });

  recognition.addEventListener("error", (event) => {
    listening = false;
    // Common errors: "not-allowed" (permission denied), "no-speech",
    // "audio-capture", "network", "aborted"
    onError?.({ kind: event.error || "unknown", event });
  });

  return {
    supported: true,
    start: () => {
      if (listening) return;
      try {
        recognition.start();
        listening = true;
      } catch (err) {
        // start() throws if already started — treat as already-listening.
        onError?.({ kind: "start-failed", error: err });
      }
    },
    stop: () => {
      if (!listening) return;
      try { recognition.stop(); } catch { /* noop */ }
    },
    isListening: () => listening,
  };
}
