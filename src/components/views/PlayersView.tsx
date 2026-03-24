import React, { useState } from 'react';
import { UserPlus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Player } from '../../types';

interface PlayersViewProps {
  players: Player[];
  addPlayer: (name: string) => Promise<void>;
  updatePlayer: (id: string, name: string) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  currentSeason: string;
}

export const PlayersView: React.FC<PlayersViewProps> = ({
  players,
  addPlayer,
  updatePlayer,
  removePlayer,
  currentSeason
}) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (player: Player) => {
    setEditingId(player.id);
    setEditName(player.name);
  };

  const handleSaveEdit = async () => {
    if (editingId && editName.trim()) {
      await updatePlayer(editingId, editName);
      setEditingId(null);
    }
  };

  const handleAddPlayer = async () => {
    if (newName.trim()) {
      await addPlayer(newName);
      setNewName('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800">Spelersbeheer</h2>
        <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2">
          <div className="w-2 h-2 bg-markiezaten-blue rounded-full"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seizoen {currentSeason}</span>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Nieuwe Speler Toevoegen</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Naam speler..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
          />
          <button 
            onClick={handleAddPlayer}
            className="bg-markiezaten-blue text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-markiezaten-dark transition-colors shadow-sm active:scale-95"
          >
            <UserPlus size={18} />
            <span>Toevoegen</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Spelerslijst ({players.length})</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {players.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Nog geen spelers toegevoegd</div>
          ) : (
            players.map(player => (
              <div key={player.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-markiezaten-light rounded-2xl flex items-center justify-center text-markiezaten-blue font-black text-lg shadow-sm flex-shrink-0">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  
                  {editingId === player.id ? (
                    <div className="flex-1 flex items-center space-x-2">
                      <input 
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      />
                      <button 
                        onClick={handleSaveEdit}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <CheckCircle2 size={20} />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{player.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actieve Speler</p>
                    </div>
                  )}
                </div>
                
                {!editingId && (
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => handleStartEdit(player)}
                      className="p-3 text-slate-300 hover:text-markiezaten-blue active:scale-90 transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => removePlayer(player.id)}
                      className="p-3 text-slate-300 hover:text-red-500 active:scale-90 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
