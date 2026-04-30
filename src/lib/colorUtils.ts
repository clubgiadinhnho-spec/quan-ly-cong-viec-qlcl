export const cleanModernColors = (el: HTMLElement) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as HTMLElement;
  while (node) {
    const style = window.getComputedStyle(node);
    const bg = style.backgroundColor;
    const tc = style.color;
    const bc = style.borderColor;
    
    // Check for modern color functions oklch and oklab and replace them with standard colors
    // html2canvas fails when it encounters these functions
    if (bg.includes('oklch') || bg.includes('oklab')) {
      node.style.backgroundColor = '#ffffff';
    }
    if (tc.includes('oklch') || tc.includes('oklab')) {
      node.style.color = '#111827';
    }
    if (bc.includes('oklch') || bc.includes('oklab')) {
      node.style.borderColor = '#e5e7eb';
    }
    node = walker.nextNode() as HTMLElement;
  }
};
