"use strict";
/* No network requests or persistence. Private mock preview only. */
(function () {
  const session = window.GIMMockApparel.createMockSession();
  const form = document.getElementById("customForm");
  const status = document.getElementById("status");
  const receipt = document.getElementById("receipt");
  const confirm = document.getElementById("mockConfirm");
  const front = document.getElementById("frontMock");
  const back = document.getElementById("backMock");
  const garment = document.getElementById("garment");
  const color = document.getElementById("color");
  const size = document.getElementById("size");
  const message = (text) => {status.textContent = text;};
  function updateChoices() {
    const choices = window.GIMMockApparel.GARMENTS[garment.value];
    function fill(node, values) {
      const previous = node.value;
      node.replaceChildren(...values.map(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        return option;
      }));
      if (values.includes(previous)) node.value = previous;
    }
    fill(color, choices.colors);
    fill(size, choices.sizes);
  }
  function data() {
    return {garment:garment.value, color:color.value, size:size.value,
      quantity:Number(document.getElementById("quantity").value),
      frontText:document.getElementById("frontText").value,
      backText:document.getElementById("backText").value,
      frontPlacement:document.getElementById("frontPlacement").value,
      backPlacement:"center"};
  }
  form.addEventListener("input", () => {
    session.invalidate();
    confirm.disabled = true;
    receipt.textContent = "";
    message("Changes detected. Review another mock preview before confirming.");
  });
  garment.addEventListener("change", () => {updateChoices(); session.invalidate(); confirm.disabled = true;});
  form.addEventListener("submit", event => {
    event.preventDefault();
    const result = session.preview(data());
    if (result.status !== "preview_only") {
      front.textContent = "";
      back.textContent = "";
      confirm.disabled = true;
      message("Preview rejected: " + result.reason + ". Check garment, size, text, placement and quantity.");
      return;
    }
    front.textContent = result.design.frontText || "(no front text)";
    back.textContent = result.design.backText || "(no back text)";
    confirm.disabled = false;
    message("Mock preview ready. Pricing and delivery are unverified; no real order can be placed.");
  });
  confirm.addEventListener("click", () => {
    const result = session.confirmMock();
    if (result.status !== "mock_only") return;
    confirm.disabled = true;
    receipt.textContent = "Fictional receipt " + result.mockId + " | " + result.design.quantity +
      " " + result.design.color + " " + result.design.garment + " / " + result.design.size +
      " | Quote required | Payment disabled | Not submitted to supplier";
    message("Mock order created in this browser session only. Nothing was saved or submitted.");
  });
  updateChoices();
}());
