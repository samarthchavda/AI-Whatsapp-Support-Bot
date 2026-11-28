import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Broadcast from './Broadcast';
import api from '../../../services/api';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  getOrders: jest.fn(),
  getAbandonedCarts: jest.fn()
}));

const renderPage = () => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Broadcast />
  </MemoryRouter>
);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('keeps broadcast templates hidden when WhatsApp is disconnected', async () => {
  api.get.mockImplementation((url) => {
    if (url === '/auth/profile') return Promise.resolve({ data: { data: { admin: { whatsappConnected: false } } } });
    if (url === '/whatsapp/connections') return Promise.resolve({ data: { data: [] } });
    return Promise.resolve({ data: { data: [] } });
  });

  renderPage();

  expect(await screen.findByText('Connect WhatsApp to use broadcast templates')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /New Broadcast/ })).toBeDisabled();
  expect(api.get).not.toHaveBeenCalledWith('/whatsapp/templates');
});

test('does not trust a stale connected profile when no usable WhatsApp number remains', async () => {
  api.get.mockImplementation((url) => {
    if (url === '/auth/profile') return Promise.resolve({ data: { data: { admin: { whatsappConnected: true } } } });
    if (url === '/whatsapp/connections') return Promise.resolve({ data: { data: [] } });
    return Promise.resolve({ data: { data: [] } });
  });

  renderPage();

  expect(await screen.findByText('Connect WhatsApp to use broadcast templates')).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalledWith('/whatsapp/templates');
});

test('loads approved templates when connected and clears the form after disconnect', async () => {
  let connected = true;
  api.get.mockImplementation((url) => {
    if (url === '/auth/profile') return Promise.resolve({ data: { data: { admin: { whatsappConnected: connected } } } });
    if (url === '/whatsapp/connections') return Promise.resolve({ data: { data: connected ? [{ phoneNumberId: 'phone-1' }] : [] } });
    if (url === '/whatsapp/templates') return Promise.resolve({ data: { success: true, data: [{ _id: 'template-1', name: 'approved_offer', status: 'APPROVED', category: 'MARKETING', language: 'en_US', components: [] }] } });
    return Promise.resolve({ data: { data: [] } });
  });

  renderPage();
  await waitFor(() => expect(screen.getByRole('button', { name: /New Broadcast/ })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: /New Broadcast/ }));
  expect(await screen.findByRole('option', { name: /approved_offer/ })).toBeInTheDocument();

  connected = false;
  act(() => { window.dispatchEvent(new Event('focus')); });

  expect(await screen.findByText('Connect WhatsApp to use broadcast templates')).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /approved_offer/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /New Broadcast/ })).toBeDisabled();
});

test('syncs approved Meta templates once when the connected account has none locally', async () => {
  let synced = false;
  api.get.mockImplementation((url) => {
    if (url === '/auth/profile') return Promise.resolve({ data: { data: { admin: { whatsappConnected: true } } } });
    if (url === '/whatsapp/connections') return Promise.resolve({ data: { data: [{ phoneNumberId: 'phone-1' }] } });
    if (url === '/whatsapp/templates') return Promise.resolve({ data: { success: true, data: synced ? [{ _id: 'template-1', name: 'meta_offer', status: 'APPROVED', category: 'MARKETING', language: 'en_US', components: [] }] : [] } });
    return Promise.resolve({ data: { data: [] } });
  });
  api.post.mockImplementation(() => { synced = true; return Promise.resolve({ data: { success: true } }); });

  renderPage();
  await waitFor(() => expect(screen.getByRole('button', { name: /New Broadcast/ })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: /New Broadcast/ }));

  expect(await screen.findByRole('option', { name: /meta_offer/ })).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/whatsapp/templates/sync');
  expect(api.post).toHaveBeenCalledTimes(1);
});
