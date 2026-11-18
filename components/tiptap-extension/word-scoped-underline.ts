import Underline from "@tiptap/extension-underline";
import { Plugin, type EditorState, type Transaction } from "@tiptap/pm/state";

function insertUnmarkedSpace(
  state: EditorState,
  dispatch: (transaction: Transaction) => void,
  text: string,
) {
  if (!state.selection.empty || !state.selection.$from.parent.inlineContent) return false;

  const marks = state.storedMarks ?? state.selection.$from.marks();
  const nextMarks = marks.filter((mark) => mark.type.name !== "underline");
  if (nextMarks.length === marks.length) return false;

  // Keep existing underlines and any other active formatting. Only the new
  // separator and subsequent typing should lose the underline mark.
  dispatch(
    state.tr
      .replaceSelectionWith(state.schema.text(text, nextMarks), false)
      .setStoredMarks(nextMarks)
      .scrollIntoView(),
  );
  return true;
}

/** Underlines represent target words in these grammar questions. */
export const WordScopedUnderline = Underline.extend({
  inclusive: false,

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Space: () => {
        const view = this.editor.view;
        if (view.composing) return false;
        return insertUnmarkedSpace(view.state, (transaction) => view.dispatch(transaction), " ");
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        props: {
          // Some mobile keyboards enter spaces as text input instead of keydown.
          handleTextInput(view, from, to, text) {
            if (view.composing || from !== to || from !== view.state.selection.from || !/^[ \u00a0]+$/.test(text)) {
              return false;
            }
            return insertUnmarkedSpace(view.state, (transaction) => view.dispatch(transaction), text);
          },
        },
      }),
    ];
  },
});
