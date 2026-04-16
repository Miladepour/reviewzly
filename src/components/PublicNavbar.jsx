import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const PublicNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <nav 
        className="flex justify-between items-center" 
        style={{ 
          padding: '1rem 5%', 
          borderBottom: '1px solid var(--outline-variant)', 
          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(10px)', 
          position: 'sticky', 
          top: 0, 
          zIndex: 100 
        }}
      >
        {/* Left Logo */}
        <Link to="/" style={{ width: '130px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Reviewzly Logo" style={{ width: '100%', height: 'auto' }} />
        </Link>
        
        {/* Desktop Links (Hidden on Mobile) */}
        <div className="desktop-nav-links flex items-center gap-6" style={{ display: 'none' }}>
          <a href="#features" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>Features</a>
          <a href="#" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>Pricing</a>
          <a href="#" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>Blog</a>
          <a href="#" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>Contact Us</a>
        </div>

        {/* Right CTA (Hidden on extremely small mobile, but usually kept) */}
        <div className="flex items-center gap-4">
          <Link to="/login" className="desktop-sign-in" style={{ color: 'var(--on-surface-variant)', fontWeight: 600, textDecoration: 'none', padding: '0.5rem 1rem', display: 'none' }}>
            Sign In
          </Link>
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            Get Started
          </Link>
          
          {/* Mobile Hamburger Toggle */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--on-surface)',
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem'
            }}
          >
            {isMobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu Layer */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-nav-dropdown"
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            right: 0,
            backgroundColor: 'var(--surface-container-lowest)',
            borderBottom: '1px solid var(--outline-variant)',
            zIndex: 99,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          <a href="#features" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', color: 'var(--on-surface)' }}>Features</a>
          <a href="#" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', color: 'var(--on-surface)' }}>Pricing</a>
          <a href="#" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', color: 'var(--on-surface)' }}>Blog</a>
          <a href="#" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', color: 'var(--on-surface)' }}>Contact Us</a>
          <div style={{ height: '1px', backgroundColor: 'var(--outline-variant)', margin: '0.5rem 0' }}></div>
          <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>Sign In Hub</Link>
        </div>
      )}

      {/* Injecting targeted inline CSS purely for this component's responsive logic */}
      <style>{`
        @media (min-width: 900px) {
          .desktop-nav-links { display: flex !important; }
          .desktop-sign-in { display: block !important; }
          .mobile-menu-btn { display: none !important; }
          .mobile-nav-dropdown { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default PublicNavbar;
