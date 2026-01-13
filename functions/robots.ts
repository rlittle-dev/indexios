Deno.serve(async (req) => {
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${new URL(req.url).origin}/sitemap.xml`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
});