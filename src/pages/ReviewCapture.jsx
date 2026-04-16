import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ReviewCapture = () => {
  const { businessName: shortCode } = useParams();
  
  const [businessInfo, setBusinessInfo] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [step, setStep] = useState(0); // 0: Rate, 1A: Google Redirect, 1B: Internal Form, 2: Final Thanks

  // Form State for Internal Recovery
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!shortCode) return;
        
        // Lookup the specific client tracking code
        const { data, error } = await supabase
          .from('clients')
          .select('*, businesses(*)')
          .eq('short_code', shortCode)
          .single();

        if (data && !error && data.businesses) {
          setBusinessInfo(data.businesses);
          setClientInfo(data);
          // Pre-fill internal form for faster submission
          setName(data.name || '');
          setPhone(data.phone || '');
        }
      } catch (err) {
        console.error("Failed to load tracking profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [shortCode]);

  const handleRatingClick = async (selectedRating) => {
    setRating(selectedRating);
    setTimeout(async () => {
      if (selectedRating === 5) {
        setStep('1A'); // Google Flow
        if (businessInfo) {
           if (clientInfo) {
               // Execute the Secure Cloudflare Proxy to physically text them the Google Link
               fetch('/api/public_sms_reward', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ uid: clientInfo.id })
               }).then(r => r.json()).then(res => console.log(res)).catch(e => console.error(e));
           } else {
               // Untracked fallback dummy-ping
               supabase.from('clients').insert([{
                  business_id: businessInfo.id,
                  name: 'Anonymous 5-Star Intent',
                  phone: 'Unknown',
                  tags: ['Public Review Link'],
                  rating_status: '5-Star Redirect'
               }]).then(()=>{});
           }
        }
      } else {
        setStep('1B'); // Internal Flow
      }
    }, 400); 
  };

  const handleInternalSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        if (businessInfo) {
            // Save the captured lead directly into their CRM with the "Captured" flag
            await supabase.from('clients').insert([{
                business_id: businessInfo.id,
                name: name,
                phone: phone,
                tags: ['Internal Recovery'],
                rating_status: `${rating}-Star Captured`
            }]);
            
            // Log interaction timeline
            await supabase.from('communications').insert([{
                client_id: null, // Global notification
                business_id: businessInfo.id,
                type: 'INBOUND_SMS',
                text: `[RESTRICTED REVIEW CAUGHT] ${name} (${phone}) attempted to leave a ${rating}-Star review. Problem: "${feedback}"`,
                is_outbound: false
            }]);
        }
    } catch(err) {
        console.error("Save Error:", err);
    }
    
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(2); // Final Thank You
    }, 1000);
  };

  if (isLoading) {
      return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Review Portal...</div>;
  }

  if (!isLoading && !businessInfo) {
      return (
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
             <h2>Business Not Found</h2>
             <p style={{ opacity: 0.6 }}>The requested review link is inactive or invalid.</p>
          </div>
      )
  }

  return (
    <div style={{ backgroundColor: 'var(--surface-container-lowest)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      
      {/* Maximum width constraint to ensure it looks like a mobile app even on desktop */}
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem 2rem', textAlign: 'center', boxShadow: 'var(--shadow-md)', borderRadius: '1.5rem', backgroundColor: 'white' }}>
        
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: businessInfo?.brand_color || 'var(--surface-container-low)', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <span style={{ fontSize: '2rem', color: 'white', fontWeight: 700 }}>
             {businessInfo?.name ? businessInfo.name.charAt(0).toUpperCase() : '★'}
          </span>
        </div>

        {/* STEP 0: INITIAL RATING PAGE */}
        {step === 0 && (
          <div className="fade-in">
            <h1 className="text-display-xl mb-2" style={{ fontSize: '1.75rem', color: '#102A14' }}>How was your visit?</h1>
            <p className="text-body mb-8" style={{ fontSize: '1rem' }}>Please rate your recent experience at <strong>{businessInfo?.name || "our business"}</strong>.</p>
            
            <div className="flex justify-center gap-2 mb-4" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <svg 
                  key={star}
                  viewBox="0 0 24 24" 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fill: (hoverRating || rating) >= star ? (businessInfo?.brand_color || 'var(--primary)') : 'transparent',
                    stroke: (hoverRating || rating) >= star ? (businessInfo?.brand_color || 'var(--primary)') : 'var(--outline-variant)',
                    strokeWidth: 1.5,
                    transform: (hoverRating) === star ? 'scale(1.15)' : 'scale(1)'
                  }}
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => handleRatingClick(star)}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              ))}
            </div>
            
            {/* Dynamic text based on hover */}
            <p className="mt-6 text-label-sm" style={{ height: '20px', color: hoverRating === 5 ? (businessInfo?.brand_color || 'var(--primary)') : 'var(--on-surface-variant)', fontWeight: hoverRating === 5 ? 700 : 500 }}>
               {hoverRating === 5 && "Incredible! I'd recommend it."}
               {hoverRating === 4 && "Great, but room for improvement."}
               {hoverRating === 3 && "It was okay."}
               {hoverRating === 2 && "Not great."}
               {hoverRating === 1 && "Terrible experience."}
               {hoverRating === 0 && "Tap a star to rate"}
            </p>
          </div>
        )}

        {/* STEP 1A: 5-STAR GOOGLE ROUTE */}
        {step === '1A' && (
          <div className="fade-in">
            <div style={{ display: 'inline-flex', marginBottom: '1rem', color: businessInfo?.brand_color || 'var(--primary)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h1 className="text-display-xl mb-3" style={{ fontSize: '1.75rem', color: '#102A14' }}>Amazing!</h1>
            <p className="text-body mb-8" style={{ fontSize: '1.05rem', lineHeight: 1.5, textAlign: 'left', padding: '0 0.5rem' }}>
              We are so thrilled you had a 5-star experience! We rely heavily on <strong>Google Reviews</strong> to grow our local business.
              <br/><br/>
              <b>We have just sent you an SMS</b> containing our direct Google Link. It means the absolute world to us if you could post your rating there!
            </p>
            
            <button className="btn-primary" style={{ padding: '1.25rem 2rem', width: '100%', display: 'flex', justifyContent: 'center', fontSize: '1.1rem', marginBottom: '1rem', backgroundColor: businessInfo?.brand_color || 'var(--primary)', border: 'none' }} onClick={() => setStep(2)}>
              Close Window
            </button>
          </div>
        )}

        {/* STEP 1B: 1-4 STAR INTERNAL ROUTE */}
        {step === '1B' && (
          <div className="fade-in" style={{ textAlign: 'left' }}>
            <h1 className="text-display-xl mb-2" style={{ fontSize: '1.75rem', color: '#102A14' }}>We want to fix this.</h1>
            <p className="text-body mb-6" style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
              We strive for perfect service. We're very sorry we let you down. Please tell our management team what happened so we can make it right.
            </p>
            
            <form onSubmit={handleInternalSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm">Your Name*</label>
                <input type="text" required style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', width: '100%' }} value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-sm">Phone Number*</label>
                <input type="tel" required style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', width: '100%' }} value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-sm">What went wrong?</label>
                <textarea rows="4" required style={{ padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', width: '100%', resize: 'none' }} value={feedback} onChange={e => setFeedback(e.target.value)}></textarea>
              </div>
              
              <button type="submit" className="btn-primary" style={{ padding: '1rem', width: '100%', justifyContent: 'center', marginTop: '0.5rem', backgroundColor: '#e84545', border: 'none' }} disabled={isSubmitting}>
                {isSubmitting ? 'Sending securely...' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: COMPLETION */}
        {step === 2 && (
          <div className="fade-in">
             <div style={{ display: 'inline-flex', marginBottom: '1rem', color: businessInfo?.brand_color || 'var(--primary)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h1 className="text-display-xl mb-2" style={{ fontSize: '1.75rem', color: '#102A14' }}>Thank You!</h1>
             <p className="text-body" style={{ fontSize: '1.05rem', lineHeight: 1.5 }}>
              Your response has been securely recorded. Have a wonderful rest of your day!
            </p>
          </div>
        )}

      </div>
      
      <p className="text-label-sm mt-8" style={{ opacity: 0.5 }}>Powered securely by Reviewzly</p>
    </div>
  );
};

export default ReviewCapture;
