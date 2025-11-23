// POPUP.JS - Fixed Version for Score & Table

console.log("Popup script loaded."); 

let currentTab = null;
let currentTabUrl = "";
let fixedIssuesMap = new Set(); 
window.analysisResults = []; 

// Tool States
let tabFocusActive = false;
let srPreviewActive = false;

// --- 1. SAFE TEXT HELPERS ---
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

const AILogic = {
  getAltSuggestion(htmlString) {
    try {
      const srcMatch = htmlString.match(/src=["'](.*?)["']/);
      if (srcMatch && srcMatch[1]) {
        const filename = srcMatch[1].split('/').pop().split('.')[0];
        return filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      return "Descriptive Image";
    } catch (e) { return "Image Content"; }
  },
  getContrastSuggestion() { return "Smart Auto-Contrast"; }
};

// --- 2. MAIN ANALYSIS ---
async function runAnalysis() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    currentTabUrl = tab.url;

    // Load states
    chrome.storage.local.get([`srState_${tab.id}`, `tabState_${tab.id}`], (data) => {
        if (data[`srState_${tab.id}`]) {
            srPreviewActive = true;
            const btn = document.getElementById('btnScreenReader');
            if(btn) { btn.classList.add('active'); btn.textContent = "🗣️ Stop SR"; }
        }
        if (data[`tabState_${tab.id}`]) {
            tabFocusActive = true;
            const btn = document.getElementById('btnTabFocus');
            if(btn) { btn.classList.add('active'); btn.textContent = "🎹 Stop Tab"; }
        }
    });

    // Reset fixed issues
    const storageKey = `fixed_issues_${currentTab.id}`;
    const storedData = await chrome.storage.local.get([storageKey]);
    if (storedData[storageKey]) fixedIssuesMap = new Set(storedData[storageKey]);

    // UI Loading
    document.getElementById('loadingDiv').style.display = 'block';
    document.getElementById('resultsTable').style.display = 'none';
    const expandBtn = document.getElementById('expand-btn');
    if(expandBtn) { expandBtn.textContent = "Scanning..."; expandBtn.style.opacity = "0.6"; }

    // Inject Axe if needed
    const isLoaded = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => typeof window.axe !== 'undefined'
    });

    if (!isLoaded || !isLoaded[0] || !isLoaded[0].result) {
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['utils/axe.min.js', 'wcag-checks.js', 'content.js']
        });
    }

    // Run Axe + WCAG Checks
    const results = await chrome.scripting.executeScript({ 
        target: { tabId: currentTab.id }, 
        func: () => new Promise(async (resolve) => {
            // Run Axe
            const axeResults = await new Promise(r => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a'] } }, (e, res) => r(res)));
            // Run Custom WCAG
            const customResults = window.WCAGChecker ? window.WCAGChecker.runAllChecks() : [];
            resolve({ axe: axeResults, custom: customResults });
        }) 
    });

    if (!results || !results[0] || !results[0].result) throw new Error("No results.");
    processResults(results[0].result);

  } catch (error) {
    console.error(error);
    document.getElementById('loadingDiv').innerHTML = `<p style="color:red">Error: ${error.message}<br><small>Try reloading page.</small></p>`;
    const expandBtn = document.getElementById('expand-btn');
    if(expandBtn) { expandBtn.textContent = "⤢ Expand"; expandBtn.style.opacity = "1"; }
  }
}

function processResults(data) {
  const { axe, custom } = data;
  let formattedResults = [];

  // Process Axe Violations
  if(axe && axe.violations) {
      axe.violations.forEach(v => {
        let fixType = null;
        if (v.id === 'image-alt') fixType = 'alt';
        if (v.id === 'color-contrast') fixType = 'contrast';

        const mappedIssues = v.nodes.map(node => {
            const uniqueId = v.id + '|' + node.target[0];
            return { summary: node.failureSummary, selector: node.target[0], html: node.html, isFixed: fixedIssuesMap.has(uniqueId) };
        });

        const allFixed = mappedIssues.length > 0 && mappedIssues.every(i => i.isFixed);

        formattedResults.push({
          name: v.help, code: v.id, priority: v.impact ? v.impact.toUpperCase() : 'MEDIUM',
          status: allFixed ? 'passed-fixed' : 'failed', 
          helpUrl: v.helpUrl, description: v.description, fixType: fixType, issues: mappedIssues
        });
      });

      axe.passes.forEach(p => {
        formattedResults.push({ name: p.help, code: p.id, priority: 'LOW', status: 'passed', helpUrl: p.helpUrl, description: "Standard met.", issues: [] });
      });
  }
  
  // Process Custom Checks (Simple mapping)
  if(custom && custom.length > 0) {
      custom.forEach(c => {
          formattedResults.push({
              name: c.description, code: c.guideline.code, priority: c.severity.toUpperCase(),
              status: 'failed', helpUrl: c.guideline.url, description: c.description, 
              issues: [{ summary: c.description, selector: c.xpath, html: c.element }]
          });
      });
  }

  window.analysisResults = formattedResults;
  
  // Update UI Elements
  const expandBtn = document.getElementById('expand-btn');
  if(expandBtn) { expandBtn.textContent = "⤢ Expand"; expandBtn.style.opacity = "1"; }

  const totalRules = formattedResults.length;
  const passedRules = formattedResults.filter(r => r.status === 'passed' || r.status === 'passed-fixed').length;
  const score = totalRules === 0 ? 100 : Math.round((passedRules / totalRules) * 100);
  
  if (currentTabUrl) chrome.storage.local.set({ [currentTabUrl]: score });
  
  // --- SCORE CIRCLE ANIMATION (FIXED) ---
  document.getElementById('score-text').textContent = score;
  const circle = document.getElementById('scoreCircle');
  if (circle) {
    let color = score < 50 ? '#ef4444' : score < 90 ? '#f59e0b' : '#10b981'; // Red, Orange, Green
    // Conic Gradient se fill hoga
    circle.style.background = `conic-gradient(${color} 0% ${score}%, #e2e8f0 ${score}% 100%)`;
  }
  // --------------------------------------

  document.getElementById('passedCount').textContent = passedRules;
  document.getElementById('failedCount').textContent = formattedResults.filter(r => r.status === 'failed').length;
  document.getElementById('totalCount').textContent = totalRules;
  displayResults(formattedResults);
}

function displayResults(results) {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  document.getElementById('loadingDiv').style.display = 'none';
  document.getElementById('resultsTable').style.display = 'table';

  if (results.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="padding:15px; text-align:center;">No items found.</td></tr>'; return; }

// popup.js ke andar 'displayResults' function mein loop ko aise update karo:

results.forEach(result => {
    const row = document.createElement('tr');
    
    // Status Badge Logic
    let statusBadge = result.status.includes('passed') 
        ? '<span class="status-pass">PASSED</span>' 
        : '<span class="status-fail">FAILED</span>';
    if (result.status === 'passed-fixed') statusBadge = '<span class="status-pass">FIXED ✅</span>';

    // --- MAIN CHANGE HERE (HTML Structure Update) ---
    let issuesHtml = '';
    if (result.status === 'failed' || result.status === 'passed-fixed') {
        issuesHtml = result.issues.map(issue => {
            let aiButtons = '';
            
            // AI Buttons logic (Same as before)
            if (issue.isFixed) {
                aiButtons = `<button disabled style="margin-left:8px; padding:4px 10px; border-radius:20px; background:#27ae60; color:white; border:none; font-size:0.7rem;">Fixed! ✅</button>`;
            } else if (result.fixType) {
                let suggestion = '';
                if (result.fixType === 'alt') suggestion = AILogic.getAltSuggestion(issue.html);
                if (result.fixType === 'contrast') suggestion = AILogic.getContrastSuggestion();
                
                aiButtons = `
                     <button class="ai-suggest" data-suggestion="${escapeHtml(suggestion)}" style="margin-left:5px; padding:4px 10px; border-radius:20px; background:#3b82f6; color:white; border:none; font-size:0.7rem; cursor:pointer;">🤖 AI</button>
                     <button class="autofix-btn" data-selector="${escapeHtml(issue.selector)}" data-rule="${result.code}" data-fixtype="${result.fixType}" data-suggestion="${escapeHtml(suggestion)}" style="margin-left:5px; padding:4px 10px; border-radius:20px; background:#27ae60; color:white; border:none; display:none; font-size:0.7rem; cursor:pointer;">⚡ Fix</button>
                  `;
            }

            // --- YAHAN DEKHO: New HTML Structure for Bold Text & Round Button ---
            return `<div class="issue-row">
                <span class="issue-text">${escapeHtml(issue.summary)}</span>
                <div style="display:flex; align-items:center; margin-top:4px;">
                    <button class="highlight-btn" data-selector="${escapeHtml(issue.selector)}">
                        🔍 Show
                    </button>
                    ${aiButtons}
                </div>
            </div>`;
            // -------------------------------------------------------------------
        }).join('');
    } else { 
        issuesHtml = '<span style="color:#27ae60; font-weight:600;">✓ Standard met.</span>'; 
    }

    row.innerHTML = `
      <td style="vertical-align:top;"><b>${escapeHtml(result.name)}</b><br><span style="font-size:0.7rem; color:#64748b;">${escapeHtml(result.code)}</span></td>
      <td style="vertical-align:top;">${statusBadge}</td>
      <td style="vertical-align:top;">${issuesHtml}</td>
      <td style="vertical-align:top;">${escapeHtml(result.description)}</td>
      <td style="vertical-align:top;"><a href="${result.helpUrl}" target="_blank" style="text-decoration:none; color:#3b82f6; font-weight:600;">View ↗</a></td>`;
      
    tbody.appendChild(row);
});
}
// --- EVENTS ---
document.addEventListener('DOMContentLoaded', () => {
  runAnalysis();

  document.getElementById('showAllErrorsBtn').addEventListener('click', () => {
      const failed = window.analysisResults.filter(r => r.status === 'failed');
      const allSelectors = [];
      failed.forEach(r => r.issues.forEach(i => {
          if(!i.isFixed) allSelectors.push(i.selector);
      }));

      if(allSelectors.length > 0) {
          chrome.tabs.sendMessage(currentTab.id, { action: "highlightAll", selectors: allSelectors }, () => {
              window.close();
          });
      } else {
          alert("No pending errors to show!");
      }
  });

  document.getElementById('resultsBody').addEventListener('click', (e) => {
    if (e.target.classList.contains('highlight-btn')) { 
        chrome.tabs.sendMessage(currentTab.id, { action: "highlightSelector", selector: e.target.dataset.selector }, () => {
             window.close();
        });
    }

    if (e.target.classList.contains('ai-suggest')) { 
        e.target.textContent = `Use: "${e.target.dataset.suggestion}"`; 
        if(e.target.nextElementSibling) e.target.nextElementSibling.style.display = "inline-block"; 
    }
    
    if (e.target.classList.contains('autofix-btn')) {
       const selector = e.target.dataset.selector;
       chrome.tabs.sendMessage(currentTab.id, { 
           action: "autoFixElement", 
           selector: selector, 
           fixType: e.target.dataset.fixtype, 
           suggestion: e.target.dataset.suggestion 
       });

       const uniqueId = e.target.dataset.rule + '|' + selector;
       fixedIssuesMap.add(uniqueId);
       chrome.storage.local.set({ [`fixed_issues_${currentTab.id}`]: Array.from(fixedIssuesMap) });
       
       e.target.textContent = "Fixed! ✅"; 
       setTimeout(() => window.close(), 800);
    }
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
     btn.addEventListener('click', (e) => {
         document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active');
         const filter = e.target.dataset.filter;
         if (filter === 'all') displayResults(window.analysisResults);
         else if (filter === 'passed') displayResults(window.analysisResults.filter(r => r.status === 'passed' || r.status === 'passed-fixed'));
         else displayResults(window.analysisResults.filter(r => r.status === 'failed'));
     });
  });

  document.getElementById('btnTabFocus')?.addEventListener('click', () => toggleTool('tabState', 'toggleTabFocus', 'btnTabFocus', "🎹 Tab Order", "🎹 Stop Tab"));
  document.getElementById('btnScreenReader')?.addEventListener('click', () => toggleTool('srState', 'toggleSR', 'btnScreenReader', "🗣️ Screen Reader", "🗣️ Stop SR"));
  document.getElementById('btnReadability')?.addEventListener('click', () => {
      chrome.tabs.sendMessage(currentTab.id, { action: "getReadability" }, (res) => {
          if(!res) return;
          alert(`📝 Readability Score: ${res.score}\nGrade: ${res.grade}`);
      });
  });

  document.getElementById('expand-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('expand-btn');
      if(!window.analysisResults || window.analysisResults.length === 0) return;
      btn.textContent = "Opening...";
      try {
          const frameResults = await chrome.scripting.executeScript({
              target: { tabId: currentTab.id, allFrames: true },
              func: () => Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(h=>({tag:h.tagName, text:h.innerText.substring(0,60), level:parseInt(h.tagName.substring(1))}))
          });
          const headings = frameResults.flatMap(f => f.result || []);
          chrome.storage.local.set({ analysisResults: window.analysisResults, targetUrl: currentTabUrl, pageHeadings: headings }, () => {
              chrome.tabs.create({ url: "expand.html" });
              btn.textContent = "⤢ Expand";
          });
      } catch(e) { btn.textContent = "⤢ Expand"; }
  });

  document.getElementById('downloadPdf')?.addEventListener('click', () => {
      if(window.generatePdfReport) window.generatePdfReport(); 
      else alert("PDF function not loaded.");
  });

  document.getElementById('visionSelect').addEventListener('change', (e) => chrome.tabs.sendMessage(currentTab.id, { action: "simulateVision", mode: e.target.value }));
});

function toggleTool(storageKey, msgAction, btnId, textOff, textOn) {
    if(!currentTab) return;
    const btn = document.getElementById(btnId);
    const isActive = btn.classList.toggle('active');
    btn.textContent = isActive ? textOn : textOff;
    chrome.tabs.sendMessage(currentTab.id, { action: msgAction, active: isActive });
    const key = `${storageKey}_${currentTab.id}`;
    if(isActive) chrome.storage.local.set({ [key]: true });
    else chrome.storage.local.remove(key);
    if(isActive) setTimeout(() => window.close(), 200);
}

// --- 3. PREMIUM PDF GENERATOR ---
async function generatePdfReport() {
    const btn = document.getElementById('downloadPdf');
    const originalText = btn ? btn.textContent : "📄 PDF";
    if(btn) btn.textContent = "Generating...";

    try {
        if(!window.jspdf) throw new Error("PDF Library missing!");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        const blue = [41, 128, 185];
        const dark = [44, 62, 80];
        const green = [39, 174, 96];
        const red = [231, 76, 60];

        // PAGE 1: DASHBOARD
        doc.setFillColor(dark[0], dark[1], dark[2]);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setFontSize(24); doc.setTextColor(255); doc.setFont("helvetica", "bold");
        doc.text("Accessibility & Usability Reporting Assistant", 15, 20);
        doc.setFontSize(10); doc.setTextColor(200); doc.setFont("helvetica", "normal");
        doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 30);

        let y = 55;
        const margin = 15;

        const dataPromise = new Promise(resolve => {
            chrome.tabs.sendMessage(currentTab.id, { action: "getReadability" }, (readability) => {
                chrome.tabs.sendMessage(currentTab.id, { action: "getHeadings" }, (headingsData) => {
                    resolve({ 
                        readability: readability || { score: 0, grade: "N/A", wordCount: 0 },
                        headings: headingsData?.headings || []
                    });
                });
            });
        });

        const extraData = await dataPromise;
        const passed = window.analysisResults.filter(r => r.status.includes('passed'));
        const failed = window.analysisResults.filter(r => r.status === 'failed');
        const totalCount = window.analysisResults.length;
        const score = totalCount === 0 ? 100 : Math.round((passed.length / totalCount) * 100);

        // Summary
        doc.setFontSize(16); doc.setTextColor(blue[0], blue[1], blue[2]); doc.setFont("helvetica", "bold");
        doc.text("1. Executive Summary", margin, y);
        y += 10;
        doc.autoTable({
            startY: y,
            head: [['Target URL', 'Score', 'Issues Found', 'Passed Tests']],
            body: [[cleanText(currentTabUrl).substring(0, 50), `${score}/100`, `${failed.length} Critical`, `${passed.length} Successful`]],
            theme: 'striped',
            headStyles: { fillColor: blue, halign: 'center' },
            bodyStyles: { halign: 'center', fontStyle: 'bold' }
        });
        y = doc.lastAutoTable.finalY + 15;

        doc.text("2. Content Readability", margin, y);
        y += 10;
        const r = extraData.readability;
        doc.autoTable({
            startY: y,
            head: [['Metric', 'Value', 'Interpretation']],
            body: [
                ['Flesch Score', cleanText(r.score), 'Higher is easier'],
                ['Grade Level', cleanText(r.grade), 'Target audience level'],
                ['Word Count', cleanText(r.wordCount), 'Content volume']
            ],
            theme: 'grid',
            headStyles: { fillColor: dark }
        });
        y = doc.lastAutoTable.finalY + 15;

        doc.text("3. Heading Structure", margin, y);
        y += 10;
        let cleanHeadings = (extraData.headings || [])
            .map(h => ({ level: h.level, text: cleanText(h.text) }))
            .filter(h => h.text.length > 2 && !h.text.toLowerCase().includes('skip') && !h.text.toLowerCase().includes('menu'));
        
        if(cleanHeadings.length > 0) {
            const headingsData = cleanHeadings.slice(0, 15).map(h => [
                h.level === 1 ? "H1" : `H${h.level}`,
                "  ".repeat(Math.max(0, h.level-1)) + h.text.substring(0, 70)
            ]);
            doc.autoTable({
                startY: y,
                head: [['Tag', 'Heading Text']],
                body: headingsData,
                theme: 'plain',
                columnStyles: { 0: { fontStyle: 'bold', width: 20 } }
            });
            if(cleanHeadings.length > 15) {
                 doc.setFontSize(10); doc.setTextColor(150);
                 doc.text(`...and ${cleanHeadings.length - 15} more headings available in detailed view.`, margin, doc.lastAutoTable.finalY + 10);
            }
        } else {
            doc.setFontSize(11); doc.setTextColor(100); doc.text("No valid headings found.", margin, y+5);
        }

        if (failed.length > 0) {
            doc.addPage();
            doc.setFillColor(red[0], red[1], red[2]); doc.rect(0, 0, pageWidth, 15, 'F');
            doc.setFontSize(16); doc.setTextColor(red[0], red[1], red[2]); doc.text("4. CRITICAL ISSUES DETAILED", margin, 30);
            const failedData = failed.map(f => [cleanText(f.priority), cleanText(f.name), f.issues.length, cleanText(f.description)]);
            doc.autoTable({
                startY: 40,
                head: [['Impact', 'Violation', 'Qty', 'Description']],
                body: failedData,
                theme: 'grid',
                headStyles: { fillColor: red },
                columnStyles: { 0: { fontStyle: 'bold', width: 25 }, 3: { width: 70 } }
            });
        } else {
            doc.addPage();
            doc.setFontSize(12); doc.setTextColor(green[0], green[1], green[2]);
            doc.text("✅ No critical issues found.", margin, 45);
        }

        if (passed.length > 0) {
            doc.addPage();
            doc.setFillColor(green[0], green[1], green[2]); doc.rect(0, 0, pageWidth, 15, 'F');
            doc.setFontSize(16); doc.setTextColor(green[0], green[1], green[2]); doc.text("5. PASSED CHECKS", margin, 30);
            const passedData = passed.map(p => ["PASS", cleanText(p.name), cleanText(p.description)]);
            doc.autoTable({
                startY: 40,
                head: [['Status', 'Guideline', 'Details']],
                body: passedData,
                theme: 'striped',
                headStyles: { fillColor: green },
                columnStyles: { 0: { fontStyle: 'bold', textColor: green } }
            });
        }

        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8); doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount} - AURA - Accessibility & Usability Reporting Assistant`, pageWidth - 60, 290);
        }
        doc.save("AURA - Accessibility & Usability Reporting Assistant.pdf");
    } catch(e) { alert("PDF Error: " + e.message); } finally { if(btn) btn.textContent = "📄 PDF"; }
}

function cleanText(text) {
    if (text === null || text === undefined) return "";
    return String(text).replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();
}