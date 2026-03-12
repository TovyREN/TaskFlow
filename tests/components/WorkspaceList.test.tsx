import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import WorkspaceList from '../../components/WorkspaceList';
import '@testing-library/jest-dom';

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  X: () => <span data-testid="icon-x" />,
  Users: () => <span data-testid="icon-users" />,
  Grid: () => <span data-testid="icon-grid" />,
  Crown: () => <span data-testid="icon-crown" />,
  Shield: () => <span data-testid="icon-shield" />,
  Eye: () => <span data-testid="icon-eye" />,
  MoreVertical: () => <span data-testid="icon-more" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Settings: () => <span data-testid="icon-settings" />,
  UserPlus: () => <span data-testid="icon-userplus" />,
  ChevronRight: () => <span data-testid="icon-chevron" />,
}));

describe('WorkspaceList Component', () => {
  const mockOnSelectWorkspace = jest.fn();
  const mockOnCreateWorkspace = jest.fn().mockResolvedValue(undefined);

  const workspaces = [
    {
      id: 'ws-1',
      name: 'Marketing',
      description: 'Marketing team workspace',
      color: '#3b82f6',
      _count: { boards: 3, members: 5 },
    },
    {
      id: 'ws-2',
      name: 'Engineering',
      description: 'Engineering workspace',
      color: '#8b5cf6',
      _count: { boards: 7, members: 12 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workspace names and counts', () => {
    render(
      <WorkspaceList
        workspaces={workspaces}
        onSelectWorkspace={mockOnSelectWorkspace}
        onCreateWorkspace={mockOnCreateWorkspace}
      />
    );

    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Marketing team workspace')).toBeInTheDocument();
    expect(screen.getByText('Engineering workspace')).toBeInTheDocument();
    // Board and member counts are rendered within spans
    expect(screen.getByText((_, el) => el?.textContent === '3 boards' && el.tagName === 'SPAN')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === '5 members' && el.tagName === 'SPAN')).toBeInTheDocument();
  });

  it('shows empty state when no workspaces', () => {
    render(
      <WorkspaceList
        workspaces={[]}
        onSelectWorkspace={mockOnSelectWorkspace}
        onCreateWorkspace={mockOnCreateWorkspace}
      />
    );

    expect(screen.getByText('No workspaces yet')).toBeInTheDocument();
    expect(screen.getByText('Create Workspace')).toBeInTheDocument();
  });

  it('calls onSelectWorkspace when clicking a workspace card', () => {
    render(
      <WorkspaceList
        workspaces={workspaces}
        onSelectWorkspace={mockOnSelectWorkspace}
        onCreateWorkspace={mockOnCreateWorkspace}
      />
    );

    fireEvent.click(screen.getByText('Marketing'));
    expect(mockOnSelectWorkspace).toHaveBeenCalledWith('ws-1');
  });

  it('opens create modal when New Workspace is clicked', () => {
    render(
      <WorkspaceList
        workspaces={workspaces}
        onSelectWorkspace={mockOnSelectWorkspace}
        onCreateWorkspace={mockOnCreateWorkspace}
      />
    );

    fireEvent.click(screen.getByText('New Workspace'));
    expect(screen.getByText('Workspace Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/marketing team/i)).toBeInTheDocument();
  });

  it('submits form and calls onCreateWorkspace with name, description, and color', async () => {
    render(
      <WorkspaceList
        workspaces={workspaces}
        onSelectWorkspace={mockOnSelectWorkspace}
        onCreateWorkspace={mockOnCreateWorkspace}
      />
    );

    fireEvent.click(screen.getByText('New Workspace'));

    fireEvent.change(screen.getByPlaceholderText(/marketing team/i), {
      target: { value: 'Design Team' },
    });
    fireEvent.change(screen.getByPlaceholderText(/what's this workspace for/i), {
      target: { value: 'Design workspace' },
    });

    const submitButton = screen.getByRole('button', { name: /create workspace/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockOnCreateWorkspace).toHaveBeenCalledWith('Design Team', 'Design workspace', '#3b82f6');
    });
  });

  it('closes modal when Cancel is clicked', () => {
    render(
      <WorkspaceList
        workspaces={workspaces}
        onSelectWorkspace={mockOnSelectWorkspace}
        onCreateWorkspace={mockOnCreateWorkspace}
      />
    );

    fireEvent.click(screen.getByText('New Workspace'));
    expect(screen.getByText('Workspace Name')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Workspace Name')).not.toBeInTheDocument();
  });

  it('disables submit button when name is empty', () => {
    render(
      <WorkspaceList
        workspaces={workspaces}
        onSelectWorkspace={mockOnSelectWorkspace}
        onCreateWorkspace={mockOnCreateWorkspace}
      />
    );

    fireEvent.click(screen.getByText('New Workspace'));

    const submitButton = screen.getByRole('button', { name: /create workspace/i });
    expect(submitButton).toBeDisabled();
  });

  it('renders workspaces without color or _count using defaults', () => {
    const workspacesNoColor = [
      { id: 'ws-3', name: 'Minimal', description: 'No color', color: '' },
    ] as any[];

    render(
      <WorkspaceList
        workspaces={workspacesNoColor}
        onSelectWorkspace={mockOnSelectWorkspace}
        onCreateWorkspace={mockOnCreateWorkspace}
      />
    );

    expect(screen.getByText('Minimal')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === '0 boards' && el.tagName === 'SPAN')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === '0 members' && el.tagName === 'SPAN')).toBeInTheDocument();
  });

  it('does not submit form when name is whitespace only', async () => {
    render(
      <WorkspaceList
        workspaces={workspaces}
        onSelectWorkspace={mockOnSelectWorkspace}
        onCreateWorkspace={mockOnCreateWorkspace}
      />
    );

    fireEvent.click(screen.getByText('New Workspace'));
    fireEvent.change(screen.getByPlaceholderText(/marketing team/i), {
      target: { value: '   ' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText(/marketing team/i).closest('form')!);
    });

    expect(mockOnCreateWorkspace).not.toHaveBeenCalled();
  });
});
