const { CANONICAL_PAGES } = require('../constants/permissions');
const SupportTicket = require('../models/SupportTicket');

describe('Support Ticket Data Model & Permitted Pages Invariants', () => {
  test('Support Center is registered in canonical pages', () => {
    expect(CANONICAL_PAGES.SUPPORT).toBe('support');
  });

  test('SupportTicket schema validates required fields', () => {
    const ticket = new SupportTicket();
    const err = ticket.validateSync();
    expect(err.errors.ticketId).toBeDefined();
    expect(err.errors.admin).toBeDefined();
    expect(err.errors.subject).toBeDefined();
    expect(err.errors.description).toBeDefined();
  });

  test('SupportTicket defaults priority to medium and status to open', () => {
    const ticket = new SupportTicket({
      ticketId: 'TKT-9999',
      admin: '507f191e810c19729de860ea',
      merchantName: 'Test Merchant',
      merchantEmail: 'merchant@test.com',
      subject: 'Integration question',
      description: 'How to connect custom app?'
    });
    expect(ticket.priority).toBe('medium');
    expect(ticket.status).toBe('open');
    expect(ticket.category).toBe('technical');
  });
});
