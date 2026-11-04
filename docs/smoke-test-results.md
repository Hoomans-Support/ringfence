# Day-one smoke tests

Run 2026-11-04T13:07:10.146Z against https://api-m.sandbox.paypal.com by `npm run smoke`.

| # | Test | Result | What happened |
| --- | --- | --- | --- |
| 1 | Token issued, Payouts reachable | PASS | unknown batch -> 503 HTTP_ERROR; sandbox test IDs: ERRPYOB001=404 INVALID_RESOURCE_ID, ERRPYOB002=404 INVALID_RESOURCE_ID, ERRPYOB003=404 INVALID_RESOURCE_ID, ERRPYOB004=404 INVALID_RESOURCE_ID |
| 2 | One-item payout reaches SUCCESS | PASS | batch R77XALWMLMUJA, item SUCCESS after 34s |
| 3 | Reused sender_batch_id rejected | PASS | same request id: refused (User business error. (Batch with given sender_batch_id already exists SENDER_BATCH_ID) debug_id f3068522002c5), original not named; new request id: refused (User business error. (Batch with given sender_batch_id already exists SENDER_BATCH_ID) debug_id f819756a5f303), original not named |
| 4 | Unregistered email goes UNCLAIMED | PASS | batch WXDBK2DACXBPS, item UNCLAIMED |
| 5 | Cancel, then cancel again | FALLBACK | real cancel failed: PayPalError: 500 INTERNAL_SERVICE_ERROR: An internal service error has occurred debug_id f995496a3c9cd; POSPOI002 -> RETURNED; ERRPYO007 -> ITEM_ALREADY_CANCELLED; ERRPYO008 -> ITEM_CANCELLATION_FAILED; ERRPYO009 -> ITEM_INCORRECT_STATUS |
| 6 | PAYOUTS-ITEM webhooks arrive and verify | SKIP | set RINGFENCE_API_URL and ADMIN_TOKEN to check a deployed webhook receiver |
| 7 | Under 50 requests a minute | PASS | 20 requests, busiest minute 20 |
