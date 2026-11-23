import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import WhatsAppCloudPanel from './WhatsAppCloudPanel';

const handlers = {
  onConnectBusinessApp: jest.fn(),
  onConnectCloudApi: jest.fn(),
  onDisconnect: jest.fn(),
  onReconnect: jest.fn(),
  onRetry: jest.fn(),
  onOpenGuide: jest.fn(),
  onCopyWebhookUrl: jest.fn(),
  onCopyVerifyToken: jest.fn()
};

beforeEach(() => Object.values(handlers).forEach(handler => handler.mockClear()));

test('shows both numbers and disconnects only the selected phone', () => {
  render(<WhatsAppCloudPanel
    {...handlers}
    status={{
      connectionLimit: 3,
      connections: [
        { phoneNumberId: 'phone-a', displayPhoneNumber: '+91 111', businessName: 'First store', isActive: true, isPrimary: true },
        { phoneNumberId: 'phone-b', displayPhoneNumber: '+91 222', businessName: 'Second store', isActive: true, isPrimary: false }
      ]
    }}
    fallbackWebhookUrl="https://example.test/api/webhook/whatsapp"
  />);

  expect(screen.getByText('+91 111')).toBeInTheDocument();
  expect(screen.getByText('+91 222')).toBeInTheDocument();
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect +91 222' }));
  expect(handlers.onDisconnect).toHaveBeenCalledWith('phone-b');
  expect(handlers.onConnectBusinessApp).not.toHaveBeenCalled();
});

test('offers both Meta connection flows and honors the current slot limit', () => {
  const { rerender } = render(<WhatsAppCloudPanel {...handlers} status={{ connectionLimit: 2, connections: [] }} />);
  fireEvent.click(screen.getByRole('button', { name: /Connect Business App number/i }));
  fireEvent.click(screen.getByRole('button', { name: /Connect Cloud API number/i }));
  expect(handlers.onConnectBusinessApp).toHaveBeenCalledTimes(1);
  expect(handlers.onConnectCloudApi).toHaveBeenCalledTimes(1);

  rerender(<WhatsAppCloudPanel {...handlers} status={{ connectionLimit: 2, connections: [
    { phoneNumberId: 'a', isActive: true }, { phoneNumberId: 'b', isActive: true }
  ] }} />);
  expect(screen.getByRole('button', { name: /Connect Business App number/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Connect Cloud API number/i })).toBeDisabled();
  expect(screen.getByText(/All 2 number slots are in use/i)).toBeInTheDocument();
});
