import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, MapPin, Save, AlertTriangle, Sparkles, Check } from 'lucide-react';
import { Match } from '../../types';
import { 
  calculateDefaultGatheringTime, 
  formatMatchDate, 
  formatMatchTime, 
  isMatchUpcoming,
  parseMatchDateTime 
} from '../../utils/matchParser';

interface EditMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  onSave: (updatedMatch: Match) => Promise<void> | void;
}

export const EditMatchModal: React.FC<EditMatchModalProps> = ({
  isOpen,
  onClose,
  match,
  onSave,
}) => {
  const [opponent, setOpponent] = useState('');
  const [datePart, setDatePart] = useState('');
  const [timePart, setTimePart] = useState('14:30');
  const [isHome, setIsHome] = useState(true);
  const [gatheringTime, setGatheringTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize state when match changes or modal opens
  useEffect(() => {
    if (!match) return;

    setOpponent(match.opponent || '');
    setIsHome(match.isHome ?? true);

    if (match.date) {
      if (match.date.includes('T')) {
        const [d, t] = match.date.split('T');
        setDatePart(d || '');
        setTimePart(t ? t.slice(0, 5) : '14:30');
      } else if (match.date.includes(' ')) {
        const [d, t] = match.date.split(' ');
        setDatePart(d || '');
        setTimePart(t ? t.slice(0, 5) : '14:30');
      } else {
        setDatePart(match.date);
        setTimePart('14:30');
      }
    } else {
      setDatePart('');
      setTimePart('14:30');
    }

    const effectiveGathering = match.gatheringTime || calculateDefaultGatheringTime(match.date, match.isHome);
    setGatheringTime(effectiveGathering || '');
    setError(null);
  }, [match, isOpen]);

  // Check if the match is upcoming (kickoff + 120 minutes rule)
  const isUpcoming = useMemo(() => {
    if (!match) return false;
    return isMatchUpcoming(match.date);
  }, [match]);

  if (!isOpen || !match) return null;

  const currentKickoff = `${datePart || '2026-09-12'}T${timePart || '14:30'}`;
  const suggestedGathering = calculateDefaultGatheringTime(currentKickoff, isHome);

  const handleApplySuggestedGathering = () => {
    if (suggestedGathering) {
      setGatheringTime(suggestedGathering);
    }
  };

  const handleToggleHome = (newIsHome: boolean) => {
    setIsHome(newIsHome);
    // If the gathering time was exactly the suggested gathering time for the old mode, automatically recompute
    const oldSuggested = calculateDefaultGatheringTime(currentKickoff, isHome);
    if (!gatheringTime || gatheringTime === oldSuggested) {
      const newSuggested = calculateDefaultGatheringTime(currentKickoff, newIsHome);
      setGatheringTime(newSuggested);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTimePart(newTime);
    // If gathering time matches current suggestion, auto-update
    const oldSuggested = calculateDefaultGatheringTime(`${datePart}T${timePart}`, isHome);
    if (!gatheringTime || gatheringTime === oldSuggested) {
      const newSuggested = calculateDefaultGatheringTime(`${datePart}T${newTime}`, isHome);
      if (newSuggested) setGatheringTime(newSuggested);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUpcoming) {
      setError('Alleen aankomende wedstrijden kunnen worden gewijzigd. Deze wedstrijd is al gespeeld of afgerond.');
      return;
    }

    const trimmedOpponent = opponent.trim();
    if (!trimmedOpponent) {
      setError('Vul een geldige tegenstander in.');
      return;
    }

    if (!datePart) {
      setError('Kies een geldige wedstrijddatum.');
      return;
    }

    if (!timePart) {
      setError('Kies een geldige aanvangstijd.');
      return;
    }

    const formattedTime = timePart.length === 5 ? timePart : timePart.slice(0, 5);
    const finalDate = `${datePart}T${formattedTime}`;
    const finalGathering = gatheringTime.trim() || suggestedGathering || calculateDefaultGatheringTime(finalDate, isHome);

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedMatch: Match = {
        ...match,
        opponent: trimmedOpponent,
        date: finalDate,
        isHome,
        gatheringTime: finalGathering,
      };

      await onSave(updatedMatch);
      onClose();
    } catch (err) {
      console.error('Fout bij bijwerken wedstrijd:', err);
      setError('Er is een fout opgetreden bij het opslaan van de wijzigingen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-markiezaten-blue/20 text-markiezaten-blue border border-markiezaten-blue/30 flex items-center justify-center font-black">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg text-white leading-tight">Wedstrijddetails Bewerken</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Corrigeer tegenstander, aanvangstijd of verzameltijd
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            title="Sluiten"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {!isUpcoming && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start space-x-3 text-xs leading-relaxed">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Wedstrijd is al afgerond</strong>
                Deze wedstrijd is meer dan 120 minuten geleden gestart en geldt als afgerond. Wedstrijddetails kunnen alleen voor aankomende wedstrijden worden aangepast.
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
              <AlertTriangle size={16} className="text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Opponent Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
              Tegenstander <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isUpcoming || isSubmitting}
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Bijv. RBC, Halsteren 2, MOC '17..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue focus:bg-white transition-all disabled:opacity-50"
            />
            <p className="text-[11px] text-slate-400">
              Spelfouten of teamtoevoegingen (zoals '3' of 'Zat 2') kunnen hier direct worden verbeterd.
            </p>
          </div>

          {/* Home / Away Toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
              Locatie (Thuis of Uit)
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                disabled={!isUpcoming || isSubmitting}
                onClick={() => handleToggleHome(true)}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  isHome 
                    ? 'bg-white text-markiezaten-blue shadow-sm border border-slate-200/80' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MapPin size={14} />
                <span>Thuiswedstrijd</span>
              </button>
              <button
                type="button"
                disabled={!isUpcoming || isSubmitting}
                onClick={() => handleToggleHome(false)}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  !isHome 
                    ? 'bg-white text-markiezaten-blue shadow-sm border border-slate-200/80' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MapPin size={14} />
                <span>Uitwedstrijd</span>
              </button>
            </div>
          </div>

          {/* Date & Kickoff Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Speeldag / Datum <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  disabled={!isUpcoming || isSubmitting}
                  value={datePart}
                  onChange={(e) => setDatePart(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Aanvangstijd <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  disabled={!isUpcoming || isSubmitting}
                  value={timePart}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Gathering Time */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Verzameltijd
              </label>
              {suggestedGathering && suggestedGathering !== gatheringTime && (
                <button
                  type="button"
                  onClick={handleApplySuggestedGathering}
                  className="text-[11px] font-black text-markiezaten-blue hover:underline flex items-center space-x-1"
                >
                  <Sparkles size={12} />
                  <span>Standaard instellen ({suggestedGathering})</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="time"
                  disabled={!isUpcoming || isSubmitting}
                  value={gatheringTime}
                  onChange={(e) => setGatheringTime(e.target.value)}
                  placeholder="13:45"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                disabled={!isUpcoming || isSubmitting}
                onClick={handleApplySuggestedGathering}
                className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0"
                title={`Automatisch ${isHome ? '45' : '30'} minuten voor aanvang`}
              >
                Auto ({isHome ? '-45m' : '-30m'})
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Standaard: <strong>45 min</strong> voor aanvang bij Thuiswedstrijden, <strong>30 min</strong> bij Uitwedstrijden.
            </p>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Voorbeeld weergave</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isHome ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {isHome ? 'Thuis' : 'Uit'}
              </span>
            </div>
            <p className="font-black text-sm text-slate-900">
              {isHome ? 'VV de Markiezaten' : (opponent.trim() || 'Tegenstander')} vs {isHome ? (opponent.trim() || 'Tegenstander') : 'VV de Markiezaten'}
            </p>
            <p className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
              <span className="flex items-center space-x-1 font-semibold">
                <Calendar size={13} className="text-slate-400" />
                <span>{datePart ? formatMatchDate(datePart) : 'Kies een datum'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1 font-semibold">
                <Clock size={13} className="text-slate-400" />
                <span>Aanvang: {timePart || '14:30'}</span>
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">
                Verzamelen: {gatheringTime || suggestedGathering || '13:45'}
              </span>
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={!isUpcoming || isSubmitting}
              className="px-6 py-2.5 bg-markiezaten-blue hover:bg-blue-600 text-white rounded-xl text-sm font-black shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Opslaan...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Wijzigingen Opslaan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
