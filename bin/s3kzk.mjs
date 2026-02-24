#!/usr/bin/env node

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 文字の表示幅を返す (全角=2, 半角=1)
function charWidth(cp) {
  // CJK, 全角記号, カタカナ, ひらがな等
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3040 && cp <= 0x33bf) ||  // ひらがな・カタカナ
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||  // 全角英数・記号
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x2fffd) ||
    (cp >= 0x30000 && cp <= 0x3fffd)
  ) return 2;
  // 半角カタカナ
  if (cp >= 0xff61 && cp <= 0xff9f) return 1;
  return 1;
}

function strWidth(s) {
  let w = 0;
  for (const ch of s) {
    w += charWidth(ch.codePointAt(0));
  }
  return w;
}

const aa = [
  "  \\                            |                    /",
  "        \\                      |               /",
  "  -, satsubatsu to shita stdout ni TOTTORI-KEN ga!!,-''",
  "    `-,                  __/\\                ,-''",
  "       `-,              _|   `~|          ,-''",
  "                       _/       |",
  "                    _,~'        /",
  "  ----------   ,\"~            /   ----------",
  "                 /              `~7",
  "                |   SHIMANE-KEN   /",
  "     -,   ,-' ~`^7                /     ,-",
  "  ,-''          /                 \\,     `-,",
  "              / _7       /`--,._|",
  "        _,,-|   \\   _,.,/",
  "       /     L ,~'                >--'",
  "  y' U    `/  /            \\ '      U  |",
  "",
  "               TOCHIGI-KEN",
  "",
  "  +-----------------------------+",
  "  |  @s3kzk  (X, GitHub)       |",
  "  +-----------------------------+",
];

// 最大表示幅を求めて各行を右パディング
const maxW = Math.max(...aa.map(strWidth));
const paddedAa = aa.map((line) => {
  const pad = maxW - strWidth(line);
  return line + " ".repeat(Math.max(0, pad));
});

// ダークモード: シアン→ピンク→白 (明るめ)
const darkColors = [51, 87, 123, 159, 183, 207, 213, 219, 225, 231, 195, 159];
// ライトモード: 紫→マゼンタ→赤 (暗め)
const lightColors = [53, 54, 90, 91, 127, 128, 164, 165, 201, 200, 199, 163];

let colors = darkColors; // デフォルトはダーク前提

// ターミナルの背景色を検出してダーク/ライト判定
function detectTheme() {
  return new Promise((resolve) => {
    // COLORFGBG 環境変数 (例: "15;0" → fg;bg)
    const colorfgbg = process.env.COLORFGBG;
    if (colorfgbg) {
      const bg = parseInt(colorfgbg.split(";").pop(), 10);
      // bg が 8 以上なら明るい背景 = ライトモード
      resolve(bg >= 8 ? "light" : "dark");
      return;
    }

    // OSC 11 で背景色を問い合わせ
    if (!process.stdin.isTTY) { resolve("dark"); return; }

    const timeout = setTimeout(() => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener("data", onData);
      resolve("dark");
    }, 200);

    const onData = (data) => {
      clearTimeout(timeout);
      process.stdin.setRawMode(false);
      process.stdin.removeListener("data", onData);
      const s = data.toString();
      // レスポンス: \x1b]11;rgb:RRRR/GGGG/BBBB\x1b\\
      const m = s.match(/rgb:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
      if (m) {
        const r = parseInt(m[1].substring(0, 2), 16);
        const g = parseInt(m[2].substring(0, 2), 16);
        const b = parseInt(m[3].substring(0, 2), 16);
        // 輝度で判定
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        resolve(luminance > 128 ? "light" : "dark");
      } else {
        resolve("dark");
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.once("data", onData);
    process.stdout.write("\x1b]11;?\x07");
  });
}

function colorize(text, ci) {
  const c = colors[ci % colors.length];
  return `\x1b[38;5;${c}m${text}\x1b[0m`;
}

// ランダム要素1: グリッチ文字列
const glitchChars = "░▒▓█▀▄▌▐╡╢╖╕╣║╗╝╜╛";
function glitchLine(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += glitchChars[Math.floor(Math.random() * glitchChars.length)];
  return s;
}

// ランダム要素2: つぶやき
const murmurs = [
  "...it's not Tottori",
  "this is clearly Shimane",
  "wait, Tochigi?",
  "s3kzk was here",
  "geography is hard",
  "none of this is correct",
  "the map is a lie",
  "trust the stdout",
  "404: prefecture not found",
  "segfault in geography.so",
];

const hide = () => process.stdout.write("\x1b[?25l");
const show = () => process.stdout.write("\x1b[?25h");
const clear = () => process.stdout.write("\x1b[2J\x1b[1;1H");

async function main() {
  const theme = await detectTheme();
  colors = theme === "light" ? lightColors : darkColors;

  hide();
  process.on("SIGINT", () => { show(); clear(); process.exit(0); });

  try {
    // AA を1行ずつグラデーション付きで表示
    clear();
    process.stdout.write("\n");
    for (let i = 0; i < paddedAa.length; i++) {
      process.stdout.write("  " + colorize(paddedAa[i], i) + "\n");
      await sleep(150);
    }

    // 色が変わるループ + ランダムグリッチ + つぶやき
    const murmurRow = paddedAa.length + 3; // AA の下につぶやき表示
    let lastMurmur = "";
    for (let frame = 0; frame < 30; frame++) {
      process.stdout.write("\x1b[2;1H"); // AA先頭に戻る
      const glitchIdx = Math.random() < 0.2
        ? Math.floor(Math.random() * paddedAa.length)
        : -1;
      for (let i = 0; i < paddedAa.length; i++) {
        if (i === glitchIdx) {
          // ランダム要素1: 一瞬グリッチに置き換わる
          process.stdout.write("  " + colorize(glitchLine(strWidth(paddedAa[i])), frame + i) + "\n");
        } else {
          process.stdout.write("  " + colorize(paddedAa[i], i + frame) + "\n");
        }
      }
      // ランダム要素2: たまにつぶやきを表示
      if (frame % 5 === 3) {
        const m = murmurs[Math.floor(Math.random() * murmurs.length)];
        const pad = " ".repeat(Math.max(0, lastMurmur.length - m.length));
        lastMurmur = m;
        process.stdout.write(`\x1b[${murmurRow};1H`);
        process.stdout.write("  " + colorize("  > " + m + pad, frame * 2) + "\n");
      }
      await sleep(150);
    }
  } finally {
    show();
  }
}

main();
