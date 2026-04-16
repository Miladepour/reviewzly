import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Personal Details
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');

  // Business Details
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCountry, setBusinessCountry] = useState('US');

  // Deletion State
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        // Fetch Auth User Context
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || '');
          setFullName(user.user_metadata?.full_name || '');
          setMobile(user.user_metadata?.phone || '');
          
          // Fetch Business Table Context
          const { data: business } = await supabase
            .from('businesses')
            .select('name, business_phone, business_address, business_country')
            .eq('id', user.id)
            .single();

          if (business) {
            setBusinessName(business.name || '');
            setBusinessPhone(business.business_phone || '');
            setBusinessAddress(business.business_address || '');
            setBusinessCountry(business.business_country || 'US');
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active user session");

      // 1. Update Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: mobile
        }
      });
      if (authError) throw authError;

      // 2. Update Business Profile
      const { error: bizError } = await supabase
        .from('businesses')
        .update({
          name: businessName,
          business_phone: businessPhone,
          business_address: businessAddress,
          business_country: businessCountry
        })
        .eq('id', user.id);
        
      if (bizError) throw bizError;

      setSaveMessage('Profile saved successfully.');
      setTimeout(() => setSaveMessage(''), 3000);
      
    } catch (err) {
      console.error(err);
      setSaveMessage('Error saving profile. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      // Execute the Secure RPC Function
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      
      // Clear local session and redirect
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error("Failed to delete account:", err);
      alert("Failed to delete account. Ensure the backend SQL script was executed.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 flex-1">
      <div>
        <h1 className="text-display-xl mb-1">Profile & Business Settings</h1>
        <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
          Manage your personal identity, company details, and GDPR compliance.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>


        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>Loading profile data...</div>
        ) : (
          <div style={{ padding: '2rem' }}>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Personal Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', margin: 0 }}>Personal Details</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Login Email</label>
                  <input 
                    type="email" 
                    value={email}
                    disabled
                    style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', outline: 'none', width: '100%', color: 'var(--on-surface-variant)', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Email cannot be changed directly.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Contact Person Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', backgroundColor: 'white' }}
                      placeholder="John Doe"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Personal Mobile</label>
                    <input 
                      type="tel" 
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', backgroundColor: 'white' }}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              {/* Business Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', margin: 0 }}>Business Details</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Business Name</label>
                  <input 
                    type="text" 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', backgroundColor: 'white' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Business Phone</label>
                    <input 
                      type="tel" 
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', backgroundColor: 'white' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Business Address</label>
                    <input 
                      type="text" 
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', backgroundColor: 'white' }}
                      placeholder="123 Main St, City, State"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Business Country</label>
                  <select 
                    value={businessCountry}
                    onChange={(e) => setBusinessCountry(e.target.value)}
                    style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', width: '100%', backgroundColor: 'white', fontFamily: 'inherit' }}
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="AE">United Arab Emirates</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>{saveMessage}</p>
                 <button 
                  type="submit" 
                  disabled={isSaving}
                  className="btn-primary" 
                  style={{ padding: '0.85rem 2rem', fontWeight: 700 }}
                 >
                   {isSaving ? 'Saving...' : 'Save Profile Changes'}
                 </button>
              </div>

            </form>

            {/* GDPR Danger Zone */}
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ffdcd6' }}>
               <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#d92d20', margin: '0 0 0.5rem 0' }}>Danger Zone</h3>
               <p style={{ fontSize: '0.85rem', color: '#7a2015', margin: '0 0 1rem 0' }}>Once you permanently delete your account, your workspaces, associated analytics, and active routing tools will be wiped from our systems instantly.</p>
               
               {!showDangerZone ? (
                 <button 
                   onClick={() => setShowDangerZone(true)}
                   style={{ backgroundColor: 'transparent', border: '1px solid #d92d20', color: '#d92d20', padding: '0.65rem 1.5rem', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}
                 >
                   Request Account Deletion
                 </button>
               ) : (
                 <div style={{ backgroundColor: '#fff4f3', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #ffb3aa' }}>
                   <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d92d20', margin: '0 0 0.75rem 0' }}>Type <strong>DELETE</strong> below to permanently erase your data.</p>
                   <div style={{ display: 'flex', gap: '1rem' }}>
                     <input 
                       type="text" 
                       value={deleteConfirmText}
                       onChange={(e) => setDeleteConfirmText(e.target.value)}
                       placeholder="DELETE"
                       style={{ flex: 1, padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #ffb3aa', outline: 'none' }}
                     />
                     <button 
                       onClick={handleDeleteAccount}
                       disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                       style={{ 
                         backgroundColor: deleteConfirmText === 'DELETE' ? '#d92d20' : '#ffb3aa', 
                         color: 'white', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '0.5rem', 
                         fontWeight: 700, cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                         transition: 'background-color 0.2s'
                       }}
                     >
                       {isDeleting ? 'Erasing...' : 'Confirm Wipe'}
                     </button>
                   </div>
                   <button 
                     onClick={() => { setShowDangerZone(false); setDeleteConfirmText(''); }}
                     style={{ background: 'none', border: 'none', color: '#7a2015', fontSize: '0.85rem', fontWeight: 600, marginTop: '1rem', cursor: 'pointer', textDecoration: 'underline' }}
                   >
                     Cancel
                   </button>
                 </div>
               )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
