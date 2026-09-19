import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  MessageCircle, 
  Smartphone, 
  RefreshCw,
  Eye,
  Calendar,
  Clock,
  Users
} from 'lucide-react';
import { toBlob } from 'html-to-image';
import { Match } from '../../types';
import { TeamLogo } from '../common/TeamLogo';
import { calculateDefaultGatheringTime, formatMatchDate, formatMatchTime } from '../../utils/matchParser';
import { 
  generateMatchWhatsAppText, 
  openWhatsAppShare, 
  copyTextToClipboard, 
  shareFileOrText, 
  downloadBlob
} from '../../utils/shareUtils';

interface MatchShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
}

export const MatchShareModal: React.FC<MatchShareModalProps> = ({
  isOpen,
  onClose,
  match
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  const infoCardRef = useRef<HTMLDivElement>(null);

  // Generate image whenever modal is opened or match changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCopied(false);
    setShareStatus(null);

    const generateImage = async () => {
      setIsGenerating(true);
      setGeneratedBlob(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      // Small delay to ensure render tree is fully painted
      await new Promise(resolve => setTimeout(resolve, 350));

      const targetRef = infoCardRef.current;
      if (!targetRef || !isMounted) {
        setIsGenerating(false);
        return;
      }

      try {
        const blob = await toBlob(targetRef, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#001F2D',
        });

        if (blob && isMounted) {
          setGeneratedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate share image:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    generateImage();

    return () => {
      isMounted = false;
    };
  }, [isOpen, match]);

  // Clean up blob url on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const currentWhatsAppText = generateMatchWhatsAppText(match);
  const filename = `wedstrijd-info-vs-${match.opponent.toLowerCase().replace(/\s+/g, '-')}.png`;

  const handleNativeShare = async () => {
    if (!generatedBlob) return;

    const file = new File([generatedBlob], filename, { type: 'image/png' });
    const title = `Wedstrijdinfo vs ${match.opponent}`;

    const res = await shareFileOrText({
      title,
      text: currentWhatsAppText,
      file
    });

    if (res === 'shared') {
      setShareStatus('Succesvol gedeeld!');
      setTimeout(() => setShareStatus(null), 3000);
    } else if (res === 'unsupported') {
      setShareStatus('Delen via menu niet ondersteund op dit apparaat. Gebruik WhatsApp of download.');
      setTimeout(() => setShareStatus(null), 4000);
    }
  };

  const handleWhatsApp = () => {
    openWhatsAppShare(currentWhatsAppText);
  };

  const handleCopyText = async () => {
    const success = await copyTextToClipboard(currentWhatsAppText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    if (generatedBlob) {
      downloadBlob(generatedBlob, filename);
    }
  };

  const matchTitle = match.isHome 
    ? `Markiezaten vs ${match.opponent}` 
    : `${match.opponent} vs Markiezaten`;

  const effectiveGatheringTime = match.gatheringTime || calculateDefaultGatheringTime(match.date, match.isHome);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Offscreen dedicated capture container */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: '0', 
          width: '600px', 
          pointerEvents: 'none',
          opacity: 1,
          visibility: 'visible',
          zIndex: -9999
        }}
      >
        {/* Match Info Graphic Card for Attendance Polling */}
        <div 
          ref={infoCardRef} 
          className="w-[600px] bg-[#001F2D] p-10 text-white flex flex-col items-center text-center space-y-6 select-none"
          style={{
            background: 'radial-gradient(circle at top, #00374e 0%, #001F2D 85%)',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          {/* Club Header with Crest */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-20 h-20 bg-white rounded-3xl p-2 shadow-2xl flex items-center justify-center border-2 border-white/20">
              <TeamLogo />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-[0.25em] text-[#00E5F2] uppercase">VV DE MARKIEZATEN</p>
              <h2 className="text-3xl font-black italic tracking-tight uppercase leading-tight mt-1 text-white">
                {match.isHome ? 'Markiezaten' : match.opponent}
                <span className="text-[#00E5F2] mx-2">vs</span>
                {match.isHome ? match.opponent : 'Markiezaten'}
              </h2>
            </div>
          </div>

          {/* Home/Away Badge: simply Thuis or Uit */}
          <div>
            <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest ${
              match.isHome 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                : 'bg-[#00E5F2]/20 text-[#00E5F2] border border-[#00E5F2]/40'
            }`}>
              {match.isHome ? 'Thuis' : 'Uit'}
            </span>
          </div>

          {/* Match Details Grid: Datum, Aanvang, Verzamelen */}
          <div className="grid grid-cols-3 divide-x divide-white/10 w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-2 text-center">
            <div className="px-2 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                Datum
              </p>
              <p className="text-base font-black text-white">{formatMatchDate(match.date)}</p>
            </div>

            <div className="px-2 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                Aanvang
              </p>
              <p className="text-base font-black text-white">{formatMatchTime(match.date)} uur</p>
            </div>

            <div className="px-2 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Users size={13} className="text-slate-400" />
                Verzamelen
              </p>
              <p className="text-base font-black text-white">
                {effectiveGatheringTime ? `${effectiveGatheringTime} uur` : 'Nader te bepalen'}
              </p>
            </div>
          </div>

          {/* Watermark Footer */}
          <div className="pt-2 opacity-40">
            <p className="text-[9px] font-black uppercase tracking-[0.25em]">VV De Markiezaten • Team Manager</p>
          </div>
        </div>
      </div>

      {/* Main Modal Dialog */}
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-markiezaten-light rounded-2xl flex items-center justify-center text-markiezaten-blue">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">Wedstrijd Info Delen</h3>
              <p className="text-xs text-slate-500">
                {matchTitle} • {formatMatchDate(match.date)}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            aria-label="Sluiten"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Notification Toast if status exists */}
          {shareStatus && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <span>{shareStatus}</span>
              <button onClick={() => setShareStatus(null)} className="text-blue-500 hover:text-blue-700">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Image Preview Canvas */}
          <div className="relative bg-slate-900 rounded-2xl p-2 flex items-center justify-center min-h-[220px] max-h-[320px] overflow-hidden border border-slate-200 shadow-inner group">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center space-y-2 py-10 text-white">
                <RefreshCw size={24} className="animate-spin text-[#00E5F2]" />
                <p className="text-xs font-bold text-slate-300">Afbeelding genereren...</p>
              </div>
            ) : previewUrl ? (
              <>
                <img 
                  src={previewUrl} 
                  alt="Wedstrijd voorvertoning" 
                  className="max-h-[300px] w-auto object-contain rounded-xl shadow-lg transition-transform"
                />
                <button 
                  onClick={() => setShowFullImage(true)}
                  className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 backdrop-blur-sm transition-all"
                >
                  <Eye size={12} />
                  <span>Vergroot</span>
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Kan voorvertoning niet laden
              </div>
            )}
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
              <span className="font-bold text-slate-800">{match.isHome ? 'Thuis' : 'Uit'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aanvang</span>
              <span className="font-bold text-slate-800">{formatMatchTime(match.date)} uur</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verzamelen</span>
              <span className="font-bold text-slate-800">{effectiveGatheringTime ? `${effectiveGatheringTime} uur` : 'Nader te bepalen'}</span>
            </div>
          </div>

          {/* Mobile Press & Hold Tip */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex items-start space-x-2.5 text-amber-900">
            <Smartphone size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Mobiel delen of opslaan:</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Tik op <strong className="text-amber-950">Deel Afbeelding</strong> voor het mobiele deelsheet (WhatsApp, etc.), of <strong className="text-amber-950">houd de afbeelding ingedrukt</strong> om deze direct op te slaan in je fotorol.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* 1. Native Mobile Share Sheet */}
            <button 
              onClick={handleNativeShare}
              disabled={isGenerating || !generatedBlob}
              className="w-full bg-markiezaten-blue hover:bg-markiezaten-dark text-white p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-markiezaten-blue/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Share2 size={16} />
              <span>Deel Afbeelding</span>
            </button>

            {/* 2. Direct WhatsApp Text Sharing */}
            <button 
              onClick={handleWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
            >
              <MessageCircle size={16} />
              <span>Deel via WhatsApp</span>
            </button>

            {/* 3. Copy Text for WhatsApp */}
            <button 
              onClick={handleCopyText}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 p-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-emerald-700 font-black">Tekst Gekopieerd!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Kopieer WhatsApp Tekst</span>
                </>
              )}
            </button>

            {/* 4. Download Image */}
            <button 
              onClick={handleDownload}
              disabled={isGenerating || !generatedBlob}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 p-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Download size={16} />
              <span>Download Afbeelding</span>
            </button>
          </div>

          {/* Text Message Preview Dropdown / Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Voorbeeld WhatsApp-bericht:
            </p>
            <pre className="text-xs text-slate-700 font-sans whitespace-pre-wrap max-h-28 overflow-y-auto bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed">
              {currentWhatsAppText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-all"
          >
            Sluiten
          </button>
        </div>
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {showFullImage && previewUrl && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={previewUrl} 
              alt="Vergrootte weergave" 
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-4 flex items-center space-x-3">
              <button 
                onClick={handleNativeShare}
                className="bg-markiezaten-blue text-white px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 shadow-lg"
              >
                <Share2 size={14} />
                <span>Deel</span>
              </button>
              <button 
                onClick={handleDownload}
                className="bg-white/20 text-white hover:bg-white/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2"
              >
                <Download size={14} />
                <span>Download</span>
              </button>
              <button 
                onClick={() => setShowFullImage(false)}
                className="bg-white/20 text-white hover:bg-white/30 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
