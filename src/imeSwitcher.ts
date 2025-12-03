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
    const WARN_KEY = "ime.warn";

    if (this.config.enable && os.platform() === "win32") {
      switch (arch) {
        case "arm64":
          if (!context.globalState.get(WARN_KEY)) {
            vscode.window.showWarningMessage(`[IME] ARM64 Windows detected. Using x64 binary fallback.`);
            context.globalState.update(WARN_KEY, true);
          }
          this.exePath = context.asAbsolutePath(path.join("bin", `win32-x64`, "zenhan.exe"));
          break;
        case "x64":
        case "ia32":
          this.exePath = context.asAbsolutePath(path.join("bin", `win32-${arch}`, "zenhan.exe"));
          break;
        default:
          if (!context.globalState.get(WARN_KEY)) {
            vscode.window.showWarningMessage(`[IME] Unsupported CPU architecture "${arch}"`);
            context.globalState.update(WARN_KEY, true);
          }
          this.exePath = "";
          break;
      }
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
