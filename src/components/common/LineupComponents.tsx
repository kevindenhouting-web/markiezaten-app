import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckCircle2, XCircle } from 'lucide-react';
import { Player } from '../../types';

export function DraggablePlayer({ player, isAssigned }: { player: Player; isAssigned: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: { player }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : undefined,
    opacity: isAssigned ? 0.5 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
        isAssigned 
          ? 'bg-slate-50 border-slate-100 text-slate-400' 
          : 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center space-x-2">
        <GripVertical size={14} className="text-slate-400" />
        <span className="font-medium text-sm">{player.name}</span>
      </div>
      {isAssigned && <CheckCircle2 size={16} className="text-emerald-500" />}
    </div>
  );
}

export function PositionSelector({ 
  pos, 
  assignedPlayer, 
  presentPlayers,
  assignedPlayerIds,
  onAssign,
  onRemove 
}: { 
  pos: { key: string; label: string; x: number; y: number }; 
  assignedPlayer?: Player;
  presentPlayers: Player[];
  assignedPlayerIds: string[];
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
            {availablePlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
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
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
        {assignedPlayer && (
          <div className="mt-1 bg-black/60 text-white text-[10px] font-bold rounded px-1.5 py-0.5 max-w-[90px] truncate shadow-sm pointer-events-none">
            {assignedPlayer.name}
          </div>
        )}
      </div>
    </div>
  );
}
