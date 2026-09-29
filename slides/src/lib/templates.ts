// The template library. These are formats that repeatedly go viral as TikTok
// photo carousels, curated by hand: TikTok has no public "trending slideshows"
// API and scraping it breaks their terms. Keep this list fresh: study what's
// blowing up each week, add or re-rank formats, bump `updated`.

export const LIBRARY_UPDATED = "2026-09-29";

export type ThemeId = "caption" | "bold" | "notes" | "minimal";

export type Category = "Listicle" | "Story" | "Opinion" | "Ranking" | "How-to" | "Promo";

export type Template = {
  id: string;
  name: string;
  category: Category;
  theme: ThemeId;
  // Curated 1-100: how reliably this format performs right now.
  heat: number;
  slides: number;
  whyItWorks: string;
  // Instructions for the writer model: shape of the hook, body and ending.
  structure: string;
  example: { topic: string; slides: string[] };
};

export const TEMPLATES: Template[] = [
  {
    id: "wish-i-knew",
    name: "Things I wish I knew",
    category: "Listicle",
    theme: "caption",
    heat: 96,
    slides: 6,
    whyItWorks: "Regret + insider knowledge. Viewers save it so they don't make the same mistakes.",
    structure:
      "Slide 1 hook: 'N things I wish I knew before <topic>'. Then one slide per lesson: a short bold lesson plus one concrete detail. Last slide: the most surprising lesson.",
    example: {
      topic: "moving to a new city",
      slides: [
        "5 things I wish I knew before moving to a new city",
        "Your first month will feel lonely. That's normal, not a sign you failed.",
        "Join ONE weekly thing. Same place, same people. Friendships need repetition.",
        "Budget 30% more than you think for the first 3 months.",
        "Walk everywhere the first weekend. You'll find your spots faster than any app.",
        "Call home less than you want to. It makes the new place feel like home sooner.",
      ],
    },
  },
  {
    id: "apps-feel-illegal",
    name: "Apps that feel illegal to know",
    category: "Promo",
    theme: "bold",
    heat: 93,
    slides: 6,
    whyItWorks: "Curiosity + a secret. The perfect wrapper to slip your own app in as one of the picks.",
    structure:
      "Slide 1 hook: 'Apps that feel illegal to know about (<angle>)'. One app per slide: name, then what it does in one punchy line. If a product to promote is given, make it one of the middle picks, described naturally, not as an ad. Last slide: 'Which one are you downloading first?'",
    example: {
      topic: "students",
      slides: [
        "Apps that feel illegal to know about (student edition)",
        "Forest: plants a tree every time you don't touch your phone",
        "Merlin: identify any bird from a 5-second recording",
        "Libby: free audiobooks with your library card",
        "Too Good To Go: bakery leftovers for a third of the price",
        "Which one are you downloading first?",
      ],
    },
  },
  {
    id: "pov",
    name: "POV story",
    category: "Story",
    theme: "caption",
    heat: 90,
    slides: 5,
    whyItWorks: "Puts the viewer inside a moment. Relatable POVs get shared in DMs with 'this is you'.",
    structure:
      "Slide 1: 'POV: <relatable situation>'. Then short beats of the story in second person, each slide a single moment. Last slide a twist or a punchline.",
    example: {
      topic: "first gym day",
      slides: [
        "POV: it's your first day at the gym",
        "you walk in with a plan you found on TikTok",
        "every machine is taken by someone who looks like they live here",
        "you do 10 minutes on the treadmill and leave",
        "and it still counts. see you tomorrow.",
      ],
    },
  },
  {
    id: "stop-doing",
    name: "Stop doing this, do this instead",
    category: "How-to",
    theme: "bold",
    heat: 88,
    slides: 6,
    whyItWorks: "Calls out a common mistake. People comment to argue, which pushes it further.",
    structure:
      "Slide 1 hook: 'Stop <common habit> (do this instead)'. Then pairs: each slide is '❌ <mistake>' followed by '✅ <better way>'. Keep each under 15 words.",
    example: {
      topic: "studying",
      slides: [
        "Stop studying like this (do this instead)",
        "❌ Rereading your notes\n✅ Close them and write what you remember",
        "❌ 4-hour sessions\n✅ 25 minutes on, 5 off",
        "❌ Highlighting everything\n✅ Turn every heading into a question",
        "❌ Studying the night before\n✅ 20 minutes a day for a week",
        "Save this for exam season",
      ],
    },
  },
  {
    id: "notes-confession",
    name: "Notes app confession",
    category: "Story",
    theme: "notes",
    heat: 86,
    slides: 5,
    whyItWorks: "Looks like a private note, not content. Feels raw and honest, so people read to the end.",
    structure:
      "Written like a personal iPhone note, lowercase, honest. Slide 1: 'things nobody tells you about <topic>'. Following slides: short honest confessions, 2-3 lines each.",
    example: {
      topic: "starting a business at 19",
      slides: [
        "things nobody tells you about starting a business at 19",
        "you'll spend more time on stuff that isn't the product than on the product",
        "your friends won't get it and that's okay",
        "the first $100 feels better than any paycheck ever will",
        "you don't need permission. you need a deadline.",
      ],
    },
  },
  {
    id: "ranking",
    name: "Ranking from worst to best",
    category: "Ranking",
    theme: "bold",
    heat: 84,
    slides: 7,
    whyItWorks: "Everyone has an opinion on the order. Rankings farm comments like nothing else.",
    structure:
      "Slide 1 hook: 'Ranking every <topic> from worst to best'. Then one item per slide counting up from worst, each with a one-line reason. Last slide is #1 with a strong, slightly controversial reason.",
    example: {
      topic: "fast food fries",
      slides: [
        "Ranking fast food fries from worst to best",
        "#6 Burger place fries: cold by the time you sit down",
        "#5 Wedges: potatoes that forgot what they were",
        "#4 Curly fries: fun, inconsistent",
        "#3 Waffle fries: the dip-to-fry ratio is elite",
        "#2 Classic thin fries: the standard for a reason",
        "#1 Your mum's oven fries. Don't @ me.",
      ],
    },
  },
  {
    id: "just-make-sense",
    name: "Things that just make sense",
    category: "Listicle",
    theme: "caption",
    heat: 82,
    slides: 6,
    whyItWorks: "Satisfying and agreeable. Easy to nod along and share with friends.",
    structure:
      "Slide 1 hook: '<topic> things that just make sense'. Then one short satisfying observation per slide.",
    example: {
      topic: "cozy autumn",
      slides: [
        "cozy autumn things that just make sense",
        "candles on at 5pm even if it's still light out",
        "the first soup of the season",
        "rewatching the same comfort show",
        "a walk just to hear the leaves",
        "wearing socks with little pumpkins on them",
      ],
    },
  },
  {
    id: "unpopular-opinion",
    name: "Unpopular opinions",
    category: "Opinion",
    theme: "bold",
    heat: 79,
    slides: 6,
    whyItWorks: "Mild controversy starts arguments in the comments, and comments are reach.",
    structure:
      "Slide 1 hook: 'Unpopular opinions about <topic>'. One opinion per slide, confident and specific, debatable but not offensive.",
    example: {
      topic: "productivity",
      slides: [
        "Unpopular opinions about productivity",
        "Morning routines are overrated. Consistency matters, not 5am.",
        "Your to-do list is too long. Pick three.",
        "Most productivity apps are procrastination with extra steps.",
        "Rest is part of the work, not a reward for it.",
        "Which one made you angry?",
      ],
    },
  },
  {
    id: "mini-guide",
    name: "Mini guide in 5 steps",
    category: "How-to",
    theme: "minimal",
    heat: 76,
    slides: 7,
    whyItWorks: "Clean, useful, saveable. Saves tell TikTok the post is worth showing to more people.",
    structure:
      "Slide 1 hook: 'How to <outcome> (in 5 steps)'. One numbered step per slide, action first. Last slide: 'Save this for later'.",
    example: {
      topic: "fixing your sleep schedule",
      slides: [
        "How to fix your sleep schedule (in 5 steps)",
        "1. Pick a wake-up time and keep it every day, weekends too",
        "2. Get daylight within 30 minutes of waking",
        "3. No caffeine after 2pm",
        "4. Same wind-down every night: dim lights, no scrolling in bed",
        "5. Can't sleep after 20 minutes? Get up and read, then try again",
        "Save this for later",
      ],
    },
  },
  {
    id: "red-green-flags",
    name: "Red flags vs green flags",
    category: "Opinion",
    theme: "bold",
    heat: 74,
    slides: 6,
    whyItWorks: "Instant self-check. People tag friends and share to 'prove a point'.",
    structure:
      "Slide 1 hook: 'Red flags vs green flags: <topic>'. Alternate slides '🚩 <red flag>' and '💚 <green flag>'.",
    example: {
      topic: "job interviews",
      slides: [
        "Red flags vs green flags: job interviews",
        "🚩 'We're like a family here'",
        "💚 They tell you the salary before you ask",
        "🚩 Five rounds for an entry-level role",
        "💚 They ask what YOU need to do your best work",
        "Which one have you seen?",
      ],
    },
  },
];

export const CATEGORIES: Category[] = ["Listicle", "Story", "Opinion", "Ranking", "How-to", "Promo"];

export function findTemplate(id: unknown): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function byHeat(templates: Template[] = TEMPLATES): Template[] {
  return [...templates].sort((a, b) => b.heat - a.heat);
}
