import * as vscode from "vscode";
import { DecorationConfig } from "./config";
import { Hint } from "./hintGenerator";

export class Decorator implements vscode.Disposable {
  private decorationType: vscode.TextEditorDecorationType;

  constructor(
    private readonly config: DecorationConfig,
  ) {
    this.decorationType = this.createDecorationType();
  }

  public resetDecoration() {
    vscode.window.visibleTextEditors.forEach(editor => {
      editor.setDecorations(this.decorationType, []);
    });
  }

  public setDecoration(hints: Hint[]) {
    vscode.window.visibleTextEditors.forEach(editor => {
      const decorationOptions = hints
        .filter(hint => {
          return hint.position.editor.viewColumn === editor.viewColumn;
        })
        .flatMap(hint => {
          return this.createDecorationOptions(hint);
        });

      editor.setDecorations(this.decorationType, decorationOptions);
    });
  }

  private createDecorationType(): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({});
  }

  private createDecorationOptions(
    hint: Hint,
  ): vscode.DecorationOptions[] {
    const codeWidth = this.config.fontSize * 0.6 * hint.code.length;
    const shiftWidth = hint.coveringLength === 0 ? 0 : -codeWidth;
    return [
      {
        range: new vscode.Range(
          hint.position.line,
          hint.position.index,
          hint.position.line,
          hint.position.index + hint.coveringLength,
        ),
        renderOptions: {
          after: {
            contentText: hint.code,
            color: this.config.foregroundColor,
            backgroundColor: this.config.backgroundColor,
            margin: `0 0 0 ${shiftWidth}px`,
            width: `${codeWidth}px`,
          },
        },
      },
    ];
  }

  dispose() {
    this.decorationType.dispose();
  }
}
