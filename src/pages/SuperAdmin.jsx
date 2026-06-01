import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useToast } from '../contexts/ToastContext';

const PlanBadge = ({ plan }) => {
  const colors = {
    'Starter Spark':    { bg: '#e8f5e9', color: '#2e7d32' },
    'Growth Rocket':    { bg: '#e3f2fd', color: '#1565c0' },
    'Enterprise Titan': { bg: '#f3e5f5', color: '#6a1b9a' },
  };
  const style = colors[plan] || { bg: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' };
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700, backgroundColor: style.bg, color: style.color }}>
      {plan || 'No Plan'}
    </span>
  );
};

const SuperAdmin = () => {
  const navigate = useNavigate();
  const addToast = useToast();
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [totalBusinesses, setTotalBusinesses] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [voodooBalance, setVoodooBalance] = useState(null);
  const [voodooLoading, setVoodooLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [expandedTab, setExpandedTab] = useState('profile'); // 'profile' | 'clients'
  const [businessClients, setBusinessClients] = useState([]);
  const [businessActivity, setBusinessActivity] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const [newAdminId, setNewAdminId] = useState('');
  const [adminActionStatus, setAdminActionStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    const verifyAndLoad = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return navigate('/login');

        // Security check
        const { data: adminCheck, error: adminErr } = await supabase
          .from('super_admins')
          .select('user_id')
          .eq('user_id', session.user.id)
          .single();

        if (adminErr || !adminCheck) {
          addToast("Unauthorized access attempt to Super Admin panel tracked.", "warning");
          return navigate('/dashboard');
        }

        // Fetch metrics in parallel
        const [
          { count: bCount },
          { count: cCount },
          { data: logsData },
          { data: usersData },
          { data: cancelData },
        ] = await Promise.all([
          supabase.from('businesses').select('*', { count: 'exact', head: true }),
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('admin_audit_logs').select('*').order('deleted_at', { ascending: false }),
          supabase.from('businesses')
            .select('id, name, business_phone, business_country, created_at, sms_credits, active_plan, stripe_subscription_id, stripe_customer_id, recovery_email, sms_sender_id, voodoo_sender_id, gmb_url, google_rating, google_reviews_count, brand_color, follow_up_days, invite_sms')
            .order('created_at', { ascending: false }),
          supabase.from('cancellation_feedback').select('*').order('canceled_at', { ascending: false }),
        ]);

        setTotalBusinesses(bCount || 0);
        setTotalClients(cCount || 0);
        if (logsData) setAuditLogs(logsData);
        if (usersData) setActiveUsers(usersData);
        if (cancelData) setCancellations(cancelData);

        // Voodoo balance — separate async so it doesn't block the rest of the UI
        fetch('/api/admin_voodoo_balance', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then(r => r.json())
          .then(d => setVoodooBalance(d?.credits ?? null))
          .catch(() => setVoodooBalance(null))
          .finally(() => setVoodooLoading(false));

      } catch {
        addToast("Error loading Super Admin panel.", "error");
      } finally {
        setLoading(false);
      }
    };

    verifyAndLoad();
  }, [navigate]);

  const handleSelectBusiness = async (biz) => {
    if (selectedBusiness?.id === biz.id) {
      setSelectedBusiness(null);
      setBusinessClients([]);
      setBusinessActivity([]);
      return;
    }
    setSelectedBusiness(biz);
    setExpandedTab('profile');
    setBusinessClients([]);
    setBusinessActivity([]);
    setClientsLoading(true);
    const [{ data: clientData }, { data: activityData }] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, phone, email, dob, tags, drip_step, is_unsubscribed, next_action_time, short_code, created_at')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('communications')
        .select('id, type, text, is_outbound, created_at')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    setBusinessClients(clientData || []);
    setBusinessActivity(activityData || []);
    setClientsLoading(false);
  };

  const handleGrantAdmin = async (e) => {
    e.preventDefault();
    setAdminActionStatus({ type: '', msg: '' });
    if (!newAdminId || newAdminId.length < 10) {
      return setAdminActionStatus({ type: 'error', msg: 'Please enter a valid UUID.' });
    }
    try {
      const { error } = await supabase.from('super_admins').insert([{ user_id: newAdminId }]);
      if (error) {
        if (error.code === '23505') throw new Error("This user is already a Super Admin.");
        throw error;
      }
      setAdminActionStatus({ type: 'success', msg: 'Admin privileges granted!' });
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

  const totalPlatformCredits = activeUsers.reduce((sum, u) => sum + (u.sms_credits || 0), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-display-sm" style={{ color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          Super Admin Console
        </h1>
        <p className="text-body" style={{ color: 'var(--on-surface-variant)' }}>System-wide metrics and administrative controls.</p>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Businesses</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)', margin: '0.5rem 0' }}>{totalBusinesses}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Registered storefronts</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Churned Accounts</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ef4444', margin: '0.5rem 0' }}>{auditLogs.length}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Total account deletions</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Clients</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#92400e', margin: '0.5rem 0' }}>{totalClients}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Across all businesses</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform Invites</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#164e63', margin: '0.5rem 0' }}>{totalPlatformCredits}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Total invites held by users</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voodoo Account Balance</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4c1d95', margin: '0.5rem 0' }}>
            {voodooLoading ? '...' : (voodooBalance !== null ? voodooBalance : 'N/A')}
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Credits remaining on Voodoo</p>
        </div>
      </div>

      {/* Active Accounts Directory */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="text-title-lg">Active Accounts Directory</h2>
          <div className="search-pill" style={{ width: '100%', maxWidth: '350px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-container-low)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Business Name</th>
                <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Plan</th>
                <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Invites</th>
                <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Phone</th>
                <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Country</th>
                <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Registered</th>
                <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Clients</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>No accounts match your search.</td></tr>
              ) : filteredUsers.map(user => {
                const isSelected = selectedBusiness?.id === user.id;
                const lowCredits = (user.sms_credits || 0) < 10;
                return (
                  <React.Fragment key={user.id}>
                    <tr
                      onClick={() => handleSelectBusiness(user)}
                      style={{
                        borderBottom: isSelected ? 'none' : '1px solid var(--surface-container-low)',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'var(--surface-container-lowest)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-container-low)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        <span style={{ marginRight: '0.4rem' }}>{isSelected ? '▾' : '▸'}</span>
                        {user.name || 'Unnamed'}
                      </td>
                      <td style={{ padding: '0.75rem' }}><PlanBadge plan={user.active_plan} /></td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: lowCredits ? '#ef4444' : 'var(--on-surface)' }}>
                        {user.sms_credits ?? 0}
                        {lowCredits && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.1rem 0.4rem', borderRadius: '2rem' }}>Low</span>}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{user.business_phone || 'N/A'}</td>
                      <td style={{ padding: '0.75rem' }}>{user.business_country || 'N/A'}</td>
                      <td style={{ padding: '0.75rem' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                          {isSelected ? 'Hide' : 'View'}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded business card */}
                    {isSelected && (
                      <tr style={{ borderBottom: '2px solid var(--primary)' }}>
                        <td colSpan="7" style={{ padding: '0', backgroundColor: 'var(--surface-container-lowest)' }}>

                          {/* Tab bar */}
                          <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            {['profile', 'clients', 'activity'].map(tab => (
                              <button key={tab} onClick={() => setExpandedTab(tab)} style={{
                                padding: '0.6rem 1.2rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize',
                                backgroundColor: expandedTab === tab ? 'white' : 'transparent',
                                color: expandedTab === tab ? 'var(--primary-dark)' : 'var(--on-surface-variant)',
                                borderBottom: expandedTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                              }}>
                                {tab === 'clients' ? `Clients (${clientsLoading ? '…' : businessClients.length})` : tab === 'activity' ? `Activity (${clientsLoading ? '…' : businessActivity.length})` : 'Profile'}
                              </button>
                            ))}
                          </div>

                          <div style={{ padding: '1.25rem 1.5rem' }}>
                            {clientsLoading ? (
                              <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Loading…</p>
                            ) : expandedTab === 'profile' ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                {[
                                  { label: 'Contact Email', value: user.recovery_email || '—' },
                                  { label: 'Phone', value: user.business_phone || '—' },
                                  { label: 'Country', value: user.business_country || '—' },
                                  { label: 'SMS Sender ID', value: user.sms_sender_id || user.voodoo_sender_id || 'Reviewzly (default)' },
                                  { label: 'Active Plan', value: user.active_plan || 'None' },
                                  { label: 'SMS Credits', value: user.sms_credits ?? 0 },
                                  { label: 'Google Rating', value: user.google_rating ? `${user.google_rating} ★ (${user.google_reviews_count || 0} reviews)` : '—' },
                                  { label: 'GMB URL', value: user.gmb_url ? <a href={user.gmb_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>View</a> : '—' },
                                  { label: 'Stripe Customer', value: user.stripe_customer_id ? `${user.stripe_customer_id.substring(0, 14)}…` : '—' },
                                  { label: 'Subscription ID', value: user.stripe_subscription_id ? `${user.stripe_subscription_id.substring(0, 14)}…` : '—' },
                                  { label: 'Follow-up Days', value: user.follow_up_days ?? '—' },
                                  { label: 'Registered', value: user.created_at ? new Date(user.created_at).toLocaleString() : '—' },
                                ].map(({ label, value }) => (
                                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value}</span>
                                  </div>
                                ))}
                              </div>
                            ) : expandedTab === 'clients' ? (
                              businessClients.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No clients added yet.</p>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--outline-variant)', textAlign: 'left' }}>
                                      {['Name', 'Phone', 'Email', 'DOB', 'Tags', 'Step', 'Status', 'Next Action', 'Added'].map(h => (
                                        <th key={h} style={{ padding: '0.5rem 0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {businessClients.map(client => (
                                      <tr key={client.id} style={{ borderBottom: '1px solid var(--surface-container-low)' }}>
                                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{client.name || '—'}</td>
                                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{client.phone || '—'}</td>
                                        <td style={{ padding: '0.5rem 0.75rem' }}>{client.email || '—'}</td>
                                        <td style={{ padding: '0.5rem 0.75rem' }}>{client.dob || '—'}</td>
                                        <td style={{ padding: '0.5rem 0.75rem' }}>{(client.tags || []).join(', ') || '—'}</td>
                                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>{client.drip_step ?? 0}</td>
                                        <td style={{ padding: '0.5rem 0.75rem' }}>
                                          {client.is_unsubscribed
                                            ? <span style={{ color: '#ef4444', fontWeight: 700 }}>Opted Out</span>
                                            : <span style={{ color: '#16a34a', fontWeight: 700 }}>Active</span>}
                                        </td>
                                        <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                          {client.next_action_time ? new Date(client.next_action_time).toLocaleString() : '—'}
                                        </td>
                                        <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                          {client.created_at ? new Date(client.created_at).toLocaleDateString() : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )
                            ) : (
                              /* Activity tab */
                              businessActivity.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No activity recorded yet.</p>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--outline-variant)', textAlign: 'left' }}>
                                      {['Direction', 'Type', 'Message', 'When'].map(h => (
                                        <th key={h} style={{ padding: '0.5rem 0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {businessActivity.map(act => (
                                      <tr key={act.id} style={{ borderBottom: '1px solid var(--surface-container-low)' }}>
                                        <td style={{ padding: '0.5rem 0.75rem' }}>
                                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '2rem',
                                            backgroundColor: act.is_outbound ? '#e3f2fd' : '#f3e5f5',
                                            color: act.is_outbound ? '#1565c0' : '#6a1b9a' }}>
                                            {act.is_outbound ? 'Outbound' : 'Inbound'}
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>{act.type || '—'}</td>
                                        <td style={{ padding: '0.5rem 0.75rem', maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.text || '—'}</td>
                                        <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                          {act.created_at ? new Date(act.created_at).toLocaleString() : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row: Audit Log + Cancellations + Admin widget */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: '2rem', alignItems: 'start' }}>

        {/* GDPR Audit Log */}
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
                    <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Registered</th>
                    <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Deleted</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--surface-container-low)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.deleted_user_id.substring(0, 8)}…</td>
                      <td style={{ padding: '0.75rem' }}>{log.metrics_snapshot?.total_reviews || 0} reviews, {log.metrics_snapshot?.total_clients || 0} clients</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(log.original_created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem', color: '#ef4444' }}>{new Date(log.deleted_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cancellation Reasons */}
        <div className="card">
          <h2 className="text-title-lg" style={{ marginBottom: '1.5rem' }}>Cancellation Reasons</h2>
          {cancellations.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No cancellations recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--surface-container-low)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Business ID</th>
                    <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Reason</th>
                    <th style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellations.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--surface-container-low)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{c.business_id?.substring(0, 8)}…</td>
                      <td style={{ padding: '0.75rem' }}>{c.reason || 'No reason given'}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{new Date(c.canceled_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Grant Admin Widget */}
        <div className="card" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
          <h2 className="text-title-lg" style={{ marginBottom: '1rem' }}>Grant Admin Access</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
            Elevate a user to Super Admin by entering their User UUID.
          </p>
          {adminActionStatus.msg && (
            <div style={{
              padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem',
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
