# Font licenses

All six families but Pretty Neat are vendored locally as woff2 files (latin subset only) so
the app never fetches fonts from Google at runtime. Each is licensed under the
SIL Open Font License, Version 1.1.

- **Josefin Sans** (weights 400, 600) — SIL OFL 1.1 — `OFL-Josefin-Sans.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/josefinsans
- **Pretty Neat** by Jaclyn Tan (regular 400, bold 700) — SIL OFL, as its own
  name table says, and "free for commercial and personal use" on its page.
  What you write, under the name `Mender Hand` in `fonts.css`. The woff2 files
  are hers unchanged, from the Web folder of the download linked at
  https://jaclyntan.com/projects/a-pretty-neat-font
- **Cormorant Garamond** (weights 500, 600, italic 500) — SIL OFL 1.1 — `OFL-Cormorant-Garamond.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/cormorantgaramond
- **Courier Prime** (weight 400, regular and italic) — SIL OFL 1.1 — `OFL-Courier-Prime.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/courierprime
- **Silkscreen** (weight 400) — SIL OFL 1.1 — `OFL-Silkscreen.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/silkscreen. The name
  tag on a district's pennant. Fetched from `@fontsource/silkscreen` on
  jsDelivr, latin subset.
- **Fraunces** (variable, regular and italic) — SIL OFL 1.1 — `OFL-Fraunces.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/fraunces. Was what the
  agent says; kept in case Grunell goes back. Fetched from
  `@fontsource-variable/fraunces` on jsDelivr, latin subset, all axes.
- **Grunell** by Typebae (regular 400) — the free download is for personal use
  only and may not be converted or redistributed, so the .otf is theirs
  unchanged, from https://www.dafont.com/grunell.font. Fine for this private
  repo and Kirubel's own copy of the app; anything public or commercial needs
  the licence from https://typebae.com/product/Grunell first. What the agent
  says, under the name `Mender Said` in `fonts.css`.

The woff2 files themselves were fetched from Google Fonts' CSS2 API
(`fonts.googleapis.com/css2`) with a Chrome user-agent, one weight/style at a
time, to get static font instances rather than variable-font files, and only
the `latin` unicode-range subset.
