pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

// Dynamically load jsQR only when needed
let jsQRLoaded = false;
let jsQRScript = null;

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
    downloadBtn: document.getElementById('downloadBtn'),
    progressContainer: document.getElementById('progressContainer'),
    progressBar: document.getElementById('progressBar'),
    progressPercent: document.getElementById('progressPercent'),
    progressStatus: document.getElementById('progressStatus'),
    accuracyContainer: document.getElementById('accuracyContainer'),
    accuracyValue: document.getElementById('accuracyValue'),
    modeSelect: document.getElementById('modeSelect')
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
        elements.progressStatus.textContent = "Memuat dokumen PDF...";
        
        const arrayBuffer = await file.arrayBuffer();
        pdfDocument = await pdfjsLib.getDocument(arrayBuffer).promise;

        const totalPages = pdfDocument.numPages;
        elements.totalPages.textContent = totalPages;
        elements.pdfPreviewContainer.classList.remove('hidden');

        // Render first page for preview
        pdfImages = [];
        await renderPdfPage(1);
        
        elements.loading.classList.add('hidden');
        elements.processBtn.disabled = false;
    } catch (error) {
        showError("Gagal memuat PDF: " + error.message);
        console.error(error);
        elements.loading.classList.add('hidden');
    }
}

async function renderPdfPage(pageNumber) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    // Clear previous content
    elements.pdfPreview.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.alt = `Halaman ${pageNumber}`;
    elements.pdfPreview.appendChild(img);
    
    // Save canvas for processing
    pdfImages[pageNumber - 1] = canvas;
    
    elements.currentPage.textContent = pageNumber;
    elements.prevPage.disabled = pageNumber <= 1;
    elements.nextPage.disabled = pageNumber >= pdfDocument.numPages;
}

// Event listeners
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

elements.prevPage.addEventListener('click', async () => {
    if (currentPdfPage > 1) {
        currentPdfPage--;
        await renderPdfPage(currentPdfPage);
    }
});

elements.nextPage.addEventListener('click', async () => {
    if (currentPdfPage < pdfDocument.numPages) {
        currentPdfPage++;
        await renderPdfPage(currentPdfPage);
    }
});

elements.clearBtn.addEventListener('click', () => {
    resetApplication();
});

elements.modeSelect.addEventListener('change', () => {
    // When mode changes, reset the application
    resetApplication();
});

function resetApplication() {
    elements.fileInput.value = '';
    elements.imagePreviewContainer.classList.add('hidden');
    elements.pdfPreviewContainer.classList.add('hidden');
    elements.fileInfo.classList.add('hidden');
    elements.processBtn.disabled = true;
    elements.result.textContent = '';
    elements.copyBtn.classList.add('hidden');
    elements.downloadBtn.classList.add('hidden');
    elements.progressContainer.classList.add('hidden');
    elements.accuracyContainer.classList.add('hidden');
    selectedFile = null;
    pdfDocument = null;
    pdfImages = [];
}

elements.copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.result.textContent)
        .then(() => {
            const originalText = elements.copyBtn.textContent;
            elements.copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>Tersalin!';
            setTimeout(() => {
                elements.copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Salin';
            }, 2000);
        });
});

elements.downloadBtn.addEventListener('click', () => {
    const blob = new Blob([elements.result.textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile ? `hasil-${selectedFile.name.split('.')[0]}.txt` : 'hasil-ocr.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

elements.processBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        showError("Silakan pilih file terlebih dahulu");
        return;
    }

    const mode = elements.modeSelect.value;
    
    if (mode === "qr") {
        await processQRCode();
    } else {
        await processOCR();
    }
});

async function loadJSQR() {
    return new Promise((resolve, reject) => {
        if (typeof jsQR !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Gagal memuat jsQR'));
        document.head.appendChild(script);
    });
}

async function processQRCode() {
    try {
        
        if (typeof jsQR === 'undefined'){
            await loadJSQR();
        }
        
        if (elements.result) elements.result.textContent = '';
        elements.loading?.classList.remove('hidden');
        elements.progressContainer?.classList.remove('hidden');
        elements.copyBtn?.classList.add('hidden');
        elements.downloadBtn?.classList.add('hidden');
        elements.processBtn.disabled = true;
        if (elements.progressStatus) elements.progressStatus.textContent = "Mempersiapkan pemindai QR...";

        let found = false;
        let resultText = '';

        const scanImage = async (imgElement) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imgElement.naturalWidth || imgElement.width;
            canvas.height = imgElement.naturalHeight || imgElement.height;
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, canvas.width, canvas.height, {
                inversionAttempts: 'dontInvert',
            });

            return code ? code.data : null;
        };

        if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
            if (!pdfDocument) {
                const arrayBuffer = await selectedFile.arrayBuffer();
                pdfDocument = await pdfjsLib.getDocument(arrayBuffer).promise;
            }

            const totalPages = pdfDocument.numPages;
            
            for (let i = 1; i <= totalPages; i++) {
                updateProgress(Math.round((i / totalPages) * 50), `Memindai halaman ${i}/${totalPages}...`);
                
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

                const result = await scanImage(canvas);
                if (result) {
                    found = true;
                    resultText += `=== QR DITEMUKAN PADA HALAMAN ${i} ===\n${result}\n\n`;
                }
            }
        } else {
            updateProgress(50, 'Memindai gambar...');
            const result = await scanImage(elements.imagePreview);
            if (result) {
                found = true;
                resultText = result;
            }
        }

        if (found) {
            elements.result.textContent = resultText;
            elements.copyBtn.classList.remove('hidden');
            elements.downloadBtn.classList.remove('hidden');
            updateProgress(100, 'QR Code berhasil ditemukan!');
        } else {
            showError('Tidak ditemukan QR Code dalam dokumen.');
            updateProgress(100, 'Pemindaian selesai');
        }
    } catch (error) {
        showError("Terjadi kesalahan saat memindai QR: " + error.message);
        console.error("QR Scan Error:", error);
    } finally {
        elements.loading?.classList.add('hidden');
        elements.processBtn.disabled = false;
    }
}

async function processOCR() {
    if (!selectedFile) {
        showError("Silakan pilih file terlebih dahulu");
        return;
    }

    elements.result.textContent = '';
    elements.loading.classList.remove('hidden');
    elements.processBtn.disabled = true;
    elements.progressContainer.classList.remove('hidden');
    elements.copyBtn.classList.add('hidden');
    elements.downloadBtn.classList.add('hidden');

    try {
        let results = [];
        
        if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
            if (!pdfDocument) {
                const arrayBuffer = await selectedFile.arrayBuffer();
                pdfDocument = await pdfjsLib.getDocument(arrayBuffer).promise;
            }

            const totalPages = pdfDocument.numPages;
            
            for (let i = 1; i <= totalPages; i++) {
                updateProgress(Math.round(((i-1) / totalPages) * 100), `Memproses halaman ${i}/${totalPages}...`);
                
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

                const processedImage = await preprocessImage(canvas);
                const text = await runOCR(processedImage);
                
                if (text.trim()) {
                    results.push(`=== HALAMAN ${i} ===\n${text}\n`);
                }
            }
            
            elements.result.textContent = results.join('\n');
        } else {
            updateProgress(0, 'Memproses gambar...');
            const processedImage = await preprocessImage(elements.imagePreview);
            const text = await runOCR(processedImage);
            elements.result.textContent = text;
        }
        
        updateProgress(100, 'Selesai!');
        elements.copyBtn.classList.remove('hidden');
        elements.downloadBtn.classList.remove('hidden');
        updateAccuracyIndicator('Sedang');
    } catch (error) {
        showError("Terjadi kesalahan: " + error.message);
        console.error(error);
    } finally {
        elements.loading.classList.add('hidden');
        elements.processBtn.disabled = false;
    }
}

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
        canvas = imageElement;
        ctx = canvas.getContext('2d');
    } else if (imageElement instanceof HTMLImageElement) {
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
    
    // Apply simple thresholding
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const binary = avg > 180 ? 255 : 0; // Adjust threshold as needed
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

function updateAccuracyIndicator(accuracy) {
    elements.accuracyContainer.classList.remove('hidden');
    elements.accuracyValue.textContent = accuracy;
    
    const indicator = elements.accuracyContainer.querySelector('.w-2.h-2');
    indicator.className = 'w-2 h-2 mr-2 rounded-full';
    
    if (accuracy === 'Tinggi') {
        indicator.classList.add('bg-green-400');
    } else if (accuracy === 'Sedang') {
        indicator.classList.add('bg-yellow-400');
    } else {
        indicator.classList.add('bg-red-400');
    }
}

function showError(message) {
    if (elements.result) {
        elements.result.textContent = "❌ " + message;
        elements.result.classList.add('text-red-400');
        setTimeout(() => {
            if (elements.result) {
                elements.result.classList.remove('text-red-400');
            }
        }, 3000);
    } else {
        console.error("Error: " + message);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function resetResultDisplay() {
    if (elements.result) {
        elements.result.innerHTML = '<p class="text-gray-400 italic">Hasil konversi akan muncul di sini...</p>';
        elements.result.classList.remove('hidden', 'text-red-400');
    }
}

// Panggil fungsi ini saat:
// - Aplikasi pertama kali load
// - Tombol clear diklik
// - Sebelum memulai proses baru

// Contoh dalam clearBtn event listener:
elements.clearBtn.addEventListener('click', () => {
    resetApplication();
    resetResultDisplay();
});