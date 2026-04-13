import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const MOCK_DIRECTORY = [
  { name: 'Alice Springs', phone: '+1 (555) 123-4567' },
  { name: 'Brian Dawson', phone: '+1 (555) 234-5678' }
];

const Inbox = () => {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [composerText, setComposerText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Left Sidebar Filter State
  const [inboxFilterQuery, setInboxFilterQuery] = useState('');
  
  // Modals & Profile Logic
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState('context');
  
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [chatEntryMode, setChatEntryMode] = useState('manual'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');

  const messagesEndRef = useRef(null);
  const activeConvo = conversations.find(c => c.id === activeId);

  // AUTO-SCROLL TO BOTTOM OF CHAT
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [activeConvo?.messages, activeId]);

  // LIVE DATABASE FETCH LOGIC
  const fetchInbox = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const businessId = session.user.id;
      
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      const { data: commsData } = await supabase
        .from('communications')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true }); 

      if (clientsData && commsData) {
        const merged = clientsData.map(client => {
          const theirComms = commsData.filter(c => c.client_id === client.id);
          return {
            id: client.id,
            clientName: client.name,
            phone: client.phone,
            dateAdded: new Date(client.created_at).toLocaleDateString(),
            ratingStatus: client.rating_status,
            tags: client.tags || [],
            unread: client.unread,
            messages: theirComms.filter(c => c.type === 'HUMAN_CHAT'),
            systemHistory: theirComms.filter(c => c.type !== 'HUMAN_CHAT')
          };
        });
        
        setConversations(merged);
        if (merged.length > 0 && !activeId) setActiveId(merged[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []); // Run on mount

  // SEND MESSAGE MUTATION
  const handleSend = async (e) => {
    e.preventDefault();
    if (!composerText.trim() || !activeId) return;

    const textToSend = composerText;
    setComposerText('');

    const { data: { session } } = await supabase.auth.getSession();
    
    // Insert into Supabase
    const { error } = await supabase.from('communications').insert([{
      client_id: activeId,
      business_id: session.user.id,
      type: 'HUMAN_CHAT',
      text: textToSend,
      is_outbound: true
    }]);

    if (!error) {
      // Re-fetch to guarantee sync with DB
      fetchInbox();
    } else {
      console.error(error);
    }
  };

  // CREATE NEW CLIENT & INITIAL MESSAGE MUTATION
  const startNewChat = async (e) => {
    e.preventDefault();
    if (!newChatName.trim() || !newChatPhone.trim() || !newChatMessage.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    const bid = session.user.id;

    // 1. Create Client
    const { data: clientData, error: clientError } = await supabase.from('clients').insert([{
      business_id: bid,
      name: newChatName,
      phone: newChatPhone,
      tags: ['Manual Add']
    }]).select().single();

    if (clientError) {
      console.error(clientError);
      return;
    }

    // 2. Insert Initial Communication Log
    await supabase.from('communications').insert([{
      client_id: clientData.id,
      business_id: bid,
      type: 'HUMAN_CHAT',
      text: newChatMessage,
      is_outbound: true
    }]);

    setNewChatName('');
    setNewChatPhone('');
    setNewChatMessage('');
    setIsNewChatModalOpen(false);
    
    await fetchInbox();
    setActiveId(clientData.id);
  };
  
  const handleSelectDirectoryClient = (client) => {
    setNewChatName(client.name);
    setNewChatPhone(client.phone);
    setChatEntryMode('manual'); 
  };

  const selectConversation = (id) => {
    setActiveId(id);
  };
  
  const filteredDirectory = MOCK_DIRECTORY.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const displayedInboxThreads = conversations.filter(c => 
    c.clientName.toLowerCase().includes(inboxFilterQuery.toLowerCase()) ||
    c.phone.includes(inboxFilterQuery)
  );

  const totalMessagesCount = conversations.length;
  const unreadMessagesCount = conversations.filter(c => c.unread).length;

  if (isLoading) return <div style={{ padding: '2rem' }}>Syncing secure inbox...</div>;

  return (
    <>
      <div className="flex gap-6 w-full" style={{ height: '75vh', minHeight: '550px', maxHeight: '850px' }}>
        
        {/* 1. LEFT PANE: All Chats List */}
        <div className="card" style={{ width: '300px', height: '100%', overflow: 'hidden', padding: 0, flexShrink: 0, position: 'relative' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '245px', padding: '1.5rem', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'white', zIndex: 10 }}>
            {/* Top Header & Analytics Box */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-display-xl" style={{ fontSize: '1.5rem' }}>Inbox</h2>
              <button 
                onClick={() => setIsNewChatModalOpen(true)}
                className="btn-primary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '2rem' }}
                title="Start a new message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                New
              </button>
            </div>
            
            <div className="flex gap-2 mb-4">
               <div style={{ flex: 1, backgroundColor: 'var(--surface-container-high)', padding: '0.65rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                 <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--on-surface)' }}>{totalMessagesCount}</div>
                 <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Total</div>
               </div>
               <div style={{ flex: 1, backgroundColor: unreadMessagesCount > 0 ? 'var(--primary-container)' : 'var(--surface-container-high)', padding: '0.65rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                 <div style={{ fontWeight: 800, fontSize: '1.15rem', color: unreadMessagesCount > 0 ? 'var(--on-primary-container)' : 'var(--on-surface)' }}>{unreadMessagesCount}</div>
                 <div style={{ fontSize: '0.65rem', fontWeight: 700, color: unreadMessagesCount > 0 ? 'var(--primary)' : 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Unread</div>
               </div>
            </div>

            {/* Quick Inbox Search Filter */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <svg style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', opacity: 0.7 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Search messages..." 
                value={inboxFilterQuery}
                onChange={(e) => setInboxFilterQuery(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '2rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'var(--surface)' }}
              />
            </div>
            
            <div className="flex bg-surface rounded-full p-1" style={{ backgroundColor: 'var(--surface-container-highest)' }}>
              <button className="btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>Active</button>
              <button style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Archived</button>
            </div>
          </div>

          <div className="styled-scrollbar" style={{ position: 'absolute', top: '245px', bottom: 0, left: 0, right: 0, overflowY: 'auto', backgroundColor: 'white' }}>
            {displayedInboxThreads.length > 0 ? displayedInboxThreads.map(convo => {
              const lastMsg = convo.messages.length > 0 ? convo.messages[convo.messages.length - 1] : { text: 'No messages yet.', timestamp: '', is_outbound: false };
              const isActive = activeId === convo.id;
              
              return (
                <div 
                  key={convo.id}
                  onClick={() => selectConversation(convo.id)}
                  style={{ 
                    padding: '1.25rem 1rem', 
                    borderBottom: '1px solid var(--outline-variant)', 
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--surface)' : 'transparent',
                    borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                    transition: 'all 0.2s',
                    overflow: 'hidden' 
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'baseline', gap: '0.5rem', width: '100%', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, backgroundColor: convo.unread ? '#e84545' : 'transparent' }}></div>
                       <span className="text-title-md truncate" style={{ fontWeight: convo.unread ? 800 : 700, color: 'var(--on-surface)' }}>{convo.clientName}</span>
                    </div>
                    <span className="text-label-sm" style={{ color: convo.unread ? 'var(--primary)' : 'var(--on-surface-variant)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                      {lastMsg.timestamp ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  
                  <p 
                    className="text-body truncate" 
                    style={{ 
                      fontSize: '0.85rem', 
                      color: convo.unread ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                      fontWeight: convo.unread ? 600 : 400,
                      paddingLeft: '16px',
                      margin: 0
                    }}
                  >
                    {lastMsg.is_outbound ? 'You: ' : ''}{lastMsg.text}
                  </p>
                </div>
              );
            }) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
                {inboxFilterQuery ? `No conversations match "${inboxFilterQuery}"` : "You have no active conversations. Click + New to add a client."}
              </div>
            )}
          </div>
        </div>

        {/* 2. CENTER PANE: Active Chat Engine */}
        <div className="card" style={{ flex: 1, padding: 0, position: 'relative', height: '100%', overflow: 'hidden' }}>
          
          <div 
            style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, height: '88px', 
              padding: '1.25rem 2rem', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'white', zIndex: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            {activeConvo && (
              <div 
                className="flex items-center gap-4 cursor-pointer hover:opacity-80" 
                onClick={() => setIsProfileModalOpen(true)}
                style={{ flex: 1, minWidth: 0, paddingRight: '20px' }}
                title="Click to view full client profile & automated campaign history"
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem', flexShrink: 0 }}>
                  {activeConvo.clientName.charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 className="text-title-lg truncate hover:underline" style={{ color: 'var(--on-surface)' }}>{activeConvo.clientName}</h3>
                  <p className="text-label-sm truncate" style={{ color: 'var(--on-surface-variant)' }}>{activeConvo.phone} • View Context & Logs</p>
                </div>
              </div>
            )}
            
            <button style={{ flexShrink: 0, background: 'none', border: '1px solid var(--outline-variant)', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Search Chat</button>
          </div>

          <div 
            className="styled-scrollbar"
            style={{ 
              position: 'absolute', top: '88px', bottom: '90px', left: 0, right: 0, 
              padding: '2rem', backgroundColor: '#F9FAF9', overflowY: 'auto' 
            }}
          >
            {activeConvo ? (
              <div className="flex flex-col gap-6">
                {activeConvo.messages.map((msg) => {
                  const isOut = msg.is_outbound;
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start' }}>
                      <div 
                        style={{ 
                          maxWidth: '85%', 
                          padding: '1rem 1.25rem', 
                          borderRadius: '1.25rem',
                          borderBottomRightRadius: isOut ? '0.25rem' : '1.25rem',
                          borderBottomLeftRadius: isOut ? '1.25rem' : '0.25rem',
                          backgroundColor: isOut ? 'var(--primary)' : 'white',
                          color: isOut ? 'white' : 'var(--on-surface)',
                          boxShadow: isOut ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                          border: isOut ? 'none' : '1px solid var(--outline-variant)',
                          fontSize: '0.95rem',
                          lineHeight: '1.5'
                        }}
                      >
                        {msg.text}
                      </div>
                      <span className="text-label-sm mt-1" style={{ color: 'var(--on-surface-variant)', fontSize: '0.7rem' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} style={{ height: '1px' }} />
              </div>
            ) : (
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                 Select or create a conversation to begin chatting.
               </div>
            )}
           </div>

          <div 
            style={{ 
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '90px', 
              padding: '1rem 2rem', borderTop: '1px solid var(--outline-variant)', backgroundColor: 'white' 
            }}
          >
            <form onSubmit={handleSend} className="flex gap-4 items-center h-full">
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: '0.5rem' }} title="Attach Media">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              </button>
              <div className="flex-1">
                <input 
                  type="text"
                  placeholder={activeConvo ? `Message ${activeConvo.clientName}...` : 'Start a chat to type...'}
                  style={{ width: '100%', padding: '0.85rem 1.25rem', borderRadius: '2rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '1rem', fontFamily: 'inherit', backgroundColor: 'var(--surface-container-lowest)' }}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  disabled={!activeConvo}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '0.85rem 1.5rem', borderRadius: '2rem' }} disabled={!composerText.trim() || !activeConvo}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* NEW CHAT MODAL OVERLAY */}
      {isNewChatModalOpen && (
        <div 
          onClick={() => setIsNewChatModalOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="card" 
            style={{ width: '100%', maxWidth: '460px', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div className="flex justify-between items-center" style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
              <h3 className="text-title-lg">Start New Conversation</h3>
              <button type="button" onClick={() => setIsNewChatModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ padding: '1.5rem 2rem' }}>
              <div className="flex rounded-lg overflow-hidden mb-6" style={{ backgroundColor: 'var(--surface-container-highest)', padding: '0.25rem' }}>
                <button 
                  type="button" 
                  onClick={() => setChatEntryMode('search')} 
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600, border: 'none', borderRadius: '0.4rem', cursor: 'pointer',
                    backgroundColor: chatEntryMode === 'search' ? 'white' : 'transparent',
                    color: chatEntryMode === 'search' ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                    boxShadow: chatEntryMode === 'search' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Search Directory
                </button>
                <button 
                  type="button" 
                  onClick={() => setChatEntryMode('manual')} 
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600, border: 'none', borderRadius: '0.4rem', cursor: 'pointer',
                    backgroundColor: chatEntryMode === 'manual' ? 'white' : 'transparent',
                    color: chatEntryMode === 'manual' ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                    boxShadow: chatEntryMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Enter Manually
                </button>
              </div>

              {chatEntryMode === 'search' ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '300px' }}>
                  <div style={{ position: 'relative', marginBottom: '1rem' }}>
                     <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                     <input 
                       type="text" 
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                       placeholder="Search legacy offline mocks..." 
                       style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', backgroundColor: 'var(--surface-container-lowest)' }}
                     />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto styled-scrollbar" style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.5rem', backgroundColor: 'var(--surface-container-lowest)' }}>
                    {filteredDirectory.map((client, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleSelectDirectoryClient(client)}
                          style={{ padding: '1rem', borderBottom: '1px solid var(--outline-variant)', cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ fontWeight: 700, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>{client.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{client.phone}</div>
                        </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form id="new-chat-form" onSubmit={startNewChat} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Client Name</label>
                      <input 
                        type="text" 
                        value={newChatName}
                        onChange={e => setNewChatName(e.target.value)}
                        placeholder="e.g. David Smith" 
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit' }}
                        required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Mobile Number</label>
                      <input 
                        type="text" 
                        value={newChatPhone}
                        onChange={e => setNewChatPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000" 
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit' }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Initial Message</label>
                    <textarea 
                      value={newChatMessage}
                      onChange={e => setNewChatMessage(e.target.value)}
                      placeholder="Type your first message to introduce yourself..." 
                      rows="4"
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'none' }}
                      required
                    />
                  </div>
                </form>
              )}
            </div>

            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setIsNewChatModalOpen(false)} 
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'transparent', color: 'var(--on-surface-variant)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              
              {chatEntryMode === 'manual' ? (
                <button 
                  type="submit" 
                  form="new-chat-form"
                  className="btn-primary" 
                  style={{ padding: '0.75rem 2rem' }}
                >
                  Send Message
                </button>
              ) : (
                <button 
                  type="button"
                  className="btn-primary" 
                  style={{ padding: '0.75rem 2rem', opacity: 0.5, cursor: 'not-allowed' }}
                  disabled
                >
                  Select a Client
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL OVERLAY */}
      {isProfileModalOpen && activeConvo && (
        <div 
          onClick={() => setIsProfileModalOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="card" 
            style={{ width: '100%', maxWidth: '450px', padding: '0', display: 'flex', flexDirection: 'column', height: '90vh', maxHeight: '750px', overflow: 'hidden' }}
          >
            {/* Modular Header */}
            <div className="flex justify-between items-start" style={{ padding: '1.5rem 2rem 1rem 2rem', backgroundColor: 'var(--surface-container-lowest)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.75rem' }}>
                    {activeConvo.clientName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-display-xl mb-1 truncate" style={{ fontSize: '1.4rem' }}>{activeConvo.clientName}</h2>
                    <p className="text-body truncate" style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>{activeConvo.phone}</p>
                  </div>
               </div>
               
               <button onClick={() => setIsProfileModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
               </button>
            </div>

            {/* Sub-Header Tabs */}
            <div className="flex" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
              <button 
                onClick={() => setProfileActiveTab('context')} 
                style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', borderBottom: profileActiveTab === 'context' ? '3px solid var(--primary)' : '3px solid transparent', color: profileActiveTab === 'context' ? 'var(--primary)' : 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                CRM Context
              </button>
              <button 
                onClick={() => setProfileActiveTab('history')} 
                style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', borderBottom: profileActiveTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent', color: profileActiveTab === 'history' ? 'var(--primary)' : 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Complete History Log
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto styled-scrollbar" style={{ backgroundColor: 'var(--surface)', padding: '2rem' }}>
              
              {profileActiveTab === 'context' ? (
                <div className="flex flex-col gap-8">
                  <div>
                    <h4 className="text-label-sm mb-3" style={{ fontWeight: 800 }}>Feedback Status</h4>
                    <div style={{ display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700,
                      backgroundColor: activeConvo.ratingStatus?.includes('5-Star') ? 'var(--primary)' : 
                                       activeConvo.ratingStatus?.includes('2-Star') ? '#FFF3CD' : 'var(--surface-container-high)',
                      color: activeConvo.ratingStatus?.includes('5-Star') ? 'white' : 
                             activeConvo.ratingStatus?.includes('2-Star') ? '#856404' : 'var(--on-surface-variant)'
                    }}>
                      {activeConvo.ratingStatus || 'Pending'}
                    </div>
                  </div>

                  <div>
                     <h4 className="text-label-sm mb-3" style={{ fontWeight: 800 }}>Client Context Tags</h4>
                     <div className="flex flex-wrap gap-2">
                       {activeConvo.tags?.length > 0 ? activeConvo.tags.map(tag => (
                         <span key={tag} style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.5rem', padding: '0.35rem 0.7rem', fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 600, backgroundColor: 'white' }}>{tag}</span>
                       )) : <span className="text-body" style={{ opacity: 0.5, fontSize: '0.9rem' }}>No active tags</span>}
                     </div>
                  </div>

                  <div>
                     <h4 className="text-label-sm mb-2" style={{ fontWeight: 800 }}>Acquisition Date</h4>
                     <p className="text-body" style={{ fontSize: '1rem' }}>{activeConvo.dateAdded}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div style={{ padding: '1rem', backgroundColor: 'var(--primary-container)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--on-primary-container)', fontWeight: 600 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      This timeline displays ALL system touches, including automated Bulk Campaigns that bypass the main Inbox.
                    </p>
                  </div>

                  {activeConvo.systemHistory?.length > 0 ? activeConvo.systemHistory.map((log, index) => (
                    <div key={index} style={{ borderLeft: '2px solid var(--outline-variant)', paddingLeft: '1rem', position: 'relative' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: log.type === 'BULK_CAMPAIGN' ? 'var(--secondary)' : log.type.includes('FEEDBACK') ? '#F59E0B' : 'var(--on-surface-variant)', position: 'absolute', left: '-5px', top: '4px' }}></div>
                      <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)', fontSize: '0.7rem' }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '0.25rem', color: log.type === 'BULK_CAMPAIGN' ? 'var(--on-surface)' : 'var(--on-surface)' }}>
                        {log.type === 'BULK_CAMPAIGN' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: 'var(--secondary)', color: 'white', borderRadius: '0.2rem', fontSize: '0.65rem', marginRight: '0.5rem' }}>CAMPAIGN</span>}
                        {log.text}
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--on-surface-variant)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      No detailed system history established yet.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', display: 'flex', justifyContent: 'center' }}>
              <button style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', backgroundColor: 'white', color: 'var(--on-surface)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                 Open Full Directory Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Inbox;
