import * as vscode from "vscode";

import { Config, loadConfig } from "./config";
import { Decorator } from "./decorator";
import { DocumentReader } from "./documentReader";
import { Hint, HintGenerator } from "./hintGenerator";
import { Segmenter } from "./segmenter";

const Mode = {
  Normal: "normal",
  Jump: "jump",
  Select: "select",
} as const;
type Mode = (typeof Mode)[keyof typeof Mode];

export class CursorJump implements vscode.Disposable {
  private hints: Hint[] = [];
  private currentInput: string = "";
  private mode: Mode = Mode.Normal;

  constructor(
    private readonly deps: {
      config: Config;
      readonly documentReader: DocumentReader;
      readonly segmenter: Segmenter;
      readonly decorator: Decorator;
      readonly hintGenerator: HintGenerator;
    },
  ) {
    vscode.commands.executeCommand("setContext", "cursorJump.mode", Mode.Normal);
  }

  async startHintMode() {
    const { documentReader, segmenter, hintGenerator, decorator } = this.deps;

    this.currentInput = "";
    const lines = documentReader.getVisibleLines();
    const linePositions = segmenter.getLinePositions(lines);
    const wordPositions = segmenter.getWordPositions(lines);

    this.hints = hintGenerator.generateHints(wordPositions, linePositions, lines);

    const { selectedHints, candidates } = this.constructHintViewModel(this.hints);
    this.deps.decorator.setDecoration(candidates.concat(selectedHints));
  }

  async startJumpHintMode() {
    this.mode = Mode.Jump;
    vscode.commands.executeCommand("setContext", "cursorJump.mode", this.mode);
    this.startHintMode();
  }

  async startSelectHintMode() {
    this.mode = Mode.Select;
    vscode.commands.executeCommand("setContext", "cursorJump.mode", this.mode);
    this.startHintMode();
  }

  async endHintMode() {
    this.currentInput = "";
    this.mode = Mode.Normal;
    vscode.commands.executeCommand("setContext", "cursorJump.mode", this.mode);
    this.deps.decorator.resetDecoration();
  }

  handleTypeOnHintMode(args: any) {
    switch (this.mode) {
      case Mode.Normal:
        vscode.commands.executeCommand("default:type", args);
        return;
      case Mode.Jump:
        this.handleTypeOnJumpHintMode(args);
        break;
      case Mode.Select:
        this.handleTypeOnSelectHintMode(args);
        break;
      default:
        return;
    }
  }

  handleTypeOnJumpHintMode(args: any) {
    const text: string = args.text.toLowerCase();
    this.currentInput += text;

    const { selectedHints, candidates } = this.constructHintViewModel(this.hints);
    const selectedHint = selectedHints.pop();

    if (selectedHint === undefined) {
      if (candidates.length === 0) {
        this.endHintMode();
        return;
      } else {
        this.deps.decorator.setDecoration(candidates);
        return;
      }
    }

    const position = selectedHint.position;
    const selectPosition = new vscode.Position(position.line, position.index);

    position.editor.selection = new vscode.Selection(selectPosition, selectPosition);
    vscode.window.showTextDocument(position.editor.document, position.editor.viewColumn);
    this.endHintMode();
  }

  handleTypeOnSelectHintMode(args: any) {
    const text: string = args.text.toLowerCase();
    this.currentInput += text;
    const { selectedHints, candidates } = this.constructHintViewModel(this.hints);

    const [first, second] = selectedHints.slice(0, 2);

    if (first === undefined || second === undefined) {
      if (candidates.length === 0) {
        this.endHintMode();
        return;
      } else {
        this.deps.decorator.setDecoration(candidates.concat(selectedHints));
        return;
      }
    }
    const firstPosition = new vscode.Position(first.position.line, first.position.index);
    const secondPosition = new vscode.Position(second.position.line, second.position.index);

    first.position.editor.selection = new vscode.Selection(firstPosition, secondPosition);
    vscode.window.showTextDocument(first.position.editor.document, first.position.editor.viewColumn);
    this.endHintMode();
  }

  handleBackSpaceOnHintMode() {
    if (this.mode === Mode.Normal) {
      vscode.commands.executeCommand("deleteLeft");
      return;
    }
    this.currentInput = this.currentInput.slice(0, -1);

    const { selectedHints, candidates } = this.constructHintViewModel(this.hints);
    this.deps.decorator.setDecoration(candidates.concat(selectedHints));
  }

  constructHintViewModel(hints: Hint[]) {
    const typedChar = this.deps.config.decorationConfig.typedChar;
    const selectedHints: Hint[] = [];
    let restInput = this.currentInput;
    let restHint = hints;
    while (true) {
      const selected = this.hints
        .filter(hint => !selectedHints.some(s => s.code === hint.code))
        .find(hint => restInput.startsWith(hint.code));
      if (!selected) {
        break;
      }
      restInput = restInput.slice(selected.code.length);
      restHint = restHint.filter(hint => hint.code !== selected.code);
      selectedHints.push({
        ...selected,
        code: typedChar.repeat(selected.code.length),
      });
    }

    const candidates = restHint
      .filter(hint => hint.code.startsWith(restInput))
      .filter(hint => selectedHints.every(h => h.position.editor.viewColumn === hint.position.editor.viewColumn))
      .map(hint => {
        return {
          ...hint,
          code: typedChar.repeat(restInput.length) + hint.code.slice(restInput.length),
        };
      });

    return {
      selectedHints,
      candidates,
    };
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
  const decorator = new Decorator(config.decorationConfig);
  const segmenter = new Segmenter();
  const documentReader = new DocumentReader();
  const extension = new CursorJump({ config, documentReader, segmenter, decorator, hintGenerator });

  const disposables: vscode.Disposable[] = [
    extension,
    vscode.commands.registerCommand("cursorJump.startJumpHintMode", () => {
      extension.startJumpHintMode();
    }),
    vscode.commands.registerCommand("cursorJump.startSelectHintMode", () => {
      extension.startSelectHintMode();
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
