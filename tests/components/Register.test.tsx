import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Register from '../../components/Register';
import { registerUser } from '../../app/actions/authActions';
import { meetsMinimumRequirements } from '../../lib/passwordValidation';
import '@testing-library/jest-dom';

jest.mock('../../app/actions/authActions', () => ({ registerUser: jest.fn() }));
jest.mock('../../lib/passwordValidation', () => ({ meetsMinimumRequirements: jest.fn() }));
jest.mock('../../components/PasswordStrengthIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="password-strength" />,
}));

describe('Register Component', () => {
  const mockOnSwitchToLogin = jest.fn();
  const mockOnRegisterSuccess = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (meetsMinimumRequirements as jest.Mock).mockReturnValue(true);
  });

  const fillForm = () => {
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/mot de passe/i), { target: { value: 'StrongPass1!' } });
  };

  it('renders form fields and Sign Up button', () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} onRegisterSuccess={mockOnRegisterSuccess} />);

    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByText(/mot de passe/i)).toBeInTheDocument();
  });

  it('calls onRegisterSuccess on successful registration', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@test.com' };
    (registerUser as jest.Mock).mockResolvedValue({ success: true, user: mockUser });

    render(<Register onSwitchToLogin={mockOnSwitchToLogin} onRegisterSuccess={mockOnRegisterSuccess} />);
    fillForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    await waitFor(() => {
      expect(mockOnRegisterSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('shows error message when registration fails', async () => {
    (registerUser as jest.Mock).mockResolvedValue({ success: false, error: 'Email already exists' });

    render(<Register onSwitchToLogin={mockOnSwitchToLogin} onRegisterSuccess={mockOnRegisterSuccess} />);
    fillForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    const errorMessage = await screen.findByText('Email already exists');
    expect(errorMessage).toBeInTheDocument();
  });

  it('shows password error when password does not meet minimum requirements', async () => {
    (meetsMinimumRequirements as jest.Mock).mockReturnValue(false);

    render(<Register onSwitchToLogin={mockOnSwitchToLogin} onRegisterSuccess={mockOnRegisterSuccess} />);
    fillForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    expect(screen.getByText(/ne répond pas aux exigences minimales/i)).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('calls onSwitchToLogin when Log In link is clicked', () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} onRegisterSuccess={mockOnRegisterSuccess} />);

    fireEvent.click(screen.getByText(/log in/i));
    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });

  it('shows back button when onBack is provided and calls it on click', () => {
    render(<Register onSwitchToLogin={mockOnSwitchToLogin} onRegisterSuccess={mockOnRegisterSuccess} onBack={mockOnBack} />);

    const backButton = screen.getByText(/back to home/i);
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('clears password error when user types in password field', async () => {
    (meetsMinimumRequirements as jest.Mock).mockReturnValue(false);

    render(<Register onSwitchToLogin={mockOnSwitchToLogin} onRegisterSuccess={mockOnRegisterSuccess} />);
    fillForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    expect(screen.getByText(/ne répond pas aux exigences minimales/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/mot de passe/i), { target: { value: 'NewPassword1!' } });

    expect(screen.queryByText(/ne répond pas aux exigences minimales/i)).not.toBeInTheDocument();
  });
});
