import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LiveChat from './LiveChat';
import { getConversations, getConversationById, syncChatHistory } from '../../../services/api';

jest.mock('socket.io-client', () => () => ({
  on: jest.fn(),
  disconnect: jest.fn()
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  getConversations: jest.fn(),
  getConversationById: jest.fn(),
  getConversationsByPhone: jest.fn(),
  sendConversationMessage: jest.fn(),
  updateConversation: jest.fn(),
  syncChatHistory: jest.fn()
}));

beforeEach(() => {
  jest.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

test('renders only conversations with chat history and ignores contact-only records', async () => {
  const realChat = {
    _id: 'chat-1',
    customerName: 'Asha Patel',
    customerPhone: '919876543210',
    status: 'active',
    updatedAt: '2026-11-28T15:00:00.000Z',
    messages: [{ _id: 'msg-1', role: 'user', content: 'Where is my order?', timestamp: '2026-11-28T15:00:00.000Z' }]
  };
  const syncedContactOnly = {
    _id: 'contact-only-1',
    customerName: 'Phonebook Contact',
    customerPhone: '919999999999',
    status: 'active',
    syncedFromWhatsAppApp: true,
    updatedAt: '2026-11-28T15:05:00.000Z',
    messages: []
  };

  getConversations.mockResolvedValue({ data: { conversations: [syncedContactOnly, realChat] } });
  getConversationById.mockResolvedValue({ data: realChat });

  render(<LiveChat />);

  await waitFor(() => {
    expect(screen.getAllByText('Asha Patel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Where is my order?').length).toBeGreaterThan(0);
  });
  expect(screen.queryByText('Phonebook Contact')).not.toBeInTheDocument();
  expect(screen.getByText('1 active · 0 escalated · 1 total')).toBeInTheDocument();
});

test('allows triggering WhatsApp Business App chat history sync from Live Chat', async () => {
  getConversations.mockResolvedValue({ data: { conversations: [] } });
  syncChatHistory.mockResolvedValue({ data: { success: true, message: 'Chat history sync started.' } });

  render(<LiveChat />);

  const syncButton = await screen.findByRole('button', { name: /Sync Chat History/i });
  fireEvent.click(syncButton);

  await waitFor(() => expect(syncChatHistory).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('Chat history sync started.')).toBeInTheDocument();
});
