import { useState } from 'react';
import { ShieldAlert, AlertTriangle, Info, ChevronDown, ChevronUp, Eye, Globe, Lock, FileText, Repeat, Layers } from 'lucide-react';
import { SecuritySignal, SignalCategory, SignalSeverity } from '../types/security';

interface EvidenceCardProps {
  signal: SecuritySignal;
  onHighlightTarget?: (signal: SecuritySignal) => void;
}

export function EvidenceCard({ signal, onHighlightTarget }: EvidenceCardProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Category Icon & Label mapping
  const getCategoryMeta = (cat: SignalCategory) => {
    switch (cat) {
      case SignalCategory.URL:
        return { label: 'URL', icon: <Globe className="w-3.5 h-3.5 text-blue-400" />, emoji: '🌐' };
      case SignalCategory.DOMAIN:
        return { label: 'DOMAIN', icon: <Globe className="w-3.5 h-3.5 text-purple-400" />, emoji: '🌍' };
      case SignalCategory.PAGE:
        return { label: 'PAGE', icon: <FileText className="w-3.5 h-3.5 text-cyan-400" />, emoji: '📄' };
      case SignalCategory.REDIRECT:
        return { label: 'REDIRECT', icon: <Repeat className="w-3.5 h-3.5 text-amber-400" />, emoji: '🔀' };
      case SignalCategory.CREDENTIAL:
        return { label: 'CREDENTIAL', icon: <Lock className="w-3.5 h-3.5 text-rose-400" />, emoji: '🔐' };
      default:
        return { label: 'SECURITY', icon: <Layers className="w-3.5 h-3.5 text-gray-400" />, emoji: '🛡️' };
    }
  };

  // Severity style mapping
  const getSeverityStyle = (sev: SignalSeverity) => {
    switch (sev) {
      case SignalSeverity.CRITICAL:
        return {
          badge: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
          dot: 'bg-rose-500',
          icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
        };
      case SignalSeverity.HIGH:
        return {
          badge: 'bg-orange-950/80 text-orange-300 border-orange-800/80',
          dot: 'bg-orange-500',
          icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
        };
      case SignalSeverity.MEDIUM:
        return {
          badge: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      default:
        return {
          badge: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
          dot: 'bg-blue-500',
          icon: <Info className="w-4 h-4 text-blue-400" />,
        };
    }
  };

  const categoryMeta = getCategoryMeta(signal.category);
  const severityStyle = getSeverityStyle(signal.severity);
  const hasPageTarget = signal.target && signal.target.type !== 'NONE';

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 space-y-3 shadow-lg hover:border-gray-700 transition-colors">
      {/* Header: Category & Severity */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
          <span>{categoryMeta.emoji}</span>
          <span className="font-mono text-[11px] tracking-wider uppercase text-gray-400">{categoryMeta.label}</span>
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${severityStyle.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${severityStyle.dot}`} />
          {signal.severity}
        </div>
      </div>

      {/* Signal Title & Description */}
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          {severityStyle.icon}
          {signal.title}
        </h4>
        <p className="text-xs text-gray-400 leading-relaxed">{signal.description}</p>
      </div>

      {/* Action bar: View on Page & Technical Details Toggle */}
      <div className="flex items-center justify-between border-t border-gray-800/80 pt-2.5 text-xs">
        {hasPageTarget ? (
          <button
            onClick={() => onHighlightTarget && onHighlightTarget(signal)}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded text-[11px] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            VIEW ON PAGE
          </button>
        ) : (
          <span className="text-[11px] text-gray-500 font-mono italic">No page target</span>
        )}

        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-200 text-[11px] font-mono"
        >
          <span>Technical Evidence</span>
          {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Technical Evidence Section */}
      {showTechnicalDetails && (
        <div className="bg-gray-950/90 border border-gray-800/80 rounded-lg p-3 space-y-2 text-[11px] font-mono mt-2">
          <div className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Evidence Data:</div>
          <div className="space-y-1">
            {signal.evidence.map((ev, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2 border-b border-gray-900 pb-1">
                <span className="text-gray-400 font-semibold">{ev.key}:</span>
                <span className="text-emerald-400 truncate max-w-[200px]" title={ev.value}>
                  {ev.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-gray-800 text-[10px] text-gray-400">
            <span>Detection Confidence:</span>
            <span className="font-bold text-gray-200">{Math.round(signal.confidence * 100)}%</span>
          </div>
          <div className="text-[9px] text-gray-500 italic">
            * Detection confidence indicates heuristic precision, not absolute malware probability.
          </div>
        </div>
      )}
    </div>
  );
}
