import React, { useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Share2, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Minus, 
  Layout,
  Trash2,
  Edit3,
  Scale,
  Armchair,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Info
} from 'lucide-react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Player, Match, Formation } from '../../types';
import { FORMATIONS } from '../../constants';
import { DraggablePlayer, PositionSelector } from '../common/LineupComponents';
import { TeamLogo } from '../common/TeamLogo';
import { 
  formatMatchDate, 
  formatMatchTime, 
  calculateDefaultGatheringTime,
  isMatchUpcoming,
  isMatchInProgress 
} from '../../utils/matchParser';
import { 
  PlayerBenchHistory, 
  getPlayerBenchHistory, 
  getMatchFairPlayOverview, 
  getPriorMatches, 
  hasMatchLineup 
} from '../../utils/fairPlayUtils';
import { MatchShareModal } from '../matches/MatchShareModal';
import { EditMatchModal } from '../matches/EditMatchModal';

interface MatchDetailViewProps {
  match: Match;
  matches?: Match[];
  players: Player[];
  detailTab: 'attendance' | 'lineup' | 'result';
  setDetailTab: (tab: 'attendance' | 'lineup' | 'result') => void;
  onUpdateMatch: (match: Match) => Promise<void>;
  onBack: () => void;
}

export const MatchDetailView: React.FC<MatchDetailViewProps> = ({
  match: selectedMatch,
  matches = [],
  players,
  detailTab,
  setDetailTab,
  onUpdateMatch,
  onBack
}) => {
  const lineupRef = useRef<HTMLDivElement>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const isUpcoming = useMemo(() => isMatchUpcoming(selectedMatch.date), [selectedMatch.date]);
  const isInProgress = useMemo(() => isMatchInProgress(selectedMatch.date), [selectedMatch.date]);

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

  const presentPlayers = players.filter(p => selectedMatch.attendance[p.id] === 'present' || selectedMatch.attendance[p.id] === true);
  const absentPlayers = players.filter(p => selectedMatch.attendance[p.id] === 'absent' || selectedMatch.attendance[p.id] === false);
  const unknownPlayers = players.filter(p => !presentPlayers.includes(p) && !absentPlayers.includes(p));

  const assignedPlayerIds = Object.values(selectedMatch.lineup);

  // Bench and Fair Play tracking calculations
  const priorMatches = useMemo(() => getPriorMatches(selectedMatch, matches), [selectedMatch, matches]);
  const priorMatchWithLineup = useMemo(() => priorMatches.find(m => hasMatchLineup(m)), [priorMatches]);

  const playerHistories = useMemo(() => {
    const map: Record<string, PlayerBenchHistory> = {};
    players.forEach(p => {
      map[p.id] = getPlayerBenchHistory(p, selectedMatch, matches);
    });
    return map;
  }, [players, selectedMatch, matches]);

  const fairPlayOverview = useMemo(() => {
    return getMatchFairPlayOverview(selectedMatch, presentPlayers, matches);
  }, [selectedMatch, presentPlayers, matches]);

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
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-800 italic uppercase tracking-tight">
                {selectedMatch.isHome ? 'Markiezaten' : selectedMatch.opponent} vs {selectedMatch.isHome ? selectedMatch.opponent : 'Markiezaten'}
              </h2>
              {isInProgress && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse uppercase tracking-wider not-italic">
                  Speeldag • Nu Bezig
                </span>
              )}
              {!isUpcoming && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase tracking-wider not-italic">
                  Afgerond
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {formatMatchDate(selectedMatch.date)} • Aanvang: {formatMatchTime(selectedMatch.date)} {(() => {
                const gTime = selectedMatch.gatheringTime || calculateDefaultGatheringTime(selectedMatch.date, selectedMatch.isHome);
                return gTime ? `• Verzamelen: ${gTime}` : '';
              })()}
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

          {isUpcoming && (
            <button 
              onClick={() => setEditModalOpen(true)}
              className="flex items-center space-x-2 bg-white text-slate-700 hover:text-markiezaten-blue border border-slate-200 hover:border-markiezaten-blue/30 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"
              title="Wedstrijddetails bewerken (spelfouten, tijden, locatie)"
            >
              <Edit3 size={16} className="text-markiezaten-blue" />
              <span>Bewerken</span>
            </button>
          )}
          
          <button 
            onClick={() => setShareModalOpen(true)}
            className="flex items-center space-x-2 bg-markiezaten-blue text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-markiezaten-blue/20 hover:bg-markiezaten-dark transition-all active:scale-95"
            title="Deel wedstrijd info voor presentie"
          >
            <Share2 size={16} />
            <span>Deel Info</span>
          </button>
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
                  {presentPlayers.map(p => {
                    const isAssigned = assignedPlayerIds.includes(p.id);
                    const history = playerHistories[p.id];
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50">
                        <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
                          <span className="text-sm font-medium text-emerald-900 truncate">{p.name}</span>
                          {isAssigned ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 flex-shrink-0">
                              Basis
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200/60 flex-shrink-0">
                              Bank
                            </span>
                          )}
                          {history?.startedOnBenchPreviousMatch && !history?.prefersSecondHalf && (
                            <span 
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 flex-shrink-0"
                              title="Vorige wedstrijd als wissel begonnen"
                            >
                              🪑 Vorig duel wissel
                            </span>
                          )}
                          {history?.prefersSecondHalf && (
                            <span 
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 flex-shrink-0"
                              title="Speelt liever in de tweede helft"
                            >
                              ⏱️ 2e helft
                            </span>
                          )}
                        </div>
                        <button onClick={() => setAttendance(p.id, 'absent')} className="p-1.5 text-emerald-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0">
                          <XCircle size={18} />
                        </button>
                      </div>
                    );
                  })}
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {selectedMatch.isHome ? 'Markiezaten' : selectedMatch.opponent}
                  </p>
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {selectedMatch.isHome ? selectedMatch.opponent : 'Markiezaten'}
                  </p>
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
          {/* Fair Play & Rotatie Alert Banner */}
          <div className={`p-4 rounded-3xl border transition-all ${
            fairPlayOverview.unassignedPreviousBenchPlayers.filter(h => !h.prefersSecondHalf).length > 0
              ? 'bg-amber-50/90 border-amber-200/90 text-amber-950 shadow-sm'
              : fairPlayOverview.assignedPreviousBenchPlayers.length > 0
                ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950 shadow-sm'
                : 'bg-slate-50 border-slate-200/70 text-slate-800'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3.5 flex-1">
                <div className={`p-2.5 rounded-2xl flex-shrink-0 mt-0.5 ${
                  fairPlayOverview.unassignedPreviousBenchPlayers.filter(h => !h.prefersSecondHalf).length > 0
                    ? 'bg-amber-100 text-amber-800'
                    : fairPlayOverview.assignedPreviousBenchPlayers.length > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200/70 text-slate-600'
                }`}>
                  <Scale size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm">Wisselbank & Eerlijke Rotatie</h4>
                    {priorMatchWithLineup && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200/60 text-slate-600">
                        Vorig duel: vs {priorMatchWithLineup.opponent} ({formatMatchDate(priorMatchWithLineup.date)})
                      </span>
                    )}
                  </div>

                  {fairPlayOverview.unassignedPreviousBenchPlayers.filter(h => !h.prefersSecondHalf).length > 0 ? (
                    <div className="text-xs mt-1.5 space-y-2">
                      <p className="font-semibold text-amber-900">
                        ⚠️ <strong>Let op:</strong> De volgende aanwezige spelers begonnen vorige wedstrijd op de bank en staan nu nog niet in de basisopstelling:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {fairPlayOverview.unassignedPreviousBenchPlayers
                          .filter(h => !h.prefersSecondHalf)
                          .map(h => (
                            <span 
                              key={h.player.id} 
                              className="inline-flex items-center gap-1.5 font-bold text-xs bg-amber-200/80 text-amber-950 px-2.5 py-1 rounded-xl border border-amber-300 shadow-xs"
                            >
                              <Armchair size={12} className="text-amber-800" />
                              <span>{h.player.name}</span>
                              {h.consecutiveBenchStarts >= 2 && (
                                <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black">
                                  {h.consecutiveBenchStarts}x op rij bank
                                </span>
                              )}
                            </span>
                          ))}
                      </div>
                      <p className="text-[11px] text-amber-800/90 leading-tight">
                        💡 <em>Tip: Sleep deze spelers naar het veld om te voorkomen dat iemand meerdere wedstrijden achter elkaar als wissel begint.</em>
                      </p>
                    </div>
                  ) : fairPlayOverview.assignedPreviousBenchPlayers.length > 0 ? (
                    <p className="text-xs text-emerald-800 mt-1.5 font-medium">
                      ✅ <strong>Uitstekende rotatie!</strong> Alle spelers die het vorige duel als wissel begonnen staan vandaag in de basisopstelling.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 mt-1">
                      {priorMatchWithLineup 
                        ? 'Geen spelers van de vorige wisselbank aanwezig vandaag.' 
                        : 'Eerste wedstrijd of nog geen eerdere opstelling geregistreerd om rotatie mee te vergelijken.'}
                    </p>
                  )}

                  {/* 2nd half preferences exceptions info */}
                  {fairPlayOverview.unassignedPreviousBenchPlayers.filter(h => h.prefersSecondHalf).length > 0 && (
                    <div className="mt-2.5 text-[11px] text-indigo-900 bg-indigo-50/90 border border-indigo-100/80 rounded-xl p-2.5 flex items-start gap-2">
                      <Clock size={14} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Uitzondering (Voorkeur 2e helft):</strong>{' '}
                        {fairPlayOverview.unassignedPreviousBenchPlayers
                          .filter(h => h.prefersSecondHalf)
                          .map(h => h.player.name)
                          .join(', ')}{' '}
                        {fairPlayOverview.unassignedPreviousBenchPlayers.filter(h => h.prefersSecondHalf).length === 1 ? 'speelt' : 'spelen'}{' '}
                        bij voorkeur in de 2e helft en {fairPlayOverview.unassignedPreviousBenchPlayers.filter(h => h.prefersSecondHalf).length === 1 ? 'start' : 'starten'}{' '}
                        daardoor vrijwillig op de bank.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

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
                <div className="md:col-span-3 space-y-6">
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
                        playerHistories={playerHistories}
                        onAssign={onAssign}
                        onRemove={removeFromLineup}
                      />
                    ))}
                  </div>

                  {/* Wisselbank bij aanvang Component */}
                  <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Armchair size={18} className="text-markiezaten-blue" />
                        <h4 className="text-sm font-black text-slate-800">
                          Wisselbank bij Aanvang ({fairPlayOverview.currentBenchPlayers.length} {fairPlayOverview.currentBenchPlayers.length === 1 ? 'speler' : 'spelers'})
                        </h4>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {assignedPlayerIds.length}/11 Basisspelers
                      </span>
                    </div>

                    {fairPlayOverview.currentBenchPlayers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        Geen reservespelers op de bank (alle aanwezige spelers zijn opgesteld).
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {fairPlayOverview.currentBenchPlayers.map(player => {
                          const history = playerHistories[player.id];
                          const isConsecutive = (history?.consecutiveBenchStarts || 0) >= 2;
                          const wasBenchLast = history?.startedOnBenchPreviousMatch;
                          const prefers2nd = history?.prefersSecondHalf;

                          return (
                            <div 
                              key={player.id} 
                              className={`p-3 rounded-xl border transition-all ${
                                isConsecutive && !prefers2nd
                                  ? 'bg-amber-100/70 border-amber-300 text-amber-950 shadow-xs'
                                  : wasBenchLast && !prefers2nd
                                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                                    : prefers2nd
                                      ? 'bg-indigo-50/80 border-indigo-100 text-indigo-950'
                                      : 'bg-white border-slate-200/90 text-slate-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-xs truncate flex-1">{player.name}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {prefers2nd && (
                                    <span 
                                      className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded"
                                      title="Speelt vaak liever alleen in de tweede helft"
                                    >
                                      2e helft
                                    </span>
                                  )}
                                  {isConsecutive && !prefers2nd && (
                                    <span 
                                      className="text-[9px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                      title={`${history?.consecutiveBenchStarts} wedstrijden op rij begonnen als wissel!`}
                                    >
                                      <AlertTriangle size={9} />
                                      {history?.consecutiveBenchStarts}x bank
                                    </span>
                                  )}
                                  {!isConsecutive && wasBenchLast && !prefers2nd && (
                                    <span 
                                      className="text-[9px] font-bold text-amber-900 bg-amber-200/90 px-1.5 py-0.5 rounded border border-amber-300"
                                      title="Begon vorig duel als wissel"
                                    >
                                      Vorig duel wissel
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-1.5 text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/50">
                                <span>Eerder dit seizoen:</span>
                                <span className="font-semibold text-slate-700">
                                  {history?.totalBenchStartsSeason || 0}x bank • {history?.totalLineupStartsSeason || 0}x basis
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-1 space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Beschikbaar ({presentPlayers.length})</h4>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      {presentPlayers.map(player => (
                        <DraggablePlayer 
                          key={player.id} 
                          player={player} 
                          isAssigned={assignedPlayerIds.includes(player.id)}
                          benchHistory={playerHistories[player.id]}
                        />
                      ))}
                      {presentPlayers.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-4">Nog geen spelers aanwezig</p>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Sleep spelers naar een positie op het veld of kies via de positie-knoppen om de opstelling te maken. Wisselbankindicatoren helpen bij een eerlijke verdeling.
                  </p>
                </div>
              </div>
            </DndContext>
          </div>
        </div>
      </div>

      <MatchShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        match={selectedMatch}
      />

      <EditMatchModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        match={selectedMatch}
        onSave={async (updatedMatch) => {
          await updateMatch(updatedMatch);
        }}
      />
    </div>
  );
};
