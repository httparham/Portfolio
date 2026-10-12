# Portfolio page overrides

These rules override MASTER.md for the public personal site.

## Pattern

Use **Portfolio Grid + Hero-Centric**, not FAQ/Documentation.

Section order: Hero (name/role) > Focus > Project grid > Experience > Skills > Education > Contact.

CTA: GitHub in the nav, hero, and footer.

## Style

**Dark Mode (OLED)** as the default, combined with **Minimalism & Swiss Style**.

- Dark first. No light-mode default.
- Grid, sharp corners (0px), single accent, no decorative gradients or shadows.
- Hover 200–250ms. Visible focus ring. `cursor: pointer` on all clickable elements.

## Typography

Keep MASTER pairing: JetBrains Mono (headings/labels) + IBM Plex Sans (body).

## Color

Keep MASTER dark tokens (code dark + run green).

Light theme is optional and uses the Portfolio/Personal light surfaces with a darker green (`#15803D`) so accent text stays ≥4.5:1.

## Motion

Subtle only. Content stays visible without JS. If motion is added, offset ≤16px and 300–400ms. Honor `prefers-reduced-motion`.
