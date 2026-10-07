import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from '../services/firebase';
import { db } from '../services/db';
import { User } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  currentAppUser: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);

      if (user) {
        // Sync or find existing user in Prospekt
        const existing = db.getUsers().find(u => u.email === user.email);
        if (!existing) {
          // Register new user from Google credentials
          db.insertUser({
            name: user.displayName || 'Google Kullanıcısı',
            email: user.email || 'google@prospekt.football',
            phone: user.phoneNumber || '',
            role_id: user.email === 'sfrkmrc1071@gmail.com' ? 1 : 2, // Admin if matches developer, else Scout
            avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
            bio: 'Google Hesabı ile doğrulanmış kullanıcı',
            status: 'active',
            club_name: 'Google Scout Ağı',
            membership_tier: user.email === 'sfrkmrc1071@gmail.com' ? 'pro_scout' : 'standard',
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('Google Sign-in failed', e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      await logOut();
    } catch (e) {
      console.error('Logout failed', e);
      throw e;
    }
  };

  const currentAppUser = db.getCurrentUser();

  return (
    <AuthContext.Provider value={{ firebaseUser, loading, loginWithGoogle, logout, currentAppUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
