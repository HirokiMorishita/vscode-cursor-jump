import { exec, execFile } from "child_process";
import * as os from "os";
import * as path from "path";
import * as process from "process";
import { promisify } from "util";
import * as vscode from "vscode";
import { ImeSwitcherConfig } from "./config";

const execFileAsync = promisify(execFile);

export type ImeMode = "0" | "1" | "";

export class ImeSwitcher {
  private exePath: string;
  constructor(private readonly config: ImeSwitcherConfig, context: vscode.ExtensionContext) {
    const arch = process.arch;

    if (this.config.enable && os.platform() === "win32") {
      this.exePath = context.asAbsolutePath(path.join("bin", `win32-${arch}`, "zenhan.exe"));
    } else {
      this.exePath = "";
    }
  }

  async obtainIm(): Promise<ImeMode> {
    if (this.exePath === "") {
      return "";
    }
    const { stdout } = await execFileAsync(this.exePath, { windowsHide: true });
    return this.toImeMode(stdout);
  }

  async switchIm(im: ImeMode) {
    if (this.exePath === "" || im === "") {
      return;
    }

    const { stdout } = await execFileAsync(this.exePath, [im], { windowsHide: true });
    return this.toImeMode(stdout);
  }

  private toImeMode(v: string): ImeMode {
    const mode = v.trim();
    if (mode === "0" || mode === "1" || mode === "") {return mode;}
    return "";
  }
}
