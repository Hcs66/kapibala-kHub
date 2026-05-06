---
name: Intelligence Layer
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#313ba4'
  on-tertiary: '#ffffff'
  tertiary-container: '#4a55be'
  on-tertiary-container: '#d7d8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bdc2ff'
  on-tertiary-fixed: '#000767'
  on-tertiary-fixed-variant: '#2f3aa3'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  h1:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  mono-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system is built to convey a sense of calm, analytical power. The visual direction centers on "The Intelligence Layer"—a transparent yet tangible interface that sits atop complex data to provide clarity. 

The style utilizes a refined **Modern Minimalism** foundation enhanced by **Glassmorphism**. By using translucent layers and subtle backdrop blurs, the UI suggests depth and a high-fidelity "tech-forward" environment. The aesthetic aims to reduce cognitive load for sales professionals, replacing dense spreadsheets with breathable, insight-driven layouts. The emotional response should be one of complete trust in the data and a feeling of effortless productivity.

## Colors

The color palette is anchored by a sophisticated pairing of Indigo and Slate. The primary action color is an Indigo gradient, which provides a vibrant, "active" feel against the muted background. 

The background uses an off-white, slightly tinted slate-gray to eliminate the harshness of pure white (#FFFFFF), specifically designed to reduce eye strain during long-form data analysis. AI-powered insights are distinguished by soft indigo glows and gradient borders, creating a clear visual distinction between standard CRM data and machine-generated intelligence.

## Typography

This design system utilizes **Inter** for all interface levels to maintain a systematic, utilitarian aesthetic that feels corporate yet contemporary. 

The hierarchy is established through weight and generous line-heights (1.6 for body text) to ensure readability in data-dense views. Headlines use tighter tracking and heavier weights to command attention, while labels utilize a slightly increased letter-spacing to ensure legibility at smaller sizes. For AI-generated summaries, use "Body-LG" to create a distinct editorial feel.

## Layout & Spacing

This design system employs a **12-column fluid grid** for main content areas, allowing the intelligence dashboard to scale across various display sizes. 

Spacing follows a strict 4px/8px baseline rhythm. Margins are intentionally generous (32px) to support the minimalist brand promise and prevent the UI from feeling cluttered. Content blocks and cards should utilize a consistent "MD" (16px) or "LG" (24px) padding internally to maintain a professional, airy composition.

## Elevation & Depth

Depth is achieved through a combination of **Glassmorphism** and **Ambient Shadows**. 

1.  **Surface Tiers:** The base layer is the off-white tinted background. The secondary layer consists of white cards with very soft, diffused shadows (0px 4px 20px rgba(0,0,0,0.04)).
2.  **The Glass Effect:** Navigation sidebars and top headers use a backdrop-blur (12px to 20px) with a semi-transparent white fill (opacity 70-80%). This creates a "frosted" look that allows the background colors to peak through, enhancing the tech-forward feel.
3.  **Active Depth:** When an AI insight card is focused, it receives a subtle indigo outer glow rather than a heavy shadow, signaling "Intelligence" rather than just physical elevation.

## Shapes

The shape language is defined by **Subtle Roundedness**. 

All standard components (inputs, buttons, cards) utilize a base radius of 8px (0.5rem). For larger containers or distinct "Insight Modules," a larger radius of 16px (1rem) is used to soften the layout. This balance of geometric precision and soft corners communicates a professional yet approachable personality. Avoid fully circular "pill" shapes except for status tags and badges.

## Components

-   **Buttons:** Primary buttons use the Indigo gradient with white text. Secondary buttons are slate-tinted or ghost-style with a subtle 1px border. All buttons have an 8px radius.
-   **Cards:** Use a white background with a 1px border (#E2E8F0) and the "soft" ambient shadow. AI-insight cards feature a 2px gradient border (Indigo to Slate).
-   **Input Fields:** Minimalist style with a 1px slate-gray border. On focus, the border transitions to Indigo with a soft 4px indigo glow.
-   **Glass Headers:** Use `backdrop-filter: blur(16px)` with a thin bottom border to define the edge against the content area.
-   **AI Insights Section:** These specific containers should feature a subtle background tint (5% Indigo) and a custom "sparkle" icon to denote machine-generated content.
-   **Chips/Badges:** Small, 4px rounded labels with low-saturation background tints. Use bold mono-labels for technical data points (e.g., Lead Score).
-   **Lists:** High-density lists should include generous vertical padding and a subtle divider line (#F1F5F9). Row hover states should use a very light indigo tint (#EEF2FF).