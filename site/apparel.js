// ONE HEART owner-approved design concepts: images are AI lookbook mockups, NOT print-ready factory art.
// This is a request-for-information preview only. No confirmed manufacture, stock, price, payment or binding pre-orders.
window.GIM_PRODUCTS = (Array.isArray(window.GIM_PRODUCTS) ? window.GIM_PRODUCTS : []).concat([
  ["Dimension One","Art Tee","Psychedelic Core","dimension-one","Visionary portal artwork with the approved ONE HEART globe-and-ruby symbol.","Multicolour"],
  ["Cosmic Fluidity","Art Tee","Psychedelic Core","cosmic-fluidity","Flowing blue, pink and gold cosmic paisley with hidden ONE HEART symbolism.","Multicolour"],
  ["Sacred Forest","Art Tee","Psychedelic Core","sacred-forest","Luminous forest, fungi and streams with an integrated heart-and-globe emblem.","Forest multicolour"],
  ["Stardust Unity","Art Tee","Psychedelic Core","stardust-unity","Cosmic geometry, glowing orbitals and a radiant lotus motif.","Midnight multicolour"],
  ["Realms Within","Art Tee","Psychedelic Core","realms-within","Dreamlike waterfalls, floating landscapes and vivid psychedelic colour.","Sky multicolour"],
  ["Melting Ruby Heart","Art Tee","Psychedelic Core","melting-ruby-heart","Surrealist flowing ruby-heart globe, liquid gold and otherworldly landscape; no clock.","Ruby, gold and sapphire"],
  ["Time Dissolves","Art Tee","Psychedelic Expanded","time-dissolves","Surreal golden architecture and flowing time-inspired scenery.","Surreal gold and blue"],
  ["Parallel Realms","Art Tee","Psychedelic Expanded","parallel-realms","Visionary architecture, intersecting worlds and concealed ONE HEART branding.","Cosmic multicolour"],
  ["Mind Expansion","Art Tee","Psychedelic Expanded","mind-expansion","Expressive consciousness-inspired visionary artwork and vibrant detail.","Psychedelic multicolour"],
  ["Liquid Dimensions","Art Tee","Psychedelic Expanded","liquid-dimensions","Liquid-gold dimensional portal framing a dreamlike world.","Liquid gold and blue"],
  ["Fractal Awakening","Art Tee","Psychedelic Expanded","fractal-awakening","Vivid sacred geometry, luminous mandala patterns and the ONE HEART emblem.","Cosmic indigo"],
  ["Rocky Mountains","Hoodie","Mountain Collection","rocky-mountains","Mountain wilderness artwork, refined back slogan with subtly emphasized ONE HEART.","Black"],
  ["Canadian Rockies","Hoodie","Mountain Collection","canadian-rockies","Snowy alpine landscapes, lake scenery and the four-line ONE HEART back message.","Natural cream"],
  ["Purcell Mountains","Hoodie","Mountain Collection","purcell-mountains","Mountain lakes and evergreen scenery in an emerald-toned hoodie edition; Purcell Mountains are primarily in British Columbia.","Forest green"],
  ["Selkirk Mountains","Hoodie","Mountain Collection","selkirk-mountains","Evening mountain scenery on a deep blue hoodie; Selkirk Mountains are primarily in British Columbia.","Navy blue"],
  ["Columbia Mountains","Hoodie","Mountain Collection","columbia-mountains","Glacier wilderness artwork on a heather charcoal hoodie; Columbia Mountains are largely in British Columbia.","Heather charcoal"]
].map(function (v,i) {
  var kind=v[1], n=v[0];
  return {id:i+88,brand:"ONE HEART",name:n+" — "+(kind==="Hoodie"?"Mountain Hoodie":"Art T-Shirt"),
    category:kind==="Hoodie"?"ONE HEART Hoodies":"ONE HEART Art Tees",collection:"ONE HEART",collectionGroup:v[2],
    researchType:kind==="Hoodie"?"Mountain artwork hoodie concept":"All-over art T-shirt concept",
    researchFeature:v[4]+" Concept colourway: "+v[5]+". Design/colours/materials subject to sample approval.",
    colorway:v[5],previewImage:"assets/one-heart/"+v[3]+".webp",
    previewImageAlt:"ONE HEART "+n+" "+kind+" approved visual design reference, not a photo of manufactured stock",
    status:"Design preview — pre-order interest only",imageApproved:false,resellerApproved:false,stockVerified:false,priceVerified:false,
    conceptImage:true,preorderType:"nonbinding enquiry"};
}));
