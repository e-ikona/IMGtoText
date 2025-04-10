pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

const elements = {
    fileInput: document.getElementById('fileInput'),
    dropzone: document.getElementById('dropzone'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileType: document.getElementById('fileType'),
    fileSize: document.getElementById('fileSize'),
    imagePreview: document.getElementById('imagePreview'),
    imagePreviewContainer: document.getElementById('imagePreviewContainer'),
    pdfPreviewContainer: document.getElementById('pdfPreviewContainer'),
    pdfPreview: document.getElementById('pdfPreview'),
    currentPage: document.getElementById('currentPage'),
    totalPages: document.getElementById('totalPages'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    processBtn: document.getElementById('processBtn'),
    clearBtn: document.getElementById('clearBtn'),
    loading: document.getElementById('loading'),
    result: document.getElementById('result'),
    copyBtn: document.getElementById('copyBtn'),
    progressContainer: document.getElementById('progressContainer'),
    progressBar: document.getElementById('progressBar'),
    progressPercent: document.getElementById('progressPercent'),
    progressStatus: document.getElementById('progressStatus')
};

let selectedFile = null;
let pdfDocument = null;
let currentPdfPage = 1;
let pdfImages = [];

function handleFileSelect(file) {
    if (!file) return;
    
    selectedFile = file;
    
    // Show file info
    elements.fileInfo.classList.remove('hidden');
    elements.fileName.textContent = file.name;
    elements.fileType.textContent = file.type || file.name.split('.').pop().toUpperCase();
    elements.fileSize.textContent = formatFileSize(file.size);
    
    // Reset previews
    elements.imagePreviewContainer.classList.add('hidden');
    elements.pdfPreviewContainer.classList.add('hidden');
    elements.processBtn.disabled = false;
    
    // Check if file is PDF
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        loadPdfFile(file);
    } else {
        // Handle image file
        const reader = new FileReader();
        reader.onload = function(e) {
            elements.imagePreview.onload = () => {
                elements.imagePreviewContainer.classList.remove('hidden');
            };
            elements.imagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function loadPdfFile(file) {
    try {
        elements.loading.classList.remove('hidden');
        
        const arrayBuffer = await file.arrayBuffer();
        pdfDocument = await pdfjsLib.getDocument(arrayBuffer).promise;

        const totalPages = pdfDocument.numPages;
        elements.totalPages.textContent = totalPages;
        elements.pdfPreviewContainer.classList.remove('hidden');

        // Render semua halaman langsung
        pdfImages = []; // reset
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDocument.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            img.alt = `Halaman ${i}`;
            img.className = 'pdf-page hidden'; // disembunyikan dulu

            pdfImages.push(img); // simpan elemen img
        }

        // Tampilkan halaman pertama
        currentPdfPage = 1;
        updatePdfPageDisplay();

        elements.loading.classList.add('hidden');
        elements.processBtn.disabled = false;
    } catch (error) {
        showError("Gagal memuat PDF: " + error.message);
        console.error(error);
        elements.loading.classList.add('hidden');
    }
}

function updatePdfPageDisplay() {
    elements.pdfPreview.innerHTML = ''; // kosongkan container

    const img = pdfImages[currentPdfPage - 1];
    if (img) {
        elements.pdfPreview.appendChild(img);
        img.classList.remove('hidden');
    }

    elements.currentPage.textContent = currentPdfPage;
    elements.prevPage.disabled = currentPdfPage <= 1;
    elements.nextPage.disabled = currentPdfPage >= pdfImages.length;
}

elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('active');
});

elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('active');
});

elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('active');
    
    if (e.dataTransfer.files.length) {
        elements.fileInput.files = e.dataTransfer.files;
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

elements.fileInput.addEventListener('change', function(event) {
    if (event.target.files.length) {
        handleFileSelect(event.target.files[0]);
    }
});

elements.prevPage.addEventListener('click', () => {
    if (currentPdfPage > 1) {
        currentPdfPage--;
        updatePdfPageDisplay();
    }
});

elements.nextPage.addEventListener('click', () => {
    if (currentPdfPage < pdfImages.length) {
        currentPdfPage++;
        updatePdfPageDisplay();
    }
});


elements.clearBtn.addEventListener('click', () => {
    elements.fileInput.value = '';
    elements.imagePreviewContainer.classList.add('hidden');
    elements.pdfPreviewContainer.classList.add('hidden');
    elements.fileInfo.classList.add('hidden');
    elements.processBtn.disabled = true;
    elements.result.textContent = '';
    elements.copyBtn.classList.add('hidden');
    elements.progressContainer.classList.add('hidden');
    selectedFile = null;
    pdfDocument = null;
    pdfImages = [];
});

elements.copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.result.textContent)
        .then(() => {
            const originalText = elements.copyBtn.textContent;
            elements.copyBtn.textContent = 'Tersalin!';
            setTimeout(() => {
                elements.copyBtn.textContent = originalText;
            }, 2000);
        });
});

// Process button
elements.processBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        showError("Silakan pilih file terlebih dahulu");
        return;
    }

    elements.result.textContent = '';
    elements.loading.classList.remove('hidden');
    elements.processBtn.disabled = true;
    elements.progressContainer.classList.remove('hidden');
    elements.copyBtn.classList.add('hidden');

    try {
        let results = [];
        
        if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
            // Langsung proses semua halaman tanpa render preview
            if (!pdfDocument) {
                const arrayBuffer = await selectedFile.arrayBuffer();
                pdfDocument = await pdfjsLib.getDocument(arrayBuffer).promise;
            }

            const totalPages = pdfDocument.numPages;
            pdfImages = []; // Reset canvas storage

            // Proses semua halaman sekaligus
            for (let i = 1; i <= totalPages; i++) {
                updateProgress(Math.round(((i-1) / totalPages) * 100), `Memproses halaman ${i}/${totalPages}...`);
                
                // Render halaman ke canvas
                const page = await pdfDocument.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Proses OCR langsung
                const processedImage = await preprocessImage(canvas);
                const text = await runOCR(processedImage);
                
                if (text.trim()) {
                    results.push(`=== HALAMAN ${i} ===\n${text}\n`);
                }
            }
            
            elements.result.textContent = results.join('\n');
        } else {
            // Process single image
            updateProgress(0, 'Memproses gambar...');
            const processedImage = await preprocessImage(elements.imagePreview);
            const text = await runOCR(processedImage);
            elements.result.textContent = text;
        }
        
        updateProgress(100, 'Selesai!');
        elements.copyBtn.classList.remove('hidden');
    } catch (error) {
        showError("Terjadi kesalahan: " + error.message);
        console.error(error);
    } finally {
        elements.loading.classList.add('hidden');
        elements.processBtn.disabled = false;
    }
});


async function runOCR(imageSrc) {
    const worker = await Tesseract.createWorker({
        logger: m => {
            if (m.status === 'recognizing text') {
                const progress = Math.round(m.progress * 100);
                updateProgress(30 + progress/2, 'Mengenali teks...');
            } else if (m.status === 'initialized api') {
                updateProgress(0, 'Menginisialisasi OCR...');
            } else if (m.status === 'loading language traineddata') {
                updateProgress(10, 'Memuat bahasa...');
            } else {
                console.log(m);
            }
        },
    });

    await worker.loadLanguage('eng+ind');
    await worker.initialize('eng+ind');
    
    const { data } = await worker.recognize(imageSrc);
    await worker.terminate();
    
    return data.text;
}

async function preprocessImage(imageElement) {
    let canvas;
    let ctx;
    
    if (imageElement instanceof HTMLCanvasElement) {
        // Already a canvas
        canvas = imageElement;
        ctx = canvas.getContext('2d');
    } else if (imageElement instanceof HTMLImageElement) {
        // Create canvas from image
        if (!imageElement.complete || imageElement.naturalWidth === 0) {
            throw new Error("Gambar belum dimuat dengan sempurna.");
        }
        
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d');
        canvas.width = imageElement.naturalWidth;
        canvas.height = imageElement.naturalHeight;
        ctx.drawImage(imageElement, 0, 0);
    } else {
        throw new Error("Format gambar tidak didukung");
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and apply threshold
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const binary = avg > 127 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = binary;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = percent + '%';
    elements.progressPercent.textContent = percent + '%';
    elements.progressStatus.textContent = message;
}

function showError(message) {
    elements.result.textContent = "❌ " + message;
    elements.result.classList.add('text-red-600');
    setTimeout(() => {
        elements.result.classList.remove('text-red-600');
    }, 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}