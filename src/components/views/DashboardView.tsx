import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Users, Calendar, BarChart3, Trophy, ChevronRight } from 'lucide-react';
import { Player, Match, View } from '../../types';

interface DashboardViewProps {
  players: Player[];
  matches: Match[];
  allPlayers: Player[];
  allMatches: Match[];
  isDataLoading: boolean;
  handleForceRefresh: () => void;
  currentSeason: string;
  setView: (view: View) => void;
  setSelectedMatchId: (id: string | null) => void;
  setMatchTab: (tab: 'future' | 'past') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  players,
  matches,
  allPlayers,
  allMatches,
  isDataLoading,
  handleForceRefresh,
  currentSeason,
  setView,
  setSelectedMatchId,
  setMatchTab
}) => {
  const scorerStats = players.map(player => {
    const goals = matches.reduce((acc, match) => {
      return acc + (match.scorers?.filter(id => id === player.id).length || 0);
    }, 0);
    return { ...player, goals };
  }).sort((a, b) => b.goals - a.goals);

  const topScorer = scorerStats[0]?.goals > 0 ? scorerStats[0] : null;

  return (
    <div className="space-y-6">
      {/* Empty State Handler */}
      {(allPlayers.length === 0 || allMatches.length === 0) && !isDataLoading && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-markiezaten-light border border-markiezaten-blue/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/50 rounded-2xl flex items-center justify-center text-markiezaten-blue">
              <RefreshCw size={24} />
            </div>
            <div>
              <h3 className="font-bold text-markiezaten-dark">Nog geen gegevens zichtbaar?</h3>
              <p className="text-markiezaten-blue text-sm">Het kan zijn dat de verbinding nog wordt opgebouwd.</p>
            </div>
          </div>
          <button 
            onClick={handleForceRefresh}
            className="bg-markiezaten-blue text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-markiezaten-dark transition-all active:scale-95"
          >
            Nu synchroniseren
          </button>
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800">Dashboard</h2>
        <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2">
          <div className="w-2 h-2 bg-markiezaten-blue rounded-full"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seizoen {currentSeason}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-center space-y-2 md:space-y-0 md:space-x-4 text-center md:text-left">
          <div className="bg-markiezaten-light p-3 rounded-xl text-markiezaten-blue">
            <Users size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-wider">Spelers</p>
            <p className="text-xl md:text-2xl font-black text-slate-900">{players.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-center space-y-2 md:space-y-0 md:space-x-4 text-center md:text-left">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <Calendar size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-wider">Wedstrijden</p>
            <p className="text-xl md:text-2xl font-black text-slate-900">{matches.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-center space-y-2 md:space-y-0 md:space-x-4 text-center md:text-left">
          <div className="bg-markiezaten-light p-3 rounded-xl text-markiezaten-blue">
            <BarChart3 size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-wider">Opkomst</p>
            <p className="text-xl md:text-2xl font-black text-slate-900">
              {(() => {
                const pastMatches = matches.filter(m => new Date(m.date) < new Date());
                return pastMatches.length > 0 
                  ? Math.round((pastMatches.reduce((acc, m) => acc + Object.values(m.attendance).filter(v => v === 'present' || v === true).length, 0) / (pastMatches.length * (players.length || 1))) * 100)
                  : 0;
              })()}%
            </p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-center space-y-2 md:space-y-0 md:space-x-4 text-center md:text-left">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <Trophy size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-wider">Topscorer</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 truncate max-w-[120px]">
              {topScorer ? topScorer.name : '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Komende Wedstrijden</h3>
          <button 
            onClick={() => setView('matches')}
            className="text-sm text-markiezaten-blue font-semibold hover:underline"
          >
            Alle
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {(() => {
            const futureMatches = matches
              .filter(m => new Date(m.date) >= new Date())
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            if (futureMatches.length === 0) {
              return <div className="p-8 text-center text-slate-400">Geen komende wedstrijden gepland</div>;
            }

            return futureMatches.slice(0, 3).map(match => (
              <div key={match.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setSelectedMatchId(match.id); setView('match-detail'); }}>
                <div className="flex items-center space-x-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-xs font-bold text-markiezaten-blue uppercase">{new Date(match.date).toLocaleDateString('nl-NL', { month: 'short' })}</p>
                    <p className="text-xl font-black text-slate-900">{new Date(match.date).getDate()}</p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-slate-900">vs {match.opponent}</p>
                      <span className={`text-[8px] font-black px-1 py-0.5 rounded uppercase ${match.isHome ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        {match.isHome ? 'Thuis' : 'Uit'}
                      </span>
                      <span className={`text-[8px] font-black px-1 py-0.5 rounded uppercase ${Object.values(match.attendance).filter(v => v === 'present' || v === true).length >= 11 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {Object.values(match.attendance).filter(v => v === 'present' || v === true).length} Spelers
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {new Date(match.date).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                      {match.gatheringTime && ` (Verzamelen: ${match.gatheringTime})`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300" size={20} />
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Recente Resultaten</h3>
          <button 
            onClick={() => { setView('matches'); setMatchTab('past'); }}
            className="text-sm text-markiezaten-blue font-semibold hover:underline"
          >
            Alle
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {(() => {
            const pastMatches = matches
              .filter(m => new Date(m.date) < new Date() && m.score)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            if (pastMatches.length === 0) {
              return <div className="p-8 text-center text-slate-400">Nog geen resultaten bekend</div>;
            }

            return pastMatches.slice(0, 3).map(match => {
              const ourScore = match.isHome ? (match.score?.home ?? 0) : (match.score?.away ?? 0);
              const opponentScore = match.isHome ? (match.score?.away ?? 0) : (match.score?.home ?? 0);
              const isWin = ourScore > opponentScore;
              const isLoss = ourScore < opponentScore;
              const isDraw = ourScore === opponentScore;

              return (
                <div 
                  key={match.id} 
                  className={`p-4 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${
                    isWin ? 'bg-emerald-50/40 hover:bg-emerald-100/40' :
                    isLoss ? 'bg-rose-50/40 hover:bg-rose-100/40' :
                    isDraw ? 'bg-slate-50/40 hover:bg-slate-100/40' :
                    'hover:bg-slate-50'
                  }`} 
                  onClick={() => { setSelectedMatchId(match.id); setView('match-detail'); }}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      isWin ? 'bg-emerald-100 text-emerald-600' :
                      isLoss ? 'bg-rose-100 text-rose-600' :
                      isDraw ? 'bg-slate-100 text-slate-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">vs {match.opponent}</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap ${
                          isWin ? 'bg-emerald-600 text-white' :
                          isLoss ? 'bg-rose-600 text-white' :
                          'bg-slate-900 text-white'
                        }`}>
                          {match.score?.home} - {match.score?.away}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(match.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300" size={20} />
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};
