import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/react";

const EditorContext = createContext<Editor | null>(null);

/** Hook to consume the editor instance anywhere */
export const useEditorContext = () => {
  const editor = useContext(EditorContext);
  if (editor === null) {
    throw new Error("useEditorContext must be used inside an EditorContext.Provider");
  }
  return editor;
};

export default EditorContext;
