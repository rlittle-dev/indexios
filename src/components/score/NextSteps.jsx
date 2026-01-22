import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, MessageCircle, Lock, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NextSteps({ nextSteps, interviewQuestions, isLocked }) {
  const [nextStepsExpanded, setNextStepsExpanded] = useState(false);
  const [questionsExpanded, setQuestionsExpanded] = useState(false);

  if (isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-2xl p-8"
      >
        <div className="text-center">
          <div className="inline-flex p-4 rounded-full bg-purple-500/20 mb-4">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Unlock Advanced Recommendations</h3>
          <p className="text-white/80 mb-2">Get personalized next steps and interview questions with Professional or Enterprise plans</p>
          <p className="text-white/60 text-sm mb-6">
            • Tailored interview questions based on resume analysis<br/>
            • Recommended next steps for your hiring process<br/>
            • Action items to verify specific claims
          </p>
          <Link to={createPageUrl('Pricing')}>
            <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold">
              Upgrade to Professional
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  if (!nextSteps?.length && !interviewQuestions?.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="grid md:grid-cols-2 gap-6"
    >
      {/* Next Steps */}
      {nextSteps?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800"
        >
          <button
            onClick={() => setNextStepsExpanded(!nextStepsExpanded)}
            className="w-full p-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5">
                <CheckCircle2 className="w-5 h-5 text-white/60" />
              </div>
              <h3 className="text-white font-semibold">Next Steps</h3>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-white/60 transition-transform duration-300 ${
                nextStepsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          <motion.div
            initial={false}
            animate={{
              height: nextStepsExpanded ? 'auto' : 0,
              opacity: nextStepsExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <ul className="px-5 pb-5 pt-3 space-y-3">
              {nextSteps.map((step, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-start gap-3 text-white/80"
                >
                  <ArrowRight className="w-4 h-4 text-white/40 mt-1 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{step}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}

      {/* Interview Questions */}
      {interviewQuestions?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800"
        >
          <button
            onClick={() => setQuestionsExpanded(!questionsExpanded)}
            className="w-full p-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5">
                <MessageCircle className="w-5 h-5 text-white/60" />
              </div>
              <h3 className="text-white font-semibold">Interview Questions</h3>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-white/60 transition-transform duration-300 ${
                questionsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          <motion.div
            initial={false}
            animate={{
              height: questionsExpanded ? 'auto' : 0,
              opacity: questionsExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <ul className="px-5 pb-5 pt-3 space-y-3">
              {interviewQuestions.map((question, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="flex items-start gap-3 text-white/80"
                >
                  <span className="text-indigo-400 font-bold flex-shrink-0 mt-0.5">{index + 1}.</span>
                  <span className="text-sm leading-relaxed">{question}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}