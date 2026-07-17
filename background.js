// Listen for clicks on the extension toolbar icon
chrome.action.onClicked.addListener((tab) => {
  // Automatically opens the Naradha AI side panel overlay on user click
  chrome.sidePanel.open({ tabId: tab.id });
});