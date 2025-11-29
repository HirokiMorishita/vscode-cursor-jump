import * as eaw from "eastasianwidth";
import { HintConfig } from "./config";
import { Line } from "./documentReader";
import { Position } from "./segmenter";

export interface Hint {
  position: Position;
  code: string;
  coveringLength: number;
}

export class HintGenerator {
  constructor(private readonly config: HintConfig) {}

  public generateHints(wordPositions: Position[], linePositions: Position[], lines: Line[]): Hint[] {
    const lPositions: Position[] = !this.config.enableLineHints ? [] : linePositions;
    const wPositions: Position[] = !this.config.enableWordHints ? [] : wordPositions;

    const maxHintsNum = [...lPositions, ...wPositions].length;
    const hintCodes = this.hintStrings(maxHintsNum);
    const hints: Hint[] = [];
    [...lPositions, ...wPositions]
      .sort((a, b) => a.line - b.line)
      .sort((a, b) => {
        const columnA = a.editor.viewColumn?.valueOf() ?? 0;
        const columnB = b.editor.viewColumn?.valueOf() ?? 0;
        return columnA - columnB;
      })
      .forEach(position => {
        // 一つ前のヒントと重なるものは除外する
        const lastHint = hints.at(-1);
        if (
          lastHint === undefined
          || position.editor.viewColumn !== lastHint.position.editor.viewColumn
          || position.line !== lastHint.position.line
          || Math.abs(position.index - lastHint.position.index) >= lastHint.coveringLength + 1
        ) {
          const code = hintCodes.at(hints.length % hintCodes.length) ?? "";
          const lineText = lines.find(line =>
            line.editor.viewColumn === position.editor.viewColumn && line.line === position.line
          )?.text ?? "";
          const coveringLength = this.calcCoveringLength(code, lineText.slice(position.index));
          hints.push({
            position,
            code,
            coveringLength,
          });
        }
      });

    return hints;
  }

  // This function contains modified portions of the code from:
  // https://github.com/philc/vimium/blob/1570c19eebde0857fda0101a85bc33257a480c70/content_scripts/link_hints.js#L831-L845
  // Copyright (c) 2010 Phil Crosby, Ilya Sukhar.
  // Licensed under The MIT License. See THIRD_PARTY/vimium.txt for details.
  private hintStrings(hintCount: number): string[] {
    let hints: string[] = [""];
    let offset = 0;
    while (((hints.length - offset) < hintCount) || (hints.length === 1)) {
      const hint = hints[offset++];
      for (const ch of this.config.hintChars) {
        hints.push(ch + hint);
      }
    }
    hints = hints.slice(offset, offset + hintCount);
    return hints.map((str) => str.split("").reverse().join("")).sort((a, b) => a.length - b.length);
  }

  private calcCoveringLength(code: string, baseText: string): number {
    // ヒントがbaseTextの何文字目まで覆うか全角半角を考慮して計算する
    const codeWidth = this.getCharWidthArray(code).reduce((sum, width) => sum += width, 0);
    let summedCharWidth = 0;
    const coveringTextLength = this.getCharWidthArray(baseText).findIndex(charWidth => {
      summedCharWidth += charWidth;
      return summedCharWidth >= codeWidth;
    }) + 1;
    return coveringTextLength === -1 ? baseText.length : coveringTextLength;
  }

  private getCharWidthArray(text: string): number[] {
    return text
      .split("")
      .map(char => {
        return eaw.characterLength(char);
      });
  }
}
