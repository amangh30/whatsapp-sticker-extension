const pasteArea = document.getElementById('paste-area');

pasteArea.addEventListener('paste', (e) => {
    e.preventDefault();  
    const items = e.clipboardData.items;

    for (const item of items) {
        const blob = item.getAsFile();
        if (blob && blob.type.startsWith('image/')) {
            pasteArea.innerHTML = ''
            const url = URL.createObjectURL(blob);
            let img = new Image();

            img.onload = () => {
                URL.revokeObjectURL(url);
                pasteArea.appendChild(img);  
                const newButton = document.createElement('button');
                newButton.textContent = "Upload";
                pasteArea.appendChild(newButton)
            };

            img.src = url;
        }
    }
});
