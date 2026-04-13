import React, { useState } from 'react';

const Clients = () => {
  // State for Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // State for clients data
  const [clients, setClients] = useState([
    { 
      id: 1, 
      name: 'Alice Freeman', 
      phone: '+44 123 456 7890', 
      email: 'alice@example.com', 
      dob: '1990-05-15', 
      status: 'Review Received', 
      date: '2026-04-10',
      logs: [
        { date: '4/10/2026, 10:00 AM', message: 'Added to system' },
        { date: '4/10/2026, 10:01 AM', message: 'Review Request SMS Sent' },
        { date: '4/10/2026, 2:30 PM', message: 'Left a 5-star Google Review' }
      ]
    },
    { 
      id: 2, 
      name: 'Mark Johnson', 
      phone: '+44 987 654 3210', 
      email: 'mark@example.com', 
      dob: 'Not provided', 
      status: 'Review Received', 
      date: '2026-04-11',
      logs: [
        { date: '4/11/2026, 09:15 AM', message: 'Added to system' },
        { date: '4/11/2026, 09:16 AM', message: 'Review Request SMS Sent' },
        { date: '4/11/2026, 1:45 PM', message: 'Left a 3-star Internal Feedback' }
      ]
    },
    { 
      id: 3, 
      name: 'Emma Davies', 
      phone: '+44 111 222 3333', 
      email: 'emma@example.com', 
      dob: '1988-11-20', 
      status: 'Invited', 
      date: '2026-04-12',
      logs: [
        { date: '4/12/2026, 11:00 AM', message: 'Added to system' },
        { date: '4/12/2026, 11:01 AM', message: 'Review Request SMS Sent' }
      ]
    },
  ]);

  // State for Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', phone: '', email: '', dob: '' });

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [activeProfileTab, setActiveProfileTab] = useState('details');

  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewClientData({ name: '', phone: '', email: '', dob: '' });
  };

  const handleAddClientSubmit = (e) => {
    e.preventDefault();
    const newClientObj = {
      id: Date.now(),
      name: newClientData.name,
      phone: newClientData.phone,
      email: newClientData.email || 'No email provided',
      dob: newClientData.dob || 'Not provided',
      status: 'Added Manually',
      date: new Date().toISOString().split('T')[0],
      logs: [
        { date: new Date().toLocaleString(), message: 'Added manually via "+ Add Client" action.' }
      ]
    };
    setClients(prev => [newClientObj, ...prev]);
    closeAddModal();
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setActiveProfileTab('details');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingClient(null);
    setIsEditModalOpen(false);
  };

  const handleUpdateClient = (e) => {
    e.preventDefault();
    setClients(clients.map(c => c.id === editingClient.id ? editingClient : c));
    closeEditModal();
  };

  const handleDeleteClient = (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const handleUnsubscribe = (id) => {
    if (window.confirm('Are you sure you want to unsubscribe this client? They will stop receiving SMS.')) {
      setClients(clients.map(c => {
        if (c.id === id) {
          return { 
            ...c, 
            status: 'Unsubscribed', 
            logs: [...(c.logs || []), { date: new Date().toLocaleString(), message: 'Manually Unsubscribed' }] 
          };
        }
        return c;
      }));
    }
  };

  const filteredClients = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    const matchFilter = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchFilter;
  });

  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 mb-4">
          <div className="flex justify-between items-center w-100 flex-wrap gap-4">
            <h1 className="text-display-xl">Clients Directory</h1>
            <button className="btn-primary" onClick={openAddModal}>+ Add Client</button>
          </div>
          
          <div className="flex gap-3 items-center flex-wrap">
            <input 
              type="text" 
              className="search-pill" 
              style={{ borderRadius: '0.75rem', padding: '0.75rem 1rem', width: '100%', maxWidth: '300px' }}
              placeholder="Search by name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select 
              className="search-pill"
              style={{ borderRadius: '0.75rem', padding: '0.75rem 1rem', width: 'auto', border: 'none', outline: 'none' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Invited">Invited</option>
              <option value="Review Received">Review Received</option>
              <option value="Added Manually">Added Manually</option>
              <option value="Unsubscribed">Unsubscribed</option>
            </select>
          </div>
        </header>

        <div className="card">
          <div className="flex flex-col gap-4">
            {filteredClients.length === 0 ? (
              <p className="text-label-sm">No clients found matching your search criteria.</p>
            ) : (
              filteredClients.map(client => (
                <div 
                  key={client.id} 
                  className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4 bg-soft"
                  style={{
                    padding: '1.25rem', 
                    borderRadius: '1rem',
                    transition: 'background-color 0.2s ease',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <h4 className="text-title-lg mb-1">{client.name}</h4>
                    <p className="text-body" style={{fontSize: '0.85rem'}}>{client.phone} • {client.email}</p>
                    {client.dob && client.dob !== 'Not provided' && (
                      <p className="text-body" style={{ opacity: 0.8, fontSize: '0.85rem' }}>DOB: {client.dob}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-label-sm">{client.date}</span>
                    {
                      client.status === 'Invited' ? (
                        <span className="tag-light-green" style={{ backgroundColor: 'var(--outline-variant)' }}>{client.status}</span>
                      ) : client.status === 'Unsubscribed' ? (
                        <span className="tag-light-green" style={{ backgroundColor: '#ffdcc8', color: '#7a3a00' }}>{client.status}</span>
                      ) : client.status === 'Added Manually' ? (
                        <span className="tag-light-green">{client.status}</span>
                      ) : (
                        <span className="tag-light-green" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>{client.status}</span>
                      )
                    }
                    
                    <div className="flex gap-2">
                       <button 
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#ffdcc8', color: '#7a3a00', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }} 
                        onClick={() => handleUnsubscribe(client.id)}
                        disabled={client.status === 'Unsubscribed'}
                      >
                        Unsubscribe
                      </button>
                      <button 
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }} 
                        onClick={() => openEditModal(client)}
                      >
                        Profile
                      </button>
                      <button 
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: 'transparent', color: 'red', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }} 
                        onClick={() => handleDeleteClient(client.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={closeAddModal}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-display-xl" style={{ fontSize: '1.75rem' }}>Add New Client</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }} onClick={closeAddModal}>✕</button>
            </div>
            <form className="flex flex-col gap-4 mt-2" onSubmit={handleAddClientSubmit}>
              <div className="flex flex-col gap-2">
                <label className="text-label-sm">Client Name*</label>
                <input 
                  type="text" 
                  style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }}
                  value={newClientData.name}
                  onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-sm">Phone Number*</label>
                <input 
                  type="tel" 
                  style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }}
                  value={newClientData.phone}
                  onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-sm">Email Address</label>
                <input 
                  type="email" 
                  style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }}
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-sm">Date of Birth</label>
                <input 
                  type="date" 
                  style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }} 
                  value={newClientData.dob}
                  onChange={(e) => setNewClientData({...newClientData, dob: e.target.value})}
                />
              </div>
              <div className="flex gap-4 mt-8 justify-end">
                <button type="button" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={closeAddModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile/Edit Modal Popup */}
      {isEditModalOpen && editingClient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={closeEditModal}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-display-xl" style={{ fontSize: '1.75rem' }}>Client Profile</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }} onClick={closeEditModal}>✕</button>
            </div>

            <div className="flex gap-4 mb-6">
              <button 
                style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontWeight: 600, backgroundColor: activeProfileTab === 'details' ? 'var(--surface-container-low)' : 'transparent', color: activeProfileTab === 'details' ? 'var(--primary)' : 'var(--on-surface-variant)' }}
                onClick={() => setActiveProfileTab('details')}
              >
                Details
              </button>
              <button 
                style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontWeight: 600, backgroundColor: activeProfileTab === 'logs' ? 'var(--surface-container-low)' : 'transparent', color: activeProfileTab === 'logs' ? 'var(--primary)' : 'var(--on-surface-variant)' }}
                onClick={() => setActiveProfileTab('logs')}
              >
                Activity Logs
              </button>
            </div>

            {activeProfileTab === 'details' ? (
              <form className="flex flex-col gap-4 mt-2" onSubmit={handleUpdateClient}>
                <div className="flex flex-col gap-2">
                  <label className="text-label-sm">Client Name</label>
                  <input 
                    type="text" 
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }}
                    value={editingClient.name}
                    onChange={(e) => setEditingClient({...editingClient, name: e.target.value})}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label-sm">Phone Number</label>
                  <input 
                    type="tel" 
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }}
                    value={editingClient.phone}
                    onChange={(e) => setEditingClient({...editingClient, phone: e.target.value})}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label-sm">Email Address</label>
                  <input 
                    type="email" 
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }}
                    value={editingClient.email !== 'No email provided' ? editingClient.email : ''}
                    onChange={(e) => setEditingClient({...editingClient, email: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label-sm">Date of Birth</label>
                  <input 
                    type="date" 
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none' }}
                    value={editingClient.dob !== 'Not provided' ? editingClient.dob : ''}
                    onChange={(e) => setEditingClient({...editingClient, dob: e.target.value})}
                  />
                </div>
                <div className="flex gap-4 mt-8 justify-end">
                  <button type="button" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={closeEditModal}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Changes</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                {editingClient.logs && editingClient.logs.length > 0 ? (
                  editingClient.logs.map((log, index) => (
                    <div key={index} className="flex flex-col p-4 bg-soft" style={{ borderRadius: '1rem' }}>
                      <span className="text-label-sm" style={{ fontWeight: '600' }}>{log.date}</span>
                      <span className="text-body mt-1" style={{ fontSize: '0.875rem' }}>{log.message}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-label-sm">No activity logs recorded yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Clients;
