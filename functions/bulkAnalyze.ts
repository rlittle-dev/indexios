import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

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
          prompt: `You are an expert HR analyst and background verification specialist. Perform a COMPREHENSIVE and DETAILED analysis of this resume for legitimacy and authenticity.

Evaluate the following aspects with DEEP ANALYSIS:
1. **Consistency Score**: Check for timeline gaps, overlapping dates, logical career progression
2. **Experience Verification**: Assessment of job titles, responsibilities, achievements
3. **Education Verification**: Check of degrees, institutions, graduation dates
4. **Skills Alignment**: Verification of skills matching experience

Look for RED FLAGS and GREEN FLAGS comprehensively.

Provide an EXTENSIVE analysis with percentage scores, detailed reasoning, and actionable insights.`,
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

        analyses.push({
          name: analysis.candidate_name || 'Unknown',
          email: analysis.candidate_email || '',
          ...analysis
        });
      } catch (error) {
        console.error('Error analyzing file:', error);
        analyses.push({
          name: 'Error',
          error: 'Failed to analyze this resume'
        });
      }
    }

    // Generate PDF report
    const doc = new jsPDF();
    let currentY = 20;

    // Title
    doc.setFontSize(24);
    doc.text('INDEXIOS BULK ANALYSIS REPORT', 20, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, currentY);
    doc.text(`Total Resumes: ${analyses.length}`, 20, currentY + 5);
    currentY += 20;

    // Each candidate
    analyses.forEach((candidate, index) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      // Candidate header
      doc.setFontSize(16);
      doc.text(`${index + 1}. ${candidate.name || 'Unknown'}`, 20, currentY);
      currentY += 7;

      if (candidate.error) {
        doc.setFontSize(10);
        doc.text(`Error: ${candidate.error}`, 20, currentY);
        currentY += 15;
        return;
      }

      doc.setFontSize(12);
      doc.text(`Overall Score: ${candidate.overall_score}%`, 20, currentY);
      currentY += 7;

      if (candidate.email) {
        doc.setFontSize(9);
        doc.text(`Email: ${candidate.email}`, 20, currentY);
        currentY += 5;
      }

      // Scores
      doc.setFontSize(10);
      doc.text(`Consistency: ${candidate.consistency_score}%`, 25, currentY);
      currentY += 5;
      doc.text(`Experience: ${candidate.experience_verification}%`, 25, currentY);
      currentY += 5;
      doc.text(`Education: ${candidate.education_verification}%`, 25, currentY);
      currentY += 5;
      doc.text(`Skills: ${candidate.skills_alignment}%`, 25, currentY);
      currentY += 7;

      // Summary
      if (candidate.summary) {
        doc.setFontSize(9);
        const summaryLines = doc.splitTextToSize(candidate.summary, 170);
        doc.text(summaryLines, 20, currentY);
        currentY += summaryLines.length * 4 + 5;
      }

      // Red flags
      if (candidate.red_flags?.length > 0) {
        doc.setFontSize(10);
        doc.text('Red Flags:', 20, currentY);
        currentY += 5;
        doc.setFontSize(8);
        candidate.red_flags.forEach(flag => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
          const flagLines = doc.splitTextToSize(`• ${flag}`, 165);
          doc.text(flagLines, 25, currentY);
          currentY += flagLines.length * 3.5 + 2;
        });
      }

      currentY += 5;

      // Green flags
      if (candidate.green_flags?.length > 0) {
        doc.setFontSize(10);
        doc.text('Green Flags:', 20, currentY);
        currentY += 5;
        doc.setFontSize(8);
        candidate.green_flags.forEach(flag => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
          const flagLines = doc.splitTextToSize(`• ${flag}`, 165);
          doc.text(flagLines, 25, currentY);
          currentY += flagLines.length * 3.5 + 2;
        });
      }

      currentY += 10;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=bulk-analysis-${Date.now()}.pdf`
      }
    });
  } catch (error) {
    console.error('Bulk analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});