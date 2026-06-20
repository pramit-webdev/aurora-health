import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export interface SessionContextValue {
  session: Session | null;
  initializing: boolean;
}

export const SessionContext = createContext<SessionContextValue>({
  session: null,
  initializing: true,
});

export const useSession = () => useContext(SessionContext);
