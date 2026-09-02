# Fleet Inspection PWA — Design Brief

## Three initial directions

### Theme Name: Yard Signal
Very Brief Intro: A high-contrast operational interface inspired by loading-bay signage, safety tape, and early-morning dispatch boards. It feels direct, dependable, and built for fast decisions in the field.
Probability: 0.06

### Theme Name: Field Ledger
Very Brief Intro: A tactile editorial system blending industrial document design with warm paper tones, precise typography, and a calm evidence-first rhythm. It makes compliance feel clear rather than bureaucratic.
Probability: 0.08

### Theme Name: Night Route
Very Brief Intro: A dark, low-light control room aesthetic with electric route markers and luminous status signals. It emphasizes live monitoring and urgency for supervisors.
Probability: 0.04

## Chosen Direction: Field Ledger

### Design Movement
Contemporary editorial brutalism softened by field-document pragmatism: the visual language of a well-maintained inspection folder, translated into a responsive mobile control surface.

### Core Principles
1. **Evidence before decoration.** Inspection status, truck identity, and required actions must read before supporting context.
2. **Calm authority.** The interface should feel trusted and operational, not loud or game-like.
3. **Tactile records.** Use paper-like surfaces, ruled separators, numbered sections, stamps, and small proof marks as recurring motifs.
4. **Fast field ergonomics.** Large tap targets, strong contrast, short scan paths, and resilient states are more important than ornamental complexity.

### Color Philosophy
Use a warm bone background as the canvas, ink-black typography for certainty, deep spruce for trusted actions, and a single safety-orange signal for attention and incomplete work. The palette should feel like printed dispatch paperwork with one high-visibility marker, communicating that the app is a record of responsibility rather than another analytics dashboard.

### Layout Paradigm
Use an asymmetric split between a narrow operational rail and a broad evidence canvas on desktop, collapsing into a bottom action bar on mobile. Avoid a centered card stack. Let sections align to a strong left edge, while status markers and progress notches create a second rhythm. The driver checklist should feel like a sequence of physical inspection sheets, not a form wizard.

### Signature Elements
- A small rectangular "field note" label for context such as TODAY, ASSIGNED, or LAST SUBMITTED.
- Numbered checklist sections with ruled lines and compact proof marks.
- A high-visibility orange inspection stamp for pending, flagged, and completed states.

### Interaction Philosophy
Every tap confirms a real-world action. Buttons should have immediate press feedback, checkboxes should visibly complete a row, and destructive or incomplete states should never be hidden behind ambiguous color alone. The camera flow should make the next required shot obvious and show progress as evidence collected.

### Animation
Use restrained 160–240ms ease-out transitions for cards, drawers, tab changes, and completion states. Checklist rows may fade and shift minimally when completed. Use a single subtle stamp-in motion for inspection submission, never bouncing or decorative motion. Respect reduced motion and keep field workflows instant.

### Typography System
Use **DM Sans** for UI copy because it stays legible at small sizes and feels contemporary without becoming generic. Use **Roboto Slab** for section titles, truck identifiers, and evidence labels to evoke printed fleet records. Headings are sentence case with selective small caps for metadata; body copy is compact and high-contrast; numeric fleet identifiers use tabular figures wherever possible.

### Brand Essence
**Field-ready inspection records for fleets that cannot afford missing details.**
Personality adjectives: dependable, observant, composed.

### Brand Voice
Headlines are concise and operational. CTAs name the real action rather than promising vague progress. Microcopy is calm, specific, and blame-free.

Example lines:
- “Make the truck safe to leave the yard.”
- “Three checks need evidence before submission.”

### Wordmark & Logo
The mark is a bold, text-free symbol: a simplified inspection sheet with one folded corner and a centered check cut through by a short route line. It should work as a compact app icon and as a stamp-like visual anchor in the header.

### Signature Brand Color
**Signal Orange — #E9682A.** It is ownable because it behaves like a physical inspection marker: used sparingly for attention, never as a decorative gradient.

### Implementation Reminder
Every CSS, page, and component file should begin with a short comment naming the Field Ledger direction and the file-specific application of its principles. The interface must remain mobile-first, evidence-led, and usable in morning yard conditions.
