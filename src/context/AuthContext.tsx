'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setEmailVerified(user.emailVerified);
      } else {
        setEmailVerified(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshUser = async (): Promise<boolean> => {
    if (user) {
      try {
        await user.reload();
        const verified = user.emailVerified;
        setEmailVerified(verified);
        return verified;
      } catch (error) {
        console.error('Failed to reload user:', error);
        return false;
      }
    }
    return false;
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName });
    await sendEmailVerification(user);
    
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      settings: {
        theme: 'system',
        language: 'English',
        defaultSession: 'London',
        defaultRiskPercent: 1,
        defaultSetupGrade: 'B',
        autoCalculatePnL: true,
        showPartialCloses: true,
        shareAnalytics: true,
        showOnLeaderboard: false
      }
    });
    
    await signOut(auth);
  };

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error('email_not_verified');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const sendVerificationEmail = async () => {
    if (user && !user.emailVerified) {
      await sendEmailVerification(user);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      emailVerified,
      signUp, 
      signIn, 
      logout, 
      sendVerificationEmail,
      sendPasswordReset,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}