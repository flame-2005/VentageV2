import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="mx-auto px-6 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section className="space-y-6">
        <p>
          Welcome to <strong>VantEdge</strong>. Your privacy is important to us.
          This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you use our website or services.
        </p>

        <div>
          <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Personal information such as name and email address</li>
            <li>Usage data including pages visited and interactions</li>
            <li>Technical data like IP address, browser, and device type</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To operate and maintain our platform</li>
            <li>To improve user experience and performance</li>
            <li>To communicate important updates or support messages</li>
            <li>To ensure security and prevent misuse</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">3. Cookies</h2>
          <p>
            We may use cookies and similar technologies to enhance functionality
            and analyze usage. You can disable cookies through your browser
            settings, though some features may not work properly.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">4. Data Sharing</h2>
          <p>
            We do not sell your personal data. Information may be shared only
            with trusted service providers or when required by law.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">5. Data Security</h2>
          <p>
            We use reasonable security measures to protect your information.
            However, no online system is completely secure.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">6. Third-Party Links</h2>
          <p>
            Our service may contain links to third-party websites. We are not
            responsible for their privacy practices.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">7. Children’s Privacy</h2>
          <p>
            VantEdge does not knowingly collect data from children under the age
            of 13.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, contact us at:
          </p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
