// /**
//  * chat.js — Groq Chat with streaming, sentence splitting, and JSON emotion parsing
//  */

// const getPasscode = () => localStorage.getItem('doraemon_passcode') || '';
// const MAX_HISTORY = 10;

// // Conversation state
// let conversationHistory = [];
// let aboutSanaa = localStorage.getItem('doraemon_about_sanaa') || '';

// /**
//  * Initialize chat — load persisted history
//  */
// export function initChat() {
//   try {
//     const saved = localStorage.getItem('doraemon_history');
//     if (saved) {
//       conversationHistory = JSON.parse(saved);
//     }
//   } catch (e) {
//     conversationHistory = [];
//   }
// }

// /**
//  * Get current conversation history
//  */
// export function getHistory() {
//   return [...conversationHistory];
// }

// /**
//  * Clear history
//  */
// export function clearHistory() {
//   conversationHistory = [];
//   localStorage.removeItem('doraemon_history');
// }

// /**
//  * Send a message and stream the response.
//  * @param {string} userText
//  * @param {function} onToken - called with each text token as it arrives
//  * @param {function} onSentence - called with each complete sentence
//  * @param {function} onMeta - called with {emotion, gesture} when parsed
//  * @param {function} onDone - called when response is complete with full text
//  * @param {function} onError - called on error
//  */
// export async function sendMessage(userText, { onToken, onSentence, onMeta, onDone, onError }) {
//   // Add user message to history
//   conversationHistory.push({ role: 'user', content: userText });

//   // Build messages array with memory context
//   const messages = buildMessages();

//   // Trim to max history
//   while (conversationHistory.length > MAX_HISTORY * 2) {
//     conversationHistory.shift();
//   }

//   try {
//     const response = await fetch('/api/chat', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-Passcode': getPasscode(),
//       },
//       body: JSON.stringify({ messages }),
//     });

//     if (!response.ok) {
//       throw new Error(`Chat failed: ${response.status}`);
//     }

//     const reader = response.body.getReader();
//     const decoder = new TextDecoder();
//     let fullResponse = '';

//     while (true) {
//       const { done, value } = await reader.read();
//       if (done) break;

//       const chunk = decoder.decode(value, { stream: true });
//       const lines = chunk.split('\n');

//       for (const line of lines) {
//         if (!line.startsWith('data: ')) continue;
//         const data = line.slice(6).trim();

//         if (data === '[DONE]') continue;

//         try {
//           const parsed = JSON.parse(data);

//           if (parsed.error) {
//             onError?.(parsed.error);
//             return;
//           }

//           if (parsed.content) {
//             fullResponse += parsed.content;
//             onToken?.(parsed.content);
//           }
//         } catch (e) {
//           // Skip unparseable lines
//         }
//       }
//     }

//     // Parse the full response for emotion/gesture/text
//     const meta = parseResponse(fullResponse);
//     onMeta?.(meta);

//     // Now split clean text into sentences for TTS
//     const cleanText = meta.text || fullResponse;
//     const sentences = splitIntoSentences(cleanText);
//     sentences.forEach(s => onSentence?.(s));

//     // Store assistant response in history
//     conversationHistory.push({
//       role: 'assistant',
//       content: fullResponse,
//     });

//     // Persist
//     localStorage.setItem('doraemon_history', JSON.stringify(conversationHistory));

//     onDone?.(meta.text || fullResponse);

//   } catch (error) {
//     onError?.(error.message);
//   }
// }

// /**
//  * Build messages array including memory context
//  */
// function buildMessages() {
//   const msgs = [];

//   // Add "about Sanaa" memory if we have it
//   if (aboutSanaa) {
//     msgs.push({
//       role: 'user',
//       content: `[MEMORY — Things I know about Sanaa: ${aboutSanaa}]`,
//     });
//   }

//   // Add conversation history
//   msgs.push(...conversationHistory);

//   return msgs;
// }

// /**
//  * Parse the full response — try JSON first, fall back to plain text
//  */
// function parseResponse(text) {
//   // Try to parse as JSON (the expected format)
//   try {
//     // Find JSON in the response (might have extra text around it)
//     const jsonMatch = text.match(/\{[\s\S]*\}/);
//     if (jsonMatch) {
//       const parsed = JSON.parse(jsonMatch[0]);
//       return {
//         emotion: parsed.emotion || 'neutral',
//         gesture: parsed.gesture || 'none',
//         text: parsed.text || text,
//       };
//     }
//   } catch (e) {
//     // JSON parse failed — treat as plain text
//   }

//   return {
//     emotion: 'neutral',
//     gesture: 'none',
//     text: text,
//   };
// }

// /**
//  * Split text into complete sentences and remaining buffer.
//  * Handles: . ! ? followed by space or end. Also handles ... and !?
//  */
// function splitSentences(text) {
//   const complete = [];
//   // Match sentences ending with . ! ? (possibly multiple) followed by space or end
//   const regex = /[^.!?]*[.!?]+(?:\s|$)/g;
//   let match;
//   let lastIndex = 0;

//   while ((match = regex.exec(text)) !== null) {
//     complete.push(match[0].trim());
//     lastIndex = regex.lastIndex;
//   }

//   return {
//     complete,
//     remaining: text.slice(lastIndex),
//   };
// }

// /**
//  * Split a complete clean text string into an array of sentences for TTS
//  */
// function splitIntoSentences(text) {
//   if (!text || !text.trim()) return [];
//   const results = [];
//   const regex = /[^.!?]*[.!?]+(?:\s|$)/g;
//   let match;
//   let lastIndex = 0;

//   while ((match = regex.exec(text)) !== null) {
//     const s = match[0].trim();
//     if (s) results.push(s);
//     lastIndex = regex.lastIndex;
//   }

//   // Remaining text without sentence-ending punctuation
//   const remaining = text.slice(lastIndex).trim();
//   if (remaining) results.push(remaining);

//   return results.filter(s => s.length > 0);
// }

// /**
//  * Update the "about Sanaa" memory
//  */
// export function updateMemory(info) {
//   aboutSanaa = info;
//   localStorage.setItem('doraemon_about_sanaa', info);
// }

// /**
//  * Set the passcode
//  */
// export function setPasscode(code) {
//   localStorage.setItem('doraemon_passcode', code);
// }
/**
 * chat.js — Groq Chat with streaming, sentence splitting, and JSON emotion parsing
 */

const API_URL = import.meta.env.VITE_API_URL;

const getPasscode = () => localStorage.getItem('doraemon_passcode') || '';
const MAX_HISTORY = 10;

// Conversation state
let conversationHistory = [];
let aboutSanaa = localStorage.getItem('doraemon_about_sanaa') || '';

/**
 * Initialize chat — load persisted history
 */
export function initChat() {
  try {
    const saved = localStorage.getItem('doraemon_history');

    if (saved) {
      conversationHistory = JSON.parse(saved);
    }
  } catch (e) {
    conversationHistory = [];
  }
}

/**
 * Get current conversation history
 */
export function getHistory() {
  return [...conversationHistory];
}

/**
 * Clear history
 */
export function clearHistory() {
  conversationHistory = [];
  localStorage.removeItem('doraemon_history');
}

/**
 * Send a message and stream the response.
 *
 * @param {string} userText
 * @param {function} onToken - called with each text token as it arrives
 * @param {function} onSentence - called with each complete sentence
 * @param {function} onMeta - called with {emotion, gesture, text}
 * @param {function} onDone - called when response is complete
 * @param {function} onError - called on error
 */
export async function sendMessage(
  userText,
  { onToken, onSentence, onMeta, onDone, onError }
) {
  // Add user message to history
  conversationHistory.push({
    role: 'user',
    content: userText,
  });

  // Build messages array with memory context
  const messages = buildMessages();

  // Trim to max history
  while (conversationHistory.length > MAX_HISTORY * 2) {
    conversationHistory.shift();
  }

  try {
    // Call Render backend
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'X-Passcode': getPasscode(),
      },

      body: JSON.stringify({
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body received from backend');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, {
        stream: true,
      });

      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) {
          continue;
        }

        const data = line.slice(6).trim();

        if (!data) {
          continue;
        }

        if (data === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(data);

          // Backend returned an error
          if (parsed.error) {
            onError?.(parsed.error);
            return;
          }

          // Streaming token
          if (parsed.content) {
            fullResponse += parsed.content;
            onToken?.(parsed.content);
          }
        } catch (e) {
          // Ignore malformed SSE lines
        }
      }
    }

    // Parse the complete response
    const meta = parseResponse(fullResponse);

    onMeta?.(meta);

    // Clean text for TTS
    const cleanText = meta.text || fullResponse;

    // Split into sentences
    const sentences = splitIntoSentences(cleanText);

    sentences.forEach((sentence) => {
      onSentence?.(sentence);
    });

    // Store assistant response
    conversationHistory.push({
      role: 'assistant',
      content: fullResponse,
    });

    // Persist conversation
    localStorage.setItem(
      'doraemon_history',
      JSON.stringify(conversationHistory)
    );

    // Notify completion
    onDone?.(meta.text || fullResponse);

  } catch (error) {
    console.error('Chat error:', error);

    onError?.(error.message);
  }
}

/**
 * Build messages array including memory context
 */
function buildMessages() {
  const msgs = [];

  // Add "about Sanaa" memory if available
  if (aboutSanaa) {
    msgs.push({
      role: 'user',
      content: `[MEMORY — Things I know about Sanaa: ${aboutSanaa}]`,
    });
  }

  // Add conversation history
  msgs.push(...conversationHistory);

  return msgs;
}

/**
 * Parse the full response.
 *
 * Expected backend response:
 *
 * {
 *   "emotion": "happy",
 *   "gesture": "wave",
 *   "text": "Hello Sanaa!"
 * }
 */
function parseResponse(text) {
  try {
    // Find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        emotion: parsed.emotion || 'neutral',
        gesture: parsed.gesture || 'none',
        text: parsed.text || text,
      };
    }
  } catch (e) {
    console.warn('Could not parse AI JSON response:', e);
  }

  // Fallback if AI doesn't return valid JSON
  return {
    emotion: 'neutral',
    gesture: 'none',
    text: text,
  };
}

/**
 * Split text into complete sentences.
 *
 * Handles:
 *   .
 *   !
 *   ?
 *   ...
 *   !?
 */
function splitSentences(text) {
  const complete = [];

  const regex = /[^.!?]*[.!?]+(?:\s|$)/g;

  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    complete.push(match[0].trim());

    lastIndex = regex.lastIndex;
  }

  return {
    complete,
    remaining: text.slice(lastIndex),
  };
}

/**
 * Split complete text into sentences for TTS.
 */
function splitIntoSentences(text) {
  if (!text || !text.trim()) {
    return [];
  }

  const results = [];

  const regex = /[^.!?]*[.!?]+(?:\s|$)/g;

  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const sentence = match[0].trim();

    if (sentence) {
      results.push(sentence);
    }

    lastIndex = regex.lastIndex;
  }

  // Handle remaining text without punctuation
  const remaining = text.slice(lastIndex).trim();

  if (remaining) {
    results.push(remaining);
  }

  return results.filter((sentence) => sentence.length > 0);
}

/**
 * Update the "about Sanaa" memory.
 */
export function updateMemory(info) {
  aboutSanaa = info;

  localStorage.setItem(
    'doraemon_about_sanaa',
    info
  );
}

/**
 * Set the passcode.
 */
export function setPasscode(code) {
  localStorage.setItem(
    'doraemon_passcode',
    code
  );
}