import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [totalBusinesses, setTotalBusinesses] = useState(0);
  const [activeUsers, setActiveUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newAdminId, setNewAdminId] = useState('');
  const [adminActionStatus, setAdminActionStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    const verifyAndLoad = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return navigate('/login');

        // 1. Security Check
        const { data: adminCheck, error: adminErr } = await supabase
          .from('super_admins')
          .select('user_id')
          .eq('user_id', session.user.id)
          .single();

        if (adminErr || !adminCheck) {
          console.warn("Unauthorized access attempt to Super Admin panel.");
          return navigate('/dashboard'); // Boot them out instantly
        }

        // 2. Fetch Metrics
        const { count: bCount } = await supabase
          .from('businesses')
          .select('*', { count: 'exact', head: true });
        
        setTotalBusinesses(bCount || 0);

        // 3. Fetch Audit Logs
        const { data: logsData } = await supabase
          .from('admin_audit_logs')
          .select('*')
          .order('deleted_at', { ascending: false });

        if (logsData) setAuditLogs(logsData);
        
        // 4. Fetch Active Users (CRM)
        const { data: usersData, error: uErr } = await supabase
          .from('businesses')
          .select('id, name, business_phone, business_country, created_at')
          .order('created_at', { ascending: false });

        if (uErr) {
          console.error("Query Error on businesses:", uErr);
        }

        if (usersData) setActiveUsers(usersData);

      } catch (err) {
        console.error("Error loading Super Admin panel:", err);
      } finally {
        setLoading(false);
      }
    };

    verifyAndLoad();
  }, [navigate]);

  const handleGrantAdmin = async (e) => {
    e.preventDefault();
    setAdminActionStatus({ type: '', msg: '' });
    
    if (!newAdminId || newAdminId.length < 10) {
      return setAdminActionStatus({ type: 'error', msg: 'Please enter a valid UUID.' });
    }

    try {
      // Because this user is already verified via RLS as an admin, this insert will succeed.
      const { error } = await supabase
        .from('super_admins')
        .insert([{ user_id: newAdminId }]);

      if (error) {
        if (error.code === '23505') throw new Error("This user is already a Super Admin.");
        throw error;
      }
      
      setAdminActionStatus({ type: 'success', msg: 'Admin privileges securely granted!' });
      setNewAdminId('');
    } catch (err) {
      setAdminActionStatus({ type: 'error', msg: err.message });
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading secure panel...</div>;

  const filteredUsers = activeUsers.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.business_phone && u.business_phone.includes(searchQuery))
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-display-sm" style={{ color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          Super Admin Console
        </h1>
        <p className="text-body" style={{ color: 'var(--on-surface-variant)' }}>System-wide metrics and administrative controls.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* Metric Card */}
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Businesses</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)', margin: '0.5rem 0' }}>{totalBusinesses}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Total registered storefronts</p>
        </div>
        
        {/* Metric Card */}
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Churned Accounts</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ef4444', margin: '0.5rem 0' }}>{auditLogs.length}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Total complete account deletions</p>
        </div>
      </div>


      {/* Active Accounts (Support Directory) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="text-title-lg">Active Accounts Directory</h2>
          <div className="search-pill" style={{ width: '100%', maxWidth: '350px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search by name, email, or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
            />
          </div>
        </div>

        {activeUsers.length === 0 ? (
          <p style={{ color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No active businesses found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-container-low)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Business Name</th>
                  <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Support Email</th>
                  <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Contact Phone</th>
                  <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Country</th>
                  <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Registered On</th>
                  <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>User UUID</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--surface-container-low)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--on-surface)' }}>{user.name || 'Unnamed'}</td>
                    <td style={{ padding: '0.75rem' }}>Protected field</td>
                    <td style={{ padding: '0.75rem' }}>{user.business_phone || 'N/A'}</td>
                    <td style={{ padding: '0.75rem' }}>{user.business_country || 'N/A'}</td>
                    <td style={{ padding: '0.75rem' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>{user.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                No accounts match your search.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* Audit Log Table */}
        <div className="card">
          <h2 className="text-title-lg" style={{ marginBottom: '1.5rem' }}>Deletion Audit Logs (GDPR)</h2>
          {auditLogs.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No churn events recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--surface-container-low)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Original ID</th>
                    <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Metrics</th>
                    <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Registration</th>
                    <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Deleted On</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--surface-container-low)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.deleted_user_id.substring(0, 8)}...</td>
                      <td style={{ padding: '0.75rem' }}>
                        {log.metrics_snapshot?.total_reviews || 0} reviews, {log.metrics_snapshot?.total_clients || 0} clients
                      </td>
                      <td style={{ padding: '0.75rem' }}>{new Date(log.original_created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem', color: '#ef4444' }}>{new Date(log.deleted_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Admin Management Widget */}
        <div className="card" style={{ height: 'fit-content', backgroundColor: 'var(--surface-container-lowest)' }}>
          <h2 className="text-title-lg" style={{ marginBottom: '1rem' }}>Grant Admin Access</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
            Elevate a standard user to Super Admin by entering their exact User ID (UUID).
          </p>

          {adminActionStatus.msg && (
            <div style={{ 
              padding: '0.75rem', 
              borderRadius: '0.5rem', 
              marginBottom: '1rem', 
              fontSize: '0.85rem',
              backgroundColor: adminActionStatus.type === 'error' ? '#FEE2E2' : '#E8F5E9',
              color: adminActionStatus.type === 'error' ? '#B91C1C' : '#2e7d32'
            }}>
              {adminActionStatus.msg}
            </div>
          )}

          <form onSubmit={handleGrantAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Paste User UUID..." 
              value={newAdminId}
              onChange={(e) => setNewAdminId(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', width: '100%', fontSize: '0.9rem' }}
            />
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
              Confirm Elevation
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default SuperAdmin;
