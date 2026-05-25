export const oklchToRgbOrHex = (colorStr: string): string => {
  if (!colorStr || (!colorStr.includes('oklch') && !colorStr.includes('oklab'))) {
    return colorStr;
  }
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#ffffff';
    
    // Set to a sentinel value first
    ctx.fillStyle = '#123456'; 
    ctx.fillStyle = colorStr;
    const resolved = ctx.fillStyle;
    
    // If it is not the sentinel value, then the browser successfully parsed the color string!
    if (resolved !== '#123456') {
      return resolved;
    }
  } catch (e) {
    console.warn("Failed parsing color via canvas", e);
  }
  
  // Fallbacks if canvas resolver fails
  if (colorStr.includes(' 0 ') || colorStr.includes(' 0%')) {
    if (colorStr.includes(' 1 ') || colorStr.includes(' 100%') || colorStr.includes('0.9') || colorStr.includes('90%')) {
      return '#ffffff';
    }
    return '#111827';
  }
  
  return '#ffffff';
};

export const cleanModernColors = (el: HTMLElement) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as HTMLElement;
  while (node) {
    const style = window.getComputedStyle(node);
    const bg = style.backgroundColor;
    const tc = style.color;
    const bc = style.borderColor;
    
    // Check for modern color functions oklch and oklab and dynamically replace with standard colors
    // html2canvas fails when it encounters these functions
    if (bg && (bg.includes('oklch') || bg.includes('oklab'))) {
      node.style.backgroundColor = oklchToRgbOrHex(bg);
    }
    if (tc && (tc.includes('oklch') || tc.includes('oklab'))) {
      node.style.color = oklchToRgbOrHex(tc);
    }
    if (bc && (bc.includes('oklch') || bc.includes('oklab'))) {
      node.style.borderColor = oklchToRgbOrHex(bc);
    }
    node = walker.nextNode() as HTMLElement;
  }
};
