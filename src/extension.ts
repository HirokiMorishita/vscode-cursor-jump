import * as vscode from "vscode";

import { Config, loadConfig } from "./config";
import { Decorator } from "./decorator";
import { DocumentReader } from "./documentReader";
import { Hint, HintGenerator } from "./hintGenerator";
import { ImeMode, ImeSwitcher } from "./imeSwitcher";
import { Segmenter } from "./segmenter";

export class CursorJump implements vscode.Disposable {
  private hints: Hint[] = [];
  private currentInput: string = "";
  private isHintMode: boolean = false;
  private previousIM: ImeMode = "";

  constructor(
    private readonly deps: {
      config: Config;
      readonly documentReader: DocumentReader;
      readonly segmenter: Segmenter;
      readonly decorator: Decorator;
      readonly hintGenerator: HintGenerator;
      readonly imeSwitcher: ImeSwitcher;
    },
  ) {
    vscode.commands.executeCommand("setContext", "cursorJump.isHintMode", false);
  }

  async startHintMode() {
    const { documentReader, segmenter, hintGenerator, decorator } = this.deps;

    this.currentInput = "";
    const lines = documentReader.getVisibleLines();
    const linePositions = segmenter.getLinePositions(lines);
    const wordPositions = segmenter.getWordPositions(lines);

    this.hints = hintGenerator.generateHints(wordPositions, linePositions, lines);

    decorator.setDecoration(this.hints, this.currentInput);
    this.isHintMode = true;
    vscode.commands.executeCommand("setContext", "cursorJump.isHintMode", this.isHintMode);
    this.previousIM = await this.deps.imeSwitcher.obtainIm();
    this.deps.imeSwitcher.switchIm("0");
  }

  async endHintMode() {
    this.currentInput = "";
    this.isHintMode = false;
    vscode.commands.executeCommand("setContext", "cursorJump.isHintMode", this.isHintMode);
    this.deps.decorator.resetDecoration();
    this.deps.imeSwitcher.switchIm(this.previousIM);
  }

  handleTypeOnHintMode(args: any) {
    if (!this.isHintMode) {
      vscode.commands.executeCommand("default:type", args);
      return;
    }

    const text: string = args.text.toLowerCase();
    this.currentInput += text;

    if (!this.hints.some(hint => hint.code.startsWith(this.currentInput))) {
      this.endHintMode();
      return;
    }

    const position = this.hints.find(hint => hint.code === this.currentInput)?.position;

    if (position === undefined) {
      this.deps.decorator.setDecoration(this.hints, this.currentInput);
      return;
    }

    position.editor.selection = new vscode.Selection(
      position.line,
      position.index,
      position.line,
      position.index,
    );
    vscode.window.showTextDocument(position.editor.document, position.editor.viewColumn);
    this.endHintMode();
  }

  handleBackSpaceOnHintMode() {
    if (!this.isHintMode) {
      vscode.commands.executeCommand("deleteLeft");
      return;
    }
    this.currentInput = this.currentInput.slice(0, -1);
    this.deps.decorator.setDecoration(this.hints, this.currentInput);
  }

  dispose() {
    this.deps.decorator.dispose();
  }
}

export function activate(context: vscode.ExtensionContext) {
  const config = loadConfig();
  initialize(context, config);
}

export function deactivate() {}

function initialize(context: vscode.ExtensionContext, config: Config) {
  context.subscriptions.forEach(disposable => disposable.dispose());
  const hintGenerator = new HintGenerator(config.hintConfig);
  const decorator = new Decorator(hintGenerator, config.decorationConfig);
  const segmenter = new Segmenter();
  const documentReader = new DocumentReader();
  const imeSwitcher = new ImeSwitcher(config.imeSwitcherConfig, context);
  const extension = new CursorJump({ config, documentReader, segmenter, decorator, hintGenerator, imeSwitcher });

  const disposables: vscode.Disposable[] = [
    extension,
    vscode.commands.registerCommand("cursorJump.startHintMode", () => {
      extension.startHintMode();
    }),
    vscode.commands.registerCommand("cursorJump.endHintMode", () => {
      extension.endHintMode();
    }),
    vscode.commands.registerCommand("cursorJump.deleteLeft", () => {
      extension.handleBackSpaceOnHintMode();
    }),
    vscode.commands.registerCommand("type", args => {
      extension.handleTypeOnHintMode(args);
    }),
    vscode.window.onDidChangeActiveTextEditor(_ => extension.endHintMode()),
    vscode.window.onDidChangeTextEditorVisibleRanges(_ => extension.endHintMode()),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (
        e.affectsConfiguration("cursorJump") || e.affectsConfiguration("editor.fontSize")
      ) {
        extension.endHintMode();
        const newConfig = loadConfig();
        initialize(context, newConfig);
      }
    }),
  ];
  context.subscriptions.push(...disposables);
}
