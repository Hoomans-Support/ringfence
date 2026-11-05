import { writeFileSync } from "node:fs";

const items = [];
const truth = [];
for (let i = 1; i <= 120; i += 1) {
  const match = i > 114;
  const id = String(i).padStart(3, "0");
  const sender_item_id = `survey_${id}`;
  const account_id = `survey_u_${id}`;
  items.push({
    recipient_type: "EMAIL",
    receiver: `survey.payee${id}@example.test`,
    amount: { value: "10.00", currency: "USD" },
    sender_item_id,
    context: {
      account_id,
      signup_at: `2026-11-${String(1 + ((i - 1) % 5)).padStart(2, "0")}T0${(i - 1) % 9}:00:00.000Z`,
      device_hash: match ? "d_ring_falcon" : `survey_device_${id}`,
      referrer_id: `survey_ref_${id}`,
      onboarding_seconds: 360,
      activity_after_onboarding: 5,
    },
  });
  truth.push({ sender_item_id, account_id, group: match ? "ring_match" : "honest", ...(match ? { ring_label: "R-12" } : {}) });
}

writeFileSync("fixtures/surveyapp.json", `${JSON.stringify({ sender_batch_header: { sender_batch_id: "surveyapp_first_sight", email_subject: "Survey app rewards" }, items }, null, 2)}\n`);
writeFileSync("fixtures/surveyapp.truth.json", `${JSON.stringify(truth, null, 2)}\n`);
