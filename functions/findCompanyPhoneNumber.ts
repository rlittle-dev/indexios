import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Scoring keywords
const HR_KEYWORDS = ['human resources', 'hr', 'people', 'people ops', 'talent', 'recruit', 'careers', 'hiring', 'employment'];
const MAIN_KEYWORDS = ['headquarters', 'hq', 'switchboard', 'main', 'corporate', 'office', 'general', 'reception'];
const SUPPORT_KEYWORDS = ['support', 'customer service', 'technical'];

// Comprehensive phone regex patterns
const PHONE_PATTERNS = [
  /\+1\s*\(?(\d{3})\)?\s*[-.\s]?(\d{3})\s*[-.\s]?(\d{4})/g, // +1 (555) 123-4567
  /\(?(\d{3})\)?\s*[-.\s]?(\d{3})\s*[-.\s]?(\d{4})/g,        // (555) 123-4567 or 555-123-4567
  /\+44\s*[0-9\s\(\)\-\.]+/g,                                  // +44 ...
  /\+[1-9]\d{1,14}/g,                                           // E.164 international
  /tel:\+?[0-9\-\s\(\)\.]+/gi,                                 // tel: links
];

function scoreCandidate(raw, nearbyText) {
  if (!raw || !nearbyText) {
    return { score: 0.5, type: 'unknown' };
  }
  
  const lowerText = nearbyText.toLowerCase();
  
  // HR/People/Talent keywords
  for (const kw of HR_KEYWORDS) {
    if (lowerText.includes(kw)) {
      return { score: 0.9, type: 'hr' };
    }
  }
  
  // Support keywords (lower score)
  for (const kw of SUPPORT_KEYWORDS) {
    if (lowerText.includes(kw)) {
      return { score: 0.35, type: 'support' };
    }
  }
  
  // Main/HQ keywords
  for (const kw of MAIN_KEYWORDS) {
    if (lowerText.includes(kw)) {
      return { score: 0.8, type: 'main' };
    }
  }
  
  // Generic "contact" = main
  if (lowerText.includes('contact') || lowerText.includes('phone') || lowerText.includes('call')) {
    return { score: 0.65, type: 'main' };
  }
  
  return { score: 0.5, type: 'unknown' };
}

function normalizePhone(raw) {
  if (!raw) return null;
  
  const cleaned = raw.trim();
  
  // Return raw + best-effort e164/display
  const digits = cleaned.replace(/\D/g, '');
  
  // US: 10 digits
  if (digits.length === 10 && /^\d{10}$/.test(digits)) {
    const e164 = `+1${digits}`;
    const display = `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return { raw: cleaned, e164, display };
  }
  
  // US with country: 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    const e164 = `+${digits}`;
    const display = `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    return { raw: cleaned, e164, display };
  }
  
  // International: >= 11 digits with leading +
  if (digits.length >= 11) {
    const e164 = `+${digits}`;
    return { raw: cleaned, e164, display: cleaned };
  }
  
  // Already has +
  if (cleaned.startsWith('+')) {
    return { raw: cleaned, e164: cleaned, display: cleaned };
  }
  
  // Fallback: return raw, best effort on formatting
  return { raw: cleaned, e164: null, display: cleaned };
}

function extractPhonesFromHtml(html, sourceUrl) {
  const candidates = [];
  
  // Remove script/style
  const cleanHtml = html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  // Try each pattern
  for (const pattern of PHONE_PATTERNS) {
    let match;
    // Reset regex state
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(cleanHtml)) !== null) {
      const raw = match[0];
      const normalized = normalizePhone(raw);
      
      if (normalized && !candidates.find(c => c.e164 === normalized.e164 && c.raw === normalized.raw)) {
        // Extract nearby text for labeling (100 chars before/after)
        const startIdx = Math.max(0, match.index - 100);
        const endIdx = Math.min(cleanHtml.length, match.index + raw.length + 100);
        const nearbyHtml = cleanHtml.substring(startIdx, endIdx);
        const nearbyText = nearbyHtml.replace(/<[^>]*>/g, ' ').trim();
        
        candidates.push({
          ...normalized,
          nearbyText,
          source: sourceUrl,
        });
      }
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
    
    const body = response.ok && response.status < 400 ? await response.text() : null;
    return {
      status: response.status,
      fetched: response.ok && response.status < 400,
      body,
    };
  } catch (error) {
    return {
      status: 0,
      fetched: false,
      body: null,
      error: error.message,
    };
  }
}

async function searchForUrls(companyName, base44) {
  const queries = [
    `${companyName} contact us phone number`,
    `${companyName} customer service contact`,
    `${companyName} headquarters address phone`,
  ];
  
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find official contact pages for: ${companyName}. Search queries: ${queries.join(' | ')}. Return top 6–8 URLs from the official company domain only. Include /contact, /about, /careers, /locations, /support. Return as JSON.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Official company URLs',
          },
        },
        required: ['urls'],
      },
    });
    
    return result.urls ? result.urls.filter(u => typeof u === 'string' && u.includes('http')).slice(0, 8) : [];
  } catch (error) {
    console.error('URL search failed:', error.message);
    return [];
  }
}

async function fallbackPhoneSearch(companyName, base44) {
  const queries = [
    `${companyName} headquarters phone number`,
    `${companyName} corporate office phone`,
    `${companyName} main phone number`,
    `${companyName} switchboard phone`,
  ];
  
  const results = [];
  
  for (const query of queries) {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for: "${query}". Return any phone numbers found in search results/snippets, along with the source URL. Format as JSON array of {phone, source_url, snippet}.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            phones: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phone: { type: 'string' },
                  source_url: { type: 'string' },
                  snippet: { type: 'string' },
                },
              },
            },
          },
          required: ['phones'],
        },
      });
      
      if (result.phones && Array.isArray(result.phones)) {
        results.push(...result.phones);
      }
    } catch (error) {
      console.error(`Fallback search "${query}" failed:`, error.message);
    }
  }
  
  return results;
}

Deno.serve(async (req) => {
  const debug = {
    called: true,
    stage: 'discovery',
    official_urls: [],
    fetch_results: [],
    official_candidates: [],
    fallback_search_used: false,
    fallback_sources: [],
    fallback_candidates: [],
    final_decision: '',
    error: null,
  };
  
  try {
    const base44 = createClientFromRequest(req);
    const { company_name } = await req.json();
    
    console.log(`🔍 PHONE FINDER CALLED: ${company_name}`);
    
    if (!company_name) {
      debug.error = 'company_name required';
      debug.final_decision = 'FAILED: missing company_name param';
      console.log(`❌ PHONE FINDER ERROR: ${company_name}`, JSON.stringify(debug, null, 2));
      return Response.json({ error: 'company_name required', debug }, { status: 400 });
    }
    
    // STEP 1: URL Discovery
    debug.stage = 'discovery';
    const officialUrls = await searchForUrls(company_name, base44);
    debug.official_urls = officialUrls;
    console.log(`📍 URL DISCOVERY: found ${officialUrls.length} official URLs`);
    if (officialUrls.length > 0) {
      console.log(`   URLs: ${officialUrls.slice(0, 3).join(', ')}`);
    }
    
    // STEP 2: Fetch + Extract
    debug.stage = 'fetch';
    const officialCandidates = [];
    
    for (const url of officialUrls) {
      const fetchResult = await fetchPage(url);
      const bytesLen = fetchResult.body ? fetchResult.body.length : 0;
      debug.fetch_results.push({
        url,
        status: fetchResult.status,
        fetched: fetchResult.fetched,
        bytes: bytesLen,
        candidates_found: 0,
      });
      
      if (fetchResult.fetched && fetchResult.body) {
        const extracted = extractPhonesFromHtml(fetchResult.body, url);
        officialCandidates.push(...extracted);
        
        // Update candidates_found count
        const lastResult = debug.fetch_results[debug.fetch_results.length - 1];
        lastResult.candidates_found = extracted.length;
        console.log(`✅ FETCH: ${url} (${fetchResult.status}) → ${bytesLen} bytes → ${extracted.length} candidates`);
      } else {
        console.log(`❌ FETCH FAILED: ${url} (${fetchResult.status})${fetchResult.error ? ' - ' + fetchResult.error : ''}`);
      }
    }
    
    // STEP 3: Score official candidates
    debug.stage = 'extract';
    const scoredOfficial = officialCandidates.map(c => {
      const scored = scoreCandidate(c.raw, c.nearbyText);
      return {
        raw: c.raw,
        e164: c.e164,
        display: c.display,
        source: c.source,
        nearbyText: c.nearbyText,
        type: scored.type,
        score: scored.score,
      };
    });
    
    debug.official_candidates = scoredOfficial.map(c => ({
      raw: c.raw,
      display: c.display,
      type: c.type,
      score: (c.score * 100).toFixed(0) + '%',
      source: c.source,
      context: c.nearbyText.substring(0, 60),
      accepted: c.score >= 0.5,
    }));
    
    console.log(`📊 EXTRACT: ${officialCandidates.length} raw candidates → ${scoredOfficial.filter(c => c.score >= 0.5).length} accepted (score >= 50%)`);
    
    // STEP 4: Decide - if official found nothing, run fallback
    debug.stage = 'fallback';
    let fallbackCandidates = [];
    
    if (officialCandidates.length === 0) {
      debug.fallback_search_used = true;
      console.log(`🔄 FALLBACK: official URLs yielded 0 candidates → running fallback phone search...`);
      
      const fallbackResults = await fallbackPhoneSearch(company_name, base44);
      
      debug.fallback_sources = fallbackResults.map(r => ({
        url: r.source_url,
        snippet: r.snippet ? r.snippet.substring(0, 100) : '',
      }));
      
      console.log(`   fallback search checked 4 queries → ${fallbackResults.length} results found`);
      
      for (const result of fallbackResults) {
        const normalized = normalizePhone(result.phone);
        if (normalized && !fallbackCandidates.find(c => c.e164 === normalized.e164)) {
          fallbackCandidates.push({
            raw: normalized.raw,
            e164: normalized.e164,
            display: normalized.display,
            source: result.source_url,
            type: 'main', // Fallback sources are always main/corporate
            score: 0.65, // Medium confidence for fallback
          });
        }
      }
      
      debug.fallback_candidates = fallbackCandidates.map(c => ({
        raw: c.raw,
        display: c.display,
        type: c.type,
        score: (c.score * 100).toFixed(0) + '%',
        source: c.source,
      }));
      
      console.log(`   normalized → ${fallbackCandidates.length} fallback candidates added`);
    } else {
      console.log(`✨ OFFICIAL CANDIDATES FOUND: skipping fallback (${officialCandidates.length} official candidates)`);
    }
    
    // STEP 5: Combine and select best
    debug.stage = 'end';
    const allCandidates = [...scoredOfficial, ...fallbackCandidates];
    
    // Dedupe by e164
    const unique = [];
    const seen = new Set();
    for (const c of allCandidates) {
      if (!seen.has(c.e164)) {
        unique.push(c);
        seen.add(c.e164);
      }
    }
    
    // Sort by score desc
    unique.sort((a, b) => b.score - a.score);
    
    // Select best (no hard threshold during debug, but filter obvious junk like personal numbers)
    const best = unique.length > 0 ? unique[0] : null;
    
    if (best) {
      const sourceLabel = officialCandidates.find(c => c.e164 === best.e164) ? 'official' : 'fallback';
      debug.final_decision = `✅ RETURNED: ${best.type} number (${(best.score * 100).toFixed(0)}% confidence, ${sourceLabel} source)`;
      debug.error = null;
      
      console.log(`🎯 PHONE FINDER RESULT (${company_name}): ${debug.final_decision}`);
      console.log(`   Final debug: ${JSON.stringify(debug, null, 2)}`);
      
      return Response.json({
        company: company_name,
        phone: {
          type: best.type,
          raw: best.raw,
          display: best.display,
          e164: best.e164 || '',
          source: best.source,
          confidence: best.score,
        },
        debug,
      });
    }
    
    // No candidates found anywhere
    debug.final_decision = '⚠️ OMITTED: No phone numbers found in official contact pages or fallback searches';
    debug.error = null;
    
    console.log(`🎯 PHONE FINDER RESULT (${company_name}): ${debug.final_decision}`);
    console.log(`   Final debug: ${JSON.stringify(debug, null, 2)}`);
    
    return Response.json({
      company: company_name,
      debug,
    });
    
  } catch (error) {
    console.error(`❌ PHONE FINDER FATAL ERROR (${debug.company || 'unknown'}): ${error.message}`);
    debug.stage = 'error';
    debug.error = error.message;
    debug.final_decision = `💥 FAILED: ${error.message}`;
    console.log(`   Error debug: ${JSON.stringify(debug, null, 2)}`);
    
    return Response.json({
      company: debug.company || 'unknown',
      debug,
    }, { status: 500 });
  }
});