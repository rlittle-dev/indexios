import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Phone number patterns for validation
const PHONE_PATTERNS = {
  us: /(\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g,
  intl: /\+[1-9]\d{1,14}/g,
};

// Labels to identify HR vs main numbers
const HR_KEYWORDS = ['hr', 'human resources', 'talent', 'recruiting', 'recruitment', 'people', 'personnel', 'employment'];
const SUPPORT_KEYWORDS = ['support', 'customer service', 'helpdesk', 'help', 'technical'];

function normalizePhoneNumber(raw) {
  if (!raw) return null;
  
  // Remove common formatting
  const cleaned = raw.replace(/[^\d+]/g, '');
  
  // If it starts with +, assume E.164 format
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If it's 10 digits (US), add +1
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    return '+1' + cleaned;
  }
  
  // If it's 11 digits starting with 1 (US), add +
  if (cleaned.length === 11 && cleaned.startsWith('1') && /^\d{11}$/.test(cleaned)) {
    return '+' + cleaned;
  }
  
  // If it already has +, return as-is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  return null;
}

function formatPhoneDisplay(e164) {
  if (!e164) return null;
  
  // US format: +1 (555) 123-4567
  if (e164.startsWith('+1')) {
    const match = e164.match(/\+1(\d{3})(\d{3})(\d{4})/);
    if (match) {
      return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
    }
  }
  
  // International format: +CC-XXX-XXX-XXXX (basic)
  return e164.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, '$1-$2-$3-$4');
}

function identifyNumberType(raw, label) {
  const lowerLabel = (label || '').toLowerCase();
  const lowerRaw = (raw || '').toLowerCase();
  
  // Check if explicitly labeled as HR/Talent
  for (const keyword of HR_KEYWORDS) {
    if (lowerLabel.includes(keyword) || lowerRaw.includes(keyword)) {
      return 'hr';
    }
  }
  
  // Check if it's a support number (should be rejected)
  for (const keyword of SUPPORT_KEYWORDS) {
    if (lowerLabel.includes(keyword) || lowerRaw.includes(keyword)) {
      return 'support';
    }
  }
  
  return 'unknown';
}

async function fetchAndExtractPhones(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResumeVerifier/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const phones = [];
    
    // Find all phone-like patterns
    const allMatches = html.matchAll(PHONE_PATTERNS.us);
    for (const match of allMatches) {
      const raw = match[0];
      const normalized = normalizePhoneNumber(raw);
      if (normalized) {
        phones.push({ raw, normalized, context: html.substring(Math.max(0, match.index - 50), match.index + 100) });
      }
    }
    
    return phones;
  } catch (error) {
    return [];
  }
}

async function findCompanyWebsite(companyName, domain) {
  // If domain provided, assume that's the website
  if (domain) {
    return domain.startsWith('http') ? domain : `https://${domain}`;
  }
  
  // Otherwise, try to construct from company name
  const simplified = companyName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  
  const candidates = [
    `https://${simplified}.com`,
    `https://www.${simplified}.com`,
  ];
  
  // Try to find valid domain via fetch
  for (const url of candidates) {
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      if (response.ok) return url;
    } catch (error) {
      // Continue to next candidate
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // For public access, allow without auth
    const { company_name, company_domain, company_location, company_website_url, company_linkedin_url } = await req.json();
    
    if (!company_name) {
      return Response.json({ error: 'company_name is required' }, { status: 400 });
    }
    
    const checkedSources = [];
    const foundCandidates = [];
    let bestPhone = null;
    let bestType = null;
    let bestConfidence = 0;
    let bestSource = null;
    
    // Step 1: Try provided website URL
    let website = company_website_url;
    if (!website) {
      website = await findCompanyWebsite(company_name, company_domain);
    }
    
    if (website) {
      // Try main page
      checkedSources.push(website);
      let phones = await fetchAndExtractPhones(website);
      
      // Try contact page
      const contactUrl = website.replace(/\/$/, '') + '/contact';
      checkedSources.push(contactUrl);
      phones = phones.concat(await fetchAndExtractPhones(contactUrl));
      
      // Try careers page
      const careersUrl = website.replace(/\/$/, '') + '/careers';
      checkedSources.push(careersUrl);
      phones = phones.concat(await fetchAndExtractPhones(careersUrl));
      
      // Try about page
      const aboutUrl = website.replace(/\/$/, '') + '/about';
      checkedSources.push(aboutUrl);
      phones = phones.concat(await fetchAndExtractPhones(aboutUrl));
      
      // Evaluate found numbers
      for (const phone of phones) {
        const type = identifyNumberType(phone.raw, phone.context);
        
        if (type === 'support') {
          foundCandidates.push({
            raw: phone.raw,
            label: 'support',
            accepted: false,
            reject_reason: 'Support number, not HR/main corporate',
          });
          continue;
        }
        
        const confidence = type === 'hr' ? 0.9 : 0.8;
        
        foundCandidates.push({
          raw: phone.raw,
          label: type,
          accepted: true,
          confidence,
        });
        
        // Pick best phone (HR > main, higher confidence)
        if (confidence > bestConfidence || (confidence === bestConfidence && type === 'hr' && bestType !== 'hr')) {
          bestPhone = phone.normalized;
          bestType = type;
          bestConfidence = confidence;
          bestSource = website;
        }
      }
    }
    
    // Step 2: Try LinkedIn as fallback
    if (!bestPhone && company_linkedin_url) {
      checkedSources.push(company_linkedin_url);
      // LinkedIn pages rarely expose phone numbers in public HTML, skip for now
    }
    
    // Step 3: Validate and return
    if (bestPhone && bestConfidence >= 0.70) {
      return Response.json({
        company: company_name,
        phone: {
          type: bestType,
          e164: bestPhone,
          display: formatPhoneDisplay(bestPhone),
          source: bestSource,
          confidence: bestConfidence,
        },
        debug: {
          checked_sources: checkedSources,
          found_candidates: foundCandidates,
          decision: `Found ${bestType === 'hr' ? 'HR' : 'main corporate'} phone number with ${Math.round(bestConfidence * 100)}% confidence.`,
        },
      });
    }
    
    // No acceptable number found
    return Response.json({
      company: company_name,
      debug: {
        checked_sources: checkedSources,
        found_candidates: foundCandidates,
        decision: bestPhone
          ? `Found phone ${bestPhone} but confidence ${Math.round(bestConfidence * 100)}% below threshold of 70%.`
          : 'No acceptable HR or main corporate phone number found with confidence >= 0.70; omitted.',
      },
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});