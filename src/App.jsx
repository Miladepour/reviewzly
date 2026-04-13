import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Clients from './pages/Clients';
import Reviews from './pages/Reviews';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import ReviewCapture from './pages/ReviewCapture';
import HelpCenter from './pages/HelpCenter';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/r/:businessId" element={<ReviewCapture />} />

      {/* Authenticated Dashboard Routes */}
      <Route path="/dashboard" element={<Layout />}>
        {/* The index route resolves to /dashboard natively */}
        <Route index element={<Dashboard />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="clients" element={<Clients />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<HelpCenter />} />
      </Route>
    </Routes>
  );
}

export default App;
