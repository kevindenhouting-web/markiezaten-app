import { Formation } from './types';

export const FORMATIONS: Record<Formation, { name: string; positions: { key: string; label: string; x: number; y: number }[] }> = {
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
