import { Link } from "react-router-dom";
import "../styles/auth.css";

export default function TermsPage() {
  return (
    <div className="auth-screen" style={{ alignItems: "flex-start", padding: "40px 16px" }}>
      <div className="auth-card" style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1>Terms of Service</h1>
        <p className="subtitle">Last updated: 2026</p>

        <TosSection title="1. Acceptance">
          <p>
            By creating an account or using XRA, you agree to these Terms. If you don't agree, don't use the
            service. XRA is a small, independently-run chat service - these terms aren't a substitute for legal
            advice, and if this service grows into something bigger, a real lawyer should review and replace them.
          </p>
        </TosSection>

        <TosSection title="2. Who can use XRA">
          <p>
            You must be at least 13 years old to create an account. By registering, you confirm the information
            you provide is accurate and that you're not violating any law that applies to you by using this
            service.
          </p>
        </TosSection>

        <TosSection title="3. Your account">
          <p>
            You're responsible for your account and everything that happens on it, including keeping your
            password secure. Don't share your login with anyone else, and tell us if you think your account has
            been compromised. One account per person - don't create accounts to evade a ban or impersonate someone
            else.
          </p>
        </TosSection>

        <TosSection title="4. What data we collect">
          <p>To run the service, XRA collects and stores:</p>
          <ul>
            <li>Account info: your username, email address, and a securely hashed password (we never store your actual password)</li>
            <li>Content you send: messages, images and files you upload, server/profile icons, custom statuses and "about me" text</li>
            <li>Technical data: your IP address at signup and login (used for security, abuse prevention, and enforcing bans), and standard connection metadata (timestamps, browser/client info)</li>
            <li>Usage data needed for the app to work: who you're friends with, which servers you're in, your online/idle/DND status, message read state</li>
          </ul>
          <p>
            This data is used only to operate, secure, and moderate XRA. It is not sold, and it is not shared with
            third parties except where required by law. Uploaded files and messages are stored on the server
            infrastructure XRA runs on. Deleting a message or your account removes it from normal use, though
            backups may retain data for a limited period.
          </p>
        </TosSection>

        <TosSection title="5. Acceptable use">
          <p>You agree not to use XRA to:</p>
          <ul>
            <li>Post or share anything illegal, including content that exploits or endangers minors - this is reported to relevant authorities without exception</li>
            <li>Harass, threaten, bully, stalk, or intimidate anyone</li>
            <li>Post hate speech, or content that attacks people based on race, ethnicity, religion, gender, sexual orientation, disability, or similar characteristics</li>
            <li>Share someone's private information without their consent (doxxing)</li>
            <li>Send spam, malware, phishing links, or attempt to compromise other accounts or the service itself</li>
            <li>Impersonate another person, XRA staff, or a server/organization you don't represent</li>
            <li>Upload content that infringes someone else's copyright or other rights</li>
            <li>Use the service to organize or promote violence or illegal activity</li>
          </ul>
        </TosSection>

        <TosSection title="6. Moderation">
          <p>
            Server owners and the roles they assign can moderate their own servers (remove messages, kick, ban,
            time out members). Separately, content or accounts that violate these Terms may be removed, and
            accounts may be suspended or terminated, at any time and without advance notice for serious
            violations.
          </p>
        </TosSection>

        <TosSection title="7. Service availability">
          <p>
            XRA is provided "as is," without warranty of any kind. It may go down, change, or be discontinued at
            any time. To the fullest extent permitted by law, XRA and whoever operates it are not liable for any
            damages arising from your use of, or inability to use, the service.
          </p>
        </TosSection>

        <TosSection title="8. Changes to these Terms">
          <p>
            These Terms may be updated as the service changes. Continuing to use XRA after an update means you
            accept the revised Terms.
          </p>
        </TosSection>

        <TosSection title="9. Contact">
          <p>
            Questions, complaints, or reports about content or conduct on XRA: <a href="mailto:juelzirons@proton.me">juelzirons@proton.me</a>
          </p>
        </TosSection>

        <div className="auth-footer">
          <Link to="/register">Back to Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

function TosSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, color: "var(--header-primary)" }}>{title}</h2>
      <div style={{ color: "var(--text-normal)", fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </section>
  );
}
