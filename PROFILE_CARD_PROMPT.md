# Lovable Prompt — NEXAVERSE Profile Card

Copy everything below this line into Lovable:

---

Build a single standalone profile card component that renders as a PNG image at exactly 900x560 pixels.

## Style Reference
Match the "Neon Insight Cards" aesthetic exactly:
- Deep dark purple-black gradient background
- Frosted glass cards with subtle purple borders
- Purple neon glow effects at bottom center
- Clean Inter/sans-serif typography
- Minimal, premium feel

## Exact Specifications

### Background
- Full canvas: deep purple-black gradient (#020008 → #080020 → #0a0028 → #030010)
- Bottom-center radial glow: bright purple (rgba 100,30,255,0.5) fading to transparent, radius 400px
- Top-right subtle glow: rgba(120,50,255,0.1)

### Main Glass Card
- Centered with 32px margin on all sides
- Border radius: 20px
- Background: frosted glass (rgba 18,8,42 at 0.85 → rgba 12,4,30 at 0.75)
- Border: 1px solid rgba(120,60,220,0.2)
- Top glass highlight: rgba(160,100,255,0.08) fading to transparent
- Bottom accent glow: transparent to rgba(90,30,200,0.15)

### Top Section
- Brand label "NEXAVERSE" top-left: color rgba(160,110,255,0.45), font-weight 600, font-size 13px
- Horizontal divider below: gradient from rgba(120,60,220,0.3) to transparent, 1px

### Avatar (Left Side)
- Circle at center-left (x=165, y=240), radius 80px
- Purple gradient ring around avatar: 6px thick, gradient #a855f7 → #8b5cf6 → #7c3aed → #6d28d9
- 2px dark gap between ring and avatar image
- Outer purple glow: shadow blur 50px, color #7c3aed
- Avatar placeholder: dark purple circle (#1a0040) with white letter "A"

### Right Side Info
- Username: white, bold, 34px, Inter font
- Role badge below username: pill shape (border-radius 8px), gradient background rgba(120,40,255,0.3) → rgba(80,20,180,0.15), border 1px rgba(140,80,255,0.3), text color #c4b5fd, font-weight 700, font-size 11px

### Stat Cards (2 rows of 3)
Each card:
- Size: 160x72px, border-radius 14px
- Background: glass (rgba 18,8,42 at 0.85 → rgba 12,4,30 at 0.75)
- Border: 1px rgba(120,60,220,0.2)
- Top highlight: rgba(160,100,255,0.08)
- Bottom glow: transparent to rgba(100,40,255,0.1)
- Gap between cards: 14px

**Row 1:** Level "2", Rank "Newcomer", Credits "110"
**Row 2:** Reputation "100/100", Messages "21", Games "0W"

Label text: rgba(180,160,240,0.45), font-weight 500, 10px
Value text: white, bold, 22px

### XP Progress Bar
- Full width below stat cards
- Height: 28px, border-radius: 14px
- Label above: "EXPERIENCE" in rgba(180,160,240,0.4), font-weight 600, 10px
- Background: rgba(8,2,25,0.85), border 1px rgba(120,60,220,0.15)
- Fill: gradient #7c3aed → #8b5cf6 → #a855f7 → #7c3aed with glow (shadow 16px #7c3aed)
- Text centered: white bold 12px "XP 85 / 150"

### Footer
- "NEXAVERSE" bottom-right: rgba(140,100,220,0.2), font-weight 500, 11px

## Placeholder Content
- Username: "akhilthegrea.."
- Role: "PRESIDENT"
- Level: "2"
- Rank: "Newcomer"
- Credits: "110"
- Reputation: "100/100"
- Messages: "21"
- Games: "0W"
- XP: "85 / 150"

## Output
- Single PNG image, 900x560 pixels
- Must render the placeholder content exactly as specified above
- The image will be used as a Discord embed attachment

---

## After generating:
1. Download the PNG from Lovable
2. Upload it to the repo at `assets/profile-card-bg.png`
3. I'll modify the bot to overlay dynamic user data on top
