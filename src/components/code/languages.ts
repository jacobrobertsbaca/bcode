export type LanguageInfo = {
  /** The internal name of the language as it appears in the database. */
  name: string,

  /** Must match the CodeMirror `name` property.
   * See [this file](https://github.com/codemirror/language-data/blob/main/src/language-data.ts) for a
   * list of supported languages. */
  cm: string,

  /**
   * The name of the language as it appears in the UI. If undefined, will use {@link cm} instead.
   */
  label?: string
}

/**
 * Languages supported by the app. Syntax highlighting for languages will be dynamically 
 * loaded to conserve on bundle size. 
 * 
 * @remarks The first language listed will be the default selection when creating a room.
 */
export const SupportedLanguages: readonly LanguageInfo[] = [
  {
    name: "cpp",
    cm: "C++",
  },
  {
    name: "python",
    cm: "Python",
  },
];