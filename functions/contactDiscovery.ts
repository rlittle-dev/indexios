import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * High-precision contact discovery: phone and email for HR verification
 * Returns HIGH confidence or NOT_FOUND (no guessing)
 */

function isValidPhone(phone) {
  // Basic phone format validation
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function discoverPhone(base44, companyName, companyDomain) {
  console.log(`[ContactDiscovery:Phone] Searching for ${companyName}`);

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the official HR or main contact phone number for ${companyName} (domain: ${companyDomain}).

STRICT RULES:
- Only return phone numbers from official company website (${companyDomain})
- Must be from contact, careers, about, or HR pages
- Must be a main/general company number, not personal
- Return the EXACT URL where you found it

If you cannot find a high-confidence match, return NOT_FOUND.

Format: JSON {phone, sourceUrl, confidence: "HIGH" or "NOT_FOUND", context}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          phone: { type: 'string' },
          sourceUrl: { type: 'string' },
          confidence: { type: 'string' },
          context: { type: 'string' }
        }
      }
    });

    if (result.confidence !== 'HIGH' || !result.phone) {
      console.log('[ContactDiscovery:Phone] No high-confidence result');
      return { value: null, source_url: null, confidence: 'NOT_FOUND' };
    }

    // Validate phone format
    if (!isValidPhone(result.phone)) {
      console.log('[ContactDiscovery:Phone] Invalid phone format');
      return { value: null, source_url: null, confidence: 'NOT_FOUND' };
    }

    // Validate source URL contains company domain
    if (companyDomain && !result.sourceUrl.includes(companyDomain)) {
      console.log('[ContactDiscovery:Phone] Source URL does not match company domain');
      return { value: null, source_url: null, confidence: 'NOT_FOUND' };
    }

    console.log(`✅ [ContactDiscovery:Phone] Found: ${result.phone}`);
    return {
      value: result.phone,
      source_url: result.sourceUrl,
      confidence: 'HIGH'
    };

  } catch (error) {
    console.error('[ContactDiscovery:Phone] Error:', error);
    return { value: null, source_url: null, confidence: 'NOT_FOUND' };
  }
}

async function discoverEmail(base44, companyName, companyDomain) {
  console.log(`[ContactDiscovery:Email] Searching for ${companyName}`);

  if (!companyDomain) {
    return { value: null, source_url: null, confidence: 'NOT_FOUND' };
  }

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the official HR or recruiting email for ${companyName} (domain: ${companyDomain}).

STRICT RULES:
- Only return emails from official company website (${companyDomain})
- Must be from contact, careers, or HR pages
- Prefer: hr@, recruiting@, talent@, careers@, people@, humanresources@
- Do NOT return personal emails (first.last@)
- Return the EXACT URL where you found it

If you cannot find a high-confidence match, return NOT_FOUND.

Format: JSON {email, sourceUrl, confidence: "HIGH" or "NOT_FOUND", context}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          sourceUrl: { type: 'string' },
          confidence: { type: 'string' },
          context: { type: 'string' }
        }
      }
    });

    if (result.confidence !== 'HIGH' || !result.email) {
      console.log('[ContactDiscovery:Email] No high-confidence result');
      return { value: null, source_url: null, confidence: 'NOT_FOUND' };
    }

    // Validate email format
    if (!isValidEmail(result.email)) {
      console.log('[ContactDiscovery:Email] Invalid email format');
      return { value: null, source_url: null, confidence: 'NOT_FOUND' };
    }

    // Validate email domain matches company domain
    const emailDomain = result.email.split('@')[1];
    if (!companyDomain.includes(emailDomain) && !emailDomain.includes(companyDomain)) {
      console.log('[ContactDiscovery:Email] Email domain does not match company domain');
      return { value: null, source_url: null, confidence: 'NOT_FOUND' };
    }

    console.log(`✅ [ContactDiscovery:Email] Found: ${result.email}`);
    return {
      value: result.email,
      source_url: result.sourceUrl,
      confidence: 'HIGH'
    };

  } catch (error) {
    console.error('[ContactDiscovery:Email] Error:', error);
    return { value: null, source_url: null, confidence: 'NOT_FOUND' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyName, companyDomain } = await req.json();

    if (!companyName) {
      return Response.json({ error: 'Missing company name' }, { status: 400 });
    }

    console.log(`[ContactDiscovery] Starting for ${companyName}`);

    // Run phone and email discovery in parallel
    const [phone, email] = await Promise.all([
      discoverPhone(base44, companyName, companyDomain),
      discoverEmail(base44, companyName, companyDomain)
    ]);

    const notes = [];
    if (phone.confidence === 'NOT_FOUND') notes.push('No high-confidence phone found');
    if (email.confidence === 'NOT_FOUND') notes.push('No high-confidence email found');

    return Response.json({
      success: true,
      phone,
      email,
      notes: notes.join('; ')
    });

  } catch (error) {
    console.error('[ContactDiscovery] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});