"use client";

import React, { useState, useEffect } from 'react';
import { useSocket } from '../SocketProvider';
import { X, Calendar } from 'lucide-react';

interface GanttViewProps {
  boardId: string;
  userId: string;
  board: any;
  onClose: () => void;
  onTaskClick: (taskId: string) => void;
}

interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  listTitle: string;
  listColor?: string;
  assignees: any[];
  checklistProgress: number;
  isOverdue: boolean;
}

export default function GanttView({ boardId, userId, board, onClose, onTaskClick }: GanttViewProps) {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() });
  const [groupBy, setGroupBy] = useState<'list' | 'assignee'>('list');

  // Transform board data to Gantt tasks
  useEffect(() => {
    const ganttTasks: GanttTask[] = [];

    board.lists?.forEach((list: any) => {
      list.tasks?.forEach((task: any) => {
        // Filter tasks without dates
        if (!task.startDate && !task.dueDate) return;

        const startDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
        const endDate = task.dueDate ? new Date(task.dueDate) : new Date(startDate.getTime() + 86400000); // +1 day

        ganttTasks.push({
          id: task.id,
          title: task.title,
          startDate,
          endDate,
          listTitle: list.title,
          assignees: task.assignees || [],
          checklistProgress: calculateProgress(task.checklists),
          isOverdue: endDate < new Date() && calculateProgress(task.checklists) < 100
        });
      });
    });

    setTasks(ganttTasks);

    // Calculate date range
    if (ganttTasks.length > 0) {
      const allDates = ganttTasks.flatMap(t => [t.startDate, t.endDate]);
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

      setDateRange({
        start: new Date(minDate.setDate(minDate.getDate() - 7)), // -1 week padding
        end: new Date(maxDate.setDate(maxDate.getDate() + 7))    // +1 week padding
      });
    }
  }, [board]);

  // Socket listeners for real-time updates
  const { on, off } = useSocket();

  useEffect(() => {
    const handleTaskUpdate = () => {
      // Reload handled by BoardView parent
    };

    on('task:updated', handleTaskUpdate);
    on('task:created', handleTaskUpdate);
    on('task:deleted', handleTaskUpdate);

    return () => {
      off('task:updated', handleTaskUpdate);
      off('task:created', handleTaskUpdate);
      off('task:deleted', handleTaskUpdate);
    };
  }, [on, off]);

  // Helper functions
  const calculateProgress = (checklists: any[]) => {
    if (!checklists || checklists.length === 0) return 0;
    const totalItems = checklists.reduce((acc, c) => acc + (c.items?.length || 0), 0);
    const checkedItems = checklists.reduce((acc, c) => acc + (c.items?.filter((i: any) => i.isChecked).length || 0), 0);
    return totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  };

  const getBarColor = (task: GanttTask) => {
    if (task.checklistProgress === 100) return '#22c55e'; // green
    if (task.isOverdue) return '#ef4444'; // red
    const daysUntilDue = Math.ceil((task.endDate.getTime() - new Date().getTime()) / 86400000);
    if (daysUntilDue <= 3 && daysUntilDue > 0) return '#eab308'; // yellow
    return '#3b82f6'; // blue
  };

  const calculateBarPosition = (startDate: Date) => {
    const totalRange = dateRange.end.getTime() - dateRange.start.getTime();
    const offset = startDate.getTime() - dateRange.start.getTime();
    return (offset / totalRange) * 100;
  };

  const calculateBarWidth = (startDate: Date, endDate: Date) => {
    const totalRange = dateRange.end.getTime() - dateRange.start.getTime();
    const duration = endDate.getTime() - startDate.getTime();
    return Math.max((duration / totalRange) * 100, 0.5); // Min 0.5% width
  };

  // Group tasks based on selected grouping
  const getGroupedTasks = () => {
    if (groupBy === 'list') {
      const grouped = new Map<string, GanttTask[]>();
      tasks.forEach(task => {
        const key = task.listTitle;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(task);
      });
      return Array.from(grouped.entries()).map(([name, tasks]) => ({ name, tasks }));
    } else {
      // Group by assignee
      const grouped = new Map<string, GanttTask[]>();

      tasks.forEach(task => {
        if (task.assignees && task.assignees.length > 0) {
          task.assignees.forEach((assignee: any) => {
            const key = assignee.user?.name || assignee.user?.email || 'Unknown';
            if (!grouped.has(key)) {
              grouped.set(key, []);
            }
            grouped.get(key)!.push(task);
          });
        } else {
          // Unassigned tasks
          const key = 'Unassigned';
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key)!.push(task);
        }
      });

      return Array.from(grouped.entries()).map(([name, tasks]) => ({ name, tasks }));
    }
  };

  const groupedTasks = getGroupedTasks();

  // Render
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-800">Timeline View</h2>
          <span className="text-sm text-slate-500">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Group By */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="list">Group by List</option>
            <option value="assignee">Group by Assignee</option>
          </select>

          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Calendar className="w-16 h-16 mb-4" />
            <p className="text-lg">No tasks with dates</p>
            <p className="text-sm">Add start and due dates to tasks to see them here</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Timeline Header - Months */}
            <div className="flex sticky top-0 bg-white z-10 border-b pb-2 mb-4">
              <div className="w-64 shrink-0"></div>
              <div className="flex-1 relative h-8">
                {generateMonthLabels(dateRange).map((month, i) => (
                  <div
                    key={i}
                    className="absolute text-xs font-semibold text-slate-600"
                    style={{ left: `${month.position}%` }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Today Indicator */}
            <div
              className="absolute h-full border-l-2 border-red-500 pointer-events-none"
              style={{
                left: `calc(16rem + ${calculateBarPosition(new Date())}%)`,
                top: '4rem'
              }}
            />

            {/* Grouped Task Rows */}
            {groupedTasks.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-6">
                {/* Group Header */}
                <div className="flex items-center mb-2 sticky" style={{ top: '4rem' }}>
                  <div className="w-64 shrink-0 pr-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                      {group.name}
                      <span className="ml-2 text-xs text-slate-500 font-normal">
                        ({group.tasks.length})
                      </span>
                    </h3>
                  </div>
                  <div className="flex-1 border-t border-slate-300"></div>
                </div>

                {/* Tasks in Group */}
                {group.tasks.map(task => (
                  <div key={task.id} className="flex items-center mb-2 group">
                    {/* Task Info */}
                    <div className="w-64 shrink-0 pr-4 pl-4">
                      <div
                        className="text-sm font-medium text-slate-800 cursor-pointer hover:text-blue-600 truncate"
                        onClick={() => onTaskClick(task.id)}
                      >
                        {task.title}
                      </div>
                      <div className="text-xs text-slate-500">{task.listTitle}</div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative h-8">
                      <div
                        className="absolute h-6 rounded cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2 text-xs text-white font-medium"
                        style={{
                          left: `${calculateBarPosition(task.startDate)}%`,
                          width: `${calculateBarWidth(task.startDate, task.endDate)}%`,
                          backgroundColor: getBarColor(task)
                        }}
                        onClick={() => onTaskClick(task.id)}
                        title={`${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}`}
                      >
                        {task.checklistProgress > 0 && (
                          <span className="text-xs">{task.checklistProgress}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to generate month labels
function generateMonthLabels(dateRange: { start: Date; end: Date }) {
  const labels = [];
  const current = new Date(dateRange.start);
  const totalRange = dateRange.end.getTime() - dateRange.start.getTime();

  while (current <= dateRange.end) {
    const position = ((current.getTime() - dateRange.start.getTime()) / totalRange) * 100;
    labels.push({
      label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      position
    });
    current.setMonth(current.getMonth() + 1);
  }

  return labels;
}
