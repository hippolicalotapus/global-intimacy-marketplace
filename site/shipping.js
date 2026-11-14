"use strict";
/* Public eligibility rules only. No supplier costs, credentials or correspondence. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GIMShipping = api;
}(typeof window !== "undefined" ? window : globalThis, function () {
  var countryCodes = new Set("AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BV BR IO VG BN BG BF BI KH CM CA CV BQ KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF KP MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS KR SS ES LK BL SH KN LC MF PM VC SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UM VI UG UA AE GB US UY UZ VU VA VE VN WF EH YE ZM ZW".split(" "));
  function status(product, country, now) {
    if (!product || typeof product !== "object" || !countryCodes.has(country)) return "unknown";
    var rules = Array.isArray(product.deliveryRules) ? product.deliveryRules : [];
    var matching = rules.filter(function (r) { return r.country === country; });
    if (matching.some(function (r) { return r.status === "blocked"; })) return "blocked";
    // Duplicate/conflicting, expired, undated and general-region claims fail closed.
    if (matching.length !== 1) return "unknown";
    var rule = matching[0], at = now === undefined ? Date.now() : Number(now);
    var checked = Date.parse(rule.checkedAt), until = Date.parse(rule.validUntil);
    if (!Number.isFinite(at) || !Number.isFinite(checked) || !Number.isFinite(until) || checked > at || until <= at) return "unknown";
    if (rule.status !== "allowed" || rule.verified !== true || rule.productId !== product.id ||
        rule.countrywide !== true || (rule.excludedRegions || []).length > 0 || (rule.excludedPostcodes || []).length > 0 || rule.resaleTerritoryApproved !== true || rule.importReviewed !== true || rule.fulfillmentConfirmed !== true ||
        product.resellerApproved !== true || product.stockVerified !== true || product.canAcceptOrders !== true) return "unknown";
    return "eligible";
  }
  function label(product, country, name) {
    var state = status(product, country);
    return state === "eligible" ? "Delivery confirmed for " + name + " · address check applies"
      : state === "blocked" ? "Not available for delivery to " + name
      : "Delivery to " + name + " not confirmed · preview only";
  }
  return Object.freeze({status: status, label: label});
}));
