// /**
//  * vad.js — Voice Activity Detection using @ricky0123/vad-web
//  * Detects speech start/end, converts to WAV, sends to Groq Whisper via /api/stt
//  */

// const getPasscode = () => localStorage.getItem('doraemon_passcode') || '';

// let vadInstance = null;
// let isListening = false;

// // Callbacks
// let onStartListening = null;
// let onStopListening = null;
// let onTranscript = null;
// let onError = null;

// /**
//  * Initialize VAD system
//  */
// export async function initVAD(callbacks = {}) {
//   onStartListening = callbacks.onStartListening || null;
//   onStopListening = callbacks.onStopListening || null;
//   onTranscript = callbacks.onTranscript || null;
//   onError = callbacks.onError || null;
// }

// /**
//  * Start listening for speech
//  */
// export async function startListening() {
//   if (isListening) return;

//   try {
//     // Dynamic load VAD from CDN if not already loaded
//     if (!window.vad) {
//       await loadScript('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.wasm.min.js');
//       await loadScript('https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/bundle.min.js');
//     }

//     vadInstance = await window.vad.MicVAD.new({
//       onSpeechStart: () => {
//         console.log('[VAD] Speech started');
//         onStartListening?.();
//       },
//       onSpeechEnd: async (audio) => {
//         console.log('[VAD] Speech ended, processing...');
//         onStopListening?.();

//         try {
//           // Convert Float32Array to WAV blob
//           const wavBlob = float32ToWav(audio, 16000);

//           // Send to STT endpoint
//           const formData = new FormData();
//           formData.append('file', wavBlob, 'speech.wav');

//           const response = await fetch('/api/stt', {
//             method: 'POST',
//             headers: {
//               'X-Passcode': getPasscode(),
//             },
//             body: formData,
//           });

//           if (!response.ok) {
//             throw new Error(`STT failed: ${response.status}`);
//           }

//           const result = await response.json();
//           if (result.text && result.text.trim()) {
//             onTranscript?.(result.text.trim());
//           }
//         } catch (e) {
//           console.error('[VAD] STT error:', e);
//           onError?.(e.message);
//         }
//       },
//       positiveSpeechThreshold: 0.8,
//       negativeSpeechThreshold: 0.3,
//       minSpeechFrames: 5,
//       preSpeechPadFrames: 10,
//       redemptionFrames: 10,
//       onnxWASMBasePath: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/',
//       baseAssetPath: 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/',
//     });

//     vadInstance.start();
//     isListening = true;
//     console.log('[VAD] Started listening');

//   } catch (e) {
//     console.error('[VAD] Failed to start:', e);
//     onError?.(`Mic access failed: ${e.message}`);
//   }
// }

// /**
//  * Stop listening
//  */
// export function stopListening() {
//   if (vadInstance) {
//     vadInstance.pause();
//     isListening = false;
//     console.log('[VAD] Stopped listening');
//   }
// }

// /**
//  * Toggle listening on/off
//  */
// export async function toggleListening() {
//   if (isListening) {
//     stopListening();
//   } else {
//     await startListening();
//   }
//   return isListening;
// }

// /**
//  * Check if currently listening
//  */
// export function getIsListening() {
//   return isListening;
// }

// // ─── WAV Encoding ─────────────────────────────────────────

// /**
//  * Convert Float32Array audio data to WAV Blob
//  */
// function float32ToWav(float32Array, sampleRate) {
//   const numChannels = 1;
//   const bitsPerSample = 16;
//   const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
//   const blockAlign = numChannels * (bitsPerSample / 8);
//   const dataLength = float32Array.length * (bitsPerSample / 8);
//   const bufferLength = 44 + dataLength;

//   const buffer = new ArrayBuffer(bufferLength);
//   const view = new DataView(buffer);

//   // RIFF header
//   writeString(view, 0, 'RIFF');
//   view.setUint32(4, 36 + dataLength, true);
//   writeString(view, 8, 'WAVE');

//   // fmt chunk
//   writeString(view, 12, 'fmt ');
//   view.setUint32(16, 16, true); // chunk size
//   view.setUint16(20, 1, true);  // PCM format
//   view.setUint16(22, numChannels, true);
//   view.setUint32(24, sampleRate, true);
//   view.setUint32(28, byteRate, true);
//   view.setUint16(32, blockAlign, true);
//   view.setUint16(34, bitsPerSample, true);

//   // data chunk
//   writeString(view, 36, 'data');
//   view.setUint32(40, dataLength, true);

//   // Write samples
//   let offset = 44;
//   for (let i = 0; i < float32Array.length; i++) {
//     const sample = Math.max(-1, Math.min(1, float32Array[i]));
//     const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
//     view.setInt16(offset, int16, true);
//     offset += 2;
//   }

//   return new Blob([buffer], { type: 'audio/wav' });
// }

// function writeString(view, offset, string) {
//   for (let i = 0; i < string.length; i++) {
//     view.setUint8(offset + i, string.charCodeAt(i));
//   }
// }

// // ─── Script Loading ───────────────────────────────────────

// function loadScript(src) {
//   return new Promise((resolve, reject) => {
//     // Check if already loaded
//     if (document.querySelector(`script[src="${src}"]`)) {
//       resolve();
//       return;
//     }

//     const script = document.createElement('script');
//     script.src = src;
//     script.onload = resolve;
//     script.onerror = () => reject(new Error(`Failed to load: ${src}`));
//     document.head.appendChild(script);
//   });
// }
/**
 * vad.js — Voice Activity Detection using @ricky0123/vad-web
 *
 * Detects speech start/end, converts audio to WAV,
 * and sends it to the FastAPI backend via /api/stt.
 */

import { API_URL } from './config.js';

const getPasscode = () =>
  localStorage.getItem('doraemon_passcode') || '';

let vadInstance = null;
let isListening = false;

// Callbacks
let onStartListening = null;
let onStopListening = null;
let onTranscript = null;
let onError = null;


/**
 * Initialize VAD system
 */
export async function initVAD(callbacks = {}) {
  onStartListening =
    callbacks.onStartListening || null;

  onStopListening =
    callbacks.onStopListening || null;

  onTranscript =
    callbacks.onTranscript || null;

  onError =
    callbacks.onError || null;
}


/**
 * Start listening for speech
 */
export async function startListening() {
  if (isListening) return;

  try {
    // Dynamic load VAD from CDN if not already loaded
    if (!window.vad) {
      await loadScript(
        'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.wasm.min.js'
      );

      await loadScript(
        'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/bundle.min.js'
      );
    }

    vadInstance =
      await window.vad.MicVAD.new({

        // ─────────────────────────────────────────────
        // Speech started
        // ─────────────────────────────────────────────

        onSpeechStart: () => {
          console.log('[VAD] Speech started');

          onStartListening?.();
        },


        // ─────────────────────────────────────────────
        // Speech ended
        // ─────────────────────────────────────────────

        onSpeechEnd: async (audio) => {
          console.log(
            '[VAD] Speech ended, processing...'
          );

          onStopListening?.();

          try {
            // Convert Float32Array to WAV
            const wavBlob =
              float32ToWav(audio, 16000);

            // Create multipart form data
            const formData = new FormData();

            formData.append(
              'file',
              wavBlob,
              'speech.wav'
            );

            // Send audio to deployed FastAPI backend
            const response = await fetch(
              `${API_URL}/api/stt`,
              {
                method: 'POST',

                headers: {
                  'X-Passcode': getPasscode(),
                },

                body: formData,
              }
            );

            if (!response.ok) {
              throw new Error(
                `STT failed: ${response.status}`
              );
            }

            const result =
              await response.json();

            if (
              result.text &&
              result.text.trim()
            ) {
              onTranscript?.(
                result.text.trim()
              );
            }

          } catch (e) {
            console.error(
              '[VAD] STT error:',
              e
            );

            onError?.(e.message);
          }
        },


        // ─────────────────────────────────────────────
        // VAD configuration
        // ─────────────────────────────────────────────

        positiveSpeechThreshold: 0.8,

        negativeSpeechThreshold: 0.3,

        minSpeechFrames: 5,

        preSpeechPadFrames: 10,

        redemptionFrames: 10,


        // ONNX runtime assets
        onnxWASMBasePath:
          'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/',

        // VAD assets
        baseAssetPath:
          'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/',
      });


    // Start VAD
    vadInstance.start();

    isListening = true;

    console.log(
      '[VAD] Started listening'
    );

  } catch (e) {
    console.error(
      '[VAD] Failed to start:',
      e
    );

    onError?.(
      `Mic access failed: ${e.message}`
    );
  }
}


/**
 * Stop listening
 */
export function stopListening() {
  if (vadInstance) {
    vadInstance.pause();

    isListening = false;

    console.log(
      '[VAD] Stopped listening'
    );
  }
}


/**
 * Toggle listening on/off
 */
export async function toggleListening() {
  if (isListening) {
    stopListening();
  } else {
    await startListening();
  }

  return isListening;
}


/**
 * Check if currently listening
 */
export function getIsListening() {
  return isListening;
}


// ─── WAV Encoding ─────────────────────────────────────────

/**
 * Convert Float32Array audio data to WAV Blob
 */
function float32ToWav(
  float32Array,
  sampleRate
) {
  const numChannels = 1;

  const bitsPerSample = 16;

  const byteRate =
    sampleRate *
    numChannels *
    (bitsPerSample / 8);

  const blockAlign =
    numChannels *
    (bitsPerSample / 8);

  const dataLength =
    float32Array.length *
    (bitsPerSample / 8);

  const bufferLength =
    44 + dataLength;

  const buffer =
    new ArrayBuffer(bufferLength);

  const view =
    new DataView(buffer);


  // ─────────────────────────────────────────────
  // RIFF header
  // ─────────────────────────────────────────────

  writeString(
    view,
    0,
    'RIFF'
  );

  view.setUint32(
    4,
    36 + dataLength,
    true
  );

  writeString(
    view,
    8,
    'WAVE'
  );


  // ─────────────────────────────────────────────
  // fmt chunk
  // ─────────────────────────────────────────────

  writeString(
    view,
    12,
    'fmt '
  );

  view.setUint32(
    16,
    16,
    true
  );

  // PCM format
  view.setUint16(
    20,
    1,
    true
  );

  view.setUint16(
    22,
    numChannels,
    true
  );

  view.setUint32(
    24,
    sampleRate,
    true
  );

  view.setUint32(
    28,
    byteRate,
    true
  );

  view.setUint16(
    32,
    blockAlign,
    true
  );

  view.setUint16(
    34,
    bitsPerSample,
    true
  );


  // ─────────────────────────────────────────────
  // data chunk
  // ─────────────────────────────────────────────

  writeString(
    view,
    36,
    'data'
  );

  view.setUint32(
    40,
    dataLength,
    true
  );


  // ─────────────────────────────────────────────
  // Write samples
  // ─────────────────────────────────────────────

  let offset = 44;

  for (
    let i = 0;
    i < float32Array.length;
    i++
  ) {
    const sample =
      Math.max(
        -1,
        Math.min(
          1,
          float32Array[i]
        )
      );

    const int16 =
      sample < 0
        ? sample * 0x8000
        : sample * 0x7FFF;

    view.setInt16(
      offset,
      int16,
      true
    );

    offset += 2;
  }

  return new Blob(
    [buffer],
    {
      type: 'audio/wav',
    }
  );
}


/**
 * Write string into DataView
 */
function writeString(
  view,
  offset,
  string
) {
  for (
    let i = 0;
    i < string.length;
    i++
  ) {
    view.setUint8(
      offset + i,
      string.charCodeAt(i)
    );
  }
}


// ─── Script Loading ───────────────────────────────────────

/**
 * Dynamically load external script
 */
function loadScript(src) {
  return new Promise(
    (resolve, reject) => {

      // Check if already loaded
      if (
        document.querySelector(
          `script[src="${src}"]`
        )
      ) {
        resolve();
        return;
      }

      const script =
        document.createElement(
          'script'
        );

      script.src = src;

      script.onload = resolve;

      script.onerror = () =>
        reject(
          new Error(
            `Failed to load: ${src}`
          )
        );

      document.head.appendChild(
        script
      );
    }
  );
}