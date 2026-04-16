import React from 'react';
import { Link } from 'react-router-dom';
import PublicFooter from '../components/PublicFooter';
import PublicNavbar from '../components/PublicNavbar';

const Landing = () => {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--surface)', minHeight: '100vh' }}>
      
      <PublicNavbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center text-center justify-center relative" style={{ padding: '6rem 5%', overflow: 'hidden' }}>
        
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40%', height: '80%', background: 'radial-gradient(circle, var(--primary-container) 0%, transparent 70%)', opacity: 0.5, zIndex: 0, filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '30%', height: '60%', background: 'radial-gradient(circle, #ffdcc8 0%, transparent 70%)', opacity: 0.4, zIndex: 0, filter: 'blur(60px)' }}></div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '800px' }}>
          <div className="tag-light-green mb-6" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '2rem' }}>
             🚀 Stop Losing 5-Star Reviews
          </div>
          <h1 className="text-display-xl" style={{ fontSize: '4rem', lineHeight: 1.1, color: '#102A14', marginBottom: '1.5rem' }}>
            Capture 5-Star Reviews.<br/><span>Diffuse the Rest.</span>
          </h1>
          <p className="text-body mb-8" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            Reviewzly automates your feedback collection via Voodoo SMS. We instantly direct 5-star ratings to Google, and gently catch 1-4 star complaints internally for you to resolve.
          </p>
          
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/dashboard" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', textDecoration: 'none' }}>
              Start Your Free Trial
            </Link>
            <a href="#features" style={{ padding: '1rem 2rem', fontSize: '1.1rem', textDecoration: 'none', color: 'var(--on-surface-variant)', fontWeight: 600, border: '1px solid var(--outline-variant)', borderRadius: '0.5rem', backgroundColor: 'var(--surface-container-lowest)' }}>
              See How It Works
            </a>
          </div>
        </div>

        {/* Mockup Preview Graphic */}
        <div style={{ marginTop: '5rem', width: '100%', maxWidth: '1000px', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '1.5rem', padding: '1rem', boxShadow: 'var(--shadow-md)', position: 'relative', zIndex: 10 }}>
           <div style={{ backgroundColor: 'var(--surface-container-low)', height: '400px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundSize: 'cover', backgroundPosition: 'top center' }}>
             {/* Simple abstraction since we don't have a hero screenshot handy */}
             <div className="card" style={{ width: '300px', transform: 'scale(1.2)' }}>
                <h3 className="text-title-md mb-2">How was your visit?</h3>
                <div className="flex gap-2 justify-center text-title-lg" style={{ color: 'var(--outline-variant)' }}>
                  <span style={{color: 'var(--primary)', cursor: 'pointer'}}>★</span>
                  <span style={{color: 'var(--primary)', cursor: 'pointer'}}>★</span>
                  <span style={{color: 'var(--primary)', cursor: 'pointer'}}>★</span>
                  <span style={{color: 'var(--primary)', cursor: 'pointer'}}>★</span>
                  <span style={{color: 'var(--primary)', cursor: 'pointer'}}>★</span>
                </div>
                <button className="btn-primary mt-6 w-100" style={{ width: '100%', justifyContent: 'center' }}>Submit</button>
             </div>
           </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section id="features" style={{ padding: '6rem 5%', backgroundColor: 'var(--surface-container-lowest)' }}>
        <div className="text-center mb-12">
          <h2 className="text-display-xl mb-4" style={{ fontSize: '2.5rem' }}>Built for Operational Excellence</h2>
          <p className="text-body">Everything you need to safeguard your brand reputation automatically.</p>
        </div>

        <div className="flex flex-col md-flex-row gap-8" style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          <div className="card bg-soft">
            <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--primary-container)', color: 'var(--primary-dark)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path><path d="m9 12 2 2 4-4"></path></svg>
            </div>
            <h3 className="text-title-lg mb-2">Smart Sentiment Routing</h3>
            <p className="text-body" style={{ fontSize: '0.95rem' }}>If a client selects 5 stars, they are instantly redirected to your Google My Business page to post it publicly.</p>
          </div>

          <div className="card bg-soft">
            <div style={{ width: '48px', height: '48px', backgroundColor: '#ffdcc8', color: '#7a3a00', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h3 className="text-title-lg mb-2">Internal Recovery</h3>
            <p className="text-body" style={{ fontSize: '0.95rem' }}>Ratings 1-4 stars never see the public light. The feedback is captured internally so your team can resolve it privately.</p>
          </div>

          <div className="card bg-soft">
            <div style={{ width: '48px', height: '48px', backgroundColor: '#e2f0fe', color: '#1b64b1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h3 className="text-title-lg mb-2">Voodoo SMS Powered</h3>
            <p className="text-body" style={{ fontSize: '0.95rem' }}>Achieve massive open rates by dispatching review requests directly to customer phones via our seamless API integration.</p>
          </div>

        </div>
      </section>

      <PublicFooter />

    </div>
  );
};

export default Landing;
