// build-config.mjs
import { readFileSync, writeFileSync, existsSync } from "fs";

// 1) .env.local 읽어서 process.env에 넣기
if (existsSync("./.env.local")) {
  const envRaw = readFileSync("./.env.local", "utf8");
  envRaw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) return;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // 양끝에 큰따옴표/작은따옴표 있으면 제거
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
  console.log("[build-config] .env.local 읽기 완료");
} else {
  console.warn("[build-config] .env.local 파일이 없습니다. 환경변수를 OS에서 직접 설정해야 합니다.");
}

// 2) 템플릿 파일 읽기
const template = readFileSync("./supabaseConfig.template.js", "utf8");

// 3) 환경변수에서 값 가져오기
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[build-config] 환경변수(SUPABASE_URL, SUPABASE_ANON_KEY)가 없습니다.");
  console.error(" - .env.local 을 만들었는지, 키 이름이 정확한지 확인하세요.");
  process.exit(1);
}

// 4) 플레이스홀더 치환
const result = template
  .replace(/"__SUPABASE_URL__"/g, JSON.stringify(SUPABASE_URL))
  .replace(/"__SUPABASE_ANON_KEY__"/g, JSON.stringify(SUPABASE_ANON_KEY));

// 5) 최종 supabaseConfig.js 생성
writeFileSync("./supabaseConfig.js", result, "utf8");

console.log("[build-config] supabaseConfig.js 생성 완료");
console.log("[build-config] SUPABASE_URL =", SUPABASE_URL);
