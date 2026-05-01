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
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Send verification email
      await sendEmailVerification(user);
      
      // Create user document in Firestore
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
      
      // Do NOT sign out - keep user authenticated
      // The user will need to verify email to access full features
      
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        // User exists but email not verified
        throw new Error('email_not_verified');
      }
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.message === 'email_not_verified') {
        throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
      }
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sendVerificationEmail = async () => {
    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
      } catch (error) {
        console.error('Send verification email error:', error);
        throw new Error('Failed to send verification email');
      }
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
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