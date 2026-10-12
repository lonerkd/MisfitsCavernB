'use client';

// Find & replace over the script's text. "Match case" is on by default (in a
// screenplay MAYA and Maya are different things) and the count, replace-one and
// replace-all all follow it, so the number shown is the number replaced.

import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function useFindReplace(content: string, setContent: (update: (prev: string) => string) => void) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(true);

  const pattern = useCallback((all: boolean) => new RegExp(escapeRegex(findText), `${all ? 'g' : ''}${matchCase ? '' : 'i'}`), [findText, matchCase]);

  const findCount = useMemo(() => {
    if (!findText || !content) return 0;
    return content.match(pattern(true))?.length ?? 0;
  }, [findText, content, pattern]);

  // A function replacer, so "$&" in the replacement is text, not a pattern.
  const replaceAll = useCallback(() => {
    if (!findText) return;
    if (findCount === 0) { toast('Nothing to replace', 'info'); return; }
    setContent((prev) => prev.replace(pattern(true), () => replaceText));
    toast(`Replaced ${findCount} ${findCount === 1 ? 'occurrence' : 'occurrences'}`, 'success');
  }, [findText, replaceText, findCount, pattern, toast, setContent]);

  const replaceOne = useCallback(() => {
    if (!findText) return;
    if (findCount === 0) { toast('Nothing to replace', 'info'); return; }
    setContent((prev) => prev.replace(pattern(false), () => replaceText));
    toast('Replaced 1 occurrence', 'success');
  }, [findText, replaceText, findCount, pattern, toast, setContent]);

  return { open, setOpen, findText, setFindText, replaceText, setReplaceText, matchCase, setMatchCase, findCount, replaceAll, replaceOne };
}
