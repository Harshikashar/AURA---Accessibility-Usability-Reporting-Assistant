# AURA - Accessibility-&-Usability-Reporting-Assistant 🔍

**AURA---Accessibility-Usability-Reporting-Assistant** is a powerful Chrome Extension built with Manifest V3 to scan any webpage for accessibility issues based on **WCAG 2.1** standards.

This tool is designed for developers, testers, and designers to quickly identify, understand, and even fix accessibility barriers, ensuring a more inclusive web experience for everyone.

---

## ✨ Key Features

This extension goes beyond simple scanning and provides a complete analysis and reporting toolkit.

* **Comprehensive WCAG 2.1 Audit:** Scans the active page against 20 distinct WCAG 2.1 guidelines, including critical checks for:
    * Alt Text for Images (1.1.1)
    * Color Contrast (1.4.3)
    * Form Labels (3.3.2)
    * Heading Order (1.3.1)
    * Link Purpose (2.4.4)
    * ...and 15 other essential guidelines.

* **Instant Accessibility Score:** Generates an immediate, weighted accessibility score (out of 100) presented in a dynamic, color-coded score circle for a quick "at-a-glance" understanding of the page's compliance.

* **AI-Powered Suggestions (Serverless):** Offers smart, client-side suggestions for common problems without needing a backend server:
    * **Alt Text:** Generates readable alt text from image file names (e.g., `user-profile-icon.png` becomes "User Profile Icon").
    * **Color Contrast:** Suggests a compliant color (e.g., `#FFFFFF` or `#000000`) based on the element's background luminance.

* **One-Click Auto-Fix & Preview:**
    * Applies AI-generated suggestions directly to the webpage's DOM with the "⚡ Fix with AI" button.
    * The element is highlighted in green on the live page to confirm the fix.
    * The extension popup simultaneously displays a "Fixed Preview" of the change, providing immediate feedback.

* **Live Element Highlighting:** A "Show" button for every issue uses an XPath to find the exact problematic element on the page and highlights it with a red border.

* **Detailed PDF Reporting:** Generates a professional, multi-page PDF report of all findings with a single click. This report is formatted using **jsPDF** and **jsPDF-AutoTable** for a clean, shareable summary of all passed and failed checks.

* **Expanded Dashboard View:** A "Expand Window" button opens the full analysis report in a new tab (`expand.html`). This dashboard provides a larger, persistent view with filters and charts to visualize the results.

* **Result Filtering:** The main popup and expanded view allow you to filter results by "All", "Passed", or "Failed" status to focus on what matters.

---

## 🛠️ Tech Stack

* **Core:** `JavaScript (ES6+)`, `HTML5`, `CSS3`
* **Extension Framework:** `Chrome Manifest V3`
* [cite_start]**PDF Generation:** `jsPDF` [cite: 181-182] [cite_start]& `jspdf-plugin-autotable.min.js` [cite: 179-180]
* **Architecture:**
    * `popup.js`: Handles all UI logic, event listeners, filtering, and orchestrates the scan.
    * `content.js`: Injected into the active tab to perform all DOM manipulations, including element highlighting and auto-fixing.
    * `background.js`: A persistent service worker for handling browser-level events like installation.
    * `wcag-checks.js` / `popup.js (runAllChecksOnPage)`: Contains the core logic for all 20 accessibility scans.

---

## 📸 How it Looks

1.  **Popup View:** When the extension icon is clicked, the main popup (`popup.html`) opens. It immediately shows the overall score circle, a summary of Passed/Failed/Total checks, and a filterable table listing the results for all 20 guidelines.
2.  **Expanded Dashboard:** Clicking the "Expand" icon opens `expand.html` in a new tab. This view shows a persistent dashboard with summary cards, filters, and a pie chart visualizing the pass/fail ratio.
3.  **On-Page Interaction:** Clicking "Show" on an issue highlights the element in red. Clicking "🤖 AI Suggest" and then "⚡ Fix with AI" applies the fix and highlights the same element in green.

---

## 🚀 How to Install and Run

Since this is a developer build, you can load it directly into Chrome:

1.  Download or clone this repository to a folder on your computer.
2.  Open the Chrome browser and navigate to `chrome://extensions`.
3.  In the top-right corner, toggle on **"Developer mode"**.
4.  A new menu will appear. Click the **"Load unpacked"** button.
5.  Select the entire project folder (the one containing the `manifest.json` file).
6.  The extension will now be installed. Pin it to your toolbar for easy access.
7.  Navigate to any website, click the extension icon, and the analysis will begin automatically.

---

## ⚙️ Core Workflow

1.  The user clicks the extension icon, opening `popup.html`.
2.  `popup.js`'s `DOMContentLoaded` event fires. It immediately uses `chrome.scripting.executeScript` to inject and run the `runAllChecksOnPage()` function on the active tab.
3.  The `runAllChecksOnPage()` function (defined in `popup.js` but executing on the page) scans the DOM against all 20 guidelines and returns a comprehensive `results` array.
4.  Back in `popup.js`, the `results` array is received. It is used to calculate the score and populate the results table via `displayResults`.
5.  When a user clicks "Show" or "Fix with AI", `popup.js` sends a message to `content.js` containing the element's `xpath` and the requested `action` (e.g., `highlightElement` or `autoFixElement`).
6.  `content.js`, which is always listening, receives the message, finds the element by its XPath, and applies the appropriate style change (a red/green highlight or a DOM update like setting `.alt` or `.textContent`).

---

## 👥 Other Contributors

This project was developed by :

* **Manya** [github.com/Manyaa111](https://github.com/Manyaa111)
* **Anshu** [github.com/anshuy901](https://github.com/anshuy901)
