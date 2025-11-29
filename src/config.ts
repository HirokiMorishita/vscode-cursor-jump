import * as vscode from "vscode";
import z from "zod";

const decorationConfigSchema = z.object({
  fontFamily: z.string().default(""),
  fontSize: z.number().default(0),
  backgroundColor: z.string().default("white"),
  foregroundColor: z.string().default("black"),
  typedChar: z.string().min(1).default("_"),
});
export type DecorationConfig = z.infer<typeof decorationConfigSchema>;

const hintConfigSchema = z.object({
  enableWordHints: z.boolean().default(true),
  enableLineHints: z.boolean().default(true),
  hintChars: z.string().min(1).default(
    // a-z
    [...Array(26)].map((_, i) => String.fromCharCode(97 + i)).join(""),
  ),
});
export type HintConfig = z.infer<typeof hintConfigSchema>;

const imeSwitcherConfigSchema = z.object({
  enable: z.boolean().default(false),
});
export type ImeSwitcherConfig = z.infer<typeof imeSwitcherConfigSchema>;

const configSchema = z.object({
  hintConfig: hintConfigSchema,
  decorationConfig: decorationConfigSchema,
  imeSwitcherConfig: imeSwitcherConfigSchema,
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig() {
  const editorConfig = vscode.workspace.getConfiguration("editor");
  const hintConfig = vscode.workspace.getConfiguration("cursorJump.hint");
  const imeSwitcherConfig = vscode.workspace.getConfiguration("cursorJump.autoSwitchInputMethod");
  return configSchema.parse({
    hintConfig: {
      enableWordHints: hintConfig.get<boolean>("enableWordHints"),
      enableLineHints: hintConfig.get<boolean>("enableLineHints"),
      hintChars: hintConfig.get<string>("hintChars"),
    },
    decorationConfig: {
      fontFamily: hintConfig.get<string>("fontFamily") || editorConfig.get<string>("fontFamily"),
      fontSize: hintConfig.get<number>("fontSize") || editorConfig.get<number>("fontSize"),
      backgroundColor: hintConfig.get<string>("backgroundColor"),
      foregroundColor: hintConfig.get<string>("foregroundColor"),
      typedChar: hintConfig.get<string>("typedChar"),
    },
    imeSwitcherConfig: {
      enable: imeSwitcherConfig.get<boolean>("enable"),
    },
  });
}
