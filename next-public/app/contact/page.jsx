import Link from 'next/link';
import { FaArrowRight, FaEnvelope, FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';

export default function ContactPage() {
  return (
    <div className="page">
      <main className="container contact-shell">
        <div className="contact-heading">
          <span className="eyebrow">Contact us</span>
          <h1>Talk to the Kwickbot team</h1>
          <p>Questions about WhatsApp setup, store integrations, pricing or an existing account? Reach us through the channel that works for you.</p>
        </div>
        <div className="contact-options">
          <a className="contact-option" href="mailto:hello@kwickbot.in">
            <span className="contact-icon"><FaEnvelope aria-hidden="true" /></span>
            <span><strong>Email us</strong><small>For product, billing and technical questions</small><b>hello@kwickbot.in</b></span>
            <FaArrowRight aria-hidden="true" />
          </a>
          <a className="contact-option" href="https://wa.me/918128420287" target="_blank" rel="noopener noreferrer">
            <span className="contact-icon"><FaWhatsapp aria-hidden="true" /></span>
            <span><strong>WhatsApp</strong><small>Chat with our team</small><b>+91 81284 20287</b></span>
            <FaArrowRight aria-hidden="true" />
          </a>
          <a className="contact-option" href="tel:+918128420287">
            <span className="contact-icon"><FaPhoneAlt aria-hidden="true" /></span>
            <span><strong>Call us</strong><small>Speak to a person about your setup</small><b>+91 81284 20287</b></span>
            <FaArrowRight aria-hidden="true" />
          </a>
        </div>
        <section className="contact-signup">
          <div><h2>Ready to get started?</h2><p>Create your account and set up your business when you are ready.</p></div>
          <Link href="/signup" className="btn btn-primary">Create account <FaArrowRight aria-hidden="true" /></Link>
        </section>
      </main>
    </div>
  );
}
