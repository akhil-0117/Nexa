# Lovable Prompt — NEXAVERSE Profile Card

Copy everything below this line into Lovable:

---

Create a single standalone profile card image at exactly 800x500 pixels with this exact design:

## BACKGROUND
- Deep purple-black gradient background: start #030010 at top, blend to #0a0028 at center, end at #050015
- Large purple radial glow centered at bottom-center of the image (rgba purple, radius ~350px)
- Subtle purple radial glow at top-right corner

## MAIN CARD
- One large rounded rectangle (border-radius 24px) centered with 30px padding on all sides
- Card background: dark glass effect (rgba 10,3,28 at 0.92 opacity fading to rgba 15,5,35 at 0.85)
- Purple gradient border (2px width): top-left rgba(140,80,255,0.45), center rgba(100,40,200,0.15), bottom-right rgba(140,80,255,0.3)
- Glass highlight at top: linear gradient from rgba(160,100,255,0.06) to transparent, covering top 80px
- Bottom accent glow: linear gradient from transparent to rgba(140,50,255,0.1) at bottom 120px

## CONTENT LAYOUT (left to right)

### Left Side: Avatar
- Avatar circle at position (150, 250) with radius 70px
- Purple gradient ring around avatar (6px thick): gradient from #a855f7 to #7c3aed to #6d28d9
- 2px dark gap between ring and avatar image
- Purple glow behind the ring (shadow blur 40px, color #8b5cf6)

### Right Side: Info (starting at x=280)
1. **Brand label** "NEXAVERSE" at top: rgba(160,100,255,0.5), font 600 weight 14px
2. **Username** below: white, bold, 32px
3. **Role badge** below username: small pill/rounded-rect (border-radius 6px), background rgba(120,0,255,0.25), border 1px rgba(160,100,255,0.35), text #c4b5fd bold 11px, padding 12px horizontal
4. **Divider line** below role: gradient from rgba(130,60,255,0.3) to transparent, 1px

### Stat Cards (2 rows of 3 cards each)
- Each card: 150x65px, border-radius 12px
- Card background: glass effect (rgba 12,4,30 at 0.7 to rgba 18,6,40 at 0.5)
- Card border: 1px rgba(130,60,255,0.15)
- Bottom glow on each card: transparent to rgba(120,40,255,0.08)
- Label text: rgba(196,181,253,0.4), font 500 10px, positioned 12px from top-left
- Value text: white, bold, 20px, positioned 12px from top-left below label
- Gap between cards: 12px

**Row 1 labels:** Level, Rank, Credits
**Row 2 labels:** Reputation, Messages, Games

### XP Progress Bar (below stat cards)
- Full width of right side content area
- Height: 24px, border-radius 12px
- Background: rgba(8,2,25,0.8) with 1px border rgba(130,60,255,0.12)
- Fill: purple gradient #7c3aed to #6d28d9 to #8b5cf6, with glow (shadow blur 12px #7c3aed)
- Text centered in bar: white bold 12px "XP 85 / 150"
- Label above bar: "EXPERIENCE" in rgba(196,181,253,0.35) font 500 10px

### Footer
- "NEXAVERSE" text at bottom-right of card: rgba(160,100,255,0.2), font 500 11px

## FONT
- Use Inter font or similar clean sans-serif

## IMPORTANT
- This is a STATIC background image that will have text overlaid dynamically
- The placeholder text in the image should be: username "akhilthegrea..", role "PRESIDENT", level "2", rank "Newcomer", credits "110", reputation "100/100", messages "21", games "0W", XP "85 / 150"
- The avatar should be a placeholder circle (dark purple #1a0040 with a white "?" or similar)
- Output as PNG
- Must look exactly like a premium glassmorphism card with purple neon accents

---

## After generating:
1. Download the PNG from Lovable
2. Upload it to the repo as `assets/profile-card-bg.png`
3. I will modify the bot to overlay dynamic user data on top of this template
