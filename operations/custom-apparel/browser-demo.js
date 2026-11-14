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
  const frontStage = document.getElementById("frontStage");
  const backStage = document.getElementById("backStage");
  const garment = document.getElementById("garment");
  const color = document.getElementById("color");
  const size = document.getElementById("size");
  const textStyle = document.getElementById("textStyle");
  const frontPlacement = document.getElementById("frontPlacement");
  const backPlacement = document.getElementById("backPlacement");
  const placementHint = document.getElementById("placementHint");
  const backPlacementHint = document.getElementById("backPlacementHint");
  function updatePlacementHint() {
    const chest = frontPlacement.value === "left-chest";
    frontStage.dataset.placement = chest ? "left-chest" : "center";
    placementHint.textContent = chest
      ? "Front: compact left-chest print zone, suitable for short lettering. Dashed outlines are illustrative."
      : "Front: centre print zone for larger lettering. Dashed outlines are illustrative.";
  }
  function updateBackHint() {
    const upper = backPlacement.value === "upper-back";
    backStage.dataset.placement = upper ? "upper-back" : "center";
    backPlacementHint.textContent = upper
      ? "Back: compact upper-back position for short lettering. Print dimensions are not supplier-verified."
      : "Back: centred print area for larger lettering. Print dimensions are not supplier-verified.";
  }
  const message = (text) => {status.textContent = text;};
  function clearPreview() {
    front.textContent = "";
    back.textContent = "";
    front.style.fontSize = "";
    back.style.fontSize = "";
    frontStage.dataset.ready = "false";
    backStage.dataset.ready = "false";
    confirm.disabled = true;
  }
  // Reject lettering that would be silently cropped on the selected garment.
  function fitPrintableText(node) {
    node.style.fontSize = "";
    if (!node.textContent) return true;
    if (!Number.isFinite(node.clientHeight) || !Number.isFinite(node.scrollHeight)) return false;
    for (let size = 16; size >= 9; size -= 1) {
      node.style.fontSize = size + "px";
      if (node.scrollHeight <= node.clientHeight + 1 &&
          node.scrollWidth <= node.clientWidth + 1) return true;
    }
    return false;
  }
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
      textStyle:textStyle.value,
      frontPlacement:frontPlacement.value,
      backPlacement:backPlacement.value};
  }
  form.addEventListener("input", () => {
    session.invalidate();
    clearPreview();
    receipt.textContent = "";
    message("Changes detected. Review another mock preview before confirming.");
  });
  garment.addEventListener("change", () => {updateChoices(); session.invalidate(); clearPreview(); receipt.textContent = "";});
  frontPlacement.addEventListener("change", updatePlacementHint);
  backPlacement.addEventListener("change", updateBackHint);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const result = session.preview(data());
    if (result.status !== "preview_only") {
      clearPreview();
      message("Preview rejected: " + result.reason + ". Check garment, size, text, placement and quantity.");
      return;
    }
    front.textContent = result.design.frontText;
    back.textContent = result.design.backText;
    front.dataset.placement = result.design.frontPlacement;
    back.dataset.placement = result.design.backPlacement;
    backStage.dataset.placement = result.design.backPlacement;
    for (const stage of [frontStage,backStage]) {
      stage.dataset.garment = result.design.garment;
      stage.dataset.color = result.design.color;
      stage.dataset.textStyle = result.design.textStyle;
      stage.dataset.ready = "true";
    }
    if (!fitPrintableText(front) || !fitPrintableText(back)) {
      session.invalidate();
      clearPreview();
      message("The selected print area cannot display all lettering. Shorten your text or choose centre placement before reviewing again.");
      return;
    }
    confirm.disabled = false;
    message("Mock preview ready: " + result.design.color + " " + result.design.garment + ", " + result.design.size + ", " + result.design.textStyle + " lettering. Pricing and delivery remain unverified; no real order can be placed.");
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
  updatePlacementHint();
  updateBackHint();
}());
