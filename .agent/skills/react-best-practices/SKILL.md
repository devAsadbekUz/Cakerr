---
name: react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering. Use this when writing, reviewing, or refactoring React/Next.js code for optimal performance.
---

# Vercel React Best Practices

This guide focuses on performance, scalability, and maintainability for modern React and Next.js applications.

## 1. Eliminating Waterfalls (CRITICAL)
- **async-defer-await**: Move `await` into specific branches where the data is actually needed instead of top-level.
- **async-parallel**: Use `Promise.all()` for independent data fetching operations.
- **async-suspense-boundaries**: Use React Suspense to stream content and avoid blocking the entire page.

## 2. Bundle Size Optimization (CRITICAL)
- **bundle-barrel-imports**: Import components directly from their files instead of using heavy barrel files (`index.ts`).
- **bundle-dynamic-imports**: Use `next/dynamic` for heavy components that aren't needed on initial load.
- **bundle-defer-third-party**: Load analytics, chat widgets, and logging scripts after hydration.

## 3. Server-Side Performance (HIGH)
- **server-cache-react**: Use `React.cache()` to deduplicate fetches within a single request.
- **server-serialization**: Minimize the amount of data passed from Server Components to Client Components.
- **server-after-nonblocking**: Use the `after()` function for tasks that don't need to block the response (logging, webhooks).

## 4. Re-render Optimization (MEDIUM)
- **rerender-memo**: Use `React.memo`, `useMemo`, and `useCallback` strategically for expensive work.
- **rerender-derived-state**: Compute simple state on the fly instead of storing it in `useState`.
- **rerender-lazy-state-init**: Use functional initialization for `useState` with expensive calculations: `useState(() => initValue)`.

## 5. Rendering Performance (MEDIUM)
- **rendering-content-visibility**: Use `content-visibility: auto` to skip rendering of off-screen content.
- **rendering-conditional-render**: Use ternary operators `? :` instead of `&&` to avoid accidental `0` or `false` rendering.

## 6. JavaScript Performance (LOW-MEDIUM)
- **js-set-map-lookups**: Use `Set` and `Map` for O(1) lookups instead of searching arrays.
- **js-early-exit**: Use early returns to reduce cognitive load and avoid unnecessary processing.
- **js-index-maps**: Pre-calculate Maps for repeated lookups in loops.

## Anti-Patterns to Flag
- `transition: all` in CSS.
- `onPaste` with `preventDefault`.
- Images without explicit dimensions.
- Large arrays `.map()` without virtualization.
- `autoFocus` without clear justification.
