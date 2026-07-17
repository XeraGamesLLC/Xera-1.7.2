import { Link } from "react-router-dom";
import "../styles/auth.css";

export default function TermsPage() {
  return (
    <div className="auth-screen" style={{ alignItems: "flex-start", padding: "40px 16px" }}>
      <div className="auth-card" style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1>Terms of Service</h1>
        <p className="subtitle">Last updated: 2026</p>

        <TosSection title="1. Acceptance of Terms">
          <p>
            By creating an account or otherwise accessing XRA, you agree to be bound by these Terms of Service. If
            you do not agree to these Terms, you may not use the service.
          </p>
        </TosSection>

        <TosSection title="2. Eligibility">
          <p>
            You must be at least 13 years of age to create an account. By registering, you confirm that the
            information you provide is accurate and that your use of the service complies with all laws
            applicable to you.
          </p>
        </TosSection>

        <TosSection title="3. Account Responsibility">
          <p>
            You are responsible for your account and for all activity that occurs on it, including maintaining the
            security of your password. You may not share your login credentials with any other person. You must
            notify us promptly if you believe your account has been compromised. Each individual may maintain only
            one account. Creating additional accounts to evade a ban or to impersonate another user is prohibited.
          </p>
        </TosSection>

        <TosSection title="4. Data We Collect">
          <p>To operate the service, XRA collects and stores the following:</p>
          <ul>
            <li>Account information: your username, email address, and a securely hashed password. Your actual password is never stored.</li>
            <li>Content: messages, images, and files you upload, server and profile icons, custom statuses, and profile information such as your "about me" text.</li>
            <li>Technical information: your IP address at signup and login, used for security, abuse prevention, and enforcement of bans, along with standard connection metadata such as timestamps and client information.</li>
            <li>Usage information required for the service to function: your friends and server memberships, your online status, and message read state.</li>
          </ul>
          <p>
            This data is used solely to operate, secure, and moderate XRA. It is not sold and is not shared with
            third parties except where required by law. Uploaded files and messages are stored on the
            infrastructure that runs the service. Deleting a message or your account removes it from normal use,
            though backups may retain data for a limited period.
          </p>
        </TosSection>

        <TosSection title="5. Acceptable Use">
          <p>You agree not to use XRA to:</p>
          <ul>
            <li>Post or share illegal content of any kind. Content that exploits or endangers minors will be removed immediately and reported to the relevant authorities without exception.</li>
            <li>Harass, threaten, bully, stalk, or intimidate any person.</li>
            <li>Post hate speech or content that attacks people on the basis of race, ethnicity, religion, gender, sexual orientation, disability, or similar characteristics.</li>
            <li>Share another person's private information without their consent.</li>
            <li>Post excessively graphic, violent, or gratuitous content, including gore.</li>
            <li>Send spam, malware, or phishing links, or attempt to compromise other accounts or the service itself.</li>
            <li>Impersonate another person, XRA staff, or an organization you do not represent.</li>
            <li>Upload content that infringes another party's copyright or other rights.</li>
            <li>Use the service to organize or promote violence or other illegal activity.</li>
          </ul>
          <p>
            Illegal content and graphic violent content, including gore, will be removed as soon as it is
            discovered or reported, and the responsible account will be subject to enforcement action, including
            suspension or termination.
          </p>
        </TosSection>

        <TosSection title="6. Moderation and Enforcement">
          <p>
            Server owners and the roles they assign are responsible for moderating their own servers, including
            removing messages and removing or restricting members. Independently of server-level moderation,
            content or accounts that violate these Terms may be removed, and accounts may be suspended or
            terminated at any time, without prior notice, at our sole discretion.
          </p>
        </TosSection>

        <TosSection title="7. User Content and Liability">
          <p>
            Messages, files, and other content posted on XRA are created and shared by users, not by XRA or its
            operator. You are solely responsible for the content you post and for your conduct on the service.
            XRA and its operator are not liable for content posted by users, including content posted in servers,
            channels, or direct messages that they do not directly control or review before it is posted.
          </p>
          <p>
            This does not limit our right to remove content or take action against an account at any time. Illegal
            content and graphic content, including gore, will be removed upon discovery or report.
          </p>
        </TosSection>

        <TosSection title="8. Service Availability">
          <p>
            XRA is provided on an "as is" basis, without warranty of any kind. The service may be interrupted,
            changed, or discontinued at any time. To the fullest extent permitted by law, XRA and its operator are
            not liable for any damages arising from your use of, or inability to use, the service.
          </p>
        </TosSection>

        <TosSection title="9. Changes to These Terms">
          <p>
            These Terms may be updated as the service changes. Continued use of XRA after an update constitutes
            acceptance of the revised Terms.
          </p>
        </TosSection>

        <TosSection title="10. Contact">
          <p>
            Questions, complaints, and reports regarding content or conduct on XRA should be directed to:{" "}
            <a href="mailto:juelzirons@proton.me">juelzirons@proton.me</a>
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
