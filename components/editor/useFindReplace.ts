'use client';

// Find & replace over the script's text. The count is of every case-insensitive
// match; "replace all" and "replace one" match the exact case (as it always has
// — BACKLOG: the count and the replacement disagree on case).

import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function useFindReplace(content: string, setContent: (update: (prev: string) => string) => void) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  const findCount = useMemo(() => {
    if (!findText || !content) return 0;
    const matches = content.match(new RegExp(escapeRegex(findText), 'gi'));
    return matches ? matches.length : 0;
  }, [findText, content]);

  const replaceAll = useCallback(() => {
    if (!findText) return;
    const regex = new RegExp(escapeRegex(findText), 'g');
    setContent((prev) => prev.replace(regex, replaceText));
    toast(`Replaced ${findCount} occurrences`, 'success');
  }, [findText, replaceText, findCount, toast, setContent]);

  const replaceOne = useCallback(() => {
    if (!findText) return;
    const regex = new RegExp(escapeRegex(findText));
    setContent((prev) => prev.replace(regex, replaceText));
    toast('Replaced 1 occurrence', 'success');
  }, [findText, replaceText, toast, setContent]);

  return { open, setOpen, findText, setFindText, replaceText, setReplaceText, findCount, replaceAll, replaceOne };
}
