---
name: web-performance-optimization
description: Expert guidance on optimizing loading speed, Core Web Vitals, bundle size, and caching strategies for web applications.
---

# Web Performance Optimization

This skill provides a structured approach to measuring, identifying, and fixing performance bottlenecks.

## 1. Measurement & Checklist
### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTFB (Time to First Byte)**: < 600ms

### Image Strategy
- Convert to modern formats like **WebP** or **AVIF**.
- Use **lazy loading** for below-the-fold content.
- Always specify `width` and `height` to prevent layout shifts.
- Compress critical images to under 200KB.

### JavaScript & Bundle Size
- Keep gzipped bundle size under **200KB**.
- Implement **code splitting** with `next/dynamic`.
- Remove unused dependencies and barrel files.
- Use `async` or `defer` for third-party scripts.

## 2. Tools
- **Lighthouse**: For comprehensive audits.
- **webpack-bundle-analyzer**: To visualize bundle composition.
- **Chrome DevTools Performance**: For deep-dive profiling.

## 3. Best Practices
- ✅ **Do**: Inline critical CSS for faster initial paint.
- ✅ **Do**: Use CDN for asset delivery and caching.
- ❌ **Don't**: Block the main thread with heavy calculations; use Web Workers or `requestIdleCallback`.
- ❌ **Don't**: Load all third-party scripts on the initial page load.
