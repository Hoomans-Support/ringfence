// Word pools for the demo generator. Plain data, kept separate from the
// generation logic so the week files stay readable.

export const FIRST_NAMES = [
  "Maya", "Liam", "Sofia", "Noah", "Zara", "Ethan", "Priya", "Lucas", "Amara", "Mateo",
  "Chloe", "Omar", "Ines", "Felix", "Nadia", "Theo", "Yuki", "Diego", "Freya", "Kian",
  "Alina", "Jonas", "Rosa", "Milo", "Tamsin", "Arjun", "Elena", "Gabriel", "Nina", "Rafael",
  "Lara", "Hassan", "Clara", "Dmitri", "Aiko", "Owen", "Pia", "Sami", "Vera", "Caleb",
] as const;

export const LAST_NAMES = [
  "Okafor", "Nguyen", "Petrov", "Alvarez", "Khan", "Dubois", "Rossi", "Schmidt", "Tanaka", "Silva",
  "Haddad", "Larsen", "Kowalski", "Reyes", "Patel", "Costa", "Novak", "Fischer", "Mbeki", "Suzuki",
  "Hernandez", "Ivanov", "Moreau", "Yamada", "Abara", "Lindqvist", "Santos", "Garcia", "Weber", "Kim",
  "Osei", "Popescu", "Marin", "Sato", "Correia", "Baptiste", "Gupta", "Keller", "Diallo", "Hoffmann",
] as const;

export const HONEST_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com"] as const;

export const HONEST_ANSWERS = [
  "A friend sent me the link after their reward hit",
  "Saw it on a budgeting subreddit and gave it a try",
  "My sister has been using it for months",
  "Found it while comparing budgeting apps",
  "A coworker mentioned it at lunch, unrelated to this week's group",
  "Googled 'budget app referral bonus' and this came up",
  "My partner signed up first and then referred me",
  "Heard about it on a personal-finance podcast",
] as const;

// Near-identical phrasings for the ring: same substance, reworded, standing
// in for one operator scripting slightly different answers per account.
export const RING_ANSWER_VARIANTS = [
  "Saw my friend use it to split rent with roommates",
  "A friend showed me how it splits rent with roommates",
  "My friend uses it to split rent between roommates",
  "Saw a friend split roommate rent with it",
  "A friend of mine splits rent with roommates using it",
  "Watched my friend split the rent with roommates on this",
  "My friend recommended it for splitting roommate rent",
  "Saw it used to split rent among roommates by a friend",
  "A friend showed me this for splitting rent with roommates",
  "Learned about it from a friend splitting roommate rent",
  "Friend uses it to split roommate rent, showed me too",
  "Saw my friend split rent with their roommates on it",
  "A friend of mine uses this to split roommate rent",
  "My friend split rent with roommates using this app",
  "Found out from a friend who splits roommate rent with it",
  "Friend showed me how they split roommate rent here",
  "Saw it split rent between my friend's roommates",
  "My friend's roommates split rent with this, showed me",
  "A friend demoed splitting roommate rent with it",
] as const;

// The 4 ring members who don't bother matching the script.
export const RING_ANSWER_OUTLIERS = [
  "A banner ad caught my eye",
  "Not sure, just signed up",
  "A group chat link",
  "Random app store search",
] as const;

export const COWORKER_ANSWERS = [
  "A coworker showed us this during lunch and we all signed up",
  "We all signed up after a coworker showed it at lunch",
  "Saw it at lunch when a coworker pulled it up, so did we",
  "A coworker demoed it over lunch and the team joined in",
  "Lunch group chat: a coworker shared it and we all joined",
] as const;
