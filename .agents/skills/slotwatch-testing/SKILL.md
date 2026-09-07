---
name: slotwatch-local-persistence-testing
description: Run SlotWatch browser flows against file storage or a local Upstash mock and verify persistence.
---

# Local dashboard testing

Run `npm install` in the SlotWatch repo. Start `PORT=3000 node server.js`; open http://localhost:3000. No login is needed. With no SMTP/Stripe credentials, checkout is simulated and email may use an Ethereal developer inbox.

Startup and the 3-minute interval scrape four public schengenappointments.com pages. Wait for the “Scrape complete” log before asserting nonempty dashboard data. Counts change live; compare `/api/slots` to `store.loadSlots()` rather than assuming fixed totals. `lastUpdated` is a snapshot timestamp, separate from per-row “Checked” ages.

Click “Scan live slots” in the browser twice less than 15 seconds apart. Capture the UI-triggered responses to assert fresh then `fromCache:true` and unchanged timestamp on the cached response. Client scan shows a disabled/loading button while awaiting all source pages.

“Get Alerts — Free Beta” opens signup. Use unique example.com emails and dummy phones; assert “Alerts Activated!” and an exact single saved entry. In file mode inspect `data/alerts.json`. Blank phone/email is intercepted client-side (focuses the missing input), so separately submit malformed `{}` to the unauthenticated endpoint to check HTTP 400.

If `/home/ubuntu/mock_upstash.js` is available, start it on port 7379 and run a second app on 3001 with `UPSTASH_REDIS_REST_URL=http://localhost:7379 UPSTASH_REDIS_REST_TOKEN=testtoken`. Verify mock logs contain `SET slotwatch:slots` and `SET slotwatch:alerts`; independently load them with store.js under the same environment. Check that Redis signups did not enter the file-mode alerts JSON. This exercises REST protocol/storage routing, not production Redis service behavior.

The dashboard uses separate appointment cards and a visa-type dropdown, not Tourist/Business tabs. Check centre labels after filtering, not just whether controls changed. Reload and scan may initialize listings differently; compare both against the stored snapshot.

Cron execution and real SMTP, WhatsApp, Stripe payment, and production Upstash are separate scopes and must not be claimed from this local flow.

## Devin Secrets Needed

None for file mode or the supplied local mock (`testtoken` is a test fixture). Production Redis testing requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
