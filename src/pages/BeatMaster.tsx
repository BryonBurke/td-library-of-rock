import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Settings2, Info, ChevronUp, ChevronDown } from 'lucide-react';

// --- Types ---

type TimingFeedback = 'Ahead' | 'On Beat' | 'Behind' | null;

interface TapRecord {
  timestamp: number;
  offset: number; // ms from nearest beat
  feedback: TimingFeedback;
}

// --- Constants ---

const PERFECT_THRESHOLD = 40; // ms

export default function BeatMaster() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [calibrationTaps, setCalibrationTaps] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<TimingFeedback>(null);
  const [lastOffset, setLastOffset] = useState<number | null>(null);
  const [history, setHistory] = useState<TapRecord[]>([]);
  
  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextBeatTimeRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const currentBeatRef = useRef<number>(0);
  
  // Timing analysis refs
  const lastBeatTimestampRef = useRef<number>(0);

  // Initialize Audio Context
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // Play a click sound
  const playClick = (time: number) => {
    if (!audioCtxRef.current) return;
    
    const osc = audioCtxRef.current.createOscillator();
    const envelope = audioCtxRef.current.createGain();

    osc.type = 'sine';
    osc.frequency.value = currentBeatRef.current % 4 === 0 ? 1000 : 800;

    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(envelope);
    envelope.connect(audioCtxRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.1);
    
    // Store the actual performance time for comparison
    lastBeatTimestampRef.current = performance.now() + (time - audioCtxRef.current.currentTime) * 1000;
  };

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    
    while (nextBeatTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      playClick(nextBeatTimeRef.current);
      
      const secondsPerBeat = 60.0 / bpm;
      nextBeatTimeRef.current += secondsPerBeat;
      currentBeatRef.current++;
    }
    timerIDRef.current = requestAnimationFrame(scheduler);
  }, [bpm]);

  const toggleMetronome = () => {
    initAudio();
    if (isPlaying) {
      if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current);
      setIsPlaying(false);
      setIsCalibrating(false);
      setFeedback(null);
      setLastOffset(null);
    } else {
      setIsPlaying(true);
      currentBeatRef.current = 0;
      nextBeatTimeRef.current = audioCtxRef.current!.currentTime + 0.05;
      scheduler();
    }
  };

  const startCalibration = () => {
    setCalibrationTaps([]);
    setIsCalibrating(true);
    if (!isPlaying) toggleMetronome();
  };

  const handleTap = () => {
    if (!isPlaying) {
      toggleMetronome();
      return;
    }

    const now = performance.now();
    const secondsPerBeat = 60.0 / bpm;
    const msPerBeat = secondsPerBeat * 1000;
    
    // Calculate raw offset from the last scheduled beat
    let rawOffset = now - lastBeatTimestampRef.current;
    
    // If offset is more than half a beat, it's closer to the NEXT beat
    if (rawOffset > msPerBeat / 2) {
      rawOffset -= msPerBeat;
    }

    if (isCalibrating) {
      const newTaps = [...calibrationTaps, rawOffset];
      setCalibrationTaps(newTaps);
      
      if (newTaps.length >= 8) {
        const avg = newTaps.reduce((a, b) => a + b, 0) / newTaps.length;
        setCalibrationOffset(Math.round(avg));
        setIsCalibrating(false);
        setFeedback(null);
      } else {
        setFeedback('On Beat'); // Just show something while calibrating
      }
      return;
    }

    // Apply calibration offset
    const adjustedOffset = rawOffset - calibrationOffset;

    let currentFeedback: TimingFeedback = 'On Beat';
    if (adjustedOffset < -PERFECT_THRESHOLD) {
      currentFeedback = 'Ahead';
    } else if (adjustedOffset > PERFECT_THRESHOLD) {
      currentFeedback = 'Behind';
    }

    setFeedback(currentFeedback);
    setLastOffset(Math.round(adjustedOffset));
    
    const newRecord: TapRecord = {
      timestamp: now,
      offset: Math.round(adjustedOffset),
      feedback: currentFeedback
    };
    
    setHistory(prev => [newRecord, ...prev].slice(0, 50));
  };

  useEffect(() => {
    return () => {
      if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-2xl bg-[#151619] rounded-2xl text-[#FFFFFF] font-mono flex flex-col items-center select-none relative pb-6">
      {/* Header / Status */}
      <div className="w-full max-w-md flex justify-between items-center pt-6 px-4">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[2px] text-[#8E9299] uppercase">Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#FF4444] animate-pulse shadow-[0_0_10px_rgba(255,68,68,0.4)]' : 'bg-[#444444]'}`} />
            <span className="text-[10px] sm:text-xs">{isCalibrating ? 'CALIBRATING' : isPlaying ? 'ACTIVE' : 'IDLE'}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] tracking-[2px] text-[#8E9299] uppercase">Accuracy</span>
          <span className="text-[10px] sm:text-xs font-bold text-[#FFFFFF]">
            {history.length > 0 
              ? `${Math.round((history.filter(h => h.feedback === 'On Beat').length / history.length) * 100)}%`
              : '--%'}
          </span>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex flex-col items-center justify-around w-full max-w-md pb-4 pt-4 gap-6">
        
        {/* Tempo Control */}
        <div className="bg-[#1C1D21] border border-[#2A2B30] rounded-2xl p-4 sm:p-6 w-full flex flex-col items-center gap-4 shadow-2xl">
          <div className="flex flex-col items-center">
            <span className="text-[10px] tracking-[1px] text-[#8E9299] uppercase mb-1">Tempo</span>
            <div className="flex items-center gap-6 sm:gap-8">
              <button 
                onClick={() => setBpm(Math.max(40, bpm - 1))}
                className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors active:scale-90"
                disabled={isCalibrating}
              >
                <ChevronDown size={20} className="sm:w-6 sm:h-6" />
              </button>
              <span className="text-5xl sm:text-7xl font-bold tabular-nums tracking-tighter">{bpm}</span>
              <button 
                onClick={() => setBpm(Math.min(280, bpm + 1))}
                className="p-2 hover:bg-[#2A2B30] rounded-full transition-colors active:scale-90"
                disabled={isCalibrating}
              >
                <ChevronUp size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            <span className="text-[10px] text-[#8E9299] mt-1 font-bold tracking-widest">BPM</span>
          </div>

          <div className="w-full h-[1px] bg-[#2A2B30]" />

          <div className="w-full flex flex-col gap-2">
            <div className="flex justify-center gap-4">
              <button
                onClick={toggleMetronome}
                disabled={isCalibrating}
                className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all active:scale-95 ${
                  isPlaying 
                  ? 'bg-[#FF4444] text-white hover:bg-[#FF6666]' 
                  : 'bg-[#FFFFFF] text-[#151619] hover:bg-[#E0E0E0]'
                } ${isCalibrating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                {isPlaying ? 'STOP' : 'START'}
              </button>
            </div>
            <button
              onClick={startCalibration}
              className={`text-[9px] tracking-[2px] font-bold py-2 rounded-lg border border-[#2A2B30] transition-colors active:scale-95 ${
                isCalibrating ? 'bg-[#FFD700] text-[#151619] border-[#FFD700]' : 'text-[#8E9299] hover:text-white hover:border-white'
              }`}
            >
              {isCalibrating ? 'CALIBRATING...' : 'CALIBRATE LATENCY'}
            </button>
          </div>
        </div>

        {/* Tap Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleTap}
          className={`w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 ${isCalibrating ? 'border-[#FFD700]' : 'border-[#2A2B30]'} bg-[#1C1D21] flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.3)] group relative overflow-hidden shrink-0`}
        >
          <div className="absolute inset-0 bg-[#FFFFFF] opacity-0 group-active:opacity-10 transition-opacity" />
          <div className="flex flex-col items-center gap-1">
            <span className={`text-xs sm:text-sm font-bold tracking-[2px] ${isCalibrating ? 'text-[#FFD700]' : 'text-[#8E9299]'}`}>
              {isCalibrating ? 'SYNC' : 'TAP'}
            </span>
            <div className={`w-6 sm:w-8 h-1 ${isCalibrating ? 'bg-[#FFD700]' : 'bg-[#444444]'} rounded-full`} />
          </div>
        </motion.button>

        {/* Feedback Display */}
        <div className="h-20 sm:h-24 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {isCalibrating ? (
              <motion.div
                key="calibrating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <span className="text-xl sm:text-2xl font-bold text-[#FFD700] uppercase tracking-widest">Calibrating...</span>
                <span className="text-xs text-[#8E9299] mt-1">Tap {8 - calibrationTaps.length} more times</span>
              </motion.div>
            ) : feedback ? (
              <motion.div
                key={feedback + Date.now()}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center"
              >
                <span className={`text-4xl sm:text-5xl font-bold tracking-tighter uppercase ${
                  feedback === 'On Beat' ? 'text-[#00FF00]' : 
                  feedback === 'Ahead' ? 'text-[#FFD700]' : 'text-[#FF4444]'
                }`}>
                  {feedback}
                </span>
                <span className="text-xs sm:text-sm text-[#8E9299] mt-1">
                  {lastOffset && lastOffset > 0 ? `+${lastOffset}ms` : `${lastOffset}ms`}
                </span>
              </motion.div>
            ) : (
              <div className="text-[#444444] italic text-base sm:text-lg">
                {isPlaying ? 'Start tapping...' : ''}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
