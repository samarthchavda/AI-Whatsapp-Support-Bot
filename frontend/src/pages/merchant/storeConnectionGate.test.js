import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Products from './Products/Products';
import AbandonedCarts from './AbandonedCarts/AbandonedCarts';
import api, { getAbandonedCarts, getAbandonedCartStats } from '../../services/api';
import { fetchStoreConnections } from '../../services/storeConnections';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  getAbandonedCarts: jest.fn(),
  getAbandonedCartStats: jest.fn(),
  sendAbandonedCartReminder: jest.fn()
}));
jest.mock('../../services/storeConnections', () => ({ fetchStoreConnections: jest.fn() }));

const renderPage = (page) => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{page}</MemoryRouter>);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('Products asks for Shopify before loading or showing the catalog', async () => {
  fetchStoreConnections.mockResolvedValue({ shopify: null, woocommerce: { isActive: true } });

  renderPage(<Products />);

  expect(await screen.findByText('Connect Shopify to view products')).toBeInTheDocument();
  expect(screen.getByText(/WooCommerce store is connected/)).toBeInTheDocument();
  expect(screen.queryByText(/Active Products Synced/)).not.toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
});

test('Abandoned Carts does not fetch carts or statistics before Shopify is connected', async () => {
  fetchStoreConnections.mockResolvedValue({ shopify: null, woocommerce: null });

  renderPage(<AbandonedCarts admin={{ subscriptionPlan: 'growth' }} />);

  expect(await screen.findByText('Connect Shopify to view abandoned carts')).toBeInTheDocument();
  expect(getAbandonedCarts).not.toHaveBeenCalled();
  expect(getAbandonedCartStats).not.toHaveBeenCalled();
});

test('Abandoned Carts loads data after an active Shopify connection is confirmed', async () => {
  fetchStoreConnections.mockResolvedValue({ shopify: { isActive: true }, woocommerce: null });
  getAbandonedCarts.mockResolvedValue({ data: { success: true, carts: [], total: 0, totalPages: 1 } });
  getAbandonedCartStats.mockResolvedValue({ data: { success: true, stats: { totalCarts: 0, recoveryRate: 0, recoveredRevenue: 0, recoveredCarts: 0, abandonedRevenue: 0, abandonedCarts: 0, reminderSentCarts: 0 } } });

  renderPage(<AbandonedCarts admin={{ subscriptionPlan: 'growth' }} />);

  await waitFor(() => expect(getAbandonedCarts).toHaveBeenCalledTimes(1));
  expect(getAbandonedCartStats).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('No Abandoned Carts Found')).toBeInTheDocument();
});

test('Products reports a failed catalog sync instead of showing success', async () => {
  fetchStoreConnections.mockResolvedValue({ shopify: { isActive: true }, woocommerce: null });
  api.get.mockResolvedValue({ data: { success: true, data: [], productLeadsCount: 0 } });
  api.post.mockRejectedValue({ response: { data: { error: 'Shopify token expired' } } });

  renderPage(<Products />);
  fireEvent.click(await screen.findByRole('button', { name: /Sync Products Now/ }));

  expect(await screen.findByText('Shopify token expired')).toBeInTheDocument();
  expect(screen.queryByText(/successfully synced/)).not.toBeInTheDocument();
});
