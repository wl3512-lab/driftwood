# Driftwood v2 polish (Nov 2026)

Five commits. All suites pass (unit 189, levels 26, slice 4); the build passes.

- ee32663 fix(v2): pushback caught bubble, phone echo under stall, almanac hint fit
  Levels 4–5 no longer repeat the pushback in the caught bubble (the harness checks this). At 844×390 the echo line scrolls clear of the sticky stall. At 568×320 and 844×390 the almanac hint no longer covers the beds. sw dw-v12.
- 6393cb2 feat(v2): almanac becomes a high-tech book with a screen; planting log is a page
  No Log button. The almanac is a pixel-style device: a bezel, a screen and hardware page buttons. Variant B shipped; variant A (open book with a screen on each page) is in almanac-options.png. sw dw-v13.
- 3ac5d80 feat(v2): planting log is the almanac's cover, not on the garden
  The log is page 1, fact cards page 2. No log button or `l` key on the garden. Opening the book unlocks the "Your label" card. sw dw-v14.
- d0d80f0 feat(v2): almanac is a small icon that opens a dimmed full book
  Almanac and magnifier are square icon buttons ("Almanac (/)", "Magnify (M)"). The almanac opens in a modal dialog with a dimmed backdrop; backdrop click, × or Esc closes it; the page behind is inert and focus returns to the button. The chat dock slides down while the book is open, on laptop and phone. Reduced motion turns the motion off. sw dw-v15.
- 7ae2c83 fix(v2): unlocked card settles full size; almanac cover shows the garden
  The small unlocked card was its pop caught mid-animation; the pop now takes 0.28 s and the harness checks all cards settle at the same width. The cover shows "Day 1", a mini map of the beds with a label on the sown bed, and the log entries. sw dw-v16.

Evidence: almanac-modal-{laptop,phone,small}.png, almanac-modal-cards-phone.png, almanac-slide-{laptop,phone}.png, toolbar-icon-{laptop,phone}.png, almanac-cover-*.png, garden-no-log-*.png, almanac-options.png, and before/after shots for the first commit.
