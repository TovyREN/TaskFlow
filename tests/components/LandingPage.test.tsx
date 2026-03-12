import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingPage from '../../components/LandingPage';

jest.mock('lucide-react', () => ({
  Layout: (props: any) => <span data-testid="layout-icon" {...props} />,
  Zap: (props: any) => <span data-testid="zap-icon" {...props} />,
  Users: (props: any) => <span data-testid="users-icon" {...props} />,
}));

describe('LandingPage', () => {
  it('renders TaskFlow heading and tagline', () => {
    render(<LandingPage onLoginClick={jest.fn()} onRegisterClick={jest.fn()} />);
    expect(screen.getByText('TaskFlow')).toBeInTheDocument();
    expect(
      screen.getByText(/TaskFlow brings all your tasks, teammates, and tools together/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Keep everything in the same place/)
    ).toBeInTheDocument();
  });

  it('calls onLoginClick when Log in button clicked', () => {
    const onLoginClick = jest.fn();
    render(<LandingPage onLoginClick={onLoginClick} onRegisterClick={jest.fn()} />);
    fireEvent.click(screen.getByText('Log in'));
    expect(onLoginClick).toHaveBeenCalledTimes(1);
  });

  it('calls onRegisterClick when Register button clicked', () => {
    const onRegisterClick = jest.fn();
    render(<LandingPage onLoginClick={jest.fn()} onRegisterClick={onRegisterClick} />);
    fireEvent.click(screen.getByText('Register'));
    expect(onRegisterClick).toHaveBeenCalledTimes(1);
  });
});
