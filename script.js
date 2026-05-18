=== script.js ===
// DOM элементы
const video = document.getElementById('previewVideo');
const playPauseBtn = document.getElementById('playPauseBtn');
const speedSelect = document.getElementById('speedSelect');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const addTextBtn = document.getElementById('addTextBtn');
const exportBtn = document.getElementById('exportBtn');
const splitBtn = document.getElementById('splitBtn');
const trimLeft = document.getElementById('trimLeft');
const trimRight = document.getElementById('trimRight');
const playhead = document.getElementById('playhead');
const timelineTrack = document.getElementById('timelineTrack');
const currentTimeDisplay = document.getElementById('currentTimeDisplay');
const durationDisplay = document.getElementById('durationDisplay');
const thumbnailsCanvas = document.getElementById('thumbnailsCanvas');
const textLayersList = document.getElementById('textLayersList');
const modal = document.getElementById('textModal');
const saveTextBtn = document.getElementById('saveTextBtn');
const exportProgress = document.getElementById('exportProgress');

// Состояние
let videoFile = null;
let trimStart = 0;
let trimEnd = 0;
let isPlaying = false;
let animationId = null;
let textLayers = [];
let draggingTrim = null;
let videoDuration = 0;

// Инициализация
function init() {
    loadDemoVideo();
    setupEventListeners();
    updateVolume();
    renderTextLayers();
}

function loadDemoVideo() {
    // Демо-видео (цветные полосы для теста)
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4ecdc4';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('Clip-АЮ', 250, 180);
    
    canvas.toBlob(blob => {
        const file = new File([blob], 'demo.mp4', { type: 'video/mp4' });
        const url = URL.createObjectURL(file);
        video.src = url;
        video.onloadedmetadata = () => {
            videoDuration = video.duration;
            trimEnd = videoDuration;
            durationDisplay.textContent = formatTime(videoDuration);
            generateThumbnails();
        };
    });
}

function setupEventListeners() {
    playPauseBtn.addEventListener('click', togglePlay);
    video.addEventListener('timeupdate', updatePlayhead);
    video.addEventListener('ended', () => { isPlaying = false; updatePlayPauseButton(); });
    speedSelect.addEventListener('change', () => video.playbackRate = parseFloat(speedSelect.value));
    volumeSlider.addEventListener('input', updateVolume);
    addTextBtn.addEventListener('click', () => modal.style.display = 'flex');
    exportBtn.addEventListener('click', exportVideo);
    splitBtn.addEventListener('click', splitVideo);
    timelineTrack.addEventListener('click', seekFromClick);
    trimLeft.addEventListener('mousedown', (e) => startTrimDrag('left', e));
    trimRight.addEventListener('mousedown', (e) => startTrimDrag('right', e));
    document.addEventListener('mousemove', onTrimDrag);
    document.addEventListener('mouseup', stopTrimDrag);
    
    // Модальное окно
    document.querySelector('.close').addEventListener('click', () => modal.style.display = 'none');
    saveTextBtn.addEventListener('click', addTextLayer);
    window.addEventListener('click', (e) => { if(e.target === modal) modal.style.display = 'none'; });
    
    // Drag & Drop загрузка
    const previewArea = document.querySelector('.preview-area');
    previewArea.addEventListener('dragover', (e) => e.preventDefault());
    previewArea.addEventListener('drop', handleFileDrop);
}

function handleFileDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if(file && file.type.startsWith('video/')) {
        loadVideo(file);
    }
}

function loadVideo(file) {
    videoFile = file;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
        videoDuration = video.duration;
        trimStart = 0;
        trimEnd = videoDuration;
        durationDisplay.textContent = formatTime(videoDuration);
        updateTrimUI();
        generateThumbnails();
        if(isPlaying) togglePlay();
    };
}

function togglePlay() {
    if(video.paused) {
        video.currentTime = trimStart;
        video.playbackRate = parseFloat(speedSelect.value);
        video.play();
        isPlaying = true;
        startPlayheadAnimation();
    } else {
        video.pause();
        isPlaying = false;
        stopPlayheadAnimation();
    }
    updatePlayPauseButton();
}

function updatePlayPauseButton() {
    playPauseBtn.innerHTML = isPlaying ? 
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' :
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
}

function updateVolume() {
    const vol = volumeSlider.value / 100;
    video.volume = Math.min(1, vol);
    volumeValue.textContent = volumeSlider.value + '%';
}

function updatePlayhead() {
    if(!video.paused && video.currentTime >= trimEnd) {
        video.pause();
        isPlaying = false;
        updatePlayPauseButton();
        video.currentTime = trimStart;
    }
    const percent = ((video.currentTime - trimStart) / (trimEnd - trimStart)) * 100;
    playhead.style.left = `calc(${Math.max(0, Math.min(100, percent))}%)`;
    currentTimeDisplay.textContent = formatTime(video.currentTime - trimStart);
}

function startPlayheadAnimation() {
    if(animationId) cancelAnimationFrame(animationId);
    function animate() {
        updatePlayhead();
        if(isPlaying && video.currentTime < trimEnd) {
            animationId = requestAnimationFrame(animate);
        }
    }
    animate();
}

function stopPlayheadAnimation() {
    if(animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function seekFromClick(e) {
    const rect = timelineTrack.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = trimStart + percent * (trimEnd - trimStart);
    video.currentTime = Math.min(trimEnd, Math.max(trimStart, newTime));
    updatePlayhead();
}

function splitVideo() {
    const splitTime = video.currentTime;
    if(splitTime > trimStart && splitTime < trimEnd) {
        alert('Разделение видео временно недоступно в демо-версии. Функционал будет добавлен в полной версии.');
    }
}

function startTrimDrag(side, e) {
    draggingTrim = side;
    e.preventDefault();
}

function onTrimDrag(e) {
    if(!draggingTrim) return;
    const rect = timelineTrack.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let percent = Math.max(0, Math.min(1, x / rect.width));
    let newTime = percent * videoDuration;
    
    if(draggingTrim === 'left') {
        trimStart = Math.max(0, Math.min(newTime, trimEnd - 0.1));
    } else {
        trimEnd = Math.min(videoDuration, Math.max(newTime, trimStart + 0.1));
    }
    
    updateTrimUI();
    if(video.currentTime < trimStart || video.currentTime > trimEnd) {
        video.currentTime = trimStart;
    }
}

function stopTrimDrag() {
    draggingTrim = null;
}

function updateTrimUI() {
    const leftPercent = (trimStart / videoDuration) * 100;
    const rightPercent = (trimEnd / videoDuration) * 100;
    const widthPercent = rightPercent - leftPercent;
    
    trimLeft.style.left = `${leftPercent}%`;
    trimRight.style.right = `${100 - rightPercent}%`;
    trimRegion.style.left = `${leftPercent}%`;
    trimRegion.style.width = `${widthPercent}%`;
}

function generateThumbnails() {
    if(!video.videoWidth) return;
    const canvas = thumbnailsCanvas;
    const ctx = canvas.getContext('2d');
    const numThumbs = 20;
    const thumbWidth = canvas.width / numThumbs;
    
    canvas.width = timelineTrack.clientWidth;
    canvas.height = 80;
    
    for(let i = 0; i < numThumbs; i++) {
        const time = (i / numThumbs) * videoDuration;
        video.currentTime = time;
        video.onseeked = () => {
            ctx.drawImage(video, i * thumbWidth, 0, thumbWidth, canvas.height);
        };
    }
}

function addTextLayer() {
    const text = document.getElementById('textInput').value;
    if(!text) return;
    
    const layer = {
        id: Date.now(),
        text: text,
        font: document.getElementById('fontSelect').value,
        fontSize: parseInt(document.getElementById('fontSize').value),
        color: document.getElementById('textColor').value,
        position: document.getElementById('positionSelect').value,
        startTime: parseFloat(document.getElementById('startTime').value),
        endTime: parseFloat(document.getElementById('endTime').value)
    };
    
    textLayers.push(layer);
    renderTextLayers();
    modal.style.display = 'none';
    document.getElementById('textInput').value = '';
}

function renderTextLayers() {
    textLayersList.innerHTML = textLayers.map(layer => `
        <div class="text-layer-item">
            <span>${layer.text.substring(0, 15)}</span>
            <button onclick="removeTextLayer(${layer.id})">✕</button>
        </div>
    `).join('');
}

window.removeTextLayer = (id) => {
    textLayers = textLayers.filter(l => l.id !== id);
    renderTextLayers();
};

async function exportVideo() {
    if(!video.videoWidth) {
        alert('Загрузите видео');
        return;
    }
    
    exportProgress.style.display = 'block';
    const progressFill = document.querySelector('.progress-fill');
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exported_video.webm';
        a.click();
        URL.revokeObjectURL(url);
        exportProgress.style.display = 'none';
        progressFill.style.width = '0%';
    };
    
    mediaRecorder.start();
    
    const duration = trimEnd - trimStart;
    const fps = 30;
    const totalFrames = Math.ceil(duration * fps);
    let currentFrame = 0;
    
    video.currentTime = trimStart;
    video.playbackRate = 1;
    
    function drawFrame() {
        if(currentFrame >= totalFrames) {
            mediaRecorder.stop();
            return;
        }
        
        const time = trimStart + (currentFrame / fps);
        video.currentTime = time;
        
        video.onseeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Отрисовка текстов
            textLayers.forEach(layer => {
                if(time >= layer.startTime && time <= layer.endTime) {
                    ctx.font = `${layer.fontSize}px ${layer.font}`;
                    ctx.fillStyle = layer.color;
                    ctx.shadowBlur = 0;
                    ctx.textAlign = 'center';
                    
                    let y;
                    if(layer.position === 'top') y = 50;
                    else if(layer.position === 'bottom') y = canvas.height - 50;
                    else y = canvas.height / 2;
                    
                    ctx.fillText(layer.text, canvas.width / 2, y);
                }
            });
            
            currentFrame++;
            const progress = (currentFrame / totalFrames) * 100;
            progressFill.style.width = `${progress}%`;
            
            setTimeout(drawFrame, 1000 / fps);
        };
    }
    
    drawFrame();
}

function formatTime(seconds) {
    if(isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Запуск
init();
