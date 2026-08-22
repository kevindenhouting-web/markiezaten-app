import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  Layers, 
  Calendar, 
  Sparkles, 
  Copy, 
  Trash2, 
  Wand2, 
  Check, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  ClipboardPaste,
  RefreshCw,
  Home,
  MapPin
} from 'lucide-react';
import { NewMatchInput } from '../../types';
import { 
  getNextDefaultMatchDateTime, 
  addWeeksToDateTime, 
  calculateDefaultGatheringTime, 
  parseBulkMatchText,
  formatMatchDate,
  formatMatchTime
} from '../../utils/matchParser';

interface AddMatchSectionProps {
  onAddMatches: (matches: NewMatchInput[]) => Promise<void>;
  onClose: () => void;
  currentSeason: string;
}

type AddMode = 'single' | 'multiple' | 'paste';

export const AddMatchSection: React.FC<AddMatchSectionProps> = ({
  onAddMatches,
  onClose,
  currentSeason
}) => {
  const [mode, setMode] = useState<AddMode>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Single match state
  const [singleOpponent, setSingleOpponent] = useState('');
  const [singleDate, setSingleDate] = useState(getNextDefaultMatchDateTime());
  const [singleIsHome, setSingleIsHome] = useState(true);
  const [singleGatheringTime, setSingleGatheringTime] = useState(() => 
    calculateDefaultGatheringTime(getNextDefaultMatchDateTime(), true)
  );

  // Multi-matches state
  const [multiRows, setMultiRows] = useState<NewMatchInput[]>(() => [
    {
      opponent: '',
      date: getNextDefaultMatchDateTime(),
      isHome: true,
      gatheringTime: calculateDefaultGatheringTime(getNextDefaultMatchDateTime(), true)
    },
    {
      opponent: '',
      date: addWeeksToDateTime(getNextDefaultMatchDateTime(), 1),
      isHome: false,
      gatheringTime: calculateDefaultGatheringTime(addWeeksToDateTime(getNextDefaultMatchDateTime(), 1), false)
    }
  ]);

  // Paste / Import state
  const [pastedText, setPastedText] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<NewMatchInput[]>([]);

  // Update gathering time automatically on Single mode changes if user hasn't heavily customized
  const handleSingleDateChange = (newDate: string) => {
    setSingleDate(newDate);
    setSingleGatheringTime(calculateDefaultGatheringTime(newDate, singleIsHome));
  };

  const handleSingleHomeChange = (isHome: boolean) => {
    setSingleIsHome(isHome);
    setSingleGatheringTime(calculateDefaultGatheringTime(singleDate, isHome));
  };

  // Add row to multiple
  const handleAddRow = () => {
    const lastRow = multiRows[multiRows.length - 1];
    const nextDate = lastRow?.date 
      ? addWeeksToDateTime(lastRow.date, 1) 
      : getNextDefaultMatchDateTime();
    const nextHome = lastRow ? !lastRow.isHome : true;

    setMultiRows(prev => [
      ...prev,
      {
        opponent: '',
        date: nextDate,
        isHome: nextHome,
        gatheringTime: calculateDefaultGatheringTime(nextDate, nextHome)
      }
    ]);
  };

  // Duplicate specific row
  const handleDuplicateRow = (index: number) => {
    const source = multiRows[index];
    const nextDate = source.date ? addWeeksToDateTime(source.date, 1) : getNextDefaultMatchDateTime();
    const newRow: NewMatchInput = {
      ...source,
      date: nextDate,
      gatheringTime: calculateDefaultGatheringTime(nextDate, source.isHome)
    };
    const updated = [...multiRows];
    updated.splice(index + 1, 0, newRow);
    setMultiRows(updated);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (multiRows.length <= 1) {
      // Reset row instead of empty
      setMultiRows([{
        opponent: '',
        date: getNextDefaultMatchDateTime(),
        isHome: true,
        gatheringTime: calculateDefaultGatheringTime(getNextDefaultMatchDateTime(), true)
      }]);
      return;
    }
    setMultiRows(prev => prev.filter((_, i) => i !== index));
  };

  // Update specific field in multiple rows
  const handleUpdateRow = (index: number, field: keyof NewMatchInput, value: any) => {
    setMultiRows(prev => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      if (field === 'date' || field === 'isHome') {
        current.gatheringTime = calculateDefaultGatheringTime(
          field === 'date' ? value : current.date,
          field === 'isHome' ? value : current.isHome
        );
      }

      updated[index] = current;
      return updated;
    });
  };

  // Auto-calculate all gathering times
  const handleAutoCalcGatheringTimes = () => {
    setMultiRows(prev => prev.map(row => ({
      ...row,
      gatheringTime: calculateDefaultGatheringTime(row.date, row.isHome)
    })));
  };

  // Handle pasted text live update
  const handlePasteChange = (text: string) => {
    setPastedText(text);
    const parsed = parseBulkMatchText(text, currentSeason);
    setParsedImportRows(parsed);
  };

  // Load sample data into text importer
  const handleLoadSample = (type: 'competition' | 'whatsapp') => {
    let sample = '';
    if (type === 'competition') {
      sample = `05-09-2026 14:30 | RBC | Thuis | 13:45
12-09-2026 15:00 | MOC '17 | Uit | 13:30
19-09-2026 14:30 | Halsteren | Thuis | 13:45
26-09-2026 14:30 | Dosko | Uit | 13:15
03-10-2026 14:30 | Steenbergen | Thuis | 13:45`;
    } else {
      sample = `Za 5 sep om 14:30 tegen RBC (Thuis) - verzamelen 13:45
Za 12 sep 15:00 vs MOC '17 uit om 13:30 aanwezig
Za 19 september 14:30 Halsteren thuis
Za 26 sep 14:30 tegen Dosko (uit)`;
    }
    handlePasteChange(sample);
  };

  // Transfer parsed rows to multiple editor
  const handleTransferParsedToRows = () => {
    if (parsedImportRows.length === 0) return;
    setMultiRows(parsedImportRows);
    setMode('multiple');
  };

  // Submit Handler
  const handleSave = async (andKeepAdding = false) => {
    setErrorMessage(null);
    let toSave: NewMatchInput[] = [];

    if (mode === 'single') {
      if (!singleOpponent.trim()) {
        setErrorMessage('Vul de naam van de tegenstander in.');
        return;
      }
      if (!singleDate) {
        setErrorMessage('Selecteer een geldige datum en aanvangstijd.');
        return;
      }
      toSave = [{
        opponent: singleOpponent.trim(),
        date: singleDate,
        isHome: singleIsHome,
        gatheringTime: singleGatheringTime || calculateDefaultGatheringTime(singleDate, singleIsHome)
      }];
    } else if (mode === 'multiple') {
      const validRows = multiRows.filter(r => r.opponent.trim() && r.date);
      if (validRows.length === 0) {
        setErrorMessage('Vul minimaal één wedstrijd in met tegenstander en datum.');
        return;
      }
      toSave = validRows.map(r => ({
        ...r,
        opponent: r.opponent.trim(),
        gatheringTime: r.gatheringTime || calculateDefaultGatheringTime(r.date, r.isHome)
      }));
    } else if (mode === 'paste') {
      if (parsedImportRows.length === 0) {
        setErrorMessage('Geen geldige wedstrijden herkend in de geplakte tekst.');
        return;
      }
      toSave = parsedImportRows;
    }

    try {
      setIsSubmitting(true);
      await onAddMatches(toSave);

      if (andKeepAdding && mode === 'single') {
        const nextDate = addWeeksToDateTime(singleDate, 1);
        const nextHome = !singleIsHome;
        setSingleOpponent('');
        setSingleDate(nextDate);
        setSingleIsHome(nextHome);
        setSingleGatheringTime(calculateDefaultGatheringTime(nextDate, nextHome));
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Er is een fout opgetreden bij het opslaan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validMultiCount = multiRows.filter(r => r.opponent.trim() && r.date).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden"
    >
      {/* Top Header */}
      <div className="bg-gradient-to-r from-markiezaten-dark via-slate-900 to-markiezaten-dark text-white p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-markiezaten-blue/30 text-markiezaten-blue border border-markiezaten-blue/40">
              Seizoen {currentSeason}
            </span>
            <span className="text-slate-400 text-xs font-bold">•</span>
            <span className="text-slate-300 text-xs font-bold">Wedstrijden Inplannen</span>
          </div>
          <h3 className="text-xl font-black italic tracking-tight text-white mt-1">
            {mode === 'single' && '1 Wedstrijd Toevoegen'}
            {mode === 'multiple' && 'Meerdere Wedstrijden Toevoegen (Tabel)'}
            {mode === 'paste' && 'Slim Tekst / Schema Importeren'}
          </h3>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/10 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              mode === 'single'
                ? 'bg-markiezaten-blue text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar size={14} />
            <span>1 Wedstrijd</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('multiple')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              mode === 'multiple'
                ? 'bg-markiezaten-blue text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} />
            <span>Meerdere</span>
            {validMultiCount > 0 && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {validMultiCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode('paste')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              mode === 'paste'
                ? 'bg-markiezaten-blue text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={14} className="text-amber-300" />
            <span>Slim Plakken</span>
          </button>

          <button 
            type="button"
            onClick={onClose}
            className="ml-2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Sluiten"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="mx-6 mt-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-700 text-sm font-bold">
          <AlertCircle size={20} className="shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mode Body 1: Single Match Form */}
      {mode === 'single' && (
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opponent */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Tegenstander <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={singleOpponent}
                onChange={(e) => setSingleOpponent(e.target.value)}
                placeholder="bijv. RBC, MOC '17, Halsteren..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue transition-all"
                autoFocus
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Datum & Aanvangstijd <span className="text-red-500">*</span>
              </label>
              <input 
                type="datetime-local" 
                value={singleDate}
                onChange={(e) => handleSingleDateChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue transition-all"
              />
            </div>

            {/* Home / Away */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Locatie
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => handleSingleHomeChange(true)}
                  className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
                    singleIsHome 
                      ? 'bg-white text-markiezaten-blue shadow-sm border border-slate-200/60' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Home size={14} />
                  <span>Thuis</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleSingleHomeChange(false)}
                  className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
                    !singleIsHome 
                      ? 'bg-white text-markiezaten-blue shadow-sm border border-slate-200/60' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MapPin size={14} />
                  <span>Uit</span>
                </button>
              </div>
            </div>

            {/* Gathering Time */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  Verzameltijd
                </label>
                <button
                  type="button"
                  onClick={() => setSingleGatheringTime(calculateDefaultGatheringTime(singleDate, singleIsHome))}
                  className="text-[10px] font-bold text-markiezaten-blue hover:underline"
                  title="Herbereken automatisch"
                >
                  Auto ({singleIsHome ? '-45m' : '-60m'})
                </button>
              </div>
              <input 
                type="time" 
                value={singleGatheringTime}
                onChange={(e) => setSingleGatheringTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue transition-all"
              />
            </div>
          </div>

          {/* Single Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setMode('multiple')}
              className="text-xs font-bold text-slate-500 hover:text-markiezaten-blue flex items-center space-x-1"
            >
              <Layers size={14} />
              <span>Wil je er meerdere tegelijk toevoegen? Klik hier</span>
            </button>

            <div className="flex items-center space-x-3">
              <button 
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors"
              >
                Annuleren
              </button>
              <button 
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Plus size={16} />
                <span>Opslaan & Direct Volgende</span>
              </button>
              <button 
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-markiezaten-blue hover:bg-blue-600 text-white rounded-xl text-sm font-black shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                <Check size={18} />
                <span>{isSubmitting ? 'Bezig met opslaan...' : 'Wedstrijd Opslaan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Body 2: Multiple Matches Table Editor */}
      {mode === 'multiple' && (
        <div className="p-5 md:p-8 space-y-6">
          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Rijen ({multiRows.length}):
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {validMultiCount} gereed om toe te voegen
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-markiezaten-blue text-slate-800 rounded-xl text-xs font-black shadow-sm flex items-center space-x-1.5 hover:bg-slate-50 transition-all"
              >
                <Plus size={14} className="text-markiezaten-blue" />
                <span>+ Rij Toevoegen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const last = multiRows[multiRows.length - 1];
                  const d = last?.date ? addWeeksToDateTime(last.date, 1) : getNextDefaultMatchDateTime();
                  const h = last ? !last.isHome : true;
                  setMultiRows(prev => [
                    ...prev,
                    {
                      opponent: '',
                      date: d,
                      isHome: h,
                      gatheringTime: calculateDefaultGatheringTime(d, h)
                    }
                  ]);
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-markiezaten-blue text-slate-800 rounded-xl text-xs font-black shadow-sm flex items-center space-x-1.5 hover:bg-slate-50 transition-all"
                title="Voegt een rij toe precies 1 week na de laatste datum en wisselt thuis/uit om"
              >
                <Calendar size={14} className="text-markiezaten-blue" />
                <span>+ Volgende Week (+7d)</span>
              </button>

              <button
                type="button"
                onClick={handleAutoCalcGatheringTimes}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 hover:bg-slate-50 transition-all"
                title="Bereken automatisch verzameltijden op basis van aanvang en thuis/uit"
              >
                <Clock size={14} className="text-amber-500" />
                <span>Auto Verzameltijden</span>
              </button>
            </div>
          </div>

          {/* Rows List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {multiRows.map((row, index) => (
              <div 
                key={index}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-markiezaten-blue/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-black text-slate-700">
                      Wedstrijd #{index + 1}
                    </span>
                    {row.opponent.trim() && (
                      <span className="text-xs font-bold text-slate-400">
                        • vs {row.opponent} ({row.isHome ? 'Thuis' : 'Uit'})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicateRow(index)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Dupliceer rij (+1 week)"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(index)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Verwijder rij"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Opponent */}
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Tegenstander <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={row.opponent}
                      onChange={(e) => handleUpdateRow(index, 'opponent', e.target.value)}
                      placeholder="Naam tegenstander..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Datum & Aanvangstijd <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="datetime-local" 
                      value={row.date}
                      onChange={(e) => handleUpdateRow(index, 'date', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
                    />
                  </div>

                  {/* Home / Away */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Locatie
                    </label>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl">
                      <button 
                        type="button"
                        onClick={() => handleUpdateRow(index, 'isHome', true)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                          row.isHome ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        Thuis
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleUpdateRow(index, 'isHome', false)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                          !row.isHome ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        Uit
                      </button>
                    </div>
                  </div>

                  {/* Gathering Time */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Verzamelen
                    </label>
                    <input 
                      type="time" 
                      value={row.gatheringTime}
                      onChange={(e) => handleUpdateRow(index, 'gatheringTime', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Multiple Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5"
              >
                <Plus size={16} className="text-markiezaten-blue" />
                <span>Nog een wedstrijd toevoegen</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button 
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors"
              >
                Annuleren
              </button>

              <button 
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSubmitting || validMultiCount === 0}
                className="px-6 py-2.5 bg-markiezaten-blue hover:bg-blue-600 text-white rounded-xl text-sm font-black shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                <Check size={18} />
                <span>
                  {isSubmitting 
                    ? 'Bezig met opslaan...' 
                    : `Alle ${validMultiCount} Wedstrijden Opslaan`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Body 3: Smart Text / Schema Paste & Import */}
      {mode === 'paste' && (
        <div className="p-5 md:p-8 space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-4 rounded-2xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-markiezaten-blue text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Wand2 size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Slimme Wedstrijd Parser
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Plak een speelschema uit Excel, Voetbal.nl, WhatsApp of notities. De app herkent automatisch datum, tijd, tegenstander en locatie!
                </p>
              </div>
            </div>

            {/* Quick Demo Clickers */}
            <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
              <span className="text-[10px] font-bold text-slate-500">Test met voorbeeld:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('competition')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg shadow-sm"
              >
                Schema tabel
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('whatsapp')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg shadow-sm"
              >
                WhatsApp tekst
              </button>
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Plak hier je wedstrijdenlijst
              </label>
              {pastedText && (
                <button
                  type="button"
                  onClick={() => handlePasteChange('')}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-500"
                >
                  Wissen
                </button>
              )}
            </div>
            <textarea
              rows={5}
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="Voorbeeld:
12-09-2026 14:30 | RBC | Thuis | 13:45
19-09-2026 15:00 | MOC '17 | Uit | 13:30
Za 26 sep 14:30 vs Halsteren Thuis"
              className="w-full p-4 rounded-2xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue bg-slate-50/50"
            />
          </div>

          {/* Live Preview Table */}
          {parsedImportRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <Check size={14} className="text-emerald-600" />
                  <span>Herkende wedstrijden ({parsedImportRows.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={handleTransferParsedToRows}
                  className="text-xs font-bold text-markiezaten-blue hover:underline flex items-center space-x-1"
                >
                  <span>Bewerken in tabelmodus</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Tegenstander</th>
                      <th className="p-3">Datum & Tijd</th>
                      <th className="p-3">Locatie</th>
                      <th className="p-3">Verzamelen</th>
                      <th className="p-3 text-right">Actie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedImportRows.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-black text-slate-900">{item.opponent}</td>
                        <td className="p-3 text-slate-700">
                          {formatMatchDate(item.date)} om {formatMatchTime(item.date)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            item.isHome ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.isHome ? 'Thuis' : 'Uit'}
                          </span>
                        </td>
                        <td className="p-3 text-emerald-700 font-bold">{item.gatheringTime || '-'}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setParsedImportRows(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paste Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div>
              {parsedImportRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleTransferParsedToRows}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Rijen eerst finetunen in editor &rarr;
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button 
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors"
              >
                Annuleren
              </button>

              <button 
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSubmitting || parsedImportRows.length === 0}
                className="px-6 py-2.5 bg-markiezaten-blue hover:bg-blue-600 text-white rounded-xl text-sm font-black shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                <Check size={18} />
                <span>
                  {isSubmitting 
                    ? 'Bezig met importeren...' 
                    : `Direct ${parsedImportRows.length} Wedstrijden Opslaan`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
