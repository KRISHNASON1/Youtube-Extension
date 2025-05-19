// background.js - Handles file storage operations for YouTube Notes

// In-memory cache of the notes data
let notesData = {};
const NOTES_FILE_NAME = 'notes.json';

// Initialize the file system when extension loads
chrome.runtime.onInstalled.addListener(() => {
  loadNotesFromFile();
});

// Load notes from JSON file
function loadNotesFromFile() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('notesData', (result) => {
      try {
        // If we have stored data, use it
        if (result.notesData) {
          notesData = result.notesData;
          console.log("Notes loaded from storage:", notesData);
          resolve(notesData);
        } else {
          // No data stored yet, create default empty data
          notesData = {};
          saveNotesToFile();  // Create a new file structure
          resolve({});
        }
      } catch (err) {
        console.error("Error in loadNotesFromFile:", err);
        reject(err);
      }
    });
  });
}

// Save notes to JSON file
function saveNotesToFile() {
  return new Promise((resolve, reject) => {
    try {
      // Store the data in Chrome's local storage
      chrome.storage.local.set({ 'notesData': notesData }, () => {
        console.log("Notes saved to storage:", notesData);
        
        // Create a download of the JSON file for backup (optional)
        const jsonData = JSON.stringify(notesData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
          url: url,
          filename: NOTES_FILE_NAME,
          saveAs: false,
          conflictAction: 'overwrite'
        }, (downloadId) => {
          URL.revokeObjectURL(url);
          console.log(`File saved with download ID: ${downloadId}`);
          resolve({ success: true });
        });
      });
    } catch (err) {
      console.error("Error saving notes file:", err);
      reject(err);
    }
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "loadNotes") {
    // Return cached data immediately if available
    if (Object.keys(notesData).length > 0) {
      sendResponse({ success: true, data: notesData });
    } else {
      // Load from storage if cache is empty
      loadNotesFromFile()
        .then(data => {
          sendResponse({ success: true, data: data });
        })
        .catch(err => {
          sendResponse({ success: false, error: err.message });
        });
    }
    return true; // Keep the message channel open for async response
  }
  
  else if (request.action === "saveNotes") {
    // Update memory cache with new data
    notesData = request.data;
    
    // Save to storage
    saveNotesToFile()
      .then(() => {
        sendResponse({ success: true });
        
        // Notify all open tabs that notes have been updated
        chrome.tabs.query({ url: "*://*.youtube.com/*" }, tabs => {
          tabs.forEach(tab => {
            if (tab.id !== sender.tab?.id) {
              chrome.tabs.sendMessage(tab.id, { action: "notesUpdated", data: notesData });
            }
          });
        });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep the message channel open for async response
  }
});