import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [country, setCountry] = useState('UK');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("CRITICAL: Supabase keys not found in .env file. Please add them.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isRegistering) {
        // VERIFICATION LAYER 1: Anti-Farming Database Scan
        const { data: phoneExists, error: phoneErr } = await supabase.rpc('check_phone_exists', { submitted_phone: contactPhone });
        if (phoneErr) {
          console.error("RPC Phone Check Error:", phoneErr);
          throw new Error("Unable to connect securely to the verification matrix.");
        }
        if (phoneExists) {
            throw new Error("This mobile number is already linked to an active agency. Limit is strictly 1 account per user.");
        }

        // VERIFICATION LAYER 2: Admin Gateway Code
        const { data: isValid, error: rpcError } = await supabase.rpc('verify_invite_code', { submitted_code: inviteCode });
        if (rpcError) {
          console.error("RPC Error:", rpcError);
          throw new Error("Unable to verify code with the server. Please try again.");
        }
        if (!isValid) {
           throw new Error("Invalid or missing Invite Code. Access denied.");
        }

        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              business_name: businessName,
              business_country: country,
              full_name: contactName,
              phone: contactPhone
            }
          }
        });
        if (error) throw error;
        setSuccessMsg('Success! Check your email to verify your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Upon success, redirect into the Dashboard Hub
        navigate('/dashboard');
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Branding Pane */}
      <div className="auth-left">
        <div style={{ zIndex: 10 }}>
           <h1 className="text-display-xl" style={{ color: 'var(--on-primary-container)', fontSize: '2.5rem', marginBottom: '1rem' }}>reviewzly.</h1>
           <p className="text-title-md" style={{ color: 'var(--on-primary-container)', opacity: 0.8, maxWidth: '400px' }}>
             Automate reviews, dominate local search, and manage your clients seamlessly.
           </p>
        </div>
        
        {/* Abstract Architectural Graphics */}
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', backgroundColor: 'var(--primary)', opacity: 0.1 }}></div>
        <div style={{ position: 'absolute', top: '20%', left: '-5%', width: '300px', height: '300px', borderRadius: '50%', backgroundColor: 'var(--primary-dark)', opacity: 0.05 }}></div>
      </div>

      {/* Right Login Pane */}
      <div className="auth-right">
        <div style={{ width: '100%', maxWidth: '420px' }}>
          
          <h2 className="text-display-xl" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{isRegistering ? 'Create your account' : 'Welcome back'}</h2>
          <p className="text-body" style={{ marginBottom: '2.5rem' }}>
            {isRegistering ? 'Start transforming your local SEO today.' : 'Please enter your details to access your dashboard.'}
          </p>

          {errorMsg && (
            <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #FCA5A5' }}>
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ backgroundColor: '#E8F5E9', color: '#2e7d32', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #c8e6c9' }}>
              <strong>Status:</strong> {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" 
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '1rem', fontFamily: 'inherit' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '1rem', fontFamily: 'inherit' }}
                required
              />
            </div>

            {isRegistering && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Business Info</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input type="text" placeholder="Business Name" value={businessName} onChange={e => setBusinessName(e.target.value)} style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }} required={isRegistering} />
                    <select value={country} onChange={e => setCountry(e.target.value)} style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', backgroundColor: '#fff', appearance: 'auto' }} required={isRegistering}>
                      <option value="UK">United Kingdom (UK)</option>
                      <option value="Canada">Canada</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Contact Person</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input type="text" placeholder="Full Name" value={contactName} onChange={e => setContactName(e.target.value)} style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }} required={isRegistering} />
                    <input type="tel" placeholder="Mobile Number" value={contactPhone} onChange={e => setContactPhone(e.target.value)} style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }} required={isRegistering} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>VIP Invite Code</label>
                  <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Enter secret code" style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }} required={isRegistering} />
                </div>
              </div>
            )}

            {!isRegistering && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                  <input type="checkbox" /> Remember me
                </label>
                <a href="#" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>Forgot password?</a>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Authenticating...' : (isRegistering ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
            {isRegistering ? 'Already have an account?' : 'Don\'t have an account?'}
            <button 
              onClick={() => setIsRegistering(!isRegistering)} 
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', marginLeft: '0.5rem', fontSize: '0.9rem' }}
            >
              {isRegistering ? 'Log in' : 'Sign up for free'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;
