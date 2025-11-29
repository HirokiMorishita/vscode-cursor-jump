import * as vscode from "vscode";

export interface Line {
  editor: vscode.TextEditor;
  line: number;
  text: string;
  // textのうち見えている範囲
  visibleRange: vscode.Range;
}

export class DocumentReader {
  getVisibleLines(): Line[] {
    return vscode.window.visibleTextEditors.flatMap(editor => {
      return editor.visibleRanges.flatMap(range => {
        return [...Array(range.end.line - range.start.line + 1)].map((_, i) => {
          const line = range.start.line + i;
          const lineText = editor.document.lineAt(line).text;
          const startPosition = line === range.start.line ? range.start : new vscode.Position(line, 0);
          const endPosition = line === range.end.line ? range.end : new vscode.Position(line, lineText.length);
          return {
            editor,
            line,
            visibleRange: new vscode.Range(startPosition, endPosition),
            text: lineText,
          };
        });
      });
    });
  }
}
