import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check enterprise tier
    if (user.subscription_tier !== 'enterprise') {
      return Response.json({ error: 'Bulk upload is only available for Enterprise plan' }, { status: 403 });
    }

    const { fileUrls } = await req.json();

    if (!fileUrls || fileUrls.length < 5) {
      return Response.json({ error: 'Bulk upload requires at least 5 files' }, { status: 400 });
    }

    const analyses = [];

    // Process each resume
    for (const file_url of fileUrls) {
      try {
        // Analyze with advanced AI
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert HR analyst. Perform a RIGOROUS analysis of this resume for legitimacy.

CURRENT DATE FOR CONTEXT: ${new Date().toISOString().split('T')[0]}

Score rigorously - only exceptional candidates deserve high scores. Most should be in 50-70 range.

Evaluate:
1. Consistency: Timeline gaps, overlaps, career progression
2. Experience: Specific metrics vs generic descriptions
3. Education: Verifiable institutions and dates
4. Skills: Alignment with experience timeline

Be harsh on sparse/vague resumes. Flag generic descriptions.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              candidate_name: { type: "string" },
              candidate_email: { type: "string" },
              overall_score: { type: "number" },
              consistency_score: { type: "number" },
              consistency_details: { type: "string" },
              experience_verification: { type: "number" },
              experience_details: { type: "string" },
              education_verification: { type: "number" },
              education_details: { type: "string" },
              skills_alignment: { type: "number" },
              skills_details: { type: "string" },
              red_flags: { type: "array", items: { type: "string" } },
              green_flags: { type: "array", items: { type: "string" } },
              summary: { type: "string" }
            }
          }
        });

        // Save candidate to database
        const candidate = await base44.asServiceRole.entities.Candidate.create({
          name: analysis.candidate_name || 'Unknown',
          email: analysis.candidate_email || '',
          resume_url: file_url,
          legitimacy_score: analysis.overall_score,
          analysis: {
            consistency_score: analysis.consistency_score,
            consistency_details: analysis.consistency_details,
            experience_verification: analysis.experience_verification,
            experience_details: analysis.experience_details,
            education_verification: analysis.education_verification,
            education_details: analysis.education_details,
            skills_alignment: analysis.skills_alignment,
            skills_details: analysis.skills_details,
            red_flags: analysis.red_flags || [],
            green_flags: analysis.green_flags || [],
            summary: analysis.summary
          },
          status: 'analyzed'
        });

        analyses.push({
          id: candidate.id,
          name: analysis.candidate_name || 'Unknown',
          email: analysis.candidate_email || '',
          ...analysis
        });
      } catch (error) {
        console.error('Error analyzing file:', error);
        analyses.push({
          name: 'Error',
          overall_score: 0,
          error: 'Failed to analyze this resume'
        });
      }
    }

    // Sort by overall_score descending (highest risk to lowest)
    const sorted = analyses.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));

    return Response.json({ analyses: sorted });
  } catch (error) {
    console.error('Bulk analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});