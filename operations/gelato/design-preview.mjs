// Internal fictional design-to-order demonstration; no file uploads or network access.
const GARMENTS = Object.freeze({tee:'t-shirt',hoodie:'hoodie'});
const COLORS = new Set(['ivory','charcoal','ruby']);
const SIZES = new Set(['S','M','L','XL','2XL']);
const PLACEMENTS = new Set(['front','back']);
const BRANDS = new Set(['ONE HEART','Sarcastabastard']);
export function prepareFictionalDesign(input) {
  if (!input || input.fictional !== true || input.paymentStatus !== 'simulated') throw new Error('Fictional inputs only');
  if (!/^DEMO-[A-Z0-9-]{3,40}$/.test(input.orderId || '')) throw new Error('Demo ID required');
  if (!Object.hasOwn(GARMENTS,input.garment) || !COLORS.has(input.color) || !SIZES.has(input.size) || !PLACEMENTS.has(input.placement) || !BRANDS.has(input.brand)) throw new Error('Unsupported garment selection');
  if (typeof input.text !== 'string' || input.text.length > 24 || /[\x00-\x1f\x7f]/.test(input.text)) throw new Error('Invalid personalization');
  if (input.artworkUrl !== undefined || input.customerEmail !== undefined || input.address !== undefined) throw new Error('Personal data and artwork URLs not accepted');
  return Object.freeze({mode:'fictional-design-preview',orderId:input.orderId,brand:input.brand,garment:GARMENTS[input.garment],color:input.color,size:input.size,placement:input.placement,text:input.text,checkoutEnabled:false,orderCreated:false,priceVerified:false,shippingVerified:false,supplierSkuMapped:false,fulfillmentEligible:false});
}
