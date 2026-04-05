import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Play, Pause, Square, ChevronUp, ChevronDown, Volume2, RotateCcw } from 'lucide-react';

type Phase = {
  id: string;
  hours: number;
  minutes: number;
  seconds: number;
  repeat: number;
};

export default function App() {
  const [phases, setPhases] = useState<Phase[]>(() => {
    const saved = localStorage.getItem('meditation-phases');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved phases", e);
      }
    }
    return [{ id: 'phase-1', hours: 0, minutes: 5, seconds: 0, repeat: 1 }];
  });

  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('meditation-volume');
    if (saved) {
      try {
        return parseFloat(saved);
      } catch (e) {}
    }
    return 0.5;
  });

  const [isCountdownEnabled, setIsCountdownEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('meditation-countdown-enabled');
    return saved ? JSON.parse(saved) : false;
  });

  const [countdownSeconds, setCountdownSeconds] = useState<number>(() => {
    const saved = localStorage.getItem('meditation-countdown-seconds');
    return saved ? parseInt(saved, 10) : 10;
  });

  useEffect(() => {
    localStorage.setItem('meditation-phases', JSON.stringify(phases));
  }, [phases]);

  useEffect(() => {
    localStorage.setItem('meditation-volume', volume.toString());
    if (bell1Ref.current) bell1Ref.current.volume = volume;
    if (bell2Ref.current) bell2Ref.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('meditation-countdown-enabled', JSON.stringify(isCountdownEnabled));
  }, [isCountdownEnabled]);

  useEffect(() => {
    localStorage.setItem('meditation-countdown-seconds', countdownSeconds.toString());
  }, [countdownSeconds]);

  const [executionPhases, setExecutionPhases] = useState<Phase[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [wasRunningBeforeStop, setWasRunningBeforeStop] = useState(false);
  
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [extendedTime, setExtendedTime] = useState(0);
  const [isExtended, setIsExtended] = useState(false);
  
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          console.error('Wake Lock release error:', err);
        }
      }
    };

    if (isRunning) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isRunning]);

  const bell1Ref = useRef<HTMLAudioElement>(null);
  const bell2Ref = useRef<HTMLAudioElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const totalSeconds = phases.reduce((acc, phase) => {
    const phaseSeconds = (phase.hours || 0) * 3600 + (phase.minutes || 0) * 60 + (phase.seconds || 0);
    const repeats = phase.repeat || 1;
    return acc + (phaseSeconds * repeats);
  }, 0);

  const calculateTotalTimeRemaining = () => {
    if (isFinished || isExtended) return 0;
    if (activePhaseIndex === null) return 0;
    
    let remaining = timeLeft;
    for (let i = activePhaseIndex + 1; i < executionPhases.length; i++) {
      remaining += (executionPhases[i].hours || 0) * 3600 + executionPhases[i].minutes * 60 + executionPhases[i].seconds;
    }
    return remaining;
  };

  const formatTotalTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatVerboseTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h} hours ${m} minutes and ${s} seconds`;
  };

  const getSessionStats = () => {
    let sessionTime = 0;
    if (isExtended || isFinished) {
      sessionTime = totalSeconds;
    } else if (activePhaseIndex !== null) {
      sessionTime = totalSeconds - calculateTotalTimeRemaining();
    }
    const extTime = extendedTime;
    const total = sessionTime + extTime;
    return { sessionTime, extTime, total };
  };

  const clearAudioTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const playStrike = (audioElement: HTMLAudioElement | null) => {
    if (!audioElement) return;
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.volume = volume;
    audioElement.play().catch(e => console.log("Audio play failed:", e));
  };

  const playStartSequence = () => {
    clearAudioTimeouts();
    playStrike(bell1Ref.current); // T = 0
    timeoutsRef.current.push(setTimeout(() => playStrike(bell1Ref.current), 4000)); // T = 4
    timeoutsRef.current.push(setTimeout(() => playStrike(bell1Ref.current), 8000)); // T = 8
  };

  const playTransitionSequence = () => {
    clearAudioTimeouts();
    playStrike(bell2Ref.current); // T = 0
  };

  const playEndSequence = () => {
    clearAudioTimeouts();
    playStrike(bell1Ref.current); // T = 0
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      if (isExtended) {
        interval = setInterval(() => {
          setExtendedTime(prev => prev + 1);
        }, 1000);
      } else if (timeLeft > 0) {
        interval = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else if (timeLeft === 0) {
        if (isCountingDown) {
          // Countdown finished, start phase 0
          setIsCountingDown(false);
          playStartSequence();
          setActivePhaseIndex(0);
          setTimeLeft((executionPhases[0].hours || 0) * 3600 + executionPhases[0].minutes * 60 + executionPhases[0].seconds);
        } else if (activePhaseIndex !== null) {
          if (activePhaseIndex < executionPhases.length - 1) {
            // Transition to next phase
            playTransitionSequence();
            const nextIndex = activePhaseIndex + 1;
            setActivePhaseIndex(nextIndex);
            setTimeLeft((executionPhases[nextIndex].hours || 0) * 3600 + executionPhases[nextIndex].minutes * 60 + executionPhases[nextIndex].seconds);
          } else {
            // Sequence completion
            playEndSequence();
            setIsExtended(true);
            setIsFinished(true);
          }
        }
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, activePhaseIndex, executionPhases, isCountingDown, isExtended]);

  const handlePhaseChange = (id: string, field: 'hours' | 'minutes' | 'seconds' | 'repeat', value: string) => {
    if (value === '') {
      setPhases(phases.map(p => p.id === id ? { ...p, [field]: 0 } : p));
      return;
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    
    let clampedValue = num;
    if (field === 'hours') clampedValue = Math.max(0, Math.min(99, num));
    if (field === 'minutes') clampedValue = Math.max(0, Math.min(99, num));
    if (field === 'seconds') clampedValue = Math.max(0, Math.min(59, num));
    if (field === 'repeat') clampedValue = Math.max(0, Math.min(99, num));
    
    setPhases(phases.map(p => p.id === id ? { ...p, [field]: clampedValue } : p));
  };

  const handleIncrement = (id: string, field: 'hours' | 'minutes' | 'seconds' | 'repeat', delta: number) => {
    setPhases(phases.map(p => {
      if (p.id !== id) return p;
      let current = p[field] || 0;
      let next = current + delta;
      if (field === 'hours') next = Math.max(0, Math.min(99, next));
      if (field === 'minutes') next = Math.max(0, Math.min(99, next));
      if (field === 'seconds') next = Math.max(0, Math.min(59, next));
      if (field === 'repeat') next = Math.max(1, Math.min(99, next));
      return { ...p, [field]: next };
    }));
  };

  const handleBlur = () => {
    setPhases(phases.map(p => {
      let { hours, minutes, seconds, repeat } = p;
      const totalSeconds = (hours || 0) * 3600 + minutes * 60 + seconds;
      if (totalSeconds < 30) {
        hours = 0;
        minutes = 0;
        seconds = 30;
      }
      if (!repeat || repeat < 1) {
        repeat = 1;
      }
      return { ...p, hours, minutes, seconds, repeat };
    }));
  };

  const addPhase = () => {
    const newId = `phase-${Date.now()}`;
    setPhases([...phases, { id: newId, hours: 0, minutes: 5, seconds: 0, repeat: 1 }]);
  };

  const deletePhase = (id: string) => {
    if (phases.length <= 1) return;
    setPhases(phases.filter(p => p.id !== id));
  };

  const handleStart = () => {
    // Validate before starting
    const validatedPhases = phases.map(p => {
      let { hours, minutes, seconds, repeat } = p;
      const totalSeconds = (hours || 0) * 3600 + minutes * 60 + seconds;
      if (totalSeconds < 30) {
        hours = 0;
        minutes = 0;
        seconds = 30;
      }
      if (!repeat || repeat < 1) {
        repeat = 1;
      }
      return { ...p, hours, minutes, seconds, repeat };
    });
    setPhases(validatedPhases);

    const execPhases: Phase[] = [];
    validatedPhases.forEach(p => {
      for (let i = 0; i < p.repeat; i++) {
        execPhases.push({ ...p, id: `${p.id}-${i}` });
      }
    });
    setExecutionPhases(execPhases);

    // Unlock bell2 context (bell1 will be unlocked by playStartSequence)
    if (bell2Ref.current) {
      bell2Ref.current.volume = 0;
      const p = bell2Ref.current.play();
      if (p !== undefined) {
        p.then(() => {
          if (bell2Ref.current) {
            bell2Ref.current.pause();
            bell2Ref.current.currentTime = 0;
            bell2Ref.current.volume = volume;
          }
        }).catch(() => {});
      }
    }

    if (isCountdownEnabled && countdownSeconds > 0) {
      setIsCountingDown(true);
      setTimeLeft(countdownSeconds);
      setIsRunning(true);
      setIsFinished(false);
      setIsExtended(false);
      setExtendedTime(0);
      setActivePhaseIndex(null);
    } else {
      playStartSequence();
      setActivePhaseIndex(0);
      setTimeLeft((execPhases[0].hours || 0) * 3600 + execPhases[0].minutes * 60 + execPhases[0].seconds);
      setIsRunning(true);
      setIsFinished(false);
      setIsExtended(false);
      setExtendedTime(0);
      setIsCountingDown(false);
    }
  };

  const handleStop = () => {
    setWasRunningBeforeStop(isRunning);
    setIsRunning(false);
    clearAudioTimeouts();
    if (bell1Ref.current) {
      bell1Ref.current.pause();
      bell1Ref.current.currentTime = 0;
    }
    if (bell2Ref.current) {
      bell2Ref.current.pause();
      bell2Ref.current.currentTime = 0;
    }
    setIsStopModalOpen(true);
  };

  const confirmStop = () => {
    setIsStopModalOpen(false);
    setActivePhaseIndex(null);
    setTimeLeft(0);
    setIsFinished(false);
    setIsCountingDown(false);
    setIsExtended(false);
    setExtendedTime(0);
  };

  const cancelStop = () => {
    setIsStopModalOpen(false);
    if (wasRunningBeforeStop) {
      setIsRunning(true);
    }
  };

  const togglePause = () => {
    if (isRunning) {
      setIsRunning(false);
      clearAudioTimeouts();
      if (bell1Ref.current) {
        bell1Ref.current.pause();
        bell1Ref.current.currentTime = 0;
      }
      if (bell2Ref.current) {
        bell2Ref.current.pause();
        bell2Ref.current.currentTime = 0;
      }
    } else {
      setIsRunning(true);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans flex flex-col items-center py-12 px-4 selection:bg-stone-800">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-display font-normal text-stone-100 mb-4 text-center tracking-wide">Multi-Phase Meditation Timer</h1>
        
        <div className="flex justify-between items-center mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-stone-400 hover:text-stone-300 transition-colors">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={isCountdownEnabled} 
                onChange={() => setIsCountdownEnabled(!isCountdownEnabled)} 
              />
              <div className={`block w-10 h-6 rounded-full transition-colors ${isCountdownEnabled ? 'bg-stone-600' : 'bg-stone-800'}`}></div>
              <div className={`absolute left-1 top-1 bg-stone-300 w-4 h-4 rounded-full transition-transform ${isCountdownEnabled ? 'transform translate-x-4' : ''}`}></div>
            </div>
            <span className="text-sm">Add countdown?</span>
          </label>

          <div className="flex items-center gap-2 text-stone-400 bg-stone-900/50 px-3 py-1.5 rounded-xl border border-stone-800">
            <Volume2 size={16} />
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume} 
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-stone-500 cursor-pointer"
            />
          </div>
        </div>

        {!isRunning && !isFinished && activePhaseIndex === null && !isCountingDown && !isExtended ? (
          <div className="space-y-4">
            {isCountdownEnabled && (
              <div className="flex items-center justify-between bg-stone-900/40 p-4 rounded-2xl border border-stone-800/50">
                <span className="text-stone-400 text-sm">Preparation countdown</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="0" 
                    max="60" 
                    value={countdownSeconds.toString()} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setCountdownSeconds(Math.min(60, Math.max(0, val)));
                      else if (e.target.value === '') setCountdownSeconds(0);
                    }}
                    className="w-16 bg-stone-950 text-stone-100 text-center text-lg py-1 rounded-xl border border-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-600 focus:border-transparent transition-all"
                  />
                  <span className="text-stone-500 text-sm">sec</span>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {phases.map((phase, index) => (
                <div key={phase.id} className="flex flex-row items-center justify-between gap-1 sm:gap-4 bg-stone-900/80 p-2 sm:p-4 rounded-2xl border border-stone-800 shadow-sm transition-all hover:border-stone-700">
                  
                  <div className="flex items-center gap-1 sm:gap-4">
                    <div className="text-stone-500 text-xs sm:text-sm text-center w-4 sm:w-6 shrink-0">{index + 1}.</div>
                    
                    <div className="flex items-center gap-0.5 sm:gap-2">
                      <div className="flex flex-col items-center">
                        <button onClick={() => handleIncrement(phase.id, 'hours', 1)} className="text-stone-500 hover:text-stone-300 transition-colors p-0 sm:p-0.5"><ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                        <input 
                          type="number" 
                          min="0"
                          max="99"
                          value={(phase.hours || 0).toString()} 
                          onChange={(e) => handlePhaseChange(phase.id, 'hours', e.target.value)}
                          onBlur={handleBlur}
                          className="w-9 sm:w-16 bg-stone-950 text-stone-100 text-center text-sm sm:text-xl py-1 sm:py-2 rounded-lg sm:rounded-xl border border-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-600 focus:border-transparent transition-all"
                        />
                        <button onClick={() => handleIncrement(phase.id, 'hours', -1)} className="text-stone-500 hover:text-stone-300 transition-colors p-0 sm:p-0.5"><ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                      </div>
                      <span className="text-stone-500 text-sm sm:text-xl pb-1">:</span>
                      <div className="flex flex-col items-center">
                        <button onClick={() => handleIncrement(phase.id, 'minutes', 1)} className="text-stone-500 hover:text-stone-300 transition-colors p-0 sm:p-0.5"><ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                        <input 
                          type="number" 
                          min="0"
                          max="99"
                          value={phase.minutes.toString()} 
                          onChange={(e) => handlePhaseChange(phase.id, 'minutes', e.target.value)}
                          onBlur={handleBlur}
                          className="w-9 sm:w-16 bg-stone-950 text-stone-100 text-center text-sm sm:text-xl py-1 sm:py-2 rounded-lg sm:rounded-xl border border-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-600 focus:border-transparent transition-all"
                        />
                        <button onClick={() => handleIncrement(phase.id, 'minutes', -1)} className="text-stone-500 hover:text-stone-300 transition-colors p-0 sm:p-0.5"><ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                      </div>
                      <span className="text-stone-500 text-sm sm:text-xl pb-1">:</span>
                      <div className="flex flex-col items-center">
                        <button onClick={() => handleIncrement(phase.id, 'seconds', 1)} className="text-stone-500 hover:text-stone-300 transition-colors p-0 sm:p-0.5"><ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                        <input 
                          type="number" 
                          min="0"
                          max="59"
                          value={phase.seconds.toString()} 
                          onChange={(e) => handlePhaseChange(phase.id, 'seconds', e.target.value)}
                          onBlur={handleBlur}
                          className="w-9 sm:w-16 bg-stone-950 text-stone-100 text-center text-sm sm:text-xl py-1 sm:py-2 rounded-lg sm:rounded-xl border border-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-600 focus:border-transparent transition-all"
                        />
                        <button onClick={() => handleIncrement(phase.id, 'seconds', -1)} className="text-stone-500 hover:text-stone-300 transition-colors p-0 sm:p-0.5"><ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-1 sm:gap-4 shrink-0">
                    <div className="flex items-center gap-1 sm:gap-2 text-stone-400 text-[10px] sm:text-sm whitespace-nowrap">
                      <span className="opacity-70">Repeat</span>
                      <div className="flex flex-col items-center">
                        <button onClick={() => handleIncrement(phase.id, 'repeat', 1)} className="text-stone-500 hover:text-stone-300 transition-colors p-0 sm:p-0.5"><ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                        <input 
                          type="number" 
                          min="1"
                          max="99"
                          value={phase.repeat === 0 ? '' : phase.repeat.toString()} 
                          onChange={(e) => handlePhaseChange(phase.id, 'repeat', e.target.value)}
                          onBlur={handleBlur}
                          className="w-8 sm:w-16 bg-stone-950 text-stone-100 text-center text-xs sm:text-base py-1 sm:py-2 rounded-lg sm:rounded-xl border border-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-600 focus:border-transparent transition-all"
                        />
                        <button onClick={() => handleIncrement(phase.id, 'repeat', -1)} className="text-stone-500 hover:text-stone-300 transition-colors p-0 sm:p-0.5"><ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                      </div>
                      <span className="opacity-70">times</span>
                    </div>

                    <div className="flex justify-end shrink-0 w-6 sm:w-10">
                      {phases.length > 1 ? (
                        <button 
                          onClick={() => deletePhase(phase.id)}
                          className="p-1 sm:p-2 text-stone-500 hover:text-red-400 transition-colors rounded-full hover:bg-stone-800"
                          aria-label="Delete phase"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      ) : (
                        <div className="w-6 sm:w-9" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={addPhase}
                className="flex-1 py-4 border-2 border-dashed border-stone-800 text-stone-400 rounded-2xl hover:border-stone-600 hover:text-stone-300 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span>Add Phase</span>
              </button>
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="w-16 py-4 border-2 border-dashed border-stone-800 text-stone-400 rounded-2xl hover:border-stone-600 hover:text-stone-300 transition-all flex items-center justify-center shrink-0"
                aria-label="Reset phases"
              >
                <RotateCcw size={20} />
              </button>
            </div>

            <div className="pt-8 flex flex-col items-center">
              <div className="text-stone-400 text-sm mb-4 tracking-wide text-center">
                Total time: {formatVerboseTime(totalSeconds)}
              </div>
              <button 
                onClick={handleStart}
                className="w-full bg-stone-200 text-stone-950 text-xl font-medium py-4 rounded-2xl hover:bg-white transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
              >
                <Play size={24} className="fill-current" />
                <span>Begin Session</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-stone-500 font-medium tracking-widest uppercase text-sm mb-12">
              {isCountingDown ? "Starting in..." : isFinished ? "Session Complete" : `Phase ${activePhaseIndex! + 1} of ${executionPhases.length}`}
            </div>
            
            <div className="text-[7rem] leading-none font-light text-stone-100 tracking-tighter mb-4 tabular-nums">
              {isExtended ? formatTime(extendedTime) : formatTime(timeLeft)}
            </div>

            {!isExtended && !isCountingDown && (
              <div className="text-stone-400 text-lg mb-16 tracking-wide">
                Total time remaining: {formatTotalTime(calculateTotalTimeRemaining())}
              </div>
            )}
            {isExtended && (
              <div className="text-stone-400 text-lg mb-16 tracking-wide">
                Time extended
              </div>
            )}
            {isCountingDown && <div className="mb-16" />}

            <div className="flex gap-6">
              {!isExtended && (
                <button 
                  onClick={togglePause}
                  className="w-20 h-20 rounded-full bg-stone-800 text-stone-100 flex items-center justify-center hover:bg-stone-700 transition-all shadow-lg"
                >
                  {isRunning ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
                </button>
              )}
              <button 
                onClick={handleStop}
                className="w-20 h-20 rounded-full border-2 border-stone-800 text-stone-400 flex items-center justify-center hover:bg-stone-800 hover:text-stone-200 transition-all"
              >
                <Square size={24} className="fill-current" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      <audio ref={bell1Ref} src="/bell.mp3" preload="auto" />
      <audio ref={bell2Ref} src="/bell2.mp3" preload="auto" />

      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
            <h2 className="text-xl font-display font-normal text-stone-100 mb-4">Reset Timer</h2>
            <p className="text-stone-400 mb-8">This will discard all changes you have made. Continue?</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => {
                  setPhases([{ id: 'phase-1', hours: 0, minutes: 5, seconds: 0, repeat: 1 }]);
                  setIsResetModalOpen(false);
                }}
                className="flex-1 py-3 rounded-xl bg-red-900/50 text-red-200 border border-red-900/50 hover:bg-red-900/80 transition-colors"
              >
                Confirm
              </button>
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isStopModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
            <h2 className="text-xl font-display font-normal text-stone-100 mb-4">Do you want to end the session?</h2>
            
            <div className="text-stone-400 mb-8 space-y-2 text-left bg-stone-950/50 p-4 rounded-xl border border-stone-800/50">
              <div className="flex justify-between">
                <span>Session time:</span>
                <span className="text-stone-200">{formatTotalTime(getSessionStats().sessionTime)}</span>
              </div>
              <div className="flex justify-between">
                <span>Extended time:</span>
                <span className="text-stone-200">{formatTotalTime(getSessionStats().extTime)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-800">
                <span className="text-stone-300">Total time:</span>
                <span className="text-stone-100">{formatTotalTime(getSessionStats().total)}</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button 
                onClick={cancelStop}
                className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Resume
              </button>
              <button 
                onClick={confirmStop}
                className="flex-1 py-3 rounded-xl bg-stone-200 text-stone-950 font-medium hover:bg-white transition-colors"
              >
                End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
