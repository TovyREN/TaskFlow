"use client";

import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkspaceView from '../../components/WorkspaceView';
import * as workspaceActions from '../../app/actions/workspaceActions';
import { SocketProvider } from '../../components/SocketProvider';

// --- Mocks ---
jest.mock('../../app/actions/workspaceActions', () => ({
  getWorkspaceDetails: jest.fn(),
  getUserRole: jest.fn(),
  createBoardInWorkspace: jest.fn(),
  deleteBoardFromWorkspace: jest.fn(),
}));

const socketCallbacks: Record<string, Function> = {};
jest.mock('../../components/SocketProvider', () => {
  const original = jest.requireActual('../../components/SocketProvider');
  return {
    ...original,
    useSocket: jest.fn(() => ({
      joinWorkspace: jest.fn(),
      leaveWorkspace: jest.fn(),
      on: jest.fn((event, cb) => { socketCallbacks[event] = cb; }),
      off: jest.fn((event) => { delete socketCallbacks[event]; }),
      isConnected: true,
    })),
  };
});

describe('WorkspaceView Master Coverage', () => {
  const mockProps = {
    workspaceId: 'w1',
    userId: 'u1',
    onBack: jest.fn(),
    onSelectBoard: jest.fn(),
    onOpenAdmin: jest.fn(),
  };

  const mockWorkspace = {
    id: 'w1',
    name: 'Engineering',
    description: 'Dev space',
    color: '#3b82f6',
    ownerId: 'u1',
    boards: [{ id: 'b1', title: 'Sprint 1', color: '#8b5cf6' }],
    members: [
      { id: 'm1', userId: 'u1', role: 'ADMIN', user: { name: 'Alice', email: 'a@test.com' } },
      { id: 'm2', userId: 'u2', role: 'MEMBER', user: { name: 'Bob', email: 'b@test.com' } },
      { id: 'm3', userId: 'u3', role: 'VIEWER', user: { name: null, email: 'charlie@test.com' } }
    ],
    invitations: [{ id: 'inv1', inviteeEmail: 'pending@test.com', role: 'VIEWER' }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(socketCallbacks).forEach(key => delete socketCallbacks[key]);
    (workspaceActions.getWorkspaceDetails as jest.Mock).mockResolvedValue(mockWorkspace);
    (workspaceActions.getUserRole as jest.Mock).mockResolvedValue('ADMIN');
    window.confirm = jest.fn(() => true);
    window.innerWidth = 1280;
    window.dispatchEvent(new Event('resize'));
  });

  const renderView = async () => {
    let result: any;
    await act(async () => {
      result = render(<SocketProvider><WorkspaceView {...mockProps} /></SocketProvider>);
    });
    await screen.findByText('Engineering');
    return result;
  };

  // --- 1. SIDEBAR & HELPERS (Lines 221-296) ---
  it('covers full sidebar mapping and helpers (221-296)', async () => {
    await renderView();
    const sidebar = screen.getByTestId('workspace-sidebar');
    const { getByText, getAllByText } = within(sidebar);

    expect(getByText('Alice')).toBeInTheDocument();
    expect(getByText('charlie')).toBeInTheDocument();

    expect(getByText('Admin')).toBeInTheDocument();
    expect(getByText('Member')).toBeInTheDocument();
    expect(getAllByText('Viewer').length).toBeGreaterThan(1);
    expect(sidebar.querySelector('.lucide-crown')).toBeInTheDocument();
    expect(sidebar.querySelector('.lucide-shield')).toBeInTheDocument();
    expect(sidebar.querySelector('.lucide-eye')).toBeInTheDocument();

    expect(getByText('(Owner)')).toBeInTheDocument();

    expect(getByText('Pending Invitations')).toBeInTheDocument();
    expect(getByText('pending@test.com')).toBeInTheDocument();
  });

  // --- 2. SOCKET EARLY RETURNS (68-112) ---
  it('covers socket early return branches (68, 84, 92, 112)', async () => {
    await renderView();
    await act(async () => {
      socketCallbacks['board:created']({ workspaceId: 'wrong' });
      socketCallbacks['board:deleted']({ workspaceId: 'wrong' });
      socketCallbacks['workspace:updated']({ workspaceId: 'wrong' });
      socketCallbacks['workspace:member-role-changed']({ workspaceId: 'wrong' });
    });
    expect(workspaceActions.getWorkspaceDetails).toHaveBeenCalledTimes(1); 
  });

  // --- 3. SOCKET SUCCESS PATHS ---
  it('covers socket state updates and navigation', async () => {
    await renderView();
    
    await act(async () => {
      socketCallbacks['board:created']({ workspaceId: 'w1', board: { id: 'b2', title: 'New' } });
    });
    expect(screen.getByText('New')).toBeInTheDocument();

    await act(async () => {
      socketCallbacks['board:deleted']({ workspaceId: 'w1', boardId: 'b1' });
    });
    expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();

    await act(async () => {
      socketCallbacks['workspace:member-removed']({ userId: 'u1' });
    });
    expect(mockProps.onBack).toHaveBeenCalled();
  });

  // --- 4. BOARD ACTIONS & MODAL (120-210) ---
  it('covers board creation color selection and deletion', async () => {
    await renderView();
    fireEvent.click(screen.getByText(/New Board/i));
    
    const colorSwatches = screen.getAllByRole('button').filter(b => b.style.backgroundColor);
    fireEvent.click(colorSwatches[1]);
    
    fireEvent.change(screen.getByPlaceholderText(/e.g. Project Roadmap/i), { target: { value: 'Test' } });
    (workspaceActions.createBoardInWorkspace as jest.Mock).mockResolvedValue({ success: true, board: { id: 'b3', title: 'Test' } });
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    });

    const menuBtn = screen.getByLabelText(/Open menu for Sprint 1/i);
    fireEvent.click(menuBtn);
    (workspaceActions.deleteBoardFromWorkspace as jest.Mock).mockResolvedValue({ success: true });
    
    await act(async () => {
      fireEvent.click(screen.getByText(/Delete Board/i));
    });
    expect(workspaceActions.deleteBoardFromWorkspace).toHaveBeenCalled();
  });

  // --- 5. CLEANUP & NAVIGATION ---
  it('covers settings and unmount cleanup', async () => {
    const { unmount } = await renderView();
    fireEvent.click(screen.getByText('Settings'));
    expect(mockProps.onOpenAdmin).toHaveBeenCalled();
    
    await act(async () => {
      unmount();
    });
    expect(socketCallbacks['board:created']).toBeUndefined();
  });
});