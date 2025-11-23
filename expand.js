// EXPAND.JS - Full Premium Features

let allResults = [];
let pageReadability = null; // Store readability here

// --- HELPER: Clean Text ---
function cleanText(text) {
    if (text === null || text === undefined) return "";
    const str = String(text);
    return str.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();
}

document.addEventListener("DOMContentLoaded", () => {
  // Load Data including Readability
  chrome.storage.local.get(["analysisResults", "targetUrl", "pageHeadings", "pageReadability"], (data) => {
    if (!data.analysisResults || data.analysisResults.length === 0) { 
        document.getElementById("targetUrl").textContent = "No Data";
        document.getElementById("resultsBody").innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Data load failed. Please try running the scan again.</div>'; 
        return; 
    }
    
    allResults = data.analysisResults || [];
    pageReadability = data.pageReadability || { score: 0, grade: "N/A", wordCount: 0 }; // Load it
    document.getElementById("targetUrl").textContent = data.targetUrl || "Unknown";
    
    updateStats(); 
    updateDisplay(); 
    createPieChart();
    renderTreeHeadings(data.pageHeadings || []);
  });

  document.getElementById("impactFilter").addEventListener("change", updateDisplay);
  document.getElementById("standardFilter").addEventListener("change", updateDisplay);
  document.getElementById("downloadPdfBtn").addEventListener("click", generatePdfReport);
});

// --- 1. HEADING TREE STRUCTURE ---
function renderTreeHeadings(headings) {
    const container = document.getElementById("headingMap");
    container.innerHTML = "";

    if (!headings || headings.length === 0) { 
        container.innerHTML = "<div style='color:#999; font-style:italic; padding:10px;'>No headings found on this page.</div>"; 
        return; 
    }

    // Filter garbage headings for display
    const cleanHeadings = headings.filter(h => cleanText(h.text).length > 2);

    if (!cleanHeadings.some(h => h.tag === 'H1')) {
        container.innerHTML += "<div style='color:#e74c3c; font-weight:bold; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;'>⚠️ Critical: Missing H1 Title!</div>";
    }

    cleanHeadings.forEach(h => {
        const item = document.createElement("div");
        item.className = "heading-item";
        item.style.padding = "4px 0";
        item.style.fontFamily = "monospace";
        item.style.fontSize = "13px";
        
        let treeArt = "";
        if (h.level > 1) {
            const repeatCount = Math.max(0, h.level - 2);
            treeArt = "&nbsp;&nbsp;".repeat(repeatCount) + "└─ ";
        }
        
        let tagColor = "#95a5a6";
        if(h.tag === 'H1') tagColor = "#3498db";
        if(h.tag === 'H2') tagColor = "#2980b9";
        if(h.tag === 'H3') tagColor = "#1abc9c";

        item.innerHTML = `
            <span style="color:#ccc; margin-right:5px;">${treeArt}</span>
            <span style="background:${tagColor}; color:white; padding:1px 5px; border-radius:3px; font-size:10px; margin-right:8px; font-weight:bold; min-width:25px; display:inline-block; text-align:center;">${h.tag}</span>
            <span>${cleanText(h.text)}</span>
        `;
        container.appendChild(item);
    });
}

// --- 2. DISPLAY LOGIC ---
function updateStats() {
    const passed = allResults.filter(r => r.status.includes('passed')).length;
    const failed = allResults.filter(r => r.status === 'failed').length;
    document.getElementById("passedCount").textContent = passed;
    document.getElementById("failedCount").textContent = failed;
    document.getElementById("totalCount").textContent = allResults.length;
}

function updateDisplay() {
  const impactVal = document.getElementById("impactFilter").value;
  const standardVal = document.getElementById("standardFilter").value;
  const body = document.getElementById("resultsBody");
  body.innerHTML = "";

  const filtered = allResults.filter(r => {
      if (impactVal === "failed" && r.status !== 'failed') return false;
      if (impactVal === "passed" && !r.status.includes('passed')) return false;
      if (standardVal !== "all" && !r.code.includes(standardVal)) return false;
      return true;
  });

  if(filtered.length === 0) { 
      body.innerHTML = "<div style='padding:20px; text-align:center; color:#999;'>No matching results.</div>"; 
      return; 
  }

  filtered.forEach(r => {
    const row = document.createElement("div"); row.className = "result-row";
    
    let badge = r.status === 'failed' ? '<span class="status-badge failed" style="background:#fdedec; color:#e74c3c; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">FAILED</span>' : '<span class="status-badge passed" style="background:#e8f8f5; color:#27ae60; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">PASSED</span>';
    if(r.status === 'passed-fixed') badge = '<span class="status-badge passed" style="background:#e8f8f5; color:#27ae60; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">FIXED ✅</span>';
    
    let issuesHtml = "";
    if(r.status === 'failed') {
        issuesHtml = "<div style='background:#fafafa; padding:10px; border-radius:5px; font-size:0.9rem; border:1px solid #eee; max-height:150px; overflow-y:auto;'>";
        r.issues.forEach(i => issuesHtml += `<div style="margin-bottom:6px; padding-bottom:4px; border-bottom:1px dashed #eee;">• ${cleanText(i.summary)} <br><span style="color:#999; font-size:0.75em; font-family:monospace;">${cleanText(i.selector)}</span></div>`);
        issuesHtml += "</div>";
    } else { issuesHtml = "<span style='color:#27ae60; font-weight:bold;'>✓ Standard Met</span>"; }

    row.innerHTML = `
        <div style="font-weight:bold; color:#2c3e50;">${r.name}<br><span style="font-size:0.8em; color:#888; font-weight:normal;">${r.code}</span></div>
        <div>${badge}</div>
        <div>${issuesHtml}</div>
        <div style="font-size:0.9em; color:#555;">${r.description}</div>
        <div><a href="${r.helpUrl}" target="_blank" style="color:#3498db; text-decoration:none; font-weight:bold; border:1px solid #3498db; padding:2px 6px; border-radius:4px;">Docs ↗</a></div>
    `;
    body.appendChild(row);
  });
}

// --- 3. PIE CHART ---
function createPieChart() {
  const canvas = document.getElementById("statusChart");
  if(!canvas) return;
  canvas.width = 250; canvas.height = 250;
  
  const passed = allResults.filter(r => r.status.includes('passed')).length;
  const failed = allResults.filter(r => r.status === 'failed').length;
  const total = passed + failed;
  const ctx = canvas.getContext("2d");
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 100;

  if(!total) return;

  const passedAngle = (passed/total) * 2 * Math.PI;
  const startAngle = -Math.PI / 2;

  // Passed Slice (Green)
  ctx.beginPath(); ctx.moveTo(centerX, centerY); 
  ctx.arc(centerX, centerY, radius, startAngle, startAngle + passedAngle); 
  ctx.fillStyle="#27ae60"; ctx.fill();

  // Failed Slice (Red)
  ctx.beginPath(); ctx.moveTo(centerX, centerY); 
  ctx.arc(centerX, centerY, radius, startAngle + passedAngle, startAngle + 2*Math.PI); 
  ctx.fillStyle="#e74c3c"; ctx.fill();

  // Inner White Circle (Donut)
  ctx.beginPath(); ctx.arc(centerX, centerY, radius * 0.6, 0, 2*Math.PI); 
  ctx.fillStyle="white"; ctx.fill();
  
  const score = Math.round((passed/total)*100);
  ctx.fillStyle = "#333"; ctx.font = "bold 28px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(score + "%", centerX, centerY);
}

// --- 4. PREMIUM PDF REPORT (Matches Popup Logic) ---
async function generatePdfReport() {
    const btn = document.getElementById("downloadPdfBtn");
    const originalText = btn.textContent;
    btn.textContent = "Generating...";

    try {
        if(!window.jspdf) throw new Error("PDF Library missing!");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Colors
        const blue = [41, 128, 185];
        const dark = [44, 62, 80];
        const green = [39, 174, 96];
        const red = [231, 76, 60];

        // Header
        doc.setFillColor(dark[0], dark[1], dark[2]);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setFontSize(20); doc.setTextColor(255); doc.setFont("helvetica", "bold");
        doc.text("Accessibility & Usability Reporting Assistant Report", 15, 20);
        doc.setFontSize(10); doc.setTextColor(200); doc.setFont("helvetica", "normal");
        doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 30);

        let y = 55;
        const margin = 15;

        // Data Preparation
        const url = document.getElementById("targetUrl").textContent;
        const passed = allResults.filter(r => r.status.includes('passed'));
        const failed = allResults.filter(r => r.status === 'failed');
        const score = Math.round((passed.length / allResults.length) * 100) || 100;
        
        // Use stored readability or default
        const r = pageReadability || { score: 0, grade: "N/A", wordCount: 0 };

        // 1. Summary
        doc.setFontSize(16); doc.setTextColor(blue[0], blue[1], blue[2]); doc.setFont("helvetica", "bold");
        doc.text("1. Executive Summary", margin, y);
        y += 10;

        doc.autoTable({
            startY: y,
            head: [['Target URL', 'Score', 'Issues Found', 'Passed Tests']],
            body: [[ cleanText(url).substring(0, 50), `${score}/100`, `${failed.length} Critical`, `${passed.length} Successful` ]],
            theme: 'striped',
            headStyles: { fillColor: blue, halign: 'center' },
            bodyStyles: { halign: 'center', fontStyle: 'bold' }
        });
        y = doc.lastAutoTable.finalY + 15;

        // 2. Readability
        doc.text("2. Content Readability", margin, y);
        y += 10;
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

        // 3. Heading Structure
        doc.text("3. Heading Structure", margin, y);
        y += 10;
        
        // Retrieve headings from storage (loaded in DOMContentLoaded)
        // We need to re-fetch them from storage as they are not global variable, 
        // OR rely on the UI tree. Better to fetch from storage again for clean data.
        const storedHeadings = await new Promise(resolve => chrome.storage.local.get(['pageHeadings'], res => resolve(res.pageHeadings || [])));
        
        let cleanHeadings = storedHeadings
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

        // 4. Critical Issues
        doc.addPage();
        doc.setFillColor(red[0], red[1], red[2]); doc.rect(0, 0, pageWidth, 15, 'F');
        doc.setFontSize(16); doc.setTextColor(red[0], red[1], red[2]); doc.text("4. CRITICAL ISSUES DETAILED", margin, 30);

        if (failed.length > 0) {
            const failedData = failed.map(f => [
                cleanText(f.priority), cleanText(f.name), f.issues.length, cleanText(f.description)
            ]);
            doc.autoTable({
                startY: 40,
                head: [['Impact', 'Violation', 'Qty', 'Description']],
                body: failedData,
                theme: 'grid',
                headStyles: { fillColor: red },
                columnStyles: { 0: { fontStyle: 'bold', width: 25 }, 3: { width: 70 } }
            });
        } else {
            doc.setFontSize(12); doc.setTextColor(green[0], green[1], green[2]); doc.text("✅ No critical issues found.", margin, 45);
        }

        // 5. Passed Checks
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

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8); doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount} - AURA - Accessibility & Usability Reporting
Assistant`, pageWidth - 60, 290);
        }

        doc.save("AURA - Accessibility & Usability Reporting Assistant Report.pdf");

    } catch(e) { alert("PDF Error: " + e.message); } 
    finally { btn.textContent = originalText; }
}