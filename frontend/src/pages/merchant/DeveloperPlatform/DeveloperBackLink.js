import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

export default function DeveloperBackLink() {
  return (
    <Link to="/dashboard/developer" className="dev-back-link">
      <FaArrowLeft aria-hidden="true" /> WhatsApp API Connection
    </Link>
  );
}
