// wcag-checks.js - Comprehensive WCAG 2.1 accessibility checks
(function () {
  'use strict';

  const WCAGChecker = {
    // === Utility ===
    getXPath(element) {
      if (element.id) return `//*[@id="${element.id}"]`;
      if (element === document.body) return '/html/body';
      let ix = 0;
      const siblings = element.parentNode.childNodes;
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
          return this.getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
      }
    },

    getLuminance(rgb) {
      const sRGB = rgb.map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    },

    getContrastRatio(color1, color2) {
      const l1 = this.getLuminance(color1);
      const l2 = this.getLuminance(color2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    },

    parseColor(colorStr) {
      const match = colorStr.match(/\d+/g);
      return match ? match.slice(0, 3).map(Number) : null;
    },

    // === 1.1.1 Alt Text ===
    checkAltText() {
      const issues = [];
      document.querySelectorAll('img').forEach((img, index) => {
        if (!img.hasAttribute('alt') || img.alt.trim() === '') {
          issues.push({
            type: 'alt-text',
            description: `Image #${index + 1} missing or empty alt text`,
            element: img.outerHTML,
            xpath: this.getXPath(img),
            severity: 'High',
            guideline: { code: '1.1.1', url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html' },
            // AI Suggestion ke liye data
            src: img.src, 
            title: img.title || '',
            ariaLabel: img.getAttribute('aria-label') || ''
          });
        }
      });
      return issues;
    },

    // === 1.4.2 Audio Control ===
    checkAudioControl() {
      const issues = [];
      document.querySelectorAll('audio, video').forEach((media, index) => {
        if (media.hasAttribute('autoplay') && !media.hasAttribute('controls')) {
          issues.push({
            type: 'audio-control',
            description: `Auto-playing media #${index + 1} lacks user controls`,
            element: media.outerHTML,
            xpath: this.getXPath(media),
            severity: 'High',
            guideline: { code: '1.4.2', url: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-and-video-content.html' }
          });
        }
      });
      return issues;
    },

    // === 1.4.3 Contrast (Minimum) ===
    checkColorContrast() {
      const issues = [];
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, li, button, label, td, th');
      let checkedCount = 0;
      textElements.forEach((el, index) => {
        if (checkedCount >= 50 || !el.textContent.trim()) return;
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = style.fontWeight;
        const isLargeText = fontSize >= 24 || (fontSize >= 18 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
        const minRatio = isLargeText ? 3.0 : 4.5;
        if (bg && color && bg !== 'rgba(0, 0, 0, 0)') {
          const bgColor = this.parseColor(bg);
          const textColor = this.parseColor(color);
          if (bgColor && textColor) {
            const ratio = this.getContrastRatio(bgColor, textColor);
            if (ratio < minRatio) {
              issues.push({
                type: 'contrast-minimum',
                description: `Text contrast ratio: ${ratio.toFixed(2)}:1 (minimum: ${minRatio}:1)`,
                element: el.outerHTML.substring(0, 100) + '...',
                xpath: this.getXPath(el),
                severity: 'High',
                guideline: { code: '1.4.3', url: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html' },
                // AI Suggestion ke liye data
                fgColor: color,
                bgColor: bg
              });
              checkedCount++;
            }
          }
        }
      });
      return issues;
    },

    // === 1.4.4 Text Resize (heuristic) ===
    checkTextResize() {
      const issues = [];
      document.querySelectorAll('p, span, div').forEach((el, i) => {
        const style = window.getComputedStyle(el);
        if (parseFloat(style.fontSize) < 10) {
          issues.push({
            type: 'text-resize',
            description: `Text #${i + 1} may not remain readable when zoomed (font too small: ${style.fontSize})`,
            element: el.outerHTML.substring(0, 80) + '...',
            xpath: this.getXPath(el),
            severity: 'Medium',
            guideline: { code: '1.4.4', url: 'https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html' }
          });
        }
      });
      return issues;
    },

    // === 1.4.5 Images of Text (basic heuristic) ===
    checkImagesOfText() {
      const issues = [];
      document.querySelectorAll('img').forEach((img, i) => {
        const src = img.src || '';
        if (/text|heading|title|label/i.test(src)) {
          issues.push({
            type: 'images-of-text',
            description: `Image #${i + 1} may contain text (src: ${src})`,
            element: img.outerHTML,
            xpath: this.getXPath(img),
            severity: 'Medium',
            guideline: { code: '1.4.5', url: 'https://www.w3.org/WAI/WCAG21/Understanding/images-of-text.html' }
          });
        }
      });
      return issues;
    },

    // === 1.4.10 Reflow (basic horizontal scroll detection) ===
    checkReflow() {
      const issues = [];
      if (document.scrollingElement.scrollWidth > window.innerWidth * 1.1) {
        issues.push({
          type: 'reflow',
          description: 'Page requires horizontal scrolling — may fail reflow requirements',
          element: '<body>',
          xpath: '/html/body',
          severity: 'High',
          guideline: { code: '1.4.10', url: 'https://www.w3.org/WAI/WCAG21/Understanding/reflow.html' }
        });
      }
      return issues;
    },

    // === 1.4.11 Non-text Contrast ===
    checkNonTextContrast() {
      const issues = [];
      document.querySelectorAll('button, input, select').forEach((el, i) => {
        const style = window.getComputedStyle(el);
        if (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.color === style.backgroundColor) {
          issues.push({
            type: 'non-text-contrast',
            description: `Control #${i + 1} may lack sufficient contrast with background`,
            element: el.outerHTML,
            xpath: this.getXPath(el),
            severity: 'Medium',
            guideline: { code: '1.4.11', url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html'}
          });
        }
      });
      return issues;
    },

    // === 2.1.1 Keyboard Access ===
    checkKeyboardAccess() {
      const issues = [];
      const interactive = document.querySelectorAll('button, a, input, select, textarea, [onclick], [role="button"], [role="link"], [role="menuitem"], [tabindex]');
      interactive.forEach((el, index) => {
        const tabIndex = el.getAttribute('tabindex');
        if (tabIndex && parseInt(tabIndex) < 0 && !el.hasAttribute('aria-hidden')) {
          issues.push({
            type: 'keyboard-access',
            description: `Interactive element #${index + 1} has negative tabindex, inaccessible via keyboard`,
            element: el.outerHTML,
            xpath: this.getXPath(el),
            severity: 'High',
            guideline: { code: '2.1.1', url: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html' }
          });
        }
      });
      return issues;
    },

    // === 2.1.2 No Keyboard Trap (basic heuristic) ===
    checkNoKeyboardTrap() {
      const issues = [];
      document.querySelectorAll('iframe').forEach((frame, i) => {
        if (!frame.hasAttribute('title')) {
          issues.push({
            type: 'no-keyboard-trap',
            description: `Iframe #${i + 1} may cause keyboard trap (missing title/exit info)`,
            element: frame.outerHTML,
            xpath: this.getXPath(frame),
            severity: 'High',
            guideline: { code: '2.1.2', url: 'https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html'}
          });
        }
      });
      return issues;
    },

    // === 2.4.3 Focus Order ===
    checkFocusOrder() {
      const issues = [];
      document.querySelectorAll('[tabindex]').forEach((el, i) => {
        const tabIndex = parseInt(el.getAttribute('tabindex'));
        if (tabIndex > 0) {
          issues.push({
            type: 'focus-order',
            description: `Element #${i + 1} has positive tabindex (${tabIndex}), may disrupt logical focus order`,
            element: el.outerHTML,
            xpath: this.getXPath(el),
            severity: 'Medium',
            guideline: { code: '2.4.3', url: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html'}
          });
        }
      });
      return issues;
    },

    // === 2.4.7 Focus Visible (basic heuristic) ===
    checkFocusVisible() {
      const issues = [];
      const style = document.createElement('style');
      style.innerHTML = '*:focus { outline: none !important; }';
      document.head.appendChild(style);
      const disabledFocus = window.getComputedStyle(document.activeElement).outlineStyle === 'none';
      style.remove();
      if (disabledFocus) {
        issues.push({
          type: 'focus-visible',
          description: 'Page may suppress visible focus indicators with CSS',
          element: '<style>*:focus { outline: none }</style>',
          xpath: '/html/head/style',
          severity: 'High',
          guideline: { code: '2.4.7', url: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html' }
        });
      }
      return issues;
    },

    // === 2.4.4 Link Purpose ===
    // ***** YAHAN CHANGES HAIN *****
    checkLinkPurpose() {
      const issues = [];
      document.querySelectorAll('a').forEach((link, index) => {
        const text = link.textContent.trim();
        const ariaLabel = link.getAttribute('aria-label');
        
        // Aas-paas ki heading dhoondho (AI ke liye)
        const headingEl = link.closest('h1, h2, h3, h4, h5, h6');
        const headingText = (headingEl || {}).textContent || '';

        if (!text && !ariaLabel) {
          issues.push({
            type: 'link-purpose',
            description: `Link #${index + 1} has no accessible name`,
            element: link.outerHTML,
            xpath: this.getXPath(link),
            severity: 'Medium',
            guideline: { code: '2.4.4', url: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html' },
            text: '', // AI ke liye add kiya
            heading: headingText // AI ke liye add kiya
          });
        } else if (['click here', 'read more', 'more', 'link'].includes(text.toLowerCase())) {
          issues.push({
            type: 'link-purpose',
            description: `Link #${index + 1} has generic text: "${text}"`,
            element: link.outerHTML,
            xpath: this.getXPath(link),
            severity: 'Medium',
            guideline: { code: '2.4.4', url: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html' },
            text: text, // AI ke liye add kiya
            heading: headingText // AI ke liye add kiya
          });
        }
      });
      return issues;
    },
    // ***** END CHANGES *****

    // === 2.4.1 Skip Link Presence ===
    checkSkipLink() {
      const issues = [];
      const skipLink = document.querySelector('a[href^="#"][href*="main"], a.skip-link');
      if (!skipLink) {
        issues.push({
          type: 'skip-link',
          description: 'No skip link found (e.g., "Skip to main content")',
          element: '<body>',
          xpath: '/html/body',
          severity: 'Medium',
          guideline: { code: '2.4.1', url: 'https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html' }
        });
      }
      return issues;
    },

    // === 1.3.1 Headings Order ===
    checkHeadingOrder() {
      const issues = [];
      const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
      const levels = headings.map(h => parseInt(h.tagName[1]));
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i - 1] + 1) {
          issues.push({
            type: 'heading-order',
            description: `Heading level jumps from H${levels[i - 1]} to H${levels[i]}`,
            element: headings[i].outerHTML,
            xpath: this.getXPath(headings[i]),
            severity: 'Medium',
            guideline: { code: '1.3.1', url: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html' }
          });
        }
      }
      return issues;
    },

    // === 3.1.1 Language of Page ===
    checkPageLanguage() {
      const issues = [];
      const html = document.documentElement;
      if (!html.hasAttribute('lang')) {
        issues.push({
          type: 'page-language',
          description: 'HTML element is missing lang attribute',
          element: html.outerHTML,
          xpath: '/html',
          severity: 'Medium',
          guideline: { code: '3.1.1', url: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html' }
        });
      }
      return issues;
    },

    // === 3.1.2 Language of Parts ===
    checkLanguageOfParts() {
      const issues = [];
      document.querySelectorAll('[lang]').forEach((el, i) => {
        if (el.getAttribute('lang').length < 2) {
          issues.push({
            type: 'language-of-parts',
            description: `Element #${i + 1} has suspicious lang attribute: "${el.getAttribute('lang')}"`,
            element: el.outerHTML,
            xpath: this.getXPath(el),
            severity: 'Low',
            guideline: { code: '3.1.2', url: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-parts.html'}
          });
        }
      });
      return issues;
    },

    // === 3.3.2 Labels / Instructions ===
    checkFormLabels() {
      const issues = [];
      document.querySelectorAll('input, textarea, select').forEach((input, index) => {
        if (input.type === 'hidden') return;
        const id = input.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAria = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
        if (!hasLabel && !hasAria) {
          issues.push({
            type: 'form-labels',
            description: `Form control #${index + 1} lacks a label`,
            element: input.outerHTML,
            xpath: this.getXPath(input),
            severity: 'High',
            guideline: { code: '3.3.2', url: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html'}
          });
        }
      });
      return issues;
    },

    // === 3.3.1 Error Identification ===
    checkErrorIdentification() {
      const issues = [];
      document.querySelectorAll('input, textarea, select').forEach((el, i) => {
        if (el.hasAttribute('aria-invalid') && el.getAttribute('aria-invalid') === 'true' && !el.getAttribute('aria-describedby')) {
          issues.push({
            type: 'error-identification',
            description: `Form control #${i + 1} marked invalid but missing error message reference`,
            element: el.outerHTML,
            xpath: this.getXPath(el),
            severity: 'High',
            guideline: { code: '3.3.1', url: 'https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html' }
          });
        }
      });
      return issues;
    },

    // === 4.1.1 Unique IDs ===
    checkUniqueIds() {
      const issues = [];
      const seen = new Set();
      document.querySelectorAll('[id]').forEach((el, index) => {
        const id = el.id;
        if (seen.has(id)) {
          issues.push({
            type: 'unique-ids',
            description: `Duplicate ID found: ${id}`,
            element: el.outerHTML,
            xpath: this.getXPath(el),
            severity: 'High',
            guideline: { code: '4.1.1', url: 'https://www.w3.org/WAI/WCAG21/Understanding/parsing.html' }
          });
        } else {
          seen.add(id);
        }
      });
      return issues;
    },

    // === 4.1.2 Name, Role, Value (ARIA checks) ===
    checkNameRoleValue() {
      const issues = [];
      document.querySelectorAll('[role]').forEach((el, i) => {
        if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
          issues.push({
            type: 'name-role-value',
            description: `Element with role="${el.getAttribute('role')}" missing accessible name`,
            element: el.outerHTML,
            xpath: this.getXPath(el),
            severity: 'High',
            guideline: { code: '4.Example: 4.1.2', url: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html'}
          });
        }
      });
      return issues;
    },

    // === Unified Runner ===
    runAllChecks() {
      return [].concat(
        this.checkAltText(),
        this.checkAudioControl(),
        this.checkColorContrast(),
        this.checkTextResize(),
        this.checkImagesOfText(),
        this.checkReflow(),
        this.checkNonTextContrast(),
        this.checkKeyboardAccess(),
        this.checkNoKeyboardTrap(),
        this.checkFocusOrder(),
        this.checkFocusVisible(),
        this.checkLinkPurpose(),
        this.checkSkipLink(),
        this.checkHeadingOrder(),
        this.checkPageLanguage(),
        this.checkLanguageOfParts(),
        this.checkFormLabels(),
        this.checkErrorIdentification(),
        this.checkUniqueIds(),
        this.checkNameRoleValue()
      );
    }
  };

  window.WCAGChecker = WCAGChecker;
})();