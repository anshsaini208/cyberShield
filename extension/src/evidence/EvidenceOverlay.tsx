import { useEffect } from 'react';
import { Microchip, X, Eye } from 'lucide-react';
import { SecuritySignal } from '../types/security';

interface EvidenceOverlayProps {
  activeSignal: SecuritySignal | null;
  onClose: () => void;
}

export function EvidenceOverlay({ activeSignal, onClose }: EvidenceOverlayProps) {
  useEffect(() => {
    // Handle Escape key listener for closing evidence mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[2147483647] pointer-events-auto bg-[#0B0F19]/95 text-gray-100 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-2xl max-w-sm w-full space-y-3 font-sans backdrop-blur-md">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
            <Microchip className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            🔬 EVIDENCE MODE ACTIVE
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
          title="Exit Evidence Mode (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Signal Details */}
      {activeSignal ? (
        <div className="space-y-1.5 bg-gray-900/80 p-3 rounded-xl border border-gray-800 text-xs">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span>Category: {activeSignal.category}</span>
            <span
              className={`px-1.5 py-0.2 rounded font-bold ${
                activeSignal.severity === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300'
                  : activeSignal.severity === 'HIGH'
                  ? 'bg-orange-950 text-orange-300'
                  : 'bg-amber-950 text-amber-300'
              }`}
            >
              {activeSignal.severity}
            </span>
          </div>

          <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            {activeSignal.title}
          </h4>

          <p className="text-gray-400 text-[11px] leading-relaxed">{activeSignal.description}</p>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Select an evidence card to inspect target elements on the page.</p>
      )}

      {/* Exit Button */}
      <button
        onClick={onClose}
        className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg transition-colors shadow-lg shadow-emerald-950/40"
      >
        EXIT EVIDENCE MODE
      </button>
    </div>
  );
}
