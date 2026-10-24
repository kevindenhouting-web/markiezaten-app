import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Timer, Plus, Minus, Flag } from 'lucide-react';

export interface MatchTimerState {
  seconds: number;
  isRunning: boolean;
  lastStartedAt: number | null;
  period: '1e helft' | 'rust' | '2e helft' | 'afgelopen' | 'vrij';
}

interface MatchStopwatchProps {
  matchId: string;
  onTimeUpdate?: (seconds: number, isRunning: boolean) => void;
}

const STORAGE_PREFIX = 'vv_markiezaten_timer_';

export const getStoredTimerState = (matchId: string): MatchTimerState => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${matchId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Calculate elapsed if it was running while page was closed/reloaded
      if (parsed.isRunning && parsed.lastStartedAt) {
        const elapsedSinceLast = Math.floor((Date.now() - parsed.lastStartedAt) / 1000);
        return {
          ...parsed,
          seconds: parsed.seconds + Math.max(0, elapsedSinceLast),
          lastStartedAt: Date.now()
        };
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading timer state from storage:', err);
  }
  return {
    seconds: 0,
    isRunning: false,
    lastStartedAt: null,
    period: '1e helft'
  };
};

export const MatchStopwatch: React.FC<MatchStopwatchProps> = ({ matchId, onTimeUpdate }) => {
  const [timerState, setTimerState] = useState<MatchTimerState>(() => getStoredTimerState(matchId));
  const timerStateRef = useRef<MatchTimerState>(timerState);
  timerStateRef.current = timerState;

  // Persist state to localStorage and broadcast update
  const saveState = (newState: MatchTimerState) => {
    setTimerState(newState);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${matchId}`, JSON.stringify(newState));
      window.dispatchEvent(new CustomEvent('match_timer_change', { 
        detail: { matchId, ...newState } 
      }));
    } catch (e) {
      console.error('Failed to save timer state:', e);
    }
    if (onTimeUpdate) {
      onTimeUpdate(newState.seconds, newState.isRunning);
    }
  };

  // Reload state if matchId changes
  useEffect(() => {
    const current = getStoredTimerState(matchId);
    setTimerState(current);
  }, [matchId]);

  // Active interval loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState.isRunning) {
      interval = setInterval(() => {
        const prev = timerStateRef.current;
        if (!prev.isRunning) return;

        const now = Date.now();
        const last = prev.lastStartedAt || now;
        const diffSeconds = Math.max(1, Math.floor((now - last) / 1000));

        const updated: MatchTimerState = {
          ...prev,
          seconds: prev.seconds + diffSeconds,
          lastStartedAt: now
        };
        setTimerState(updated);
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${matchId}`, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('match_timer_change', { 
            detail: { matchId, ...updated } 
          }));
        } catch {}
        if (onTimeUpdate) {
          onTimeUpdate(updated.seconds, updated.isRunning);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, matchId, onTimeUpdate]);

  // Handlers
  const handleStart = () => {
    saveState({
      ...timerState,
      isRunning: true,
      lastStartedAt: Date.now()
    });
  };

  const handlePause = () => {
    saveState({
      ...timerState,
      isRunning: false,
      lastStartedAt: null
    });
  };

  const handleStop = () => {
    saveState({
      ...timerState,
      isRunning: false,
      lastStartedAt: null,
      period: 'afgelopen'
    });
  };

  const handleReset = () => {
    saveState({
      seconds: 0,
      isRunning: false,
      lastStartedAt: null,
      period: '1e helft'
    });
  };

  const handleAdjustSeconds = (delta: number) => {
    const newSeconds = Math.max(0, timerState.seconds + delta);
    saveState({
      ...timerState,
      seconds: newSeconds,
      lastStartedAt: timerState.isRunning ? Date.now() : null
    });
  };

  const setPeriod = (period: MatchTimerState['period'], defaultSeconds?: number) => {
    saveState({
      ...timerState,
      period,
      seconds: defaultSeconds !== undefined ? defaultSeconds : timerState.seconds,
      lastStartedAt: timerState.isRunning ? Date.now() : null
    });
  };

  // Format time
  const minutes = Math.floor(timerState.seconds / 60);
  const remainingSeconds = timerState.seconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-md border border-slate-700/60">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg ${timerState.isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
            <Timer size={16} className={timerState.isRunning ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Wedstrijd Stopwatch
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block w-2 h-2 rounded-full ${
                timerState.isRunning 
                  ? 'bg-emerald-400 animate-ping' 
                  : timerState.seconds > 0 
                    ? 'bg-amber-400' 
                    : 'bg-slate-500'
              }`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {timerState.isRunning 
                  ? 'Bezig' 
                  : timerState.period === 'afgelopen' 
                    ? 'Afgelopen' 
                    : timerState.seconds > 0 
                      ? 'Gepauzeerd' 
                      : 'Niet gestart'}
              </span>
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700">
          {(['1e helft', 'rust', '2e helft'] as const).map(p => (
            <button
              key={p}
              onClick={() => {
                if (p === '1e helft' && timerState.seconds === 0) {
                  setPeriod(p, 0);
                } else if (p === '2e helft' && timerState.seconds < 45 * 60) {
                  setPeriod(p, 45 * 60);
                } else {
                  setPeriod(p);
                }
              }}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all capitalize ${
                timerState.period === p 
                  ? 'bg-markiezaten-blue text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Digital Clock Display */}
      <div className="flex items-center justify-between bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 mb-3">
        <div className="flex items-baseline space-x-2">
          <span className="font-mono text-3xl sm:text-4xl font-black tracking-wider text-white select-none">
            {formattedTime}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {minutes >= 90 ? '90+ min' : minutes >= 45 && timerState.period === '1e helft' ? '45+ min' : `${minutes} min`}
          </span>
        </div>

        {/* Quick adjustment buttons (+1 / -1 min) */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleAdjustSeconds(-60)}
            disabled={timerState.seconds < 60}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all"
            title="1 minuut terug"
          >
            <Minus size={13} />
          </button>
          <span className="text-[10px] font-bold text-slate-400 px-1">1m</span>
          <button
            onClick={() => handleAdjustSeconds(60)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all"
            title="1 minuut vooruit"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Action Buttons: Start / Pause / Stop / Reset */}
      <div className="grid grid-cols-4 gap-2">
        {!timerState.isRunning ? (
          <button
            onClick={handleStart}
            className="col-span-2 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition-all shadow-md shadow-emerald-900/30"
          >
            <Play size={14} className="fill-current" />
            <span>{timerState.seconds > 0 ? 'Hervatten' : 'Starten'}</span>
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="col-span-2 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-900/30"
          >
            <Pause size={14} className="fill-current" />
            <span>Pauzeren</span>
          </button>
        )}

        <button
          onClick={handleStop}
          disabled={timerState.seconds === 0 && !timerState.isRunning}
          className="flex items-center justify-center space-x-1 py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-bold text-xs transition-all border border-slate-700 disabled:opacity-40 disabled:pointer-events-none"
          title="Wedstrijd stoppen"
        >
          <Square size={13} className="fill-current text-red-400" />
          <span>Stop</span>
        </button>

        <button
          onClick={handleReset}
          disabled={timerState.seconds === 0 && !timerState.isRunning}
          className="flex items-center justify-center space-x-1 py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-bold text-xs transition-all border border-slate-700 disabled:opacity-40 disabled:pointer-events-none"
          title="Reset timer naar 00:00"
        >
          <RotateCcw size={13} />
          <span>Wissen</span>
        </button>
      </div>

      {/* Preset helpers */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400">
        <button 
          onClick={() => {
            saveState({
              ...timerState,
              period: '2e helft',
              seconds: 45 * 60,
              lastStartedAt: timerState.isRunning ? Date.now() : null
            });
          }}
          className="hover:text-slate-200 transition-colors flex items-center gap-1 font-medium"
        >
          <Flag size={11} className="text-markiezaten-blue" />
          <span>Start 2e helft (45:00)</span>
        </button>

        {timerState.isRunning && (
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Speeltijd loopt
          </span>
        )}
      </div>
    </div>
  );
};
