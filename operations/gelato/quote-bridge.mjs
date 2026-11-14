// Internal demonstration bridge only: two independent fictional previews, never checkout.
import quoteModule from '../one-heart/quote-preview.cjs';
import { reserveFictionalPreview } from './fictional-adapter.mjs';
export function previewFictionalApparelWorkflow(input) {
  if (!input || input.fictional !== true || input.paymentStatus !== 'simulated') throw new Error('Fictional workflow only');
  if (!input.quoteInput || input.quoteInput.country !== 'CA') throw new Error('Canadian preview quote required');
  if (input.quoteInput.shippingQuote?.fictional !== true || input.quoteInput.taxFictional !== true) throw new Error('Fictional quote evidence required');
  const quote = quoteModule.quote(input.quoteInput);
  if (quote.status !== 'preview_only' || quote.checkoutEnabled !== false) throw new Error('Quote not eligible for preview');
  // The quote is CAD/Canada; Gelato's fixed example is USD/US. Never present as a matched price or shipping quote.
  const supplier = reserveFictionalPreview(input);
  return Object.freeze({mode:'fictional-internal-preview',checkoutEnabled:false,orderSubmitted:false,quote, supplier, comparisonAvailable:false, reason:'Different currencies and demonstration destinations; no live pricing or fulfillment eligibility'});
}
