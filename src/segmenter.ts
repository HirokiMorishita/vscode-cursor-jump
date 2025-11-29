import * as vscode from "vscode";
import { Line } from "./documentReader";
import TinySegmenter from "./tiny-segmenter";

export interface Position {
  editor: vscode.TextEditor;
  line: number;
  index: number;
}

export class Segmenter {
  private tinySegmenter = new TinySegmenter();

  public getLinePositions(lines: Line[]): Position[] {
    return lines.map(line => {
      return {
        editor: line.editor,
        line: line.line,
        index: 0 + line.visibleRange.start.character,
      };
    });
  }
  public getWordPositions(lines: Line[]): Position[] {
    const enclosuresRegExp = /\(\)|\{\}|\[\]|<>|「」|（）|『』|""|``|''/g;
    const alphanumericRegExp = /[a-zA-Zａ-ｚＡ-Ｚ0-9０-９]/g;
    const kanjiRegExp = /\p{sc=Han}/u;
    const camelCaseRegExp = /[a-z][A-Z]/g;

    return lines.flatMap(line => {
      const lineText = line.text.slice(line.visibleRange.start.character, line.visibleRange.end.character);
      const segmentsByEnclosures = [...lineText.matchAll(enclosuresRegExp)].map(matched => {
        return {
          word: matched[0],
          index: matched.index + 1,
        };
      });
      const segmentsByTinySegmenter = this.tinySegmenter.segment(lineText)
        .flatMap(segment => {
          // キャメルケースを追加でセグメントする
          return [
            segment,
            ...[...segment.word.matchAll(camelCaseRegExp)].map(matched => {
              return {
                word: segment.word.slice(matched.index + 1), // 次のマッチ部分も含まれるが許容する
                index: segment.index + matched.index + 1, // 先頭は小文字部分なので+1する
              };
            }),
          ];
        })
        .map(segment => {
          return {
            word: segment.word.trim(),
            index: segment.index,
          };
        })
        // 漢字や英数字でない１文字の文字列は除外する
        .filter(segment =>
          segment.word.length >= 2 || alphanumericRegExp.test(segment.word) || kanjiRegExp.test(segment.word)
        );

      return [...segmentsByEnclosures, ...segmentsByTinySegmenter].map(segment => {
        return {
          editor: line.editor,
          line: line.line,
          index: segment.index + line.visibleRange.start.character,
        };
      })
        .sort((a, b) => a.index - b.index);
    });
  }
}
