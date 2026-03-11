import { render, screen, act } from '@testing-library/react';
import GoogleLoginButton from '../../components/GoogleLoginButton';

describe('GoogleLoginButton', () => {
  const mockOnLogin = jest.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.useFakeTimers();
    
    // Mock the global google object
    (window as any).google = {
      accounts: {
        id: {
          initialize: jest.fn(),
          renderButton: jest.fn(),
        },
      },
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders error message when NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<GoogleLoginButton onLogin={mockOnLogin} />);

    expect(screen.getByText(/NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing/i)).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith("NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing!");
    
    consoleSpy.mockRestore();
  });

  it('initializes and renders the button when Google SDK is loaded', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
    
    render(<GoogleLoginButton onLogin={mockOnLogin} />);

    // Fast-forward the interval
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(window.google.accounts.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id' })
    );
    expect(window.google.accounts.id.renderButton).toHaveBeenCalled();
  });

  it('calls onLogin when the Google callback is triggered', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
    let capturedCallback: (res: any) => void = () => {};

    // Capture the callback passed to initialize
    (window.google.accounts.id.initialize as jest.Mock).mockImplementation((config) => {
      capturedCallback = config.callback;
    });

    render(<GoogleLoginButton onLogin={mockOnLogin} />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Simulate Google calling the callback
    const mockResponse = { credential: 'xyz123' };
    act(() => {
      capturedCallback(mockResponse);
    });

    expect(mockOnLogin).toHaveBeenCalledWith(mockResponse);
  });

  it('clears interval on unmount', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    
    const { unmount } = render(<GoogleLoginButton onLogin={mockOnLogin} />);
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});