import React, { useState, useEffect } from 'react';
import { AlignLeft } from 'lucide-react';

interface TaskDescriptionProps {
  description: string;
  onSave: (newDesc: string) => void;
}

const TaskDescription: React.FC<TaskDescriptionProps> = ({ description, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(description);

  useEffect(() => {
    setInputValue(description || '');
  }, [description]);

  const handleSave = () => {
    if (inputValue !== description) {
      onSave(inputValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(description || '');
    setIsEditing(false);
  };

  return (
    <div className="pl-9">
      <div className="flex items-center gap-2 mb-2">
        <AlignLeft className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-700">Description</h3>
      </div>
      
      {isEditing ? (
        <div className="space-y-2 animate-fade-in">
          <textarea 
            autoFocus
            className="w-full border border-slate-300 rounded-lg p-3 min-h-[120px] outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white shadow-inner resize-y"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Add a more detailed description..."
          />
          <div className="flex gap-2">
            <button 
              onClick={handleSave} 
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Save
            </button>
            <button 
              onClick={handleCancel} 
              className="text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsEditing(true)}
          className={`min-h-[80px] p-4 rounded-lg cursor-pointer transition-all border ${
            description 
              ? 'bg-transparent border-transparent hover:bg-slate-100' 
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {description ? (
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{description}</p>
          ) : (
            <p className="text-slate-500 text-sm italic">Add a more detailed description...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskDescription;