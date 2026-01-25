import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Shield, Zap, Target, ArrowRight, User, Briefcase, GraduationCap, Sparkles, Phone, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ScoreCircle from '@/components/score/ScoreCircle';
import AnalysisCard from '@/components/score/AnalysisCard';
import FlagsList from '@/components/score/FlagsList';
import NextSteps from '@/components/score/NextSteps';

export default function Home() {
  // Example scan data for demonstration
  const exampleScan = {
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    legitimacy_score: 87,
    analysis: {
      consistency_score: 92,
      consistency_details: "Sarah's employment timeline demonstrates excellent consistency throughout her career. She maintained continuous employment from June 2018 to present with only one minor 2-month gap between her position at TechCorp (ended March 2023) and her current role at InnovateLabs (started May 2023). This brief gap is well within acceptable industry standards and was likely used for transition and potential skill development. All employment dates align perfectly with her education completion (MIT, graduated May 2018), with her first role starting immediately after graduation. There are no overlapping employment periods, and career progression follows a logical trajectory from Junior Software Engineer to Senior positions.",
      experience_verification: 85,
      experience_details: "Sarah demonstrates strong verifiable experience with concrete, quantifiable achievements. At TechCorp, she led the development of a payment processing system that handled $50M+ in transactions and increased processing speed by 35%, a specific metric that shows genuine impact. Her role involved leading a team of 5 engineers, which is appropriate for her Mid-level to Senior progression. At DataSystems Inc., she shipped 3 major product features and improved system reliability from 95% to 99.7%, another precise metric. Her current role shows continued growth with responsibility for architecture decisions. Most accomplishments include specific numbers, team sizes, or measurable outcomes rather than vague claims.",
      education_verification: 88,
      education_details: "Sarah holds a Bachelor of Science in Computer Science from MIT, graduating in May 2018 with a 3.8 GPA. MIT is a top-tier, globally recognized institution (#1-5 for Computer Science programs), which significantly strengthens credential verification. The graduation date aligns perfectly with her employment timeline, with her first professional role starting June 2018, immediately following graduation. Her degree is directly relevant to her software engineering career path. She also mentions relevant coursework in Distributed Systems and Machine Learning, which align with her professional experience in backend systems and data processing.",
      skills_alignment: 83,
      skills_details: "Skills demonstrate clear progression and strong alignment with her roles. She lists Python, Java, and JavaScript as primary languages, all of which are standard for backend/full-stack engineering roles she's held. Advanced skills like AWS, Docker, Kubernetes, and microservices architecture align with her senior-level positions and infrastructure work mentioned in her experience. Database technologies (PostgreSQL, MongoDB, Redis) match the data-intensive roles described. Her machine learning skills (TensorFlow, PyTorch) connect to her MIT coursework and recent projects. The progression from basic programming languages in earlier roles to advanced cloud architecture in senior positions shows natural skill development over 5+ years.",
      red_flags: [
        "Minor 2-month gap between TechCorp and InnovateLabs (Mar-May 2023)",
        "One AWS certification mentioned but lacks specific credential ID for verification"
      ],
      green_flags: [
        "✅ Employment verified via automated HR phone call (TechCorp confirmed)",
        "✅ Verification attestation recorded on blockchain",
        "5+ years consistent tenure at each company (no job hopping)",
        "Quantified achievements with specific metrics (35% speed increase, 99.7% reliability)",
        "Elite university credentials from MIT with strong GPA (3.8)",
        "Clear career progression from Junior to Senior Software Engineer",
        "Published 2 research papers on distributed systems",
        "Specific team sizes and budget responsibilities mentioned ($50M+ transactions)"
      ],
      summary: "Sarah Johnson presents as a strong candidate with highly verifiable credentials and an impressive track record. Her MIT Computer Science degree from a top-tier institution, combined with 5+ years of progressive experience at reputable tech companies, establishes excellent credibility. The resume demonstrates genuine expertise through specific, quantifiable achievements like increasing processing speed by 35% and managing systems handling $50M+ in transactions. Her career progression is logical and consistent, with appropriate skill development from Junior to Senior roles. The only minor concerns are a brief 2-month employment gap, which falls well within acceptable standards and likely represents a transition period, and one certification that could benefit from additional verification details. Overall, this candidate shows strong legitimacy with concrete evidence of expertise and minimal fraud risk.",
      next_steps: [
        "Verify MIT degree and graduation date with the university registrar",
        "Conduct reference checks with managers at TechCorp and DataSystems Inc.",
        "Request AWS certification credential ID for independent verification",
        "Ask about the 2-month gap (Mar-May 2023) during phone screening",
        "Review published research papers on distributed systems to confirm authorship",
        "Verify employment dates with previous companies during background check",
        "Ask for specific examples of the $50M transaction system during technical interview"
      ],
      interview_questions: [
        "Can you walk me through the architecture of the payment processing system you built that handled $50M+ in transactions?",
        "You mentioned improving system reliability from 95% to 99.7% - what specific strategies did you implement to achieve this?",
        "What did you focus on during the gap between TechCorp and InnovateLabs (March-May 2023)?",
        "Your resume mentions leading a team of 5 engineers - can you describe your leadership approach and a challenging situation you navigated?",
        "Tell me about your published research on distributed systems - what problem were you solving?",
        "How do you approach making architecture decisions for large-scale systems?",
        "What was the most significant technical challenge you faced at TechCorp and how did you overcome it?",
        "Can you provide examples of how you've applied your machine learning knowledge from MIT in your professional work?",
        "How do you stay current with rapidly evolving technologies in cloud infrastructure and DevOps?",
        "Describe a situation where you had to balance technical debt with feature delivery - what trade-offs did you make?"
      ]
    }
  };

  return (
    <>
      <Helmet>
        <title>Indexios - AI Resume Verification | Detect Fraudulent Resumes Instantly</title>
        <meta name="description" content="Verify resume authenticity with AI-powered fraud detection. Indexios analyzes credentials, experience, and education to provide instant legitimacy scores. Start with 3 free scans." />
        <link rel="canonical" href="https://indexios.me/" />
        <meta property="og:title" content="Indexios - AI Resume Verification Platform" />
        <meta property="og:description" content="Detect fraudulent resumes instantly with AI-powered verification. Free scans available." />
        <meta property="og:url" content="https://indexios.me/" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="min-h-screen bg-zinc-950">
        {/* Background gradients */}
        <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-20">
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
            >
              <span className="text-purple-300 text-sm font-medium">Advanced Resume Verification</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-purple-400 via-white to-purple-400 bg-clip-text text-transparent mb-6 leading-tight">
              Verify Resume<br />Authenticity
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto mb-8 leading-relaxed">
              We score the truthfulness of employment claims using automated employer outreach and blockchain-verified attestations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to={createPageUrl('Scan')}>
                <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold text-lg px-8 py-6">
                  Scan Resume Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Pricing')}>
                <Button size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10 hover:border-white/40 text-lg px-8 py-6">
                  View Pricing
                </Button>
              </Link>
            </div>
            
            <p className="text-white/50 text-sm mt-6">
              Start with 3 free scans • No credit card required • No login required
            </p>
          </motion.div>

          {/* Example Scan Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-20"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                See How It Works
              </h2>
              <p className="text-white/60 text-lg">
                Here's an example of our detailed resume analysis
              </p>
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-sm rounded-3xl p-6 md:p-10 border border-zinc-800 shadow-2xl space-y-6">
              {/* Example Header */}
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ScoreCircle score={exampleScan.legitimacy_score} />
                
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
                    <span className="text-emerald-300 text-xs font-medium">Example Analysis</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {exampleScan.name}
                  </h3>
                  <p className="text-white/60 mb-3">{exampleScan.email}</p>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {exampleScan.analysis.summary}
                  </p>
                </div>
              </div>

              {/* Analysis Breakdown with dropdowns */}
              <div className="grid sm:grid-cols-2 gap-4">
                <AnalysisCard
                  title="Consistency"
                  score={exampleScan.analysis.consistency_score}
                  details={exampleScan.analysis.consistency_details}
                  icon={User}
                  delay={0}
                />
                <AnalysisCard
                  title="Experience"
                  score={exampleScan.analysis.experience_verification}
                  details={exampleScan.analysis.experience_details}
                  icon={Briefcase}
                  delay={0.1}
                />
                <AnalysisCard
                  title="Education"
                  score={exampleScan.analysis.education_verification}
                  details={exampleScan.analysis.education_details}
                  icon={GraduationCap}
                  delay={0.2}
                />
                <AnalysisCard
                  title="Skills Alignment"
                  score={exampleScan.analysis.skills_alignment}
                  details={exampleScan.analysis.skills_details}
                  icon={Sparkles}
                  delay={0.3}
                />
              </div>

              {/* Flags */}
              <FlagsList
                redFlags={exampleScan.analysis.red_flags}
                greenFlags={exampleScan.analysis.green_flags}
              />

              {/* Next Steps and Interview Questions */}
              <NextSteps
                nextSteps={exampleScan.analysis.next_steps}
                interviewQuestions={exampleScan.analysis.interview_questions}
              />

              <div className="text-center pt-4">
                <Link to={createPageUrl('Scan')}>
                  <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold">
                    Try It With Your Resume
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-20"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Why Choose Indexios?
              </h2>
              <p className="text-white/60 text-lg">
                See beyond the résumé
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="inline-flex p-3 rounded-xl bg-purple-500/10 mb-4">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Fraud Detection</h3>
                <p className="text-white/70">
                  Identify inconsistencies, fabricated credentials, and inflated claims with advanced verification analysis
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="inline-flex p-3 rounded-xl bg-green-500/10 mb-4">
                  <Phone className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Automated Phone Verification</h3>
                <p className="text-white/70">
                  Automated calls to HR departments verify employment history and discover company policies
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="inline-flex p-3 rounded-xl bg-blue-500/10 mb-4">
                  <Link2 className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Blockchain Attestations</h3>
                <p className="text-white/70">
                  Verified employment records are permanently recorded on-chain for tamper-proof, portable credentials
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="inline-flex p-3 rounded-xl bg-orange-500/10 mb-4">
                  <Target className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Actionable Insights</h3>
                <p className="text-white/70">
                  Receive detailed recommendations and interview questions tailored to each candidate
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-3xl p-10 md:p-16 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Make Smarter Hiring Decisions?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Join teams already using Indexios to verify resumes and protect against fraud
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl('Scan')}>
                <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold text-lg px-8">
                  Start Free Scan
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('About')}>
                <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:text-white hover:bg-white/10 text-lg px-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}