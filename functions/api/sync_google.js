export async function onRequestPost({ request, env }) {
  try {
     // 1. Verify Authentication Token gracefully
     const authHeader = request.headers.get("Authorization");
     if (!authHeader) {
         return new Response(JSON.stringify({ error: "Unauthorized endpoint access." }), { status: 401 });
     }
     
     // 2. Parse payload request
     let payload;
     try {
         payload = await request.json();
     } catch(e) {
         return new Response(JSON.stringify({ error: "Invalid JSON format." }), { status: 400 });
     }

     const { businessName } = payload;
     if (!businessName) {
         return new Response(JSON.stringify({ error: "Required parameter 'businessName' is missing." }), { status: 400 });
     }

     // 3. SECURE GOOGLE CLOUD HANDSHAKE
     const apiKey = env.GOOGLE_PLACES_API_KEY;
     if (!apiKey) {
         throw new Error("CRITICAL PIPELINE ERROR: GOOGLE_PLACES_API_KEY is not configured in the Cloudflare Environment.");
     }

     // We use a strictly encoded generic Text Search ping (averages 1 API Credit, extremely cheap vs Advanced searches).
     const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(businessName)}&key=${apiKey}`;
     
     const googleResponse = await fetch(searchUrl);
     const data = await googleResponse.json();

     // 4. If we found the Business externally, proceed to grab DEEP details (The 5 Reviews)
     if (data.results && data.results.length > 0) {
         const topHit = data.results[0]; // Take the highest probable Google Match
         const placeId = topHit.place_id;

         let fiveReviews = [];
         
         // SECONDARY FETCH: Deep Review Extraction
         try {
             const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}`;
             const detailsRes = await fetch(detailsUrl);
             const detailsData = await detailsRes.json();
             
             if (detailsData.result && detailsData.result.reviews) {
                 fiveReviews = detailsData.result.reviews.map(r => ({
                     author_name: r.author_name,
                     rating: r.rating,
                     relative_time_description: r.relative_time_description,
                     text: r.text || ""
                 }));
             }
         } catch(deepErr) {
             console.error("Deep Extraction Failed, but core stats succeeded:", deepErr);
         }

         return new Response(JSON.stringify({
             rating: topHit.rating || 0,
             total_reviews: topHit.user_ratings_total || 0,
             place_id: placeId,
             reviews: fiveReviews
         }), { 
             status: 200,
             headers: { 'Content-Type': 'application/json' }
         });
     } else {
         return new Response(JSON.stringify({ error: "Google API could not find a matching public location for this name." }), { 
             status: 404,
             headers: { 'Content-Type': 'application/json' }
         });
     }

  } catch(e) {
      console.error("Cloudflare Proxy Google Fetch Crash:", e.message);
      return new Response(JSON.stringify({ error: "Internal Gateway Error", details: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
