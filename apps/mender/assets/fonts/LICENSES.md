# Font licenses

All six families are vendored locally as woff2 files (latin subset only) so
the app never fetches fonts from Google at runtime. Each is licensed under the
SIL Open Font License, Version 1.1.

- **Josefin Sans** (weights 400, 600) — SIL OFL 1.1 — `OFL-Josefin-Sans.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/josefinsans
- **Caveat** (weights 500, 700) — SIL OFL 1.1 — `OFL-Caveat.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/caveat
- **Cormorant Garamond** (weights 500, 600, italic 500) — SIL OFL 1.1 — `OFL-Cormorant-Garamond.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/cormorantgaramond
- **Courier Prime** (weight 400, regular and italic) — SIL OFL 1.1 — `OFL-Courier-Prime.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/courierprime
- **Silkscreen** (weight 400) — SIL OFL 1.1 — `OFL-Silkscreen.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/silkscreen. The name
  tag on a district's pennant. Fetched from `@fontsource/silkscreen` on
  jsDelivr, latin subset.
- **Bebas Neue** (weight 400) — SIL OFL 1.1 — `OFL-Bebas-Neue.txt`
  Source: https://github.com/google/fonts/tree/main/ofl/bebasneue. What the
  agent says, under the name `Mender Said` in `fonts.css`. Fetched from
  `@fontsource/bebas-neue` on jsDelivr, latin subset.

The woff2 files themselves were fetched from Google Fonts' CSS2 API
(`fonts.googleapis.com/css2`) with a Chrome user-agent, one weight/style at a
time, to get static font instances rather than variable-font files, and only
the `latin` unicode-range subset.
