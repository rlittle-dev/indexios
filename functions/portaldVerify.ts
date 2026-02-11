// Portald domain verification endpoint
// Access at: https://your-app.base44.app/api/portaldVerify

Deno.serve(async (req) => {
  // Return the verification token for Portald
  // Replace this with your actual verification token from Portald
  const verificationToken = "indexios.me";
  
  return new Response(verificationToken, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    }
  });
});