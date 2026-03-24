import React from 'react';
import { motion } from 'motion/react';

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export function NavItem({ active, onClick, icon, label }: NavItemProps) {
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

export function MobileNavItem({ active, onClick, icon, label }: NavItemProps) {
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
