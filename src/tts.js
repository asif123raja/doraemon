// /**
//  * tts.js — edge-tts MP3 sentence queue with Web Audio lip-sync
//  *
//  * Flow: sentence string → fetch MP3 from /api/tts → decode → play via AudioContext
//  *       → AnalyserNode → getMouthOpenness() for animation
//  */

// const getPasscode = () => localStorage.getItem('doraemon_passcode') || '';

// let audioContext = null;
// let analyser = null;
// let gainNode = null;
// let dataArray = null;
// let currentSource = null;
// let mouthOpenness = 0;
// let isSpeaking = false;

// // Sentence queue
// const sentenceQueue = [];
// let isProcessing = false;
// let prefetchCache = new Map(); // sentence → ArrayBuffer

// // Callbacks
// let onSpeakStart = null;
// let onSpeakEnd = null;
// let onSentenceStart = null;
// let onSentenceEnd = null;

// /**
//  * Initialize TTS audio system
//  */
// export function initTTS(callbacks = {}) {
//   onSpeakStart = callbacks.onSpeakStart || null;
//   onSpeakEnd = callbacks.onSpeakEnd || null;
//   onSentenceStart = callbacks.onSentenceStart || null;
//   onSentenceEnd = callbacks.onSentenceEnd || null;
// }

// /**
//  * Ensure AudioContext is created (must be called from user gesture)
//  */
// export function ensureAudioContext() {
//   if (!audioContext) {
//     audioContext = new (window.AudioContext || window.webkitAudioContext)();
//     analyser = audioContext.createAnalyser();
//     analyser.fftSize = 256;
//     analyser.smoothingTimeConstant = 0.6;
//     gainNode = audioContext.createGain();
//     gainNode.connect(analyser);
//     analyser.connect(audioContext.destination);
//     dataArray = new Uint8Array(analyser.frequencyBinCount);
//   }

//   if (audioContext.state === 'suspended') {
//     audioContext.resume();
//   }
// }

// /**
//  * Queue a sentence for TTS playback
//  */
// export function queueSentence(sentence) {
//   if (!sentence.trim()) return;

//   sentenceQueue.push(sentence);

//   // Start prefetching the MP3 immediately
//   prefetchMP3(sentence);

//   // Start processing if not already
//   if (!isProcessing) {
//     processQueue();
//   }
// }

// /**
//  * Get current mouth openness (0-1) for lip-sync animation
//  */
// export function getMouthOpenness() {
//   if (!isSpeaking || !analyser || !dataArray) return 0;

//   analyser.getByteFrequencyData(dataArray);

//   // Focus on voice frequencies (roughly 80-3000 Hz)
//   // With fftSize=256 and 44.1kHz sampleRate, each bin ≈ 172Hz
//   // Bins 0-17 cover roughly 0-3000Hz
//   let sum = 0;
//   const voiceBins = Math.min(18, dataArray.length);
//   for (let i = 1; i < voiceBins; i++) {
//     sum += dataArray[i];
//   }
//   const average = sum / (voiceBins - 1);

//   // Normalize to 0-1 with some sensitivity adjustment
//   const raw = Math.min(1, average / 128);

//   // Smooth the value (lerp toward target)
//   mouthOpenness += (raw - mouthOpenness) * 0.35;

//   return mouthOpenness;
// }

// /**
//  * Whether TTS is currently speaking
//  */
// export function getIsSpeaking() {
//   return isSpeaking;
// }

// /**
//  * Stop all speech and clear the queue
//  */
// export function interrupt() {
//   sentenceQueue.length = 0;
//   prefetchCache.clear();

//   if (currentSource) {
//     try {
//       currentSource.stop();
//     } catch (e) { /* ignore */ }
//     currentSource = null;
//   }

//   isSpeaking = false;
//   mouthOpenness = 0;
//   isProcessing = false;
//   onSpeakEnd?.();
// }

// /**
//  * Prefetch MP3 for a sentence
//  */
// async function prefetchMP3(sentence) {
//   if (prefetchCache.has(sentence)) return;

//   try {
//     const response = await fetch('/api/tts', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-Passcode': getPasscode(),
//       },
//       body: JSON.stringify({ text: sentence }),
//     });

//     if (response.ok) {
//       const arrayBuffer = await response.arrayBuffer();
//       prefetchCache.set(sentence, arrayBuffer);
//     }
//   } catch (e) {
//     console.warn('TTS prefetch failed:', e);
//   }
// }

// /**
//  * Process the sentence queue sequentially
//  */
// async function processQueue() {
//   if (isProcessing) return;
//   isProcessing = true;

//   if (!isSpeaking && sentenceQueue.length > 0) {
//     isSpeaking = true;
//     onSpeakStart?.();
//   }

//   while (sentenceQueue.length > 0) {
//     const sentence = sentenceQueue.shift();
//     onSentenceStart?.(sentence);

//     try {
//       await playSentence(sentence);
//     } catch (e) {
//       console.warn('Failed to play sentence:', e);
//     }

//     onSentenceEnd?.(sentence);

//     // Tiny gap between sentences for natural rhythm
//     await sleep(100);
//   }

//   isSpeaking = false;
//   mouthOpenness = 0;
//   isProcessing = false;
//   onSpeakEnd?.();
// }

// /**
//  * Play a single sentence: get MP3 → decode → play
//  */
// async function playSentence(sentence) {
//   ensureAudioContext();

//   // Get audio data (from prefetch cache or fetch now)
//   let arrayBuffer = prefetchCache.get(sentence);
//   if (!arrayBuffer) {
//     const response = await fetch('/api/tts', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-Passcode': getPasscode(),
//       },
//       body: JSON.stringify({ text: sentence }),
//     });

//     if (!response.ok) {
//       throw new Error(`TTS failed: ${response.status}`);
//     }

//     arrayBuffer = await response.arrayBuffer();
//   }

//   prefetchCache.delete(sentence);

//   // Decode audio
//   const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

//   // Play through analyser for lip-sync
//   return new Promise((resolve, reject) => {
//     const source = audioContext.createBufferSource();
//     source.buffer = audioBuffer;
//     source.connect(gainNode);
//     currentSource = source;

//     source.onended = () => {
//       currentSource = null;
//       resolve();
//     };

//     source.start();
//   });
// }

// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }
/**
 * tts.js — edge-tts MP3 sentence queue with Web Audio lip-sync
 *
 * Flow:
 * sentence string
 *      ↓
 * fetch MP3 from backend /api/tts
 *      ↓
 * decode → play via AudioContext
 *      ↓
 * AnalyserNode → getMouthOpenness()
 */

const API_URL = import.meta.env.VITE_API_URL;

const getPasscode = () =>
  localStorage.getItem('doraemon_passcode') || '';

let audioContext = null;
let analyser = null;
let gainNode = null;
let dataArray = null;
let currentSource = null;

let mouthOpenness = 0;
let isSpeaking = false;

// Sentence queue
const sentenceQueue = [];
let isProcessing = false;

// sentence → ArrayBuffer
let prefetchCache = new Map();

// Callbacks
let onSpeakStart = null;
let onSpeakEnd = null;
let onSentenceStart = null;
let onSentenceEnd = null;


/**
 * Initialize TTS audio system
 */
export function initTTS(callbacks = {}) {
  onSpeakStart = callbacks.onSpeakStart || null;
  onSpeakEnd = callbacks.onSpeakEnd || null;
  onSentenceStart = callbacks.onSentenceStart || null;
  onSentenceEnd = callbacks.onSentenceEnd || null;
}


/**
 * Ensure AudioContext is created.
 *
 * Must normally be called from a user gesture
 * because browsers can block autoplay audio.
 */
export function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;

    gainNode = audioContext.createGain();

    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);

    dataArray = new Uint8Array(
      analyser.frequencyBinCount
    );
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}


/**
 * Queue a sentence for TTS playback.
 */
export function queueSentence(sentence) {
  if (!sentence || !sentence.trim()) {
    return;
  }

  sentenceQueue.push(sentence);

  // Start downloading audio immediately.
  prefetchMP3(sentence);

  // Start queue processor if not already running.
  if (!isProcessing) {
    processQueue();
  }
}


/**
 * Get current mouth openness (0-1)
 * for Doraemon lip-sync animation.
 */
export function getMouthOpenness() {
  if (
    !isSpeaking ||
    !analyser ||
    !dataArray
  ) {
    return 0;
  }

  analyser.getByteFrequencyData(dataArray);

  // Focus on voice frequencies.
  let sum = 0;

  const voiceBins = Math.min(
    18,
    dataArray.length
  );

  for (let i = 1; i < voiceBins; i++) {
    sum += dataArray[i];
  }

  const average =
    sum / (voiceBins - 1);

  // Normalize to 0-1.
  const raw = Math.min(
    1,
    average / 128
  );

  // Smooth mouth movement.
  mouthOpenness +=
    (raw - mouthOpenness) * 0.35;

  return mouthOpenness;
}


/**
 * Whether TTS is currently speaking.
 */
export function getIsSpeaking() {
  return isSpeaking;
}


/**
 * Stop all speech and clear the queue.
 */
export function interrupt() {
  // Clear queued sentences.
  sentenceQueue.length = 0;

  // Clear prefetched audio.
  prefetchCache.clear();

  // Stop current audio.
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Ignore if already stopped.
    }

    currentSource = null;
  }

  isSpeaking = false;
  mouthOpenness = 0;
  isProcessing = false;

  onSpeakEnd?.();
}


/**
 * Prefetch MP3 for a sentence.
 *
 * Backend:
 * https://doraemon-backend-692r.onrender.com/api/tts
 */
async function prefetchMP3(sentence) {
  if (prefetchCache.has(sentence)) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/tts`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'X-Passcode': getPasscode(),
        },

        body: JSON.stringify({
          text: sentence,
        }),
      }
    );

    if (!response.ok) {
      console.warn(
        `TTS prefetch failed: ${response.status}`
      );

      return;
    }

    const arrayBuffer =
      await response.arrayBuffer();

    prefetchCache.set(
      sentence,
      arrayBuffer
    );

  } catch (e) {
    console.warn(
      'TTS prefetch failed:',
      e
    );
  }
}


/**
 * Process the sentence queue sequentially.
 */
async function processQueue() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  // Start speaking.
  if (
    !isSpeaking &&
    sentenceQueue.length > 0
  ) {
    isSpeaking = true;

    onSpeakStart?.();
  }

  while (sentenceQueue.length > 0) {
    const sentence =
      sentenceQueue.shift();

    onSentenceStart?.(sentence);

    try {
      await playSentence(sentence);
    } catch (e) {
      console.warn(
        'Failed to play sentence:',
        e
      );
    }

    onSentenceEnd?.(sentence);

    // Small pause between sentences.
    await sleep(100);
  }

  isSpeaking = false;
  mouthOpenness = 0;
  isProcessing = false;

  onSpeakEnd?.();
}


/**
 * Play a single sentence.
 *
 * Gets MP3 from:
 * ${API_URL}/api/tts
 *
 * Then decodes and plays it through
 * the analyser for lip-sync.
 */
async function playSentence(sentence) {
  ensureAudioContext();

  // First try prefetched audio.
  let arrayBuffer =
    prefetchCache.get(sentence);

  // If it isn't prefetched yet,
  // request it directly.
  if (!arrayBuffer) {
    const response = await fetch(
      `${API_URL}/api/tts`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'X-Passcode': getPasscode(),
        },

        body: JSON.stringify({
          text: sentence,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `TTS failed: ${response.status}`
      );
    }

    arrayBuffer =
      await response.arrayBuffer();
  }

  // Remove from cache.
  prefetchCache.delete(sentence);

  // Decode MP3.
  const audioBuffer =
    await audioContext.decodeAudioData(
      arrayBuffer.slice(0)
    );

  // Play through analyser.
  return new Promise(
    (resolve, reject) => {
      try {
        const source =
          audioContext.createBufferSource();

        source.buffer = audioBuffer;

        // Audio flow:
        //
        // source
        //   ↓
        // gainNode
        //   ↓
        // analyser
        //   ↓
        // speakers
        source.connect(gainNode);

        currentSource = source;

        source.onended = () => {
          currentSource = null;
          resolve();
        };

        source.start();

      } catch (error) {
        currentSource = null;
        reject(error);
      }
    }
  );
}


/**
 * Small delay helper.
 */
function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}