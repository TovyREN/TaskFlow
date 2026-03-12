import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserSettings from '../../components/UserSettings';

describe('UserSettings', () => {
  it('renders the heading and placeholder text', () => {
    render(<UserSettings />);

    expect(screen.getByText('User Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile customization coming soon.')).toBeInTheDocument();
  });

  it('renders inside a styled container', () => {
    const { container } = render(<UserSettings />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('p-4', 'bg-white', 'rounded-lg', 'shadow');
  });
});
