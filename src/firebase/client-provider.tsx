
'use client';

import React, { ReactNode, useMemo } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from './config';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const { app, auth, db } = useMemo(() => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    return { app, auth, db };
  }, []);

  return (
    <FirebaseProvider firebaseApp={app} auth={auth} firestore={db}>
      {children}
    </FirebaseProvider>
  );
}
