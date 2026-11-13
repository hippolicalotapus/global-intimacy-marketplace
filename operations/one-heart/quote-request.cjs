"use strict";
// Local-only, nonbinding request builder. Never transmits, stores, or authorizes orders.
const styles=Object.freeze({standard:7499,premium:8499});
const colours=new Set(["ivory","charcoal","ruby"]);
const placements=new Set(["front","back"]);
function prepare(input){
 if(!input||typeof input!=="object"||!Object.hasOwn(styles,input.style)||!colours.has(input.colour)||!placements.has(input.placement))return {ok:false,error:"invalid_selection"};
 if(typeof input.text!=="string"||input.text.length>24||/[\x00-\x1f\x7f]/.test(input.text))return {ok:false,error:"invalid_text"};
 return {ok:true,checkoutEnabled:false,orderCreated:false,request:Object.freeze({style:input.style,colour:input.colour,placement:input.placement,text:input.text,baseCents:styles[input.style],currency:"CAD",finalPriceKnown:false,shippingVerified:false,taxVerified:false})};
}
module.exports={prepare};
