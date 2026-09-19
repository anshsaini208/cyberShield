import { ShieldCheck, ScanSearch } from 'lucide-react';

interface EmptyStateProps {
  onAnalyze: () => void;
}

export function EmptyState({ onAnalyze }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center space-y-6">
      <div className="p-5 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl text-emerald-400">
        <ShieldCheck className="w-12 h-12" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-white">You're all clear for now.</h2>
        <p className="text-sm text-gray-400 max-w-md leading-relaxed">
          CyberShield hasn't recorded any security incidents yet. Browse normally and CyberShield will
          surface meaningful security events when they occur.
        </p>
      </div>
      <p className="text-xs text-gray-600 italic max-w-sm">
        Note: No incidents does not guarantee complete safety. CyberShield uses heuristic detection
        and may not catch all threats.
      </p>
      <button
        onClick={onAnalyze}
        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-colors border border-emerald-400/30 shadow-lg shadow-emerald-950/50"
      >
        <ScanSearch className="w-4 h-4" />
        Analyze Current Site
      </button>
    </div>
  );
}
