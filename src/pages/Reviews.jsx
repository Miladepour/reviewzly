import React, { useState } from 'react';

// Extended mock reviews
const INITIAL_REVIEWS = [
  { id: 101, name: 'James Wilson', date: '2026-04-13T16:00:00Z', rating: 5, source: 'Google Redirect', text: 'Absolutely amazing service! The staff was incredibly welcoming and everything was pristine.' },
  { id: 102, name: 'Megan Clark', date: '2026-04-13T13:00:00Z', rating: 3, source: 'Internal Only', text: 'The experience was okay but the waiting times were too long today. Needs better scheduling.' },
  { id: 103, name: 'Alex Thompson', date: '2026-04-12T10:00:00Z', rating: 5, source: 'Google Redirect', text: 'Very highly recommended!' },
  { id: 104, name: 'Diana Prince', date: '2026-04-11T09:30:00Z', rating: 4, source: 'Internal Only', text: 'Great treatment but the parking situation is a bit tough.' },
  { id: 105, name: 'Bruce Wayne', date: '2026-04-10T14:20:00Z', rating: 5, source: 'Google Redirect', text: 'Efficient and professional. Exceeded expectations.' },
  { id: 106, name: 'Clark Kent', date: '2026-04-09T11:15:00Z', rating: 1, source: 'Internal Only', text: 'Completely unacceptable wait times. I left before being seen.' },
  { id: 107, name: 'Barry Allen', date: '2026-04-09T08:45:00Z', rating: 5, source: 'Google Redirect', text: 'Fastest service I have ever received.' }
];

const Reviews = () => {
  const [reviews] = useState(INITIAL_REVIEWS);
  const [ratingFilter, setRatingFilter] = useState('All');
  const [dateSort, setDateSort] = useState('newest');

  // Distribution calculations
  const totalReviews = reviews.length;
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => ratingCounts[r.rating]++);
  const averageRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1);

  // Filter and Sort
  let displayedReviews = [...reviews];
  
  if (ratingFilter !== 'All') {
    displayedReviews = displayedReviews.filter(r => r.rating === parseInt(ratingFilter));
  }

  displayedReviews.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getRelativeTime = (dateString) => {
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const elapsed = new Date() - new Date(dateString);

    if (elapsed < msPerHour) return Math.round(elapsed/msPerMinute) + ' mins ago';
    else if (elapsed < msPerDay ) return Math.round(elapsed/msPerHour ) + ' hours ago';
    else return Math.round(elapsed/msPerDay) + ' days ago';   
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header and Graphs */}
      <div>
        <h1 className="text-display-xl mb-6">Review Analytics</h1>
        
        <div className="flex flex-col md-flex-row gap-6">
          {/* Distribution Graph */}
          <div className="card flex-1">
            <h3 className="text-title-md mb-6">Rating Distribution</h3>
            <div className="flex flex-col gap-3">
              {[5, 4, 3, 2, 1].map(stars => {
                const count = ratingCounts[stars];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                const isPositive = stars === 5;
                return (
                  <div key={stars} className="flex items-center gap-4">
                    <span className="text-label-sm" style={{ width: '40px', fontSize: '0.75rem' }}>{stars}★</span>
                    <div className="progress-bar-bg" style={{ flex: 1, height: '10px', backgroundColor: 'var(--surface-container-low)' }}>
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${percentage}%`, 
                          backgroundColor: isPositive ? 'var(--primary)' : '#ff8c42',
                          transition: 'width 1s ease'
                        }}
                      ></div>
                    </div>
                    <span className="text-label-sm" style={{ width: '30px', textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aggregate Snapshot */}
          <div className="card" style={{ flex: '0 1 350px', backgroundColor: 'var(--surface-container-low)' }}>
            <h3 className="text-title-md mb-4">Overall Score</h3>
            <div className="flex flex-col justify-center items-center h-100 mt-4">
              <h2 className="text-display-xl" style={{ fontSize: '4rem', lineHeight: 1 }}>{averageRating}</h2>
              <div className="text-title-lg mb-2" style={{ color: 'var(--primary)', letterSpacing: '4px' }}>
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="text-body text-center" style={{ fontSize: '0.85rem' }}>
                Based on {totalReviews} lifetime reviews.<br/>Outstanding sentiment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div className="flex flex-col md-flex-row justify-between items-center gap-4">
          <h3 className="text-title-md">All Feedbacks ({displayedReviews.length})</h3>
          <div className="flex gap-4 w-100 md-w-auto" style={{ flexWrap: 'wrap' }}>
            <div className="flex items-center gap-2">
              <label className="text-label-sm">Rating:</label>
              <select 
                className="search-pill"
                style={{ borderRadius: '0.5rem', padding: '0.5rem 1rem', width: 'auto', border: '1px solid var(--outline-variant)' }}
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="All">All Ratings</option>
                <option value="5">5 Stars Only</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-label-sm">Sort:</label>
              <select 
                className="search-pill"
                style={{ borderRadius: '0.5rem', padding: '0.5rem 1rem', width: 'auto', border: '1px solid var(--outline-variant)' }}
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Review Feed */}
      <div className="flex flex-col gap-4">
        {displayedReviews.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
             <p className="text-label-sm">No reviews match your filter criteria.</p>
          </div>
        ) : (
          displayedReviews.map(review => (
            <div 
              key={review.id} 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                borderLeft: review.rating === 5 ? '4px solid var(--primary)' : '4px solid #ff8c42' 
              }}
            >
              <div className="flex flex-col md-flex-row justify-between items-start md-items-center mb-3 gap-2">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-title-lg" style={{ fontSize: '1.15rem' }}>{review.name}</h4>
                    {review.rating === 5 ? (
                       <span className="tag-light-green" style={{ fontSize: '0.6rem' }}>{review.source}</span>
                    ) : (
                       <span style={{ fontSize: '0.6rem', fontWeight: 700, backgroundColor: '#ffdcc8', color: '#7a3a00', padding: '0.2rem 0.5rem', borderRadius: '0.5rem', textTransform: 'uppercase' }}>{review.source}</span>
                    )}
                  </div>
                  <p className="text-label-sm" style={{ marginTop: '0.25rem', opacity: 0.7 }}>
                     {new Date(review.date).toLocaleDateString()} • {getRelativeTime(review.date)}
                  </p>
                </div>
                <div 
                  className="text-title-md" 
                  style={{ 
                    color: review.rating === 5 ? 'var(--primary)' : '#ff8c42',
                    letterSpacing: '2px',
                    fontSize: '1.25rem'
                  }}
                >
                  {renderStars(review.rating)}
                </div>
              </div>
              <p className="text-body" style={{ fontSize: '0.95rem' }}>
                "{review.text}"
              </p>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default Reviews;
