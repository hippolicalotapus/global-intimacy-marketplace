import test from 'node:test';import assert from 'node:assert/strict';import {renderFictionalPreviewDocument} from '../operations/gelato/preview-document.mjs';
const input={fictional:true,paymentStatus:'simulated',orderId:'DEMO-DOC-001',brand:'ONE HEART',garment:'hoodie',color:'ruby',size:'M',placement:'front',text:'Hello'};
test('self-contained responsive proof with no external dependencies',()=>{const h=renderFictionalPreviewDocument(input);assert.match(h,/viewport/);assert.match(h,/data-color="ruby"/);assert.match(h,/NOT FOR PRODUCTION/);assert.doesNotMatch(h,/<script|https?:\/\//i)});
test('rejects real payment',()=>assert.throws(()=>renderFictionalPreviewDocument({...input,paymentStatus:'paid'})));
