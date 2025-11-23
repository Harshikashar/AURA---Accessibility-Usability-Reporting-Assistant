// background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("AURA - Accessibility & Usability Reporting Assistant installed.");
});
// Jab bhi Tab Refresh ho ya URL badle, purana data clear karo
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    
    // 1. Issues Fixed wala data clear
    const keyIssues = `fixed_issues_${tabId}`;
    
    // 2. Screen Reader State wala data clear
    const keySR = `srState_${tabId}`;

    // 3. Tab Focus State wala data clear (NEW)
    const keyTab = `tabState_${tabId}`;

    chrome.storage.local.remove([keyIssues, keySR, keyTab]);
  }
});