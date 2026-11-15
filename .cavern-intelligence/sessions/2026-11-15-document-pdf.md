# Session - 2026-11-15: a document PDF for the non-screenplay formats (BACKLOG 3.22)

**The gap:** the PDF of a podcast, ad-copy, video, article, game or outline script used screenplay layout (Courier, dialogue indents, MORE / CONT'D) over a parse that read it as a screenplay.

**Built (no migration):** `lib/scriptos/export-document-pdf.ts`: Helvetica, one-inch margins, sections as headings, speakers as bold labels over their lines, a title block, page numbers; the script is read with its own format. `exportScriptAsPdf` hands every non-screenplay format to it. Unit test with a faked jsPDF (the layout was not looked at in a rendered PDF).

**Not done:** FDX for these formats still goes through screenplay elements (Final Draft has none for them; the honest fix is to hide or label the FDX button for them, S); a look at the rendered PDF; guide workflows for the new project types.
