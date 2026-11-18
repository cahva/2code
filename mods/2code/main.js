// 2code for Herdr: one mod, many parts. Herdr won't let a mod import from
// another mod's folder, so everything that shares code (i18n, git, 2code.json)
// lives here and the layout picks a part with `props.part`.
import { View, div } from "gpui-kit";
import { props, nextCommand } from "herdr";
import { Sidebar, SidebarHeader } from "./parts/sidebar.js";
import { Topbar } from "./parts/topbar.js";
import { Tabs } from "./parts/tabs.js";
import { Templates } from "./parts/templates.js";
import { Menu } from "./parts/menu.js";
import { Rename, RemoveProject } from "./parts/dialogs.js";
import { DeleteProfile } from "./parts/deleteProfile.js";
import { ProjectSettings } from "./parts/projectSettings.js";
import { Diff } from "./parts/diff.js";
import { Review } from "./parts/review.js";
import { Branches } from "./parts/branches.js";
import { OpenIn } from "./parts/openIn.js";
import { EditorPart } from "./parts/editor.js";
import { FileMenu, FilePrompt, FileDelete, Unsaved } from "./parts/fileMenu.js";
import { Finder } from "./parts/finder.js";
import { Files } from "./parts/files.js";
import { Changes } from "./parts/changes.js";

const PARTS = {
  header: SidebarHeader,
  sidebar: Sidebar,
  topbar: Topbar,
  tabs: Tabs,
  templates: Templates,
  menu: Menu,
  rename: Rename,
  removeProject: RemoveProject,
  deleteProfile: DeleteProfile,
  projectSettings: ProjectSettings,
  diff: Diff,
  review: Review,
  branches: Branches,
  openIn: OpenIn,
  editor: EditorPart,
  fileMenu: FileMenu,
  filePrompt: FilePrompt,
  fileDelete: FileDelete,
  unsaved: Unsaved,
  finder: Finder,
  files: Files,
  changes: Changes,
};

class Missing {
  constructor(name) { this.name = name; }
  render() { return div().p(8).child(`2code: unknown part "${this.name}"`); }
}

export default class TwoCode extends View {
  init(_props, cx) {
    const p = props() ?? {};
    const Part = PARTS[p.part];
    this.part = Part ? new Part() : new Missing(p.part);
    // An overlay opened from a popup (the right-click menu) is created inside
    // the popup's call, so host calls its init starts (exec) count as the
    // popup's and are cancelled when the popup closes, leaving their promises
    // pending forever. Start overlay parts from this copy's own timer instead.
    if (p.overlay) {
      this.ready = false;
      cx.timer.after(0, (cx) => { this.part.init?.(p, cx); this.ready = true; cx.notify(); });
    } else {
      this.ready = true;
      this.part.init?.(p, cx);
    }
    // Key commands ("2code.<name>" in keys.json) reach the shown copies; each
    // part handles the ones it knows (see COMMANDS in its class).
    if (this.part.command) cx.spawn(async (cx) => {
      for (;;) {
        const name = await nextCommand();
        if (this.part.constructor.COMMANDS?.includes(name)) this.part.command(name, cx);
      }
    });
  }

  render(cx) {
    if (!this.ready) return div();
    return this.part.render(cx);
  }

  async close(cx) {
    await this.part.close?.(cx);
  }
}
