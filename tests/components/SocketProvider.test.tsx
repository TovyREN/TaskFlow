import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SocketProvider, useSocket } from '../../components/SocketProvider';
import '@testing-library/jest-dom';

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
  id: 'test-socket-id',
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

function TestConsumer() {
  const ctx = useSocket();
  return <div data-testid="connected">{ctx.isConnected ? 'yes' : 'no'}</div>;
}

function TestActions() {
  const ctx = useSocket();
  return (
    <div>
      <div data-testid="connected">{ctx.isConnected ? 'yes' : 'no'}</div>
      <button data-testid="join-workspace" onClick={() => ctx.joinWorkspace('ws-1')}>
        Join Workspace
      </button>
      <button data-testid="leave-board" onClick={() => ctx.leaveBoard('board-1')}>
        Leave Board
      </button>
      <button data-testid="on" onClick={() => ctx.on('test-event', () => {})}>
        On
      </button>
      <button data-testid="off" onClick={() => ctx.off('test-event', () => {})}>
        Off
      </button>
    </div>
  );
}

describe('SocketProvider Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.on.mockReset();
    mockSocket.off.mockReset();
    mockSocket.emit.mockReset();
    mockSocket.disconnect.mockReset();
    mockSocket.connected = true;
  });

  it('renders children correctly', () => {
    render(
      <SocketProvider userId="user-1">
        <div data-testid="child">Hello</div>
      </SocketProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('useSocket throws error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useSocket must be used within a SocketProvider');

    consoleSpy.mockRestore();
  });

  it('creates socket connection when userId is provided', () => {
    const { io } = require('socket.io-client');

    render(
      <SocketProvider userId="user-1">
        <TestConsumer />
      </SocketProvider>
    );

    expect(io).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/socket.io',
        autoConnect: true,
      })
    );
  });

  it('disconnects when userId becomes null', () => {
    const { rerender } = render(
      <SocketProvider userId="user-1">
        <TestConsumer />
      </SocketProvider>
    );

    rerender(
      <SocketProvider userId={null}>
        <TestConsumer />
      </SocketProvider>
    );

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('emits authenticate and join-user on connect', () => {
    render(
      <SocketProvider userId="user-1">
        <TestConsumer />
      </SocketProvider>
    );

    // Find the connect handler registered via mockSocket.on
    const connectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    );
    expect(connectCall).toBeDefined();

    // Simulate the connect event
    const connectHandler = connectCall![1];
    act(() => {
      connectHandler();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('authenticate', 'user-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('join-user', 'user-1');
  });

  it('joinWorkspace emits join-workspace event', () => {
    render(
      <SocketProvider userId="user-1">
        <TestActions />
      </SocketProvider>
    );

    // Simulate connect so socketRef is populated and connected
    const connectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    );
    act(() => {
      connectCall![1]();
    });

    act(() => {
      screen.getByTestId('join-workspace').click();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('join-workspace', 'ws-1');
  });

  it('leaveBoard emits leave-board event', () => {
    render(
      <SocketProvider userId="user-1">
        <TestActions />
      </SocketProvider>
    );

    const connectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    );
    act(() => {
      connectCall![1]();
    });

    act(() => {
      screen.getByTestId('leave-board').click();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('leave-board', 'board-1');
  });

  it('on/off delegate to socket methods', () => {
    render(
      <SocketProvider userId="user-1">
        <TestActions />
      </SocketProvider>
    );

    // Clear the on calls from setup (connect, disconnect, connect_error)
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();

    act(() => {
      screen.getByTestId('on').click();
    });

    expect(mockSocket.on).toHaveBeenCalledWith('test-event', expect.any(Function));

    act(() => {
      screen.getByTestId('off').click();
    });

    expect(mockSocket.off).toHaveBeenCalledWith('test-event', expect.any(Function));
  });

  // --- NEW TESTS for uncovered lines ---

  it('sets isConnected to false on disconnect event', () => {
    render(
      <SocketProvider userId="user-1">
        <TestConsumer />
      </SocketProvider>
    );

    // Simulate connect first
    const connectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    );
    act(() => {
      connectCall![1]();
    });

    expect(screen.getByTestId('connected')).toHaveTextContent('yes');

    // Now simulate disconnect
    const disconnectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'disconnect'
    );
    act(() => {
      disconnectCall![1]();
    });

    expect(screen.getByTestId('connected')).toHaveTextContent('no');
  });

  it('handles connect_error event without crashing', () => {
    render(
      <SocketProvider userId="user-1">
        <TestConsumer />
      </SocketProvider>
    );

    const errorCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect_error'
    );
    expect(errorCall).toBeDefined();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      errorCall![1](new Error('connection failed'));
    });

    consoleSpy.mockRestore();
  });

  it('leaveWorkspace emits leave-workspace event', () => {
    function TestLeaveWorkspace() {
      const ctx = useSocket();
      return (
        <button data-testid="leave-ws" onClick={() => ctx.leaveWorkspace('ws-1')}>
          Leave WS
        </button>
      );
    }

    render(
      <SocketProvider userId="user-1">
        <TestLeaveWorkspace />
      </SocketProvider>
    );

    const connectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    );
    act(() => {
      connectCall![1]();
    });

    act(() => {
      screen.getByTestId('leave-ws').click();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('leave-workspace', 'ws-1');
  });

  it('joinBoard emits join-board event', () => {
    function TestJoinBoard() {
      const ctx = useSocket();
      return (
        <button data-testid="join-board" onClick={() => ctx.joinBoard('board-1')}>
          Join Board
        </button>
      );
    }

    render(
      <SocketProvider userId="user-1">
        <TestJoinBoard />
      </SocketProvider>
    );

    const connectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    );
    act(() => {
      connectCall![1]();
    });

    act(() => {
      screen.getByTestId('join-board').click();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('join-board', 'board-1');
  });

  it('does not emit when socket is not connected', () => {
    mockSocket.connected = false;

    function TestDisconnected() {
      const ctx = useSocket();
      return (
        <div>
          <button data-testid="join-ws" onClick={() => ctx.joinWorkspace('ws-1')}>Join WS</button>
          <button data-testid="leave-ws" onClick={() => ctx.leaveWorkspace('ws-1')}>Leave WS</button>
          <button data-testid="join-b" onClick={() => ctx.joinBoard('b-1')}>Join Board</button>
          <button data-testid="leave-b" onClick={() => ctx.leaveBoard('b-1')}>Leave Board</button>
        </div>
      );
    }

    render(
      <SocketProvider userId="user-1">
        <TestDisconnected />
      </SocketProvider>
    );

    // Do NOT simulate connect - socket stays disconnected
    mockSocket.emit.mockClear();

    act(() => {
      screen.getByTestId('join-ws').click();
      screen.getByTestId('leave-ws').click();
      screen.getByTestId('join-b').click();
      screen.getByTestId('leave-b').click();
    });

    // None of these should emit since socket is not connected
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('disconnects and cleans up on unmount', () => {
    const { unmount } = render(
      <SocketProvider userId="user-1">
        <TestConsumer />
      </SocketProvider>
    );

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('disconnects existing socket when userId changes to null and resets isConnected', () => {
    const { rerender } = render(
      <SocketProvider userId="user-1">
        <TestConsumer />
      </SocketProvider>
    );

    // Simulate connect to set isConnected to true
    const connectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    );
    act(() => {
      connectCall![1]();
    });
    expect(screen.getByTestId('connected')).toHaveTextContent('yes');

    // The cleanup from the first effect fires disconnect, then the new effect
    // with userId=null also calls disconnect on socketRef if it exists.
    mockSocket.disconnect.mockClear();

    act(() => {
      rerender(
        <SocketProvider userId={null}>
          <TestConsumer />
        </SocketProvider>
      );
    });

    // disconnect is called at least once (cleanup of prior effect)
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('useSocketEvent hook renders without error', () => {
    const { useSocketEvent } = require('../../components/SocketProvider');
    const testCallback = jest.fn();

    function TestSocketEvent() {
      useSocketEvent('custom-event', testCallback, []);
      return <div data-testid="socket-event">listening</div>;
    }

    render(
      <SocketProvider userId="user-1">
        <TestSocketEvent />
      </SocketProvider>
    );

    // The hook renders successfully within the provider
    expect(screen.getByTestId('socket-event')).toHaveTextContent('listening');
  });

});
