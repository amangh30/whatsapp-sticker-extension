document.addEventListener('DOMContentLoaded', function () {
    // File input event handler
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFileUpload);

    // Paste area event handler
    const pasteArea = document.getElementById('paste-area');
    pasteArea.addEventListener('paste', handlePaste);
});

function handlePaste(event) {
    const pasteArea = document.getElementById('paste-area');
    const items = event.clipboardData.items;
    pasteArea.innerHTML = ''; // Clear previous content
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.src = e.target.result;
                pasteArea.appendChild(img); // This will display the image on the page
            };
            reader.readAsDataURL(blob);
        }
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const pasteArea = document.getElementById('paste-area');
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.src = e.target.result;
            pasteArea.innerHTML = ''; // Clear previous content
            pasteArea.appendChild(img); // Display the uploaded image
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please upload an image file');
    }
}
