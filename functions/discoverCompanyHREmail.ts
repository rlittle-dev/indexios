import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.subscription_tier !== 'enterprise') {
      return Response.json({ error: 'Enterprise subscription required' }, { status: 403 });
    }

    const { companyName, companyDomain } = await req.json();

    if (!companyName || !companyDomain) {
      return Response.json({ error: 'Company name and domain are required' }, { status: 400 });
    }

    console.log(`[DiscoverHR] Looking up HR email for ${companyName} (${companyDomain})`);

    const emailResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the HR or employment verification EMAIL ADDRESS for ${companyName}.

Search specifically for:
- HR department email (e.g., hr@company.com, humanresources@company.com)
- Employment verification email (e.g., employment.verification@company.com, verification@company.com)
- People operations email (e.g., people@company.com, peopleops@company.com)
- General corporate contact email that could handle HR inquiries
- Recruiting/talent email (e.g., careers@company.com, recruiting@company.com)

Many companies list HR emails on their careers page, contact page, or in job postings.
Check ${companyName}'s official website, LinkedIn company page, and job boards.
The company domain is ${companyDomain}.

IMPORTANT: Only return an email if you found it from a legitimate source. Do NOT guess or make up email addresses.
If you cannot find a verified HR email, return null for the email field.

Format: JSON {email: string | null, source: string, confidence: "high" | "medium" | "low"}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          source: { type: 'string' },
          confidence: { type: 'string' }
        }
      }
    });

    if (emailResult?.email && emailResult.confidence !== 'low') {
      console.log(`[DiscoverHR] Found email: ${emailResult.email} (${emailResult.confidence})`);
      return Response.json({
        email: emailResult.email,
        source: emailResult.source || 'Web search',
        confidence: emailResult.confidence || 'medium'
      });
    }

    console.log(`[DiscoverHR] No reliable email found for ${companyName}`);
    return Response.json({
      email: null,
      message: 'Could not find a verified HR email for this company'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});