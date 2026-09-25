Rubric bug: contextText() (tests/eval/replay.ts) rewrites the home directory to `~` (normalize), but rubric.ts compares
raw transcript strings against that normalized text in five places, so any quote or error key holding /home/cameron can
never match, whatever the context holds.

Fix (apply by hand; context lines differ between checkouts):

tests/eval/replay.ts
-const normalize = (text: string) => text.replace(HOME, '~')
+export const normalize = (text: string) => text.replace(HOME, '~')

tests/eval/rubric.ts
 import { ..., neededIdentifiers, normalize, scoreConstraints } from './replay'
-const quoteKey = (text: string) => squash(text).slice(0, 100)
+const quoteKey = (text: string) => squash(normalize(text)).slice(0, 100)
 (verbatim)            text.includes(squash(c.quote))            -> text.includes(squash(normalize(c.quote)))
 (reversal quotes)     [c.quote, c.reversal!.quote].map(squash)  -> .map((q) => squash(normalize(q)))
 (verbatim:reversal)   text.includes(squash(c.reversal!.quote))  -> text.includes(squash(normalize(c.reversal!.quote)))
 (failures)            ptext.includes(squash(k))                 -> ptext.includes(squash(normalize(k)))

Effect on base3 (cached, 0 fresh calls): main 77.9 -> 77.9, chain 81.45 -> 81.45, holdout 79.28 -> 83.31 (+4.0):
13 asks items (crew-opie-4's ": Firstmate instruction waiting: list '/home/cameron/...inbox'" prompts, which the
all-user-messages section quotes verbatim) and 3 failures items (crew-opie-4 line 1200, "ls: cannot access
'/home/cameron/work/firstmate/projects/oas...") go 0 -> 1. No item goes down.
