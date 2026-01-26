import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Book, Zap, Shield, Phone, Link2, FileText, Users, Key, Code, ChevronRight, Search, ArrowRight, CheckCircle, AlertTriangle, Info, Terminal, Database, Lock, Globe, Cpu, Settings, HelpCircle } from 'lucide-react';
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
        content: `# Introduction to Indexios

Indexios is a comprehensive resume verification and employment background check platform designed for modern hiring teams. We combine AI-powered analysis with automated phone verification and blockchain attestations to provide the most thorough resume verification available.

## What Indexios Does

Indexios provides a complete suite of tools for verifying candidate credentials:

- **AI-Powered Resume Analysis**: Our advanced AI examines every resume for consistency, accuracy, and potential fraud indicators. We analyze timeline logic, achievement claims, education credentials, and skills alignment.

- **Automated Phone Verification**: Our AI agents call HR departments directly to verify employment history. These calls confirm employment dates, titles, and gather information about company verification policies.

- **Blockchain Attestations**: When employment is verified, we create an immutable record on the Base blockchain. This creates a portable, verifiable credential that candidates can share with future employers.

- **Actionable Insights**: Beyond just scores, we provide specific interview questions to ask, next steps to take, and red flags to investigate.

## The Verification Process

When you upload a resume, Indexios performs the following analysis:

**1. Document Parsing**
We extract all relevant information from the resume including employment history, education, skills, and contact information.

**2. Timeline Analysis**
We map out the complete employment timeline, looking for gaps, overlaps, and logical progression patterns.

**3. Credential Verification**
We cross-reference education claims against known institutions and verify the logical connection between degrees and career paths.

**4. Achievement Scoring**
We evaluate each claimed achievement for specificity, measurability, and appropriateness for the role level.

**5. Score Calculation**
Based on all factors, we calculate component scores and an overall legitimacy score from 0-100.

## Who Uses Indexios

- **HR Teams**: Streamline candidate screening with instant verification
- **Staffing Agencies**: Verify candidates at scale before placement
- **Compliance Teams**: Maintain audit trails for regulatory requirements
- **Hiring Managers**: Make confident final decisions with complete information

## Platform Architecture

Indexios is built on a modern, secure architecture:

- **Frontend**: React-based single-page application
- **Backend**: Serverless functions for scalability
- **Database**: Encrypted at rest and in transit
- **Blockchain**: Base network for attestations
- **AI**: Latest language models for analysis`
      },
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        content: `# Quick Start Guide

Get started with Indexios in under 2 minutes. This guide walks you through your first resume scan.

## Step 1: Upload a Resume

1. Navigate to the **Scan** page
2. Drag and drop a PDF resume onto the upload zone, or click to browse files
3. Supported formats: PDF (recommended), DOC, DOCX

> **Tip**: For best results, upload resumes in PDF format. This preserves formatting and ensures accurate parsing.

## Step 2: Wait for Analysis

Our AI analyzes the resume in approximately 15-30 seconds. During this time, we:

- Extract all text and structured data
- Parse employment history and education
- Analyze timeline consistency
- Evaluate achievement claims
- Calculate verification scores

You'll see a loading indicator while analysis is in progress.

## Step 3: Review Results

Once analysis is complete, you'll receive a comprehensive report:

### Legitimacy Score (0-100)

This is your primary indicator of resume trustworthiness:

| Score Range | Meaning |
|-------------|---------|
| 90-100 | Exceptional - highly verifiable with specific achievements |
| 75-89 | Strong - mostly verifiable with minor gaps |
| 60-74 | Acceptable - some concerns but generally credible |
| 45-59 | Concerning - multiple red flags present |
| 30-44 | High Risk - significant verification issues |
| Below 30 | Critical - likely fraudulent claims |

### Component Scores

Each resume receives four component scores:

1. **Consistency Score**: Timeline logic, gaps, and progression
2. **Experience Score**: Achievement specificity and appropriateness
3. **Education Score**: Credential verification and relevance
4. **Skills Score**: Skill-role alignment and progression

### Flags

- **Red Flags** 🚩: Issues requiring investigation
- **Green Flags** ✅: Verified strengths and positives

## Step 4: Verify Employment (Optional)

For Professional and Enterprise users:

1. Click "Run Verification" on the Employment Verification box
2. Select employers to verify
3. Choose verification method (phone or email)
4. Results appear within 24-48 hours

## Step 5: Save or Share

- **Download**: Export a text report for your records
- **Share**: Generate a shareable link for team members
- **Save**: Store candidates in folders for organization

## Next Steps

- [Understanding Legitimacy Scores](/docs/legitimacy-score)
- [Employment Verification](/docs/phone-verification)
- [API Integration](/docs/api-authentication)`
      },
      {
        id: 'account-setup',
        title: 'Account Setup',
        content: `# Account Setup

Configure your Indexios account for maximum efficiency and security.

## Creating Your Account

1. Click **Sign In** in the top navigation
2. Enter your email address
3. Complete the email verification process
4. You're ready to start scanning!

All new accounts start with one free scan to try the platform.

## Profile Settings

Access **My Account** from the user dropdown to configure:

### Personal Information
- **Full Name**: Displayed on shared reports and team activity
- **Email**: Your login credential (cannot be changed)

### Notification Preferences
- **Email Notifications**: Receive alerts when analysis completes
- Enable/disable per-scan notifications

### Active Devices
- View all devices logged into your account
- Remotely logout suspicious devices
- See last activity timestamps

## Team Setup (Enterprise)

Enterprise users can create collaborative teams:

### Creating a Team

1. Go to **Team** from the user dropdown
2. Click **Create Team**
3. Enter your team name
4. Your team is ready for members

### Inviting Members

1. Enter the email address of your team member
2. Click **Send Invite**
3. Member receives an email invitation
4. Once accepted, they can access team scans

### Team Limits

| Plan | Team Members |
|------|--------------|
| Free | None |
| Starter | None |
| Professional | None |
| Enterprise | Up to 5 |

Contact sales for larger team requirements.

## API Access (Professional+)

Generate API keys for programmatic access:

1. Navigate to **API Access** from the user dropdown
2. Click **Generate API Key**
3. Copy and securely store your key
4. Use the key in your API requests

> **Security**: API keys are shown only once. Store them securely in environment variables, never in code.

## Subscription Management

View and manage your subscription:

- Current plan and usage
- Upgrade options
- Billing history (via Stripe portal)

To change plans, visit the **Pricing** page or contact support for downgrades.`
      },
      {
        id: 'supported-formats',
        title: 'Supported File Formats',
        content: `# Supported File Formats

Indexios supports multiple resume formats to accommodate various sources.

## Recommended Format

**PDF** is strongly recommended for best results:

- Preserves formatting exactly
- Consistent parsing across devices
- Smaller file sizes
- Most commonly used format

## All Supported Formats

| Format | Extension | Quality | Notes |
|--------|-----------|---------|-------|
| PDF | .pdf | Excellent | Recommended |
| Word | .docx | Good | Modern Word format |
| Word (Legacy) | .doc | Fair | Older format, may lose formatting |

## File Requirements

- **Maximum Size**: 10MB
- **Minimum Content**: At least 100 characters of text
- **Language**: English (primary), other languages supported with reduced accuracy
- **Encryption**: Unencrypted files only

## Tips for Best Results

### For Recruiters

When requesting resumes from candidates:
- Ask for PDF format specifically
- Request un-designed versions if heavily formatted
- Ensure text is selectable (not scanned images)

### For Candidates

When submitting your resume:
- Export from your word processor as PDF
- Verify text is selectable
- Avoid excessive graphics or tables
- Use standard fonts

## Troubleshooting

**"Could not parse resume"**
- Ensure the file contains selectable text
- Try converting to PDF if using another format
- Remove password protection

**"File too large"**
- Compress images in the document
- Export without embedded fonts
- Remove unnecessary pages

**"Invalid format"**
- Check file extension matches content
- Re-export from original source
- Contact support with the file for investigation`
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
        content: `# Understanding Legitimacy Scores

The legitimacy score is Indexios's primary metric for resume verification. This comprehensive score reflects our AI's assessment of the resume's overall trustworthiness.

## Score Calculation

The legitimacy score (0-100) is calculated from four equally-weighted components:

\`\`\`
Legitimacy Score = (Consistency + Experience + Education + Skills) / 4
\`\`\`

Each component contributes 25% to the final score.

## Score Ranges Explained

### 90-100: Exceptional
Resumes in this range demonstrate:
- Multiple specific achievements with metrics
- Clear, logical career progression
- Elite or easily verified institutions
- Zero timeline inconsistencies
- Rich detail throughout

**Hiring recommendation**: Strong candidate, proceed with confidence.

### 75-89: Strong
These resumes show:
- Specific achievements with some metrics
- Logical progression
- Recognized institutions
- Minor gaps (<1 month) if any
- Generally detailed descriptions

**Hiring recommendation**: Good candidate, verify key claims.

### 60-74: Acceptable
Characteristics include:
- Some specific details
- Mostly logical progression
- Identifiable institutions
- Minor timeline issues
- Credible but not exceptional

**Hiring recommendation**: Proceed with additional verification.

### 45-59: Concerning
Red flags present:
- Generic descriptions dominate
- Vague achievement claims
- Unverifiable companies
- Gaps or overlaps present
- Multiple inconsistencies

**Hiring recommendation**: Significant verification required.

### 30-44: High Risk
Serious issues:
- Multiple red flags
- Inflated claims evident
- Unverifiable institutions
- Major timeline issues
- Poor narrative coherence

**Hiring recommendation**: Consider other candidates.

### Below 30: Critical
Likely fraudulent:
- Fabricated credentials apparent
- Impossible timeline
- Severe inconsistencies
- Non-existent institutions
- Contradictory information

**Hiring recommendation**: Do not proceed.

## Important Context

### Early-Career Candidates
Candidates with less than 3 years of experience naturally score lower (typically 50-65). This reflects limited track record, not fraud. Evaluate trajectory and potential.

### Industry Variations
Some industries have fewer verifiable metrics. Adjust expectations for:
- Creative roles
- Startups (may not be verifiable)
- International experience

### Score Evolution
Scores can improve with:
- Phone verification
- Blockchain attestations
- Additional documentation`
      },
      {
        id: 'consistency-analysis',
        title: 'Consistency Analysis',
        content: `# Consistency Analysis

The consistency score evaluates the logical coherence of the resume's timeline and career narrative.

## What We Analyze

### Employment Timeline
We map every position with exact dates:
- Start and end dates for each role
- Gaps between positions
- Overlapping employment periods
- Total career duration

### Career Progression
We evaluate the logical flow:
- Title progression (Junior → Senior)
- Responsibility growth
- Industry transitions
- Role coherence

### Education-to-Work Alignment
We verify:
- Graduation date precedes first job
- Degree relevance to career
- Reasonable timeline for education

## Scoring Criteria

### 90-100: Perfect Alignment
- Precise dates with no ambiguity
- No gaps or overlaps
- Clear logical transitions
- Education aligns perfectly

### 75-89: Very Good
- Gaps < 1 month (explained or contextual)
- Consistent narrative
- No role overlaps
- Minor date imprecision acceptable

### 60-74: Acceptable
- Gaps 1-3 months present
- Mostly logical transitions
- No major conflicts

### 45-59: Problematic
- Gaps 3-6 months
- Role overlaps exist
- Narrative jumps unexplained

### 30-44: Serious Issues
- Major gaps > 6 months
- Significant overlaps
- Education/employment conflicts

### Below 30: Critical
- Impossible timeline
- Severe overlaps
- Clear fabrication indicators

## Common Red Flags

### Employment Gaps
| Gap Length | Severity | Notes |
|------------|----------|-------|
| < 1 month | Low | Common for job transitions |
| 1-3 months | Medium | Worth asking about |
| 3-6 months | High | Requires explanation |
| > 6 months | Critical | Major red flag |

### Overlapping Employment
Simultaneous full-time positions at different companies are almost always a red flag. Exceptions:
- Part-time/consulting alongside full-time
- Transition periods (1-2 weeks)
- Freelance alongside employment

### Timeline Impossibilities
- Starting work before graduation
- Tenure longer than company existed
- Future dates
- Ages that don't match timeline`
      },
      {
        id: 'experience-verification',
        title: 'Experience Verification',
        content: `# Experience Verification

The experience score evaluates the credibility and verifiability of claimed work experience and achievements.

## What We Evaluate

### Achievement Specificity
We look for concrete, measurable claims:
- "Increased sales by 35%" vs "Improved sales"
- "$5M budget managed" vs "Large budget"
- "Team of 12 engineers" vs "Large team"

### Role Appropriateness
We verify achievements match role level:
- Junior roles shouldn't claim executive decisions
- Entry-level shouldn't show team leadership
- Claims should match tenure length

### Verifiable Employers
We assess company legitimacy:
- Known companies = higher score
- Startup/unknown = neutral (requires context)
- Suspicious/non-existent = major red flag

## Scoring Breakdown

### 90-100: Rich, Verifiable Experience
- Multiple specific metrics
- Quantified impact throughout
- Achievements appropriate for level
- Clear progression of responsibility

**Examples of strong claims:**
- "Increased processing speed by 35% handling $50M+ in transactions"
- "Led team of 5 engineers, shipped 3 major features"
- "Reduced customer churn from 8% to 3% over 18 months"

### 75-89: Multiple Measurable Results
- Several quantified achievements
- Impact clearly described
- Most claims verifiable

### 60-74: Some Specific Achievements
- Limited metrics present
- Basic impact description
- Mix of specific and generic

### 45-59: Mostly Generic Language
- "Responsible for..." dominates
- Minimal quantification
- Claims questionable for tenure

**Warning signs:**
- "Involved in various projects"
- "Helped improve processes"
- "Worked on multiple initiatives"

### 30-44: Vague or Inflated
- No evidence of impact
- Claims seem inflated
- Responsibilities unclear

### Below 30: Fabricated
- Impossible claims
- Zero demonstrable impact
- Obvious exaggeration

## Verification Strategies

### During Interview
Ask for specifics:
- "Walk me through how you achieved the 35% improvement"
- "What was your specific contribution to that project?"
- "Who else was involved and what were their roles?"

### Reference Checks
Verify with former colleagues:
- Confirm role and responsibilities
- Validate key achievements
- Assess working relationship`
      },
      {
        id: 'education-verification',
        title: 'Education Verification',
        content: `# Education Verification

The education score assesses the credibility of academic credentials and their alignment with the candidate's career.

## What We Verify

### Institution Recognition
We categorize schools by verifiability:

| Tier | Description | Score Impact |
|------|-------------|--------------|
| Elite | Top 50 globally (MIT, Stanford, etc.) | +20 points |
| Well-Known | Top 200 globally | +10 points |
| Recognized | Accredited, findable online | Neutral |
| Lesser-Known | Hard to verify | -10 points |
| Unverifiable | Cannot confirm existence | -30 points |

### Degree Relevance
We assess how the degree relates to career:
- Computer Science → Software Engineer = Strong
- English Literature → Software Engineer = Weak (unless explained)
- Unrelated degrees aren't automatic red flags but need context

### Date Alignment
We verify education timeline:
- Graduation should precede first relevant job
- Advanced degrees need appropriate prerequisites
- Part-time/evening programs acceptable with employment

## Scoring Criteria

### 90-100: Elite, Perfectly Aligned
- Top 50 institution globally
- Graduation dates align perfectly
- Degree directly relevant to career
- Specific GPA/honors mentioned

### 75-89: Well-Known, Reasonable
- Top 200 institution
- Dates reasonable
- Relevant degree
- Timeline makes sense

### 60-74: Recognized, Related
- Accredited institution
- Dates mostly clear
- Degree related to career
- Minor ambiguities

### 45-59: Lesser-Known, Weak Alignment
- Difficult to verify institution
- Date ambiguity present
- Weak degree/career connection

### 30-44: Credential Issues
- Institution hard to verify
- Major timeline conflicts
- Degree relevance questionable

### Below 30: Likely Fabricated
- Non-existent institution
- Impossible timeline
- "Degree mill" indicators

## Red Flags to Watch

### Diploma Mills
Warning signs:
- "Life experience" degrees
- Accreditation from unknown bodies
- No campus or online presence
- Suspiciously fast completion

### Timeline Issues
- Graduating before typical age
- Multiple full degrees simultaneously
- Employment during full-time study (unless part-time program)

### Verification Tips
- Most universities have registrar verification
- LinkedIn education can be cross-referenced
- Professional licenses often require degree verification`
      },
      {
        id: 'skills-analysis',
        title: 'Skills Analysis',
        content: `# Skills Analysis

The skills score evaluates how well claimed skills align with work history and demonstrate genuine expertise.

## What We Evaluate

### Skill-Role Alignment
Each skill should appear in the context of work:
- "Python" should appear with Python-using roles
- "Leadership" should align with management positions
- Skills should match industry expectations

### Technology Timeline
We verify technologies were available when claimed:
- React in 2010 = Impossible (released 2013)
- Cloud experience in 2005 = Suspicious
- Emerging tech too early = Red flag

### Progression Logic
Skills should develop over career:
- Junior → Basic technologies
- Mid → Frameworks and tools
- Senior → Architecture and leadership

## Scoring Breakdown

### 90-100: Clear Expertise Demonstrated
- Skill progression through roles
- Tools match era and industry
- Depth shown (projects, certs)
- Clear expertise evident

### 75-89: Skills Align Well
- Skills match roles
- Reasonable progression
- Some depth demonstrated

### 60-74: Basic Alignment
- Skills mostly match roles
- Limited progression evidence
- Adequate for claims made

### 45-59: Weak Connections
- Skill/role gaps present
- Missing expected skills
- Progression unclear

### 30-44: Major Mismatches
- Skills don't match experience
- Unexplained expertise claims
- Technology timeline issues

### Below 30: Contradictory
- Impossible skill claims
- Clear expertise fabrication
- Technology anachronisms

## Technology Verification

### Framework Timeline
| Technology | Released | Suspicious Before |
|------------|----------|-------------------|
| React | 2013 | 2014 |
| Vue.js | 2014 | 2015 |
| TypeScript | 2012 | 2014 |
| Docker | 2013 | 2014 |
| Kubernetes | 2014 | 2016 |
| GPT/LLMs | 2020 | 2021 |

### Skill Depth Indicators
Signs of genuine expertise:
- Specific version mentions
- Known limitations acknowledged
- Integration experience
- Community contributions

### Certification Verification
Many certifications are verifiable:
- AWS certifications have verification codes
- Google Cloud certifications are public
- Microsoft certs can be verified online`
      },
      {
        id: 'red-green-flags',
        title: 'Red Flags & Green Flags',
        content: `# Red Flags & Green Flags

Flags provide quick, actionable insights into resume strengths and concerns.

## Red Flags 🚩

### Critical Red Flags
These require immediate attention:

**Timeline Issues**
- Employment gaps > 3 months unexplained
- Overlapping full-time positions
- Dates that don't add up
- Future dates listed

**Credential Problems**
- Unverifiable institutions
- Degrees from diploma mills
- Credentials that don't exist
- Impossible timelines

**Content Red Flags**
- Generic descriptions only
- No quantified achievements
- Vague role responsibilities
- Missing contact information

### Moderate Red Flags
Worth investigating:

- Short tenure (< 1 year) at multiple jobs
- Gaps 1-3 months unexplained
- Skills without supporting experience
- Lesser-known employers exclusively

### Minor Red Flags
Note but don't disqualify:

- Small formatting inconsistencies
- Minor date ambiguity
- Industry-atypical progression

## Green Flags ✅

### Verified Green Flags
These are confirmed positive indicators:

**✅ Employment Verified**
- Phone verification completed
- HR confirmed employment
- Dates matched resume

**✅ Blockchain Attestation**
- On-chain record created
- Tamper-proof verification
- Portable credential

### Strong Green Flags
Highly positive indicators:

- Specific quantified metrics
- Clear career progression
- Elite institution credentials
- Published work or patents
- Industry certifications (verified)
- 2+ year tenure consistently

### Positive Indicators
Good signs:

- Detailed role descriptions
- Logical skill progression
- Verifiable employers
- Professional references listed

## Using Flags Effectively

### In Screening
1. Review red flags first
2. Determine severity (critical vs. minor)
3. Plan verification for concerns
4. Note green flags as strengths

### In Interviews
1. Address red flags directly
2. Ask for context on gaps
3. Verify green flag claims
4. Document explanations

### Decision Framework

| Red Flags | Green Flags | Recommendation |
|-----------|-------------|----------------|
| None | Multiple | Strong proceed |
| Minor only | Multiple | Proceed |
| Moderate | Multiple | Proceed with verification |
| Critical | Any | Additional scrutiny |
| Multiple critical | Any | Likely pass |`
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
        content: `# Automated Phone Verification

Indexios uses AI-powered phone calls to verify employment directly with employers. This is the gold standard for employment verification.

## How It Works

### Step 1: Number Discovery
Our system identifies HR contact numbers for listed employers through:
- Company website scraping
- Business directories
- Public databases
- Web search

### Step 2: AI Call Placement
An AI agent calls the company during business hours (9 AM - 5 PM local time):
- Introduces itself as calling for employment verification
- Requests to speak with HR or the appropriate department
- Follows up with specific questions

### Step 3: Verification Request
The agent requests verification of:
- Employment dates (start and end)
- Job title held
- Employment status (current/former)
- Eligibility for rehire (if policy allows)

### Step 4: Recording and Transcription
- All calls are recorded
- Transcripts are generated automatically
- Key information is extracted
- Results are stored securely

## Possible Outcomes

### Verified ✅
Company confirmed the employment claim:
- Dates matched resume (within reasonable variance)
- Title confirmed
- Employment record found

### Not Found ❌
Company has no record of the candidate:
- Name not in system
- Different dates on file
- No employment record exists

### Refused to Disclose ⚠️
Company policy prevents disclosure:
- Many large companies only confirm dates
- Some require written authorization
- Policy varies by state/country

### Inconclusive ⏳
Unable to complete verification:
- Couldn't reach appropriate party
- Call dropped or connection issues
- Requires callback or follow-up

### Pending 🔄
Verification in progress:
- Call scheduled
- Awaiting callback
- Multiple attempts ongoing

## Availability

| Plan | Verifications |
|------|---------------|
| Free | None |
| Starter | None |
| Professional | 15/month |
| Enterprise | Unlimited |

## Best Practices

### Timing
- Allow 24-48 hours for results
- US business hours only for calls
- International may take longer

### Preparation
- Ensure candidate has notified employers
- Some candidates prefer advance notice
- May improve disclosure rates

### Follow-up
- If inconclusive, manual follow-up may help
- Email verification as alternative
- Written authorization for sensitive cases`
      },
      {
        id: 'email-verification',
        title: 'Email Verification',
        content: `# Email Verification

For international employers or when phone verification isn't possible, we offer email-based employment verification.

## How Email Verification Works

### Step 1: Email Discovery
We identify the company's HR email address through:
- Company website (careers page, contact us)
- LinkedIn company pages
- Domain pattern analysis
- Web search

### Step 2: Verification Request
A formal verification email is sent containing:
- Candidate name
- Dates to verify
- Position title claimed
- Secure response link

### Step 3: Employer Response
The employer clicks the secure link to:
- Confirm employment with dates
- Deny employment record
- Request more information
- Decline to participate

### Step 4: Result Recording
Responses are:
- Timestamped
- Linked to the scan
- Visible in verification results
- Stored securely

## Email Template

Subject: Employment Verification Request - [Candidate Name]

---

Dear HR Team,

We are conducting an employment verification for [Candidate Name] who has listed employment at [Company Name].

**Claimed Details:**
- Position: [Title]
- Dates: [Start] to [End]

Please click the secure link below to verify or respond:
[Verification Link]

This link expires in 7 days.

Thank you for your assistance.

---

## Response Options

Employers can respond with:

| Response | Meaning |
|----------|---------|
| Verified | Employment confirmed as stated |
| Partial Verify | Some details different |
| Not Found | No record of employment |
| Declined | Cannot disclose information |

## When to Use Email

Email verification is preferred when:
- International employer (phone impractical)
- Multiple failed phone attempts
- Company prefers written requests
- Time zone differences make calls difficult
- Phone number not discoverable

## Response Times

| Employer Type | Typical Response |
|---------------|------------------|
| Large Corp | 3-5 business days |
| Mid-Size | 2-4 business days |
| Small Business | 1-3 business days |
| No Response | Follow up after 7 days |`
      },
      {
        id: 'blockchain-attestations',
        title: 'Blockchain Attestations',
        content: `# Blockchain Attestations

When employment is verified, Indexios creates permanent, tamper-proof records on the blockchain. This creates portable credentials that follow candidates throughout their careers.

## What is an Attestation?

An attestation is a cryptographically signed record on the Base blockchain that proves:
- A specific person worked at a specific company
- The dates of employment
- The job title held
- The verification method used
- When the verification occurred
- Who performed the verification

## Benefits of Blockchain Attestations

### Permanence
- Cannot be deleted or modified
- Survives company closures
- Independent of Indexios systems

### Portability
- Candidates own their records
- Share with any future employer
- No repeated verification needed

### Verifiability
- Anyone can confirm authenticity
- Public blockchain = public verification
- Cryptographic proof of data integrity

### Trust
- No central authority required
- Decentralized verification
- Immutable audit trail

## How Attestations Work

### Creation
1. Employment is verified (phone or email)
2. Attestation data is prepared
3. Data is signed with our private key
4. Transaction is submitted to Base blockchain
5. Attestation UID is recorded

### Verification
1. Retrieve attestation by UID
2. Verify signature authenticity
3. Confirm data matches claim
4. Trust established cryptographically

## Attestation Data

Each attestation includes:

\`\`\`json
{
  "candidate_name": "Jane Smith",
  "employer_name": "TechCorp Inc",
  "job_title": "Senior Engineer",
  "start_date": "2020-01-15",
  "end_date": "2023-06-30",
  "verification_method": "phone",
  "verification_date": "2024-01-15T10:30:00Z",
  "verifier": "Indexios"
}
\`\`\`

## For Candidates

### Building Your Record
1. Ask employers to verify through our Attestation Portal
2. Completed verifications create attestations
3. Build a verified employment history

### Sharing Attestations
- Each attestation has a unique link
- Share with potential employers
- Reduces time in hiring process

### Privacy Considerations
- Attestations are public on blockchain
- Consider which verifications to create
- Revocation is not possible (by design)

## For Employers

### Verifying Candidates
1. Candidate shares attestation UID
2. Look up on Base blockchain
3. Verify data matches resume

### Creating Attestations
- Use Attestation Portal
- Verify current/former employees
- Support candidates' careers

## Technical Details

### Network
- Base (Ethereum L2)
- Low gas costs
- Fast finality

### Contract
- EAS (Ethereum Attestation Service)
- Standard attestation schema
- Open source and auditable`
      }
    ]
  },
  {
    id: 'api',
    title: 'API Reference',
    icon: Code,
    articles: [
      {
        id: 'api-authentication',
        title: 'API Authentication',
        content: `# API Authentication

Authenticate your API requests using your API key.

## Getting Your API Key

1. Log in to Indexios (Professional or Enterprise plan required)
2. Navigate to **API Access** from the user dropdown
3. Click **Generate API Key**
4. Copy and securely store your key

> ⚠️ **Important**: API keys are shown only once. If you lose your key, you'll need to generate a new one.

## Using Your API Key

Include the key in the Authorization header:

\`\`\`bash
curl -X POST https://api.indexios.me/v1/scan \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"resume_url": "https://..."}'
\`\`\`

## Security Best Practices

### Do ✅
- Store keys in environment variables
- Use secrets management services
- Rotate keys periodically
- Monitor usage for anomalies

### Don't ❌
- Commit keys to version control
- Share keys in tickets/emails
- Use keys in client-side code
- Log keys in application logs

## Rate Limits

| Plan | Requests/Hour |
|------|---------------|
| Professional | 100 |
| Enterprise | 1,000 |

Exceeding limits returns \`429 Too Many Requests\`.

## Error Responses

### 401 Unauthorized
\`\`\`json
{
  "error": "invalid_api_key",
  "message": "The provided API key is invalid or expired"
}
\`\`\`

### 403 Forbidden
\`\`\`json
{
  "error": "insufficient_permissions",
  "message": "Your plan does not include API access"
}
\`\`\`

### 429 Rate Limited
\`\`\`json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "retry_after": 3600
}
\`\`\``
      },
      {
        id: 'api-endpoints',
        title: 'API Endpoints',
        content: `# API Endpoints

Complete reference for all available API endpoints.

## Base URL

\`\`\`
https://api.indexios.me/v1
\`\`\`

## Endpoints

### POST /scan

Upload and analyze a resume.

**Request:**
\`\`\`json
{
  "resume_url": "https://storage.example.com/resume.pdf",
  "callback_url": "https://your-webhook.com/callback",
  "options": {
    "include_interview_questions": true,
    "include_next_steps": true
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "scan_id": "scan_abc123def456",
  "status": "processing",
  "created_at": "2024-01-15T10:30:00Z"
}
\`\`\`

### GET /scan/:id

Retrieve scan results.

**Response:**
\`\`\`json
{
  "id": "scan_abc123def456",
  "status": "analyzed",
  "candidate": {
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "legitimacy_score": 87,
  "analysis": {
    "consistency_score": 92,
    "consistency_details": "...",
    "experience_verification": 85,
    "experience_details": "...",
    "education_verification": 88,
    "education_details": "...",
    "skills_alignment": 83,
    "skills_details": "...",
    "red_flags": ["Minor 2-month gap..."],
    "green_flags": ["Employment verified...", "Clear progression..."],
    "summary": "...",
    "next_steps": ["Verify MIT degree...", "..."],
    "interview_questions": ["Walk me through...", "..."]
  },
  "resume_url": "...",
  "created_at": "2024-01-15T10:30:00Z"
}
\`\`\`

### POST /verify

Request employment verification.

**Request:**
\`\`\`json
{
  "scan_id": "scan_abc123def456",
  "employer_name": "TechCorp Inc",
  "method": "phone",
  "candidate_name": "Jane Smith"
}
\`\`\`

**Response:**
\`\`\`json
{
  "verification_id": "ver_xyz789",
  "status": "pending",
  "estimated_completion": "2024-01-17T10:30:00Z"
}
\`\`\`

### GET /verify/:id

Check verification status.

**Response:**
\`\`\`json
{
  "id": "ver_xyz789",
  "status": "verified",
  "result": {
    "employment_confirmed": true,
    "dates_match": true,
    "title_confirmed": "Senior Engineer",
    "call_duration": "0:42",
    "transcript_url": "..."
  },
  "attestation_uid": "0x..."
}
\`\`\`

### GET /attestations/:candidate_email

Retrieve all attestations for a candidate.

**Response:**
\`\`\`json
{
  "attestations": [
    {
      "uid": "0x...",
      "employer": "TechCorp Inc",
      "title": "Senior Engineer",
      "dates": "2020-01 to 2023-06",
      "verified_at": "2024-01-15"
    }
  ]
}
\`\`\``
      },
      {
        id: 'webhooks',
        title: 'Webhooks',
        content: `# Webhooks

Receive real-time notifications when events occur in your Indexios account.

## Setting Up Webhooks

Configure webhook URLs in your account settings or via API.

### Via Dashboard
1. Go to API Access
2. Click "Configure Webhooks"
3. Add your endpoint URL
4. Select events to subscribe to

### Via API
\`\`\`bash
curl -X POST https://api.indexios.me/v1/webhooks \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "url": "https://your-app.com/webhooks/indexios",
    "events": ["scan.completed", "verification.completed"]
  }'
\`\`\`

## Webhook Events

### scan.completed
Fired when resume analysis finishes.

\`\`\`json
{
  "event": "scan.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "scan_id": "scan_abc123",
    "status": "analyzed",
    "legitimacy_score": 87
  }
}
\`\`\`

### verification.completed
Fired when phone/email verification finishes.

\`\`\`json
{
  "event": "verification.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "verification_id": "ver_xyz789",
    "scan_id": "scan_abc123",
    "status": "verified",
    "employer": "TechCorp Inc"
  }
}
\`\`\`

### attestation.created
Fired when blockchain attestation is recorded.

\`\`\`json
{
  "event": "attestation.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "attestation_uid": "0x...",
    "candidate_name": "Jane Smith",
    "employer": "TechCorp Inc"
  }
}
\`\`\`

## Webhook Security

### Signature Verification
Each webhook includes a signature header:

\`\`\`
X-Indexios-Signature: sha256=abc123...
\`\`\`

Verify using your webhook secret:
\`\`\`javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
\`\`\`

### Best Practices
- Use HTTPS endpoints only
- Verify signatures on every request
- Respond with 200 within 5 seconds
- Implement idempotency

## Retry Policy

Failed webhooks (non-2xx response) retry:
- 1st retry: 1 minute
- 2nd retry: 5 minutes
- 3rd retry: 30 minutes

After 3 failures, webhook is disabled.`
      }
    ]
  },
  {
    id: 'teams',
    title: 'Teams & Folders',
    icon: Users,
    articles: [
      {
        id: 'team-management',
        title: 'Team Management',
        content: `# Team Management

Enterprise users can create teams for collaborative hiring and shared scan access.

## Creating a Team

1. Navigate to **Team** from the user dropdown
2. Enter your team name
3. Click **Create Team**

Your team is immediately ready for members.

## Inviting Members

### Send Invitations
1. Enter the email address of your team member
2. Click **Send Invite**
3. Repeat for additional members

### Invitation Process
1. Member receives email invitation
2. They click the link to accept
3. Once accepted, they appear in your team list
4. They can now access team scans

### Invitation Status
- **Pending**: Invitation sent, not yet accepted
- **Active**: Member has accepted and joined
- **Removed**: Member was removed from team

## Team Limits

| Plan | Team Members |
|------|--------------|
| Free | None |
| Starter | None |
| Professional | None |
| Enterprise | Up to 5 |

For larger teams, contact sales.

## Team Permissions

### Owner (You)
- Full access to all features
- Invite and remove members
- View all team scans
- Delete the team

### Members
- View team scans
- Create new scans (added to team)
- Save candidates to team folders
- Share scan results

## Shared Resources

When you have a team:
- All scans created by members are visible to all
- Saved candidates appear in team folders
- Verification results are shared
- Usage counts against team quota

## Managing Members

### Remove a Member
1. Go to Team page
2. Find the member to remove
3. Click the remove icon
4. Confirm removal

Removed members:
- Lose access immediately
- Cannot see team scans
- Their past scans remain visible to team

## Deleting a Team

> ⚠️ This action is irreversible

1. Go to Team page
2. Click "Delete Team"
3. Confirm deletion

**What happens:**
- All members lose access
- Scans remain but are no longer shared
- Team cannot be recovered`
      },
      {
        id: 'saved-candidates',
        title: 'Saved Candidates & Folders',
        content: `# Saved Candidates & Folders

Organize your candidate pipeline with folders and saved candidates.

## Creating Folders

1. Go to **Saved Candidates** from the user dropdown
2. Click **New Folder**
3. Enter folder name
4. Select a color for visual organization
5. Click **Create**

## Folder Organization Tips

### By Role
- Engineering Candidates
- Sales Candidates
- Marketing Candidates

### By Stage
- 🔴 Initial Screening
- 🟡 Phone Interview
- 🟢 Final Round
- 🔵 Offer Extended

### By Source
- LinkedIn Referrals
- Job Board Applications
- Internal Referrals

## Saving Candidates

### From Scan Results
1. Complete a scan
2. Click the folder dropdown
3. Select destination folder
4. Optionally add notes

### From History
1. View scan history
2. Click on a candidate
3. Use the "Save to folder" dropdown

## Managing Saved Candidates

### Add Notes
1. Open Saved Candidates
2. Click on a saved candidate
3. Add or edit notes
4. Notes save automatically

### Move Between Folders
1. Remove from current folder
2. Re-save to new folder

### Remove from Folder
1. Find the candidate
2. Click remove icon
3. Candidate is unsaved (scan still exists)

## Editing Folders

### Rename
1. Click edit icon on folder
2. Enter new name
3. Save changes

### Change Color
1. Click edit icon
2. Select new color
3. Save changes

### Delete Folder
1. Click delete icon
2. Confirm deletion
3. Saved candidates are removed (scans preserved)

## Team Folders (Enterprise)

For Enterprise teams:
- All team members see all folders
- Any member can save to any folder
- Folder changes visible to all
- Organize candidates collectively`
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Lock,
    articles: [
      {
        id: 'data-security',
        title: 'Data Security',
        content: `# Data Security

Indexios takes data security seriously. Here's how we protect your information.

## Encryption

### In Transit
- TLS 1.3 for all connections
- HTTPS enforced everywhere
- Certificate pinning for mobile
- Modern cipher suites only

### At Rest
- AES-256 encryption for databases
- Encrypted file storage
- Key management via cloud KMS
- Regular key rotation

## Access Control

### Authentication
- Email-based authentication
- Session management with expiry
- Device tracking and alerts
- Remote logout capability

### Authorization
- Role-based access control
- Team-level permissions
- API key scoping
- Audit logging

## Infrastructure

### Hosting
- SOC 2 compliant cloud providers
- Geographic data residency options
- Regular security audits
- 24/7 monitoring

### Network
- DDoS protection
- Web application firewall
- Intrusion detection
- Rate limiting

## Data Handling

### Processing
- Minimal data collection
- Purpose limitation
- Data minimization
- Retention policies

### Storage
- Encrypted at rest
- Access logging
- Backup encryption
- Secure deletion

## Incident Response

### Detection
- Automated monitoring
- Anomaly detection
- Log analysis
- User reports

### Response
- Incident response team
- Communication protocols
- Remediation procedures
- Post-incident review

## Certifications

- SOC 2 Type II (in progress)
- GDPR compliant
- CCPA compliant

## Security Reporting

Found a vulnerability? Contact security@indexios.me

We appreciate responsible disclosure and will acknowledge your contribution.`
      },
      {
        id: 'privacy-compliance',
        title: 'Privacy & Compliance',
        content: `# Privacy & Compliance

Indexios is designed for privacy compliance across jurisdictions.

## GDPR Compliance

### Data Subject Rights
We support all GDPR rights:
- **Access**: Request your data
- **Rectification**: Correct inaccurate data
- **Erasure**: Delete your data
- **Portability**: Export your data
- **Objection**: Object to processing

### Lawful Basis
We process data based on:
- Legitimate interest (service provision)
- Contract performance
- Consent (where required)

### Data Processing Agreements
Available for all customers:
- Standard contractual clauses
- Sub-processor list
- Processing records

## CCPA Compliance

### California Residents
You have the right to:
- Know what data we collect
- Delete your data
- Opt-out of data sales (we don't sell data)
- Non-discrimination

### Disclosure
We collect:
- Account information (email, name)
- Usage data (scans, verifications)
- Payment information (via Stripe)

We do NOT sell personal information.

## FCRA Considerations

### Important Disclaimer
Indexios provides **tools**, not **consumer reports** as defined by FCRA.

### Employer Responsibilities
If using Indexios for employment decisions:
- Obtain candidate consent
- Provide adverse action notices if required
- Follow state-specific requirements
- Maintain compliance documentation

### Best Practices
1. Inform candidates you use verification tools
2. Allow candidates to explain discrepancies
3. Don't rely solely on scores for decisions
4. Document your process

## International Data

### EU Data Residency
- EU data stays in EU
- Standard contractual clauses for transfers
- Privacy Shield (where applicable)

### Other Regions
- Contact us for specific requirements
- Custom data residency available for Enterprise

## Data Retention

### Default Retention
- Scan data: Account lifetime
- Verification recordings: 1 year
- Payment data: Per Stripe policies

### Deletion
- Upon account closure
- Upon request (within 30 days)
- Export available before deletion

## Contact

Privacy Officer: privacy@indexios.me

Data Protection Requests: Include "Data Request" in subject line.`
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: HelpCircle,
    articles: [
      {
        id: 'common-issues',
        title: 'Common Issues',
        content: `# Common Issues

Solutions to frequently encountered problems.

## Scan Issues

### "Could not parse resume"

**Causes:**
- File is an image, not text
- PDF is password-protected
- Corrupted file upload

**Solutions:**
1. Ensure text is selectable in the PDF
2. Remove password protection
3. Re-export from original source
4. Try a different browser

### "Analysis taking too long"

**Normal behavior:**
- 15-30 seconds typical
- Complex resumes may take longer
- First scan after inactivity slower

**If exceeding 2 minutes:**
1. Refresh the page
2. Check internet connection
3. Try uploading again
4. Contact support if persists

### "Low score for good candidate"

**Common reasons:**
- Vague/generic descriptions
- Missing dates or details
- Unusual career path
- Early-career candidates

**Remember:**
- Scores are relative, not absolute
- Context matters (industry, level)
- Use flags for specific concerns
- Interview can clarify issues

## Account Issues

### "Can't log in"

1. Check email for magic link
2. Check spam folder
3. Try different browser
4. Clear cookies and retry
5. Contact support

### "Session expired frequently"

**This is normal for:**
- Device logout from another session
- 30 days of inactivity
- Security-triggered logout

**To fix:**
1. Log in again
2. Check "Active Devices" for issues
3. Report if happening repeatedly

## Verification Issues

### "Phone verification failed"

**Common reasons:**
- Company not found
- HR line busy/no answer
- Company doesn't verify by phone
- Outside business hours

**Next steps:**
1. Try email verification
2. Verify manually
3. Check company name accuracy

### "No HR email found"

**Solutions:**
1. Check company website
2. Try general contact form
3. Use LinkedIn for contacts
4. Manual verification

## Payment Issues

### "Subscription not showing"

1. Wait 5 minutes (processing delay)
2. Refresh the page
3. Log out and back in
4. Check email for confirmation
5. Contact support with payment ID

### "Card declined"

1. Verify card details
2. Check with bank
3. Try different card
4. Contact Stripe support`
      },
      {
        id: 'contact-support',
        title: 'Contact Support',
        content: `# Contact Support

Multiple ways to get help with Indexios.

## Self-Service Resources

### Documentation
You're here! Browse all sections for detailed guides.

### FAQ
Common questions answered on our website.

## Support Channels

### Support Tickets
1. Go to **My Tickets** from user dropdown
2. Click **New Ticket**
3. Describe your issue
4. Await response (typically < 24 hours)

### Email
support@indexios.me

Include:
- Account email
- Issue description
- Screenshots if applicable
- Steps to reproduce

### Response Times

| Plan | Response Time |
|------|---------------|
| Free | 48-72 hours |
| Starter | 24 hours |
| Professional | 24 hours |
| Enterprise | 4 hours |

## Before Contacting Support

### Gather Information
- Your account email
- What you were trying to do
- Error messages (screenshots help)
- Browser and device info
- Steps to reproduce

### Try These First
1. Refresh the page
2. Clear browser cache
3. Try incognito mode
4. Check our status page
5. Review this documentation

## Bug Reports

Found a bug? Help us fix it faster:

1. Describe expected behavior
2. Describe actual behavior
3. Include steps to reproduce
4. Attach screenshots/recordings
5. Note browser/device info

## Feature Requests

We love hearing ideas:

1. Describe the feature
2. Explain your use case
3. Share why it would help
4. Suggest implementation (optional)

Submit via support ticket with "Feature Request" in subject.

## Enterprise Support

Enterprise customers receive:
- Dedicated support contact
- Priority response (4 hours)
- Phone support available
- Quarterly business reviews
- Custom training sessions`
      }
    ]
  }
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeArticle, setActiveArticle] = useState('introduction');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const renderMarkdown = (content) => {
    return content.split('\n\n').map((block, i) => {
      // Headers
      if (block.startsWith('# ')) return <h1 key={i} className="text-3xl font-medium text-white mb-6 mt-8 first:mt-0">{block.slice(2)}</h1>;
      if (block.startsWith('## ')) return <h2 key={i} className="text-2xl font-medium text-white mb-4 mt-8">{block.slice(3)}</h2>;
      if (block.startsWith('### ')) return <h3 key={i} className="text-xl font-medium text-white mb-3 mt-6">{block.slice(4)}</h3>;
      
      // Code blocks
      if (block.startsWith('```')) {
        const lines = block.split('\n');
        const lang = lines[0].slice(3);
        const code = lines.slice(1, -1).join('\n');
        return (
          <pre key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 overflow-x-auto my-4">
            <code className="text-sm text-white/80 font-mono">{code}</code>
          </pre>
        );
      }
      
      // Blockquotes
      if (block.startsWith('> ')) {
        const isWarning = block.includes('⚠️') || block.toLowerCase().includes('important');
        return (
          <div key={i} className={`flex gap-3 p-4 rounded-xl my-4 ${isWarning ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-purple-500/10 border border-purple-500/20'}`}>
            {isWarning ? <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" /> : <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />}
            <p className="text-white/70 text-sm">{block.slice(2).replace(/⚠️\s*\*\*Important\*\*:\s*/i, '')}</p>
          </div>
        );
      }
      
      // Tables
      if (block.includes('|') && block.includes('---')) {
        const rows = block.split('\n').filter(r => r.trim() && !r.includes('---'));
        const headers = rows[0]?.split('|').filter(c => c.trim()).map(c => c.trim());
        const dataRows = rows.slice(1).map(r => r.split('|').filter(c => c.trim()).map(c => c.trim()));
        return (
          <div key={i} className="overflow-x-auto my-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {headers?.map((h, j) => <th key={j} className="text-left py-2 px-3 text-white/70 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, j) => (
                  <tr key={j} className="border-b border-white/5">
                    {row.map((cell, k) => <td key={k} className="py-2 px-3 text-white/60">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      
      // Lists
      if (block.startsWith('- ') || block.startsWith('1. ')) {
        const items = block.split('\n').filter(l => l.trim());
        const isOrdered = block.startsWith('1.');
        const List = isOrdered ? 'ol' : 'ul';
        return (
          <List key={i} className={`space-y-2 my-4 ${isOrdered ? 'list-decimal' : ''} ml-4`}>
            {items.map((item, j) => {
              const text = item.replace(/^[-\d.]\s*/, '');
              return (
                <li key={j} className="flex items-start gap-2 text-white/60">
                  {!isOrdered && <span className="text-purple-400 mt-1.5">•</span>}
                  <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 text-sm">$1</code>') }} />
                </li>
              );
            })}
          </List>
        );
      }
      
      // Paragraphs
      return <p key={i} className="text-white/60 leading-relaxed my-4" dangerouslySetInnerHTML={{ __html: block.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 text-sm">$1</code>') }} />;
    });
  };

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
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Book className="w-5 h-5 text-purple-400" />
                <h1 className="text-lg font-medium text-white">Documentation</h1>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/[0.03] border-white/10 text-white placeholder-white/30 text-sm"
                />
              </div>
              <Button variant="ghost" className="lg:hidden text-white/60" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
                Menu
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto flex">
          {/* Sidebar */}
          <aside className={`w-72 flex-shrink-0 border-r border-white/[0.06] min-h-[calc(100vh-8rem)] sticky top-32 self-start ${mobileNavOpen ? 'block absolute z-30 bg-[#0a0a0a]' : 'hidden'} lg:block`}>
            <nav className="p-6 space-y-8">
              {filteredSections.map(section => (
                <div key={section.id}>
                  <button
                    onClick={() => { setActiveSection(section.id); setActiveArticle(section.articles[0]?.id); setMobileNavOpen(false); }}
                    className={`flex items-center gap-2.5 text-sm font-medium mb-3 ${activeSection === section.id ? 'text-purple-400' : 'text-white/60 hover:text-white'}`}
                  >
                    <section.icon className="w-4 h-4" />
                    {section.title}
                  </button>
                  <ul className="ml-6 space-y-1 border-l border-white/[0.06] pl-4">
                    {section.articles.map(article => (
                      <li key={article.id}>
                        <button
                          onClick={() => { setActiveSection(section.id); setActiveArticle(article.id); setMobileNavOpen(false); }}
                          className={`text-sm py-1.5 block w-full text-left transition-colors ${activeArticle === article.id && activeSection === section.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
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
          <main className="flex-1 min-w-0 p-6 lg:p-12">
            <motion.article
              key={activeArticle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl"
            >
              <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
                <Link to={createPageUrl('Home')} className="hover:text-white">Home</Link>
                <ChevronRight className="w-3 h-3" />
                <span>{currentSection?.title}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white/70">{currentArticle?.title}</span>
              </div>

              <div className="prose prose-invert max-w-none">
                {currentArticle && renderMarkdown(currentArticle.content)}
              </div>

              {/* Navigation */}
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