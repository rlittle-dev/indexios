import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle, XCircle, Loader2, Download, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function CandidateCard({ candidate, onClick, onDownload, onShare, delay = 0 }) {
  const getScoreColor = (score) => {
    if (!score && score !== 0) return 'text-white/40';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStatusIcon = () => {
    switch (candidate.status) {
      case 'analyzed':
        return <CheckCircle className="w-4 h-4 text-white" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Loader2 className="w-4 h-4 text-white animate-spin" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div 
          onClick={onClick}
          className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
        >
          <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
            <FileText className="w-5 h-5 text-white/60" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">
              {candidate.name || 'Unknown Candidate'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-white/40" />
              <span className="text-xs text-white/50">
                {format(new Date(candidate.created_date), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {candidate.status === 'analyzed' && onDownload && onShare && (
            <div className="flex gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(candidate);
                }}
                className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(candidate);
                }}
                className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          
          {candidate.status === 'analyzed' && candidate.legitimacy_score !== undefined && (
            <div className="text-right">
              <p className={cn("text-2xl font-bold", getScoreColor(candidate.legitimacy_score))}>
                {candidate.legitimacy_score}%
              </p>
            </div>
          )}
          {getStatusIcon()}
        </div>
      </div>
    </motion.div>
  );
}