import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Book, Zap, Shield, Phone, Link2, FileText, Users, Key, Code, ChevronRight, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const DOCS_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    articles: [
      {
        id: 'introduction',
        title: 'Introduction to Indexios',
        content: `Indexios is a comprehensive resume verification and employment background check platform designed for modern hiring teams.

**What Indexios Does:**
- Analyzes resumes for consistency, accuracy, and potential fraud indicators
- Automatically verifies employment history through AI-powered phone calls to HR departments
- Records verified employment claims on the blockchain for tamper-proof credentials
- Provides actionable insights and interview questions based on analysis

**Key Features:**
- **Legitimacy Scoring**: Every resume receives a 0-100 score based on consistency, experience verification, education verification, and skills alignment
- **Red & Green Flags**: Clear indicators highlight concerns and strengths
- **Automated Phone Verification**: Our AI calls employers to verify employment dates and titles
- **Blockchain Attestations**: Verified claims are recorded on Base blockchain for permanent, portable credentials

**Who Uses Indexios:**
- HR teams screening candidates
- Staffing agencies verifying placements
- Compliance teams requiring audit trails
- Hiring managers making final decisions`
      },
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        content: `Get started with Indexios in under 2 minutes.

**Step 1: Upload a Resume**
Navigate to the Scan page and drag & drop a PDF resume, or click to browse files.

**Step 2: Wait for Analysis**
Our AI analyzes the resume in approximately 15-30 seconds, examining:
- Timeline consistency and employment gaps
- Experience claims and quantified achievements
- Education credentials and institution verification
- Skills alignment with claimed experience

**Step 3: Review Results**
You'll receive:
- An overall legitimacy score (0-100)
- Detailed breakdown of each verification category
- Red flags (concerns) and green flags (strengths)
- Recommended next steps and interview questions

**Step 4: Verify Employment (Optional)**
For Professional and Enterprise users, you can trigger automated phone calls to verify employment with previous employers.

**Step 5: Save or Share**
Download reports, share with team members, or save candidates to folders for later review.`
      },
      {
        id: 'account-setup',
        title: 'Account Setup',
        content: `Setting up your Indexios account for maximum efficiency.

**Creating Your Account:**
1. Click "Sign In" in the top navigation
2. Enter your email address
3. Complete the verification process
4. You're ready to scan!

**Profile Settings:**
Access My Account to configure:
- Full name display
- Email notification preferences
- Active device management

**Team Setup (Enterprise):**
Enterprise users can create teams:
1. Go to Team in the dropdown menu
2. Click "Create Team"
3. Invite members by email
4. Team members can view shared scan history

**API Access (Professional+):**
1. Navigate to API Access
2. Generate your API key
3. Use the key to integrate Indexios into your ATS or workflow`
      }
    ]
  },
  {
    id: 'resume-analysis',
    title: 'Resume Analysis',
    icon: FileText,
    articles: [
      {
        id: 'legitimacy-score',
        title: 'Understanding Legitimacy Scores',
        content: `The legitimacy score is Indexios's primary metric for resume verification.

**Score Ranges:**
- **90-100**: Exceptional candidate with verifiable, specific achievements
- **75-89**: Strong candidate with mostly verifiable claims
- **60-74**: Acceptable candidate with some concerns
- **45-59**: Concerning - multiple red flags present
- **30-44**: High risk - significant verification issues
- **Below 30**: Critical - likely fraudulent claims

**Score Components:**

**Consistency Score (25%)**
Evaluates timeline logic:
- Employment gaps and overlaps
- Logical career progression
- Education-to-employment alignment

**Experience Verification (25%)**
Assesses claim validity:
- Quantified achievements vs vague descriptions
- Appropriate scope for role level
- Verifiable companies and projects

**Education Verification (25%)**
Validates credentials:
- Institution recognition and ranking
- Degree relevance to career
- Date alignment with work history

**Skills Alignment (25%)**
Checks skill claims:
- Skills match job history
- Technology timeline accuracy
- Progression makes sense`
      },
      {
        id: 'red-green-flags',
        title: 'Red Flags & Green Flags',
        content: `Flags provide quick insights into resume strengths and concerns.

**Common Red Flags:**
- Employment gaps greater than 3 months unexplained
- Overlapping employment at multiple companies
- Vague job descriptions without metrics
- Lesser-known or unverifiable institutions
- Skills claimed without supporting experience
- Inflated titles relative to tenure
- Missing contact information

**Common Green Flags:**
- Specific, quantified achievements (% improvements, $ amounts)
- Clear career progression
- Well-known, verifiable employers
- Consistent tenure (2+ years per role)
- Published work or certifications
- Specific team sizes and responsibilities
- Employment verified via phone call
- Blockchain attestation recorded

**How to Use Flags:**
- Red flags indicate areas to probe during interviews
- Green flags confirm strengths to leverage
- Multiple red flags suggest deeper verification needed
- Verified green flags (✅) indicate confirmed claims`
      },
      {
        id: 'analysis-categories',
        title: 'Analysis Categories Explained',
        content: `Deep dive into each analysis category.

**Consistency Analysis:**
We map the entire employment timeline looking for:
- Gaps between roles (flagged if >3 months)
- Overlapping positions (almost always a red flag)
- Logical transitions between roles
- Education completion aligning with first job

**Experience Analysis:**
We evaluate each role for:
- Specific, measurable achievements
- Appropriate scope for the title/tenure
- Realistic claims (no "single-handedly generated $100M")
- Evidence of progression and growth

**Education Analysis:**
We verify:
- Institution exists and is accredited
- Degree program relevance
- Graduation dates align with career start
- Advanced degrees have appropriate prerequisites

**Skills Analysis:**
We check:
- Skills mentioned match job requirements
- Technology was available during claimed period
- Depth of expertise matches tenure
- Certifications have verifiable details`
      }
    ]
  },
  {
    id: 'employment-verification',
    title: 'Employment Verification',
    icon: Phone,
    articles: [
      {
        id: 'phone-verification',
        title: 'Automated Phone Verification',
        content: `Indexios uses AI-powered phone calls to verify employment directly with employers.

**How It Works:**
1. Our system identifies HR contact numbers for listed employers
2. An AI agent calls the company during business hours
3. The agent requests employment verification for the candidate
4. Results are recorded and transcribed

**What We Verify:**
- Employment dates (start and end)
- Job title held
- Employment status (still employed, departed, etc.)
- Company's verification policy

**Possible Outcomes:**
- **Verified**: Company confirmed the employment
- **Not Found**: Company has no record of the candidate
- **Refused to Disclose**: Company policy prevents disclosure
- **Inconclusive**: Unable to reach appropriate party
- **Pending**: Verification in progress

**Availability:**
- Professional: 15 verifications/month
- Enterprise: Unlimited verifications

**Important Notes:**
- Calls are made during US business hours
- Some companies require written authorization
- Results typically available within 24-48 hours`
      },
      {
        id: 'email-verification',
        title: 'Email Verification',
        content: `For international employers or when phone verification isn't possible, we offer email verification.

**How Email Verification Works:**
1. We identify the company's HR email address
2. A formal verification request is sent
3. The employer receives a secure link to confirm/deny employment
4. Responses are recorded with timestamps

**Email Request Contains:**
- Candidate name
- Dates to verify
- Position title
- Secure response link

**Response Options for Employers:**
- Confirm employment with dates
- Deny employment record
- Request more information
- Decline to participate

**Best Practices:**
- Ensure candidate has notified previous employers
- Allow 3-5 business days for response
- Follow up with phone verification if no response`
      },
      {
        id: 'blockchain-attestations',
        title: 'Blockchain Attestations',
        content: `Verified employment creates permanent, tamper-proof records on the blockchain.

**What is an Attestation?**
An attestation is a cryptographically signed record on the Base blockchain that proves:
- A specific person worked at a specific company
- The dates of employment
- The verification method used
- When the verification occurred

**Benefits:**
- **Permanent**: Cannot be deleted or altered
- **Portable**: Candidates can share with future employers
- **Verifiable**: Anyone can confirm the record exists
- **Trustless**: No central authority required

**How to View Attestations:**
- Attestations appear with a blockchain icon (🔗) in scan results
- Click to view the on-chain record
- Each attestation has a unique UID

**For Candidates:**
- Request employers verify through our Attestation Portal
- Build a portable employment history
- Share attestation links with future employers

**For Employers:**
- Use the Attestation Portal to verify current/former employees
- Create verifiable employment records
- Reduce time spent on verification requests`
      }
    ]
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    icon: Code,
    articles: [
      {
        id: 'authentication',
        title: 'API Authentication',
        content: `Authenticate your API requests using your API key.

**Getting Your API Key:**
1. Log in to Indexios (Professional or Enterprise plan required)
2. Navigate to API Access
3. Click "Generate API Key"
4. Copy and securely store your key

**Using Your API Key:**
Include the key in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

**Security Best Practices:**
- Never expose your API key in client-side code
- Rotate keys periodically
- Use environment variables
- Monitor usage for anomalies

**Rate Limits:**
- Professional: 100 requests/hour
- Enterprise: 1000 requests/hour
- Bulk operations count as single request`
      },
      {
        id: 'endpoints',
        title: 'API Endpoints',
        content: `Available API endpoints for integration.

**POST /api/scan**
Upload and analyze a resume.

Request:
\`\`\`json
{
  "resume_url": "https://...",
  "callback_url": "https://your-webhook.com/callback"
}
\`\`\`

Response:
\`\`\`json
{
  "scan_id": "scan_abc123",
  "status": "processing"
}
\`\`\`

**GET /api/scan/:id**
Retrieve scan results.

Response:
\`\`\`json
{
  "id": "scan_abc123",
  "status": "analyzed",
  "legitimacy_score": 87,
  "analysis": {
    "consistency_score": 92,
    "experience_verification": 85,
    "education_verification": 88,
    "skills_alignment": 83,
    "red_flags": [...],
    "green_flags": [...],
    "summary": "..."
  }
}
\`\`\`

**POST /api/verify**
Request employment verification.

Request:
\`\`\`json
{
  "scan_id": "scan_abc123",
  "employer_name": "TechCorp",
  "method": "phone"
}
\`\`\`

**GET /api/attestations/:candidate_id**
Retrieve blockchain attestations for a candidate.`
      },
      {
        id: 'webhooks',
        title: 'Webhooks',
        content: `Receive real-time notifications when events occur.

**Setting Up Webhooks:**
Configure webhook URLs in your account settings or via API.

**Webhook Events:**
- \`scan.completed\`: Resume analysis finished
- \`verification.completed\`: Phone/email verification finished
- \`attestation.created\`: Blockchain attestation recorded

**Webhook Payload:**
\`\`\`json
{
  "event": "scan.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "scan_id": "scan_abc123",
    "legitimacy_score": 87,
    "status": "analyzed"
  }
}
\`\`\`

**Webhook Security:**
- Verify the signature header
- Use HTTPS endpoints only
- Respond with 200 within 5 seconds
- Implement idempotency for retries

**Retry Policy:**
Failed webhooks retry 3 times with exponential backoff.`
      }
    ]
  },
  {
    id: 'teams',
    title: 'Teams & Collaboration',
    icon: Users,
    articles: [
      {
        id: 'team-setup',
        title: 'Setting Up Your Team',
        content: `Enterprise users can create teams for collaborative hiring.

**Creating a Team:**
1. Navigate to Team from the user menu
2. Enter your team name
3. Click "Create Team"

**Inviting Members:**
1. Enter the email address of your team member
2. Click "Send Invite"
3. Member receives an email invitation
4. Once accepted, they can access team scans

**Team Limits:**
- Enterprise plan includes up to 5 team members
- Contact sales for larger teams

**Team Member Roles:**
- **Owner**: Full access, can manage members
- **Member**: Can view and create scans

**Shared Resources:**
- All team scans visible to all members
- Candidates saved to team folders
- Verification results shared`
      },
      {
        id: 'saved-candidates',
        title: 'Saved Candidates & Folders',
        content: `Organize candidates with folders for efficient workflow.

**Creating Folders:**
1. Go to Saved Candidates
2. Click "New Folder"
3. Name your folder and select a color

**Saving Candidates:**
From any scan result:
1. Click the folder dropdown
2. Select destination folder
3. Optionally add notes

**Folder Organization Tips:**
- Create folders by role (Engineering, Sales, etc.)
- Use colors for hiring stages (Screening, Interview, Offer)
- Add notes for quick reference

**Searching Candidates:**
- Search by name or email
- Filter by folder
- Sort by date or score`
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    articles: [
      {
        id: 'data-security',
        title: 'Data Security',
        content: `Indexios takes data security seriously.

**Data Encryption:**
- All data encrypted in transit (TLS 1.3)
- Data encrypted at rest (AES-256)
- API keys hashed and salted

**Access Control:**
- Role-based permissions
- Session management with automatic expiry
- Device tracking and remote logout

**Infrastructure:**
- SOC 2 compliant hosting
- Regular security audits
- 24/7 monitoring

**Data Retention:**
- Scan data retained for account lifetime
- Deleted upon account closure
- Export available upon request`
      },
      {
        id: 'compliance',
        title: 'Compliance & GDPR',
        content: `Indexios is designed for regulatory compliance.

**GDPR Compliance:**
- Data processing agreements available
- Right to access and deletion honored
- Data portability supported
- EU data residency options

**FCRA Considerations:**
- Indexios provides tools, not consumer reports
- Employers responsible for compliance
- Adverse action guidance provided
- Candidate consent recommended

**Best Practices:**
- Obtain candidate consent before scanning
- Provide candidates opportunity to explain flags
- Document your verification process
- Maintain records per local requirements`
      }
    ]
  }
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeArticle, setActiveArticle] = useState('introduction');
  const [searchQuery, setSearchQuery] = useState('');

  const currentSection = DOCS_SECTIONS.find(s => s.id === activeSection);
  const currentArticle = currentSection?.articles.find(a => a.id === activeArticle);

  const filteredSections = searchQuery
    ? DOCS_SECTIONS.map(section => ({
        ...section,
        articles: section.articles.filter(a => 
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(s => s.articles.length > 0)
    : DOCS_SECTIONS;

  return (
    <>
      <Helmet>
        <title>Documentation - Indexios Resume Verification Platform</title>
        <meta name="description" content="Complete documentation for Indexios resume verification platform. Learn about resume analysis, employment verification, API integration, and more." />
        <link rel="canonical" href="https://indexios.me/Docs" />
      </Helmet>
      
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Header */}
        <div className="border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-16 z-40">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Book className="w-5 h-5 text-purple-400" />
                <h1 className="text-lg font-medium text-white">Documentation</h1>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/[0.03] border-white/10 text-white placeholder-white/30 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto flex">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 border-r border-white/[0.06] min-h-[calc(100vh-8rem)] sticky top-32 self-start hidden lg:block">
            <nav className="p-4 space-y-6">
              {filteredSections.map(section => (
                <div key={section.id}>
                  <button
                    onClick={() => { setActiveSection(section.id); setActiveArticle(section.articles[0]?.id); }}
                    className={`flex items-center gap-2 text-sm font-medium mb-2 ${activeSection === section.id ? 'text-purple-400' : 'text-white/60 hover:text-white'}`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.title}
                  </button>
                  <ul className="ml-6 space-y-1">
                    {section.articles.map(article => (
                      <li key={article.id}>
                        <button
                          onClick={() => { setActiveSection(section.id); setActiveArticle(article.id); }}
                          className={`text-sm py-1 block w-full text-left ${activeArticle === article.id && activeSection === section.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                        >
                          {article.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 p-8 lg:p-12">
            <motion.article
              key={activeArticle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl"
            >
              <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
                <Link to={createPageUrl('Home')} className="hover:text-white">Home</Link>
                <ChevronRight className="w-3 h-3" />
                <span>{currentSection?.title}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white/70">{currentArticle?.title}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-medium text-white mb-8">{currentArticle?.title}</h1>
              
              <div className="prose prose-invert prose-lg max-w-none">
                {currentArticle?.content.split('\n\n').map((paragraph, i) => {
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return <h3 key={i} className="text-xl font-medium text-white mt-8 mb-4">{paragraph.replace(/\*\*/g, '')}</h3>;
                  }
                  if (paragraph.startsWith('```')) {
                    const code = paragraph.replace(/```\w*\n?/g, '');
                    return (
                      <pre key={i} className="bg-white/[0.03] border border-white/10 rounded-lg p-4 overflow-x-auto my-6">
                        <code className="text-sm text-white/80 font-mono">{code}</code>
                      </pre>
                    );
                  }
                  if (paragraph.startsWith('- ')) {
                    const items = paragraph.split('\n').filter(l => l.startsWith('- '));
                    return (
                      <ul key={i} className="space-y-2 my-4">
                        {items.map((item, j) => (
                          <li key={j} className="flex items-start gap-3 text-white/60">
                            <span className="text-purple-400 mt-1">•</span>
                            <span dangerouslySetInnerHTML={{ __html: item.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={i} className="text-white/60 leading-relaxed my-4" dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />;
                })}
              </div>

              {/* Next Article */}
              {currentSection && currentSection.articles.indexOf(currentArticle) < currentSection.articles.length - 1 && (
                <div className="mt-12 pt-8 border-t border-white/[0.06]">
                  <button
                    onClick={() => setActiveArticle(currentSection.articles[currentSection.articles.indexOf(currentArticle) + 1].id)}
                    className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                  >
                    <span className="text-sm">Next: {currentSection.articles[currentSection.articles.indexOf(currentArticle) + 1].title}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </motion.article>
          </main>
        </div>
      </div>
    </>
  );
}