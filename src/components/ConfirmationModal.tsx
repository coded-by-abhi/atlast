import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm glass-panel bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">
        
        {/* Warning Icon & Title */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {title}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
          <button
            onClick={onCancel}
            className="py-1.5 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="py-1.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/10 transition-all"
          >
            Delete
          </button>
        </div>

      </div>
    </div>
  );
};
