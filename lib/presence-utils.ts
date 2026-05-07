const WORDS_A = [
  "Agile",
  "Bold",
  "Calm",
  "Deft",
  "Epic",
  "Fast",
  "Glad",
  "Hale",
  "Iron",
  "Just",
  "Keen",
  "Lush",
  "Mild",
  "Neat",
  "Opal",
  "Pure",
  "Rare",
  "Sage",
  "True",
  "Wry",
];
const WORDS_B = [
  "Ant",
  "Bat",
  "Cat",
  "Elk",
  "Fox",
  "Gnu",
  "Hog",
  "Jay",
  "Koi",
  "Lynx",
  "Moth",
  "Newt",
  "Oryx",
  "Pika",
  "Rook",
  "Swan",
  "Toad",
  "Vole",
  "Wren",
  "Yak",
];

const AVATAR_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#4ade80",
  "#2dd4bf",
  "#22d3ee",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#c084fc",
  "#f472b6",
];

export function generateGuestName(key: string): string {
  const hex = key.replace(/-/g, "");
  const n = parseInt(hex.slice(0, 8), 16);
  return `${WORDS_A[n % WORDS_A.length]} ${WORDS_B[Math.floor(n / WORDS_A.length) % WORDS_B.length]}`;
}

export function nameToColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function nameToInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
