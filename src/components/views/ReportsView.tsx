import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import { BarChart3, Share2, CheckCircle2 } from 'lucide-react';
import { Player, Match } from '../../types';

interface ReportsViewProps {
  players: Player[];
  matches: Match[];
  currentSeason: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  players,
  matches,
  currentSeason
}) => {
  const pastMatches = matches.filter(m => new Date(m.date) < new Date());
  const hallOfFameRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const stats = players.map(player => {
    const totalMatches = pastMatches.length;
    const attendedMatches = pastMatches.filter(m => m.attendance[player.id] === 'present' || m.attendance[player.id] === true).length;
    const percentage = totalMatches > 0 ? Math.round((attendedMatches / totalMatches) * 100) : 0;
    
    const goals = pastMatches.reduce((acc, m) => {
      return acc + (m.scorers || []).filter(id => id === player.id).length;
    }, 0);

    return { ...player, attendedMatches, totalMatches, percentage, goals };
  }).sort((a, b) => b.percentage - a.percentage);

  const scorerStats = [...stats].sort((a, b) => b.goals - a.goals).filter(s => s.goals > 0);

  const maxPercentage = stats.length > 0 ? stats[0].percentage : 0;
  const topPerformers = stats.filter(s => s.percentage === maxPercentage && maxPercentage > 0);

  const handleExport = async () => {
    if (!hallOfFameRef.current) return;
    
    setIsExporting(true);
    try {
      // Wait a bit for any animations to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(hallOfFameRef.current, {
        cacheBust: true,
        backgroundColor: '#001F2D', // markiezaten-dark
        style: {
          borderRadius: '0', // Remove rounding for full image feel
        }
      });
      
      const link = document.createElement('a');
      link.download = `de-top-markiezen-seizoen-${currentSeason}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Wedstrijden</p>
          <p className="text-xl font-black text-slate-900">{pastMatches.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gem. Opkomst</p>
          <p className="text-xl font-black text-slate-900">
            {stats.length > 0 ? Math.round(stats.reduce((acc, curr) => acc + curr.percentage, 0) / stats.length) : 0}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Top Performers</p>
          <p className="text-sm font-bold text-markiezaten-blue truncate">
            {topPerformers.length > 1 ? `${topPerformers.length} Spelers` : topPerformers[0]?.name || '-'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Actieve Spelers</p>
          <p className="text-xl font-black text-slate-900">{players.length}</p>
        </div>
      </div>

      {/* Hall of Fame / Top Performers Highlight */}
      {topPerformers.length > 0 && (
        <div className="relative group">
          <motion.div 
            ref={hallOfFameRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-markiezaten-dark rounded-3xl p-6 md:p-8 text-white overflow-hidden relative"
          >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-markiezaten-cyan/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-markiezaten-blue/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-markiezaten-cyan/20 rounded-xl text-markiezaten-cyan">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black italic tracking-tight">DE TOP MARKIEZEN</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Seizoen {currentSeason} • {maxPercentage}% Opkomst</p>
                  </div>
                </div>

                <button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/10"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Share2 size={14} />
                  )}
                  <span>{isExporting ? 'Exporteren...' : 'Deel op Socials'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {topPerformers.map((player, index) => (
                  <motion.div 
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center space-x-4 hover:bg-white/10 transition-all group/item"
                  >
                    <div className="w-12 h-12 bg-markiezaten-cyan/20 rounded-xl flex items-center justify-center text-markiezaten-cyan font-black text-lg shadow-inner group-hover/item:scale-110 transition-transform">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-black text-white group-hover/item:text-markiezaten-cyan transition-colors">{player.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Performer</p>
                    </div>
                    <div className="ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <CheckCircle2 size={16} className="text-markiezaten-cyan" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Attendance Ranking Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Opkomst Percentage</h3>
          <span className="bg-markiezaten-blue text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Volledige Lijst</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">#</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Speler</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Aanwezig</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((player, index) => (
                <tr key={player.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-slate-400 border-b border-slate-50">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900 border-b border-slate-50">{player.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-500 border-b border-slate-50">
                    {player.attendedMatches} / {player.totalMatches}
                  </td>
                  <td className="px-6 py-4 text-right border-b border-slate-50">
                    <div className="flex items-center justify-end space-x-3">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${player.percentage}%` }}
                          className={`h-full rounded-full ${
                            player.percentage >= 80 ? 'bg-markiezaten-cyan' : 
                            player.percentage >= 50 ? 'bg-markiezaten-blue' : 
                            'bg-slate-300'
                          }`}
                        />
                      </div>
                      <span className={`text-sm font-black ${
                        player.percentage >= 80 ? 'text-markiezaten-cyan' : 
                        player.percentage >= 50 ? 'text-markiezaten-blue' : 
                        'text-slate-500'
                      }`}>
                        {player.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Scorers Section */}
      {scorerStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Topscorers</h3>
            <span className="bg-markiezaten-cyan text-markiezaten-dark text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Seizoen {currentSeason}</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {scorerStats.slice(0, 8).map((player, index) => (
              <div key={player.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-markiezaten-blue font-black text-sm shadow-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{player.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{player.goals} Doelpunten</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
