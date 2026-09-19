import { Bot, CheckCircle, ShieldAlert, Cpu, Tag } from 'lucide-react';
import { AIExplanation } from '../types/security';

interface AIExplanationCardProps {
  explanation: AIExplanation;
}

export function AIExplanationCard({ explanation }: AIExplanationCardProps) {
  return (
    <div className="bg-[#111827] border-2 border-emerald-500/60 rounded-xl p-5 space-y-4 shadow-xl text-xs font-sans">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              🤖 AI SECURITY ANALYST
            </h3>
            <p className="text-[11px] text-gray-400">Generative Security Synthesis & Risk Context</p>
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
            explanation.isFallback
              ? 'bg-amber-950/80 text-amber-300 border-amber-800'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
          }`}
        >
          {explanation.isFallback ? '⚡ LOCAL FALLBACK' : '✨ GEMINI SYNTHESIS'}
        </span>
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Executive Summary</span>
        <p className="text-xs font-medium text-gray-200 leading-relaxed bg-gray-900/80 p-3 rounded-lg border border-gray-800">
          {explanation.summary}
        </p>
      </div>

      {/* What Was Detected */}
      {explanation.whatDetected && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">What Was Detected</span>
          <div className="text-xs text-gray-300 leading-relaxed bg-gray-900/60 p-3 rounded-lg border border-gray-800 whitespace-pre-line font-mono">
            {explanation.whatDetected}
          </div>
        </div>
      )}

      {/* Why It Matters */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Why It Matters
        </span>
        <p className="text-xs text-gray-300 leading-relaxed">{explanation.whyItMatters}</p>
      </div>

      {/* Potential Impact */}
      {explanation.potentialImpact && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Potential Impact</span>
          <p className="text-xs text-gray-400 leading-relaxed">{explanation.potentialImpact}</p>
        </div>
      )}

      {/* Recommended Actions */}
      {explanation.recommendedActions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Recommended Actions</span>
          <div className="space-y-1.5">
            {explanation.recommendedActions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-emerald-950/20 border border-emerald-800/40 p-2 rounded-lg text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-gray-200">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence References */}
      {explanation.evidenceReferences.length > 0 && (
        <div className="pt-2 border-t border-gray-800/80 flex items-center gap-2 text-[10px]">
          <Tag className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-400 font-semibold">Evidence Referenced:</span>
          <div className="flex gap-1 flex-wrap font-mono">
            {explanation.evidenceReferences.map((refId) => (
              <span key={refId} className="bg-gray-800 text-emerald-400 px-1.5 py-0.5 rounded border border-gray-700">
                {refId}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-[9px] text-gray-500 italic pt-1 flex items-center justify-between">
        <span>{explanation.confidenceNote}</span>
        <span className="font-mono flex items-center gap-1">
          <Cpu className="w-3 h-3 text-emerald-500" /> Grounded Analyst
        </span>
      </div>
    </div>
  );
}
