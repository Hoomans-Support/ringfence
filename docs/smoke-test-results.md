# Day-one smoke tests

Run 2026-11-04T14:06:15.282Z against https://api-m.sandbox.paypal.com by `npm run smoke`.

| # | Test | Result | What happened |
| --- | --- | --- | --- |
| 1 | Token issued, Payouts reachable | PASS | unknown batch -> 404 INVALID_RESOURCE_ID; sandbox test IDs: ERRPYOB001=404 INVALID_RESOURCE_ID, ERRPYOB002=404 INVALID_RESOURCE_ID, ERRPYOB003=404 INVALID_RESOURCE_ID, ERRPYOB004=404 INVALID_RESOURCE_ID |
| 2 | One-item payout reaches SUCCESS | PASS | batch QJ67ZYNZ977KY, item SUCCESS after 33s |
| 3 | Reused sender_batch_id rejected | PASS | same request id: refused (User business error. (Batch with given sender_batch_id already exists SENDER_BATCH_ID) debug_id ca5542c8e6ca4), original not named; new request id: refused (User business error. (Batch with given sender_batch_id already exists SENDER_BATCH_ID) debug_id ca5542c97cbb4), original not named |
| 4 | Unregistered email goes UNCLAIMED | PASS | batch AM5QZ64UPBEDA, item UNCLAIMED |
| 5 | Cancel, then cancel again | FALLBACK | real cancel failed: PayPalError: 500 INTERNAL_SERVICE_ERROR: An internal service error has occurred debug_id ca5542d77895b; POSPOI002 -> RETURNED; ERRPYO007 -> ITEM_ALREADY_CANCELLED; ERRPYO008 -> ITEM_CANCELLATION_FAILED; ERRPYO009 -> ITEM_INCORRECT_STATUS |
| 6 | PAYOUTS-ITEM webhooks arrive and verify | PASS | verified: PAYMENT.PAYOUTS-ITEM.UNCLAIMED, PAYMENT.PAYOUTS-ITEM.SUCCEEDED |
| 7 | Under 50 requests a minute | PASS | 21 requests, busiest minute 21 |
