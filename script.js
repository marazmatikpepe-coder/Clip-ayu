=== script.js ===
// DOM элементы
const video = document.getElementById('previewVideo');
const playPauseBtn = document.getElementById('largePlayBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const currentTimeSpan = document.getElementById('currentTime');
const totalTimeSpan = document.getElementById('totalTime');
const timelineTrack = document.getElementById('timelineTrack');
const playhead = document.getElementById('playhead');
const trimLeft = document.getElementById('trimLeft');
const trimRight = document.getElementById('trimRight');
const trimRegion = document.getElementById('trimRegion');
const setTrimStartBtn = document.getElementById('setTrimStartBtn');
const setTrimEndBtn = document.getElementById('setTrimEndBtn');
const resetTrimBtn = document.getElementById('resetTrimBtn');
const splitBtn = document.getElementById('splitBtn');
const deleteSegmentBtn = document.getElementById('deleteSegmentBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const addTextBtn = document.getElementById('addTextBtn');
const textLayersList = document.getElementById('textLayersList');
const modal = document.getElementById('textModal');
const saveTextBtn = document.getElementById('saveTextBtn');
const exportProgress = document.getElementById('exportProgress');
const audioFileInput = document.getElementById('audioFileInput');
const removeAudioBtn = document.getElementById('removeAudioBtn');
const bgmVolume = document.getElementById('bgmVolume');
const rotateLeftBtn = document.getElementById('rotateLeftBtn');
const flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
const flipVerticalBtn = document.getElementById('flipVerticalBtn');
const overlayColor = document.getElementById('overlayColor');
const overlayOpacity = document.getElementById('overlayOpacity');
const opacityValue = document.getElementById('opacityValue');

// Состояние приложения
let videoFile = null;
let trimStart = 0;
let trimEnd = 0;
let videoDuration = 0;
let isPlaying = false;
let currentZoom = 1;
let rotation = 0;
let flipH = false;
let flipV = false;
let currentFilter = 'none';
let textLayers = [];
let bgmAudio = null;
let bgmUrl = null;
let animationId = null;
let draggingTrim = null;

// Инициализация
function init() {
    createDemoVideo();
    setupEventListeners();
    setupTabs();
    setupTextStrokeToggle();
    generateTimelineRuler();
}

function createDemoVideo() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    
    // Создаем красивое демо-видео
    let frame = 0;
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        video.src = url;
        video.onloadedmetadata = () => {
            videoDuration = video.duration;
            trimEnd = videoDuration;
            totalTimeSpan.textContent = formatTimeHMS(videoDuration);
            updateTrimUI();
        };
    };
    
    recorder.start();
    
    const interval = setInterval(() => {
        if(frame >= 300) {
            clearInterval(interval);
            recorder.stop();
            return;
        }
        
        const time = frame / 30;
        ctx.fillStyle = `hsl(${frame * 2 % 360}, 70%, 50%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Clip-АЮ', canvas.width/2, canvas.height/2 - 50);
        
        ctx.font = '30px Arial';
        ctx.fillStyle = '#ffbe0b';
        ctx.fillText('Профессиональный видеоредактор', canvas.width/2, canvas.height/2 + 50);
        
        ctx.font = '20px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`Время: ${time.toFixed(1)}с`, canvas.width/2, canvas.height - 50);
        
        frame++;
    }, 33);
}

function setupEventListeners() {
    playPauseBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);
    video.addEventListener('timeupdate', updatePlayhead);
    video.addEventListener('ended', () => { isPlaying = false; updatePlayButton(); });
    
    volumeSlider.addEventListener('input', () => {
        const vol = volumeSlider.value / 100;
        video.volume = Math.min(1, vol);
        volumeValue.textContent = volumeSlider.value + '%';
    });
    
    exportBtn.addEventListener('click', exportVideo);
    importBtn.addEventListener('click', () => document.createElement('input').click());
    
    setTrimStartBtn.addEventListener('click', () => {
        trimStart = video.currentTime;
        updateTrimUI();
    });
    
    setTrimEndBtn.addEventListener('click', () => {
        trimEnd = video.currentTime;
        updateTrimUI();
    });
    
    resetTrimBtn.addEventListener('click', () => {
        trimStart = 0;
        trimEnd = videoDuration;
        updateTrimUI();
    });
    
    splitBtn.addEventListener('click', splitVideo);
    deleteSegmentBtn.addEventListener('click', deleteSegment);
    zoomInBtn.addEventListener('click', () => { currentZoom = Math.min(3, currentZoom + 0.2); updateTimelineZoom(); });
    zoomOutBtn.addEventListener('click', () => { currentZoom = Math.max(0.5, currentZoom - 0.2); updateTimelineZoom(); });
    
    timelineTrack.addEventListener('click', seekFromClick);
    trimLeft.addEventListener('mousedown', (e) => startTrimDrag('left', e));
    trimRight.addEventListener('mousedown', (e) => startTrimDrag('right', e));
    document.addEventListener('mousemove', onTrimDrag);
    document.addEventListener('mouseup', stopTrimDrag);
    
    addTextBtn.addEventListener('click', () => modal.style.display = 'flex');
    document.querySelector('.close').addEventListener('click', () => modal.style.display = 'none');
    saveTextBtn.addEventListener('click', addTextLayer);
    window.addEventListener('click', (e) => { if(e.target === modal) modal.style.display = 'none'; });
    
    // Скорость
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            video.playbackRate = parseFloat(btn.dataset.speed);
        });
    });
    
    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyVideoEffects();
        });
    });
    
    // Трансформации
    rotateLeftBtn.addEventListener('click', () => {
        rotation = (rotation + 90) % 360;
        applyVideoEffects();
    });
    
    flipHorizontalBtn.addEventListener('click', () => {
        flipH = !flipH;
        applyVideoEffects();
    });
    
    flipVerticalBtn.addEventListener('click', () => {
        flipV = !flipV;
        applyVideoEffects();
    });
    
    // Аудио
    audioFileInput.addEventListener('change', loadBackgroundMusic);
    removeAudioBtn.addEventListener('click', removeBackgroundMusic);
    bgmVolume.addEventListener('input', updateBGMVolume);
    
    overlayOpacity.addEventListener('input', () => {
        opacityValue.textContent = overlayOpacity.value;
        applyVideoEffects();
    });
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
        });
    });
}

function setupTextStrokeToggle() {
    const strokeCheck = document.getElementById('textStroke');
    const strokeColor = document.getElementById('strokeColor');
    const strokeWidth = document.getElementById('strokeWidth');
    
    strokeCheck.addEventListener('change', () => {
        strokeColor.disabled = !strokeCheck.checked;
        strokeWidth.disabled = !strokeCheck.checked;
    });
}

function applyVideoEffects() {
    let transform = `rotate(${rotation}deg)`;
    if(flipH) transform += ` scaleX(-1)`;
    if(flipV) transform += ` scaleY(-1)`;
    video.style.transform = transform;
    video.style.filter = currentFilter;
}

function togglePlay() {
    if(video.paused) {
        video.currentTime = trimStart;
        video.play();
        isPlaying = true;
        startPlayheadAnimation();
    } else {
        video.pause();
        isPlaying = false;
        stopPlayheadAnimation();
    }
    updatePlayButton();
}

function updatePlayButton() {
    const btn = document.getElementById('largePlayBtn');
    btn.textContent = isPlaying ? '⏸' : '▶';
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

function updatePlayhead() {
    if(video.currentTime >= trimEnd) {
        video.pause();
        isPlaying = false;
        updatePlayButton();
        video.currentTime = trimStart;
    }
    
    const percent = ((video.currentTime - trimStart) / (trimEnd - trimStart)) * 100;
    playhead.style.left = `calc(${Math.max(0, Math.min(100, percent))}%)`;
    currentTimeSpan.textContent = formatTimeHMS(video.currentTime - trimStart);
}

function seekFromClick(e) {
    const rect = timelineTrack.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = trimStart + percent * (trimEnd - trimStart);
    video.currentTime = Math.min(trimEnd, Math.max(trimStart, newTime));
    updatePlayhead();
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

function splitVideo() {
    const splitTime = video.currentTime;
    if(splitTime > trimStart && splitTime < trimEnd) {
        alert(`✂️ Видео разделено в ${splitTime.toFixed(2)}с\n(Функция разделения готова к интеграции с медиа-сегментами)`);
    }
}

function deleteSegment() {
    alert('🗑️ Удаление сегмента (будет в полной версии)');
}

function updateTimelineZoom() {
    // Масштабирование таймлайна
    console.log('Zoom:', currentZoom);
}

function generateTimelineRuler() {
    const ruler = document.getElementById('timelineRuler');
    ruler.innerHTML = '';
    for(let i = 0; i <= 10; i++) {
        const mark = document.createElement('div');
        mark.style.position = 'absolute';
        mark.style.left = `${i * 10}%`;
        mark.style.bottom = '0';
        mark.style.fontSize = '10px';
        mark.style.color = '#aaa';
        mark.textContent = `${(videoDuration * i / 10).toFixed(1)}s`;
        ruler.appendChild(mark);
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
        endTime: parseFloat(document.getElementById('endTime').value),
        stroke: document.getElementById('textStroke').checked,
        strokeColor: document.getElementById('strokeColor').value,
        strokeWidth: parseInt(document.getElementById('strokeWidth').value),
        enterAnim: document.getElementById('enterAnimation').value,
        exitAnim: document.getElementById('exitAnimation').value
    };
    
    textLayers.push(layer);
    renderTextLayers();
    modal.style.display = 'none';
    clearTextForm();
}

function clearTextForm() {
    document.getElementById('textInput').value = '';
    document.getElementById('startTime').value = '0';
    document.getElementById('endTime').value = '5';
    document.getElementById('textStroke').checked = false;
}

function renderTextLayers() {
    textLayersList.innerHTML = textLayers.map(layer => `
        <div class="text-layer-item">
            <div class="text-layer-info">
                <div class="text-layer-text">${layer.text.substring(0, 30)}</div>
                <div class="text-layer-time">${layer.startTime.toFixed(1)}с - ${layer.endTime.toFixed(1)}с</div>
            </div>
            <div class="text-layer-actions">
                <button onclick="editTextLayer(${layer.id})">✏️</button>
                <button onclick="removeTextLayer(${layer.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

window.removeTextLayer = (id) => {
    textLayers = textLayers.filter(l => l.id !== id);
    renderTextLayers();
};

window.editTextLayer = (id) => {
    const layer = textLayers.find(l => l.id === id);
    if(layer) {
        alert(`Редактирование: ${layer.text}\n(Функция редактирования будет добавлена)`);
    }
};

function loadBackgroundMusic(e) {
    const file = e.target.files[0];
    if(file) {
        if(bgmUrl) URL.revokeObjectURL(bgmUrl);
        bgmUrl = URL.createObjectURL(file);
        bgmAudio = new Audio(bgmUrl);
        bgmAudio.loop = true;
        bgmAudio.volume = bgmVolume.value / 100;
        document.getElementById('audioInfo').innerHTML = `🎵 ${file.name}`;
    }
}

function removeBackgroundMusic() {
    if(bgmAudio) {
        bgmAudio.pause();
        URL.revokeObjectURL(bgmUrl);
        bgmAudio = null;
        document.getElementById('audioInfo').innerHTML = '';
        audioFileInput.value = '';
    }
}

function updateBGMVolume() {
    if(bgmAudio) {
        bgmAudio.volume = bgmVolume.value / 100;
    }
}

async function exportVideo() {
    if(!video.videoWidth) {
        alert('Пожалуйста, загрузите видео');
        return;
    }
    
    exportProgress.style.display = 'block';
    const progressFill = document.querySelector('.progress-fill');
    const exportPercent = document.getElementById('exportPercent');
    const exportStatus = document.getElementById('exportStatus');
    
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
        a.download = `clip-ayu_export_${Date.now()}.webm`;
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
    
    if(bgmAudio) {
        bgmAudio.currentTime = 0;
        bgmAudio.play();
    }
    
    video.currentTime = trimStart;
    video.playbackRate = 1;
    
    function drawFrame() {
        if(currentFrame >= totalFrames) {
            mediaRecorder.stop();
            if(bgmAudio) bgmAudio.pause();
            return;
        }
        
        const time = trimStart + (currentFrame / fps);
        video.currentTime = time;
        
        video.onseeked = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Применяем overlay
            if(overlayOpacity.value > 0) {
                ctx.fillStyle = overlayColor.value;
                ctx.globalAlpha = overlayOpacity.value / 100;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1;
            }
            
            // Рисуем текст
            textLayers.forEach(layer => {
                if(time >= layer.startTime && time <= layer.endTime) {
                    let opacity = 1;
                    let animOffset = 0;
                    
                    // Анимации
                    const animDuration = 0.5;
                    if(layer.enterAnim !== 'none' && time - layer.startTime < animDuration) {
                        const progress = (time - layer.startTime) / animDuration;
                        if(layer.enterAnim === 'fadeIn') opacity = progress;
                        else if(layer.enterAnim === 'slideInLeft') animOffset = (1 - progress) * 200;
                        else if(layer.enterAnim === 'zoomIn') ctx.scale(progress, progress);
                    }
                    
                    if(layer.exitAnim !== 'none' && layer.endTime - time < animDuration) {
                        const progress = (layer.endTime - time) / animDuration;
                        if(layer.exitAnim === 'fadeOut') opacity = progress;
                    }
                    
                    ctx.save();
                    ctx.globalAlpha = opacity;
                    ctx.font = `${layer.fontSize}px ${layer.font}`;
                    ctx.fillStyle = layer.color;
                    ctx.textAlign = 'center';
                    
                    if(layer.stroke) {
                        ctx.strokeStyle = layer.strokeColor;
                        ctx.lineWidth = layer.strokeWidth;
                        ctx.strokeText(layer.text, canvas.width/2 + animOffset, getYPosition(layer.position, canvas.height));
                    }
                    
                    ctx.fillText(layer.text, canvas.width/2 + animOffset, getYPosition(layer.position, canvas.height));
                    ctx.restore();
                }
            });
            
            currentFrame++;
            const progress = (currentFrame / totalFrames) * 100;
            progressFill.style.width = `${progress}%`;
            exportPercent.textContent = `${Math.floor(progress)}%`;
            exportStatus.textContent = `Кадр ${currentFrame}/${totalFrames}`;
            
            setTimeout(drawFrame, 1000 / fps);
        };
    }
    
    drawFrame();
}

function getYPosition(position, height) {
    const positions = {
        'top-left': 50, 'top-center': 50, 'top-right': 50,
        'center-left': height/2, 'center': height/2, 'center-right': height/2,
        'bottom-left': height - 50, 'bottom-center': height - 50, 'bottom-right': height - 50
    };
    return positions[position] || height/2;
}

function formatTimeHMS(seconds) {
    if(isNaN(seconds)) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if(hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Запуск
init();
