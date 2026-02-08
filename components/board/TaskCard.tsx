import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { CheckSquare, AlignLeft, Edit2 } from 'lucide-react';
import { Task, User } from '../../types';

interface TaskCardProps {
  task: Task;
  index: number;
  allUsers: User[];
  onClick: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, allUsers, onClick }) => {
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
          {task.tags.length > 0 && (
            <div className="flex gap-1 mb-2 flex-wrap">
              {task.tags.map(tag => (
                <span key={tag.id} className={`text-[10px] px-2 py-0.5 rounded-full font-medium text-white bg-${tag.color}`}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          
          <p className="text-sm font-medium text-slate-800 break-words">{task.title}</p>
          
          <div className="flex items-center justify-between mt-2 min-h-[16px]">
            <div className="flex gap-2 text-slate-400">
              {task.checklists.length > 0 && (
                <div className="flex items-center gap-1 text-xs" title="Checklist items">
                  <CheckSquare className="w-3 h-3" />
                  <span>
                    {task.checklists.reduce((acc, cl) => acc + cl.items.filter(i => i.isChecked).length, 0)}/
                    {task.checklists.reduce((acc, cl) => acc + cl.items.length, 0)}
                  </span>
                </div>
              )}
              {(task.comments.length > 0 || task.description) && (
                <div className="flex items-center gap-1 text-xs">
                  <AlignLeft className="w-3 h-3" />
                  {task.comments.length > 0 && <span>{task.comments.length}</span>}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
              {task.assignees.length > 0 && (
                <div className="flex -space-x-1">
                  {task.assignees.map(uid => {
                    const u = allUsers.find(user => user.id === uid);
                    return u ? (
                      <img 
                        key={uid} 
                        src={u.avatar} 
                        alt={u.name}
                        className="w-5 h-5 rounded-full border border-white" 
                        title={u.name}
                      />
                    ) : null;
                  })}
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