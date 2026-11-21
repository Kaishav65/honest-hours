// Checks the database rules from PLAN.md §10 against the live Supabase project.
//   node scripts/db-test.mjs <INVITE_CODE>
// Creates 2 test users (test-a-*/test-b-*@example.com). Delete them afterwards in
// Supabase → Authentication → Users; their data is removed with them.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const CODE = process.argv[2];
if (!CODE) throw new Error("Usage: node scripts/db-test.mjs <INVITE_CODE>");

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
}

async function call(path, { token, method = "GET", body, prefer } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

const signUp = (email, data) =>
  call("/auth/v1/signup", { method: "POST", body: { email, password: "test-pass-1234", data } });

const stamp = Date.now();
const emailA = `test-a-${stamp}@example.com`;
const emailB = `test-b-${stamp}@example.com`;

// --- Sign-up rules ---
const bad = await signUp(`test-bad-${stamp}@example.com`, { display_name: "Bad", invite_code: "WRONG-CODE" });
check("Sign-up with a wrong invite code is rejected", bad.status >= 400, JSON.stringify(bad.json));

const noName = await signUp(`test-noname-${stamp}@example.com`, { display_name: "", invite_code: CODE });
check("Sign-up without a display name is rejected", noName.status >= 400, JSON.stringify(noName.json));

const anonCheck = await call("/rest/v1/rpc/check_invite_code", { method: "POST", body: { p_code: CODE } });
check("check_invite_code(valid) = true", anonCheck.json === true, JSON.stringify(anonCheck.json));
const anonCheckBad = await call("/rest/v1/rpc/check_invite_code", { method: "POST", body: { p_code: "WRONG-CODE" } });
check("check_invite_code(wrong) = false", anonCheckBad.json === false, JSON.stringify(anonCheckBad.json));

const a = await signUp(emailA, { display_name: "Tester A", invite_code: CODE.toLowerCase(), timezone: "Asia/Kolkata" });
const b = await signUp(emailB, { display_name: "Tester B", invite_code: CODE });
check("Sign-up with a valid code works (code is case-insensitive)", !!a.json.access_token, JSON.stringify(a.json));
check("Second user signs up", !!b.json.access_token, JSON.stringify(b.json));
if (!a.json.access_token || !b.json.access_token) {
  console.log(`\n${failed} check(s) failed. Stopping: no test users.`);
  process.exit(1);
}
const A = a.json.access_token;
const B = b.json.access_token;
const idA = a.json.user.id;

// --- Defaults created at sign-up ---
const prof = await call("/rest/v1/profiles?select=*", { token: A });
check("Profile created with display name", prof.json.length === 1 && prof.json[0].display_name === "Tester A", JSON.stringify(prof.json));
const cats = await call("/rest/v1/categories?select=id,name,kind&order=sort_order", { token: A });
check("11 default categories created", cats.json.length === 11, `got ${cats.json.length}`);
const qs = await call("/rest/v1/category_questions?select=id", { token: A });
check("16 default questions created", qs.json.length === 16, `got ${qs.json.length}`);
const routines = await call("/rest/v1/routines?select=name,items", { token: A });
check('"Office day" routine created with 5 blocks', routines.json[0]?.name === "Office day" && routines.json[0].items.length === 5, JSON.stringify(routines.json));

const study = cats.json.find((c) => c.kind === "study");
const insta = cats.json.find((c) => c.name === "Instagram");

// --- Entries + overlap rule ---
const day = "2026-11-20";
const entry = (category_id, from, to, extra = {}) => ({
  category_id, start_at: `${day}T${from}:00+05:30`, end_at: `${day}T${to}:00+05:30`, source: "checkin", ...extra,
});
const e1 = await call("/rest/v1/entries", { token: A, method: "POST", body: entry(study.id, "10:00", "11:00", { focus: 4 }), prefer: "return=representation" });
check("Insert an entry", e1.status === 201, JSON.stringify(e1.json));
const e2 = await call("/rest/v1/entries", { token: A, method: "POST", body: entry(insta.id, "10:30", "11:30") });
check("Overlapping entry is rejected", e2.status >= 400 && e2.json.code === "23P01", JSON.stringify(e2.json));
const e3 = await call("/rest/v1/entries", { token: A, method: "POST", body: entry(insta.id, "11:00", "11:30", { planned: false, trigger: "tired" }) });
check("Touching entry (11:00 right after 10:00–11:00) is allowed", e3.status === 201, JSON.stringify(e3.json));
const e4 = await call("/rest/v1/entries", { token: A, method: "POST", body: entry(study.id, "12:00", "11:45") });
check("Entry ending before it starts is rejected", e4.status >= 400, JSON.stringify(e4.json));

// --- Isolation between users ---
const bEntries = await call("/rest/v1/entries?select=id", { token: B });
check("User B sees none of A's entries", Array.isArray(bEntries.json) && bEntries.json.length === 0, JSON.stringify(bEntries.json));
const bCat = await call(`/rest/v1/categories?select=id&id=eq.${study.id}`, { token: B });
check("User B can't read A's category by id", bCat.json.length === 0, JSON.stringify(bCat.json));
const bProf = await call("/rest/v1/profiles?select=display_name", { token: B });
check("User B sees only their own profile", bProf.json.length === 1 && bProf.json[0].display_name === "Tester B", JSON.stringify(bProf.json));
const bAsA = await call("/rest/v1/entries", { token: B, method: "POST", body: { ...entry(study.id, "15:00", "16:00"), user_id: idA } });
check("User B can't insert rows as user A", bAsA.status >= 400, JSON.stringify(bAsA.json));
const bUsesACat = await call("/rest/v1/entries", { token: B, method: "POST", body: entry(study.id, "15:00", "16:00") });
check("User B can't use A's category in their entry", bUsesACat.status >= 400, JSON.stringify(bUsesACat.json));
const bUpd = await call(`/rest/v1/entries?id=eq.${e1.json[0]?.id}`, { token: B, method: "PATCH", body: { focus: 1 }, prefer: "return=representation" });
check("User B can't edit A's entry", Array.isArray(bUpd.json) && bUpd.json.length === 0, JSON.stringify(bUpd.json));
const bDel = await call(`/rest/v1/entries?id=eq.${e1.json[0]?.id}`, { token: B, method: "DELETE", prefer: "return=representation" });
check("User B can't delete A's entry", Array.isArray(bDel.json) && bDel.json.length === 0, JSON.stringify(bDel.json));

// --- Locked-down areas ---
const anonCodes = await call("/rest/v1/invite_codes?select=code");
check("Logged-out visitor can't read invite codes", anonCodes.status >= 400 || anonCodes.json.length === 0, JSON.stringify(anonCodes.json));
const userCodes = await call("/rest/v1/invite_codes?select=code", { token: A });
check("Logged-in user can't read invite codes", userCodes.status >= 400 || userCodes.json.length === 0, JSON.stringify(userCodes.json));
const anonEntries = await call("/rest/v1/entries?select=id");
check("Logged-out visitor can't read entries", anonEntries.status >= 400 || anonEntries.json.length === 0, JSON.stringify(anonEntries.json));
const seed = await call("/rest/v1/rpc/seed_defaults", { token: A, method: "POST", body: { p_user: idA } });
check("Internal seed function isn't callable from the API", seed.status >= 400, JSON.stringify(seed.json));

console.log(`\n${failed === 0 ? "All checks passed." : `${failed} check(s) failed.`}`);
console.log(`Test users: ${emailA}, ${emailB} (delete in Supabase → Authentication → Users)`);
process.exit(failed ? 1 : 0);
