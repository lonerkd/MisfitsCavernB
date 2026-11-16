# Button ripple timer cleared on unmount (BACKLOG 3.49 watch note)

`components/ui/Button.tsx` now keeps its ripple-removal timers in a ref and clears them on unmount, so a timer cannot fire after the component or the test environment has gone (the cause of the SoundLibrary.test.tsx unhandled error). `components/ui/Button.test.tsx` covers click-then-unmount with fake timers; typecheck, lint and the full unit run pass.
