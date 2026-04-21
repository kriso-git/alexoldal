// ==============================
// SEED DATA + STORAGE
// ==============================

const STORAGE_KEY = "f3xykee_state_v1";

export const CATEGORIES = [
  { id: "all", label: "Összes" },
  { id: "videos", label: "Videók" },
  { id: "posts", label: "Posztok" },
];

export const ADMIN_CREDENTIALS = { username: "f3xykee", password: "admin1337" };

export const BAN_EPOCH_ISO = "2016-11-29T00:00:00Z";

export const SEED_POSTS = [
  {
    id: "p-01",
    title: "CS2 — Inferno wallbang insanity",
    category: "clips",
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    author: "f3xykee",
    adminPost: true,
    mediaType: "video",
    mediaPoster: null,
    mediaSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    mediaLabel: "CS2 ▸ INFERNO",
    body: "Random pug, random wallbang. 4k through smoke on B-short — tűz van, srácok.",
    reactions: { like: 42, fire: 28, skull: 7, laugh: 3 },
    comments: [
      {
        id: "c-1", author: "zsombee_tv", authorIsAdmin: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 2,
        text: "Ez beteg volt 😭 mutasd a configot bro",
        reactions: { "🔥": 4, "💀": 2 },
        replies: [
          {
            id: "c-1-r-1", author: "f3xykee", authorIsAdmin: true,
            createdAt: Date.now() - 1000 * 60 * 90,
            text: "default config bro, csak imádkoztam a random generátorhoz",
            reactions: { "😂": 6, "❤️": 2 }
          }
        ]
      },
      {
        id: "c-2", author: "penge42", authorIsAdmin: false,
        createdAt: Date.now() - 1000 * 60 * 45,
        text: "Streamen még annál is jobb volt a chat reakciója",
        reactions: { "👀": 3 }, replies: []
      }
    ]
  },
  {
    id: "p-02",
    title: "Új setup reveal",
    category: "pics",
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    author: "f3xykee",
    adminPost: true,
    mediaType: "image",
    mediaSrc: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80&auto=format",
    body: "Végre megérkezett a monitor. 240Hz, gg.",
    reactions: { like: 96, fire: 51, skull: 2, laugh: 1 },
    comments: [
      {
        id: "c-3", author: "marcibacsi", authorIsAdmin: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 20,
        text: "Kábelek elrejtése? Vagy ennyire bátor vagy?",
        reactions: { "😂": 12, "💀": 5 }, replies: []
      }
    ]
  },
  {
    id: "p-03",
    title: "Twitch stream vlog — mit tanultam 500 óra alatt",
    category: "blog",
    createdAt: Date.now() - 1000 * 60 * 60 * 52,
    author: "f3xykee",
    adminPost: true,
    mediaType: "none",
    body: "Röviden: a chat sosem tud igazságot mondani, és az internet egy kicsit mindig szar. De jó. Hosszú post a blogon — kiderült, hogy stream közben 3x annyit beszélek, mint egyébként, és erről nem tudok semmit. Közben megszerettem a CRT szűrőt az OBS-ben, meg a billentyűzet zajt. Ez egy teszt bejegyzés a blog részhez — később jön több.",
    reactions: { like: 18, fire: 4, skull: 1, laugh: 0 },
    comments: []
  },
  {
    id: "p-04",
    title: "Short: ez most komolyan megtörtént",
    category: "shorts",
    createdAt: Date.now() - 1000 * 60 * 60 * 80,
    author: "f3xykee",
    adminPost: true,
    mediaType: "video",
    mediaSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    mediaLabel: "SHORT ▸ #1",
    body: "Egy rövid klip arról, amikor a teammate a saját smoke-jába dobta magát.",
    reactions: { like: 112, fire: 44, skull: 33, laugh: 88 },
    comments: []
  },
  {
    id: "p-05",
    title: "Hétvégi mém-dump",
    category: "memes",
    createdAt: Date.now() - 1000 * 60 * 60 * 120,
    author: "f3xykee",
    adminPost: true,
    mediaType: "image",
    mediaSrc: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&q=80&auto=format",
    body: "Átlagos magyar gamer szombat este.",
    reactions: { like: 67, fire: 12, skull: 4, laugh: 201 },
    comments: [
      {
        id: "c-4", author: "lokilovag", authorIsAdmin: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 100,
        text: "Én vagyok a bal oldali",
        reactions: { "😂": 22, "💀": 9 }, replies: []
      }
    ]
  },
  {
    id: "p-06",
    title: "Új videó fent van — Valorant rank climb",
    category: "videos",
    createdAt: Date.now() - 1000 * 60 * 60 * 200,
    author: "f3xykee",
    adminPost: true,
    mediaType: "video",
    mediaSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    mediaLabel: "VALORANT ▸ EP. 07",
    body: "Plat→Dia, 12 óra compilation. YouTube-on fent van a full verzió.",
    reactions: { like: 88, fire: 39, skull: 11, laugh: 2 },
    comments: []
  }
];

export const SEED_STATE = {
  posts: SEED_POSTS,
  postOrder: SEED_POSTS.map(p => p.id),
  users: [
    { username: "zsombee_tv", password: "zsombee", isAdmin: false },
    { username: "penge42", password: "penge", isAdmin: false }
  ],
  session: null,
  myReactions: {},
  myCommentReactions: {},
  visitCount: 13371,
};

export const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...SEED_STATE };
      const parsed = JSON.parse(raw);
      return {
        ...SEED_STATE,
        ...parsed,
        posts: parsed.posts || SEED_STATE.posts,
        postOrder: parsed.postOrder || SEED_STATE.postOrder,
      };
    } catch (e) {
      return { ...SEED_STATE };
    }
  },
  save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn("save failed", e); }
  },
  reset() { localStorage.removeItem(STORAGE_KEY); }
};

export function timeAgoHu(ts) {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (s < 10) return "most";
  if (s < 60) return `${s} mp`;
  if (m < 60) return `${m} perce`;
  if (h < 24) return `${h} órája`;
  if (d < 7) return `${d} napja`;
  const wk = Math.floor(d / 7);
  if (wk < 5) return `${wk} hete`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} hónapja`;
  return `${Math.floor(d / 365)} éve`;
}

export function formatDateHu(ts) {
  const d = new Date(ts);
  const months = ["jan", "feb", "már", "ápr", "máj", "jún", "júl", "aug", "szep", "okt", "nov", "dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = months[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

export function daysSince(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function secondsLiveComponent(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { d, h, m, s };
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function catLabel(id) {
  return (CATEGORIES.find(c => c.id === id) || { label: id }).label;
}
