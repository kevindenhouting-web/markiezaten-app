import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Trophy, 
  Calendar, 
  LogIn, 
  LogOut, 
  Menu, 
  X,
  RefreshCw
} from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  disableNetwork,
  enableNetwork,
  getDocFromServer
} from 'firebase/firestore';

import { db, auth } from './firebase';
import { Player, Match, View, OperationType } from './types';
import { handleFirestoreError } from './utils/firebaseUtils';

// Components
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TeamLogo } from './components/common/TeamLogo';
import { NavItem, MobileNavItem } from './components/common/NavItems';
import { DashboardView } from './components/views/DashboardView';
import { PlayersView } from './components/views/PlayersView';
import { MatchesView } from './components/views/MatchesView';
import { MatchDetailView } from './components/views/MatchDetailView';
import { ReportsView } from './components/views/ReportsView';

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
  const [detailTab, setDetailTab] = useState<'attendance' | 'lineup' | 'result'>('attendance');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
      await disableNetwork(db);
      console.log("📡 Netwerk tijdelijk uitgeschakeld...");
      await new Promise(resolve => setTimeout(resolve, 500));
      await enableNetwork(db);
      console.log("🌐 Netwerk opnieuw geactiveerd");
      await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
    } catch (e) {
      console.error("❌ Netwerk herstel mislukt:", e);
    }
    
    setRetryCount(prev => prev + 1);
  };

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
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-markiezaten-dark flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-markiezaten-blue border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen bg-markiezaten-dark flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6">
            <TeamLogo />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 italic tracking-tight">MARKIEZATEN ADMIN</h1>
          <p className="text-slate-500 mb-8">Log in met je Google account om toegang te krijgen tot het dashboard.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center space-x-3 bg-markiezaten-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-markiezaten-dark transition-all shadow-lg shadow-markiezaten-blue/20"
          >
            <LogIn size={20} />
            <span>Login met Google</span>
          </button>
          
          {user && !isAuthorized && (
            <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-xs font-bold text-red-600">Geen toegang voor {user.email}. Neem contact op met de beheerder.</p>
              <button onClick={handleLogout} className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600">Uitloggen</button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-markiezaten-dark text-white flex-col p-6 fixed h-full">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="w-10 h-10 bg-white rounded-xl p-1 shadow-sm flex items-center justify-center">
            <TeamLogo />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter text-markiezaten-blue">MARKIEZATEN</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem active={view === 'players'} onClick={() => setView('players')} icon={<Users size={20} />} label="Spelers" />
          <NavItem active={view === 'matches' || view === 'match-detail'} onClick={() => setView('matches')} icon={<Calendar size={20} />} label="Wedstrijden" />
          <NavItem active={view === 'reports'} onClick={() => setView('reports')} icon={<Trophy size={20} />} label="Rapporten" />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
          <div className="px-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Huidig Seizoen</p>
            <select 
              value={currentSeason} 
              onChange={(e) => setCurrentSeason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-markiezaten-blue"
            >
              {SEASONS.map(s => <option key={s} value={s} className="bg-markiezaten-dark">Seizoen {s}</option>)}
            </select>
          </div>
          
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center space-x-3 overflow-hidden">
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-lg" />
              <div className="overflow-hidden">
                <p className="text-xs font-black truncate">{user.displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">Beheerder</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-markiezaten-dark text-white p-4 flex items-center justify-between sticky top-0 z-50 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-xl p-1 shadow-sm flex items-center justify-center">
            <TeamLogo />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter text-markiezaten-blue">MARKIEZATEN</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/10 rounded-xl">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-40 bg-markiezaten-dark pt-20 p-6 flex flex-col"
          >
            <div className="space-y-4 mb-8">
              <button 
                onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 p-4 rounded-2xl font-black ${view === 'dashboard' ? 'bg-markiezaten-blue text-white' : 'text-slate-400'}`}
              >
                <LayoutDashboard /> <span>Dashboard</span>
              </button>
              <button 
                onClick={() => { setView('players'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 p-4 rounded-2xl font-black ${view === 'players' ? 'bg-markiezaten-blue text-white' : 'text-slate-400'}`}
              >
                <Users /> <span>Spelers</span>
              </button>
              <button 
                onClick={() => { setView('matches'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 p-4 rounded-2xl font-black ${view === 'matches' ? 'bg-markiezaten-blue text-white' : 'text-slate-400'}`}
              >
                <Calendar /> <span>Wedstrijden</span>
              </button>
              <button 
                onClick={() => { setView('reports'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 p-4 rounded-2xl font-black ${view === 'reports' ? 'bg-markiezaten-blue text-white' : 'text-slate-400'}`}
              >
                <Trophy /> <span>Rapporten</span>
              </button>
            </div>

            <div className="mt-auto space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Seizoen Wisselen</p>
                <div className="grid grid-cols-2 gap-2">
                  {SEASONS.map(s => (
                    <button 
                      key={s} 
                      onClick={() => setCurrentSeason(s)}
                      className={`py-2 rounded-xl text-xs font-black ${currentSeason === s ? 'bg-white text-markiezaten-dark' : 'bg-white/5 text-slate-400'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-3 p-4 bg-red-500/10 text-red-500 rounded-2xl font-black">
                <LogOut size={20} /> <span>Uitloggen</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 p-4 md:p-10 pb-24 md:pb-10">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <DashboardView 
              key="dashboard"
              players={players}
              matches={matches}
              allPlayers={allPlayers}
              allMatches={allMatches}
              isDataLoading={isDataLoading}
              handleForceRefresh={handleForceRefresh}
              currentSeason={currentSeason}
              setView={setView}
              setSelectedMatchId={setSelectedMatchId}
              setMatchTab={setMatchTab}
            />
          )}
          {view === 'players' && (
            <PlayersView 
              key="players"
              players={players}
              currentSeason={currentSeason}
              addPlayer={addPlayer}
              updatePlayer={updatePlayer}
              removePlayer={removePlayer}
            />
          )}
          {view === 'matches' && (
            <MatchesView 
              key="matches"
              matches={matches}
              players={players}
              addMatch={addMatch}
              deleteMatch={deleteMatch}
              setSelectedMatchId={setSelectedMatchId}
              setView={setView}
              currentSeason={currentSeason}
              matchTab={matchTab}
              setMatchTab={setMatchTab}
            />
          )}
          {view === 'match-detail' && selectedMatch && (
            <MatchDetailView 
              key="match-detail"
              match={selectedMatch}
              players={players}
              detailTab={detailTab}
              setDetailTab={setDetailTab}
              onUpdateMatch={updateMatch}
              onBack={() => setView('matches')}
            />
          )}
          {view === 'reports' && (
            <ReportsView 
              key="reports"
              players={players}
              matches={matches}
              currentSeason={currentSeason}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center z-50">
        <MobileNavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={24} />} label="Home" />
        <MobileNavItem active={view === 'players'} onClick={() => setView('players')} icon={<Users size={24} />} label="Spelers" />
        <MobileNavItem active={view === 'matches' || view === 'match-detail'} onClick={() => setView('matches')} icon={<Calendar size={24} />} label="Wedstrijden" />
        <MobileNavItem active={view === 'reports'} onClick={() => setView('reports')} icon={<Trophy size={24} />} label="Stats" />
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
