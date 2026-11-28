import React, { act } from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Templates from './Templates';
import api from '../../../services/api';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() }
}));

const renderPage = () => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Templates admin={{}} />
  </MemoryRouter>
);

beforeEach(() => jest.clearAllMocks());

test('hides template controls and skips template requests without a connected number', async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: { data: [] } }));

  renderPage();

  expect(await screen.findByText('Connect WhatsApp to view templates')).toBeInTheDocument();
  expect(screen.queryByText('Sync from Meta')).not.toBeInTheDocument();
  expect(screen.queryByText('Create Template')).not.toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalledWith('/whatsapp/templates', expect.anything());
});

test('shows connected templates, then hides them when the connection is removed', async () => {
  let connected = true;
  api.get.mockImplementation((url) => {
    if (url === '/whatsapp/connections') return Promise.resolve({ data: { data: connected ? [{ phoneNumberId: 'phone-1', displayPhoneNumber: '+911111111111' }] : [] } });
    if (url === '/whatsapp/templates') return Promise.resolve({ data: { data: [{ _id: 'template-1', name: 'connected_template', category: 'UTILITY', status: 'APPROVED', language: 'en_US', components: [] }] } });
    return Promise.resolve({ data: { data: [] } });
  });

  renderPage();
  expect(await screen.findByText('connected_template')).toBeInTheDocument();

  connected = false;
  act(() => { window.dispatchEvent(new Event('focus')); });

  expect(await screen.findByText('Connect WhatsApp to view templates')).toBeInTheDocument();
  expect(screen.queryByText('connected_template')).not.toBeInTheDocument();
  expect(screen.queryByText('Sync from Meta')).not.toBeInTheDocument();
});

test('imports Meta templates once when a connected number has no saved templates', async () => {
  let synced = false;
  api.get.mockImplementation((url) => {
    if (url === '/whatsapp/connections') return Promise.resolve({ data: { data: [{ phoneNumberId: 'phone-1', displayPhoneNumber: '+911111111111' }] } });
    if (url === '/whatsapp/templates') return Promise.resolve({ data: { data: synced ? [{ _id: 'template-1', name: 'meta_template', category: 'UTILITY', status: 'APPROVED', language: 'en_US', components: [] }] : [] } });
    return Promise.resolve({ data: { data: [] } });
  });
  api.post.mockImplementation(() => { synced = true; return Promise.resolve({ data: { success: true } }); });

  renderPage();

  expect(await screen.findByText('meta_template')).toBeInTheDocument();
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/whatsapp/templates/sync', { phoneNumberId: 'phone-1' }));
  expect(api.post).toHaveBeenCalledTimes(1);
});
