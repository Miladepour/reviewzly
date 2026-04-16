import React from 'react';
import { Link } from 'react-router-dom';
import PublicFooter from '../components/PublicFooter';
import PublicNavbar from '../components/PublicNavbar';

const Terms = () => {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--surface)' }}>
      <PublicNavbar />

      <main className="flex-1" style={{ padding: '4rem 5%', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <div className="card" style={{ padding: '3rem' }}>
          <h1 className="text-display-xl mb-4" style={{ fontSize: '2.5rem' }}>Terms and Conditions</h1>
          <p className="text-body mb-8">Last Updated: April 2026</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <section>
              <h2 className="text-title-lg mb-3">1. Acceptance of Terms</h2>
              <p className="text-body" style={{ lineHeight: 1.6 }}>
                By accessing or using Reviewzly ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, do not access or use our services. Note that Reviewzly provides reputation management software and acts strictly as a routing interface for SMS communications.
              </p>
            </section>

            <section>
              <h2 className="text-title-lg mb-3">2. Description of Service</h2>
              <p className="text-body" style={{ lineHeight: 1.6 }}>
                Reviewzly software enables businesses to automatically request reviews from their customers. Positive feedback is routed to public platforms (e.g., Google), while constructive feedback is routed internally. The Platform utilizes a master telecommunications integration to dispatch SMS requests on behalf of the registered business.
              </p>
            </section>

            <section>
              <h2 className="text-title-lg mb-3" style={{ color: 'var(--primary-dark)' }}>3. Acceptable Use and SMS Policy</h2>
              <p className="text-body mb-3" style={{ lineHeight: 1.6 }}>
                Because you are utilizing Reviewzly's master SMS infrastructure, strict adherence to telecommunications law is mandatory.
              </p>
              <ul className="text-body" style={{ marginLeft: '1.5rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>Prohibited Industries:</strong> You may not use this platform to promote, solicit, or engage in Adult Services, Gambling, Illicit Substances, or any federally restricted businesses.</li>
                <li><strong>Anti-Spam & Consent:</strong> You guarantee that every client added to your Reviewzly directory has explicitly opted-in and provided legal consent to receive SMS communications from your business. Reviewzly holds zero liability for TCPA, GDPR, or equivalent spam violations caused by your failure to secure consent.</li>
                <li><strong>Dynamic Sender IDs:</strong> You may not impersonate internal government agencies, emergency services, or spoof corporate entities you do not own via the Sender ID settings.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-title-lg mb-3">4. Billing and SMS Credits</h2>
              <p className="text-body" style={{ lineHeight: 1.6 }}>
                SMS capabilities are governed by a prepaid credit system. Credits are non-refundable. In the event a text message is rejected by the carrier due to improper formatting or policy violations, credits deducted by the processing engine may not be recuperated.
              </p>
            </section>

            <section>
              <h2 className="text-title-lg mb-3">5. Termination</h2>
              <p className="text-body" style={{ lineHeight: 1.6 }}>
                Reviewzly reserves the right to suspend or immediately terminate your access to the SMS infrastructure or the entire Platform if we suspect violations of the Acceptable Use Policy, particularly regarding unsolicited communications (spam) or prohibited industry usage. 
              </p>
            </section>

            <section>
              <h2 className="text-title-lg mb-3">6. Limitation of Liability</h2>
              <p className="text-body" style={{ lineHeight: 1.6 }}>
                Reviewzly provides its services "as is." We are not liable for any indirect, incidental, or consequential damages resulting from your use of the Platform, undelivered SMS messages due to carrier blocks, or legal action taken against your business by third parties regarding your privacy practices.
              </p>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Terms;
