import {renderFictionalGarmentPreview} from './garment-preview.mjs';
const css = `<style>body{font-family:system-ui,sans-serif;margin:0;background:#f5f3f1;color:#222}.wrap{max-width:640px;margin:auto;padding:24px}.garment{width:min(220px,100%);min-height:270px;margin:24px auto;border-radius:35px 35px 20px 20px;display:grid;place-items:center;box-shadow:0 10px 30px #0002;overflow-wrap:anywhere;text-align:center;padding:12px;box-sizing:border-box}.garment[data-color="ruby"]{background:#982d46;color:white}.garment[data-color="ivory"]{background:#fff9eb;color:#252525}.garment[data-color="charcoal"]{background:#343434;color:white}section{text-align:center}section p{font-size:14px}.note{font-weight:700;color:#8b263b}</style>`;
export function renderFictionalPreviewDocument(input){
 const section=renderFictionalGarmentPreview(input);
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline garment proof</title>'+css+'</head><body><main class="wrap">'+section+'<p class="note">Demo only. No checkout, upload, or supplier submission.</p></main></body></html>';
}
