# Ringfence

A checkpoint a reward program's payouts pass through right before PayPal sends them: it finds groups of accounts run by one operator, holds them, and pays everyone else on time.

## Programs and people

**Program**:
One company's reward program that pays people through PayPal Payouts. Nothing is shared between programs except fingerprints of confirmed fraud.
_Avoid_: company, business, tenant, client

**Account**:
A user of a program, known by the program's own account id.
_Avoid_: user, customer

**Member**:
An account Ringfence believes is a real person. Used in what people read; technical text says account.
_Avoid_: real user, genuine user

**Payee**:
The account a payout goes to.
_Avoid_: recipient, receiver

**Payout address**:
The PayPal email a payout is sent to. Two accounts can share one, which links them.
_Avoid_: receiver, PayPal account

## Runs and payouts

**Run**:
One request to pay a program's payouts, named by the program.
_Avoid_: batch, job, payout batch

**Payout**:
One line of a run: an amount for one payee, sent to one payout address.
_Avoid_: item, payment, transfer

**Batch**:
A PayPal batch. A run produces at most one run batch; each release produces a release batch of its own.
_Avoid_: run

**Decision**:
What Ringfence does with a payout: pay, hold or block. Every decision names the rules behind it.
_Avoid_: verdict, score

**Paid**:
A payout Ringfence let through and sent in its run, on time. Says nothing about whether the payee has collected it.
_Avoid_: cleared, approved, succeeded

**Outcome**:
What PayPal reports for a sent payout: succeeded (collected), unclaimed (waiting for the payee), returned (back in the program's PayPal balance) or failed.
_Avoid_: paid (for succeeded), status

## Holds and the decisions people make

**Hold**:
A payout kept out of its run until a person decides on it. A pause, never a verdict.
_Avoid_: block, freeze, flag

**Hold group**:
Held payouts a person decides on together: a ring, a pair, or the payouts one rule held.
_Avoid_: case, ring (for a group that isn't linked)

**Link**:
Something two accounts share that ties them together. A hard link is a shared payout address or device; a soft link is a similar email pattern or the same network around sign-up. One soft link alone never joins two accounts.
_Avoid_: connection, edge

**Risk flag**:
A sign on one account that it may not be real: onboarding in under two minutes, no activity since, or a disposable email. A flag alone holds no one.
_Avoid_: red flag, suspicion

**Ring**:
A hold group of three or more linked accounts, treated as one operator. A ring keeps its number for good within its program.
_Avoid_: cluster, community, scammers, fraud ring

**Pair**:
A hold group of two accounts sharing a hard link, both carrying a risk flag.
_Avoid_: duo, couple

**Release**:
A person's decision that a hold group is real: its payouts are paid in a release batch of their own.
_Avoid_: approve, unblock, unhold

**Confirm**:
A person's decision that a hold group is fraud: its payouts are never paid, and its devices and payout addresses are held, confirmed, on sight in later runs.
_Avoid_: reject, ban

**Held, confirmed**:
What people are shown for a payout in a confirmed hold group. Its technical name is block.
_Avoid_: blocked, banned (in anything people read)

**Confirmed fraud**:
The devices and payout addresses of every hold group a program has confirmed.
_Avoid_: blacklist, blocklist

## Rules

**Rule**:
A named condition that holds or blocks payouts. Rules only ever tighten: no rule can turn a hold into a payment.
_Avoid_: filter, policy

**Starter rule**:
A rule every program has from day one, such as holding a linked group with a risk flag.
_Avoid_: default rule, base rule

**Learned rule**:
A rule proposed from a confirmed ring, attacked by the red team and approved by a person. It names the ring it came from, and has its own number, never the ring's.
_Avoid_: AI rule, auto rule

**Red team**:
The attack every proposed rule faces before approval: disguised copies of the ring it came from, scored as caught N of 200.
_Avoid_: survived (ambiguous: did the rule survive, or the attack?)

**Open red-team case**:
One disguised copy a rule's red team missed, saved so the next revision of that rule has to answer for it. Stays open until a revision's actual conditions catch that exact disguise again (not just a higher score on a fresh attack); then it closes and counts toward the rule's record.
_Avoid_: miss (a miss is any failure in the moment; a case is the saved, persistent one)

## Money coming back

**Cancel**:
Asking PayPal to take back a payout nobody has claimed yet.
_Avoid_: refund, reverse, void

**Recovered**:
Money from a confirmed hold group's unclaimed payouts that Ringfence cancelled back into the program's balance.
_Avoid_: refunded, clawed back, returned (for this case)
