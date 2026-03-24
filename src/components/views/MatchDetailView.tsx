import React, { useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Share2, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Minus, 
  Trophy,
  Layout,
  Trash2
} from 'lucide-react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { toPng } from 'html-to-image';
import { Player, Match, Formation } from '../../types';
import { FORMATIONS } from '../../constants';
import { DraggablePlayer, PositionSelector } from '../common/LineupComponents';

interface MatchDetailViewProps {
  match: Match;
  players: Player[];
  detailTab: 'attendance' | 'lineup' | 'result';
  setDetailTab: (tab: 'attendance' | 'lineup' | 'result') => void;
  onUpdateMatch: (match: Match) => Promise<void>;
  onBack: () => void;
}

export const MatchDetailView: React.FC<MatchDetailViewProps> = ({
  match: selectedMatch,
  players,
  detailTab,
  setDetailTab,
  onUpdateMatch,
  onBack
}) => {
  const lineupRef = useRef<HTMLDivElement>(null);
  const matchInfoRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const setAttendance = async (playerId: string, status: 'present' | 'absent' | 'unknown') => {
    const newAttendance = { ...selectedMatch.attendance, [playerId]: status };
    await onUpdateMatch({ ...selectedMatch, attendance: newAttendance });
  };

  const updateMatch = async (updated: Match) => {
    await onUpdateMatch(updated);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const playerId = active.id as string;
    const positionKey = over.id as string;

    const newLineup = { ...selectedMatch.lineup };
    Object.keys(newLineup).forEach(key => {
      if (newLineup[key] === playerId) delete newLineup[key];
    });

    newLineup[positionKey] = playerId;
    await updateMatch({ ...selectedMatch, lineup: newLineup });
  };

  const onAssign = async (posKey: string, playerId: string) => {
    const newLineup = { ...selectedMatch.lineup };
    Object.keys(newLineup).forEach(key => {
      if (newLineup[key] === playerId) delete newLineup[key];
    });
    newLineup[posKey] = playerId;
    await updateMatch({ ...selectedMatch, lineup: newLineup });
  };

  const removeFromLineup = async (positionKey: string) => {
    const newLineup = { ...selectedMatch.lineup };
    delete newLineup[positionKey];
    await updateMatch({ ...selectedMatch, lineup: newLineup });
  };

  const handleExportLineup = async () => {
    if (!lineupRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await toPng(lineupRef.current, {
        cacheBust: true,
        backgroundColor: '#001F2D',
        style: { borderRadius: '0' }
      });
      const link = document.createElement('a');
      link.download = `opstelling-vs-${selectedMatch.opponent}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMatchInfo = async () => {
    if (!matchInfoRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await toPng(matchInfoRef.current, {
        cacheBust: true,
        backgroundColor: '#001F2D',
        style: { borderRadius: '0' }
      });
      const link = document.createElement('a');
      link.download = `wedstrijd-info-vs-${selectedMatch.opponent}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const presentPlayers = players.filter(p => selectedMatch.attendance[p.id] === 'present' || selectedMatch.attendance[p.id] === true);
  const absentPlayers = players.filter(p => selectedMatch.attendance[p.id] === 'absent' || selectedMatch.attendance[p.id] === false);
  const unknownPlayers = players.filter(p => !presentPlayers.includes(p) && !absentPlayers.includes(p));

  const assignedPlayerIds = Object.values(selectedMatch.lineup);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-markiezaten-blue transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 italic uppercase tracking-tight">
              {selectedMatch.isHome ? 'Markiezaten' : selectedMatch.opponent} vs {selectedMatch.isHome ? selectedMatch.opponent : 'Markiezaten'}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {new Date(selectedMatch.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })} • {selectedMatch.gatheringTime}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden lg:flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setDetailTab('attendance')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${detailTab === 'attendance' ? 'bg-markiezaten-blue text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Aanwezigheid
            </button>
            <button 
              onClick={() => setDetailTab('lineup')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${detailTab === 'lineup' ? 'bg-markiezaten-blue text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Opstelling
            </button>
            <button 
              onClick={() => setDetailTab('result')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${detailTab === 'result' ? 'bg-markiezaten-blue text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Resultaat
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleExportMatchInfo}
              disabled={isExporting}
              className="flex items-center space-x-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">Deel Info</span>
            </button>
            <button 
              onClick={handleExportLineup}
              disabled={isExporting}
              className="flex items-center space-x-2 bg-markiezaten-blue text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-markiezaten-blue/20 hover:bg-markiezaten-dark transition-all active:scale-95 disabled:opacity-50"
            >
              <Trophy size={16} />
              <span className="hidden sm:inline">Deel Opstelling</span>
            </button>
          </div>
        </div>
      </div>

      <div className="lg:hidden flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
        <button 
          onClick={() => setDetailTab('attendance')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${detailTab === 'attendance' ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500'}`}
        >
          Aanwezig
        </button>
        <button 
          onClick={() => setDetailTab('lineup')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${detailTab === 'lineup' ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500'}`}
        >
          Opstelling
        </button>
        <button 
          onClick={() => setDetailTab('result')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${detailTab === 'result' ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500'}`}
        >
          Resultaat
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${detailTab !== 'attendance' ? 'hidden lg:block' : ''}`}>
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Aanwezigheid</h3>
            </div>
            <div className="p-4 space-y-4">
              {unknownPlayers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nog niet gereageerd ({unknownPlayers.length})</h4>
                  <div className="space-y-1">
                    {unknownPlayers.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <span className="text-sm font-medium text-slate-700">{p.name}</span>
                        <div className="flex items-center space-x-1">
                          <button onClick={() => setAttendance(p.id, 'present')} className="p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><CheckCircle2 size={18} /></button>
                          <button onClick={() => setAttendance(p.id, 'absent')} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><XCircle size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Aanwezig ({presentPlayers.length})</h4>
                <div className="space-y-1">
                  {presentPlayers.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50">
                      <span className="text-sm font-medium text-emerald-900">{p.name}</span>
                      <button onClick={() => setAttendance(p.id, 'absent')} className="p-1.5 text-emerald-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><XCircle size={18} /></button>
                    </div>
                  ))}
                  {presentPlayers.length === 0 && <p className="text-xs text-slate-400 italic p-2">Nog geen spelers aanwezig</p>}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Afwezig ({absentPlayers.length})</h4>
                <div className="space-y-1">
                  {absentPlayers.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50/50">
                      <span className="text-sm font-medium text-red-900">{p.name}</span>
                      <button onClick={() => setAttendance(p.id, 'present')} className="p-1.5 text-red-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><CheckCircle2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${detailTab !== 'result' ? 'hidden lg:block' : ''}`}>
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Wedstrijd Resultaat</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-center space-x-6">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Markiezaten</p>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => updateMatch({ ...selectedMatch, score: { home: Math.max(0, (selectedMatch.score?.home || 0) - 1), away: selectedMatch.score?.away || 0 } })}
                      className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-4xl font-black text-slate-900 w-12">{selectedMatch.score?.home || 0}</span>
                    <button 
                      onClick={() => updateMatch({ ...selectedMatch, score: { home: (selectedMatch.score?.home || 0) + 1, away: selectedMatch.score?.away || 0 } })}
                      className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-300 mt-6">-</div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{selectedMatch.opponent}</p>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => updateMatch({ ...selectedMatch, score: { home: selectedMatch.score?.home || 0, away: Math.max(0, (selectedMatch.score?.away || 0) - 1) } })}
                      className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-4xl font-black text-slate-900 w-12">{selectedMatch.score?.away || 0}</span>
                    <button 
                      onClick={() => updateMatch({ ...selectedMatch, score: { home: selectedMatch.score?.home || 0, away: (selectedMatch.score?.away || 0) + 1 } })}
                      className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doelpuntenmakers</h4>
                <div className="space-y-2">
                  {(selectedMatch.scorers || []).map((scorerId, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-700">{players.find(p => p.id === scorerId)?.name || 'Onbekend'}</span>
                      <button 
                        onClick={() => {
                          const newScorers = [...(selectedMatch.scorers || [])];
                          newScorers.splice(idx, 1);
                          updateMatch({ ...selectedMatch, scorers: newScorers });
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <select 
                    onChange={(e) => {
                      if (e.target.value) {
                        updateMatch({ ...selectedMatch, scorers: [...(selectedMatch.scorers || []), e.target.value] });
                        e.target.value = '';
                      }
                    }}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20"
                  >
                    <option value="">Voeg doelpuntenmaker toe...</option>
                    {presentPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`lg:col-span-2 space-y-6 ${detailTab !== 'lineup' ? 'hidden lg:block' : ''}`}>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Layout size={18} className="text-markiezaten-blue" />
                <h3 className="font-bold text-slate-800">Tactische Opstelling</h3>
              </div>
              <select
                value={selectedMatch.formation}
                onChange={(e) => updateMatch({ ...selectedMatch, formation: e.target.value as Formation })}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20"
              >
                <option value="4-4-2">4-4-2</option>
                <option value="4-3-3">4-3-3</option>
              </select>
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-3">
                  <div 
                    ref={lineupRef}
                    className="aspect-[3/4] bg-markiezaten-dark rounded-3xl relative overflow-hidden shadow-2xl border-4 border-white/10"
                    style={{ background: 'radial-gradient(circle at center, #003a54 0%, #001F2D 100%)' }}
                  >
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-white rounded-b-full"></div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-white rounded-t-full"></div>
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-full"></div>
                    </div>

                    {FORMATIONS[selectedMatch.formation].positions.map((pos) => (
                      <PositionSelector
                        key={pos.key}
                        pos={pos}
                        assignedPlayer={players.find(p => p.id === selectedMatch.lineup[pos.key])}
                        presentPlayers={presentPlayers}
                        assignedPlayerIds={assignedPlayerIds}
                        onAssign={onAssign}
                        onRemove={removeFromLineup}
                      />
                    ))}
                  </div>
                </div>

                <div className="md:col-span-1 space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Beschikbaar</h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {presentPlayers.map(player => (
                        <DraggablePlayer 
                          key={player.id} 
                          player={player} 
                          isAssigned={assignedPlayerIds.includes(player.id)}
                        />
                      ))}
                      {presentPlayers.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-4">Nog geen spelers aanwezig</p>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Sleep spelers naar een positie op het veld om de opstelling te maken.
                  </p>
                </div>
              </div>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
};
