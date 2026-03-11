import React from 'react';
import { render, screen } from '@testing-library/react';
import PasswordStrengthIndicator from '../../components/PasswordStrengthIndicator';
import { validatePasswordStrength } from '../../lib/passwordValidation';

jest.mock('../../lib/passwordValidation', () => ({
  validatePasswordStrength: jest.fn(),
}));

const mockedValidate = validatePasswordStrength as jest.MockedFunction<typeof validatePasswordStrength>;

describe('PasswordStrengthIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.innerHTML).toBe('');
  });

  it('shows progress bar and label with feedback messages (weak password)', () => {
    mockedValidate.mockReturnValue({
      percentage: 25,
      color: '#ef4444',
      label: 'Weak',
      feedback: ['Add uppercase letters', 'Add numbers'],
    });
    render(<PasswordStrengthIndicator password="abc" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
    expect(screen.getByText('Add uppercase letters')).toBeInTheDocument();
    expect(screen.getByText('Add numbers')).toBeInTheDocument();
  });

  it('shows success message when feedback is empty (strong password)', () => {
    mockedValidate.mockReturnValue({
      percentage: 100,
      color: '#22c55e',
      label: 'Strong',
      feedback: [],
    });
    render(<PasswordStrengthIndicator password="Str0ng!Pass" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
    expect(screen.getByText('Mot de passe fort !')).toBeInTheDocument();
  });

  it('hides feedback when showFeedback is false', () => {
    mockedValidate.mockReturnValue({
      percentage: 25,
      color: '#ef4444',
      label: 'Weak',
      feedback: ['Add uppercase letters'],
    });
    render(<PasswordStrengthIndicator password="abc" showFeedback={false} />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
    expect(screen.queryByText('Add uppercase letters')).not.toBeInTheDocument();
  });

  it('shows feedback list items with bullet points', () => {
    mockedValidate.mockReturnValue({
      percentage: 50,
      color: '#f59e0b',
      label: 'Fair',
      feedback: ['Add special characters', 'Make it longer'],
    });
    render(<PasswordStrengthIndicator password="Abc12" />);
    const bullets = screen.getAllByText('\u2022');
    expect(bullets).toHaveLength(2);
    expect(screen.getByText('Add special characters')).toBeInTheDocument();
    expect(screen.getByText('Make it longer')).toBeInTheDocument();
  });
});
