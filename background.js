chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

function broadcastOverlayToggle() {
  chrome.tabs.query({url: ["http://*/*", "https://*/*"]}, function(tabs) {
    tabs.forEach(tab => {
      if (tab.id === undefined) return;

      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_OVERLAY' }, () => {
        if (!chrome.runtime.lastError) return;

        // If no listener exists yet, inject content script and try again.
        console.warn('Overlay message failed for tab', tab.id, chrome.runtime.lastError.message);
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: ['content.js'] },
          () => {
            if (chrome.runtime.lastError) {
              console.warn('Overlay injection failed for tab', tab.id, chrome.runtime.lastError.message);
              return;
            }
            chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_OVERLAY' }, () => {
              if (chrome.runtime.lastError) {
                console.warn('Overlay message retry failed for tab', tab.id, chrome.runtime.lastError.message);
              }
            });
          }
        );
      });
    });
  });
}

function openOverlayOnActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || tab.id == null) return;

    chrome.scripting.executeScript(
      { target: { tabId: tab.id }, files: ['content.js'] },
      () => {
        if (chrome.runtime.lastError) {
          console.warn('Active tab injection failed:', chrome.runtime.lastError.message);
          return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_OVERLAY' }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Active tab overlay message failed:', chrome.runtime.lastError.message);
          }
        });
      }
    );
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-overlay") {
    broadcastOverlayToggle();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "CAPTURE_TAB") {
      console.log('background: CAPTURE_TAB requested by', sender ? sender.id || sender.tab?.id : 'unknown');
      chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 70 }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error('background: captureVisibleTab error', chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          console.log('background: captureVisibleTab success, dataUrl length=', dataUrl ? dataUrl.length : 0);
          sendResponse({ imgSrc: dataUrl });
        }
      });
        return true; 
    }
    if (request.action === "TOGGLE_OVERLAY_ALL") {
        broadcastOverlayToggle();
    }
    if (request.action === "OPEN_FLOATING_HELPER") {
        openOverlayOnActiveTab();
    }
});