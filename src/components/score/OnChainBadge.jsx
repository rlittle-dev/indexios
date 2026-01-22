import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Link2, ExternalLink } from 'lucide-react';

export default function OnChainBadge({ attestationUID, status, explorerUrl }) {
  if (!attestationUID) return null;

  const statusColors = {
    YES: 'bg-green-900/60 text-green-200 border-green-600',
    NO: 'bg-red-900/60 text-red-200 border-red-600',
    REFUSE_TO_DISCLOSE: 'bg-orange-900/60 text-orange-200 border-orange-600',
    INCONCLUSIVE: 'bg-zinc-700 text-zinc-200 border-zinc-500'
  };

  const url = explorerUrl || `https://base.easscan.org/attestation/view/${attestationUID}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex flex-shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <Badge 
        className={`text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 cursor-pointer hover:opacity-80 transition-opacity border whitespace-nowrap ${statusColors[status] || statusColors.INCONCLUSIVE}`}
      >
        <Link2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
        <span className="hidden sm:inline">On-Chain</span>
        <span className="sm:hidden">Chain</span>
        <ExternalLink className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0" />
      </Badge>
    </a>
  );
}