import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { CheckSquare, MessageSquare, Clock, Edit2 } from 'lucide-react';

interface TaskCardProps {
  task: any;
  index: number;
  allUsers: any[];
  onClick: (task: any) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, allUsers, onClick }) => {
  const labels = task.labels || [];
  const assignees = task.assignees || [];
  const checklists = task.checklists || [];
  const commentCount = task._count?.comments || 0;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          style={{ ...provided.draggableProps.style }}
          className={`bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-2 hover:shadow-md cursor-pointer group select-none transition-all ${
            snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl ring-2 ring-indigo-500 z-50' : ''
          }`}
        >
          {labels.length > 0 && (
            <div className="flex gap-1 mb-2 flex-wrap">
              {labels.slice(0, 4).map((tl: any) => (
                <span
                  key={tl.labelId || tl.id}
                  className="h-2 w-10 rounded-full"
                  style={{ backgroundColor: tl.label?.color || tl.color }}
                />
              ))}
            </div>
          )}

          <p className="text-sm font-medium text-slate-800 break-words">{task.title}</p>

          <div className="flex items-center justify-between mt-2 min-h-[16px]">
            <div className="flex gap-2 text-slate-400">
              {task.dueDate && (
                <span className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded ${
                  new Date(task.dueDate) < new Date()
                    ? 'bg-red-100 text-red-600'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <Clock className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {checklists.length > 0 && (
                <div className="flex items-center gap-1 text-xs" title="Checklist items">
                  <CheckSquare className="w-3 h-3" />
                  <span>
                    {checklists.reduce((acc: number, cl: any) => acc + (cl.items?.filter((i: any) => i.isChecked).length || 0), 0)}/
                    {checklists.reduce((acc: number, cl: any) => acc + (cl.items?.length || 0), 0)}
                  </span>
                </div>
              )}
              {commentCount > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <MessageSquare className="w-3 h-3" />
                  <span>{commentCount}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
              {assignees.length > 0 && (
                <div className="flex -space-x-1">
                  {assignees.slice(0, 3).map((a: any) => (
                    <div
                      key={a.userId || a}
                      className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-medium border border-white"
                      title={a.user?.name || a.user?.email || ''}
                    >
                      {a.user?.name?.charAt(0).toUpperCase() || a.user?.email?.charAt(0).toUpperCase() || '?'}
                    </div>
                  ))}
                  {assignees.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-medium border border-white">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;