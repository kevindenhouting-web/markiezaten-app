import React, { useState } from 'react';
import { Plus, Calendar, Trash2, XCircle } from 'lucide-react';
import { Player, Match, View } from '../../types';

interface MatchesViewProps {
  matches: Match[];
  players: Player[];
  addMatch: (opponent: string, date: string, isHome: boolean, gatheringTime: string) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  setSelectedMatchId: (id: string | null) => void;
  setView: (view: View) => void;
  currentSeason: string;
  matchTab: 'future' | 'past';
  setMatchTab: (tab: 'future' | 'past') => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  matches,
  players,
  addMatch,
  deleteMatch,
  setSelectedMatchId,
  setView,
  currentSeason,
  matchTab,
  setMatchTab
}) => {
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [gatheringTime, setGatheringTime] = useState('');
  const [isAddingMatch, setIsAddingMatch] = useState(false);

  const filteredMatches = matches
    .filter(m => {
      const isPast = new Date(m.date) < new Date();
      return matchTab === 'future' ? !isPast : isPast;
    })
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return matchTab === 'future' ? timeA - timeB : timeB - timeA;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800">Wedstrijdbeheer</h2>
        <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2">
          <div className="w-2 h-2 bg-markiezaten-blue rounded-full"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seizoen {currentSeason}</span>
        </div>
      </div>

      {!isAddingMatch ? (
        <button 
          onClick={() => setIsAddingMatch(true)}
          className="w-full bg-white p-8 rounded-2xl shadow-sm border-2 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-3 hover:border-markiezaten-blue/50 hover:bg-slate-50/50 transition-all group"
        >
          <div className="w-12 h-12 bg-markiezaten-light rounded-full flex items-center justify-center text-markiezaten-blue group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          <div className="text-center">
            <p className="font-black text-slate-800">Nieuwe Wedstrijd Toevoegen</p>
            <p className="text-xs text-slate-500">Plan een nieuwe wedstrijd of voeg een resultaat toe</p>
          </div>
        </button>
      ) : (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Wedstrijd Toevoegen</h3>
              <p className="text-[10px] text-slate-500">Vul de details van de wedstrijd in.</p>
            </div>
            <button 
              onClick={() => setIsAddingMatch(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <XCircle size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tegenstander</label>
              <input 
                type="text" 
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Naam tegenstander..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Datum & Tijd</label>
              <input 
                type="datetime-local" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Thuis / Uit</label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button 
                  onClick={() => setIsHome(true)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${isHome ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500'}`}
                >
                  Thuis
                </button>
                <button 
                  onClick={() => setIsHome(false)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${!isHome ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500'}`}
                >
                  Uit
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Verzameltijd</label>
              <input 
                type="time" 
                value={gatheringTime}
                onChange={(e) => setGatheringTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => { 
                addMatch(opponent, date, isHome, gatheringTime); 
                setOpponent(''); 
                setDate(''); 
                setGatheringTime(''); 
                setIsAddingMatch(false);
              }}
              className="flex-1 bg-markiezaten-blue text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center space-x-2 hover:bg-markiezaten-dark transition-colors"
            >
              <Plus size={18} />
              <span>Opslaan</span>
            </button>
            <button 
              onClick={() => setIsAddingMatch(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setMatchTab('future')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${matchTab === 'future' ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Toekomstig
        </button>
        <button 
          onClick={() => setMatchTab('past')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${matchTab === 'past' ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Afgerond
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Calendar size={32} />
            </div>
            <p className="text-slate-500 font-medium">Geen {matchTab === 'future' ? 'toekomstige' : 'afgeronde'} wedstrijden gevonden</p>
          </div>
        ) : (
          filteredMatches.map(match => {
            const ourScore = match.isHome ? (match.score?.home ?? 0) : (match.score?.away ?? 0);
            const opponentScore = match.isHome ? (match.score?.away ?? 0) : (match.score?.home ?? 0);
            const isWin = match.score && ourScore > opponentScore;
            const isLoss = match.score && ourScore < opponentScore;
            const isDraw = match.score && ourScore === opponentScore;

            return (
              <div key={match.id} className={`p-5 rounded-2xl shadow-sm border transition-all group ${
                isWin ? 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-300' :
                isLoss ? 'bg-rose-50/40 border-rose-100 hover:border-rose-300' :
                isDraw ? 'bg-slate-50/40 border-slate-100 hover:border-slate-300' :
                'bg-white border-slate-100 hover:border-markiezaten-blue/30'
              }`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  isWin ? 'bg-emerald-100 text-emerald-600' :
                  isLoss ? 'bg-rose-100 text-rose-600' :
                  isDraw ? 'bg-slate-100 text-slate-600' :
                  match.isHome ? 'bg-markiezaten-light text-markiezaten-blue' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">vs {match.opponent}</p>
                    {match.score && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap ${
                        isWin ? 'bg-emerald-600 text-white' :
                        isLoss ? 'bg-rose-600 text-white' :
                        'bg-slate-900 text-white'
                      }`}>
                        {match.score.home} - {match.score.away}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap ${match.isHome ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        {match.isHome ? 'Thuis' : 'Uit'}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap ${Object.values(match.attendance).filter(v => v === 'present' || v === true).length >= 11 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {Object.values(match.attendance).filter(v => v === 'present' || v === true).length} Spelers
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(match.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })} om {new Date(match.date).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {match.gatheringTime && (
                    <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                      Verzamelen: {match.gatheringTime}
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => deleteMatch(match.id)}
                className="p-2 text-slate-200 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex -space-x-2">
                {players.slice(0, 5).map(p => (
                  <div key={p.id} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${match.attendance[p.id] === 'present' || match.attendance[p.id] === true ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {p.name.charAt(0)}
                  </div>
                ))}
                {players.length > 5 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    +{players.length - 5}
                  </div>
                )}
              </div>
              <button 
                onClick={() => { setSelectedMatchId(match.id); setView('match-detail'); }}
                className="text-xs font-black text-markiezaten-blue hover:underline uppercase tracking-widest"
              >
                Details
              </button>
            </div>
          </div>
            );
          })
        )}
      </div>
    </div>
  );
};
