import { render, screen, act, waitFor } from '@testing-library/react';
import GoogleLoginButton from '../../components/GoogleLoginButton';

// 1. Mock Next.js Script component
jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ onLoad }: { onLoad: () => void }) => {
    // Simulate script loading immediately in tests
    useEffect(() => {
      onLoad();
    }, [onLoad]);
    return <div data-testid="next-script" />;
  },
}));

// 2. Mock the Server Action
jest.mock('@/app/actions/authActions', () => ({
  loginWithGoogle: jest.fn(),
}));

import { loginWithGoogle } from '@/app/actions/authActions';
import { useEffect } from 'react';

describe('GoogleLoginButton', () => {
  const mockOnLogin = jest.fn();
  const mockOnError = jest.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // Mock global google object
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
    jest.clearAllMocks();
  });

  it('logs error to console when NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing', () => {
    // Remove env var
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<GoogleLoginButton onLogin={mockOnLogin} onError={mockOnError} />);

    // In the new component, we log "GSI_ERROR: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing."
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("GSI_ERROR"));
    consoleSpy.mockRestore();
  });

  it('initializes and renders the button when Google SDK is loaded', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
    
    render(<GoogleLoginButton onLogin={mockOnLogin} />);

    await waitFor(() => {
      expect(window.google.accounts.id.initialize).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: 'test-client-id' })
      );
      expect(window.google.accounts.id.renderButton).toHaveBeenCalled();
    });
  });

  it('calls onLogin when the Google callback succeeds', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
    const mockUser = { id: '1', name: 'Test User' };
    (loginWithGoogle as jest.Mock).mockResolvedValue({ success: true, user: mockUser });

    let capturedCallback: (res: any) => void = () => {};
    (window.google.accounts.id.initialize as jest.Mock).mockImplementation((config) => {
      capturedCallback = config.callback;
    });

    render(<GoogleLoginButton onLogin={mockOnLogin} />);

    await act(async () => {
      await capturedCallback({ credential: 'valid_token' });
    });

    expect(loginWithGoogle).toHaveBeenCalledWith('valid_token');
    expect(mockOnLogin).toHaveBeenCalledWith(mockUser);
  });

  it('calls onError when the Server Action fails', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
    (loginWithGoogle as jest.Mock).mockResolvedValue({ success: false, error: 'Database error' });

    let capturedCallback: (res: any) => void = () => {};
    (window.google.accounts.id.initialize as jest.Mock).mockImplementation((config) => {
      capturedCallback = config.callback;
    });

    render(<GoogleLoginButton onLogin={mockOnLogin} onError={mockOnError} />);

    await act(async () => {
      await capturedCallback({ credential: 'bad_token' });
    });

    expect(mockOnError).toHaveBeenCalledWith('Database error');
  });
});