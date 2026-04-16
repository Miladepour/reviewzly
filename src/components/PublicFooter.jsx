import React from 'react';
import { Link } from 'react-router-dom';

const PublicFooter = () => {
  return (
    <footer style={{ padding: '4rem 5% 2rem', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--outline-variant)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Main Footer Grid */}
        <div className="flex flex-col md-flex-row justify-between items-start gap-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
          
          {/* Brand Column */}
          <div style={{ maxWidth: '300px' }}>
            <Link to="/" style={{ display: 'inline-block', width: '130px', marginBottom: '1rem', textDecoration: 'none' }}>
              <img src="/logo.png" alt="Reviewzly Logo" style={{ width: '100%', height: 'auto' }} />
            </Link>
            <p className="text-body" style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Automating reputation management. We help businesses systematically capture 5-star Google reviews and resolve complaints internally.
            </p>
            <div className="flex gap-4">
              {/* Placeholder Social Icons */}
              <a href="#" style={{ color: 'var(--on-surface-variant)', transition: 'color 0.2s' }} aria-label="Twitter">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </a>
              <a href="#" style={{ color: 'var(--on-surface-variant)', transition: 'color 0.2s' }} aria-label="LinkedIn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="text-title-md mb-4" style={{ fontWeight: 800 }}>Platform</h4>
            <div className="flex flex-col gap-3">
              <Link to="/login" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s' }}>Features</Link>
              <Link to="/login" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s' }}>Pricing</Link>
              <Link to="/login" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s' }}>Dashboard Login</Link>
            </div>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="text-title-md mb-4" style={{ fontWeight: 800 }}>Legal & Support</h4>
            <div className="flex flex-col gap-3">
              <a href="#" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s' }}>Privacy Policy</a>
              <Link to="/terms" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s' }}>Terms & Conditions</Link>
              <a href="#" className="text-body hover:text-primary" style={{ textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s' }}>Contact Support</a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md-flex-row justify-between items-center gap-4" style={{ paddingTop: '2rem', borderTop: '1px solid var(--outline-variant)' }}>
          <p className="text-label-sm" style={{ opacity: 0.7, textTransform: 'none' }}>
            © {new Date().getFullYear()} Reviewzly Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-label-sm" style={{ opacity: 0.7, textTransform: 'none' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block' }}></span>
            All Systems Operational
          </div>
        </div>

      </div>
    </footer>
  );
};

export default PublicFooter;
