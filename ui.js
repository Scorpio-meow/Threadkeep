function setupAmbientLight() {
  const root = document.documentElement;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerTarget = null;
  const update = () => {
    frame = 0;
    root.style.setProperty('--pointer-x', `${pointerX}px`);
    root.style.setProperty('--pointer-y', `${pointerY}px`);
    root.dataset.pointer = 'active';
    const card = pointerTarget instanceof Element ? pointerTarget.closest('.article-card') : null;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--spot-x', `${pointerX - rect.left}px`);
    card.style.setProperty('--spot-y', `${pointerY - rect.top}px`);
  };
  document.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerTarget = event.target;
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true });
  root.addEventListener('mouseleave', () => {
    delete root.dataset.pointer;
  });
}
const MENU_GAP_PX = 6;
const MENU_VIEWPORT_MARGIN_PX = 8;
function placeMenu(menu, trigger) {
  const rect = trigger.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const maxLeft = window.innerWidth - width - MENU_VIEWPORT_MARGIN_PX;
  const preferredLeft = menu.dataset.align === 'start' ? rect.left : rect.right - width;
  const left = Math.max(MENU_VIEWPORT_MARGIN_PX, Math.min(preferredLeft, maxLeft));
  const below = rect.bottom + MENU_GAP_PX;
  const above = rect.top - MENU_GAP_PX - height;
  const fitsBelow = below + height <= window.innerHeight - MENU_VIEWPORT_MARGIN_PX;
  const top = fitsBelow || above < MENU_VIEWPORT_MARGIN_PX ? below : above;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}
function setupMenus() {
  const menus = Array.from(document.querySelectorAll('.menu[popover]'));
  menus.forEach((menu) => {
    menu.addEventListener('toggle', (event) => {
      if (event.newState !== 'open') return;
      const trigger = document.querySelector(`[popovertarget="${CSS.escape(menu.id)}"]`);
      if (trigger) placeMenu(menu, trigger);
    });
    menu.addEventListener('click', (event) => {
      if (event.target.closest('button.menu-item')) menu.hidePopover();
    });
  });
  window.addEventListener('resize', () => {
    menus.forEach((menu) => {
      if (menu.matches(':popover-open')) menu.hidePopover();
    });
  });
}