// ══════════════════════════════════════════════════════════════
// MusicPlayer — موزیک پس‌زمینه با Web Audio API
// بدون نیاز به فایل MP3 یا CDN — همیشه کار می‌کنه! 🎵
// ══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

// ─── ساخت صدای Ambient ───
function createAmbientSound(ctx) {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  const nodes = [];

  // Pad: آکورد ملایم (C-E-G-C)
  const notes = [261.63, 329.63, 392.0, 523.25];
  for (const freq of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.value = freq;

    // LFO برای نوسان ملایم
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.08 + Math.random() * 0.15;
    lfoGain.gain.value = freq * 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    filter.type = "lowpass";
    filter.frequency.value = 600 + Math.random() * 400;
    filter.Q.value = 0.3;

    gain.gain.value = 0.07;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();
    nodes.push(osc, lfo);
  }

  // بیس ملایم
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  const bassFilter = ctx.createBiquadFilter();
  bass.type = "sine";
  bass.frequency.value = 65.41;
  bassFilter.type = "lowpass";
  bassFilter.frequency.value = 150;
  bassGain.gain.value = 0.05;
  bass.connect(bassFilter);
  bassFilter.connect(bassGain);
  bassGain.connect(masterGain);
  bass.start();
  nodes.push(bass);

  // صدای باد ملایم (noise)
  const bufSize = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const nf = ctx.createBiquadFilter();
  nf.type = "bandpass";
  nf.frequency.value = 350;
  nf.Q.value = 0.2;
  const ng = ctx.createGain();
  ng.gain.value = 0.012;
  noise.connect(nf);
  nf.connect(ng);
  ng.connect(masterGain);
  noise.start();
  nodes.push(noise);

  return { masterGain, nodes };
}

// ─── کامپوننت اصلی ───
export default function MusicPlayer({ volume: initialVolume = 0.3, className = "" }) {
  const ctxRef = useRef(null);
  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolume = useRef(initialVolume);

  const togglePlay = useCallback(async () => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      if (isPlaying) {
        // توقف
        if (soundRef.current) {
          soundRef.current.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          const ref = soundRef.current;
          setTimeout(() => {
            ref.nodes.forEach((n) => { try { n.stop(); } catch {} });
          }, 600);
          soundRef.current = null;
        }
        setIsPlaying(false);
      } else {
        // شروع
        const sound = createAmbientSound(ctx);
        soundRef.current = sound;
        const targetVol = isMuted ? 0 : volume;
        sound.masterGain.gain.linearRampToValueAtTime(targetVol * 0.5, ctx.currentTime + 1.5);
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn("Audio failed:", err);
    }
  }, [isPlaying, volume, isMuted]);

  const toggleMute = useCallback(() => {
    const ctx = ctxRef.current;
    if (isMuted) {
      setIsMuted(false);
      if (ctx && soundRef.current) {
        soundRef.current.masterGain.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.3);
      }
    } else {
      prevVolume.current = volume;
      setIsMuted(true);
      if (ctx && soundRef.current) {
        soundRef.current.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      }
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((e) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (ctxRef.current && soundRef.current && !isMuted) {
      soundRef.current.masterGain.gain.linearRampToValueAtTime(val * 0.5, ctxRef.current.currentTime + 0.1);
    }
    if (val === 0) setIsMuted(true);
    else if (isMuted) setIsMuted(false);
  }, [isMuted]);

  const effectiveVolume = isMuted ? 0 : volume;

  const VolumeIcon = () => {
    if (isMuted || effectiveVolume === 0) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      );
    }
    if (effectiveVolume < 0.5) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      );
    }
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 1 }}
      className={`fixed bottom-4 left-4 z-[9990] ${className}`}
      dir="ltr"
    >
      <div className="bg-white/90 backdrop-blur-md border-2 border-navy/15 rounded-2xl shadow-[3px_3px_0_0_rgba(33,41,90,0.1)] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-navy text-white hover:bg-navy/90 transition-colors"
            title={isPlaying ? "توقف" : "پخش موزیک"}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          {/* Mute */}
          <button
            onClick={toggleMute}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-navy hover:bg-bg-neutral transition-colors"
            title={isMuted ? "فعال‌کردن صدا" : "بی‌صدا"}
          >
            <VolumeIcon />
          </button>

          {/* Volume slider */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[80px] max-w-[120px]">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={effectiveVolume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-ink/15 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[1px_1px_0_0_rgba(0,0,0,0.15)]
                [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-teal [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>

          <span className="text-[0.6rem] font-bold text-ink/40 w-7 text-center">
            {Math.round(effectiveVolume * 100)}
          </span>
        </div>

        {/* Animated bars */}
        {isPlaying && (
          <div className="flex items-end justify-center gap-[2px] h-2 px-3 pb-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <motion.div
                key={i}
                className="w-[3px] bg-teal rounded-full"
                animate={{ height: [4, 10 + Math.random() * 8, 4] }}
                transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, delay: i * 0.07 }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
