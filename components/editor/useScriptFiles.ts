'use client';

// Getting a script in and out of the editor: import (Fountain, FDX, PDF, text)
// and export (text, Fountain, FDX, PDF). Extracted from the editor page so the
// page only wires them to its state.

import { useCallback } from 'react';
import { importScriptFromText, type StoredScript } from '@/lib/scriptos/storage';
import { exportScriptAsText, exportScriptAsFdx, exportScriptAsPdf } from '@/lib/scriptos/export';
import type { TitlePage } from '@/lib/scriptos/titlepage';

type Toast = (message: string, kind?: 'success' | 'error' | 'info') => void;

export function useScriptImport({ setScripts, setCurrentScript, setContent, toast }: {
  setScripts: (update: (prev: StoredScript[]) => StoredScript[]) => void;
  setCurrentScript: (script: StoredScript) => void;
  setContent: (text: string) => void;
  toast: Toast;
}) {
  return useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const title = file.name.replace(/\.(fountain|txt|fdx|pdf)$/i, '');

    const finish = async (text: string) => {
      const imported = await importScriptFromText(text, title);
      if (imported) {
        setScripts((prev) => [...prev, imported]);
        setCurrentScript(imported);
        setContent(text);
        toast(`Imported "${title}"`, 'success');
      }
    };

    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      toast('Extracting PDF…', 'success');
      import('@/lib/scriptos/pdfImport')
        .then(({ extractTextFromPdf }) => extractTextFromPdf(file))
        .then((raw) => {
          // A scan or a picture of a page has no text to read: say so, don't import an empty script.
          if (!raw.trim()) { toast('That PDF has no text to read — it looks like a scan. Export the script as a text PDF, or import a Fountain or Final Draft file.', 'error'); return; }
          finish(raw);
        })
        .catch((err) => {
          console.error(err);
          toast('Could not read that PDF.', 'error');
        });
      return;
    }

    if (/\.(fdx|fountain)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const raw = ev.target?.result as string;
        import('@/lib/scriptos/import')
          .then(({ importToContent }) => importToContent(raw, file.name))
          .then(({ content }) => finish(content))
          .catch((err) => {
            console.error(err);
            toast(`Could not read that ${file.name.split('.').pop()} file.`, 'error');
          });
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => { finish(ev.target?.result as string); };
    reader.readAsText(file);
  }, [setScripts, setCurrentScript, setContent, toast]);
}

export function useScriptExport({ currentScript, content, titlePage, toast, onDone }: {
  currentScript: StoredScript | null;
  content: string;
  titlePage: TitlePage;
  toast: Toast;
  onDone: () => void;
}) {
  return useCallback((format: string) => {
    if (!currentScript) return;
    if (format === 'txt' || format === 'fountain') {
      exportScriptAsText({ ...currentScript, content }, format as 'txt' | 'fountain');
      toast(`Exported as .${format}`, 'success');
    } else if (format === 'fdx') {
      exportScriptAsFdx({ ...currentScript, content });
      toast('Exported as .fdx (Final Draft)', 'success');
    } else if (format === 'pdf') {
      toast('Generating PDF...', 'info');
      exportScriptAsPdf({ ...currentScript, content }, titlePage).catch(() => toast('Could not make the PDF — check your connection and try again.', 'error'));
    } else {
      exportScriptAsText({ ...currentScript, content }, 'txt');
      toast('Exported as .txt', 'success');
    }
    onDone();
  }, [currentScript, content, titlePage, toast, onDone]);
}
