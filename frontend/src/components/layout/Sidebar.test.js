import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

jest.mock('../../context/EffectiveAccessContext', () => ({
  useEffectiveAccess: () => ({ canViewPage: () => true })
}));

function MerchantSidebarHarness() {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Sidebar
        admin={{ role: 'merchant', name: 'Test Merchant', email: 'merchant@example.test' }}
        isOpen={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        onToggle={() => setOpen(value => !value)}
        onLogout={() => {}}
      />
    </MemoryRouter>
  );
}

test('merchant sidebar opens on mouse hover and closes after navigation', () => {
  const { container } = render(<MerchantSidebarHarness />);
  const sidebar = container.querySelector('.sidebar');
  expect(sidebar).not.toHaveClass('sidebar-expanded');

  fireEvent.mouseEnter(sidebar);
  expect(sidebar).toHaveClass('sidebar-expanded');
  expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute('aria-expanded', 'true');

  fireEvent.click(screen.getByRole('link', { name: /Chat/i }));
  expect(sidebar).not.toHaveClass('sidebar-expanded');
});

test('merchant sidebar can be opened and closed by keyboard accessible controls', () => {
  const { container } = render(<MerchantSidebarHarness />);
  const sidebar = container.querySelector('.sidebar');
  fireEvent.focus(screen.getByRole('button', { name: 'Expand sidebar' }));
  expect(sidebar).toHaveClass('sidebar-expanded');
  fireEvent.click(screen.getByRole('button', { name: 'Close sidebar' }));
  expect(sidebar).not.toHaveClass('sidebar-expanded');
});
