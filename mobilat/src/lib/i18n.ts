import type { Locale } from "./config";
import type { Mode, Room, Style } from "./prompts";

const ro = {
  meta: {
    title: "Mobilat — mobilare virtuală pentru anunțuri imobiliare",
    description:
      "Încarci poza unei camere goale și primești în câteva secunde o fotografie mobilată realist. Pentru agenți imobiliari și proprietari.",
  },
  nav: { tryFree: "Încearcă gratuit", pricing: "Prețuri", faq: "Întrebări" },
  hero: {
    kicker: "Pentru agenți imobiliari și proprietari",
    title: "Mobilează virtual orice cameră goală. În câteva secunde.",
    subtitle:
      "Încarci poza, alegi stilul și primești o fotografie mobilată realist, gata de pus în anunț. Pereții, ferestrele și podeaua rămân exact cum sunt.",
    cta: "Încearcă gratuit, fără cont",
    note: "O imagine gratuită pe zi. Fără card.",
    before: "Înainte",
    after: "După",
    illustration: "Ilustrație. Încearcă cu poza ta ca să vezi rezultatul real.",
  },
  how: {
    title: "Cum funcționează",
    steps: [
      { title: "Încarci poza", text: "O fotografie a camerei, făcută cu telefonul, e suficientă." },
      { title: "Alegi camera și stilul", text: "Living, dormitor, bucătărie… modern, scandinav, lux și altele." },
      { title: "Descarci rezultatul", text: "Imagine realistă, cu mențiunea „mobilat virtual” dacă vrei." },
    ],
  },
  uses: {
    title: "Trei lucruri pe care le poți face",
    items: [
      { title: "Mobilează", text: "Apartamente goale care arată reci în poze devin locuințe în care cumpărătorul se vede." },
      { title: "Golește", text: "Scoți mobila veche sau lucrurile proprietarului, ca să se vadă spațiul real." },
      { title: "Restilizează", text: "Înlocuiești mobila demodată cu una modernă, fără să atingi arhitectura." },
    ],
  },
  pricing: {
    title: "Prețuri simple",
    subtitle: "Plătești doar pentru imaginile generate. Dacă generarea eșuează, creditul se întoarce automat.",
    perImage: "/ imagine",
    perMonth: "/ lună",
    buy: "Cumpără",
    subscribe: "Abonează-te",
    popular: "Cel mai ales",
    plans: {
      starter: { name: "Start", desc: "10 imagini, plată unică" },
      agent: { name: "Agent", desc: "50 de imagini, plată unică" },
      pro: { name: "Pro", desc: "150 de imagini în fiecare lună" },
    },
  },
  faq: {
    title: "Întrebări frecvente",
    items: [
      {
        q: "Este în regulă să folosesc imagini mobilate virtual în anunțuri?",
        a: "Da, atâta timp cât e clar pentru cumpărător. Recomandăm să marchezi imaginea ca „mobilată virtual” și să păstrezi și poza originală în anunț. Putem adăuga mențiunea automat pe imagine.",
      },
      {
        q: "Ce poze dau cele mai bune rezultate?",
        a: "Poze luminoase, orizontale, făcute de la nivelul ochilor, din colțul camerei, în care se vede podeaua. Evită pozele foarte întunecate sau neclare.",
      },
      {
        q: "Arhitectura camerei se schimbă?",
        a: "Nu ar trebui. Instrucțiunile noastre păstrează pereții, ferestrele, ușile și podeaua. Dacă totuși un rezultat modifică ceva, generează din nou sau folosește altă poză.",
      },
      {
        q: "Cât durează?",
        a: "De obicei între 10 și 30 de secunde pe imagine.",
      },
      {
        q: "Pot anula abonamentul?",
        a: "Da, oricând. Scrie-ne și îl oprim înainte de următoarea plată.",
      },
    ],
  },
  footer: { contact: "Contact", rights: "Toate drepturile rezervate." },
  studio: {
    title: "Studio",
    upload: "Încarcă o poză a camerei",
    uploadHint: "JPG, PNG sau WEBP. Trage fișierul aici sau apasă.",
    change: "Schimbă poza",
    mode: "Ce vrei să faci",
    room: "Tipul camerei",
    style: "Stilul",
    generate: "Generează",
    generating: "Se generează… durează de obicei 10–30 de secunde",
    download: "Descarcă",
    again: "Încă o variantă",
    label: "Adaugă mențiunea „mobilat virtual” pe imagine",
    labelText: "Imagine mobilată virtual",
    credits: (n: number) => (n === 1 ? "1 credit" : `${n} credite`),
    free: (n: number) => (n === 1 ? "1 imagine gratuită azi" : `${n} imagini gratuite azi`),
    buy: "Cumpără credite",
    history: "Rezultatele tale din această sesiune",
    mockNote: "Mod demo: FAL_KEY nu e setat, așa că imaginea returnată e cea originală.",
    paid: "Plata a fost primită. Creditele apar în câteva secunde.",
    accessTitle: "Linkul tău de acces",
    accessText: "Creditele sunt legate de acest browser. Păstrează linkul ca să le folosești și pe alt dispozitiv.",
    copy: "Copiază linkul",
    copied: "Copiat",
    close: "Închide",
    errors: {
      no_credits: "Nu mai ai credite. Alege un pachet ca să continui.",
      free_used: "Ai folosit imaginea gratuită de azi. Alege un pachet ca să continui.",
      bad_type: "Formatul pozei nu e acceptat. Folosește JPG, PNG sau WEBP.",
      too_large: "Poza e prea mare.",
      generation_failed: "Generarea a eșuat. Nu ți-am luat niciun credit, încearcă din nou.",
      not_configured: "Serviciul nu e configurat încă.",
      generic: "Ceva n-a mers. Încearcă din nou.",
    },
    modes: { stage: "Mobilează camera goală", empty: "Golește camera", restyle: "Restilizează mobila" } as Record<Mode, string>,
    rooms: {
      living: "Living",
      bedroom: "Dormitor",
      kitchen: "Bucătărie",
      dining: "Sufragerie",
      office: "Birou",
      kids: "Camera copilului",
      bathroom: "Baie",
      balcony: "Balcon / terasă",
    } as Record<Room, string>,
    styles: {
      modern: "Modern",
      scandinavian: "Scandinav",
      minimalist: "Minimalist",
      industrial: "Industrial",
      luxury: "Lux",
      classic: "Clasic",
      boho: "Boho",
      japandi: "Japandi",
    } as Record<Style, string>,
  },
};

export type Dictionary = typeof ro;

const en: Dictionary = {
  meta: {
    title: "Mobilat — virtual staging for real estate listings",
    description:
      "Upload a photo of an empty room and get a realistic furnished photo in seconds. For real estate agents and owners.",
  },
  nav: { tryFree: "Try it free", pricing: "Pricing", faq: "FAQ" },
  hero: {
    kicker: "For real estate agents and owners",
    title: "Virtually furnish any empty room. In seconds.",
    subtitle:
      "Upload the photo, pick a style and get a realistic furnished photo ready for your listing. Walls, windows and floors stay exactly as they are.",
    cta: "Try it free, no account",
    note: "One free image per day. No card.",
    before: "Before",
    after: "After",
    illustration: "Illustration. Try your own photo to see a real result.",
  },
  how: {
    title: "How it works",
    steps: [
      { title: "Upload a photo", text: "A phone photo of the room is enough." },
      { title: "Pick room and style", text: "Living room, bedroom, kitchen… modern, Scandinavian, luxury and more." },
      { title: "Download", text: "A realistic image, with a “virtually staged” label if you want one." },
    ],
  },
  uses: {
    title: "Three things you can do",
    items: [
      { title: "Stage", text: "Empty flats that look cold in photos become homes buyers can picture themselves in." },
      { title: "Empty", text: "Remove old furniture or the owner's belongings so the real space shows." },
      { title: "Restyle", text: "Swap dated furniture for modern pieces without touching the architecture." },
    ],
  },
  pricing: {
    title: "Simple pricing",
    subtitle: "You only pay for generated images. If a generation fails, the credit comes back automatically.",
    perImage: "/ image",
    perMonth: "/ month",
    buy: "Buy",
    subscribe: "Subscribe",
    popular: "Most popular",
    plans: {
      starter: { name: "Starter", desc: "10 images, one-time" },
      agent: { name: "Agent", desc: "50 images, one-time" },
      pro: { name: "Pro", desc: "150 images every month" },
    },
  },
  faq: {
    title: "FAQ",
    items: [
      {
        q: "Is it OK to use virtually staged photos in listings?",
        a: "Yes, as long as buyers can tell. We recommend labelling the image as “virtually staged” and keeping the original photo in the listing too. We can add the label to the image automatically.",
      },
      {
        q: "Which photos work best?",
        a: "Bright, landscape photos taken at eye level from a corner of the room, with the floor visible. Avoid very dark or blurry photos.",
      },
      {
        q: "Does the room's architecture change?",
        a: "It shouldn't. Our instructions keep walls, windows, doors and floors in place. If a result does change something, generate again or use another photo.",
      },
      { q: "How long does it take?", a: "Usually 10 to 30 seconds per image." },
      { q: "Can I cancel the subscription?", a: "Yes, any time. Email us and we'll stop it before the next payment." },
    ],
  },
  footer: { contact: "Contact", rights: "All rights reserved." },
  studio: {
    title: "Studio",
    upload: "Upload a photo of the room",
    uploadHint: "JPG, PNG or WEBP. Drop the file here or click.",
    change: "Change photo",
    mode: "What do you want to do",
    room: "Room type",
    style: "Style",
    generate: "Generate",
    generating: "Generating… usually takes 10–30 seconds",
    download: "Download",
    again: "Another version",
    label: "Add a “virtually staged” label to the image",
    labelText: "Virtually staged",
    credits: (n: number) => (n === 1 ? "1 credit" : `${n} credits`),
    free: (n: number) => (n === 1 ? "1 free image today" : `${n} free images today`),
    buy: "Buy credits",
    history: "Your results this session",
    mockNote: "Demo mode: FAL_KEY is not set, so the original image is returned.",
    paid: "Payment received. Your credits will appear in a few seconds.",
    accessTitle: "Your access link",
    accessText: "Credits are tied to this browser. Keep this link to use them on another device.",
    copy: "Copy link",
    copied: "Copied",
    close: "Close",
    errors: {
      no_credits: "You're out of credits. Pick a pack to continue.",
      free_used: "You've used today's free image. Pick a pack to continue.",
      bad_type: "That photo format isn't supported. Use JPG, PNG or WEBP.",
      too_large: "The photo is too large.",
      generation_failed: "Generation failed. No credit was used, please try again.",
      not_configured: "The service isn't configured yet.",
      generic: "Something went wrong. Please try again.",
    },
    modes: { stage: "Stage an empty room", empty: "Empty the room", restyle: "Restyle furniture" },
    rooms: {
      living: "Living room",
      bedroom: "Bedroom",
      kitchen: "Kitchen",
      dining: "Dining room",
      office: "Office",
      kids: "Kids' room",
      bathroom: "Bathroom",
      balcony: "Balcony / terrace",
    },
    styles: {
      modern: "Modern",
      scandinavian: "Scandinavian",
      minimalist: "Minimalist",
      industrial: "Industrial",
      luxury: "Luxury",
      classic: "Classic",
      boho: "Boho",
      japandi: "Japandi",
    },
  },
};

const dictionaries: Record<Locale, Dictionary> = { ro, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
