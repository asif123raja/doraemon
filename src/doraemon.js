/**
 * doraemon.js — Hand-drawn SVG Doraemon with animation state machine
 *
 * States: idle, listening, thinking, speaking
 * Emotions: neutral, happy, surprised, sad, laughing, thinking, excited
 * Driven by: mouthOpen (0-1), state changes, emotion triggers
 */

// State
let currentState = 'idle';
let currentEmotion = 'neutral';
let mouthOpen = 0;
let targetMouthOpen = 0;
let blinkTimer = null;
let isBlinking = false;
let bobPhase = 0;
let whiskerPhase = 0;

// SVG element references
let svg = null;
let elements = {};
let animFrameId = null;

// Callback to get mouth openness from TTS
let getMouthOpennessCallback = null;

/**
 * Initialize — create SVG and start animation loop
 */
export function initDoraemon(container, getMouthFn) {
  getMouthOpennessCallback = getMouthFn;
  svg = createDoraemonSVG();
  container.innerHTML = '';
  container.appendChild(svg);

  // Cache element references
  cacheElements();

  // Start idle behaviors
  startBlinkCycle();
  startAnimationLoop();
}

/**
 * Set character state
 */
export function setState(state) {
  if (currentState === state) return;
  currentState = state;
  applyState();
}

/**
 * Set emotion (triggers expression change)
 */
export function setEmotion(emotion) {
  currentEmotion = emotion;
  applyEmotion();
}

/**
 * Trigger a gesture animation
 */
export function triggerGesture(gesture) {
  applyGesture(gesture);
}

// ─── SVG Creation ─────────────────────────────────────────

function createDoraemonSVG() {
  const ns = 'http://www.w3.org/2000/svg';

  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 300 360');
  s.setAttribute('xmlns', ns);
  s.setAttribute('id', 'doraemon-svg');

  s.innerHTML = `
    <defs>
      <!-- Gradients -->
      <radialGradient id="bodyGrad" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#33B5E5"/>
        <stop offset="100%" stop-color="#0078AB"/>
      </radialGradient>
      <radialGradient id="faceGrad" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#F0F0F0"/>
      </radialGradient>
      <radialGradient id="noseGrad" cx="40%" cy="35%" r="50%">
        <stop offset="0%" stop-color="#FF4444"/>
        <stop offset="100%" stop-color="#CC0000"/>
      </radialGradient>
      <radialGradient id="bellGrad" cx="40%" cy="35%" r="50%">
        <stop offset="0%" stop-color="#FFE44D"/>
        <stop offset="100%" stop-color="#E6B800"/>
      </radialGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
      <filter id="noseShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.2)"/>
      </filter>
    </defs>

    <!-- Main group (for bob animation) -->
    <g id="dora-main" filter="url(#shadow)">
      <!-- Body -->
      <g id="dora-body">
        <!-- Body shape -->
        <ellipse cx="150" cy="295" rx="72" ry="55" fill="url(#bodyGrad)" stroke="#0068A0" stroke-width="1.5"/>
        <!-- White belly -->
        <ellipse cx="150" cy="295" rx="48" ry="40" fill="white" stroke="#E8E8E8" stroke-width="0.5"/>
        <!-- Pocket -->
        <path d="M 115 282 Q 115 318 150 318 Q 185 318 185 282" fill="white" stroke="#DCDCDC" stroke-width="1.5"/>
        <line x1="115" y1="282" x2="185" y2="282" stroke="#DCDCDC" stroke-width="1.5"/>
      </g>

      <!-- Arms -->
      <g id="dora-arms">
        <!-- Left arm -->
        <g id="dora-left-arm">
          <path d="M 82 270 Q 55 285 50 305" fill="none" stroke="url(#bodyGrad)" stroke-width="22" stroke-linecap="round"/>
          <circle cx="48" cy="310" r="13" fill="white" stroke="#E8E8E8" stroke-width="1"/>
        </g>
        <!-- Right arm -->
        <g id="dora-right-arm">
          <path d="M 218 270 Q 245 285 250 305" fill="none" stroke="url(#bodyGrad)" stroke-width="22" stroke-linecap="round"/>
          <circle cx="252" cy="310" r="13" fill="white" stroke="#E8E8E8" stroke-width="1"/>
        </g>
      </g>

      <!-- Feet -->
      <g id="dora-feet">
        <ellipse cx="115" cy="345" rx="32" ry="14" fill="white" stroke="#E8E8E8" stroke-width="1"/>
        <ellipse cx="185" cy="345" rx="32" ry="14" fill="white" stroke="#E8E8E8" stroke-width="1"/>
      </g>

      <!-- Head -->
      <g id="dora-head">
        <!-- Head (blue circle) -->
        <circle cx="150" cy="140" r="105" fill="url(#bodyGrad)" stroke="#0068A0" stroke-width="1.5"/>

        <!-- Face (white area) -->
        <ellipse cx="150" cy="155" rx="82" ry="80" fill="url(#faceGrad)" stroke="#E8E8E8" stroke-width="0.5"/>

        <!-- Eyes -->
        <g id="dora-eyes">
          <!-- Left eye -->
          <g id="dora-left-eye">
            <ellipse cx="130" cy="125" rx="22" ry="26" fill="white" stroke="#333" stroke-width="1.5"/>
            <g id="dora-left-pupil">
              <ellipse cx="135" cy="128" rx="8" ry="10" fill="#1a1a1a"/>
              <ellipse cx="133" cy="124" rx="3" ry="3.5" fill="white" opacity="0.9"/>
            </g>
          </g>
          <!-- Right eye -->
          <g id="dora-right-eye">
            <ellipse cx="170" cy="125" rx="22" ry="26" fill="white" stroke="#333" stroke-width="1.5"/>
            <g id="dora-right-pupil">
              <ellipse cx="165" cy="128" rx="8" ry="10" fill="#1a1a1a"/>
              <ellipse cx="163" cy="124" rx="3" ry="3.5" fill="white" opacity="0.9"/>
            </g>
          </g>
        </g>

        <!-- Eyelids (for blinking) -->
        <g id="dora-eyelids" opacity="0">
          <ellipse cx="130" cy="125" rx="22" ry="26" fill="url(#faceGrad)"/>
          <ellipse cx="170" cy="125" rx="22" ry="26" fill="url(#faceGrad)"/>
          <line x1="108" y1="125" x2="152" y2="125" stroke="#333" stroke-width="2" stroke-linecap="round"/>
          <line x1="148" y1="125" x2="192" y2="125" stroke="#333" stroke-width="2" stroke-linecap="round"/>
        </g>

        <!-- Nose -->
        <circle id="dora-nose" cx="150" cy="152" r="10" fill="url(#noseGrad)" filter="url(#noseShadow)"/>
        <!-- Nose shine -->
        <ellipse cx="147" cy="149" rx="3" ry="2.5" fill="white" opacity="0.5"/>

        <!-- Nose line down to mouth -->
        <line id="dora-nose-line" x1="150" y1="162" x2="150" y2="185" stroke="#555" stroke-width="1.5"/>

        <!-- Mouth -->
        <path id="dora-mouth"
          d="M 110 185 Q 130 195 150 190 Q 170 195 190 185"
          fill="none" stroke="#555" stroke-width="2" stroke-linecap="round"/>

        <!-- Mouth open shape (hidden by default) -->
        <ellipse id="dora-mouth-open"
          cx="150" cy="192" rx="20" ry="0"
          fill="#C0392B" stroke="#555" stroke-width="1" opacity="0"/>

        <!-- Whiskers -->
        <g id="dora-whiskers">
          <!-- Left whiskers -->
          <line class="whisker whisker-left" x1="60" y1="145" x2="105" y2="155" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
          <line class="whisker whisker-left" x1="55" y1="165" x2="103" y2="168" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
          <line class="whisker whisker-left" x1="60" y1="185" x2="105" y2="180" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Right whiskers -->
          <line class="whisker whisker-right" x1="195" y1="155" x2="240" y2="145" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
          <line class="whisker whisker-right" x1="197" y1="168" x2="245" y2="165" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
          <line class="whisker whisker-right" x1="195" y1="180" x2="240" y2="185" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
        </g>

        <!-- Collar -->
        <rect id="dora-collar" x="75" y="228" width="150" height="16" rx="8" fill="#E60012" stroke="#CC0010" stroke-width="1"/>

        <!-- Bell -->
        <g id="dora-bell">
          <circle cx="150" cy="248" r="12" fill="url(#bellGrad)" stroke="#CC9900" stroke-width="1.5"/>
          <line x1="138" y1="248" x2="162" y2="248" stroke="#CC9900" stroke-width="1"/>
          <circle cx="150" cy="252" r="2.5" fill="#CC9900"/>
        </g>
      </g>
    </g>
  `;

  return s;
}

// ─── Element caching ──────────────────────────────────────

function cacheElements() {
  elements = {
    main: svg.getElementById('dora-main'),
    head: svg.getElementById('dora-head'),
    eyes: svg.getElementById('dora-eyes'),
    leftEye: svg.getElementById('dora-left-eye'),
    rightEye: svg.getElementById('dora-right-eye'),
    leftPupil: svg.getElementById('dora-left-pupil'),
    rightPupil: svg.getElementById('dora-right-pupil'),
    eyelids: svg.getElementById('dora-eyelids'),
    nose: svg.getElementById('dora-nose'),
    noseLine: svg.getElementById('dora-nose-line'),
    mouth: svg.getElementById('dora-mouth'),
    mouthOpen: svg.getElementById('dora-mouth-open'),
    whiskers: svg.getElementById('dora-whiskers'),
    leftArm: svg.getElementById('dora-left-arm'),
    rightArm: svg.getElementById('dora-right-arm'),
    bell: svg.getElementById('dora-bell'),
    body: svg.getElementById('dora-body'),
  };
}

// ─── Animation Loop ───────────────────────────────────────

function startAnimationLoop() {
  function animate() {
    const time = performance.now() / 1000;

    // Get mouth openness from TTS
    if (getMouthOpennessCallback && currentState === 'speaking') {
      targetMouthOpen = getMouthOpennessCallback();
    } else {
      targetMouthOpen = 0;
    }

    // Smooth interpolation
    mouthOpen += (targetMouthOpen - mouthOpen) * 0.25;

    // Update mouth shape
    updateMouth(mouthOpen);

    // Idle behaviors
    if (currentState === 'idle' || currentState === 'speaking') {
      // Head bob
      bobPhase = time * 0.8;
      const bobY = Math.sin(bobPhase) * 2;
      elements.main.setAttribute('transform', `translate(0, ${bobY})`);

      // Whisker twitch
      whiskerPhase = time * 1.2;
      const whiskerOffset = Math.sin(whiskerPhase) * 1;
      const whiskers = elements.whiskers.querySelectorAll('.whisker-left');
      whiskers.forEach(w => {
        w.setAttribute('transform', `translate(0, ${whiskerOffset})`);
      });
      const whiskersR = elements.whiskers.querySelectorAll('.whisker-right');
      whiskersR.forEach(w => {
        w.setAttribute('transform', `translate(0, ${-whiskerOffset})`);
      });
    }

    // Listening state — head tilt
    if (currentState === 'listening') {
      const tilt = Math.sin(time * 2) * 2;
      elements.head.setAttribute('transform', `rotate(${tilt}, 150, 140)`);
    } else if (currentState === 'thinking') {
      // Eyes look up
      elements.leftPupil.setAttribute('transform', 'translate(3, -5)');
      elements.rightPupil.setAttribute('transform', 'translate(3, -5)');
    } else {
      elements.head.setAttribute('transform', '');
      elements.leftPupil.setAttribute('transform', '');
      elements.rightPupil.setAttribute('transform', '');
    }

    animFrameId = requestAnimationFrame(animate);
  }

  animFrameId = requestAnimationFrame(animate);
}

// ─── Mouth Animation ──────────────────────────────────────

function updateMouth(openness) {
  // Clamp
  openness = Math.max(0, Math.min(1, openness));

  if (openness < 0.05) {
    // Closed mouth — gentle smile
    elements.mouth.setAttribute('d', 'M 110 185 Q 130 195 150 190 Q 170 195 190 185');
    elements.mouth.setAttribute('opacity', '1');
    elements.mouthOpen.setAttribute('opacity', '0');
  } else {
    // Open mouth — scale the oval based on openness
    const ry = openness * 16; // max open height
    const rx = 15 + openness * 8; // width increases slightly

    elements.mouth.setAttribute('opacity', '0.3');
    elements.mouthOpen.setAttribute('rx', rx);
    elements.mouthOpen.setAttribute('ry', ry);
    elements.mouthOpen.setAttribute('opacity', '1');
    elements.mouthOpen.setAttribute('cy', 190 + openness * 3);
  }
}

// ─── Blink Cycle ──────────────────────────────────────────

function startBlinkCycle() {
  function scheduleBlink() {
    const delay = 2000 + Math.random() * 4000; // 2-6 seconds
    blinkTimer = setTimeout(() => {
      blink();
      scheduleBlink();
    }, delay);
  }
  scheduleBlink();
}

function blink() {
  if (isBlinking) return;
  isBlinking = true;

  elements.eyelids.setAttribute('opacity', '1');

  setTimeout(() => {
    elements.eyelids.setAttribute('opacity', '0');
    isBlinking = false;
  }, 150);
}

// ─── State Application ───────────────────────────────────

function applyState() {
  // Reset transforms
  elements.head.setAttribute('transform', '');
  elements.leftPupil.setAttribute('transform', '');
  elements.rightPupil.setAttribute('transform', '');

  // Apply state-specific styles
  switch (currentState) {
    case 'idle':
      // Default relaxed state — handled in animation loop
      break;

    case 'listening':
      // Eyes slightly wider (scale eyes)
      elements.leftEye.querySelector('ellipse').setAttribute('ry', '28');
      elements.rightEye.querySelector('ellipse').setAttribute('ry', '28');
      break;

    case 'thinking':
      // Handled in animation loop (eyes look up)
      break;

    case 'speaking':
      // Reset eye size to normal
      elements.leftEye.querySelector('ellipse').setAttribute('ry', '26');
      elements.rightEye.querySelector('ellipse').setAttribute('ry', '26');
      break;
  }
}

// ─── Emotion Application ─────────────────────────────────

function applyEmotion() {
  // Reset to neutral first
  resetExpression();

  switch (currentEmotion) {
    case 'happy':
      // Curved happy eyes (upside-down U)
      elements.leftPupil.innerHTML = '';
      elements.rightPupil.innerHTML = '';
      // Make eyes into happy crescents by adjusting eyelid-like shapes
      elements.leftEye.querySelector('ellipse').setAttribute('ry', '20');
      elements.rightEye.querySelector('ellipse').setAttribute('ry', '20');
      // Wider smile
      elements.mouth.setAttribute('d', 'M 105 182 Q 128 210 150 200 Q 172 210 195 182');
      // Bounce
      bounceAnimation();
      break;

    case 'surprised':
      // Wide eyes
      elements.leftEye.querySelector('ellipse').setAttribute('ry', '30');
      elements.rightEye.querySelector('ellipse').setAttribute('ry', '30');
      // O mouth
      elements.mouth.setAttribute('opacity', '0');
      elements.mouthOpen.setAttribute('rx', '14');
      elements.mouthOpen.setAttribute('ry', '14');
      elements.mouthOpen.setAttribute('opacity', '1');
      break;

    case 'sad':
      // Droopy eyes
      elements.leftPupil.setAttribute('transform', 'translate(0, 3)');
      elements.rightPupil.setAttribute('transform', 'translate(0, 3)');
      // Frown
      elements.mouth.setAttribute('d', 'M 115 195 Q 132 180 150 185 Q 168 180 185 195');
      break;

    case 'laughing':
      // Closed happy eyes (thick lines)
      elements.eyelids.setAttribute('opacity', '1');
      // Big open mouth
      elements.mouth.setAttribute('opacity', '0');
      elements.mouthOpen.setAttribute('rx', '22');
      elements.mouthOpen.setAttribute('ry', '14');
      elements.mouthOpen.setAttribute('opacity', '1');
      // Bounce
      bounceAnimation();
      break;

    case 'excited':
      // Sparkle eyes (larger pupils)
      setScale(elements.leftPupil, 1.3);
      setScale(elements.rightPupil, 1.3);
      // Big smile
      elements.mouth.setAttribute('d', 'M 105 182 Q 128 210 150 200 Q 172 210 195 182');
      // Bounce
      bounceAnimation();
      break;

    case 'thinking':
      // Eyes look up-right
      elements.leftPupil.setAttribute('transform', 'translate(4, -6)');
      elements.rightPupil.setAttribute('transform', 'translate(4, -6)');
      // Straight mouth
      elements.mouth.setAttribute('d', 'M 120 188 Q 135 188 150 188 Q 165 188 180 188');
      break;
  }

  // Auto-reset emotion after a few seconds (except when speaking)
  if (currentState !== 'speaking') {
    setTimeout(() => {
      if (currentState !== 'speaking') {
        currentEmotion = 'neutral';
        resetExpression();
      }
    }, 3000);
  }
}

function resetExpression() {
  // Reset eyes
  elements.leftEye.querySelector('ellipse').setAttribute('ry', '26');
  elements.rightEye.querySelector('ellipse').setAttribute('ry', '26');
  elements.leftPupil.setAttribute('transform', '');
  elements.rightPupil.setAttribute('transform', '');
  setScale(elements.leftPupil, 1);
  setScale(elements.rightPupil, 1);

  // Rebuild pupil contents if they were cleared
  if (elements.leftPupil.children.length === 0) {
    elements.leftPupil.innerHTML = `
      <ellipse cx="135" cy="128" rx="8" ry="10" fill="#1a1a1a"/>
      <ellipse cx="133" cy="124" rx="3" ry="3.5" fill="white" opacity="0.9"/>
    `;
  }
  if (elements.rightPupil.children.length === 0) {
    elements.rightPupil.innerHTML = `
      <ellipse cx="165" cy="128" rx="8" ry="10" fill="#1a1a1a"/>
      <ellipse cx="163" cy="124" rx="3" ry="3.5" fill="white" opacity="0.9"/>
    `;
  }

  // Reset eyelids
  if (!isBlinking) {
    elements.eyelids.setAttribute('opacity', '0');
  }

  // Reset mouth
  elements.mouth.setAttribute('d', 'M 110 185 Q 130 195 150 190 Q 170 195 190 185');
  elements.mouth.setAttribute('opacity', '1');
  elements.mouthOpen.setAttribute('opacity', '0');
}

// ─── Gesture Animations ──────────────────────────────────

function applyGesture(gesture) {
  switch (gesture) {
    case 'wave':
      waveAnimation();
      break;
    case 'nod':
      nodAnimation();
      break;
    case 'shake':
      shakeAnimation();
      break;
    case 'jump':
      bounceAnimation();
      break;
    case 'clap':
      // Simple body bounce for clap
      bounceAnimation();
      break;
  }
}

function waveAnimation() {
  const arm = elements.rightArm;
  const frames = [
    { transform: 'rotate(-15, 218, 270)', time: 0 },
    { transform: 'rotate(-30, 218, 270)', time: 200 },
    { transform: 'rotate(-15, 218, 270)', time: 400 },
    { transform: 'rotate(-30, 218, 270)', time: 600 },
    { transform: '', time: 800 },
  ];

  animateFrames(arm, frames);
}

function nodAnimation() {
  const head = elements.head;
  const frames = [
    { transform: 'translate(0, 5)', time: 0 },
    { transform: 'translate(0, 0)', time: 200 },
    { transform: 'translate(0, 5)', time: 400 },
    { transform: '', time: 600 },
  ];

  animateFrames(head, frames);
}

function shakeAnimation() {
  const head = elements.head;
  const frames = [
    { transform: 'rotate(-5, 150, 140)', time: 0 },
    { transform: 'rotate(5, 150, 140)', time: 150 },
    { transform: 'rotate(-5, 150, 140)', time: 300 },
    { transform: 'rotate(5, 150, 140)', time: 450 },
    { transform: '', time: 600 },
  ];

  animateFrames(head, frames);
}

function bounceAnimation() {
  const main = elements.main;
  const frames = [
    { transform: 'translate(0, -8)', time: 0 },
    { transform: 'translate(0, 0)', time: 150 },
    { transform: 'translate(0, -5)', time: 300 },
    { transform: 'translate(0, 0)', time: 450 },
  ];

  animateFrames(main, frames);
}

function animateFrames(element, frames) {
  frames.forEach(({ transform, time }) => {
    setTimeout(() => {
      element.setAttribute('transform', transform);
    }, time);
  });
}

function setScale(element, scale) {
  element.style.transform = scale === 1 ? '' : `scale(${scale})`;
  element.style.transformOrigin = 'center';
}

/**
 * Cleanup
 */
export function destroyDoraemon() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (blinkTimer) clearTimeout(blinkTimer);
}
