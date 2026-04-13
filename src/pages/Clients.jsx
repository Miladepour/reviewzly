import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('business_id', session.user.id)
          .order('created_at', { ascending: false });

        if (data) setClients(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client.phone.includes(searchQuery);
    
    // Status Filter parsing
    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Review Received') return matchesSearch && client.rating_status && client.rating_status !== 'Pending';
    if (statusFilter === 'Pending') return matchesSearch && (!client.rating_status || client.rating_status === 'Pending');
    
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6" style={{ height: '100%', minHeight: '80vh' }}>
      
      <div className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4">
        <div>
          <h1 className="text-display-xl mb-1">Clients Directory</h1>
          <p className="text-body" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>
            Live CRM connection established.
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
          + Import CSV
        </button>
      </div>

      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div className="flex flex-col md-flex-row justify-between gap-4" style={{ padding: '1.5rem', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '0.95rem' }}
            />
          </div>

          <div className="flex gap-2">
            {['All', 'Pending', 'Review Received'].map(status => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: statusFilter === status ? 'var(--primary)' : 'transparent',
                  color: statusFilter === status ? 'white' : 'var(--on-surface-variant)',
                  border: statusFilter === status ? '1px solid var(--primary)' : '1px solid var(--outline-variant)',
                  transition: 'all 0.2s'
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto styled-scrollbar" style={{ minHeight: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-container-low)', borderBottom: '1px solid var(--outline-variant)' }}>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>CLIENT NAME</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>PHONE NUMBER</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>ACQUISITION DATE</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>FEEDBACK STATUS</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>TAGS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Syncing with Postgres...</td></tr>
              ) : filteredClients.length > 0 ? filteredClients.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--outline-variant)', transition: 'background 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-container-lowest)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--on-surface)' }}>{c.name}</td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--on-surface-variant)' }}>{c.phone}</td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--on-surface-variant)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ 
                      padding: '0.35rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700,
                      backgroundColor: c.rating_status?.includes('5-Star') ? '#E8F5E9' : c.rating_status?.includes('Star') ? '#FFF3CD' : 'var(--surface-container-high)',
                      color: c.rating_status?.includes('5-Star') ? 'var(--primary)' : c.rating_status?.includes('Star') ? '#856404' : 'var(--on-surface-variant)'
                    }}>
                      {c.rating_status || 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                     {c.tags && c.tags.length > 0 ? c.tags.join(', ') : '-'}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>No clients found in the database. Use Quick Add or Inbox to add your first!</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Clients;
