# phase2-refl: I23 refl-share, the concrete form I'm testing (update the queue entry)

- **Measured:** Luna lands near half its target, well short of the prompt's asked-for 60-90%: grp's reflection had a ~7.4k room and wrote 3.6k; r28's first had ~5.7k and wrote 2.6k (16% of a 16k input).
- **Change (variant /tmp/omv-refl/share, on tierb):** target = max(room, 0.5 x input tokens), where room is today's REFLECT_TARGET - 🔴 - kept. The floor stays 0.4 x room, so a reply like today's is still accepted and no retries are added.
- **Budget check:** memory after a reflection = 🔴 + kept (8.3k) + tier (≤6k) + reply (~4k at half of 8k) ≈ 19k at most, under REFLECT_AT 28k.
- **Test:** chain screen at --samples 1, after the tierb/r28 full test finishes.
