import React, { useState } from 'react';

const FAQ_DATA = {
  platform: [
    { 
      id: 'p1', 
      q: 'What does the Performance Velocity chart represent?', 
      a: 'The Performance Velocity chart on your Dashboard tracks your day-over-day SMS open rates and review captures. It allows you to visualize which days of the week are yielding the highest response rates from your clients.' 
    },
    { 
      id: 'p2', 
      q: 'How is the Global Avg. Rate calculated?', 
      a: 'The Global Average Rate is a lifetime metric that divides the total number of Review Requests sent by the total number of reviews (both 5-star Google redirects and 1-4 star internal feedback) you have successfully captured.' 
    },
    { 
      id: 'p3', 
      q: 'How do I edit my underlying Business Information?', 
      a: 'Navigate to "Platform Settings" in the sidebar. Under the "Core Workspace" tab, you can alter your Business Name, Google My Business URL, and Internal Recovery Alert Email at any time.' 
    }
  ],
  routing: [
    { 
      id: 'r1', 
      q: 'What exactly happens when a client selects 5-Stars?', 
      a: 'When a client taps the 5th star on your public link, they are instantly shown a celebratory message explaining how important Google Reviews are to your business. A massive button is presented that redirects them securely to the Google My Business URL you defined in your Settings.' 
    },
    { 
      id: 'r2', 
      q: 'What happens when a client selects 1 to 4 Stars?', 
      a: 'This is our "Smart Intercept". If a client taps 1, 2, 3, or 4 stars, they are never redirected to Google. Instead, an apology message is rendered alongside a private form asking for their Name, Phone, and text feedback. When they submit, this data is kept internally so your management team can resolve the issue privately.' 
    },
    { 
      id: 'r3', 
      q: 'How do I test my public link without sending an SMS?', 
      a: 'Go to Platform Settings > My Public Link. You will see your exact URL (e.g. /r/your-business-name). Click the "Preview Live Flow" button to interact with the mobile app logic from your desktop.' 
    }
  ],
  campaigns: [
    { 
      id: 'c1', 
      q: 'What is a Time-Delayed Trigger?', 
      a: 'When creating a new Campaign, a Time-Delayed Trigger creates an operational automation. For example, if you set the delay to "2 Hours", the system will automatically send your SMS template exactly 2 hours after a new client is added to the Directory.' 
    },
    { 
      id: 'c2', 
      q: 'What is an Instant Broadcast mass blast?', 
      a: 'An Instant Broadcast immediately queries your target audience (e.g. "All Un-reviewed Clients") and sends the SMS right now. Be careful: this will instantly consume your Voodoo SMS credits for every client reached.' 
    },
    { 
      id: 'c3', 
      q: 'Where do I find my Voodoo API Key?', 
      a: 'Log into your account at voodoosms.com. Navigate to Developers > API Keys. Generate a new key and paste it perfectly inside the "Integrations" tab here in Reviewzly.' 
    },
    { 
      id: 'c4', 
      q: 'How do I use Dynamic Tags like {{client_name}}?', 
      a: 'When designing an SMS payload in Campaigns or Settings, typing exactly {{client_name}} or {{business_name}} will force the system to inject the database variables automatically for each unique customer.' 
    }
  ],
  clients: [
    { 
      id: 'cl1', 
      q: 'How do I import a bulk list of previous clients?', 
      a: 'Currently, the system is designed for operational Quick Adds. You can tap the "Add New Client" button on the Dashboard or within the Clients Directory to input them manually. CSV Bulk importing logic is on the roadmap.' 
    },
    { 
      id: 'cl2', 
      q: 'What happens if I accidentally delete a client?', 
      a: 'Clicking the trashcan icon on a client record permanently removes them, along with their associated internal review data. There is no undo function, so proceed with caution.' 
    }
  ]
};

const AccordionItem = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.75rem', marginBottom: '1rem', overflow: 'hidden', backgroundColor: 'white', transition: 'all 0.2s' }}>
      <button 
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-title-md" style={{ color: isOpen ? 'var(--primary-dark)' : 'var(--on-surface)' }}>{item.q}</span>
        <svg 
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isOpen ? 'var(--primary)' : 'var(--on-surface-variant)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {/* Expandable Content Area */}
      <div style={{ maxHeight: isOpen ? '500px' : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}>
        <div style={{ padding: '0 1.5rem 1.25rem' }}>
          <p className="text-body" style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{item.a}</p>
        </div>
      </div>
    </div>
  );
};


const HelpCenter = () => {
  const [activeCategory, setActiveCategory] = useState('platform');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract the active data array
  const activeQuestions = FAQ_DATA[activeCategory];

  return (
    <div className="flex flex-col gap-8 flex-1">
      
      {/* Header & Global Search */}
      <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: 'var(--primary)', color: 'white', border: 'none', backgroundImage: 'radial-gradient(circle at top right, var(--primary-light), var(--primary-dark))' }}>
        <h1 className="text-display-xl mb-4" style={{ color: 'white' }}>How can we help?</h1>
        
        <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search for guides, SMS rules, or routing logic..." 
            style={{ width: '100%', padding: '1.25rem 1.25rem 1.25rem 3.5rem', borderRadius: '2rem', border: 'none', fontSize: '1.1rem', outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col md-flex-row gap-8 align-start">
        
        {/* Categories Sidebar */}
        <div className="card" style={{ padding: '1rem', flexShrink: 0, width: '250px' }}>
          <h3 className="text-label-sm mb-4" style={{ paddingLeft: '1rem' }}>KNOWLEDGE CATEGORIES</h3>
          
          <nav className="flex flex-col gap-1">
            <button 
              className={`nav-link ${activeCategory === 'platform' ? 'active' : ''}`} 
              onClick={() => setActiveCategory('platform')}
              style={{ justifyContent: 'flex-start', background: activeCategory === 'platform' ? 'var(--surface)' : 'none', border: 'none' }}
            >
              Platform Mastery
            </button>
            <button 
              className={`nav-link ${activeCategory === 'routing' ? 'active' : ''}`} 
              onClick={() => setActiveCategory('routing')}
              style={{ justifyContent: 'flex-start', background: activeCategory === 'routing' ? 'var(--surface)' : 'none', border: 'none' }}
            >
              Review Capture Logic
            </button>
            <button 
              className={`nav-link ${activeCategory === 'campaigns' ? 'active' : ''}`} 
              onClick={() => setActiveCategory('campaigns')}
              style={{ justifyContent: 'flex-start', background: activeCategory === 'campaigns' ? 'var(--surface)' : 'none', border: 'none' }}
            >
              SMS & Campaigns
            </button>
            <button 
              className={`nav-link ${activeCategory === 'clients' ? 'active' : ''}`} 
              onClick={() => setActiveCategory('clients')}
              style={{ justifyContent: 'flex-start', background: activeCategory === 'clients' ? 'var(--surface)' : 'none', border: 'none' }}
            >
              Client Management
            </button>
          </nav>
        </div>

        {/* FAQ Accordion Area */}
        <div className="flex-1">
          <div className="mb-6">
             <h2 className="text-display-xl" style={{ fontSize: '2rem' }}>
                {activeCategory === 'platform' && "Platform Mastery"}
                {activeCategory === 'routing' && "Review Capture Logic"}
                {activeCategory === 'campaigns' && "SMS & Campaigns"}
                {activeCategory === 'clients' && "Client Management"}
             </h2>
             <p className="text-body mt-2">Find detailed answers and technical explanations regarding this module.</p>
          </div>

          <div className="flex flex-col">
            {activeQuestions.map(item => (
              <AccordionItem key={item.id} item={item} />
            ))}
          </div>
          
          <div className="card mt-8" style={{ backgroundColor: 'var(--surface-container-lowest)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem' }}>
             <div>
               <h4 className="text-title-lg mb-1">Still need help?</h4>
               <p className="text-body" style={{ fontSize: '0.95rem' }}>Our engineering team is standing by to assist you.</p>
             </div>
             <button className="btn-primary" style={{ backgroundColor: 'black', color: 'white' }}>Contact Support</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HelpCenter;
