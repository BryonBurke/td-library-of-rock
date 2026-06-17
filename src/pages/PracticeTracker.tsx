import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Link } from 'react-router-dom';
import BeatMaster from './BeatMaster';
import { format } from 'date-fns';
import { Play, Square, Zap, HardDrive, Calendar, ExternalLink } from 'lucide-react';
import { getHornsUpColor, getHornsUpLevel } from '../lib/practice-utils';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

const getPowerColor = (index: number) => {
  const colors = [
    '#00FF00', // Green
    '#44FF00', 
    '#88FF00', 
    '#CCCC00', 
    '#FF9900', 
    '#FF4400', 
    '#FF0000'  // Red
  ];
  return colors[index] || '#00FF00';
};

export default function PracticeTracker() {
  const { user } = useAuth();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'practice_sessions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'practice_sessions');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const toggleTimer = async () => {
    if (isPlaying) {
      // Quit/Stop
      setIsPlaying(false);
      const minutes = Math.floor(elapsedSeconds / 60);
      
      // Even if < 1 minute, maybe we track it, but let's encourage at least 1 min
      if (minutes >= 1 && user) {
        try {
          const dateString = format(new Date(), 'yyyy-MM-dd');
          await addDoc(collection(db, 'practice_sessions'), {
            userId: user.uid,
            dateString,
            durationMinutes: minutes,
            createdAt: Date.now()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, 'practice_sessions');
        }
      } else if (elapsedSeconds > 0) {
        alert("Practice session too short! Need at least 1 full minute to log to the rig.");
      }
      setElapsedSeconds(0);
    } else {
      // Play
      setIsPlaying(true);
      setElapsedSeconds(0);
    }
  };

  // Calculations
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalMinutesAllTime = sessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const hornsUpTokens = getHornsUpLevel(totalMinutesAllTime);
  const hornsColorClass = getHornsUpColor(hornsUpTokens);

  const calculateDailyIncrements = () => {
    const minutesByDate = sessions.reduce((acc: any, curr: any) => {
      acc[curr.dateString] = (acc[curr.dateString] || 0) + curr.durationMinutes;
      return acc;
    }, {});
    return Object.values(minutesByDate).filter((mins: any) => mins >= 10).length;
  };

  const actualDailyIncrements = calculateDailyIncrements();

  const activeIndices = new Set(Array.from({ length: actualDailyIncrements }).map((_, i) => i));

  const dailyIncrements = activeIndices.size;

  const [showCongrats, setShowCongrats] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [prevIncrements, setPrevIncrements] = useState(dailyIncrements);

  useEffect(() => {
    // Show congrats if we hit a multiple of 7
    if (dailyIncrements > 0 && dailyIncrements % 7 === 0 && dailyIncrements !== prevIncrements && dailyIncrements > prevIncrements) {
      setShowCongrats(true);
    }
    setPrevIncrements(dailyIncrements);
  }, [dailyIncrements, prevIncrements]);


  useEffect(() => {
    if (showCongrats) {
      setIsFadingOut(false);
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100, colors: ['#FF0000', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF'] };
        confetti({
          ...defaults, particleCount: 40,
          origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults, particleCount: 40,
          origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 }
        });
      }, 400);

      const fadeOutTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 5000);

      const closeTimer = setTimeout(() => {
        setShowCongrats(false);
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(fadeOutTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [showCongrats]);

  const maxIndex = activeIndices.size > 0 ? Math.max(...Array.from(activeIndices)) : -1;
  // Always render enough weeks to show the max active index, plus one extra slot so they can click the next one
  const totalWeeks = Math.max(1, Math.ceil((maxIndex + 2) / 7));

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="space-y-8">
      
      <div className="glass-panel p-8 rounded-2xl brutal-border text-center">
        <h2 className="font-display text-4xl uppercase tracking-widest text-primary mb-2">My Practice Space</h2>
        <p className="font-mono text-zinc-400 mb-8 uppercase text-sm">Lock in. Log your time. Charge the bar.</p>

        <div className="flex flex-col items-center justify-center space-y-8">
          
          <div className="text-8xl font-mono text-white font-bold tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {formatTime(elapsedSeconds)}
          </div>

          <button 
            onClick={toggleTimer}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-full font-display text-2xl uppercase tracking-widest transition-all",
              isPlaying 
                ? "bg-red-600 text-white hover:bg-red-700 animate-pulse border-4 border-red-800" 
                : "bg-primary text-black hover:bg-orange-600 hover:text-white border-4 border-transparent"
            )}
          >
            {isPlaying ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            {isPlaying ? "Quit" : "Play"}
          </button>
        </div>
      </div>

      {/* Congrats Overlay */}
      {showCongrats && (
        <div className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/95 overflow-hidden transition-opacity duration-[5000ms]",
          isFadingOut ? "opacity-0" : "opacity-100"
        )}>
          {/* Animated Background Gradient Elements */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-700 via-red-900 to-black animate-pulse"></div>
          
          <div className="relative z-10 text-center space-y-12 animate-in fade-in zoom-in duration-1000 p-4 w-full">
            <h2 className="text-6xl sm:text-7xl md:text-9xl font-display uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-orange-400 to-yellow-500 drop-shadow-[0_0_30px_rgba(255,0,0,0.8)]">
              FOR THOSE ABOUT
              <br className="hidden md:block" />
              TO ROCK
            </h2>
            
            <p className="text-3xl md:text-5xl font-display text-white uppercase tracking-wider drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] !mt-4">
              WE SALUTE YOU
            </p>

            <div className="py-6">
              <p className="text-sm md:text-xl font-mono text-zinc-300 uppercase tracking-widest bg-black/50 inline-block px-6 py-2 rounded-full border border-zinc-800">
                ⚡ 7 Days of Uninterrupted Power ⚡
              </p>
            </div>
            
            <button
              onClick={() => setShowCongrats(false)}
              className="relative group bg-white text-black font-display text-2xl md:text-3xl px-12 md:px-16 py-4 md:py-6 uppercase tracking-widest transition-all duration-300 hover:bg-[#00FF00] hover:text-black hover:scale-105"
            >
              <div className="absolute inset-0 border-2 border-white group-hover:border-[#00FF00] scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"></div>
              Keep Shredding
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Power Bar */}
        <div className="glass-panel p-6 rounded-2xl brutal-border bg-[#111] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-[#FF0000]" />
                <h3 className="font-display text-2xl uppercase tracking-wider text-white">Main Power Bar</h3>
              </div>
            </div>
            <p className="font-mono text-xs text-zinc-500 uppercase mb-4">
              10 mins/day to charge the bar.
            </p>
            
            <div className="space-y-4">
              {Array.from({ length: totalWeeks }).map((_, weekIndex) => {
                return (
                  <div key={weekIndex} className="relative">
                    <div className="text-[10px] font-mono text-zinc-500 mb-1 uppercase tracking-widest">
                      Week {weekIndex + 1}
                    </div>
                    <div className="h-12 w-full bg-black border-2 border-zinc-700 rounded-sm p-1 flex gap-1 relative overflow-hidden">
                      {weekDays.map((dayLabel, dayIndex) => {
                        const globalIndex = weekIndex * 7 + dayIndex;
                        const isCharged = activeIndices.has(globalIndex);
                        const activeInWeek = weekDays.filter((_, i) => activeIndices.has(weekIndex * 7 + i)).length;
                        const powerColor = getPowerColor(activeInWeek === 0 ? 0 : activeInWeek - 1);
                        return (
                          <div 
                            key={dayIndex} 
                            className={cn(
                              "flex-1 h-full rounded-sm flex items-center justify-center font-mono text-xs font-bold transition-all duration-500",
                              isCharged ? "text-black" : "bg-zinc-800 text-zinc-600"
                            )}
                            style={isCharged ? {
                              backgroundColor: powerColor,
                              boxShadow: `0 0 10px ${powerColor}`
                            } : undefined}
                          >
                            {dayLabel}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Horns Up Tokens */}
        <div className="glass-panel p-6 rounded-2xl brutal-border text-center flex flex-col items-center justify-center bg-[#111]">
          <h3 className="font-display text-2xl uppercase tracking-wider text-white mb-2">Horns Up Tokens</h3>
          <p className="font-mono text-xs text-zinc-500 uppercase mb-6">1 Hour = 1 Token</p>
          
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {hornsUpTokens === 0 ? (
              <span className="font-mono text-zinc-600">No Tokens Yet. Keep Rocking.</span>
            ) : (
              Array.from({ length: hornsUpTokens }).map((_, i) => (
                <div key={i} className={`text-5xl drop-shadow-[0_0_10px_currentColor] ${hornsColorClass}`}>
                  🤘
                </div>
              ))
            )}
          </div>
          <div className="mt-6 text-sm font-mono text-zinc-400">
            Total Time: <span className="text-white font-bold">{totalMinutesAllTime}</span> mins
          </div>
        </div>

      </div>

      <div className="mt-8 glass-panel p-6 rounded-2xl brutal-border bg-[#111] flex justify-center">
        <BeatMaster />
      </div>

    </div>
  );
}
