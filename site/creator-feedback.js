"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const questions=[
    ["Creator format","cf-platform"],["Wishlist experience","cf-wishlist"],["Products wanted","cf-products"],
    ["Higher-value gifts","cf-gifting"],["Privacy and safety","cf-safety"],["Future opportunities","cf-perks"],
    ["One must-have feature","cf-idea"]
  ];
  const feedbackUrl=new URL("creator-feedback.html",window.location.href).href;
  const invitation="Hi models and creators (18+)! We're building Global Intimacy Marketplace and would love your ideas about products, wishlists and safer gifting. Open our short questionnaire, answer what you like and click Submit feedback — no email app or account needed. Participation is voluntary, with no purchase or promised rewards. Feel free to share it with other adult creators: "+feedbackUrl;
  $("cf-link").value=feedbackUrl;
  $("cf-message").value=invitation;
  function status(id,text){$(id).textContent=text;}
  async function copy(text,field){
    if(navigator.clipboard&&navigator.clipboard.writeText){try{await navigator.clipboard.writeText(text);return true;}catch(e){}}
    $(field).focus();$(field).select();return false;
  }
  function answerText(){
    let lines=["GIM CREATOR FEEDBACK","This message is voluntarily sent by the respondent.",""];
    const alias=$("cf-alias").value.replace(/[\r\n]/g," ").trim().slice(0,45);
    if(alias)lines.push("Public stage name: "+alias);
    for(const [label,id] of questions){
      const value=$(id).value.trim().slice(0,220);
      if(value)lines.push(label+": "+value);
    }
    lines.push("Interested in a personal follow-up: "+($("cf-followup").checked?"Yes":"No"));
    if($("cf-followup").checked&&$("cf-email").value.trim())lines.push("Requested reply email: "+$("cf-email").value.trim());
    lines.push("Please do not add me to a marketing list without asking.");
    return lines.join("\n\n");
  }
  function hasAnswer(){return questions.some(([,id])=>$(id).value.trim())}
  const readyMessage="Your answers are sent only when you click Submit feedback. You can respond without sharing contact details.";
  function contactChoice(){
    const wanted=$("cf-followup").checked;
    $("cf-contact-wrap").hidden=!wanted;
    $("cf-email").disabled=!wanted;
    $("cf-email").required=wanted;
  }
  contactChoice();
  $("cf-followup").addEventListener("change",contactChoice);
  $("cf-form").addEventListener("submit",function(e){
    if(!hasAnswer()){e.preventDefault();status("cf-answer-status","Please answer at least one question before submitting.");return;}
    if(!$("cf-consent").checked){e.preventDefault();status("cf-answer-status","Please confirm that you agree to send your answers.");return;}
    if($("cf-followup").checked&&!$("cf-email").value.trim()){e.preventDefault();status("cf-answer-status","Add an email for your requested reply, or untick the reply option.");$("cf-email").focus();return;}
    $("cf-submit").disabled=true;
    status("cf-answer-status","Submitting your feedback…");
    // Allow the browser's same-origin HTML POST to Netlify Forms.
  });
  window.addEventListener("pageshow",function(){$("cf-submit").disabled=false;status("cf-answer-status",readyMessage);});
  $("cf-copy-answers").addEventListener("click",async function(){
    if(!hasAnswer()){status("cf-answer-status","Please answer at least one question to copy.");return;}
    $("cf-answer-preview").value=answerText();
    $("cf-answer-preview-wrap").hidden=false;
    const ok=await copy(answerText(),"cf-answer-preview");
    status("cf-answer-status",ok?"Your answers are copied. Use Submit feedback when you are ready to send.":"Clipboard permission unavailable. Select and copy your answers manually, or use Submit feedback.");
  });
  $("cf-copy-link").addEventListener("click",async function(){
    const ok=await copy(feedbackUrl,"cf-link");
    status("cf-share-status",ok?"Invitation link copied. No referral credit or tracking is active.":"Select and copy the link manually. No referral credit or tracking is active.");
  });
  $("cf-copy-message").addEventListener("click",async function(){
    const ok=await copy(invitation,"cf-message");
    status("cf-share-status",ok?"Chat message copied. Paste it into your chat and post when ready.":"Select and copy the chat message manually, then paste it into your chat.");
  });
  $("cf-native-share").addEventListener("click",async function(){
    if(typeof navigator.share==="function"){
      try{await navigator.share({title:"Help shape Global Intimacy Marketplace",text:"Creators: share your ideas about better wishlists and gifting. Pre-launch research only; no referral rewards are active.",url:feedbackUrl});status("cf-share-status","Share sheet closed. No referrals are tracked.");return;}catch(e){}
    }
    $("cf-link").focus();$("cf-link").select();
    status("cf-share-status","Use Copy link to share manually. No referral program is active.");
  });
  if(sessionStorage.getItem("gim:adult")==="yes")$("ageGate").hidden=true;
  $("ageYes").addEventListener("click",function(){sessionStorage.setItem("gim:adult","yes");$("ageGate").hidden=true;});
  $("ageNo").addEventListener("click",function(){window.location.replace("https://www.google.com/");});
}());

