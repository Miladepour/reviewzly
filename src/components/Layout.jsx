import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Layout = () => {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);

  // Auto-healing logic: Auto-register business record if it's missing (for users who created an account prior to SQL execution)
  useEffect(() => {
    const initializeBusinessProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const userId = session.user.id;

        // Check if an entry exists for this user in the "businesses" table
        const { data, error } = await supabase
          .from('businesses')
          .select('id')
          .eq('id', userId)
          .single();

        if (error && error.code === 'PGRST116') {
          // 'PGRST116' is the exact Postgres error code meaning "no rows returned". 
          // This means they have an Auth token, but no business row! We must heal it.
          console.log("Healing missing Business Profile...");
          const { error: insertError } = await supabase
            .from('businesses')
            .insert([{ id: userId, name: session.user.email.split('@')[0] + "'s Agency" }]);
            
          if (insertError) {
            console.error("Failed to heal business profile:", insertError.message);
          }
        }
      } catch (err) {
        console.error("Critical error mapping session to business profile", err);
      } finally {
        setIsInitializing(false);
      }
    };

    if (supabase) {
      initializeBusinessProfile();
    } else {
      setIsInitializing(false);
    }
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    if (supabase) {
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  if (isInitializing) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Connecting secure backend...</div>;
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '0 1rem', marginBottom: '2.5rem' }}>
          {/* Logo */}
          <div style={{ width: 140 }}>
            <img src="/logo.png" alt="Reviewzly Logo" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        </div>

        <nav className="flex flex-col gap-1 sidebar-content">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
          </NavLink>
          <NavLink to="/dashboard/inbox" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            Inbox
          </NavLink>
          <NavLink to="/dashboard/campaigns" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Campaigns
          </NavLink>
          <NavLink to="/dashboard/clients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Clients Directory
          </NavLink>
          <NavLink to="/dashboard/reviews" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Reviews Analytics
          </NavLink>
          <NavLink to="/dashboard/integrations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            Integrations
          </NavLink>
          <NavLink to="/dashboard/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Platform Settings
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-2 pt-6">
          <button className="btn-primary" style={{ padding: '0.875rem', width: '100%', marginBottom: '1.5rem', justifyContent: 'center' }}>Upgrade Plan</button>
          
          <NavLink to="/dashboard/help" className={({ isActive }) => `nav-link mt-8 ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Help Center
          </NavLink>
          
          {/* FUNCTIONAL LOGOUT BUTTON */}
          <a href="#" onClick={handleLogout} className="nav-link" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout
          </a>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-wrapper">
        
        {/* Persistent Top Navbar across all views */}
        <div className="top-nav">
          <div className="flex items-center gap-6 flex-wrap" style={{ flex: 1 }}>
            <div className="search-pill">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Search everywhere..." />
            </div>
            <div className="top-tabs">
              <span className="top-tab active">Overview</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </button>
            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#2aa29b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              <img src="https://i.pravatar.cc/100?img=47" alt="User profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>

        {/* Page Content Rendered Here */}
        <Outlet />

        {/* Persistent Footer Area */}
        <div className="flex justify-between items-center mt-12 pt-8" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--on-surface-variant)', borderTop: '1px solid var(--surface-container-low)' }}>
          <div className="flex items-center gap-2">
            SYSTEM STATUS: OPTIMAL
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary-fixed)' }}></span>
          </div>
          <div className="flex gap-4">
            <span>V3.0.0-SUPABASE-RLS</span>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Layout;
