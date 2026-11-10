# DESIGN.md: Sweet Studio Photobooth Design System

> **Product Identity & Visual Direction for Dryu Photobooth (Sweet Studio)**  
> Scope: Touchscreen Kiosk Interface (`/`, `/share/[sessionId]`) & Operator Admin Console (`/admin`)

---

## 1. Brand Identity & Soul

- **Product Name:** Sweet Studio Photobooth
- **Tagline:** *a little moment, a lovely memory*
- **Audience:** Wedding guests, birthday party attendees, event visitors, and booth operators using a landscape touchscreen kiosk (iPad / 1080p Touch Monitor).
- **Character & Mood:** Warm, welcoming, tactile Korean self-photo studio aesthetic (inspired by physical photo strip booths like Chalkak Studio & Life Four Cuts). Playful without visual clutter; high-contrast legibility at arm's length under dimly lit event venues.
- **Identity Motif:** Miniature physical photostrip mockups (`LayoutMock`) with real slot geometry and the typographic star-bracket footer (`✦ SWEET STUDIO ✦`).

---

## 2. Liveliness Dials

`Dial: ENERGY 2 / RHYTHM 2 / MOTION 2`

- **ENERGY 2 (Balanced Studio Warmth):** Welcoming pastel surfaces with a single high-contrast rose accent on the primary shutter/start action.
- **RHYTHM 2 (Task-Driven Composition):** Each kiosk step has a distinct spatial layout tailored to its physical task:
  - *Welcome*: 3-strip angled showcase + single primary touch trigger.
  - *Preparation (Ready Screen)*: Asymmetric 60/40 split (Left: 3:2 live camera viewfinder + compact hardware bar; Right: 4-step frame/color/timer/caption configurator + full-width primary CTA, 100% above the fold).
  - *Capture*: Full-stage 3:2 camera viewport with top pose counter and bottom progress strip.
  - *Selection & Customization*: 3x2 photo grid with slot-order badges, followed by live SVG composite preview.
- **MOTION 2 (Purposeful State Transitions):** Directional view transitions (`0.3s–0.4s cubic-bezier(0.22, 1, 0.36, 1)`) when moving between kiosk steps, and a `0.12s` shutter flash when capturing a photo. Zero infinite background loops, zero endless pulsing buttons, and full `prefers-reduced-motion: reduce` support.

---

## 3. Color Palette (3 Core Colors + 1 Accent — Rule R-29)

| Role | Token / Name | Hex | Purpose (Written Reason — Rule R-31) |
| :--- | :--- | :--- | :--- |
| **Core 1 (Base Canvas)** | Warm Blush Ivory (`--color-background`) | `#FFF5F7` | Soft, flattering ambient light bounce onto guests' faces standing in front of the kiosk screen. |
| **Core 2 (Surface)** | Crisp Studio White (`--color-surface`) | `#FFFFFF` | Clean, solid card ground plane so photo thumbnails and frame previews render with true color accuracy. |
| **Core 3 (Secondary)** | Soft Lavender (`--color-secondary`) | `#DCD6F7` | Secondary grouping for active filter chips and step indicators without competing with the primary CTA. |
| **Primary Accent** | Sweet Rose (`--color-primary-strong`) | `#DB2777` / `#F472B6` | Reserved strictly for the single primary action per screen (Start Photo, Mulai Foto Sekarang, Print Sekarang) and active selection rings. |
| **Ink Primary** | Deep Slate Navy (`--color-text-primary`) | `#3F3D56` | High-contrast body and heading ink (> 8.5:1 contrast ratio on white/blush surfaces, exceeding WCAG AA). |
| **Ink Muted** | Muted Plum Grey (`--color-text-muted`) | `#5C5A72` | Secondary captions and helper labels (> 5.2:1 contrast ratio on white). |
| **Semantic Status** | Emerald (`#047857`) / Rose Error (`#B84C58`) | `#047857` / `#B84C58` | Real hardware connection states (Camera Connected, Printer Ready, Capture Error). |

---

## 4. Typography (Rule R-06)

- **Heading Font (`font-heading`):** `Fredoka` (Weights: 600, 700)
  - *Reason:* Rounded geometric letterforms echo friendly physical photobooth signage and remain legible from 1 meter away while standing.
- **Body & Control Font (`font-sans`):** `Quicksand` (Weights: 500, 600, 700)
  - *Reason:* Open counters and generous x-height keep small control labels, timer options, and instructions crisp on touchscreens.
- **Monospace Font (`font-mono`):** System monospace, used strictly for technical identifiers (`session_id`, IP addresses, port numbers) in the Operator Admin Console.

---

## 5. Border Radius, Elevation, & Glassmorphism Rules (Rules R-10, R-11, R-12)

1. **Border Radius Scale (Hierarchy by Shape — Rule R-11):**
   - **Camera Viewport & Photostrip Stage:** `rounded-[2rem]` (`32px`) — frames the 3:2 optical viewfinder.
   - **Section Cards & Modals:** `rounded-2xl` (`16px`) to `rounded-3xl` (`24px`) — structured container boundaries.
   - **Text Inputs & Secondary Buttons (`sm`, `md`, `lg`):** `rounded-xl` (`12px`) to `rounded-2xl` (`16px`) — clearly distinguishable from pills.
   - **Primary Hero CTA (`size="xl"`) & Color Swatch Dots:** `rounded-full` — reserved for the main touch trigger per screen so its silhouette stands out immediately.
2. **Elevation & Shadows (Rule R-12):**
   - Standard configuration cards sit flat (`border border-sweet-border`, no large drop shadow).
   - Elevation shadow (`shadow-sweet-strip` / `shadow-sweetLg`) is reserved strictly for:
     1. The 3:2 Live Camera Viewport / Photostrip Showcase.
     2. The Primary Hero CTA button on each screen.
3. **Glassmorphism Dose Cap (Rule R-10):**
   - Maximum **1–2 translucent elements** per screen: used *only* for the floating status overlays inside the live `<video>` camera frame (`CameraPreview.tsx`) so the guest's video feed remains visible underneath. All other cards, buttons, and panels use solid backgrounds.





---
name: antigravity-design-expert
description: Core UI/UX engineering skill for building highly interactive, spatial, weightless, and glassmorphism-based web interfaces using GSAP and 3D CSS.
risk: safe
source: community
date_added: "2026-03-07"
---

# Antigravity UI & Motion Design Expert

## When to Use
- You are building a highly interactive web interface with spatial depth, glassmorphism, and motion-heavy UI.
- The design should lean on GSAP, 3D CSS transforms, or React-based 3D presentation patterns.
- You need a strong visual direction for dashboards, landing pages, or immersive product surfaces rather than a conventional flat UI.

## 🎯 Role Overview

You are a world-class UI/UX Engineer specializing in "Antigravity Design." Your primary skill is building highly interactive, spatial, and weightless web interfaces. You excel at creating isometric grids, floating elements, glassmorphism, and buttery-smooth scroll animations.

## 🛠️ Preferred Tech Stack

When asked to build or generate UI components, default to the following stack unless instructed otherwise:

- **Framework:** React / Next.js
- **Styling:** Tailwind CSS (for layout and utility) + Custom CSS for complex 3D transforms
- **Animation:** GSAP (GreenSock) + ScrollTrigger for scroll-linked motion
- **3D Elements:** React Three Fiber (R3F) or CSS 3D Transforms (`rotateX`, `rotateY`, `perspective`)

## 📐 Design Principles (The "Antigravity" Vibe)

- **Weightlessness:** UI cards and elements should appear to float. Use layered, soft, diffused drop-shadows (e.g., `box-shadow: 0 20px 40px rgba(0,0,0,0.05)`).
- **Spatial Depth:** Utilize Z-axis layering. Backgrounds should feel deep, and foreground elements should pop out using CSS `perspective`.
- **Glassmorphism:** Use subtle translucency, background blur (`backdrop-filter: blur(12px)`), and semi-transparent borders to create a glassy, premium feel.
- **Isometric Snapping:** When building dashboards or card grids, use 3D CSS transforms to tilt them into an isometric perspective (e.g., `transform: rotateX(60deg) rotateZ(-45deg)`).

## 🎬 Motion & Animation Rules

- **Responsive feedback:** Keep focus, active, and validation feedback immediately visible. Animate decorative changes only when useful; reduced-motion users receive static states.
- **Native scrolling:** Preserve scrolling behavior and keyboard navigation. Use GSAP ScrollTrigger to make elements float into view from the Y-axis with slight rotation as the user scrolls.
- **Staggered Entrances:** When a grid of cards loads, they should not appear all at once. Stagger their entrance animations by `0.1s` so they drop in like dominoes.
- **Parallax:** Background elements should move slower than foreground elements on scroll to enhance the 3D illusion.

## 🚧 Execution Constraints

- Always write modular, reusable components.
- Ensure all animations are disabled for users with `prefers-reduced-motion: reduce`.
- Prioritize performance: Apply `will-change: transform` only around measured animations and remove it afterward; it does not guarantee GPU rendering. Do not animate expensive properties like `box-shadow` or `filter` continuously.

## Example

**User request:**

> Build a highly interactive web interface with spatial depth, glassmorphism, and motion-heavy UI.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.