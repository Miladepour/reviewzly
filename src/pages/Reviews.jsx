import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../contexts/ToastContext';

const Reviews = () => {
  const addToast = useToast();
  const [ratingFilter, setRatingFilter] = useState('All');
  
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Fetch all clients that have actually yielded a valid rating
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('business_id', session.user.id)
          .not('rating_status', 'is', null)
          .neq('rating_status', 'Pending')
          .order('created_at', { ascending: false });

        if (data) {
           const mappedReviews = data.map(c => {
               // Extract numeric rating from the string (e.g. "5-Star Google")
               const ratingNum = parseInt(c.rating_status.split('-')[0]) || 0;
               return {
                   id: c.id,
                   name: c.name,
                   date: c.created_at,
                   rating: ratingNum,
                   content: c.feedback || c.comment || c.feedback_text || c.notes || '',
                   source: c.rating_status.includes('Google') ? 'Google Redirect' : 'Internal Caught'
               }
           });
           setReviews(mappedReviews);
        }
      } catch (e) {
        addToast("Failed to fetch public reviews natively.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  // Distribution calculations
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1) : '0.0';
  
  const googleTotal = reviews.filter(r => r.source === 'Google Redirect').length;
  const internalTotal = totalReviews - googleTotal;

  const filteredReviews = reviews.filter(r => {
    if (ratingFilter === 'All') return true;
    if (ratingFilter === '5-Star') return r.rating === 5;
    if (ratingFilter === '1-4 Star') return r.rating < 5;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      
      <div>
        <h1 className="text-display-xl mb-1">Reviews Analytics</h1>
        <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
          Monitor your captured sentiment and Google conversion metrics.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex flex-col md-flex-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)' }}>
          <div style={{ padding: '2rem', borderRight: '1px solid var(--outline-variant)' }}>
            <p className="val-sub">Total Captures</p>
            <h2 className="text-display-xl mt-2" style={{ fontSize: '2.5rem' }}>{totalReviews}</h2>
          </div>
          <div style={{ padding: '2rem', borderRight: '1px solid var(--outline-variant)' }}>
            <p className="val-sub">Avg Star Rating</p>
            <div className="flex items-center gap-4 mt-2">
              <h2 className="text-display-xl" style={{ fontSize: '2.5rem' }}>{avgRating}</h2>
            </div>
          </div>
          <div style={{ padding: '2rem', backgroundColor: '#F9FAF9' }}>
            <p className="val-sub">Conversion Split</p>
            <div className="flex flex-col gap-2 mt-2">
               <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>• {googleTotal} Google Public Redirects</div>
               <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7a3a00' }}>• {internalTotal} Private Internal Saves</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="flex justify-between items-center" style={{ padding: '1.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
          <div className="flex gap-2">
            {['All', '5-Star', '1-4 Star'].map(filter => (
              <button 
                key={filter}
                onClick={() => setRatingFilter(filter)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: ratingFilter === filter ? 'var(--primary)' : 'transparent',
                  color: ratingFilter === filter ? 'white' : 'var(--on-surface-variant)',
                  border: ratingFilter === filter ? '1px solid var(--primary)' : '1px solid var(--outline-variant)',
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          <div className="flex flex-col gap-4">
            {isLoading ? <div>Loading feed from database...</div> : 
             filteredReviews.length > 0 ? filteredReviews.map(review => (
              <div key={review.id} style={{ 
                  padding: '1.25rem', 
                  borderRadius: '1rem', 
                  border: review.source === 'Google Redirect' ? '1px solid var(--outline-variant)' : '1px solid #ffdcc8',
                  backgroundColor: review.source === 'Google Redirect' ? 'white' : '#fff9f5' 
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-title-md">{review.name}</h4>
                    <p className="text-label-sm mt-1">{new Date(review.date).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-title-lg" style={{ color: review.source === 'Google Redirect' ? 'var(--primary)' : '#ff8c42', letterSpacing: '2px' }}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                    <span style={{ 
                      fontSize: '0.65rem', fontWeight: 700, marginTop: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '0.5rem', textTransform: 'uppercase',
                      backgroundColor: review.source === 'Google Redirect' ? '#E8F5E9' : '#ffdcc8',
                      color: review.source === 'Google Redirect' ? 'var(--primary)' : '#7a3a00'
                    }}>
                      {review.source}
                    </span>
                  </div>
                </div>
                
                {review.content && (
                  <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: review.source === 'Google Redirect' ? '#f5f5f5' : 'rgba(255, 140, 66, 0.1)', borderRadius: '0.5rem', color: 'var(--on-surface)', fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{review.content}"
                  </div>
                )}

              </div>
            )) : <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--on-surface-variant)' }}>No feedback matching criteria yet. Check back when campaigns are live!</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
