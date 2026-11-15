# Supplier catalogue and media permission policy
Approved by owner: 2026-11-12.

## Decision
- Receipt of a catalogue or product photos allows **internal evaluation and draft-only catalogue preparation**, not automatic publication on Global Intimacy Marketplace.
- Before publicly displaying supplier photos or other protected media, verify permission for independent retailer **website and product-page use**. Existing written supplier terms may establish this without another email.
- Ask the supplier **once** if the scope is unclear. Record the response, permitted media, restrictions, date, and source. Do not re-ask unless terms change or the proposed use exceeds the granted scope.
- Preserve supplier logos and attribution when required. Do not infer permission for video editing, paid ads, redistribution, or sublicensing.
- A model also needs confirmed price/currency, stock or availability, fulfillment and shipping territory before sale. Permission alone never makes a product sellable.

## Standard question for a relevant existing supplier thread
"To avoid repeated permission requests, could you confirm whether the product catalogue, descriptions, photographs, and videos you supply for retailer use may be displayed on Global Intimacy Marketplace's independent public website and product pages, with your branding and any required attribution preserved? Please note any restrictions."

## Current supplier notes
- Concorde Pro: owner reports approved retailer photo use; preserve source evidence and any supplier limitations.
- YXROBOT: confirmed promotional use for banners and brochures with branding intact. Independent website/product-page permission **still pending**; a catalogue link and offer of selected model media do not resolve this.
- Do not send duplicate messages merely because this policy was recorded.

## Implementation requirements
- Keep supplier-specific media permission metadata separate from general catalogue access.
- Default `mediaRightsVerified` to false and `published` to false on every new YXROBOT import.
- Record evidence for each permission grant before enabling publication. Never put credentials or wholesale-only prices in public assets.
