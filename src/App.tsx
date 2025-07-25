import React, { useState, useEffect } from 'react';
import { blink } from './blink/client';
import HomePage from './components/HomePage';
import EnhancedManagerDashboard from './components/EnhancedManagerDashboard';
import EnhancedAgentDashboard from './components/EnhancedAgentDashboard';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  referral_code?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      setLoading(state.isLoading);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async (email: string, password: string, role: string) => {
    try {
      // In a real app, you'd validate credentials here
      // For demo purposes, we'll simulate login with the provided test accounts
      const userData = await blink.db.users.list({
        where: { email, role }
      });

      if (userData.length > 0) {
        setUser(userData[0]);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Show appropriate dashboard based on user role
  if (user) {
    if (user.role === 'manager') {
      return <EnhancedManagerDashboard onLogout={handleLogout} />;
    } else if (user.role === 'agent') {
      return <EnhancedAgentDashboard user={user} onLogout={handleLogout} />;
    }
  }

  // Show home page if not logged in
  return <HomePage onLogin={handleLogin} />;
}

export default App;