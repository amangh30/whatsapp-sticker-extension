// This function will be injected into the active page.
// It finds and clicks all three elements in sequence.
function performClickSequence() {

    // --- Part 1: Click the first two icons ---
    
    const selectors = [
        '[data-icon="expressions"]',
        '[data-icon="wds-ic-sticker"]'
    ];

    let clickIndex = 0;

    function clickNext() {
        if (clickIndex >= selectors.length) {
            // After clicking the first two, find and click the 'Create' button
            clickCreateButton();
            return;
        }

        const selector = selectors[clickIndex];
        const elementToClick = document.querySelector(selector);

        if (elementToClick) {
            elementToClick.click();
            clickIndex++;
            // Wait 500ms for the UI to update
            setTimeout(clickNext, 500);
        } else {
            alert(`Error: Could not find element with selector "${selector}"`);
        }
    }

    // --- Part 2: Find and click the 'Create' button ---
    
    function clickCreateButton() {
        let found = false;
        // Get all divs on the page
        const allDivs = document.querySelectorAll('div');
        
        // Loop through them to find the one that matches our structure
        for (const div of allDivs) {
            // Check if this div contains BOTH the plus icon AND the "Create" text span
            const hasPlusIcon = div.querySelector('[data-icon="plus"]');
            const spans = div.querySelectorAll('span');
            
            // Check if one of its child spans has the exact text "Create"
            const hasCreateText = Array.from(spans).some(span => 
                span.textContent === 'Create' && !span.hasAttribute('data-icon')
            );

            if (hasPlusIcon && hasCreateText) {
                div.click();
                found = true;
                break; // We found it, stop searching
            }
        }

        if (!found) {
            alert('Error: Could not find the "Create" button.');
        }
    }

    // Start the whole sequence
    clickNext();
}


// --- This part below remains unchanged ---

const pasteArea = document.getElementById('paste-area');
    
pasteArea.addEventListener('paste', (e) => {
    e.preventDefault();  
    const items = e.clipboardData.items;

    for (const item of items) {
        const blob = item.getAsFile();

        if (blob && blob.type.startsWith('image/')) {
            pasteArea.innerHTML = ''; // Clear the "paste here" text
            
            const url = URL.createObjectURL(blob);
            let img = new Image();

            img.onload = () => {
                URL.revokeObjectURL(url);
                pasteArea.appendChild(img);  
                
                const newButton = document.createElement('button');
                newButton.textContent = "Start Click Sequence"; 
                pasteArea.appendChild(newButton);

                // --- START: CLICK LOGIC ---

                newButton.addEventListener('click', async () => {
                    newButton.textContent = "Clicking...";
                    newButton.disabled = true;

                    try {
                        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                        
                        if (!activeTab || !activeTab.id) {
                            throw new Error("Could not find an active tab.");
                        }

                        // Inject the sequence function
                        await chrome.scripting.executeScript({
                            target: { tabId: activeTab.id },
                            func: performClickSequence
                        });
                        
                        newButton.textContent = "Sequence Done!";

                    } catch (error) {
                        console.error("Click failed:", error);
                        alert(`Click Error: ${error.message}`);
                        newButton.textContent = "Start Click Sequence"; // Reset button
                        newButton.disabled = false;
                    }
                });
                // --- END: CLICK LOGIC ---
            };

            img.src = url;
            break; 
        }
    }
});