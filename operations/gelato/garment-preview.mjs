import {prepareFictionalProof} from './design-proof.mjs';
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function renderFictionalGarmentPreview(input) {
 const proof=prepareFictionalProof(input);
 if(proof.checkoutEnabled!==false||proof.submitToSupplier!==false||proof.requiresArtworkApproval!==true) throw new Error('Unsafe proof');
 return '<section aria-label="Fictional garment preview"><h2>'+escapeHtml(proof.brand)+' '+escapeHtml(proof.garment)+'</h2><div class="garment" data-color="'+escapeHtml(proof.color)+'"><span>'+escapeHtml(proof.personalization)+'</span></div><p>'+escapeHtml(proof.watermark)+'</p><p>'+escapeHtml(proof.size)+' / '+escapeHtml(proof.placement)+'</p></section>';
}
