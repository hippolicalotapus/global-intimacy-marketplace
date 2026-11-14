# Fictional checkout lifecycle checkpoint

The lifecycle wrapper now rejects repeated pending, confirmation and cancellation actions. The order-domain replay behavior remains unchanged: replayed order events still return the existing immutable order.

Validation: all 90 offline commerce and checkout release-gate tests passed locally. The added replay check verifies the original journey is unchanged and real ordering/payment remain disabled. Browser checks remain blocked in this environment by Chromium socket permissions.

Development branch only. No live checkout, production deployment, supplier contact or spending. Next: verify CI for the new commit and complete browser validation in a supported environment.

The first CI run passed all 90 offline tests but exposed a browser-test navigation race: the test could see the previous document as ready, click its controls, and then lose that state when the reload finished. Browser fixture reloads now carry a unique navigation marker and wait for that exact document and its rendered cart. The browser assertions remain unchanged; the follow-up CI run is the required evidence for this test synchronization fix.
