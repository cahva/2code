// 2code's settings, kept in Herdr's shared state ("2code.config", saved in the
// app home's shared.json), never in a repo: a cloned repo can't bring scripts
// that 2code would run.
//   { global: { terminal_templates }, projects: { "<machine>:<main checkout>": {...} } }
// Per project (worktrees use their project's):
//   setup_script / teardown_script: string[]  (each line runs with `sh -c`, in order,
//                                               stopping at the first failure)
//   init_script: string[]                      (typed into every terminal 2code opens)
//   terminal_templates: { name, cwd?, commands: string[] }[]
import { shared, setShared } from "herdr";

const KEY = "2code.config";
const lines = (v) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : []);
const keyOf = (path, on) => `${on ?? ""}:${path}`;

function normalize(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    setup_script: lines(c.setup_script),
    teardown_script: lines(c.teardown_script),
    init_script: lines(c.init_script),
    terminal_templates: (Array.isArray(c.terminal_templates) ? c.terminal_templates : [])
      .filter((x) => x && typeof x.name === "string" && x.name.trim())
      .map((x, i) => ({ id: x.id || `${i}:${x.name}`, name: x.name.trim(), cwd: typeof x.cwd === "string" ? x.cwd.trim() : "", commands: lines(x.commands) })),
  };
}

function store() {
  const v = shared(KEY);
  return { global: v?.global ?? {}, projects: v?.projects ?? {} };
}

// As stored, for the settings dialog (it keeps fields it doesn't know).
export const rawGlobalConfig = () => store().global;
export const rawProjectConfig = (path, on) => (path ? store().projects[keyOf(path, on)] ?? {} : {});

export const readGlobalConfig = async () => normalize(rawGlobalConfig());
export const readProjectConfig = async (path, on) => normalize(rawProjectConfig(path, on));

const empty = (data) => Object.values(data).every((v) => Array.isArray(v) && !v.length);

export function saveConfig({ path, on, project, global }) {
  const s = store(), projects = { ...s.projects }, k = keyOf(path, on);
  if (path && project) { if (empty(project)) delete projects[k]; else projects[k] = project; }
  setShared(KEY, { global: global ?? s.global, projects });
}

// A POSIX-quoted word for sh.
export const quote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// What a setup tab runs: every line, in order, stopping at the first failure,
// like 2code's own runner (each line its own `sh -c`).
export function scriptArgv(script) {
  return ["sh", "-c", script.map((l) => `sh -c ${quote(l)}`).join(" && ")];
}
