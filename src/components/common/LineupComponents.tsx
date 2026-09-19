import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckCircle2, XCircle, AlertTriangle, Armchair, Clock } from 'lucide-react';
import { Player } from '../../types';
import { PlayerBenchHistory } from '../../utils/fairPlayUtils';

export function DraggablePlayer({ 
  player, 
  isAssigned,
  benchHistory 
}: { 
  player: Player; 
  isAssigned: boolean;
  benchHistory?: PlayerBenchHistory;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: { player }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : undefined,
    opacity: isAssigned ? 0.55 : 1
  };

  const isConsecutiveBench = (benchHistory?.consecutiveBenchStarts || 0) >= 2;
  const wasBenchPrevious = benchHistory?.startedOnBenchPreviousMatch;
  const wasBenchLastAttended = benchHistory?.startedOnBenchLastAttendedMatch;
  const prefersSecondHalf = benchHistory?.prefersSecondHalf;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
        isAssigned 
          ? 'bg-slate-50 border-slate-200 text-slate-400' 
          : 'bg-white border-slate-200 hover:border-markiezaten-blue/40 text-slate-800 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <GripVertical size={14} className="text-slate-400 flex-shrink-0" />
          <span className="font-bold text-xs truncate">{player.name}</span>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          {isAssigned && <CheckCircle2 size={16} className="text-emerald-500" />}
        </div>
      </div>

      {/* Bench status indicators */}
      <div className="mt-1.5 flex flex-wrap gap-1 pl-5">
        {isConsecutiveBench && !isAssigned && !prefersSecondHalf && (
          <span 
            className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-xs"
            title={`${benchHistory?.consecutiveBenchStarts}x op rij als wissel gestart!`}
          >
            <AlertTriangle size={10} />
            <span>{benchHistory?.consecutiveBenchStarts}x op rij bank</span>
          </span>
        )}

        {!isConsecutiveBench && wasBenchPrevious && !prefersSecondHalf && (
          <span 
            className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded ${
              isAssigned ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-900 border border-amber-200'
            }`}
            title={`Begon vorige wedstrijd op de bank${benchHistory?.previousMatchOpponent ? ` (vs ${benchHistory.previousMatchOpponent})` : ''}`}
          >
            <Armchair size={10} className="text-amber-700" />
            <span>Wissel vorig duel</span>
          </span>
        )}

        {!wasBenchPrevious && wasBenchLastAttended && !prefersSecondHalf && (
          <span 
            className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
            title={`Laatste gespeelde wedstrijd (${benchHistory?.lastAttendedMatchOpponent || 'vorig duel'}) begonnen op de bank`}
          >
            <Armchair size={10} className="text-slate-500" />
            <span>Laatst wissel</span>
          </span>
        )}

        {prefersSecondHalf && (
          <span 
            className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100"
            title="Speelt vaak liever alleen in de 2e helft (uitzondering: start graag als wissel)"
          >
            <Clock size={10} className="text-indigo-600" />
            <span>Voorkeur 2e helft</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function PositionSelector({ 
  pos, 
  assignedPlayer, 
  presentPlayers,
  assignedPlayerIds,
  playerHistories,
  onAssign,
  onRemove 
}: { 
  pos: { key: string; label: string; x: number; y: number }; 
  assignedPlayer?: Player;
  presentPlayers: Player[];
  assignedPlayerIds: string[];
  playerHistories?: Record<string, PlayerBenchHistory>;
  onAssign: (posKey: string, playerId: string) => void;
  onRemove: (posKey: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: pos.key,
  });

  // Filter present players who are not already assigned to another position
  const availablePlayers = presentPlayers.filter(p => 
    !assignedPlayerIds.includes(p.id) || p.id === assignedPlayer?.id
  );

  return (
    <div 
      ref={setNodeRef}
      className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <div className="flex flex-col items-center">
        <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-lg transition-all relative ${
          isOver 
            ? 'bg-yellow-400 border-white scale-110' 
            : assignedPlayer 
              ? 'bg-markiezaten-blue border-white text-white' 
              : 'bg-white/20 border-white/40 text-white hover:bg-white/40'
        }`}>
          <select
            value={assignedPlayer?.id || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') onRemove(pos.key);
              else onAssign(pos.key, val);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            <option value="">-- {pos.label} --</option>
            {availablePlayers.map(p => {
              const h = playerHistories?.[p.id];
              let suffix = '';
              if (h?.consecutiveBenchStarts && h.consecutiveBenchStarts >= 2 && !h.prefersSecondHalf) {
                suffix = ` ⚠️ [${h.consecutiveBenchStarts}x op rij bank]`;
              } else if (h?.startedOnBenchPreviousMatch && !h.prefersSecondHalf) {
                suffix = ' 🪑 [Wissel vorig duel]';
              } else if (h?.prefersSecondHalf) {
                suffix = ' ⏱️ [Voorkeur 2e helft]';
              }
              return (
                <option key={p.id} value={p.id}>{p.name}{suffix}</option>
              );
            })}
          </select>

          {assignedPlayer ? (
            <span className="font-bold text-lg pointer-events-none">{assignedPlayer.name.charAt(0).toUpperCase()}</span>
          ) : (
            <span className="text-xs font-bold opacity-80 pointer-events-none">{pos.label}</span>
          )}
          
          {assignedPlayer && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(pos.key); }}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-20"
              title="Verwijder uit positie"
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
        {assignedPlayer && (
          <div className="mt-1 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold rounded px-1.5 py-0.5 max-w-[90px] truncate shadow-sm pointer-events-none text-center">
            {assignedPlayer.name}
          </div>
        )}
      </div>
    </div>
  );
}
