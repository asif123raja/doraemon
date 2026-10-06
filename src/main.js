// /**
//  * main.js — App Orchestrator
//  * Wires together: chat ↔ TTS ↔ Doraemon animation ↔ VAD
//  */

// import { initChat, sendMessage, getHistory, clearHistory, setPasscode } from './chat.js';
// import { initTTS, ensureAudioContext, queueSentence, getMouthOpenness, interrupt as interruptTTS, getIsSpeaking } from './tts.js';
// import { initDoraemon, setState, setEmotion, triggerGesture } from './doraemon.js';
// import { initVAD, startListening, stopListening, toggleListening, getIsListening } from './vad.js';

// // ─── DOM Elements ─────────────────────────────────────────
// const statusBar = document.getElementById('status-bar');
// const statusText = document.getElementById('status-text');
// const messagesContainer = document.getElementById('messages');
// const speechBubble = document.getElementById('speech-bubble');
// const speechText = document.getElementById('speech-text');
// const textInput = document.getElementById('text-input');
// const sendBtn = document.getElementById('send-btn');
// const micBtn = document.getElementById('mic-btn');
// const doraemonContainer = document.getElementById('doraemon-container');
// const clearBtn = document.getElementById('clear-btn');

// // Modal elements
// const passcodeModal = document.getElementById('passcode-modal');
// const passcodeInput = document.getElementById('passcode-input');
// const passcodeSubmit = document.getElementById('passcode-submit');
// const passcodeError = document.getElementById('passcode-error');

// let isProcessing = false;

// // ─── Passcode Gate ────────────────────────────────────────

// function checkPasscode() {
//   const saved = localStorage.getItem('doraemon_passcode');
//   if (!saved || saved === '') {
//     // Show modal
//     passcodeModal.classList.remove('hidden');
//     passcodeInput.focus();
//     return false;
//   }
//   return true;
// }

// async function verifyAndSavePasscode(code) {
//   if (!code.trim()) return;

//   try {
//     // Test the passcode against the health endpoint
//     const res = await fetch('/api/health', {
//       headers: { 'X-Passcode': code },
//     });

//     if (res.ok) {
//       setPasscode(code);
//       passcodeModal.classList.add('hidden');
//       passcodeError.classList.add('hidden');
//       await startApp();
//     } else if (res.status === 401) {
//       passcodeError.classList.remove('hidden');
//       passcodeInput.value = '';
//       passcodeInput.focus();
//     } else {
//       // If no passcode is configured, just save and proceed
//       setPasscode(code);
//       passcodeModal.classList.add('hidden');
//       await startApp();
//     }
//   } catch (e) {
//     // Backend not reachable — save and continue anyway
//     setPasscode(code);
//     passcodeModal.classList.add('hidden');
//     await startApp();
//   }
// }

// // ─── Initialize ───────────────────────────────────────────

// async function init() {
//   // Wire passcode modal
//   passcodeSubmit.addEventListener('click', () => {
//     verifyAndSavePasscode(passcodeInput.value.trim());
//   });

//   passcodeInput.addEventListener('keydown', (e) => {
//     if (e.key === 'Enter') {
//       verifyAndSavePasscode(passcodeInput.value.trim());
//     }
//   });

//   const ready = checkPasscode();
//   if (ready) {
//     await startApp();
//   }
// }

// async function startApp() {
//   // Initialize modules
//   initChat();

//   initTTS({
//     onSpeakStart: () => {
//       setStatus('speaking', 'Speaking...');
//       setState('speaking');
//     },
//     onSpeakEnd: () => {
//       setStatus('ready', 'Ready');
//       setState('idle');
//       setEmotion('neutral');
//       hideSpeechBubble();
//     },
//     onSentenceStart: (sentence) => {
//       showSpeechBubble(sentence);
//     },
//     onSentenceEnd: () => {},
//   });

//   initDoraemon(doraemonContainer, getMouthOpenness);

//   await initVAD({
//     onStartListening: () => {
//       setStatus('listening', 'Listening...');
//       setState('listening');
//       doraemonContainer.classList.add('listening');
//       micBtn.classList.add('active');
//       // Interrupt any current speech
//       interruptTTS();
//     },
//     onStopListening: () => {
//       setStatus('thinking', 'Thinking...');
//       setState('thinking');
//       doraemonContainer.classList.remove('listening');
//     },
//     onTranscript: (text) => {
//       handleUserMessage(text);
//     },
//     onError: (err) => {
//       setStatus('error', 'Mic error');
//       console.error('VAD error:', err);
//       micBtn.classList.remove('active');
//       doraemonContainer.classList.remove('listening');
//     },
//   });

//   // Load existing history into chat UI
//   const history = getHistory();
//   history.forEach(msg => {
//     if (msg.role === 'user') {
//       addMessageBubble('user', msg.content);
//     } else if (msg.role === 'assistant') {
//       const parsed = tryParseJSON(msg.content);
//       addMessageBubble('assistant', parsed.text || msg.content);
//     }
//   });

//   // Show welcome message if no history
//   if (history.length === 0) {
//     setTimeout(() => {
//       addMessageBubble('system', '💙 Say hi to Doraemon! Type or tap the mic.');
//     }, 500);
//   }

//   // Event listeners
//   setupEventListeners();

//   setStatus('ready', 'Ready');
// }

// // ─── Event Listeners ──────────────────────────────────────

// function setupEventListeners() {
//   // Send button
//   sendBtn.addEventListener('click', () => {
//     const text = textInput.value.trim();
//     if (text && !isProcessing) {
//       ensureAudioContext();
//       handleUserMessage(text);
//       textInput.value = '';
//     }
//   });

//   // Enter key
//   textInput.addEventListener('keydown', (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       sendBtn.click();
//     }
//   });

//   // Mic button — toggle VAD
//   micBtn.addEventListener('click', async () => {
//     ensureAudioContext();
//     const listening = await toggleListening();
//     if (!listening) {
//       micBtn.classList.remove('active');
//       doraemonContainer.classList.remove('listening');
//       setStatus('ready', 'Ready');
//       setState('idle');
//     }
//   });

//   // Clear button
//   clearBtn.addEventListener('click', () => {
//     clearHistory();
//     messagesContainer.innerHTML = '';
//     addMessageBubble('system', '💙 Chat cleared! Say hi again!');
//     hideSpeechBubble();
//     setState('idle');
//     setEmotion('neutral');
//     setStatus('ready', 'Ready');
//   });

//   // Focus input on tap
//   textInput.addEventListener('focus', () => {
//     ensureAudioContext();
//   });
// }

// // ─── Message Handling ─────────────────────────────────────

// async function handleUserMessage(text) {
//   if (isProcessing) return;
//   isProcessing = true;

//   // Show user message
//   addMessageBubble('user', text);
//   scrollToBottom();

//   // Set thinking state
//   setStatus('thinking', 'Thinking...');
//   setState('thinking');

//   // Show typing indicator
//   const typingBubble = addTypingIndicator();

//   let fullText = '';

//   try {
//     await sendMessage(text, {
//       onToken: (token) => {
//         fullText += token;
//       },

//       onSentence: (sentence) => {
//         // Queue clean extracted sentences for TTS playback
//         queueSentence(sentence);
//       },

//       onMeta: (meta) => {
//         // Remove typing indicator
//         typingBubble.remove();

//         // Show the parsed text in chat
//         const displayText = meta.text || fullText;
//         addMessageBubble('assistant', displayText);
//         scrollToBottom();

//         // Apply emotion and gesture
//         if (meta.emotion && meta.emotion !== 'neutral') {
//           setEmotion(meta.emotion);
//         }
//         if (meta.gesture && meta.gesture !== 'none') {
//           triggerGesture(meta.gesture);
//         }
//       },

//       onDone: (finalText) => {
//         isProcessing = false;
//       },

//       onError: (error) => {
//         typingBubble.remove();
//         addMessageBubble('system', `⚠️ ${error}`);
//         setStatus('error', 'Error');
//         setState('idle');
//         isProcessing = false;
//         scrollToBottom();
//       },
//     });

//   } catch (e) {
//     typingBubble.remove();
//     addMessageBubble('system', `⚠️ ${e.message}`);
//     isProcessing = false;
//   }
// }

// // ─── UI Helpers ───────────────────────────────────────────

// function addMessageBubble(type, text) {
//   const div = document.createElement('div');
//   div.className = `message ${type}`;

//   if (type === 'assistant') {
//     div.innerHTML = `<span class="name">Doraemon</span>${escapeHTML(text)}`;
//   } else {
//     div.textContent = text;
//   }

//   messagesContainer.appendChild(div);
//   scrollToBottom();
//   return div;
// }

// function addTypingIndicator() {
//   const div = document.createElement('div');
//   div.className = 'message assistant typing';
//   div.innerHTML = `
//     <span class="name">Doraemon</span>
//     <span class="dots"><span></span><span></span><span></span></span>
//   `;
//   messagesContainer.appendChild(div);
//   scrollToBottom();
//   return div;
// }

// function showSpeechBubble(text) {
//   // Parse text from JSON if needed
//   const parsed = tryParseJSON(text);
//   const displayText = parsed.text || text;

//   speechText.textContent = displayText;
//   speechBubble.classList.remove('hidden');
// }

// function hideSpeechBubble() {
//   speechBubble.classList.add('hidden');
// }

// function setStatus(state, text) {
//   statusBar.className = state;
//   statusText.textContent = text;
// }

// function scrollToBottom() {
//   const chatArea = document.getElementById('chat-area');
//   requestAnimationFrame(() => {
//     chatArea.scrollTop = chatArea.scrollHeight;
//   });
// }

// function escapeHTML(text) {
//   const div = document.createElement('div');
//   div.textContent = text;
//   return div.innerHTML;
// }

// function tryParseJSON(text) {
//   try {
//     const match = text.match(/\{[\s\S]*\}/);
//     if (match) return JSON.parse(match[0]);
//   } catch (e) {}
//   return { text };
// }

// // ─── Start ────────────────────────────────────────────────
// init().catch(console.error);
/**
 * main.js — App Orchestrator
 * Wires together: chat ↔ TTS ↔ Doraemon animation ↔ VAD
 */

import {
  initChat,
  sendMessage,
  getHistory,
  clearHistory,
  setPasscode
} from './chat.js';

import {
  initTTS,
  ensureAudioContext,
  queueSentence,
  getMouthOpenness,
  interrupt as interruptTTS,
  getIsSpeaking
} from './tts.js';

import {
  initDoraemon,
  setState,
  setEmotion,
  triggerGesture
} from './doraemon.js';

import {
  initVAD,
  startListening,
  stopListening,
  toggleListening,
  getIsListening
} from './vad.js';

// ─── Backend URL ──────────────────────────────────────────
// Vite exposes variables prefixed with VITE_ to frontend code.
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error('VITE_API_URL is not configured.');
}

// ─── DOM Elements ─────────────────────────────────────────
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');
const messagesContainer = document.getElementById('messages');
const speechBubble = document.getElementById('speech-bubble');
const speechText = document.getElementById('speech-text');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const doraemonContainer = document.getElementById('doraemon-container');
const clearBtn = document.getElementById('clear-btn');

// Modal elements
const passcodeModal = document.getElementById('passcode-modal');
const passcodeInput = document.getElementById('passcode-input');
const passcodeSubmit = document.getElementById('passcode-submit');
const passcodeError = document.getElementById('passcode-error');

let isProcessing = false;

// ─── Passcode Gate ────────────────────────────────────────

function checkPasscode() {
  const saved = localStorage.getItem('doraemon_passcode');

  if (!saved || saved === '') {
    // Show modal
    passcodeModal.classList.remove('hidden');
    passcodeInput.focus();
    return false;
  }

  return true;
}

async function verifyAndSavePasscode(code) {
  if (!code.trim()) return;

  try {
    // Test passcode against deployed backend
    const res = await fetch(`${API_URL}/api/health`, {
      headers: {
        'X-Passcode': code,
      },
    });

    if (res.ok) {
      setPasscode(code);

      passcodeModal.classList.add('hidden');
      passcodeError.classList.add('hidden');

      await startApp();

    } else if (res.status === 401) {
      passcodeError.classList.remove('hidden');

      passcodeInput.value = '';
      passcodeInput.focus();

    } else {
      // If backend doesn't require a passcode
      setPasscode(code);

      passcodeModal.classList.add('hidden');

      await startApp();
    }

  } catch (e) {
    console.error('Backend connection error:', e);

    // Backend not reachable — save and continue anyway
    setPasscode(code);

    passcodeModal.classList.add('hidden');

    await startApp();
  }
}

// ─── Initialize ───────────────────────────────────────────

async function init() {

  // Wire passcode modal
  passcodeSubmit.addEventListener('click', () => {
    verifyAndSavePasscode(passcodeInput.value.trim());
  });

  passcodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      verifyAndSavePasscode(passcodeInput.value.trim());
    }
  });

  const ready = checkPasscode();

  if (ready) {
    await startApp();
  }
}

// ─── Start App ────────────────────────────────────────────

async function startApp() {

  // Initialize Chat
  initChat();

  // Initialize TTS
  initTTS({
    onSpeakStart: () => {
      setStatus('speaking', 'Speaking...');
      setState('speaking');
    },

    onSpeakEnd: () => {
      setStatus('ready', 'Ready');
      setState('idle');
      setEmotion('neutral');
      hideSpeechBubble();
    },

    onSentenceStart: (sentence) => {
      showSpeechBubble(sentence);
    },

    onSentenceEnd: () => { },
  });

  // Initialize Doraemon
  initDoraemon(
    doraemonContainer,
    getMouthOpenness
  );

  // Initialize VAD
  await initVAD({

    onStartListening: () => {
      setStatus('listening', 'Listening...');

      setState('listening');

      doraemonContainer.classList.add('listening');

      micBtn.classList.add('active');

      // Interrupt current speech
      interruptTTS();
    },

    onStopListening: () => {
      setStatus('thinking', 'Thinking...');

      setState('thinking');

      doraemonContainer.classList.remove('listening');
    },

    onTranscript: (text) => {
      handleUserMessage(text);
    },

    onError: (err) => {
      setStatus('error', 'Mic error');

      console.error('VAD error:', err);

      micBtn.classList.remove('active');

      doraemonContainer.classList.remove('listening');
    },
  });

  // Load existing history
  const history = getHistory();

  history.forEach(msg => {

    if (msg.role === 'user') {

      addMessageBubble(
        'user',
        msg.content
      );

    } else if (msg.role === 'assistant') {

      const parsed = tryParseJSON(msg.content);

      addMessageBubble(
        'assistant',
        parsed.text || msg.content
      );
    }
  });

  // Welcome message
  if (history.length === 0) {

    setTimeout(() => {

      addMessageBubble(
        'system',
        '💙 Say hi to Doraemon! Type or tap the mic.'
      );

    }, 500);
  }

  // Event listeners
  setupEventListeners();

  setStatus('ready', 'Ready');
}

// ─── Event Listeners ──────────────────────────────────────

function setupEventListeners() {

  // Send button
  sendBtn.addEventListener('click', () => {

    const text = textInput.value.trim();

    if (text && !isProcessing) {

      ensureAudioContext();

      handleUserMessage(text);

      textInput.value = '';
    }
  });

  // Enter key
  textInput.addEventListener('keydown', (e) => {

    if (e.key === 'Enter' && !e.shiftKey) {

      e.preventDefault();

      sendBtn.click();
    }
  });

  // Mic button
  micBtn.addEventListener('click', async () => {

    ensureAudioContext();

    const listening = await toggleListening();

    if (!listening) {

      micBtn.classList.remove('active');

      doraemonContainer.classList.remove('listening');

      setStatus('ready', 'Ready');

      setState('idle');
    }
  });

  // Clear button
  clearBtn.addEventListener('click', () => {

    clearHistory();

    messagesContainer.innerHTML = '';

    addMessageBubble(
      'system',
      '💙 Chat cleared! Say hi again!'
    );

    hideSpeechBubble();

    setState('idle');

    setEmotion('neutral');

    setStatus('ready', 'Ready');
  });

  // Focus input
  textInput.addEventListener('focus', () => {

    ensureAudioContext();
  });
}

// ─── Message Handling ─────────────────────────────────────

async function handleUserMessage(text) {

  if (isProcessing) return;

  isProcessing = true;

  // Show user message
  addMessageBubble(
    'user',
    text
  );

  scrollToBottom();

  // Thinking state
  setStatus(
    'thinking',
    'Thinking...'
  );

  setState('thinking');

  // Typing indicator
  const typingBubble = addTypingIndicator();

  let fullText = '';

  try {

    await sendMessage(text, {

      onToken: (token) => {

        fullText += token;
      },

      onSentence: (sentence) => {

        // Queue sentences for TTS
        queueSentence(sentence);
      },

      onMeta: (meta) => {

        // Remove typing indicator
        typingBubble.remove();

        // Display assistant response
        const displayText =
          meta.text || fullText;

        addMessageBubble(
          'assistant',
          displayText
        );

        scrollToBottom();

        // Emotion
        if (
          meta.emotion &&
          meta.emotion !== 'neutral'
        ) {

          setEmotion(meta.emotion);
        }

        // Gesture
        if (
          meta.gesture &&
          meta.gesture !== 'none'
        ) {

          triggerGesture(meta.gesture);
        }
      },

      onDone: (finalText) => {

        isProcessing = false;
      },

      onError: (error) => {

        typingBubble.remove();

        addMessageBubble(
          'system',
          `⚠️ ${error}`
        );

        setStatus(
          'error',
          'Error'
        );

        setState('idle');

        isProcessing = false;

        scrollToBottom();
      },
    });

  } catch (e) {

    typingBubble.remove();

    addMessageBubble(
      'system',
      `⚠️ ${e.message}`
    );

    isProcessing = false;
  }
}

// ─── UI Helpers ───────────────────────────────────────────

function addMessageBubble(type, text) {

  const div = document.createElement('div');

  div.className = `message ${type}`;

  if (type === 'assistant') {

    div.innerHTML =
      `<span class="name">Doraemon</span>${escapeHTML(text)}`;

  } else {

    div.textContent = text;
  }

  messagesContainer.appendChild(div);

  scrollToBottom();

  return div;
}

function addTypingIndicator() {

  const div = document.createElement('div');

  div.className =
    'message assistant typing';

  div.innerHTML = `
    <span class="name">Doraemon</span>
    <span class="dots">
      <span></span>
      <span></span>
      <span></span>
    </span>
  `;

  messagesContainer.appendChild(div);

  scrollToBottom();

  return div;
}

function showSpeechBubble(text) {

  const parsed = tryParseJSON(text);

  const displayText =
    parsed.text || text;

  speechText.textContent =
    displayText;

  speechBubble.classList.remove('hidden');
}

function hideSpeechBubble() {

  speechBubble.classList.add('hidden');
}

function setStatus(state, text) {

  statusBar.className = state;

  statusText.textContent = text;
}

function scrollToBottom() {

  const chatArea =
    document.getElementById('chat-area');

  requestAnimationFrame(() => {

    chatArea.scrollTop =
      chatArea.scrollHeight;
  });
}

function escapeHTML(text) {

  const div =
    document.createElement('div');

  div.textContent = text;

  return div.innerHTML;
}

function tryParseJSON(text) {

  try {

    const match =
      text.match(/\{[\s\S]*\}/);

    if (match) {

      return JSON.parse(match[0]);
    }

  } catch (e) { }

  return {
    text
  };
}

// ─── Start ────────────────────────────────────────────────

init().catch(console.error);