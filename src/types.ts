import { User } from 'firebase/auth';

export type Formation = '4-4-2' | '4-3-3';

export interface Player {
  id: string;
  name: string;
  season: string;
}

export interface Match {
  id: string;
  date: string;
  opponent: string;
  isHome: boolean;
  gatheringTime: string;
  attendance: Record<string, 'present' | 'absent' | 'unknown' | boolean>; // playerId -> status
  formation: Formation;
  lineup: Record<string, string>; // positionKey -> playerId
  season: string;
  score?: {
    home: number;
    away: number;
  };
  scorers?: string[]; // Array of player IDs, one entry per goal
}

export type View = 'dashboard' | 'players' | 'matches' | 'match-detail' | 'reports';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
