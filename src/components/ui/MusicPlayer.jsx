// ══════════════════════════════════════════════════════════════
// MusicPlayer — پخش موزیک پس‌زمینه با کنترل صدا
// ══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * آدرس موزیک پیش‌فرض (رومانتیک/آرام)
 * کاربر می‌تونه از طریق prop آدرس دلخواه بده
 */
// لیست آدرس‌های موزیک (اگه اولی کار نکرد، بعدی امتحان میشه)
const MUSIC_URLS = [
  "https://cdn.pixabay.com/audio/2024/11/29/audio_89eb033835.mp3",
  "https://cdn.pixabay.com/audio/2024/02/14/audio_857a52247a.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
];

export default function MusicPlayer({
  src,
  autoPlay = false,
  volume: initialVolume = 0.3,
  className = "",
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const prevVolume = useRef(initialVolume);

  // ─── مقداردهی اولیه audio ───
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = initialVolume;
    audio.loop = true;

    const handleCanPlay = () => {
      setIsLoaded(true);
      setError(false);
    };
    const handleError = () => {
      // اگه آدرس فعلی کار نکرد، آدرس بعدی رو امتحان کن
      if (currentUrlIndex < MUSIC_URLS.length - 1) {
        setCurrentUrlIndex((i) => i + 1);
      } else {
        setError(true);
      }
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src, initialVolume, currentUrlIndex]);

  // ─── آپدیت volume ───
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // ─── پخش / توقف ───
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn("Music play failed:", err);
      setError(true);
    }
  }, [isPlaying]);

  // ─── میوت ───
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolume.current || 0.3);
    } else {
      prevVolume.current = volume;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // ─── تغییر صدا ───
  const handleVolumeChange = useCallback((e) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) setIsMuted(false);
    if (val === 0) setIsMuted(true);
  }, [isMuted]);

  // آدرس موزیک: اگه prop داده شده از اون استفاده کن، وگرنه از لیست پیش‌فرض
  const musicSrc = src || MUSIC_URLS[currentUrlIndex];

  if (error && currentUrlIndex >= MUSIC_URLS.length - 1) {
    // نمایش پلیر حتی با خطا (ولی غیرفعال)
    return (
      <div className="fixed bottom-4 left-4 z-[9990]" dir="ltr">
        <div className="bg-white/70 backdrop-blur-md border-2 border-ink/10 rounded-2xl px-3 py-2 text-[0.65rem] text-ink/40">
          🎵 موزیک در دسترس نیست
        </div>
      </div>
    );
  }

  const effectiveVolume = isMuted ? 0 : volume;

  // آیکون‌ها
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
    <>
      {/* audio element (مخفی) */}
      <audio ref={audioRef} src={musicSrc} preload="auto" loop crossOrigin="anonymous" />

      {/* پلیر شناور */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: 1 }}
        className={`fixed bottom-4 left-4 z-[9990] ${className}`}
        dir="ltr"
      >
        <div className="bg-white/90 backdrop-blur-md border-2 border-navy/15 rounded-2xl shadow-[3px_3px_0_0_rgba(33,41,90,0.1)] overflow-hidden">
          {/* دکمه اصلی + نوار صدا */}
          <div className="flex items-center gap-2 px-3 py-2">
            {/* دکمه پخش/توقف */}
            <button
              onClick={togglePlay}
              disabled={!isLoaded && !error}
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-50"
              title={!isLoaded ? "در حال بارگذاری..." : isPlaying ? "توقف" : "پخش"}
            >
              {!isLoaded ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
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

            {/* دکمه میوت */}
            <button
              onClick={toggleMute}
              className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-navy hover:bg-bg-neutral transition-colors"
              title={isMuted ? "فعال‌کردن صدا" : "بی‌صدا"}
            >
              <VolumeIcon />
            </button>

            {/* نوار لغزنده صدا */}
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
                title={`صدا: ${Math.round(effectiveVolume * 100)}٪`}
              />
            </div>

            {/* نشانگر درصد */}
            <span className="text-[0.6rem] font-bold text-ink/40 w-7 text-center">
              {Math.round(effectiveVolume * 100)}
            </span>
          </div>

          {/* نوار موسیقی (animated) */}
          {isPlaying && (
            <div className="flex items-end justify-center gap-[2px] h-2 px-3 pb-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <motion.div
                  key={i}
                  className="w-[3px] bg-teal rounded-full"
                  animate={{
                    height: [4, 12 + Math.random() * 6, 4],
                  }}
                  transition={{
                    duration: 0.6 + Math.random() * 0.4,
                    repeat: Infinity,
                    delay: i * 0.08,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
