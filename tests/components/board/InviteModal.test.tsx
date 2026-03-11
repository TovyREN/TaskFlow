import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InviteModal from '../../../components/board/InviteModal';

describe('InviteModal Component', () => {
  const mockOnInvite = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getRoleCard = (labelText: string) => {
    return screen.getByText(labelText).closest('.cursor-pointer');
  };

  it('renders correctly with default values', () => {
    render(<InviteModal onInvite={mockOnInvite} onClose={mockOnClose} />);
    
    expect(screen.getByText('Invite to Board')).toBeInTheDocument();
    
    const memberCard = getRoleCard('Member');
    expect(memberCard).toHaveClass('border-indigo-500');
    expect(memberCard).toHaveClass('bg-indigo-50');
  });

  it('updates email state on change', () => {
    render(<InviteModal onInvite={mockOnInvite} onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText('colleague@example.com') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input.value).toBe('test@example.com');
  });

  it('changes selected role on click', () => {
    render(<InviteModal onInvite={mockOnInvite} onClose={mockOnClose} />);
    
    const adminCard = getRoleCard('Admin');
    const memberCard = getRoleCard('Member');

    fireEvent.click(adminCard!);
    
    expect(adminCard).toHaveClass('border-indigo-500');
    expect(memberCard).not.toHaveClass('border-indigo-500');
  });

  it('calls onInvite and onClose when form is submitted with valid email', () => {
    render(<InviteModal onInvite={mockOnInvite} onClose={mockOnClose} />);
    
    fireEvent.change(screen.getByPlaceholderText('colleague@example.com'), { 
      target: { value: 'boss@company.com' } 
    });
    
    // Select Viewer
    fireEvent.click(getRoleCard('Viewer')!);

    fireEvent.click(screen.getByText('Send Invitation'));

    expect(mockOnInvite).toHaveBeenCalledWith('boss@company.com', 'VIEWER');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not call onInvite if email is empty', () => {
    render(<InviteModal onInvite={mockOnInvite} onClose={mockOnClose} />);
    
    // Try to submit without typing email
    const submitBtn = screen.getByText('Send Invitation');
    fireEvent.submit(submitBtn.closest('form')!);

    expect(mockOnInvite).not.toHaveBeenCalled();
  });

  it('closes the modal when clicking the overlay background', () => {
    const { container } = render(<InviteModal onInvite={mockOnInvite} onClose={mockOnClose} />);
    
    // The fixed inset-0 div is the first child
    const overlay = container.firstChild;
    fireEvent.click(overlay!);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close when clicking the modal content', () => {
    render(<InviteModal onInvite={mockOnInvite} onClose={mockOnClose} />);
    
    // Click the heading inside the modal
    fireEvent.click(screen.getByText('Invite to Board'));
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<InviteModal onInvite={mockOnInvite} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});