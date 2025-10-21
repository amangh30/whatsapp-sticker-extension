/**
 * This function is injected into the active page.
 * It uses a fast "polling" method to run the sequence.
 */
async function performFullSequence(imageDataUrl) {

    // --- HELPER FUNCTIONS (to run on the page) ---

    // NEW Helper 1: Waits for an element to exist, then returns it.
    // This is much faster than a fixed 500ms wait.
    function waitForElement(selector, timeout = 3000) { // 3-second timeout
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element "${selector}" not found after ${timeout}ms`));
                } else {
                    // Check again very soon
                    setTimeout(check, 50); 
                }
            }
            check();
        });
    }

    // Helper 2: Converts a Data URL (Base64) back into a File object
    async function dataUrlToFile(dataUrl, fileName) {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return new File([blob], fileName, { type: blob.type });
    }

    // --- MAIN ACTION SEQUENCE (NOW FASTER) ---
    try {
        // 1. Wait for & Click "expressions"
        const expressionsIcon = await waitForElement('[data-icon="expressions"]');
        expressionsIcon.click();

        // 2. Wait for & Click "sticker" (runs as soon as it appears)
        const stickerIcon = await waitForElement('[data-icon="wds-ic-sticker"]');
        stickerIcon.click();
        
        // 3. Wait for the file input (runs as soon as it appears)
        const fileInput = await waitForElement('input[type="file"]');

        // 4. "Upload" the image (This part is already fast)
        const file = await dataUrlToFile(imageDataUrl, 'pasted-image.png');
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
    } catch (error) {
        alert(`Extension Error: ${error.message}`);
    }
}

// --- POPUP SCRIPT (Handles pasting) ---
// (This part is unchanged)

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
}

const pasteArea = document.getElementById('paste-area');
    
pasteArea.addEventListener('paste', (e) => {
    e.preventDefault();  
    const items = e.clipboardData.items;

    for (const item of items) {
        const blob = item.getAsFile(); 

        if (blob && blob.type.startsWith('image/')) {
            pasteArea.innerHTML = '';
            
            const url = URL.createObjectURL(blob);
            let img = new Image();

            img.onload = () => {
                URL.revokeObjectURL(url);
                pasteArea.appendChild(img);  
                
                const newButton = document.createElement('button');
                newButton.textContent = "Run Full Sequence"; 
                pasteArea.appendChild(newButton);

                newButton.addEventListener('click', async () => {
                    newButton.textContent = "Running...";
                    newButton.disabled = true;

                    try {
                        const imageDataUrl = await blobToDataURL(blob);
                        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                        
                        if (!activeTab || !activeTab.id) {
                            throw new Error("Could not find an active tab.");
                        }

                        await chrome.scripting.executeScript({
                            target: { tabId: activeTab.id },
                            func: performFullSequence,
                            args: [imageDataUrl]
                        });
                        
                        newButton.textContent = "Sequence Done!";

                    } catch (error) {
                        console.error("Action failed:", error);
                        alert(`Action Error: ${error.message}`);
                        newButton.textContent = "Run Full Sequence";
                        newButton.disabled = false;
                    }
                });
            };

            img.src = url;
            break; 
        }
    }
});