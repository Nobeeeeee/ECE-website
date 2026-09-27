/**
 * Utility for automatic English to Tamil translation & transliteration of engineering subject names.
 */

const PHRASE_MAP = {
  "engineering physics": "பொறியியல் இயற்பியல்",
  "engineering chemistry": "பொறியியல் வேதியியல்",
  "engineering mathematics": "பொறியியல் கணிதம்",
  "english": "ஆங்கிலம்",
  "python": "பைத்தான்",
  "wireless communication": "வயர்லெஸ் தொடர்பு",
  "analog ic design": "அனலாக் IC டிசைன்",
  "4g & 5g cellular tech": "4G & 5G செல்போன் தொழில்நுட்பம்",
  "environmental science": "சுற்றுச்சூழல் அறிவியல்",
  "computer networks": "கணினி வலைப்பின்னல்கள்",
  "digital signal processing": "டிஜிட்டல் சிக்னல் பிராசஸிங்",
  "microprocessors": "மைக்ரோபிராசஸர்கள்",
  "microcontrollers": "மைக்ரோகண்ட்ரோலர்கள்",
  "data structures": "தரவு அமைப்புகள்",
  "circuit theory": "மின்சுற்று தியரி",
  "electric circuits": "மின்சுற்றுகள்",
  "control systems": "கட்டுப்பாட்டு அமைப்புகள்",
  "vlsi design": "VLSI வடிவமைப்பு",
  "embedded systems": "எம்படெட் சிஸ்டம்ஸ்",
  "signals and systems": "சிக்னல்கள் மற்றும் அமைப்புகள்",
  "electromagnetic fields": "மின்காந்த புலங்கள்",
  "optical communication": "ஆப்டிகல் தொடர்பு",
  "transmission lines": "டிரான்ஸ்மிஷன் லைன்கள்",
  "antenna and wave propagation": "ஆண்டெனா மற்றும் அலை பரவல்",
};

const WORD_MAP = {
  engineering: "பொறியியல்",
  physics: "இயற்பியல்",
  chemistry: "வேதியியல்",
  mathematics: "கணிதம்",
  maths: "கணிதம்",
  english: "ஆங்கிலம்",
  python: "பைத்தான்",
  wireless: "வயர்லெஸ்",
  communication: "தொடர்பு",
  analog: "அனலாக்",
  digital: "டிஜிட்டல்",
  design: "வடிவமைப்பு",
  environmental: "சுற்றுச்சூழல்",
  science: "அறிவியல்",
  computer: "கணினி",
  networks: "வலைப்பின்னல்கள்",
  network: "வலைப்பின்னல்",
  signal: "சிக்னல்",
  signals: "சிக்னல்கள்",
  processing: "பிராசஸிங்",
  system: "அமைப்பு",
  systems: "அமைப்புகள்",
  control: "கட்டுப்பாடு",
  data: "தரவு",
  structures: "அமைப்புகள்",
  microprocessors: "மைக்ரோபிராசஸர்கள்",
  microcontrollers: "மைக்ரோகண்ட்ரோலர்கள்",
  circuits: "மின்சுற்றுகள்",
  circuit: "மின்சுற்று",
  embedded: "எம்படெட்",
  theory: "தியரி",
  lab: "லேப்",
  manual: "மேனுவல்",
  introduction: "அறிமுகம்",
  advanced: "மேம்பட்ட",
  applied: "பயன்பாட்டு",
  basic: "அடிப்படை",
  fundamentals: "அடிப்படைத் தத்துவங்கள்",
};

function phoneticTransliterate(word) {
  let w = word.toLowerCase();
  let result = "";
  let i = 0;

  const charMap = {
    ka: "க", kha: "க", ga: "க", gha: "க",
    cha: "ச", ch: "ச", sa: "ச", sha: "ஷ",
    ta: "ட", tha: "த", da: "ட", dha: "த",
    pa: "ப", pha: "ப", ba: "ப", bha: "ப",
    ma: "ம", ya: "ய", ra: "ர", la: "ல", va: "வ",
    na: "ன", nga: "ங", nya: "ஞ",
    a: "அ", aa: "ஆ", i: "இ", ee: "ஈ", u: "உ", oo: "ஊ", e: "எ", ae: "ஏ", ai: "ஐ", o: "ஒ", oa: "ஓ", au: "ஔ",
    k: "க்", s: "ஸ்", t: "ட்", th: "த்", p: "ப்", m: "ம்", n: "ன்", r: "ர்", l: "ல்", v: "வ்", y: "ய்",
  };

  while (i < w.length) {
    if (i + 2 < w.length && charMap[w.slice(i, i + 3)]) {
      result += charMap[w.slice(i, i + 3)];
      i += 3;
    } else if (i + 1 < w.length && charMap[w.slice(i, i + 2)]) {
      result += charMap[w.slice(i, i + 2)];
      i += 2;
    } else if (charMap[w[i]]) {
      result += charMap[w[i]];
      i += 1;
    } else {
      result += w[i];
      i += 1;
    }
  }

  return result;
}

export function autoTranslateToTamil(englishText) {
  if (!englishText || !englishText.trim()) return "";

  const trimmed = englishText.trim().toLowerCase();

  // 1. Check exact phrase match
  if (PHRASE_MAP[trimmed]) {
    return PHRASE_MAP[trimmed];
  }

  // 2. Check word-by-word substitution
  const words = englishText.split(/(\s+)/);
  const translatedParts = words.map((w) => {
    if (/^\s+$/.test(w)) return w;
    const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!cleanWord) return w;
    if (WORD_MAP[cleanWord]) {
      return WORD_MAP[cleanWord];
    }
    return phoneticTransliterate(cleanWord);
  });

  return translatedParts.join("");
}
