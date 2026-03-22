/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  LayoutDashboard, 
  BarChart3, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  Settings,
  Save,
  UserPlus,
  GripVertical,
  AlertTriangle,
  Share2,
  Download,
  Edit2,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  getDocFromServer,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorInfo: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { hasError, errorInfo } = this.state;
    if (hasError) {
      let details;
      try {
        details = JSON.parse(errorInfo || '{}');
      } catch (e) {
        details = { error: errorInfo };
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <AlertTriangle size={32} />
              <h2 className="text-xl font-black">Oeps! Er ging iets mis</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Er is een fout opgetreden bij het communiceren met de database. Probeer de pagina te verversen.
            </p>
            <div className="bg-red-50 p-4 rounded-xl mb-6 overflow-auto max-h-40">
              <p className="text-xs font-mono text-red-800 whitespace-pre-wrap">
                {details.error || 'Onbekende fout'}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-markiezaten-blue text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors"
            >
              Pagina Verversen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Types ---

type Formation = '4-4-2' | '4-3-3';

interface Player {
  id: string;
  name: string;
  season: string;
}

interface Match {
  id: string;
  date: string;
  opponent: string;
  isHome: boolean;
  gatheringTime: string;
  attendance: Record<string, boolean>; // playerId -> isPresent
  formation: Formation;
  lineup: Record<string, string>; // positionKey -> playerId
  season: string;
  score?: {
    home: number;
    away: number;
  };
  scorers?: string[]; // Array of player IDs, one entry per goal
}

type View = 'dashboard' | 'players' | 'matches' | 'match-detail' | 'reports';

// --- Constants ---

const FORMATIONS: Record<Formation, { name: string; positions: { key: string; label: string; x: number; y: number }[] }> = {
  '4-4-2': {
    name: '4-4-2',
    positions: [
      { key: 'gk', label: 'K', x: 50, y: 90 },
      { key: 'rb', label: 'RA', x: 85, y: 70 },
      { key: 'cb1', label: 'CV', x: 65, y: 75 },
      { key: 'cb2', label: 'CV', x: 35, y: 75 },
      { key: 'lb', label: 'LA', x: 15, y: 70 },
      { key: 'rm', label: 'RM', x: 85, y: 45 },
      { key: 'cm1', label: 'CM', x: 60, y: 50 },
      { key: 'cm2', label: 'CM', x: 40, y: 50 },
      { key: 'lm', label: 'LM', x: 15, y: 45 },
      { key: 'st1', label: 'SP', x: 60, y: 20 },
      { key: 'st2', label: 'SP', x: 40, y: 20 },
    ]
  },
  '4-3-3': {
    name: '4-3-3',
    positions: [
      { key: 'gk', label: 'K', x: 50, y: 90 },
      { key: 'rb', label: 'RA', x: 85, y: 70 },
      { key: 'cb1', label: 'CV', x: 65, y: 75 },
      { key: 'cb2', label: 'CV', x: 35, y: 75 },
      { key: 'lb', label: 'LA', x: 15, y: 70 },
      { key: 'cdm', label: 'VM', x: 50, y: 55 },
      { key: 'cm1', label: 'CM', x: 70, y: 45 },
      { key: 'cm2', label: 'CM', x: 30, y: 45 },
      { key: 'rw', label: 'RA', x: 80, y: 20 },
      { key: 'st', label: 'SP', x: 50, y: 15 },
      { key: 'lw', label: 'LA', x: 20, y: 20 },
    ]
  }
};

// --- DND Components ---

function DraggablePlayer({ player, isAssigned }: { player: Player; isAssigned: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: { player }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : undefined,
    opacity: isAssigned ? 0.5 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
        isAssigned 
          ? 'bg-slate-50 border-slate-100 text-slate-400' 
          : 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center space-x-2">
        <GripVertical size={14} className="text-slate-400" />
        <span className="font-medium text-sm">{player.name}</span>
      </div>
      {isAssigned && <CheckCircle2 size={16} className="text-emerald-500" />}
    </div>
  );
}

function PositionSelector({ 
  pos, 
  assignedPlayer, 
  presentPlayers,
  assignedPlayerIds,
  onAssign,
  onRemove 
}: { 
  pos: { key: string; label: string; x: number; y: number }; 
  assignedPlayer?: Player;
  presentPlayers: Player[];
  assignedPlayerIds: string[];
  onAssign: (posKey: string, playerId: string) => void;
  onRemove: (posKey: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: pos.key,
  });

  // Filter present players who are not already assigned to another position
  const availablePlayers = presentPlayers.filter(p => 
    !assignedPlayerIds.includes(p.id) || p.id === assignedPlayer?.id
  );

  return (
    <div 
      ref={setNodeRef}
      className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <div className="flex flex-col items-center">
        <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-lg transition-all relative ${
          isOver 
            ? 'bg-yellow-400 border-white scale-110' 
            : assignedPlayer 
              ? 'bg-markiezaten-blue border-white text-white' 
              : 'bg-white/20 border-white/40 text-white hover:bg-white/40'
        }`}>
          <select
            value={assignedPlayer?.id || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') onRemove(pos.key);
              else onAssign(pos.key, val);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            <option value="">-- {pos.label} --</option>
            {availablePlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {assignedPlayer ? (
            <span className="font-bold text-lg pointer-events-none">{assignedPlayer.name.charAt(0).toUpperCase()}</span>
          ) : (
            <span className="text-xs font-bold opacity-80 pointer-events-none">{pos.label}</span>
          )}
          
          {assignedPlayer && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(pos.key); }}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-20"
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
        {assignedPlayer && (
          <div className="mt-1 bg-black/60 text-white text-[10px] font-bold rounded px-1.5 py-0.5 max-w-[90px] truncate shadow-sm pointer-events-none">
            {assignedPlayer.name}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---

// --- Components ---

const TeamLogo = () => (
  <svg viewBox="0 0 300 350" className="w-full h-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00E5F2" />
        <stop offset="50%" stopColor="#00B4C4" />
        <stop offset="100%" stopColor="#001F2D" />
      </linearGradient>
    </defs>
    <path d="M150 10 L280 60 C280 200 240 300 150 340 C60 300 20 200 20 60 L150 10 Z" fill="url(#shieldGradient)" stroke="#001F2D" strokeWidth="12" />
    <path d="M150 22 L268 68 C268 195 230 288 150 328 C70 288 32 195 32 68 L150 22 Z" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
    <text x="150" y="100" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="Inter, sans-serif" letterSpacing="0.5">DE MARKIEZATEN</text>
    <g stroke="white" strokeWidth="8" strokeLinecap="round">
      <path d="M95 145 L115 165 M115 145 L95 165" />
      <path d="M185 145 L205 165 M205 145 L185 165" />
      <path d="M140 185 L160 205 M160 185 L140 205" />
    </g>
    <path d="M50 310 L110 240 L150 290 L200 190 L250 290 L280 260 L300 310" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
  </svg>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [view, setView] = useState<View>('dashboard');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [matchTab, setMatchTab] = useState<'future' | 'past'>('future');
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [currentSeason, setCurrentSeason] = useState('25/26');
  const SEASONS = ['24/25', '25/26', '26/27', '27/28'];
  
  const players = useMemo(() => 
    allPlayers.filter(p => p.season === currentSeason || !p.season), 
    [allPlayers, currentSeason]
  );

  const matches = useMemo(() => 
    allMatches.filter(m => m.season === currentSeason || !m.season), 
    [allMatches, currentSeason]
  );
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);
  
  const AUTHORIZED_EMAIL = 'kevindenhouting@gmail.com';
  const isAuthorized = user?.email === AUTHORIZED_EMAIL;

  const handleForceRefresh = async () => {
    console.log("🔄 Handmatige synchronisatie gestart - netwerk wordt hersteld...");
    setAllPlayers([]);
    setAllMatches([]);
    setIsDataLoading(true);
    setShowRetryButton(false);
    setLoadError(null);
    
    try {
      // Stap 1: Verbreek de huidige verbinding
      await disableNetwork(db);
      console.log("📡 Netwerk tijdelijk uitgeschakeld...");
      
      // Stap 2: Korte pauze om de browser de tijd te geven
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Stap 3: Herstel de verbinding
      await enableNetwork(db);
      console.log("🌐 Netwerk opnieuw geactiveerd");
      
      // Stap 4: Forceer een server-check
      await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
    } catch (e) {
      console.error("❌ Netwerk herstel mislukt:", e);
    }
    
    setRetryCount(prev => prev + 1);
  };

  // Auto-refresh when returning to the app if data is missing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && isAuthorized) {
        if (allPlayers.length === 0 && allMatches.length === 0 && !isDataLoading) {
          console.log("App visible and empty - auto-refreshing");
          handleForceRefresh();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isAuthorized, allPlayers.length, allMatches.length, isDataLoading]);
  
  // Auth and Firestore Listeners
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
        // Test connection
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
          if(error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration.");
          }
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || !isAuthorized) {
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);
    setLoadError(null);
    setShowRetryButton(false);
    let playersLoaded = false;
    let matchesLoaded = false;

    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isDataLoading) {
        console.warn("Data loading timed out");
        setShowRetryButton(true);
      }
    }, 5000);

    const checkLoaded = () => {
      if (playersLoaded && matchesLoaded) {
        setIsDataLoading(false);
        setShowRetryButton(false);
        clearTimeout(timeoutId);
      }
    };

    const qPlayers = query(collection(db, 'players'), orderBy('name'));
    const unsubscribePlayers = onSnapshot(qPlayers, (snapshot) => {
      const playersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Player[];
      setAllPlayers(playersList);
      playersLoaded = true;
      checkLoaded();
    }, (error) => {
      console.error("Players load error:", error);
      setLoadError("Fout bij laden spelers");
      playersLoaded = true;
      checkLoaded();
    });

    const qMatches = query(collection(db, 'matches'), orderBy('date'));
    const unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
      const matchesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[];
      setAllMatches(matchesList);
      matchesLoaded = true;
      checkLoaded();
    }, (error) => {
      console.error("Matches load error:", error);
      setLoadError("Fout bij laden wedstrijden");
      matchesLoaded = true;
      checkLoaded();
    });

    return () => {
      unsubscribePlayers();
      unsubscribeMatches();
      clearTimeout(timeoutId);
    };
  }, [user, isAuthorized, retryCount]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('dashboard');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // --- Handlers ---

  const addPlayer = async (name: string) => {
    if (!name.trim()) return;
    try {
      await addDoc(collection(db, 'players'), { 
        name,
        season: currentSeason 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'players');
    }
  };

  const updatePlayer = async (id: string, name: string) => {
    if (!name.trim()) return;
    try {
      await updateDoc(doc(db, 'players', id), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `players/${id}`);
    }
  };

  const removePlayer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'players', id));
      
      // Cleanup matches (this could be done with a cloud function, but doing it client-side for now)
      for (const match of matches) {
        let changed = false;
        const newAttendance = { ...match.attendance };
        if (id in newAttendance) {
          delete newAttendance[id];
          changed = true;
        }
        
        const newLineup = { ...match.lineup };
        Object.keys(newLineup).forEach(pos => {
          if (newLineup[pos] === id) {
            delete newLineup[pos];
            changed = true;
          }
        });

        if (changed) {
          await updateDoc(doc(db, 'matches', match.id), {
            attendance: newAttendance,
            lineup: newLineup
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${id}`);
    }
  };

  const addMatch = async (opponent: string, date: string, isHome: boolean, gatheringTime: string) => {
    if (!opponent.trim() || !date) return;
    try {
      await addDoc(collection(db, 'matches'), {
        opponent,
        date,
        isHome,
        gatheringTime,
        attendance: {},
        formation: '4-4-2',
        lineup: {},
        season: currentSeason
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    }
  };

  const deleteMatch = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'matches', id));
      if (selectedMatchId === id) setSelectedMatchId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${id}`);
    }
  };

  const updateMatch = async (updatedMatch: Match) => {
    try {
      const { id, ...data } = updatedMatch;
      await updateDoc(doc(db, 'matches', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${updatedMatch.id}`);
    }
  };

  const selectedMatch = useMemo(() => 
    allMatches.find(m => m.id === selectedMatchId), 
    [allMatches, selectedMatchId]
  );

  // --- Views ---

  const DashboardView = () => {
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
            className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <RefreshCw size={24} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900">Nog geen gegevens zichtbaar?</h3>
                <p className="text-blue-700 text-sm">Het kan zijn dat de verbinding nog wordt opgebouwd.</p>
              </div>
            </div>
            <button 
              onClick={handleForceRefresh}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95"
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
                    ? Math.round((pastMatches.reduce((acc, m) => acc + Object.values(m.attendance).filter(Boolean).length, 0) / (pastMatches.length * (players.length || 1))) * 100)
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
        <div className="p-4 border-bottom border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Komende Wedstrijden</h3>
          <button 
            onClick={() => setView('matches')}
            className="text-sm text-markiezaten-blue font-semibold hover:underline"
          >
            Alle bekijken
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
                      <span className={`text-[8px] font-black px-1 py-0.5 rounded uppercase ${Object.values(match.attendance).filter(Boolean).length >= 11 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {Object.values(match.attendance).filter(Boolean).length} Spelers
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
            Alle bekijken
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
                <div key={match.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setSelectedMatchId(match.id); setView('match-detail'); }}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                      isWin ? 'bg-emerald-100 text-emerald-600' :
                      isLoss ? 'bg-rose-100 text-rose-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {isWin ? 'W' : isLoss ? 'V' : 'G'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">vs {match.opponent}</p>
                        <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
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

  const PlayersView = () => {
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
              onKeyDown={(e) => e.key === 'Enter' && (addPlayer(newName), setNewName(''))}
            />
            <button 
              onClick={() => { addPlayer(newName); setNewName(''); }}
              className="bg-markiezaten-blue text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-blue-800 transition-colors shadow-sm active:scale-95"
            >
              <UserPlus size={18} />
              <span>Toevoegen</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-bottom border-slate-100 bg-slate-50/50 flex justify-between items-center">
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

  const MatchesView = () => {
    const [opponent, setOpponent] = useState('');
    const [date, setDate] = useState('');
    const [isHome, setIsHome] = useState(true);
    const [gatheringTime, setGatheringTime] = useState('');

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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">Wedstrijd Toevoegen</h3>
          <p className="text-xs text-slate-500 mb-4 -mt-3">Plan een nieuwe wedstrijd of voeg een gespeelde wedstrijd toe voor de administratie.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tegenstander</label>
              <input 
                type="text" 
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Naam tegenstander..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Datum & Tijd</label>
              <input 
                type="datetime-local" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thuis / Uit</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setIsHome(true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${isHome ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500'}`}
                >
                  Thuis
                </button>
                <button 
                  onClick={() => setIsHome(false)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!isHome ? 'bg-white text-markiezaten-blue shadow-sm' : 'text-slate-500'}`}
                >
                  Uit
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Verzameltijd</label>
              <input 
                type="time" 
                value={gatheringTime}
                onChange={(e) => setGatheringTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20 focus:border-markiezaten-blue"
              />
            </div>
          </div>
          <button 
            onClick={() => { addMatch(opponent, date, isHome, gatheringTime); setOpponent(''); setDate(''); setGatheringTime(''); }}
            className="w-full bg-markiezaten-blue text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-blue-800 transition-colors"
          >
            <Plus size={20} />
            <span>Wedstrijd Toevoegen</span>
          </button>
        </div>

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
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap ${Object.values(match.attendance).filter(Boolean).length >= 11 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {Object.values(match.attendance).filter(Boolean).length} Spelers
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
                    <div key={p.id} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${match.attendance[p.id] ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
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
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-markiezaten-blue hover:text-white transition-all"
                >
                  Beheren
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

  const MatchDetailView = () => {
    if (!selectedMatch) return null;

    const [isEditingGatheringTime, setIsEditingGatheringTime] = useState(false);
    const [tempGatheringTime, setTempGatheringTime] = useState(selectedMatch.gatheringTime);

    const presentPlayers = players.filter(p => selectedMatch.attendance[p.id]);
    const absentPlayers = players.filter(p => !selectedMatch.attendance[p.id]);

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      })
    );

    const toggleAttendance = (playerId: string) => {
      const newAttendance = { ...selectedMatch.attendance };
      newAttendance[playerId] = !newAttendance[playerId];
      
      const newLineup = { ...selectedMatch.lineup };
      if (!newAttendance[playerId]) {
        Object.keys(newLineup).forEach(pos => {
          if (newLineup[pos] === playerId) delete newLineup[pos];
        });
      }

      updateMatch({ ...selectedMatch, attendance: newAttendance, lineup: newLineup });
    };

    const assignPlayerToPosition = (posKey: string, playerId: string) => {
      const newLineup = { ...selectedMatch.lineup };
      
      // Remove player from any other position
      Object.keys(newLineup).forEach(key => {
        if (newLineup[key] === playerId) delete newLineup[key];
      });

      // Assign to new position
      newLineup[posKey] = playerId;
      updateMatch({ ...selectedMatch, lineup: newLineup });
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      
      if (over && active.id) {
        assignPlayerToPosition(over.id as string, active.id as string);
      }
    };

    const removePlayerFromLineup = (posKey: string) => {
      const newLineup = { ...selectedMatch.lineup };
      delete newLineup[posKey];
      updateMatch({ ...selectedMatch, lineup: newLineup });
    };

    const assignedPlayerIds = Object.values(selectedMatch.lineup);
    const shareRef = useRef<HTMLDivElement>(null);
    const lineupShareRef = useRef<HTMLDivElement>(null);
    const [isSharingLineup, setIsSharingLineup] = useState(false);

    const handleShare = async () => {
      if (!shareRef.current) return;
      try {
        const dataUrl = await toPng(shareRef.current, { 
          cacheBust: true, 
          backgroundColor: '#ffffff',
          pixelRatio: 2
        });
        
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `wedstrijd-vs-${selectedMatch.opponent}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Wedstrijd vs ${selectedMatch.opponent}`,
            text: `Komende wedstrijd tegen ${selectedMatch.opponent}!`,
          });
        } else {
          const link = document.createElement('a');
          link.download = `wedstrijd-vs-${selectedMatch.opponent}.png`;
          link.href = dataUrl;
          link.click();
        }
      } catch (err) {
        console.error('Error sharing match:', err);
      }
    };

    const handleShareLineup = async () => {
      if (!lineupShareRef.current) return;
      setIsSharingLineup(true);
      try {
        const dataUrl = await toPng(lineupShareRef.current, { 
          cacheBust: true, 
          backgroundColor: '#001F2D', // markiezaten-dark
          pixelRatio: 2
        });
        
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `opstelling-vs-${selectedMatch.opponent}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Opstelling vs ${selectedMatch.opponent}`,
            text: `De opstelling voor de wedstrijd tegen ${selectedMatch.opponent}!`,
          });
        } else {
          const link = document.createElement('a');
          link.download = `opstelling-vs-${selectedMatch.opponent}.png`;
          link.href = dataUrl;
          link.click();
        }
      } catch (err) {
        console.error('Error sharing lineup:', err);
      } finally {
        setIsSharingLineup(false);
      }
    };

    return (
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          {/* Hidden Share Card */}
          <div className="fixed -left-[9999px] top-0 pointer-events-none">
            <div 
              ref={shareRef}
              className="w-[400px] bg-white p-10 flex flex-col items-center text-center space-y-8"
            >
              <div className="w-24 h-24 bg-markiezaten-light rounded-3xl flex items-center justify-center text-markiezaten-blue mb-2 shadow-sm">
                <Calendar size={48} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black text-markiezaten-blue uppercase tracking-[0.2em]">Wedstrijd Informatie</p>
                <h2 className="text-4xl font-black text-slate-900 leading-tight">vs {selectedMatch.opponent}</h2>
              </div>
              
              <div className="w-full h-px bg-slate-100"></div>
              
              <div className="grid grid-cols-2 gap-y-10 gap-x-4 w-full">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Locatie</p>
                  <p className="text-lg font-bold text-slate-800">{selectedMatch.isHome ? 'Thuis' : 'Uit'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datum</p>
                  <p className="text-lg font-bold text-slate-800">
                    {new Date(selectedMatch.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aanvang</p>
                  <p className="text-lg font-bold text-slate-800">
                    {new Date(selectedMatch.date).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verzamelen</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {selectedMatch.gatheringTime || 'N.v.t.'}
                  </p>
                </div>
              </div>
              
              <div className="w-full h-px bg-slate-100 pt-4"></div>
              
              <div className="flex items-center space-x-2 opacity-40">
                <div className="w-6 h-6 bg-markiezaten-blue rounded flex items-center justify-center text-white text-[8px] font-black">M</div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Markiezaten Manager</p>
              </div>
            </div>
          </div>

          {/* Hidden Lineup Share Card */}
          <div className="fixed -left-[9999px] top-0 pointer-events-none">
            <div 
              ref={lineupShareRef}
              className="w-[450px] bg-markiezaten-dark p-10 flex flex-col items-center space-y-8"
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-20 h-20 mb-2">
                  <TeamLogo />
                </div>
                <h2 className="text-3xl font-black text-white leading-tight italic tracking-tight uppercase">DE OPSTELLING</h2>
                <p className="text-xl font-bold text-markiezaten-blue uppercase tracking-[0.2em]">vs {selectedMatch.opponent}</p>
              </div>
              
              <div className="relative aspect-[3/4] w-full pitch-bg rounded-3xl border-4 border-white/20 shadow-2xl overflow-hidden">
                {/* Field Markings */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-b-2 border-white/20"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-t-2 border-white/20"></div>
                <div className="absolute top-1/2 left-0 w-full h-px bg-white/20"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/20 rounded-full"></div>

                {/* Positions */}
                {FORMATIONS[selectedMatch.formation].positions.map(pos => {
                  const assignedPlayerId = selectedMatch.lineup[pos.key];
                  const player = players.find(p => p.id === assignedPlayerId);
                  
                  return (
                    <div 
                      key={pos.key}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center space-y-1"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-markiezaten-blue">
                        <span className="text-[10px] font-black text-markiezaten-blue">{pos.label}</span>
                      </div>
                      <div className="bg-markiezaten-dark/80 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                        <span className="text-[10px] font-black text-white uppercase truncate max-w-[80px]">
                          {player?.name || 'Vrij'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Substitutes */}
              <div className="w-full space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="h-px flex-1 bg-white/10"></div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wisselspelers</h4>
                  <div className="h-px flex-1 bg-white/10"></div>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {presentPlayers.filter(p => !assignedPlayerIds.includes(p.id)).map(p => (
                    <div key={p.id} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider">
                      {p.name}
                    </div>
                  ))}
                  {presentPlayers.filter(p => !assignedPlayerIds.includes(p.id)).length === 0 && (
                    <p className="text-[10px] text-slate-500 italic">Geen wissels</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 opacity-30 pt-4">
                <div className="w-5 h-5 bg-markiezaten-blue rounded flex items-center justify-center text-white text-[7px] font-black">M</div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Markiezaten Manager</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setView('matches')}
                className="p-2 -ml-2 text-sm font-bold text-slate-500 flex items-center space-x-1 hover:text-markiezaten-blue active:scale-95 transition-all"
              >
                <ChevronRight className="rotate-180" size={20} />
                <span>Terug</span>
              </button>
              <button 
                onClick={handleShare}
                className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-emerald-100 active:scale-95 transition-all shadow-sm"
              >
                <Share2 size={16} />
                <span className="hidden xs:inline">Delen als afbeelding</span>
                <span className="xs:hidden">Delen</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedMatch.isHome ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {selectedMatch.isHome ? 'Thuis' : 'Uit'}
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${presentPlayers.length >= 11 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {presentPlayers.length} Spelers
              </div>
              <div className="flex items-center space-x-2">
                {isEditingGatheringTime ? (
                  <div className="flex items-center space-x-1">
                    <input 
                      type="time"
                      value={tempGatheringTime}
                      onChange={(e) => setTempGatheringTime(e.target.value)}
                      className="px-2 py-0.5 text-[10px] font-bold border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-markiezaten-blue"
                      autoFocus
                    />
                    <button 
                      onClick={() => {
                        updateMatch({ ...selectedMatch, gatheringTime: tempGatheringTime });
                        setIsEditingGatheringTime(false);
                      }}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        setTempGatheringTime(selectedMatch.gatheringTime);
                        setIsEditingGatheringTime(false);
                      }}
                      className="p-1 text-slate-400 hover:bg-slate-50 rounded"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setTempGatheringTime(selectedMatch.gatheringTime);
                      setIsEditingGatheringTime(true);
                    }}
                    className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center space-x-1"
                  >
                    <span>Verz: {selectedMatch.gatheringTime || 'N.v.t.'}</span>
                    <Edit2 size={10} />
                  </button>
                )}
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attendance Column */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Aanwezigheid</h3>
                  <p className="text-[10px] text-slate-500 mt-1 italic">Vink spelers aan die aanwezig zijn</p>
                </div>
                <div className="p-4 space-y-2">
                  {players.map(p => {
                    const isPresent = !!selectedMatch.attendance[p.id];
                    return (
                      <div key={p.id} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                        <button 
                          onClick={() => toggleAttendance(p.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            isPresent 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : 'bg-white border-slate-200 text-transparent'
                          }`}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        
                        <div className="flex-1">
                          {isPresent ? (
                            <DraggablePlayer 
                              player={p} 
                              isAssigned={assignedPlayerIds.includes(p.id)} 
                            />
                          ) : (
                            <div className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50 text-slate-400">
                              <span className="text-sm font-medium">{p.name}</span>
                              <XCircle size={16} className="opacity-50" />
                            </div>
                          )}
                        </div>

                        {isPresent && (
                          <button 
                            onClick={() => toggleAttendance(p.id)}
                            className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Markeer als afwezig"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Match Result Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-6">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Wedstrijd Resultaat</h3>
                  <p className="text-[10px] text-slate-500 mt-1 italic">Vul de eindstand en doelpuntenmakers in</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-center space-x-8">
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thuis</span>
                      <input 
                        type="number" 
                        min="0"
                        value={selectedMatch.score?.home ?? ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          updateMatch({ 
                            ...selectedMatch, 
                            score: { 
                              home: isNaN(val) ? 0 : val, 
                              away: selectedMatch.score?.away ?? 0 
                            } 
                          });
                        }}
                        className="w-16 h-16 text-3xl font-black text-center bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-markiezaten-blue focus:ring-4 focus:ring-markiezaten-blue/10 transition-all"
                      />
                    </div>
                    <div className="text-2xl font-black text-slate-300 mt-6">-</div>
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uit</span>
                      <input 
                        type="number" 
                        min="0"
                        value={selectedMatch.score?.away ?? ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          updateMatch({ 
                            ...selectedMatch, 
                            score: { 
                              home: selectedMatch.score?.home ?? 0, 
                              away: isNaN(val) ? 0 : val 
                            } 
                          });
                        }}
                        className="w-16 h-16 text-3xl font-black text-center bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-markiezaten-blue focus:ring-4 focus:ring-markiezaten-blue/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doelpuntenmakers ({selectedMatch.scorers?.length || 0})</h4>
                      <button 
                        onClick={() => {
                          const newScorers = [...(selectedMatch.scorers || [])];
                          newScorers.push(''); // Add empty slot
                          updateMatch({ ...selectedMatch, scorers: newScorers });
                        }}
                        className="p-1 text-markiezaten-blue hover:bg-markiezaten-light rounded-lg transition-all"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {(selectedMatch.scorers || []).map((scorerId, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <select
                            value={scorerId}
                            onChange={(e) => {
                              const newScorers = [...(selectedMatch.scorers || [])];
                              newScorers[index] = e.target.value;
                              updateMatch({ ...selectedMatch, scorers: newScorers });
                            }}
                            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-markiezaten-blue/20"
                          >
                            <option value="">Selecteer speler...</option>
                            {presentPlayers.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => {
                              const newScorers = (selectedMatch.scorers || []).filter((_, i) => i !== index);
                              updateMatch({ ...selectedMatch, scorers: newScorers });
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {(selectedMatch.scorers || []).length === 0 && (
                        <p className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          Nog geen doelpunten geregistreerd
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lineup Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-bold text-slate-800">Opstelling ({selectedMatch.formation})</h3>
                    <button 
                      onClick={handleShareLineup}
                      disabled={isSharingLineup}
                      className="p-1.5 text-markiezaten-blue hover:bg-markiezaten-light rounded-lg transition-all active:scale-90 disabled:opacity-50"
                      title="Deel opstelling als afbeelding"
                    >
                      {isSharingLineup ? (
                        <div className="w-4 h-4 border-2 border-markiezaten-blue/20 border-t-markiezaten-blue rounded-full animate-spin"></div>
                      ) : (
                        <Share2 size={16} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 italic hidden sm:block">Klik op een positie of sleep een speler</p>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="relative aspect-[3/4] w-full max-w-[400px] mx-auto pitch-bg rounded-xl border-2 sm:border-4 border-white shadow-inner overflow-hidden">
                    {/* Field Markings */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-b-2 border-white/30"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-t-2 border-white/30"></div>
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white/30"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full"></div>

                    {/* Positions */}
                    {FORMATIONS[selectedMatch.formation].positions.map(pos => {
                      const assignedPlayerId = selectedMatch.lineup[pos.key];
                      const player = players.find(p => p.id === assignedPlayerId);
                      
                      return (
                        <React.Fragment key={pos.key}>
                          <PositionSelector 
                            pos={pos}
                            assignedPlayer={player}
                            presentPlayers={presentPlayers}
                            assignedPlayerIds={assignedPlayerIds}
                            onAssign={assignPlayerToPosition}
                            onRemove={removePlayerFromLineup}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Substitutes Section */}
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Wissels</h4>
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {presentPlayers.filter(p => !assignedPlayerIds.includes(p.id)).length} Spelers
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {presentPlayers.filter(p => !assignedPlayerIds.includes(p.id)).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Geen wissels beschikbaar</p>
                      ) : (
                        presentPlayers.filter(p => !assignedPlayerIds.includes(p.id)).map(p => (
                          <div key={p.id} className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center space-x-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                            <span>{p.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DndContext>
    );
  };

  const ReportsView = () => {
    const pastMatches = matches.filter(m => new Date(m.date) < new Date());
    const hallOfFameRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    
    const stats = players.map(player => {
      const totalMatches = pastMatches.length;
      const attendedMatches = pastMatches.filter(m => m.attendance[player.id]).length;
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
            <p className="text-sm font-bold text-emerald-600 truncate">
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
              <div className="absolute top-0 right-0 w-64 h-64 bg-markiezaten-blue/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
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
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 font-black text-lg shadow-inner group-hover/item:scale-110 transition-transform">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-black text-white group-hover/item:text-emerald-400 transition-colors">{player.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Performer</p>
                      </div>
                      <div className="ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Top Scorers Section */}
        {scorerStats.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Topscorers</h3>
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Seizoen {currentSeason}</span>
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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Seizoensoverzicht Opkomst</h3>
            <span className="bg-markiezaten-blue text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Seizoen {currentSeason}</span>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50">
                  <th className="px-6 py-4">Speler</th>
                  <th className="px-6 py-4">Aanwezig</th>
                  <th className="px-6 py-4">Totaal</th>
                  <th className="px-6 py-4">Percentage</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.map(stat => (
                  <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{stat.name}</td>
                    <td className="px-6 py-4 text-slate-600">{stat.attendedMatches}</td>
                    <td className="px-6 py-4 text-slate-600">{stat.totalMatches}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[100px]">
                          <div 
                            className={`h-full rounded-full ${stat.percentage > 80 ? 'bg-emerald-500' : stat.percentage > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${stat.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">{stat.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {stat.percentage > 80 ? (
                        <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-tight">Top</span>
                      ) : stat.percentage < 40 ? (
                        <span className="px-2 py-1 rounded-md bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-tight">Laag</span>
                      ) : (
                        <span className="px-2 py-1 rounded-md bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-tight">Gemiddeld</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {stats.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Geen data beschikbaar</div>
            ) : (
              stats.map(stat => (
                <div key={stat.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900">{stat.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {stat.attendedMatches} van de {stat.totalMatches} wedstrijden
                      </p>
                    </div>
                    {stat.percentage > 80 ? (
                      <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-tight">Top</span>
                    ) : stat.percentage < 40 ? (
                      <span className="px-2 py-1 rounded-md bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-tight">Laag</span>
                    ) : null}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>Opkomst</span>
                      <span>{stat.percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
                      <div 
                        className={`h-full rounded-full ${stat.percentage > 80 ? 'bg-emerald-500' : stat.percentage > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Layout ---

  if (isAuthLoading || (user && isAuthorized && isDataLoading)) {
    return (
      <div className="min-h-screen bg-markiezaten-dark flex items-center justify-center p-6">
        <div className="text-center max-w-xs w-full">
          <div className="w-16 h-16 border-4 border-white/20 border-t-markiezaten-blue rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white font-bold text-lg mb-2">Laden...</p>
          {loadError && <p className="text-red-400 text-sm mb-4">{loadError}</p>}
          
          {showRetryButton && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <p className="text-white/60 text-sm mb-4">De verbinding duurt langer dan normaal.</p>
              <button 
                onClick={handleForceRefresh}
                className="w-full bg-markiezaten-blue text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all"
              >
                Opnieuw proberen
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-markiezaten-dark flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6">
            <TeamLogo />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">MARKIEZATEN</h1>
          <p className="text-slate-500 mb-8">Log in om je team en wedstrijden te beheren.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full bg-white border-2 border-slate-100 py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span>Inloggen met Google</span>
          </button>
        </motion.div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-markiezaten-dark flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center text-white mb-6 mx-auto shadow-lg">
            <XCircle size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Toegang Geweigerd</h1>
          <p className="text-slate-500 mb-8">
            Sorry, je hebt geen toestemming om deze applicatie te gebruiken. 
            Alleen de beheerder heeft toegang.
          </p>
          <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest">Ingelogd als: {user.email}</p>
          
          <button 
            onClick={handleLogout}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            Uitloggen & Opnieuw Proberen
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar (Desktop) / Header (Mobile) */}
      <aside className="w-full md:w-64 bg-markiezaten-dark text-white flex-shrink-0 md:min-h-screen sticky top-0 z-50 md:relative">
        <div className="p-4 md:p-6 flex md:flex-col items-center md:items-stretch justify-between md:justify-start">
          <div className="flex items-center space-x-3 md:mb-8">
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
              <TeamLogo />
            </div>
            <div>
              <h1 className="font-black text-base md:text-lg leading-tight">MARKIEZATEN</h1>
              <p className="hidden md:block text-[10px] font-bold text-markiezaten-blue uppercase tracking-widest opacity-80">Team Manager</p>
            </div>
          </div>

          <div className="hidden md:block mb-6">
            <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-2 opacity-60">Seizoen</label>
            <select 
              value={currentSeason}
              onChange={(e) => setCurrentSeason(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all cursor-pointer"
            >
              {SEASONS.map(s => (
                <option key={s} value={s} className="text-slate-900">{s}</option>
              ))}
            </select>
          </div>

          <nav className="hidden md:block space-y-1">
            <NavItem 
              active={view === 'dashboard'} 
              onClick={() => setView('dashboard')} 
              icon={<LayoutDashboard size={20} />} 
              label="Overzicht" 
            />
            <NavItem 
              active={view === 'players'} 
              onClick={() => setView('players')} 
              icon={<Users size={20} />} 
              label="Spelers" 
            />
            <NavItem 
              active={view === 'matches' || view === 'match-detail'} 
              onClick={() => setView('matches')} 
              icon={<Calendar size={20} />} 
              label="Wedstrijden" 
            />
            <NavItem 
              active={view === 'reports'} 
              onClick={() => setView('reports')} 
              icon={<BarChart3 size={20} />} 
              label="Rapporten" 
            />
          </nav>

          <div className="md:hidden flex items-center space-x-3">
            <select 
              value={currentSeason}
              onChange={(e) => setCurrentSeason(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-[10px] font-black text-white focus:outline-none transition-all cursor-pointer"
            >
              {SEASONS.map(s => (
                <option key={s} value={s} className="text-slate-900">{s}</option>
              ))}
            </select>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
              <img src={user.photoURL || "https://picsum.photos/seed/manager/100/100"} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
        
        <div className="hidden md:block mt-auto p-6 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 text-blue-200 hover:text-white transition-colors w-full"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Settings size={16} />
            </div>
            <span className="text-xs font-bold">Uitloggen</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <MobileNavItem 
          active={view === 'dashboard'} 
          onClick={() => setView('dashboard')} 
          icon={<LayoutDashboard size={20} />} 
          label="Overzicht" 
        />
        <MobileNavItem 
          active={view === 'players'} 
          onClick={() => setView('players')} 
          icon={<Users size={20} />} 
          label="Spelers" 
        />
        <MobileNavItem 
          active={view === 'matches' || view === 'match-detail'} 
          onClick={() => setView('matches')} 
          icon={<Calendar size={20} />} 
          label="Wedstrijden" 
        />
        <MobileNavItem 
          active={view === 'reports'} 
          onClick={() => setView('reports')} 
          icon={<BarChart3 size={20} />} 
          label="Rapporten" 
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        <header className="mb-6 md:mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 capitalize">
              {view === 'match-detail' ? 'Wedstrijd Details' : 
               view === 'dashboard' ? 'Overzicht' : 
               view === 'players' ? 'Spelers' : 
               view === 'matches' ? 'Wedstrijden' : 
               view === 'reports' ? 'Rapporten' : view}
            </h2>
            <p className="text-slate-500 text-xs md:text-sm">Welkom terug, Leider</p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleForceRefresh}
              className="p-2 text-slate-400 hover:text-markiezaten-blue transition-colors rounded-full hover:bg-slate-100"
              title="Synchroniseer gegevens"
            >
              <RefreshCw size={20} className={isDataLoading ? "animate-spin" : ""} />
            </button>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{user.displayName || 'Team Leider'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                <img src={user.photoURL || "https://picsum.photos/seed/manager/100/100"} alt="Avatar" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="md:hidden p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Settings size={20} />
          </button>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'dashboard' && <DashboardView />}
            {view === 'players' && <PlayersView />}
            {view === 'matches' && <MatchesView />}
            {view === 'match-detail' && <MatchDetailView />}
            {view === 'reports' && <ReportsView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${active ? 'bg-white text-markiezaten-dark shadow-md' : 'text-markiezaten-light/70 hover:bg-white/10'}`}
    >
      {icon}
      <span>{label}</span>
      {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-markiezaten-blue" />}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center space-y-1 transition-all ${active ? 'text-markiezaten-blue' : 'text-slate-400'}`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-markiezaten-light' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}
