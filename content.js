let isLocked = false;
let currentAlert = null;
let originalTitle = document.title;
let lockedIconURL = '';
let unlockedIconURL = '';

// Preload the icons
chrome.runtime.sendMessage({ action: "getIconURLs" }, (response) => {
  lockedIconURL = chrome.runtime.getURL('assets/locked.svg');
  unlockedIconURL = chrome.runtime.getURL('assets/unlocked.svg');
});

// Create a MutationObserver to watch for title changes
const titleObserver = new MutationObserver((mutations) => {
  if (isLocked && !document.title.includes("🔒")) {
    // Only update if the title actually changed (prevents loops)
    if (document.title !== originalTitle) {
      originalTitle = document.title;
      document.title = "🔒 " + document.title;
    }
  }
});

// Start observing title changes
titleObserver.observe(
  document.querySelector('title') || document.head, 
  { 
    subtree: true, 
    childList: true, 
    characterData: true 
  }
);

// Add event listener to prevent tab closing
window.addEventListener('beforeunload', (event) => {
  if (isLocked) {
    event.preventDefault();
    showSilentMessage("This tab is locked and cannot be closed.");
    return "This tab is locked";
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleLock") {
    isLocked = !isLocked;
    
    chrome.runtime.sendMessage({ 
      action: "setLockState", 
      isLocked: isLocked,
      url: window.location.href,
      title: document.title
    });

    if (isLocked) {
      updateTabLockState(true);
      showSilentMessage("Tab locked. It cannot be closed.");
    } else {
      updateTabLockState(false);
      showSilentMessage("Tab unlocked. It can be closed now.");
    }
  }
});

function playSound(locked) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Configure sound
  if (locked) {
    // Higher pitch "lock" sound
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1); // Slight pitch up
  } else {
    // Lower pitch "unlock" sound
    oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 note
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.1); // A4 note
  }
  
  // Configure volume envelope
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
  
  // Play sound
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
}

function updateTabLockState(locked) {
  playSound(locked);
  
  if (locked) {
    originalTitle = document.title.replace(/^🔒\s/, "");
    if (!document.title.includes("🔒")) {
      document.title = "🔒 " + originalTitle;
    }
    chrome.runtime.sendMessage({ 
      action: "updateIcon", 
      state: "locked" 
    });
  } else {
    document.title = document.title.replace(/^🔒\s/, "");
    originalTitle = document.title;
    chrome.runtime.sendMessage({ 
      action: "updateIcon", 
      state: "unlocked" 
    });
  }
}

function showSilentMessage(message) {
  // Remove previous alert if it exists
  if (currentAlert) {
    currentAlert.remove();
  }

  let div = document.createElement("div");
  div.style.position = "fixed";
  div.style.top = "20px";
  div.style.left = "20px";
  div.style.padding = "12px 24px";
  div.style.backgroundColor = isLocked ? "#df2645" : "#333";  // Red when locked, dark grey when unlocked
  div.style.color = "#fff";
  div.style.borderRadius = "8px";
  div.style.fontSize = "16px";
  div.style.zIndex = "9999";
  div.style.display = "flex";
  div.style.alignItems = "center";
  div.style.gap = "8px";
  div.style.boxShadow = `0px 4px 12px ${isLocked ? "#661324aa" : "#1a1a1a80"}`;
  div.style.transition = "background-color 0.3s ease";

  // Add icon
  let icon = document.createElement("img");
  icon.src = isLocked ? lockedIconURL : unlockedIconURL;
  icon.style.width = "16px";
  icon.style.height = "16px";

  // Add text
  let text = document.createElement("span");
  text.textContent = message;

  div.appendChild(icon);
  div.appendChild(text);
  
  document.body.appendChild(div);
  currentAlert = div;
  
  setTimeout(() => {
    if (currentAlert === div) {
      div.remove();
      currentAlert = null;
    }
  }, 2000);
}
