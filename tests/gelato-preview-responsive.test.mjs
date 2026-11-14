import test from 'node:test';
import assert from 'node:assert/strict';
import {renderFictionalPreviewDocument} from '../operations/gelato/preview-document.mjs';
const fictional={fictional:true,paymentStatus:'simulated',orderId:'DEMO-RESP-001',brand:'ONE HEART',garment:'hoodie',color:'ruby',size:'M',placement:'front',text:'Hello'};
test('offline proof has responsive garment sizing and viewport',()=>{
 const html=renderFictionalPreviewDocument(fictional);
 assert.match(html,/name="viewport"/);
 assert.match(html,/width:min\(220px,100%\)/);
 assert.match(html,/data-color="ruby"/);
 assert.match(html,/NOT FOR PRODUCTION/);
 assert.doesNotMatch(html,/<script\b|<iframe\b|<form\b|https?:\/\//i);
});
test('offline proof rejects payment data',()=>assert.throws(()=>renderFictionalPreviewDocument({...fictional,paymentStatus:'paid'})));
