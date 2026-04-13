# Design System Specification: Editorial Organicism

## 1. Overview & Creative North Star
**The Creative North Star: "The Verdant Curator"**
This design system moves away from the rigid, boxed-in nature of typical SaaS platforms to embrace a philosophy of "Editorial Organicism." For a review management platform, trust is built through clarity and breathability. We achieve this by using the vibrant green of the logo as a living accent against a canvas of light, airy "paper-like" surfaces.

Rather than a standard grid, the layout leverages **intentional asymmetry**. Primary content is anchored with bold, editorial-scale typography, while supporting data "floats" in nested containers. We prioritize the flow of information over the containment of it, using wide margins and overlapping elements to create a bespoke, premium feel that reflects the authority of professional feedback.

---

## 2. Colors
The palette is rooted in a lush, botanical green hierarchy that feels energetic yet disciplined.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** To define the architecture of a page, use background color shifts only. For example, a dashboard sidebar should use `surface-container-low` (#edf6e8) against a main `background` (#f3fcee) content area. Physical lines clutter the mind; tonal shifts guide the eye.

### Surface Hierarchy & Nesting
Treat the UI as stacked sheets of fine, semi-translucent paper.
- **Base Layer:** `surface` (#f3fcee)
- **Content Sections:** `surface-container-low` (#edf6e8)
- **Interactive Cards:** `surface-container-lowest` (#ffffff)
- **Elevated Overlays:** `surface-bright` (#f3fcee) with Glassmorphism.

### The "Glass & Gradient" Rule
To avoid a "flat" template look, use **Glassmorphism** for navigation bars and floating action panels. Apply `surface` colors at 80% opacity with a `24px` backdrop-blur. 
**Signature Textures:** Use subtle linear gradients for primary CTAs, transitioning from `primary` (#006e2a) to `primary_container` (#00c853) at a 135-degree angle. This adds a "jewel-toned" depth that feels high-end and custom.

---

## 3. Typography
We utilize a pairing of **Manrope** for high-impact editorial moments and **Inter** for functional utility.

- **Display & Headlines (Manrope):** These are the "voice" of the brand. Use `display-lg` (3.5rem) for hero statements with tight letter-spacing (-0.02em) to create an authoritative, magazine-style header.
- **Titles & Body (Inter):** Inter provides a neutral, high-legibility counterweight. Use `title-md` (1.125rem) for review headers to ensure the user's voice is the focal point.
- **Labels (Inter):** Small-scale metadata (`label-sm`) should use `on_surface_variant` (#3c4a3c) to maintain hierarchy without competing with the primary content.

---

## 4. Elevation & Depth
Depth is a tool for storytelling, not just decoration.

- **Tonal Layering:** Avoid shadows for static content. Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#edf6e8) background to create a "Natural Lift."
- **Ambient Shadows:** For floating elements (Modals/Popovers), use a "Botanical Shadow": `color: hsla(120, 18%, 10%, 0.06)`, `blur: 40px`, `y-offset: 20px`. The hint of green in the shadow makes the element feel like it belongs to the environment.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` (#bbcbb8) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `rounded-md` (0.75rem), white text. No shadow on rest; subtle `0.5rem` lift on hover.
- **Secondary:** `surface-container-highest` fill with `on_primary_container` text. Subtle and sophisticated.
- **Tertiary:** Pure text with an underline that appears on hover, using `primary_fixed` (#69ff87) as a 4px thick "marker" stroke.

### Input Fields
Soft, `surface-container-lowest` fills. Forgo the traditional bottom border. Use a 2px `primary` left-border only when the field is focused to create a "sidebar" highlight effect.

### Cards & Lists (The "No-Divider" Mandate)
**Never use horizontal lines to separate reviews.** Instead:
- Increase vertical whitespace (`2rem` minimum).
- Use alternating background tones (`surface` vs `surface-container-low`).
- Group metadata using `secondary_container` (#a7f1ab) chips with 0.5rem rounding.

### Review Sentiment Chips
Use `primary_fixed` (#69ff87) for positive reviews and `tertiary_fixed` (#ffdad6) for flagged content. The high luminance of these tokens provides an "airy" feel even for critical data.

---

## 6. Do's and Don'ts

### Do:
- **Do** use "Negative Space" as a functional element. If a screen feels crowded, increase the padding to the next tier in the `roundedness` scale.
- **Do** use `primary_fixed_dim` (#3ce36a) for subtle background glows behind featured testimonials to draw the eye.
- **Do** align large typography to an asymmetrical grid (e.g., 60/40 split) to maintain the editorial feel.

### Don't:
- **Don't** use 100% black text. Always use `on_surface` (#151e15) to keep the contrast high but the tone organic.
- **Don't** use "Drop Shadows" on cards. Stick to tonal layering unless the element is literally floating over the UI.
- **Don't** use standard 1px grey dividers. They break the "airy" flow and make the platform feel like a legacy spreadsheet.