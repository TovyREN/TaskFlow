import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Login from '../../components/Login'; 
import { loginUser } from '../../app/actions/authActions';
import '@testing-library/jest-dom';

// 1. Mock the Server Action
jest.mock('../../app/actions/authActions', () => ({
  loginUser: jest.fn(),
}));

// 2. Mock Next/Script
jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ onLoad }: any) => {
    require('react').useEffect(() => {
      if (onLoad) onLoad();
    }, [onLoad]);
    return null;
  },
}));

// 3. Mock GoogleLoginButton
jest.mock('../../components/GoogleLoginButton', () => ({
  __esModule: true,
  default: ({ onLogin }: any) => (
    <button data-testid="google-btn" onClick={() => onLogin({ id: 'google-123' })}>
      Google Login
    </button>
  ),
}));

describe('Login Component', () => {
  const mockOnLogin = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fillForm = () => {
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });
  };

  it('updates email and password fields on change', () => {
    render(<Login onLogin={mockOnLogin} />);
    fillForm();
    expect((screen.getByPlaceholderText(/you@example.com/i) as HTMLInputElement).value).toBe('test@test.com');
  });

  it('submits successfully and calls onLogin', async () => {
    (loginUser as jest.Mock).mockResolvedValue({
      success: true,
      user: { id: '123', email: 'test@test.com' },
    });

    render(<Login onLogin={mockOnLogin} />);
    fillForm();
    
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({ id: '123', email: 'test@test.com' });
    });
  });

  it('shows error message when login fails', async () => {
    // Force the failure response
    (loginUser as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Invalid credentials',
    });

    render(<Login onLogin={mockOnLogin} />);
    fillForm(); // Crucial: fill the form so submission isn't blocked

    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Use findByText which polls the DOM
    const errorMessage = await screen.findByText('Invalid credentials');
    expect(errorMessage).toBeInTheDocument();
  });

  it('handles generic error if no error message is provided', async () => {
    (loginUser as jest.Mock).mockResolvedValueOnce({ success: false }); 

    render(<Login onLogin={mockOnLogin} />);
    fillForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    const errorMessage = await screen.findByText('Something went wrong');
    expect(errorMessage).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', () => {
    render(<Login onLogin={mockOnLogin} onBack={mockOnBack} />);
    fireEvent.click(screen.getByText(/Back to Home/i));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('triggers Google login callback', () => {
    render(<Login onLogin={mockOnLogin} />);
    fireEvent.click(screen.getByTestId('google-btn'));
    expect(mockOnLogin).toHaveBeenCalledWith({ id: 'google-123' });
  });

  it('shows loading state when Google script is not yet loaded', () => {
    // Mocking the script loader to stay in "loading" state
    const Script = require('next/script');
    jest.spyOn(Script, 'default').mockImplementation(() => null);

    render(<Login onLogin={mockOnLogin} />);
    expect(screen.getByText(/Connecting to Google\.\.\./i)).toBeInTheDocument();
  });
});