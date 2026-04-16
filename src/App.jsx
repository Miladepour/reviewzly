import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Inbox from './pages/Inbox';
import Clients from './pages/Clients';
import Reviews from './pages/Reviews';
import SmsHub from './pages/SmsHub';
import Settings from './pages/Settings';
import HelpCenter from './pages/HelpCenter';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import SuperAdmin from './pages/SuperAdmin';
import { supabase } from './supabaseClient';

// INTERCEPTOR: Walls off all /dashboard routes if no active Supabase Auth token is present
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase keys are missing, we bypass auth purely for local scaffolding demonstration
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Fetch current active session token
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth changes (Login, Logout, Token Expiration)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Authenticating...</div>;
  }

  // If no session exists AND Supabase is actually configured, aggressively redirect to Login
  if (!session && supabase) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the requested Dashboard route
  return children;
};

const App = () => {
  return (
    <Routes>
        
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* SECURE ROUTES: Wrapped in ProtectedRoute Interceptor */}
        <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Index Route inside Dashboard layout */}
          <Route index element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="clients" element={<Clients />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="sms" element={<SmsHub />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="help" element={<HelpCenter />} />
          <Route path="admin" element={<SuperAdmin />} />
        </Route>

        {/* Fallback Error Route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        
      </Routes>
  );
};

export default App;
