/**
 * This function is injected into the active WhatsApp Web page.
 * It automates the sticker creation sequence using the official file input.
 * (Used for Drag & Drop and Paste operations)
 */
async function performFullSequence(imageDataUrl, fileName, mimeType) {

    // Helper 1: Waits for an element to exist, then returns it.
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element "${selector}" not found after ${timeout}ms`));
                } else {
                    setTimeout(check, 50); 
                }
            }
            check();
        });
    }

    // Helper 2: Converts the Base64 Data URL back into a File object with original metadata
    async function dataUrlToFile(dataUrl, name, type) {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return new File([blob], name, { type: type || blob.type });
    }

    // --- MAIN ACTION SEQUENCE ---
    try {
        // 1. Wait for & Click "expressions" (Emoji/Stickers tray button)
        const expressionsIcon = await waitForElement('button[aria-label*="Emojis"], button[aria-label*="emojis"], [data-icon="emoji"]');
        expressionsIcon.click();

        // 2. Wait for & Click "sticker" creator button (runs as soon as tray appears)
        const stickerIcon = await waitForElement('[data-icon="wds-ic-sticker"], [data-icon="sticker"]');
        stickerIcon.click();
        
        // 3. Wait for the file input that WhatsApp Web opens
        const fileInput = await waitForElement('input[type="file"]');

        // 4. Create File and dispatch change event to upload
        const file = await dataUrlToFile(imageDataUrl, fileName, mimeType);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
    } catch (error) {
        alert(`Sticker Creation Error: ${error.message}\nMake sure a chat is open on WhatsApp Web.`);
    }
}

/**
 * Injected script that creates a temporary file input on the active WhatsApp Web page
 * to prevent the extension popup from closing when the file picker dialog opens.
 * (Used for Click-to-Browse operations)
 */
async function triggerPageFileInput() {
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element "${selector}" not found after ${timeout}ms`));
                } else {
                    setTimeout(check, 50); 
                }
            }
            check();
        });
    }

    // Create a temporary file input element on the page
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = 'image/*,video/mp4,video/quicktime,video/webm';
    tempInput.style.display = 'none';
    document.body.appendChild(tempInput);

    tempInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            try {
                // 1. Wait for & Click "expressions" (Emoji/Stickers tray button)
                const expressionsIcon = await waitForElement('button[aria-label*="Emojis"], button[aria-label*="emojis"], [data-icon="emoji"]');
                expressionsIcon.click();

                // 2. Wait for & Click "sticker" creator button (runs as soon as tray appears)
                const stickerIcon = await waitForElement('[data-icon="wds-ic-sticker"], [data-icon="sticker"]');
                stickerIcon.click();
                
                // 3. Wait for the file input that WhatsApp Web opens
                const waFileInput = await waitForElement('input[type="file"]');

                // 4. Create File and dispatch change event to upload
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);

                waFileInput.files = dataTransfer.files;
                waFileInput.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (err) {
                alert(`Sticker Creation Error: ${err.message}\nMake sure a chat is open on WhatsApp Web.`);
            }
        }
        tempInput.remove();
    });

    tempInput.click();
}

// --- POPUP INTERACTIVE SCRIPT ---

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
}

let selectedFile = null;
let previewObjectUrl = null;

const pasteArea = document.getElementById('paste-area');
const browseBtn = document.getElementById('browse-btn');
const previewContainer = document.getElementById('preview-container');
const mediaWrapper = document.getElementById('media-wrapper');
const fileDetails = document.getElementById('file-details');
const sendBtn = document.getElementById('send-btn');

// Function to trigger file browse input inside the WhatsApp Web page context
async function openPageFileInput() {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab || !activeTab.id) {
            throw new Error('No active browser tab found.');
        }

        // Check if user is on WhatsApp Web
        if (!activeTab.url || !activeTab.url.includes('web.whatsapp.com')) {
            throw new Error('Please navigate to WhatsApp Web (web.whatsapp.com) first.');
        }

        await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: triggerPageFileInput
        });
        
        // Close the popup so that it doesn't stay open in an inactive state
        window.close();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Click listener for Choose File button
browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openPageFileInput();
});

// Click listener for the entire paste area (if user clicks it)
pasteArea.addEventListener('click', (e) => {
    if (e.target !== browseBtn) {
        openPageFileInput();
    }
});

// Drag and drop handlers
['dragenter', 'dragover'].forEach(eventName => {
    pasteArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        pasteArea.classList.add('highlight');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    pasteArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        pasteArea.classList.remove('highlight');
    }, false);
});

pasteArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files.length > 0) {
        handleFile(dt.files[0]);
    }
});

// Paste event listener
document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
        if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
                handleFile(file);
                break;
            }
        }
    }
});

// Core File Handler for Drag-and-Drop and Paste
function handleFile(file) {
    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
        alert('Please select a valid image or video file.');
        return;
    }

    selectedFile = file;

    // Revoke old URL if exists
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
    }
    
    previewObjectUrl = URL.createObjectURL(file);
    mediaWrapper.innerHTML = '';

    let mediaElement;
    if (isVideo) {
        mediaElement = document.createElement('video');
        mediaElement.src = previewObjectUrl;
        mediaElement.autoplay = true;
        mediaElement.loop = true;
        mediaElement.muted = true;
        mediaElement.playsInline = true;
        mediaElement.className = 'preview-media';
    } else {
        mediaElement = document.createElement('img');
        mediaElement.src = previewObjectUrl;
        mediaElement.className = 'preview-media';
    }

    mediaWrapper.appendChild(mediaElement);
    
    // Display file name and size details
    const fileSizeKB = (file.size / 1024).toFixed(1);
    fileDetails.textContent = `${file.name || 'Pasted Media'} (${fileSizeKB} KB)`;
    
    // Show preview and enable Send button
    previewContainer.style.display = 'flex';
    sendBtn.disabled = false;
    
    // Scroll preview into view if needed
    previewContainer.scrollIntoView({ behavior: 'smooth' });
}

// Send to WhatsApp Web handler (used for Drag & Drop and Paste)
sendBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    sendBtn.disabled = true;
    sendBtn.textContent = 'Uploading to WhatsApp...';

    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab || !activeTab.id) {
            throw new Error('No active browser tab found.');
        }

        // Check if user is on WhatsApp Web
        if (!activeTab.url || !activeTab.url.includes('web.whatsapp.com')) {
            throw new Error('Please navigate to WhatsApp Web (web.whatsapp.com) first.');
        }

        const imageDataUrl = await blobToDataURL(selectedFile);
        
        // Ensure we have a default name if it was pasted from clipboard
        let fileName = selectedFile.name;
        if (!fileName) {
            const ext = selectedFile.type.split('/')[1] || 'png';
            fileName = `sticker-${Date.now()}.${ext}`;
        }

        await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: performFullSequence,
            args: [imageDataUrl, fileName, selectedFile.type]
        });
        
        sendBtn.textContent = 'Sent! Check WhatsApp Tab';
        setTimeout(() => {
            sendBtn.textContent = 'Send to WhatsApp';
            sendBtn.disabled = false;
        }, 3000);

    } catch (error) {
        console.error('Sequence activation failed:', error);
        alert(`Error: ${error.message}`);
        sendBtn.textContent = 'Send to WhatsApp';
        sendBtn.disabled = false;
    }
});
