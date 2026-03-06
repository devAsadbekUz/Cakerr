export const flyToCart = (e: React.MouseEvent, imageSrc: string) => {
    // 1. Find the target (cart icon)
    const cartIcon = document.getElementById('cart-nav-icon');
    if (!cartIcon) return;

    // 2. Get coordinates
    const startX = e.clientX;
    const startY = e.clientY;

    const cartRect = cartIcon.getBoundingClientRect();
    const endX = cartRect.left + cartRect.width / 2;
    const endY = cartRect.top + cartRect.height / 2;

    // 3. Create the flying element — bigger and bolder
    const flightEl = document.createElement('div');
    flightEl.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: 80px;
        height: 80px;
        border-radius: 16px;
        background-image: url(${imageSrc});
        background-size: cover;
        background-position: center;
        z-index: 9999;
        transform: translate(-50%, -50%) scale(1);
        box-shadow: 0 8px 32px rgba(233, 30, 99, 0.4), 0 0 0 3px rgba(233, 30, 99, 0.3);
        pointer-events: none;
        opacity: 1;
    `;

    // Add border for images that haven't loaded or are empty
    if (!imageSrc) {
        flightEl.style.background = 'linear-gradient(135deg, #FCE4EC, #F8BBD0)';
        flightEl.textContent = '🎂';
        flightEl.style.display = 'flex';
        flightEl.style.alignItems = 'center';
        flightEl.style.justifyContent = 'center';
        flightEl.style.fontSize = '32px';
    }

    document.body.appendChild(flightEl);

    // 4. Trigger reflow
    flightEl.getBoundingClientRect();

    // 5. Phase 1: Pop up slightly (scale up + lift)
    flightEl.style.transition = 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
    flightEl.style.transform = 'translate(-50%, -50%) scale(1.2)';

    // 6. Phase 2: Fly in an arc to the cart
    setTimeout(() => {
        flightEl.style.transition = 'all 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        flightEl.style.left = `${endX}px`;
        flightEl.style.top = `${endY}px`;
        flightEl.style.transform = 'translate(-50%, -50%) scale(0.25) rotate(20deg)';
        flightEl.style.opacity = '0.6';
        flightEl.style.borderRadius = '50%';
        flightEl.style.boxShadow = '0 2px 8px rgba(233, 30, 99, 0.3)';
    }, 150);

    // 7. Bounce the cart icon when the item arrives
    setTimeout(() => {
        cartIcon.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        cartIcon.style.transform = 'scale(1.3)';
        setTimeout(() => {
            cartIcon.style.transform = 'scale(1)';
        }, 300);
    }, 600);

    // 8. Clean up
    setTimeout(() => {
        if (document.body.contains(flightEl)) {
            document.body.removeChild(flightEl);
        }
    }, 750);
};
