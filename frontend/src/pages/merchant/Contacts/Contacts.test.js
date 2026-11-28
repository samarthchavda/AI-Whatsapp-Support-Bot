import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Contacts from './Contacts';
import api from '../../../services/api';

jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const renderPage = (admin) => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Contacts admin={admin} /></MemoryRouter>);

beforeEach(() => jest.clearAllMocks());

test('Starter cannot fetch or view Growth contacts', () => {
  renderPage({ subscriptionPlan: 'starter', subscriptionStatus: 'active' });
  expect(screen.getByText('Contacts are in the Growth Plan')).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
});

test('active Growth merchant sees synced WhatsApp contacts', async () => {
  api.get.mockResolvedValue({ data: { data: [{ _id: 'contact-1', customerName: 'Pablo Morales', customerPhone: '16505559876', syncedFromWhatsAppApp: true }], total: 1 } });
  renderPage({ subscriptionPlan: 'growth', subscriptionStatus: 'active', whatsappConnected: true });
  expect(await screen.findByText('Pablo Morales')).toBeInTheDocument();
  expect(screen.getByText('WhatsApp Business App')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/contacts', { params: { page: 1, search: '' } });
});

test('connected Growth merchant can request an asynchronous Business App sync', async () => {
  api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  api.post.mockResolvedValue({ data: { message: 'Contact sync started.' } });
  renderPage({ subscriptionPlan: 'growth', subscriptionStatus: 'active', whatsappConnected: true });
  fireEvent.click(screen.getByRole('button', { name: 'Sync Business App contacts' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/contacts/sync'));
  expect(await screen.findByText('Contact sync started.')).toBeInTheDocument();
});
