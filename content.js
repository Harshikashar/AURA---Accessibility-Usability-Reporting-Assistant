/* // content.js - CRASH PROOF & FIXED HIGHLIGHT (RED) & AUTO FIX

if (!window.a11yContentScriptLoaded) {
  window.a11yContentScriptLoaded = true;

  // --- 1. VISION SIMULATOR ---
  const VISION_FILTERS = {
    'protanopia': '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
    'deuteranopia': '0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0',
    'tritanopia': '0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
    'achromatopsia': '0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0'
  };

  function applyVisionFilter(mode) {
    const existing = document.getElementById('a11y-vision-svg');
    if (existing) existing.remove();
    document.documentElement.style.filter = '';
    if (mode === 'normal') return;
    if (mode === 'blurred') { document.documentElement.style.filter = 'blur(4px)'; return; }
    const matrix = VISION_FILTERS[mode];
    if (!matrix) return;
    const svgHtml = `<svg id="a11y-vision-svg" style="display:none"><defs><filter id="a11y-vision-filter"><feColorMatrix type="matrix" values="${matrix}" /></filter></defs></svg>`;
    document.body.insertAdjacentHTML('beforeend', svgHtml);
    document.documentElement.style.filter = 'url(#a11y-vision-filter)';
  }

  // --- 2. TAB FOCUS VISUALIZER ---
  function toggleTabFocus(active) {
      document.querySelectorAll('.a11y-tab-badge').forEach(el => el.remove());
      if (!active) return;

      const focusable = document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      let count = 1;

      focusable.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (rect.width > 5 && rect.height > 5 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0') {
              const badge = document.createElement('span');
              badge.className = 'a11y-tab-badge';
              badge.textContent = count++;
              badge.style.cssText = `
                  position: absolute; top: ${window.scrollY + rect.top}px; left: ${window.scrollX + rect.left}px;
                  background: #000000; color: #f1c40f; font-family: sans-serif; font-weight: bold;
                  padding: 3px 7px; border-radius: 12px; font-size: 12px; z-index: 2147483647; 
                  pointer-events: none; border: 2px solid #ffffff; box-shadow: 0 3px 6px rgba(0,0,0,0.4);
              `;
              document.body.appendChild(badge);
          }
      });
  }

  // --- 3. SCREEN READER ---
  let srActive = false;
  let srBox = null;
  let synth = window.speechSynthesis;

  function toggleSRPreview(active) {
    srActive = active;
    if (active) {
      if (!srBox) {
        srBox = document.createElement('div');
        srBox.id = 'a11y-sr-bar';
        srBox.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.9); color:white; padding:12px 25px; font-size:16px; z-index:2147483647; text-align:center; border: 2px solid #3498db; border-radius:50px;";
        srBox.innerText = "Screen Reader Active";
        document.body.appendChild(srBox);
      }
      srBox.style.display = "block";
      document.addEventListener('mouseover', handleSrHover);
      document.addEventListener('mouseout', handleSrOut);
      speakText("Screen Reader Activated");
    } else {
      if (srBox) srBox.style.display = "none";
      document.removeEventListener('mouseover', handleSrHover);
      document.removeEventListener('mouseout', handleSrOut);
      synth.cancel();
    }
  }

  function handleSrHover(e) {
    if (!srActive) return;
    const el = e.target;
    if (!el.innerText && !el.alt && !el.getAttribute('aria-label')) return;
    if (el.id === 'a11y-sr-bar' || el.classList.contains('a11y-tab-badge')) return;

    el.style.outline = "3px solid #f1c40f"; 
    el.style.outlineOffset = "2px";

    let textToSpeak = el.getAttribute('aria-label') || el.alt || el.innerText || "";
    textToSpeak = textToSpeak.substring(0, 100).replace(/\n/g, " ");
    let role = el.getAttribute('role') || el.tagName.toLowerCase();
    
    if (srBox) srBox.innerHTML = `<span style="color:#3498db; font-weight:bold; text-transform:uppercase;">${role}</span> | ${textToSpeak}`;
    speakText(`${role}: ${textToSpeak}`);
  }

  function handleSrOut(e) {
    if (!srActive) return;
    e.target.style.outline = "";
    e.target.style.outlineOffset = "";
    synth.cancel(); 
  }

  function speakText(text) {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  }

  // --- 4. READABILITY ---
  function calculateReadability() {
      const text = document.body.innerText;
      const words = text.match(/\w+/g) || [];
      const sentences = text.split(/[.!?]+/).filter(Boolean);
      const score = 0.39 * (words.length / sentences.length) - 15.59; // Simplified
      return { score: score.toFixed(1), grade: score < 6 ? "Easy" : "Hard", wordCount: words.length };
  }

  // --- 5. HELPERS (Visuals) ---
  function clearHighlight(el) { 
      el.style.outline=''; 
      el.style.boxShadow=''; 
      el.style.removeProperty('outline'); 
      el.style.removeProperty('box-shadow'); 
  }

  function drawBox(el, color='red') {
    if(!el) return; 
    clearHighlight(el); 
    el.scrollIntoView({behavior:'smooth',block:'center'});
    
    // Slight delay to ensure scroll happens first
    setTimeout(()=>{ 
        el.style.setProperty('outline', `4px solid ${color}`, 'important'); 
        el.style.setProperty('box-shadow', `0 0 15px ${color}`, 'important'); 
        el.style.setProperty('outline-offset', '2px', 'important');
    }, 50);
  }

  // --- LISTENER ---
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    
    // Highlight Single Issue (RED BORDER NOW)
    if (msg.action === "highlightSelector") { 
        try {
            const el = document.querySelector(msg.selector); 
            if(el) { 
                drawBox(el, 'red'); // CHANGED: Orange to Red
                sendResponse({status:"success"}); 
            } else {
                console.warn("Element not found:", msg.selector);
                sendResponse({status:"not_found"});
            }
        } catch(e) { console.error(e); }
        return true; // Async response
    }

    // Highlight All Errors (Show All)
    if (msg.action === "highlightAll") { 
        (msg.selectors||[]).forEach(s => { 
            try{ 
                const el=document.querySelector(s); 
                if(el){ 
                    // Direct style application for bulk
                    el.style.setProperty('outline','3px solid red','important'); // Also made this Red
                }
            }catch(e){} 
        }); 
        sendResponse({status:"done"}); 
    }

    // Auto Fix Action (Apply Green Border)
    if (msg.action === "autoFixElement") { 
        try {
            const el = document.querySelector(msg.selector);
            if (el) {
                // 1. Visual Success Indicator (Green Border)
                el.style.setProperty('outline', '4px solid #27ae60', 'important');
                el.style.setProperty('box-shadow', '0 0 15px rgba(39, 174, 96, 0.6)', 'important');
                
                // 2. Try to apply fix if data provided
                if (msg.fixType === 'alt' && msg.suggestion) {
                    el.setAttribute('alt', msg.suggestion);
                    el.setAttribute('title', msg.suggestion);
                }
            }
            sendResponse({status:"fixed"});
        } catch(e) { console.error(e); }
    }

    // Other Tools
    if (msg.action === "simulateVision") { applyVisionFilter(msg.mode); }
    if (msg.action === "toggleTabFocus") { toggleTabFocus(msg.active); }
    if (msg.action === "toggleSR") { toggleSRPreview(msg.active); }
    if (msg.action === "getReadability") { sendResponse(calculateReadability()); }
    
    // PDF Headings
    if (msg.action === "getHeadings") {
        const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(h => ({
            tag: h.tagName, text: h.innerText.trim(), level: parseInt(h.tagName.substring(1))
        }));
        sendResponse({ headings: headings });
        return true;
    }
  });
} */

  // content.js - CRASH PROOF & FIXED HIGHLIGHT (RED) & REAL AUTO FIX

if (!window.a11yContentScriptLoaded) {
  window.a11yContentScriptLoaded = true;

  // --- 1. VISION SIMULATOR ---
  const VISION_FILTERS = {
    'protanopia': '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
    'deuteranopia': '0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0',
    'tritanopia': '0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
    'achromatopsia': '0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0'
  };

  function applyVisionFilter(mode) {
    const existing = document.getElementById('a11y-vision-svg');
    if (existing) existing.remove();
    document.documentElement.style.filter = '';
    if (mode === 'normal') return;
    if (mode === 'blurred') { document.documentElement.style.filter = 'blur(4px)'; return; }
    const matrix = VISION_FILTERS[mode];
    if (!matrix) return;
    const svgHtml = `<svg id="a11y-vision-svg" style="display:none"><defs><filter id="a11y-vision-filter"><feColorMatrix type="matrix" values="${matrix}" /></filter></defs></svg>`;
    document.body.insertAdjacentHTML('beforeend', svgHtml);
    document.documentElement.style.filter = 'url(#a11y-vision-filter)';
  }

  // --- 2. TAB FOCUS VISUALIZER ---
  function toggleTabFocus(active) {
      document.querySelectorAll('.a11y-tab-badge').forEach(el => el.remove());
      if (!active) return;

      const focusable = document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      let count = 1;

      focusable.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (rect.width > 5 && rect.height > 5 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0') {
              const badge = document.createElement('span');
              badge.className = 'a11y-tab-badge';
              badge.textContent = count++;
              badge.style.cssText = `
                  position: absolute; top: ${window.scrollY + rect.top}px; left: ${window.scrollX + rect.left}px;
                  background: #000000; color: #f1c40f; font-family: sans-serif; font-weight: bold;
                  padding: 3px 7px; border-radius: 12px; font-size: 12px; z-index: 2147483647; 
                  pointer-events: none; border: 2px solid #ffffff; box-shadow: 0 3px 6px rgba(0,0,0,0.4);
              `;
              document.body.appendChild(badge);
          }
      });
  }

  // --- 3. SCREEN READER ---
  let srActive = false;
  let srBox = null;
  let synth = window.speechSynthesis;

  function toggleSRPreview(active) {
    srActive = active;
    if (active) {
      if (!srBox) {
        srBox = document.createElement('div');
        srBox.id = 'a11y-sr-bar';
        srBox.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.9); color:white; padding:12px 25px; font-size:16px; z-index:2147483647; text-align:center; border: 2px solid #3498db; border-radius:50px;";
        srBox.innerText = "Screen Reader Active";
        document.body.appendChild(srBox);
      }
      srBox.style.display = "block";
      document.addEventListener('mouseover', handleSrHover);
      document.addEventListener('mouseout', handleSrOut);
      speakText("Screen Reader Activated");
    } else {
      if (srBox) srBox.style.display = "none";
      document.removeEventListener('mouseover', handleSrHover);
      document.removeEventListener('mouseout', handleSrOut);
      synth.cancel();
    }
  }

  function handleSrHover(e) {
    if (!srActive) return;
    const el = e.target;
    if (!el.innerText && !el.alt && !el.getAttribute('aria-label')) return;
    if (el.id === 'a11y-sr-bar' || el.classList.contains('a11y-tab-badge')) return;

    el.style.outline = "3px solid #f1c40f"; 
    el.style.outlineOffset = "2px";

    let textToSpeak = el.getAttribute('aria-label') || el.alt || el.innerText || "";
    textToSpeak = textToSpeak.substring(0, 100).replace(/\n/g, " ");
    let role = el.getAttribute('role') || el.tagName.toLowerCase();
    
    if (srBox) srBox.innerHTML = `<span style="color:#3498db; font-weight:bold; text-transform:uppercase;">${role}</span> | ${textToSpeak}`;
    speakText(`${role}: ${textToSpeak}`);
  }

  function handleSrOut(e) {
    if (!srActive) return;
    e.target.style.outline = "";
    e.target.style.outlineOffset = "";
    synth.cancel(); 
  }

  function speakText(text) {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  }

  // --- 4. READABILITY ---
  function calculateReadability() {
      const text = document.body.innerText;
      const words = text.match(/\w+/g) || [];
      const sentences = text.split(/[.!?]+/).filter(Boolean);
      const score = 0.39 * (words.length / sentences.length) - 15.59; // Simplified
      return { score: score.toFixed(1), grade: score < 6 ? "Easy" : "Hard", wordCount: words.length };
  }

  // --- 5. HELPERS (Visuals) ---
  function clearHighlight(el) { 
      el.style.outline=''; 
      el.style.boxShadow=''; 
      el.style.removeProperty('outline'); 
      el.style.removeProperty('box-shadow'); 
  }

  function drawBox(el, color='red') {
    if(!el) return; 
    clearHighlight(el); 
    el.scrollIntoView({behavior:'smooth',block:'center'});
    
    // Slight delay to ensure scroll happens first
    setTimeout(()=>{ 
        el.style.setProperty('outline', `4px solid ${color}`, 'important'); 
        el.style.setProperty('box-shadow', `0 0 15px ${color}`, 'important'); 
        el.style.setProperty('outline-offset', '2px', 'important');
    }, 50);
  }

  // --- LISTENER ---
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    
    // Highlight Single Issue (RED BORDER NOW)
    if (msg.action === "highlightSelector") { 
        try {
            const el = document.querySelector(msg.selector); 
            if(el) { 
                drawBox(el, 'red'); // CHANGED: Orange to Red
                sendResponse({status:"success"}); 
            } else {
                console.warn("Element not found:", msg.selector);
                sendResponse({status:"not_found"});
            }
        } catch(e) { console.error(e); }
        return true; // Async response
    }

    // Highlight All Errors (Show All)
    if (msg.action === "highlightAll") { 
        (msg.selectors||[]).forEach(s => { 
            try{ 
                const el=document.querySelector(s); 
                if(el){ 
                    // Direct style application for bulk
                    el.style.setProperty('outline','3px solid red','important'); // Also made this Red
                }
            }catch(e){} 
        }); 
        sendResponse({status:"done"}); 
    }

    // --- REAL AUTO FIX ACTION (UPDATED LOGIC) ---
    if (msg.action === "autoFixElement") { 
        try {
            const el = document.querySelector(msg.selector);
            if (el) {
                // 1. Visual Success Indicator (Green Border)
                el.style.setProperty('outline', '4px solid #27ae60', 'important');
                el.style.setProperty('box-shadow', '0 0 15px rgba(39, 174, 96, 0.6)', 'important');
                
                // 2. ACTUAL FIX LOGIC
                // CASE A: Image Alt Text
                if (msg.fixType === 'alt' && msg.suggestion) {
                    el.setAttribute('alt', msg.suggestion);
                    el.setAttribute('title', msg.suggestion);
                }
                // CASE B: Contrast Issue (Force High Contrast)
                else if (msg.fixType === 'contrast') {
                    el.style.setProperty('color', '#000000', 'important');
                    el.style.setProperty('background-color', '#ffffff', 'important');
                    el.style.setProperty('background', '#ffffff', 'important'); // Clear gradients
                }
                // CASE C: Missing Labels / Empty Buttons
                else {
                    if (msg.suggestion) {
                        el.setAttribute('aria-label', msg.suggestion);
                        // Agar button khali hai toh text fill kar do
                        if(el.innerText.trim() === "") {
                             el.innerText = msg.suggestion;
                        }
                    }
                }
            }
            sendResponse({status:"fixed"});
        } catch(e) { console.error(e); }
    }

    // Other Tools
    if (msg.action === "simulateVision") { applyVisionFilter(msg.mode); }
    if (msg.action === "toggleTabFocus") { toggleTabFocus(msg.active); }
    if (msg.action === "toggleSR") { toggleSRPreview(msg.active); }
    if (msg.action === "getReadability") { sendResponse(calculateReadability()); }
    
    // PDF Headings
    if (msg.action === "getHeadings") {
        const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(h => ({
            tag: h.tagName, text: h.innerText.trim(), level: parseInt(h.tagName.substring(1))
        }));
        sendResponse({ headings: headings });
        return true;
    }
  });
}