import { useRef, useCallback, useEffect } from "react";

type SoundType = "hover" | "error" | "success" | "done";

interface SoundConfig {
  hover: string;
  error: string;
  success: string;
  done: string;
}

const SOUND_PATHS: SoundConfig = {
  hover: "/assets/moving-select-sound.mp3",
  error: "/assets/error-admin-sound.mp3",
  success: "/assets/saved-sound.mp3",
  done: "/assets/sound-done-public.mp3",
};

const SOUND_DELAY = 150; // Delay in ms to prevent overlapping sounds
let lastPlayedTime: Record<SoundType, number> = {
  hover: 0,
  error: 0,
  success: 0,
  done: 0,
};

let userInteractionOccurred = false;

export const useSound = () => {
  const audioRefs = useRef<Record<SoundType, HTMLAudioElement | null>>({
    hover: null,
    error: null,
    success: null,
    done: null,
  });

  // Initialize audio elements immediately on first hook use
  const initializeAudio = useCallback(() => {
    if (typeof window === "undefined") return;

    console.debug("[Sound] Initializing audio elements");
    Object.entries(SOUND_PATHS).forEach(([soundType, path]) => {
      if (!audioRefs.current[soundType as SoundType]) {
        const audio = new Audio(path);
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audioRefs.current[soundType as SoundType] = audio;
        console.debug(`[Sound] Created audio element for ${soundType}: ${path}`);
      }
    });
  }, []);

  // Initialize audio elements on component mount
  useEffect(() => {
    initializeAudio();
  }, [initializeAudio]);

  // Set up one-time user interaction listener to enable audio playback
  useEffect(() => {
    if (userInteractionOccurred) return;

    const enableAudio = () => {
      console.debug("[Sound] User interaction detected, audio playback enabled");
      userInteractionOccurred = true;
      // Remove listeners after first interaction
      document.removeEventListener("click", enableAudio);
      document.removeEventListener("mousemove", enableAudio);
      document.removeEventListener("keydown", enableAudio);
      document.removeEventListener("touchstart", enableAudio);
    };

    document.addEventListener("click", enableAudio);
    document.addEventListener("mousemove", enableAudio);
    document.addEventListener("keydown", enableAudio);
    document.addEventListener("touchstart", enableAudio);

    return () => {
      document.removeEventListener("click", enableAudio);
      document.removeEventListener("mousemove", enableAudio);
      document.removeEventListener("keydown", enableAudio);
      document.removeEventListener("touchstart", enableAudio);
    };
  }, []);

  const playSound = useCallback(
    (type: SoundType) => {
      const currentTime = Date.now();
      const timeSinceLastPlay = currentTime - (lastPlayedTime[type] || 0);

      // Prevent overlapping sounds of the same type
      if (timeSinceLastPlay < SOUND_DELAY) {
        console.debug(`[Sound] Skipped ${type} sound (within ${SOUND_DELAY}ms)`);
        return;
      }

      const audio = audioRefs.current[type];
      if (!audio) {
        console.warn(`[Sound] Audio element for ${type} not found`);
        return;
      }

      try {
        // Reset playback to start
        audio.currentTime = 0;
        console.debug(`[Sound] Attempting to play ${type} sound from ${SOUND_PATHS[type]}`);
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.debug(`[Sound] Successfully played ${type} sound`);
              lastPlayedTime[type] = currentTime;
            })
            .catch((err) => {
              if (err.name === "NotAllowedError") {
                console.debug(`[Sound] Playback blocked (user interaction required for ${type})`);
                // Don't update lastPlayedTime, so it can retry after interaction
              } else {
                console.warn(`Failed to play ${type} sound:`, err.message);
              }
            });
        } else {
          // Old browsers that don't return a promise
          lastPlayedTime[type] = currentTime;
        }
      } catch (error) {
        console.warn(`Error playing ${type} sound:`, error);
      }
    },
    []
  );

  const playHoverSound = useCallback(() => playSound("hover"), [playSound]);
  const playErrorSound = useCallback(() => playSound("error"), [playSound]);
  const playSuccessSound = useCallback(() => playSound("success"), [playSound]);
  const playDoneSound = useCallback(() => playSound("done"), [playSound]);

  return {
    playSound,
    playHoverSound,
    playErrorSound,
    playSuccessSound,
    playDoneSound,
  };
};
