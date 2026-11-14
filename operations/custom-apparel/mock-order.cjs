"use strict";
/* Internal-only clothing customization mock. No customer data, network, inventory, pricing or payments. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GIMMockApparel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GARMENTS = Object.freeze({
    tshirt: Object.freeze({sizes: ["XS","S","M","L","XL","2XL","3XL"], colors: ["black","white","navy","forest"]}),
    hoodie: Object.freeze({sizes: ["S","M","L","XL","2XL","3XL"], colors: ["black","cream","navy","forest"]})
  });
  const FIELDS = new Set(["garment","size","color","quantity","frontText","backText","frontPlacement","backPlacement","textStyle"]);
  const FRONT = new Set(["center","left-chest"]);
  const BACK = new Set(["center"]);
  const STYLES = new Set(["bold","classic","mono"]);

  function validate(input) {
    if (!input || typeof input !== "object" || Array.isArray(input) ||
        Object.keys(input).some(key => !FIELDS.has(key))) return {ok:false, reason:"unexpected_fields"};
    const garment = input.garment;
    if (!Object.hasOwn(GARMENTS, garment)) return {ok:false, reason:"garment"};
    if (!GARMENTS[garment].sizes.includes(input.size)) return {ok:false, reason:"size"};
    if (!GARMENTS[garment].colors.includes(input.color)) return {ok:false, reason:"color"};
    if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 10)
      return {ok:false, reason:"quantity"};
    const text = value => {
      if (typeof value !== "string") return null;
      const clean = value.trim().normalize("NFC");
      if ([...clean].length > 48 || /[<>\u0000-\u001f\u007f]/u.test(clean)) return null;
      return clean;
    };
    const frontText = text(input.frontText), backText = text(input.backText);
    if (frontText === null || backText === null) return {ok:false, reason:"text"};
    if (!frontText && !backText) return {ok:false, reason:"design_required"};
    if (!FRONT.has(input.frontPlacement) || !BACK.has(input.backPlacement))
      return {ok:false, reason:"placement"};
    const textStyle = input.textStyle === undefined ? "bold" : input.textStyle;
    if (!STYLES.has(textStyle)) return {ok:false, reason:"text_style"};
    const design = Object.freeze({garment, size:input.size, color:input.color, quantity:input.quantity,
      frontText, backText, frontPlacement:input.frontPlacement, backPlacement:input.backPlacement, textStyle});
    return {ok:true, design};
  }

  function createMockSession() {
    let staged = null;
    let counter = 0;
    function invalidate() {staged = null;}
    function preview(input) {
      const checked = validate(input);
      staged = checked.ok ? checked.design : null;
      if (!checked.ok) return {status:"invalid", reason:checked.reason, checkoutEnabled:false};
      return {status:"preview_only", design:staged, quoteStatus:"quote_required",
        shippingStatus:"unverified", checkoutEnabled:false};
    }
    function confirmMock() {
      if (!staged) return {status:"invalid", reason:"preview_required", checkoutEnabled:false};
      const design = staged;
      staged = null;  // One preview authorizes only one mock receipt.
      counter += 1;
      return Object.freeze({status:"mock_only", mockId:"MOCK-"+String(counter).padStart(4,"0"),
        design, quoteStatus:"quote_required", shippingStatus:"unverified",
        paymentStatus:"disabled", fulfillmentStatus:"not_submitted", checkoutEnabled:false});
    }
    return Object.freeze({preview, confirmMock, invalidate});
  }
  return Object.freeze({GARMENTS, validate, createMockSession});
});
