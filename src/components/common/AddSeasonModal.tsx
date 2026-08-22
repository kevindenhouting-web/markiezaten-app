import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { getNextSuggestedSeason } from '../../utils/seasonUtils';

interface AddSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSeason: (seasonName: string) => Promise<void>;
  existingSeasons: string[];
}

export const AddSeasonModal: React.FC<AddSeasonModalProps> = ({
  isOpen,
  onClose,
  onAddSeason,
  existingSeasons
}) => {
  const [seasonName, setSeasonName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestedNext = getNextSuggestedSeason(existingSeasons);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = seasonName.trim();

    if (!trimmed) {
      setError('Vul een seizoensnaam in, bijv. "28/29".');
      return;
    }

    if (existingSeasons.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Seizoen "${trimmed}" bestaat al.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAddSeason(trimmed);
      setSeasonName('');
    } catch (err) {
      setError('Fout bij toevoegen van seizoen. Probeer opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setSeasonName(suggestion);
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="bg-markiezaten-dark p-6 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-markiezaten-blue/20 flex items-center justify-center text-markiezaten-blue">
                  <PlusCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Nieuw Seizoen Toevoegen</h3>
                  <p className="text-xs text-slate-300">Maak een nieuw voetbalseizoen aan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-xl bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Seizoensnaam
                </label>
                <input
                  type="text"
                  value={seasonName}
                  onChange={(e) => {
                    setSeasonName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="bijv. 28/29"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue font-bold text-slate-800"
                  autoFocus
                />
                {error && (
                  <p className="text-xs font-semibold text-red-500 mt-2">{error}</p>
                )}
              </div>

              {/* Suggestions */}
              {suggestedNext && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 mb-2">
                    <Sparkles size={14} className="text-markiezaten-blue" />
                    <span>Suggereerde volgend seizoen:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUseSuggestion(suggestedNext)}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-markiezaten-blue rounded-xl text-xs font-black text-slate-800 shadow-sm transition-all hover:bg-markiezaten-blue/5"
                  >
                    <span>{suggestedNext}</span>
                    <CheckCircle2 size={14} className="text-markiezaten-blue" />
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-5 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 text-sm transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-markiezaten-blue hover:bg-blue-600 text-white rounded-2xl font-black text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Toevoegen...' : 'Seizoen Aanmaken'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
