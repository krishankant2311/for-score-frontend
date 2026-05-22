"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

/**
 * Isolated so the parent page can load this via next/dynamic({ ssr: false }).
 * CKEditor touches `window` at import time — must not run during SSR.
 */
export default function RichTextEditor({ data, onChange, config }) {
  return (
    <CKEditor
      editor={ClassicEditor}
      data={data}
      onChange={(_event, editor) => onChange(editor.getData())}
      config={config}
    />
  );
}
