"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const questions=[
    ["Creator format","cf-platform"],["Wishlist experience","cf-wishlist"],["Products wanted","cf-products"],
    ["Higher-value gifts","cf-gifting"],["Privacy and safety","cf-safety"],["Future opportunities","cf-perks"],
    ["One must-have feature","cf-idea"]
  ];
  const feedbackUrl=new URL("creator-feedback.html",window.location.href).href;
  const invitation="I'm helping shape Global Intimacy Marketplace, a new adults-only shopping and creator-gifting platform. They're inviting creators to share ideas about products, privacy and better wishlists. It's a pre-launch preview, not a paid referral program. If you'd like to help, here's the questionnaire: "+feedbackUrl;
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
    lines.push("Please do not add me to a marketing list without asking.");
    return lines.join("\n\n");
  }
  function hasAnswer(){return questions.some(([,id])=>$(id).value.trim())}
  $("cf-form").addEventListener("submit",function(e){
    e.preventDefault();
    if(!hasAnswer()){status("cf-answer-status","Please answer at least one question before preparing an email.");return;}
    let link="mailto:globalintimacypartner@gmail.com?subject="+encodeURIComponent("Creator feedback — GIM development preview")+"&body="+encodeURIComponent(answerText());
    if(link.length>5500){status("cf-answer-status","Your answers are too long for an email link. Use Copy responses instead.");return;}
    $("cf-send-email").href=link;
    $("cf-send-wrap").hidden=false;
    status("cf-answer-status","Email prepared, not sent. Use the button below to open your email app and review before sending.");
  });
  $("cf-copy-answers").addEventListener("click",async function(){
    if(!hasAnswer()){status("cf-answer-status","Please answer at least one question to copy.");return;}
    const ok=await copy(answerText(),"cf-wishlist");
    status("cf-answer-status",ok?"Responses copied. Paste into your email app to send.":"Clipboard permission unavailable. Please select and copy your answers manually.");
  });
  $("cf-copy-link").addEventListener("click",async function(){
    const ok=await copy(feedbackUrl,"cf-link");
    status("cf-share-status",ok?"Invitation link copied. No referral credit or tracking is active.":"Select and copy the link manually. No referral credit or tracking is active.");
  });
  $("cf-copy-message").addEventListener("click",async function(){
    const ok=await copy(invitation,"cf-message");
    status("cf-share-status",ok?"Invitation message copied. Review before posting.":"Select and copy the invitation manually, then review before posting.");
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
