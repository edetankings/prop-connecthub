import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <img src={logo} alt="PROP-connect" className="h-10 w-10 rounded-lg object-contain" />
          <span className="font-display font-bold text-foreground">PROP-connect</span>
        </Link>
        <article className="rounded-xl border border-border bg-card p-6 sm:p-10 shadow-elevated prose prose-sm max-w-none dark:prose-invert">
          <h1 className="font-display text-2xl font-bold">PROP-connect Terms of Use</h1>
          <p className="text-muted-foreground"><em>Effective Date: [Insert Date]</em></p>

          <p>Welcome to PROP-connect, a real estate and property networking platform designed to connect property buyers, sellers, renters, agents, and affiliates across Nigeria.</p>
          <p>By using PROP-connect, you agree to these Terms of Use. If you do not agree, please do not use the platform.</p>

          <h2>1. Eligibility</h2>
          <p>To use PROP-connect, you must:</p>
          <ul>
            <li>Be at least 18 years old.</li>
            <li>Provide accurate and truthful information during registration.</li>
            <li>Agree to comply with all company policies and Nigerian laws.</li>
          </ul>

          <h2>2. User Accounts</h2>
          <ul>
            <li>Users are responsible for maintaining the confidentiality of their account information.</li>
            <li>Any activity carried out through your account is your responsibility.</li>
            <li>PROP-connect reserves the right to suspend or terminate accounts involved in suspicious, fraudulent, or illegal activities.</li>
          </ul>

          <h2>3. Registration Fee</h2>
          <p>All agents, affiliates, or partners joining PROP-connect are required to pay a non-refundable registration fee of ₦7,500. Registration becomes active only after payment confirmation by the company.</p>

          <h2>4. Agent Referral & Commission Structure</h2>
          <p>Registered PROP-connect agents and affiliates may earn through the following system:</p>
          <ul>
            <li><strong>Referral Bonus:</strong> Agents earn ₦2,000 for every successful referral who signs up on the platform.</li>
            <li><strong>Sales Commission:</strong> Agents earn 10% commission on properties they successfully sell through PROP-connect.</li>
            <li><strong>Downline Rental Bonus:</strong> Agents earn a ₦10,000 flat fee when a referred agent (downline) successfully rents a property through the platform.</li>
            <li><strong>Downline Sales Bonus:</strong> Agents earn a ₦50,000 flat fee when a referred agent (downline) successfully sells a property through the platform.</li>
          </ul>
          <p>All commissions, bonuses, and payouts are subject to company verification and approval.</p>

          <h2>5. Payments & Transaction Policy</h2>
          <p>All payments relating to properties, commissions, registration, or services must be made directly to the official PROP-connect company account. PROP-connect handles all payments for security, verification, and scrutiny purposes.</p>
          <p>Buyers, renters, sellers, and agents are strongly advised not to make private or direct payments outside the platform.</p>
          <p><strong>Payment Verification:</strong> After every payment, proof of payment or screenshot must be sent to the official PROP-connect management/account department, and the agent in charge of the transaction. Transactions will only be verified after confirmation by the company.</p>

          <h2>5B. Refund & Reversal Policy</h2>
          <ul>
            <li>A buyer, renter, or client who wishes to cancel a transaction and request a refund must notify PROP-connect officially within 24 hours of making payment.</li>
            <li>Refund requests made after 24 hours may not be considered by the company.</li>
            <li>All refund or reversal requests must be submitted in writing to the official PROP-connect support or management channel with valid proof of payment.</li>
            <li><strong>Service Charge Deduction:</strong> Approved refunds will attract a 3% service charge deduction from the total amount paid for administrative, processing, and verification purposes.</li>
            <li>The remaining balance will be refunded to the customer after proper verification by the company.</li>
          </ul>
          <p><em>Important Notice:</em> PROP-connect reserves the right to investigate all refund requests before approval. Refunds will only apply to payments made directly to the official company account. Payments made privately to agents or third parties outside the platform are not eligible for refund or reversal by PROP-connect.</p>

          <h2>6. Buyer–Seller & Agent Interactions</h2>
          <p>PROP-connect only facilitates communication and property connections between parties. PROP-connect is not directly involved in private agreements made outside the platform.</p>
          <p><em>Important Notice:</em> PROP-connect will not be held responsible or accountable if a buyer or client pays money directly to an agent outside the company process, an agent bypasses the platform, or any user takes business outside PROP-connect and later complains of fraud, scam, or financial loss.</p>

          <h2>6B. Property Renewal & Flexible Payment Packages</h2>
          <p><strong>Property Renewal Policy:</strong> Any property rented through PROP-connect must not be renewed privately outside the platform. All rental renewals for properties originally gotten through PROP-connect must be processed officially through the platform. Failure to renew through PROP-connect may lead to account restriction, suspension, or loss of platform benefits.</p>
          <p><strong>EASY PAY Package (Rental Installment Plan):</strong> Eligible tenants may split their rent payment into 3-time payments, or 6-time payments. Approval for EASY PAY is subject to company review, verification, and agreement terms.</p>
          <p><strong>EASY PURCHASE Package (Property Ownership Installment Plan):</strong> A buyer may secure a property by first paying an agreed percentage of the property value. The remaining balance can then be spread across monthly installment payments based on company-approved terms.</p>

          <h2>7. Listings & Property Content</h2>
          <ul>
            <li>All property listings and information submitted must be genuine and lawful.</li>
            <li>Fake, misleading, duplicated, or fraudulent property listings are prohibited.</li>
            <li>PROP-connect reserves the right to remove, edit, suspend, or block any listing without prior notice.</li>
          </ul>

          <h2>7B. Property Listing Requirements & Verification</h2>
          <p>Every property listed on PROP-connect must include clear and accurate property pictures, a video of the property, correct property description and details, and the exact property location linked or matched to the appropriate map for easy access and verification.</p>
          <p>PROP-connect reserves the right to conduct background checks and verification on all properties listed on the platform, including ownership confirmation, property inspection, location verification, documentation review, and fraud prevention checks.</p>

          <h2>8. Prohibited Activities</h2>
          <p>Users must not engage in fraud or scam-related activities, post false property information, impersonate another person or company, divert clients or transactions outside the platform for dishonest purposes, or use PROP-connect for illegal activities.</p>
          <p>Violation of these rules may lead to account suspension, termination, or legal action.</p>

          <h2>9. Limitation of Liability</h2>
          <p>PROP-connect is provided "as is" without warranties of any kind. PROP-connect shall not be liable for loss of money caused by private dealings outside the platform, misconduct between users, delayed payments caused by incorrect information, or any damages resulting from misuse of the platform.</p>

          <h2>10. Termination</h2>
          <p>PROP-connect reserves the right to suspend, restrict, or permanently terminate any account that violates these Terms of Use or company policies.</p>

          <h2>11. Governing Law</h2>
          <p>These Terms are governed by the laws of the Federal Republic of Nigeria.</p>

          <h2>12. Changes to Terms</h2>
          <p>PROP-connect may update these Terms from time to time. Continued use of the platform after updates means you accept the revised Terms.</p>

          <h2>13. Contact Us</h2>
          <p>For questions, complaints, or support, contact:<br/>
          <strong>PROP-connect NG</strong><br/>
          Email: [Insert Company Email]<br/>
          Phone/WhatsApp: [Insert Company Number]</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/privacy"><Button variant="outline">View Privacy Policy</Button></Link>
            <Link to="/register"><Button>Back to Sign Up</Button></Link>
          </div>
        </article>
      </div>
    </div>
  );
};

export default Terms;
