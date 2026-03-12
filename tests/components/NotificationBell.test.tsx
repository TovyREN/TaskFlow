import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NotificationBell from '../../components/NotificationBell';
import { getUnreadNotificationCount } from '../../app/actions/notificationActions';
import { useSocket } from '../../components/SocketProvider';
import '@testing-library/jest-dom';

jest.mock('../../app/actions/notificationActions', () => ({
  getUnreadNotificationCount: jest.fn(),
}));

const mockOn = jest.fn();
const mockOff = jest.fn();

jest.mock('../../components/SocketProvider', () => ({
  useSocket: jest.fn(() => ({
    on: mockOn,
    off: mockOff,
    isConnected: true,
  })),
}));

describe('NotificationBell Component', () => {
  const mockOnClick = jest.fn();
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (getUnreadNotificationCount as jest.Mock).mockResolvedValue(0);
  });

  it('renders bell button with Notifications title', async () => {
    await act(async () => {
      render(<NotificationBell userId={userId} onClick={mockOnClick} />);
    });

    const button = screen.getByTitle('Notifications');
    expect(button).toBeInTheDocument();
  });

  it('shows badge with unread count when count > 0', async () => {
    (getUnreadNotificationCount as jest.Mock).mockResolvedValue(5);

    await act(async () => {
      render(<NotificationBell userId={userId} onClick={mockOnClick} />);
    });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('shows 99+ when unread count exceeds 99', async () => {
    (getUnreadNotificationCount as jest.Mock).mockResolvedValue(150);

    await act(async () => {
      render(<NotificationBell userId={userId} onClick={mockOnClick} />);
    });

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  it('resets count to 0 and calls onClick when clicked', async () => {
    (getUnreadNotificationCount as jest.Mock).mockResolvedValue(5);

    await act(async () => {
      render(<NotificationBell userId={userId} onClick={mockOnClick} />);
    });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Notifications'));
    });

    expect(mockOnClick).toHaveBeenCalled();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('hides badge when unread count is 0', async () => {
    (getUnreadNotificationCount as jest.Mock).mockResolvedValue(0);

    await act(async () => {
      render(<NotificationBell userId={userId} onClick={mockOnClick} />);
    });

    await waitFor(() => {
      expect(getUnreadNotificationCount).toHaveBeenCalledWith(userId);
    });

    const badge = screen.queryByText('0');
    expect(badge).not.toBeInTheDocument();
  });

  it('registers socket listener when connected', async () => {
    await act(async () => {
      render(<NotificationBell userId={userId} onClick={mockOnClick} />);
    });

    expect(mockOn).toHaveBeenCalledWith('notification:new', expect.any(Function));
  });
});
