import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Scoring keywords
const HR_KEYWORDS = ['human resources', 'hr', 'people', 'people ops', 'talent', 'recruit', 'careers', 'hiring', 'employment'];
const MAIN_KEYWORDS = ['headquarters', 'hq', 'switchboard', 'main', 'corporate', 'office', 'general', 'reception'];
const SUPPORT_KEYWORDS = ['support', 'customer service', 'technical'];

// Permissive phone regex - matches most phone number formats
// Supports: +1 800 555 1212, 1-800-555-1212, (800) 555-1212, 800.555.1212, 800 555 1212
const PHONE_REGEX = /(\+?\d{1,3}[\s\-.()]*)?(\(?\d{2,4}\)?[\s\-.()]*)?\d{3}[\s\-.()]*\d{4}/g;

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
  const digits = cleaned.replace(/\D/g, '');
  
  // Validate digit count: keep 10-15 digits
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  
  let country = null;
  let areaCode, midSection, lastSection;
  
  // US: 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    country = 'US';
    areaCode = digits.slice(1, 4);
    midSection = digits.slice(4, 7);
    lastSection = digits.slice(7, 11);
    const e164 = `+${digits}`;
    const display = `+1 (${areaCode}) ${midSection}-${lastSection}`;
    return { raw: cleaned, digits, e164, display, country };
  }
  
  // US: 10 digits (assume US when no country prefix)
  if (digits.length === 10) {
    country = 'US';
    areaCode = digits.slice(0, 3);
    midSection = digits.slice(3, 6);
    lastSection = digits.slice(6, 10);
    const e164 = `+1${digits}`;
    const display = `+1 (${areaCode}) ${midSection}-${lastSection}`;
    return { raw: cleaned, digits, e164, display, country };
  }
  
  // International: 11-15 digits (no leading 1 or has leading +)
  if (digits.length >= 11) {
    const e164 = `+${digits}`;
    return { raw: cleaned, digits, e164, display: cleaned, country: 'INTL' };
  }
  
  // Already has + prefix (< 10 digits after stripping, likely partial)
  if (cleaned.startsWith('+')) {
    return null; // Too short
  }
  
  // Fallback: too short
  return null;
}

// Extract tel: links from HTML
function extractTelLinks(html) {
  const candidates = [];
  const telRegex = /href=["']tel:([^"']+)["']/gi;
  let match;
  while ((match = telRegex.exec(html)) !== null) {
    const raw = match[1];
    const normalized = normalizePhone(raw);
    if (normalized) {
      candidates.push({
        raw: normalized.raw,
        digits: normalized.raw.replace(/\D/g, ''),
        source: 'tel',
        context_snippet: raw.substring(0, 100),
      });
    }
  }
  return candidates;
}

// Extract phones from plain text (HTML stripped)
function extractFromPlainText(html) {
  const candidates = [];
  
  // Strip HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (match, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, code) => String.fromCharCode(parseInt(code, 16)));
  
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Extract with phone regex
  let match;
  const phoneRegexGlobal = new RegExp(PHONE_REGEX.source, 'g');
  while ((match = phoneRegexGlobal.exec(text)) !== null) {
    const raw = match[0];
    const normalized = normalizePhone(raw);
    if (normalized) {
      // Get context (50 chars before/after)
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + raw.length + 50);
      const snippet = text.substring(start, end);
      
      candidates.push({
        raw: normalized.raw,
        digits: normalized.raw.replace(/\D/g, ''),
        source: 'text',
        context_snippet: snippet.substring(0, 150),
      });
    }
  }
  return candidates;
}

// Extract from JSON-LD structured data
function extractFromJsonLd(html) {
  const candidates = [];
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi;
  let match;
  
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const phone = json.telephone || json.contactPoint?.telephone;
      if (phone && typeof phone === 'string') {
        const normalized = normalizePhone(phone);
        if (normalized) {
          candidates.push({
            raw: normalized.raw,
            digits: normalized.raw.replace(/\D/g, ''),
            source: 'jsonld',
            context_snippet: phone.substring(0, 100),
          });
        }
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }
  return candidates;
}

// Extract from script content (raw scripts, __NEXT_DATA__, etc)
function extractFromScriptContent(html) {
  const candidates = [];
  const scriptRegex = /<script[^>]*>([^<]*)<\/script>/gi;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    
    // Extract with phone regex
    let phoneMatch;
    const phoneRegexGlobal = new RegExp(PHONE_REGEX.source, 'g');
    while ((phoneMatch = phoneRegexGlobal.exec(content)) !== null) {
      const raw = phoneMatch[0];
      const normalized = normalizePhone(raw);
      if (normalized) {
        const start = Math.max(0, phoneMatch.index - 50);
        const end = Math.min(content.length, phoneMatch.index + raw.length + 50);
        const snippet = content.substring(start, end);
        
        candidates.push({
          raw: normalized.raw,
          digits: normalized.raw.replace(/\D/g, ''),
          source: 'script',
          context_snippet: snippet.substring(0, 150),
        });
      }
    }
  }
  return candidates;
}

// Filter out obvious false positives and script noise
function filterFalsePositives(candidates) {
  const filtered = [];
  const scriptNoiseKeywords = ['webpackJsonp', '__NEXT_DATA__', 'JSON.stringify', 'var ', 'function', 'const '];
  
  for (const c of candidates) {
    const digits = c.digits;
    
    // Reject if < 10 or > 15 digits
    if (digits.length < 10 || digits.length > 15) {
      c.reject_reason = 'invalid_length';
      continue;
    }
    
    // Reject if looks like a date (YYYY-MM-DD, etc)
    if (/^\d{4}-\d{2}-\d{2}/.test(c.raw)) {
      c.reject_reason = 'looks_like_date';
      continue;
    }
    
    // Reject if 4+ repeating digits (e.g., 11111)
    if (/(\d)\1{3,}/.test(digits)) {
      c.reject_reason = 'repeating_digits';
      continue;
    }
    
    // Reject script noise: candidates from <script> containing code keywords and no phone context
    if (c.source === 'script') {
      const hasScriptNoise = scriptNoiseKeywords.some(kw => c.context_snippet.includes(kw));
      const hasPhoneKeywords = /\b(phone|call|contact|hotline|support|hr|human|talent|recruit|careers)\b/i.test(c.context_snippet);
      
      if (hasScriptNoise && !hasPhoneKeywords) {
        c.reject_reason = 'script_noise_no_context';
        continue;
      }
    }
    
    filtered.push(c);
  }
  
  return filtered;
}

// Main extraction function - uses all 4 sources
function extractPhonesFromPage(html, sourceUrl) {
  const allCandidates = [];
  const allExtracted = [];
  
  // A) Tel links
  const telLinks = extractTelLinks(html);
  allExtracted.push(...telLinks);
  
  // B) Plain text
  const plainText = extractFromPlainText(html);
  allExtracted.push(...plainText);
  
  // C) JSON-LD
  const jsonLd = extractFromJsonLd(html);
  allExtracted.push(...jsonLd);
  
  // D) Script content
  const scriptContent = extractFromScriptContent(html);
  allExtracted.push(...scriptContent);
  
  // Dedupe by digits + raw
  const seen = new Set();
  for (const candidate of allExtracted) {
    const key = `${candidate.digits}|${candidate.raw}`;
    if (!seen.has(key)) {
      seen.add(key);
      
      // Normalize and attach e164
      const normalized = normalizePhone(candidate.raw);
      allCandidates.push({
        raw: candidate.raw,
        digits: candidate.digits,
        source: candidate.source,
        context_snippet: candidate.context_snippet,
        e164: normalized ? normalized.e164 : null,
        display: normalized ? normalized.display : candidate.raw,
      });
    }
  }
  
  // Filter false positives
  const filtered = filterFalsePositives(allCandidates);
  
  return { all: allCandidates, filtered, total: allExtracted.length };
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
    const contentType = response.headers.get('content-type') || 'unknown';
    const rawHtmlLength = body ? body.length : 0;
    const first500Chars = body ? body.substring(0, 500) : '';
    
    return {
      status: response.status,
      content_type: contentType,
      raw_html_length: rawHtmlLength,
      first_500_chars: first500Chars,
      fetched: response.ok && response.status < 400,
      body,
    };
  } catch (error) {
    return {
      status: 0,
      content_type: 'error',
      raw_html_length: 0,
      first_500_chars: '',
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
    const allExtractedCandidates = [];
    
    for (const url of officialUrls) {
      const fetchResult = await fetchPage(url);
      
      debug.fetch_results.push({
        url,
        status: fetchResult.status,
        content_type: fetchResult.content_type,
        raw_html_length: fetchResult.raw_html_length,
        first_500_chars: fetchResult.first_500_chars,
        error: fetchResult.error || null,
      });
      
      if (fetchResult.fetched && fetchResult.body) {
        // Extract from all 4 sources
        const extraction = extractPhonesFromPage(fetchResult.body, url);
        
        // Log warning if page seems too small
        if (fetchResult.raw_html_length < 500) {
          console.log(`⚠️  WARN: ${url} very small (${fetchResult.raw_html_length} bytes)`);
        }
        
        // Add filtered candidates to official candidates
        officialCandidates.push(...extraction.filtered);
        
        // Track ALL extracted (for debug)
        allExtractedCandidates.push(...extraction.all);
        
        // Update fetch results with candidate count
        const lastResult = debug.fetch_results[debug.fetch_results.length - 1];
        lastResult.candidates_found = extraction.filtered.length;
        
        console.log(`✅ FETCH: ${url} (${fetchResult.status}) → ${fetchResult.raw_html_length} bytes → extracted ${extraction.total} total, ${extraction.filtered.length} after filtering`);
      } else {
        console.log(`❌ FETCH FAILED: ${url} (${fetchResult.status})${fetchResult.error ? ' - ' + fetchResult.error : ''}`);
      }
    }
    
    // STEP 3: Score official candidates
    debug.stage = 'extract';
    const scoredOfficial = officialCandidates.map(c => {
      const scored = scoreCandidate(c.raw, c.context_snippet || '');
      return {
        raw: c.raw,
        e164: c.e164,
        display: c.display,
        source: c.source,
        context_snippet: c.context_snippet,
        extraction_source: c.source,
        type: scored.type,
        score: scored.score,
      };
    });
    
    // Build debug.extracted_candidates with all candidates
    debug.extracted_candidates = allExtractedCandidates.map(c => ({
      raw: c.raw,
      digits: c.digits,
      source: c.source,
      context_snippet: c.context_snippet.substring(0, 80),
      accepted: scoredOfficial.some(s => s.raw === c.raw && s.score >= 0.5),
      reject_reason: scoredOfficial.some(s => s.raw === c.raw && s.score < 0.5) ? 'low_score' : null,
    }));
    
    debug.official_candidates = scoredOfficial.map(c => ({
      raw: c.raw,
      display: c.display,
      type: c.type,
      score: (c.score * 100).toFixed(0) + '%',
      source: c.source,
      extraction_source: c.extraction_source,
      context: c.context_snippet.substring(0, 60),
      accepted: c.score >= 0.5,
    }));
    
    console.log(`📊 EXTRACT: ${allExtractedCandidates.length} total extracted → ${officialCandidates.length} after filtering → ${scoredOfficial.filter(c => c.score >= 0.5).length} accepted (score >= 50%)`);
    
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