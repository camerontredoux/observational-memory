## code lane: I24 mask-keep-cited: rejected

- cite (/tmp/omv-code/cite): keeps the cut-middle lines that hold a token (path, number, identifier) the assistant names in later tail rows, up to 100 tokens per result. Against mask3-250: 0.0, no flips, context +1%.
- cite-all: tokens named in any later row, including later tool results. cite-all2: the same plus ranked selection and up to 200 tokens. Fair-graded against grp, both have the same 5 losses as mask3-250 (+0.2, 0↑ 5↓), with context -13% and -12% instead of -14%.
- Why: checked by hand, the lost terms are never named again in the tail (/tmp/om-bench/results.jsonl, $0.0029, filled-pdfs, data/secondmates.md, super-test-db). No citation signal can pick them out; they are incidental details, and om_recall still holds them.
- The diff is kept in /tmp/omv-code/i24-cite.diff. Not in the lane base. Next: I10 open-failures on mask3-250.
