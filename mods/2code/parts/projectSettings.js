// Project settings: the project's setup / teardown / init scripts and
// terminal templates, and the global templates, kept in Herdr's shared state
// (lib/config.js). Fields 2code doesn't know are kept.
import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextareaState, Textarea } from "gpui-base";
import { props, theme, closeOverlay } from "herdr";
import { t } from "../lib/i18n.js";
import { rawProjectConfig, rawGlobalConfig, saveConfig } from "../lib/config.js";
import { button, icon } from "../lib/ui.js";

const lines = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean);
const SCRIPTS = [["setup_script", "setupScript", "setupScriptDesc"], ["teardown_script", "teardownScript", "teardownScriptDesc"], ["init_script", "initScript", "initScriptDesc"]];

export class ProjectSettings {
  init(p) {
    this.p = p;
    this.tab = "scripts";
    this.data = { project: rawProjectConfig(p.path, p.machine ?? null), global: rawGlobalConfig() };
    this.scripts = {};
    for (const [key] of SCRIPTS) {
      const v = this.data.project[key];
      this.scripts[key] = TextareaState.new({ value: Array.isArray(v) ? v.join("\n") : "", rows: 3 });
    }
    this.templates = {};
    for (const scope of ["project", "global"]) {
      const list = this.data[scope].terminal_templates;
      this.templates[scope] = (Array.isArray(list) ? list : []).map((x) => this.row(x));
    }
  }

  row(x = {}) {
    return {
      extra: Object.fromEntries(Object.entries(x).filter(([k]) => !["name", "cwd", "commands"].includes(k))),
      name: InputState.new({ value: x.name ?? "", placeholder: t("templateNamePlaceholder") }),
      cwd: InputState.new({ value: x.cwd ?? "", placeholder: t("templateCwdPlaceholder") }),
      commands: TextareaState.new({ value: Array.isArray(x.commands) ? x.commands.join("\n") : "", rows: 2 }),
    };
  }

  templateJson(rows, withCwd) {
    return rows.filter((r) => r.name.value().trim()).map((r) => ({
      ...r.extra,
      name: r.name.value().trim(),
      ...(withCwd ? { cwd: r.cwd.value().trim() } : {}),
      commands: lines(r.commands.value()),
    }));
  }

  save() {
    const project = { ...this.data.project };
    for (const [key] of SCRIPTS) project[key] = lines(this.scripts[key].value());
    project.terminal_templates = this.templateJson(this.templates.project, true);
    const global = { ...this.data.global, terminal_templates: this.templateJson(this.templates.global, false) };
    saveConfig({ path: this.p.path, on: this.p.machine ?? null, project, global });
    closeOverlay(props().overlay);
  }

  field(th, child, { mono = false } = {}) {
    return div().w_full().px(10).rounded(6).border_1().border_color(th.input).bg(th.background).cursor_text()
      .when(mono, (el) => el.font_family("JetBrains Mono"))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).child(child);
  }

  scriptsTab(th) {
    return SCRIPTS.map(([key, title, desc]) => v_flex().gap(4)
      .child(div().font_semibold().child(t(title)))
      .child(div().text_size(12).text_color(th.dim).child(t(desc)))
      .child(this.field(th, Textarea.new(this.scripts[key]).py(6).text_size(12).text_color(th.foreground), { mono: true })));
  }

  templatesTab(scope, th) {
    const rows = this.templates[scope], withCwd = scope === "project";
    return [
      div().text_size(12).text_color(th.dim).child(t(scope === "project" ? "projectTemplatesDesc" : "globalTemplatesDesc")),
      ...rows.map((r, i) => v_flex().id(`tpl-${scope}-${i}`).p(10).gap(6).rounded(8).border_1().border_color(th.border)
        .child(h_flex().gap(8).items_center()
          .child(div().flex_1().child(this.field(th, Input.new(r.name).h(30).text_size(12.5).text_color(th.foreground))))
          .when(withCwd, (el) => el.child(div().w(170).child(this.field(th, Input.new(r.cwd).h(30).text_size(12.5).text_color(th.foreground), { mono: true }))))
          .child(div().id(`tpl-del-${scope}-${i}`).size(26).flex().items_center().justify_center().rounded(5).cursor_pointer().text_color(th.dim)
            .hover((s) => s.bg(th.hover).text_color(th.ansi1))
            .on_click((_e, cx) => { rows.splice(i, 1); cx.notify(); })
            .child(icon("x", 13))))
        .child(div().text_size(11.5).text_color(th.dim).child(t("templateCommandsDesc")))
        .child(this.field(th, Textarea.new(r.commands).py(6).text_size(12).text_color(th.foreground), { mono: true }))),
      h_flex().child(button(`tpl-add-${scope}`, th, t("addTemplate"), (_e, cx) => { rows.push(this.row()); cx.notify(); })),
    ];
  }

  render() {
    const th = theme();
    const tabs = [["scripts", t("scriptsTab")], ["project", t("projectTemplates")], ["global", t("globalTemplates")]];
    return v_flex().size_full().bg(th.popover).text_color(th.foreground).text_size(13)
      .child(h_flex().px(18).pt(16).pb(10).gap(8).items_center()
        .child(icon("settings", 16).text_color(th.muted))
        .child(div().text_size(15).font_semibold().child(t("projectSettingsTitle", { name: this.p.name ?? "" }))))
      .child(h_flex().px(18).gap(2).border_b(1).border_color(th.border)
        .children(tabs.map(([id, label]) => div().id(`tab-${id}`).px(10).py(7).cursor_pointer().text_size(12.5)
          .border_b(2).border_color(this.tab === id ? th.foreground : th.popover)
          .text_color(this.tab === id ? th.foreground : th.dim)
          .on_click((_e, cx) => { this.tab = id; cx.notify(); }).child(label))))
      .child(v_flex().id("settings-body").flex_1().min_h(0).p(18).gap(14).overflow_y_scrollbar()
        .children(this.tab === "scripts" ? this.scriptsTab(th) : this.templatesTab(this.tab, th)))
      .child(h_flex().px(18).py(12).gap(8).items_center().border_t(1).border_color(th.border)
        .child(div().flex_1())
        .child(button("cancel", th, t("cancel"), () => closeOverlay(props().overlay)))
        .child(button("save", th, t("save"), () => this.save(), { primary: true })));
  }
}
