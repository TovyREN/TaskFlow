import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../../components/Header';

jest.mock('../../components/NotificationBell', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-bell" />,
}));

const mockUser = { id: 'u1', name: 'Alice', email: 'alice@test.com' };

describe('Header', () => {
  it('renders TaskFlow title and user name initial', () => {
    render(<Header user={mockUser} onLogout={jest.fn()} />);
    expect(screen.getByText('TaskFlow')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('calls onLogout when Logout button clicked', () => {
    const onLogout = jest.fn();
    render(<Header user={mockUser} onLogout={onLogout} />);
    fireEvent.click(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('calls onLogoClick when logo clicked', () => {
    const onLogoClick = jest.fn();
    render(<Header user={mockUser} onLogout={jest.fn()} onLogoClick={onLogoClick} />);
    fireEvent.click(screen.getByText('TaskFlow'));
    expect(onLogoClick).toHaveBeenCalledTimes(1);
  });

  it('shows NotificationBell when onNotificationsClick is provided', () => {
    render(
      <Header user={mockUser} onLogout={jest.fn()} onNotificationsClick={jest.fn()} />
    );
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('hides NotificationBell when onNotificationsClick is NOT provided', () => {
    render(<Header user={mockUser} onLogout={jest.fn()} />);
    expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
  });
});
