import { render, screen, fireEvent, act } from '@testing-library/react';
import Dashboard from '../../components/Dashboard';
import '@testing-library/jest-dom';

jest.mock('../../components/UserSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="user-settings" />,
}));

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  X: () => <span data-testid="icon-x" />,
  Layout: () => <span data-testid="icon-layout" />,
}));

describe('Dashboard Component', () => {
  const mockOnSelectBoard = jest.fn();
  const mockOnUpdateBoards = jest.fn();
  const userId = 'user-123';

  const boards = [
    { id: 'b-1', title: 'Sprint Planning', color: 'bg-blue-600' },
    { id: 'b-2', title: 'Bug Tracker', color: 'bg-red-600' },
  ] as any[];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders board titles', () => {
    render(
      <Dashboard
        boards={boards}
        onSelectBoard={mockOnSelectBoard}
        onUpdateBoards={mockOnUpdateBoards}
        userId={userId}
      />
    );

    expect(screen.getByText('Sprint Planning')).toBeInTheDocument();
    expect(screen.getByText('Bug Tracker')).toBeInTheDocument();
  });

  it('calls onSelectBoard when a board card is clicked', () => {
    render(
      <Dashboard
        boards={boards}
        onSelectBoard={mockOnSelectBoard}
        onUpdateBoards={mockOnUpdateBoards}
        userId={userId}
      />
    );

    fireEvent.click(screen.getByText('Sprint Planning'));
    expect(mockOnSelectBoard).toHaveBeenCalledWith('b-1');
  });

  it('shows empty state button when no boards', () => {
    render(
      <Dashboard
        boards={[]}
        onSelectBoard={mockOnSelectBoard}
        onUpdateBoards={mockOnUpdateBoards}
        userId={userId}
      />
    );

    expect(screen.getByText('Create your first board')).toBeInTheDocument();
  });

  it('opens and closes create modal', () => {
    render(
      <Dashboard
        boards={boards}
        onSelectBoard={mockOnSelectBoard}
        onUpdateBoards={mockOnUpdateBoards}
        userId={userId}
      />
    );

    fireEvent.click(screen.getByText('Create New Board'));
    expect(screen.getByText('Board Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/marketing launch/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Board Title')).not.toBeInTheDocument();
  });

  it('alerts deprecation message on create submit', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <Dashboard
        boards={boards}
        onSelectBoard={mockOnSelectBoard}
        onUpdateBoards={mockOnUpdateBoards}
        userId={userId}
      />
    );

    fireEvent.click(screen.getByText('Create New Board'));
    fireEvent.change(screen.getByPlaceholderText(/marketing launch/i), {
      target: { value: 'New Board' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create board/i }));
    });

    expect(alertMock).toHaveBeenCalledWith(
      'This component is deprecated. Please use Workspaces to create boards.'
    );

    alertMock.mockRestore();
  });

  it('renders UserSettings component', () => {
    render(
      <Dashboard
        boards={boards}
        onSelectBoard={mockOnSelectBoard}
        onUpdateBoards={mockOnUpdateBoards}
        userId={userId}
      />
    );

    expect(screen.getByTestId('user-settings')).toBeInTheDocument();
  });

  it('does not create board with empty title', async () => {
    render(
      <Dashboard
        boards={boards}
        onSelectBoard={mockOnSelectBoard}
        onUpdateBoards={mockOnUpdateBoards}
        userId={userId}
      />
    );

    fireEvent.click(screen.getByText('Create New Board'));
    // Leave title empty and submit
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create board/i }));
    });

    // Should not have called alert since early return
    expect(mockOnUpdateBoards).not.toHaveBeenCalled();
  });

  it('closes modal when clicking overlay backdrop', () => {
    render(
      <Dashboard boards={boards} onSelectBoard={mockOnSelectBoard} onUpdateBoards={mockOnUpdateBoards} userId={userId} />
    );
    fireEvent.click(screen.getByText('Create New Board'));
    expect(screen.getByText('Board Title')).toBeInTheDocument();
    // Click the overlay (the fixed backdrop div)
    fireEvent.click(screen.getByText('Board Title').closest('.fixed')!);
    expect(screen.queryByText('Board Title')).not.toBeInTheDocument();
  });

  it('closes modal when clicking X button', () => {
    render(
      <Dashboard boards={boards} onSelectBoard={mockOnSelectBoard} onUpdateBoards={mockOnUpdateBoards} userId={userId} />
    );
    fireEvent.click(screen.getByText('Create New Board'));
    expect(screen.getByText('Board Title')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('icon-x'));
    expect(screen.queryByText('Board Title')).not.toBeInTheDocument();
  });

  it('opens create modal from empty state button', () => {
    render(
      <Dashboard boards={[]} onSelectBoard={mockOnSelectBoard} onUpdateBoards={mockOnUpdateBoards} userId={userId} />
    );
    fireEvent.click(screen.getByText('Create your first board'));
    expect(screen.getByText('Board Title')).toBeInTheDocument();
  });

  it('renders board card without color using default', () => {
    const boardsNoColor = [
      { id: 'b-1', title: 'No Color Board', color: '' },
      { id: 'b-2', title: 'Other Board', color: 'bg-red-600' },
    ] as any[];

    render(
      <Dashboard
        boards={boardsNoColor}
        onSelectBoard={mockOnSelectBoard}
        onUpdateBoards={mockOnUpdateBoards}
        userId={userId}
      />
    );

    expect(screen.getByText('No Color Board')).toBeInTheDocument();
  });
});
