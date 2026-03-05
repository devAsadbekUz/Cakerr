export const flyToCart = (e: React.MouseEvent, imageSrc: string) => {
    // 1. Find the target (cart icon)
    const cartIcon = document.getElementById('cart-nav-icon');
    if (!cartIcon) return;

    // 2. Get coordinates
    // Get the click position from the event
    const startX = e.clientX;
    const startY = e.clientY;

    // Get the cart icon position
    const cartRect = cartIcon.getBoundingClientRect();
    const endX = cartRect.left + cartRect.width / 2;
    const endY = cartRect.top + cartRect.height / 2;

    // 3. Create the flying element
    const flightEl = document.createElement('div');
    flightEl.style.position = 'fixed';
    flightEl.style.left = `${startX}px`;
    flightEl.style.top = `${startY}px`;
    flightEl.style.width = '50px';
    flightEl.style.height = '50px';
    flightEl.style.borderRadius = '25px';
    flightEl.style.backgroundImage = `url(${imageSrc})`;
    flightEl.style.backgroundSize = 'cover';
    flightEl.style.backgroundPosition = 'center';
    flightEl.style.zIndex = '9999';
    flightEl.style.transform = 'translate(-50%, -50%) scale(1)';
    flightEl.style.transition = 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'; // smooth curve
    flightEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    flightEl.style.pointerEvents = 'none';

    document.body.appendChild(flightEl);

    // 4. Trigger reflow
    flightEl.getBoundingClientRect();

    // 5. Apply the flight animation styles
    requestAnimationFrame(() => {
        flightEl.style.left = `${endX}px`;
        flightEl.style.top = `${endY}px`;
        flightEl.style.transform = 'translate(-50%, -50%) scale(0.2)';
        flightEl.style.opacity = '0.5';
    });

    // 6. Clean up after animation finishes
    setTimeout(() => {
        if (document.body.contains(flightEl)) {
            document.body.removeChild(flightEl);
        }
    }, 600);
};
