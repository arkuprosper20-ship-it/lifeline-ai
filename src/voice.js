// LIFELINE AI - Voice recording and speech recognition
let mediaRecorder = null;
let audioChunks = [];
let stream = null;

export function isSpeechRecognitionSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function isMediaRecorderSupported() {
  return 'MediaRecorder' in window && 'navigator' in window && 'mediaDevices' in navigator;
}

export async function startRecording() {
  if (!isMediaRecorderSupported()) {
    throw new Error("Voice recording is not supported in this browser.");
  }
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };
    mediaRecorder.onerror = (event) => {
      reject(new Error("Audio recording error: " + event.error?.message || "unknown error"));
    };
    mediaRecorder.start();
    resolve();
  });
}

export function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder) {
      resolve(new Blob([], { type: "audio/webm" }));
      return;
    }
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      audioChunks = [];
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      resolve(blob);
    };
    mediaRecorder.stop();
  });
}

export function useBrowserSpeechRecognition(onResult, onError) {
  if (!isSpeechRecognitionSupported()) {
    onError(new Error("Speech recognition not available in this browser."));
    return null;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";
  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (finalTranscript) {
      onResult(finalTranscript);
    } else if (interimTranscript) {
      onResult(interimTranscript, true);
    }
  };
  recognition.onerror = (event) => {
    onError(new Error(event.error || "Speech recognition error."));
  };
  recognition.onend = () => {
    console.log("[LIFELINE] Speech recognition ended");
  };
  return recognition;
}

export function dataURLtoBlob(dataUrl) {
  const parts = dataUrl.split(";base64,");
  const byteString = atob(parts[1]);
  const mime = parts[0].split(":")[1];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}
