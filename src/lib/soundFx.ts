// Web Audio API based cryptographic sound FX synthesizer for GhostText
// Zero external assets required, ultra-low latency, crisp and host-proof.

import { SoundType } from "../types";

let audioCtxInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtxInstance) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioCtxInstance = new AudioCtx();
    }
  }
  if (audioCtxInstance && audioCtxInstance.state === "suspended") {
    audioCtxInstance.resume().catch(() => {});
  }
  return audioCtxInstance;
}

/**
 * Play subtle encrypted incoming message notification alert
 */
export function playIncomingMessageSound(
  soundType: SoundType = "stealth-sonar",
  volume: number = 70
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const gain = ctx.createGain();
  const normalizedVol = Math.max(0, Math.min(1, (volume / 100) * 0.25));
  const now = ctx.currentTime;

  gain.gain.setValueAtTime(0.001, now);
  gain.connect(ctx.destination);

  switch (soundType) {
    case "stealth-sonar": {
      // Gentle submarine tactical sonar ping with harmonic overtone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(780, now + 0.08);
      osc1.frequency.exponentialRampToValueAtTime(520, now + 0.35);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1040, now);
      osc2.frequency.exponentialRampToValueAtTime(1560, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(1040, now + 0.35);

      gain.gain.linearRampToValueAtTime(normalizedVol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.42);
      osc2.stop(now + 0.42);
      break;
    }

    case "crypto-chirp": {
      // Crisp 2-tone cryptographic handshake chirp
      const osc = ctx.createOscillator();
      osc.type = "triangle";

      osc.frequency.setValueAtTime(1760, now); // A6
      osc.frequency.setValueAtTime(2637, now + 0.06); // E7
      osc.frequency.setValueAtTime(3520, now + 0.12); // A7

      gain.gain.linearRampToValueAtTime(normalizedVol * 0.7, now + 0.01);
      gain.gain.setValueAtTime(normalizedVol * 0.7, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }

    case "quantum-pulse": {
      // Modern high-tech quantum digital blip
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.04);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.22);

      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

      gain.gain.linearRampToValueAtTime(normalizedVol * 0.6, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(filter);
      filter.connect(gain);

      osc.start(now);
      osc.stop(now + 0.26);
      break;
    }

    case "minimal-click":
    default: {
      // Tactile mechanical key click
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gain.gain.linearRampToValueAtTime(normalizedVol * 0.9, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.06);
      break;
    }
  }
}

/**
 * Play subtle feedback sound when user sends an encrypted message
 */
export function playMessageSentSound(volume: number = 70) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const normalizedVol = Math.max(0, Math.min(1, (volume / 100) * 0.15));

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(normalizedVol, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(990, now + 0.08);

  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.13);
}

/**
 * Play sound effect when an ephemeral message self-destructs / burns
 */
export function playBurnShredSound(volume: number = 70) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const normalizedVol = Math.max(0, Math.min(1, (volume / 100) * 0.12));

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(normalizedVol, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  gain.connect(ctx.destination);

  // Filtered white noise burst simulating ephemeral incinerator
  const bufferSize = ctx.sampleRate * 0.35;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1400, now);
  filter.Q.setValueAtTime(3, now);

  whiteNoise.connect(filter);
  filter.connect(gain);

  whiteNoise.start(now);
  whiteNoise.stop(now + 0.36);
}

/**
 * Play Call Ringing audio burst
 */
let ringingInterval: number | null = null;

export function startCallRingingSound(volume: number = 70) {
  stopCallRingingSound();

  const playBurst = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const normalizedVol = Math.max(0, Math.min(1, (volume / 100) * 0.3));

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(normalizedVol, now + 0.05);
    gain.gain.setValueAtTime(normalizedVol, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    gain.connect(ctx.destination);

    // Modern European / E2EE dual tone ring (440Hz + 480Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(440, now);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(480, now);

    osc1.connect(gain);
    osc2.connect(gain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.0);
    osc2.stop(now + 1.0);
  };

  playBurst();
  ringingInterval = window.setInterval(playBurst, 2800);
}

export function stopCallRingingSound() {
  if (ringingInterval) {
    clearInterval(ringingInterval);
    ringingInterval = null;
  }
}

/**
 * Play Call Connected fanfare
 */
export function playCallConnectedSound(volume: number = 70) {
  stopCallRingingSound();
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const normalizedVol = Math.max(0, Math.min(1, (volume / 100) * 0.3));

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(normalizedVol, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  gain.connect(ctx.destination);

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
    osc.connect(gain);
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.2);
  });
}

/**
 * Play Call Ended sound
 */
export function playCallEndedSound(volume: number = 70) {
  stopCallRingingSound();
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const normalizedVol = Math.max(0, Math.min(1, (volume / 100) * 0.25));

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(normalizedVol, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  gain.connect(ctx.destination);

  const notes = [783.99, 587.33, 440]; // G5, D5, A4 descending
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.09);
    osc.connect(gain);
    osc.start(now + idx * 0.09);
    osc.stop(now + idx * 0.09 + 0.18);
  });
}
