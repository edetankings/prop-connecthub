import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Button } from "@/components/ui/button";
import { Instagram, Facebook, Phone, Mail } from "lucide-react";

const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.16 0 .31.03.45.06v-3.5a6.33 6.33 0 0 0-.45-.02A6.34 6.34 0 0 0 4 15.45a6.34 6.34 0 0 0 6.34 6.33 6.33 6.33 0 0 0 6.33-6.33V8.83a7.86 7.86 0 0 0 4.6 1.47V7.13a4.72 4.72 0 0 1-1.68-.44z"/>
  </svg>
);

const Privacy = () => {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <img src={logo} alt="PROP-connect" className="h-10 w-10 rounded-lg object-contain" />
          <span className="font-display font-bold text-foreground">PROP-connect</span>
        </Link>
        <article className="rounded-xl border border-border bg-card p-6 sm:p-10 shadow-elevated prose prose-sm max-w-none dark:prose-invert">
          <h1 className="font-display text-2xl font-bold">PROP-connect Privacy Policy</h1>
          <p className="text-muted-foreground"><em>Effective Date: June 15, 2026</em></p>

          <p>PROP-connect ("we," "our," or "us") is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, store, disclose, and protect your information when you use our mobile app, website, and related services ("Platform").</p>
          <p>By accessing or using PROP-connect, you agree to the terms outlined in this Privacy Policy.</p>

          <h2>1. Information We Collect</h2>
          <p><strong>Personal Information:</strong> Full name, phone number, email address, residential address, means of identification (NIN, BVN, National ID, Driver's License, or International Passport where required).</p>
          <p><strong>Property Information:</strong> Property pictures and videos, property location and map details, property ownership documents where necessary, listing descriptions and pricing.</p>
          <p><strong>Payment Information:</strong> Payment receipts and transaction records, bank details for commission payouts, registration and subscription payment information.</p>
          <p><strong>Location Data:</strong> GPS or map location to help users access properties easily and improve listing accuracy.</p>
          <p><strong>Device & Usage Information:</strong> IP address, device type, browser type, operating system, activity logs and crash reports.</p>
          <p><strong>Cookies & Tracking Technologies:</strong> PROP-connect may use cookies and similar technologies to improve user experience, security, analytics, and advertising performance.</p>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>Create and manage user accounts</li>
            <li>Verify identities and property ownership</li>
            <li>Process registrations and commissions</li>
            <li>Verify payments and transactions</li>
            <li>Improve platform performance and security</li>
            <li>Conduct property background checks</li>
            <li>Match buyers, renters, and sellers</li>
            <li>Provide customer support</li>
            <li>Prevent fraud and suspicious activities</li>
            <li>Communicate updates, promotions, and service notices</li>
            <li>Process EASY PAY and EASY PURCHASE requests</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>3. Property Verification & Background Checks</h2>
          <p>To maintain trust and safety on the platform, PROP-connect may conduct background checks on listed properties and users. We may verify property ownership, property location, uploaded pictures and videos, agent identity, and submitted documents.</p>
          <p>PROP-connect reserves the right to reject, suspend, or remove any listing or account suspected of fraud, misrepresentation, or illegal activity.</p>

          <h2>4. Sharing Your Information</h2>
          <p><strong>Service Providers:</strong> Companies assisting with hosting, payment processing, analytics, advertising, customer support, and technical services.</p>
          <p><strong>Regulatory or Law Enforcement Authorities:</strong> Where required by law, court order, investigation, or government regulation.</p>
          <p><strong>Buyers, Sellers & Agents:</strong> Information may be shared with users you voluntarily interact with during transactions or property inquiries.</p>

          <h2>4B. Commission & Payout Schedule</h2>
          <p>All verified commissions, referral bonuses, and agent earnings on PROP-connect are processed and paid every Saturday. Payments will only be made after proper verification and approval by the company.</p>
          <p>Agents must ensure that their bank details and payment information are correct before payout processing. PROP-connect reserves the right to delay or suspend payouts undergoing fraud checks, disputes, incomplete documentation, or payment verification issues.</p>
          <p><em>Important Notice:</em> Only transactions completed officially through PROP-connect are eligible for commissions and payouts. Transactions carried out privately outside the platform will not qualify for company payouts, bonuses, protection, or dispute support.</p>

          <h2>5. Data Security</h2>
          <p>PROP-connect implements reasonable technical and organizational measures to protect your personal data from unauthorized access, loss, misuse, alteration, or disclosure. However, no online system is completely secure, and we cannot guarantee absolute security.</p>

          <h2>6. User Responsibilities</h2>
          <p>Users are responsible for providing accurate information, keeping account credentials secure, avoiding private transactions outside the platform, and reporting suspicious activities immediately. Users who bypass PROP-connect payment procedures do so at their own risk.</p>

          <h2>7. Payment Protection & Fraud Prevention</h2>
          <p>All payments relating to properties, commissions, subscriptions, or registrations must be made to the official PROP-connect company account. Payment screenshots or receipts must be sent to PROP-connect management/customer care, and the assigned agent in charge.</p>
          <p>PROP-connect will not be held responsible for losses resulting from direct private payments made outside the platform.</p>

          <h2>8. Refund & Reversal Policy</h2>
          <ul>
            <li>Users requesting a refund or payment reversal must contact PROP-connect within 24 hours of payment.</li>
            <li>Approved refunds may attract a 3% service processing charge.</li>
            <li>Refund requests made after 24 hours may not be approved.</li>
            <li>Refunds only apply to payments made directly to the official company account.</li>
          </ul>

          <h2>9. EASY PAY & EASY PURCHASE Plans</h2>
          <p>PROP-connect may collect and process user information required for rental installment plans under EASY PAY, property installment plans under EASY PURCHASE, and verification and payment scheduling. Additional documentation may be requested before approval.</p>

          <h2>10. Your Rights</h2>
          <p>Under applicable Nigerian data protection laws, users may have the right to access their personal data, correct inaccurate information, request deletion of data, withdraw consent where applicable, and request data portability. Requests can be made through official PROP-connect support channels.</p>

          <h2>11. Data Retention</h2>
          <p>PROP-connect retains user information only for as long as necessary to provide services, resolve disputes, prevent fraud, comply with legal obligations, and enforce company policies.</p>

          <h2>12. Children's Privacy</h2>
          <p>PROP-connect is not intended for individuals under the age of 18. We do not knowingly collect personal information from minors.</p>

          <h2>13. Marketing & Promotional Use</h2>
          <p>By using PROP-connect, users agree that property pictures, property videos, testimonials, success stories, and public business activities may be used by PROP-connect for marketing, advertising, branding, and promotional purposes unless otherwise requested in writing.</p>

          <h2>14. Third-Party Links & Services</h2>
          <p>PROP-connect may contain links to third-party platforms or services such as payment gateways, maps, WhatsApp, social media platforms, or advertising partners. We are not responsible for the privacy practices of third-party services.</p>

          <h2>15. Changes to This Privacy Policy</h2>
          <p>PROP-connect may update this Privacy Policy from time to time. Users will be notified of significant updates through the app, website, email, or official communication channels. Continued use of the platform after updates means acceptance of the revised policy.</p>

          <h2>16. Contact Us</h2>
          <p>For questions, complaints, or privacy-related concerns, contact:</p>
          <div className="mt-2 rounded-lg border border-border bg-muted p-4">
            <p className="font-semibold text-foreground">PROP-connect NG</p>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              <a href="mailto:propconnect0@gmail.com" className="flex items-center gap-2 text-foreground/80 hover:text-foreground">
                <Mail className="h-4 w-4 text-secondary" /> propconnect0@gmail.com
              </a>
              <a href="tel:+2348144954576" className="flex items-center gap-2 text-foreground/80 hover:text-foreground">
                <Phone className="h-4 w-4 text-secondary" /> 08144954576
              </a>
              <a href="https://instagram.com/propconnect2" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground/80 hover:text-foreground">
                <Instagram className="h-4 w-4 text-secondary" /> @propconnect2
              </a>
              <a href="https://tiktok.com/@prop.connect" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground/80 hover:text-foreground">
                <TikTokIcon /> @prop.connect
              </a>
              <a href="https://facebook.com/Prop Connect" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground/80 hover:text-foreground">
                <Facebook className="h-4 w-4 text-secondary" /> Prop Connect
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/terms"><Button variant="outline">View Terms of Use</Button></Link>
            <Link to="/register"><Button>Back to Sign Up</Button></Link>
          </div>
        </article>
      </div>
    </div>
  );
};

export default Privacy;
