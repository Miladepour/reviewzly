export async function onRequest(context) {
  // context.params.path is an array, e.g., ["credits"] or ["sendsms"]
  const path = context.params.path ? context.params.path.join('/') : '';
  const targetUrl = new URL('https://api.voodoosms.com/' + path);
  
  // Clone the incoming request to Voodoo's API
  const request = new Request(targetUrl, context.request);
  
  // Strip browser security headers so Voodoo server accepts it natively
  request.headers.delete("Origin");
  request.headers.delete("Referer");
  
  // Execute the secure proxy tunnel fetch
  const response = await fetch(request);
  
  // Return the data directly to the Reviewzly dashboard
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  
  return newResponse;
}
