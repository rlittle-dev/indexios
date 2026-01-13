import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// HR/People/Talent keywords
const HR_KEYWORDS = ['hr', 'human resources', 'talent', 'recruiting', 'recruitment', 'people', 'personnel', 'employment', 'careers'];
const SUPPORT_KEYWORDS = ['support', 'customer service', 'helpdesk', 'help', 'technical', 'tier 1', 'tier 2'];
const MAIN_KEYWORDS = ['main', 'headquarters', 'hq', 'switchboard', 'general', 'corporate', 'central', 'reception'];

// Phone patterns - US and international
const PHONE_PATTERNS = {
  us: /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g,
  e164: /\+[1-9]\d{1,14}/g,
  tel: /tel:\+?([0-9\-\s\(\)\.]+)/gi,
};

function scoreLabel(text) {
  if (!text) return { score: 0.5, type: 'unknown' };
  const lower = text.toLowerCase();
  
  // HR/People > Main > Support > Unknown
  for (const kw of HR_KEYWORDS) {
    if (lower.includes(kw)) return { score: 0.95, type: 'hr' };
  }
  
  for (const kw of SUPPORT_KEYWORDS) {
    if (lower.includes(kw)) return { score: 0.3, type: 'support' };
  }
  
  for (const kw of MAIN_KEYWORDS) {
    if (lower.includes(kw)) return { score: 0.75, type: 'main' };
  }
  
  // Generic contact/business = main-ish
  if (lower.includes('contact') || lower.includes('business') || lower.includes('office')) {
    return { score: 0.65, type: 'main' };
  }
  
  return { score: 0.5, type: 'unknown' };
}

function normalizePhone(raw) {
  if (!raw) return { raw: null, e164: null, display: null };
  
  const trimmed = raw.trim();
  
  // Try E.164 first
  const e164Match = trimmed.match(/\+[1-9]\d{1,14}/);
  if (e164Match) {
    return { raw: trimmed, e164: e164Match[0], display: e164Match[0] };
  }
  
  // Try US (10 digits)
  const usMatch = trimmed.match(/\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
  if (usMatch) {
    const e164 = `+1${usMatch[1]}${usMatch[2]}${usMatch[3]}`;
    const display = `+1 (${usMatch[1]}) ${usMatch[2]}-${usMatch[3]}`;
    return { raw: trimmed, e164, display };
  }
  
  // Try any digit sequence 7+ chars
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 7) {
    // Assume US if 10 digits, otherwise international
    if (digits.length === 10) {
      const e164 = `+1${digits}`;
      const display = `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      return { raw: trimmed, e164, display };
    } else if (digits.length >= 11) {
      // International
      const e164 = `+${digits}`;
      return { raw: trimmed, e164, display: trimmed };
    }
  }
  
  return { raw: trimmed, e164: null, display: null };
}

function extractPhonesFromHtml(html, sourceUrl) {
  const candidates = [];
  
  // Strategy 1: Extract tel: links
  let match;
  while ((match = PHONE_PATTERNS.tel.exec(html)) !== null) {
    const raw = match[1].trim();
    const normalized = normalizePhone(raw);
    if (normalized.raw) {
      const startIdx = Math.max(0, match.index - 100);
      const endIdx = Math.min(html.length, match.index + 150);
      const context = html.substring(startIdx, endIdx).replace(/<[^>]*>/g, ' ').slice(0, 100);
      candidates.push({ ...normalized, context, source: sourceUrl });
    }
  }
  
  // Strategy 2: Extract patterns from text (remove HTML first)
  const text = html.replace(/<script[^>]*>.*?<\/script>/gi, '')
                   .replace(/<style[^>]*>.*?<\/style>/gi, '')
                   .replace(/<[^>]*>/g, ' ')
                   .replace(/\s+/g, ' ');
  
  // Look for phone numbers near HR/contact keywords
  const sections = text.split(/(?:hr|human resources|talent|recruiting|contact|phone|call|dial)/i);
  
  for (const section of sections.slice(0, 10)) { // Limit to reduce noise
    const phoneMatch = section.match(/(\+?[1-9]\d{0,2}[-.\s]?\(??\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) {
      const normalized = normalizePhone(phoneMatch[0]);
      if (normalized.raw && !candidates.find(c => c.e164 === normalized.e164 && c.raw === normalized.raw)) {
        const context = section.substring(0, 80);
        candidates.push({ ...normalized, context, source: sourceUrl });
      }
    }
  }
  
  // Strategy 3: JSON-LD schema (if present)
  const schemaRegex = /"telephone":\s*"([^"]+)"/gi;
  while ((match = schemaRegex.exec(html)) !== null) {
    const normalized = normalizePhone(match[1]);
    if (normalized.raw && !candidates.find(c => c.e164 === normalized.e164 && c.raw === normalized.raw)) {
      candidates.push({ ...normalized, context: 'JSON-LD schema', source: sourceUrl });
    }
  }
  
  return candidates;
}

async function fetchPage(url, timeout = 8000) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(timeout),
    });
    
    if (response.ok && response.status < 400) {
      return await response.text();
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function searchForCompanyUrls(companyName, base44) {
  const queries = [
    `${companyName} human resources phone number contact`,
    `${companyName} talent acquisition phone`,
    `${companyName} people operations contact phone`,
    `${companyName} HR phone number`,
    `${companyName} headquarters phone`,
  ];
  
  const urls = [];
  
  for (const query of queries) {
    try {
      const results = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web for: "${query}". Return the top 3 most official-looking URLs that might contain HR or main phone numbers. Only return URLs from official company domains. Format: one URL per line, no explanations.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of official URLs to check',
            },
          },
          required: ['urls'],
        },
      });
      
      if (results.urls && Array.isArray(results.urls)) {
        urls.push(...results.urls.filter(u => typeof u === 'string' && u.includes('http')));
      }
    } catch (error) {
      console.error(`Search error for "${query}":`, error.message);
    }
  }
  
  return [...new Set(urls)].slice(0, 8); // Dedupe, limit to 8
}

async function crawlUrls(urls) {
  const candidates = [];
  
  for (const url of urls) {
    if (!url || !url.includes('http')) continue;
    
    const html = await fetchPage(url);
    if (html) {
      const extracted = extractPhonesFromHtml(html, url);
      candidates.push(...extracted);
    }
  }
  
  return candidates;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { company_name } = await req.json();
    
    if (!company_name) {
      return Response.json({ error: 'company_name required' }, { status: 400 });
    }
    
    const debug = {
      called: true,
      internet_access: 'unknown',
      search_queries: [],
      search_results: [],
      checked_urls: [],
      extracted_candidates: [],
      final_decision: '',
    };
    
    // Step 1: Search for URLs
    const queries = [
      `${company_name} human resources phone number contact`,
      `${company_name} talent acquisition phone`,
      `${company_name} headquarters phone`,
      `${company_name} contact phone number`,
    ];
    debug.search_queries = queries;
    
    let searchUrls = [];
    let searchSucceeded = false;
    
    try {
      const searchResults = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web for company contact information. Queries: ${queries.join(' | ')}. Return the top 5-8 URLs that look official (from the company's own domain, e.g., /contact, /careers, /about, /locations). Include the page title if available. Return as JSON array.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  title: { type: 'string' },
                },
              },
            },
          },
          required: ['urls'],
        },
      });
      
      if (searchResults.urls && Array.isArray(searchResults.urls)) {
        searchUrls = searchResults.urls.map(item => item.url || item).filter(u => u && u.includes('http'));
        searchSucceeded = true;
        debug.internet_access = 'ok';
        debug.search_results = searchResults.urls.slice(0, 8);
      }
    } catch (error) {
      console.error('Search failed:', error.message);
      debug.internet_access = 'blocked';
    }
    
    // Step 2: Crawl discovered URLs
    const allCandidates = [];
    
    if (searchUrls.length > 0) {
      debug.checked_urls = searchUrls.slice(0, 8);
      const crawlCandidates = await crawlUrls(searchUrls);
      allCandidates.push(...crawlCandidates);
    }
    
    // Step 3: Score and rank candidates
    const scored = allCandidates.map(candidate => {
      const labelScore = scoreLabel(candidate.context);
      return {
        raw: candidate.raw,
        e164: candidate.e164,
        display: candidate.display,
        source: candidate.source,
        context: candidate.context,
        label: labelScore.type,
        score: labelScore.score,
      };
    });
    
    // Remove duplicates (same e164)
    const unique = [];
    const seen = new Set();
    for (const c of scored) {
      if (!seen.has(c.e164)) {
        unique.push(c);
        seen.add(c.e164);
      }
    }
    
    // Sort by score desc
    unique.sort((a, b) => b.score - a.score);
    
    // Build extracted_candidates for debug
    debug.extracted_candidates = unique.map(c => ({
      raw: c.raw,
      context: c.context.substring(0, 80),
      label: c.label,
      accepted: c.score >= 0.3, // Threshold for acceptance
      reject_reason: c.score < 0.3 ? 'Low confidence' : undefined,
      confidence: c.score,
      source: c.source,
    }));
    
    // Step 4: Select best
    const best = unique.find(c => c.score >= 0.3);
    
    if (best) {
      debug.final_decision = `Selected ${best.label} number (confidence ${(best.score * 100).toFixed(0)}%) from ${best.source}`;
      return Response.json({
        company: company_name,
        phone: {
          type: best.label,
          raw: best.raw,
          display: best.display,
          e164: best.e164 || '',
          source: best.source,
          confidence: best.score,
        },
        debug,
      });
    }
    
    // No acceptable candidate
    debug.final_decision = allCandidates.length === 0
      ? 'No phone numbers found in any checked URLs'
      : `${allCandidates.length} candidates found but all scored below 0.30 threshold`;
    
    return Response.json({
      company: company_name,
      debug,
    });
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    return Response.json({
      company: 'unknown',
      error: error.message,
      debug: {
        called: true,
        internet_access: 'unknown',
        final_decision: `Fatal error: ${error.message}`,
      },
    }, { status: 500 });
  }
});