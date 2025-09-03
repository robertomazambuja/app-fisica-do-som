// O 'defer' no HTML garante que este script só rode após o HTML ser carregado.

// --- Variáveis Globais ---
let audioContextStarted = false;
let synth, polySynth;
let currentWaveType = 'sine';
let animationFrameId;
let standingWaveAnimationId;
let time = 0;
const F0 = 110; // Frequência fundamental (A2)

// --- Inicialização de Áudio ---
async function initializeAudio() {
    if (!audioContextStarted) {
        await Tone.start();
        console.log('Contexto de áudio iniciado.');
        synth = new Tone.Synth({ oscillator: { type: currentWaveType } }).toDestination();
        polySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            volume: -12
        }).toDestination();
        audioContextStarted = true;
    }
}

// --- SEÇÃO 1-3: ONDA VIAJANTE ---
const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');
const frequencySlider = document.getElementById('frequencySlider');
const amplitudeSlider = document.getElementById('amplitudeSlider');
const timbreButtons = document.querySelectorAll('.timbre-btn');

function resizeCanvas(canvasEl) {
    if (!canvasEl) return;
    canvasEl.width = canvasEl.clientWidth;
    canvasEl.height = canvasEl.clientHeight;
}

function drawTravelingWave() {
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    const frequency = parseFloat(frequencySlider.value);
    const amplitude = parseFloat(amplitudeSlider.value) * (height / 2.2);
    const wavePeriod = width / (frequency / 100);

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c5a05b';

    for (let x = 0; x < width; x++) {
        const angle = (x / wavePeriod) * 2 * Math.PI;
        let y;
        switch (currentWaveType) {
            case 'square': y = (height / 2) - (Math.sin(angle) >= 0 ? amplitude : -amplitude); break;
            case 'sawtooth': y = (height / 2) - amplitude * (2 * (angle / (2 * Math.PI) - Math.floor(0.5 + angle / (2 * Math.PI)))); break;
            case 'triangle': y = (height / 2) - ((2 * amplitude) / Math.PI) * Math.asin(Math.sin(angle)); break;
            case 'sine': default: y = (height / 2) - amplitude * Math.sin(angle); break;
        }
        ctx.lineTo(x, y);
    }
    ctx.stroke();
    animationFrameId = requestAnimationFrame(drawTravelingWave);
}

function updateSound() {
    if (synth) {
        const freqValue = parseFloat(frequencySlider.value);
        const ampValue = parseFloat(amplitudeSlider.value);
        const volume = ampValue > 0 ? Tone.gainToDb(ampValue) : -Infinity;
        synth.frequency.value = freqValue;
        synth.volume.value = volume;
        synth.oscillator.type = currentWaveType;
    }
}

[frequencySlider, amplitudeSlider].forEach(slider => {
    slider.addEventListener('input', updateSound);
    const startEvent = async () => {
        await initializeAudio();
        if (synth) {
            updateSound();
            synth.triggerAttack(parseFloat(frequencySlider.value));
        }
        cancelAnimationFrame(animationFrameId);
        drawTravelingWave();
    };
    const endEvent = () => {
        if (synth) synth.triggerRelease();
        cancelAnimationFrame(animationFrameId);
    };
    slider.addEventListener('mousedown', startEvent);
    slider.addEventListener('mouseup', endEvent);
    slider.addEventListener('touchstart', (e) => { e.preventDefault(); startEvent(); }, { passive: false });
    slider.addEventListener('touchend', endEvent);
});

timbreButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentWaveType = button.dataset.wave;
        timbreButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        if (synth && synth.signal.value > 0) {
            synth.oscillator.type = currentWaveType;
        }
    });
});

// --- SEÇÃO 4: ONDAS ESTACIONÁRIAS ---
const stringCanvas = document.getElementById('stringCanvas');
const stringCtx = stringCanvas.getContext('2d');
const stringHarmonicsContainer = document.getElementById('stringHarmonicsContainer');
const stringInfo = document.getElementById('stringInfo');

const tubeCanvas = document.getElementById('tubeCanvas');
const tubeCtx = tubeCanvas.getContext('2d');
const tubeHarmonicsContainer = document.getElementById('tubeHarmonicsContainer');
const tubeInfo = document.getElementById('tubeInfo');

const closedTubeCanvas = document.getElementById('closedTubeCanvas');
const closedTubeCtx = closedTubeCanvas.getContext('2d');
const closedTubeHarmonicsContainer = document.getElementById('closedTubeHarmonicsContainer');
const closedTubeInfo = document.getElementById('closedTubeInfo');

const oscillationSpeedSlider = document.getElementById('oscillationSpeedSlider');
const speedLabel = document.getElementById('speedLabel');

let activeStringHarmonics = [1];
let activeTubeHarmonics = [1];
let activeClosedTubeHarmonics = [1];
let oscillationSpeed = 0.1;

function drawStandingWaveString(harmonics) {
    if (!stringCanvas) return;
    const width = stringCanvas.width;
    const height = stringCanvas.height;
    const baseAmplitude = height / 3;
    stringCtx.clearRect(0, 0, width, height);
    stringCtx.lineWidth = 2;
    stringCtx.strokeStyle = '#c5a05b';
    stringCtx.beginPath();

    for (let x = 0; x < width; x++) {
        let totalY = 0;
        harmonics.forEach(n => {
            const amplitude = baseAmplitude / n;
            totalY += Math.sin(n * Math.PI * x / width) * Math.cos(time * n) * amplitude;
        });
        if (x === 0) stringCtx.moveTo(x, height / 2 + totalY);
        else stringCtx.lineTo(x, height / 2 + totalY);
    }
    stringCtx.stroke();

    if (harmonics.length === 1) {
        const n = harmonics[0];
        stringInfo.innerHTML = `Observe os <strong class="text-red-400">Nós</strong> e <strong class="text-green-400">Ventres</strong>.`;
        stringCtx.fillStyle = '#ef4444';
        for (let i = 0; i <= n; i++) {
            stringCtx.beginPath();
            stringCtx.arc(i * (width / n), height / 2, 5, 0, 2 * Math.PI);
            stringCtx.fill();
        }
        stringCtx.fillStyle = '#4ade80';
        for (let i = 0; i < n; i++) {
            stringCtx.beginPath();
            stringCtx.arc((i + 0.5) * (width / n), height / 2, 5, 0, 2 * Math.PI);
            stringCtx.fill();
        }
    } else {
         stringInfo.textContent = "Com múltiplos harmônicos, a onda se torna complexa.";
    }
}

function drawStandingWaveTube(harmonics) {
    if (!tubeCanvas) return;
    const width = tubeCanvas.width;
    const height = tubeCanvas.height;
    const baseAmplitude = height / 4;
    tubeCtx.clearRect(0, 0, width, height);

    const tubeWallThickness = 8;
    const tubeInnerHeight = baseAmplitude * 2.2;
    tubeCtx.fillStyle = '#6b7280';
    tubeCtx.fillRect(0, (height / 2) - tubeInnerHeight - tubeWallThickness, width, tubeWallThickness);
    tubeCtx.fillRect(0, (height / 2) + tubeInnerHeight, width, tubeWallThickness);

    tubeCtx.beginPath();
    tubeCtx.strokeStyle = '#c5a05b';
    tubeCtx.lineWidth = 2;
    for (let x = 0; x < width; x++) {
        let totalY = 0;
        harmonics.forEach(n => {
            const amplitude = baseAmplitude / n;
            totalY += Math.cos(n * Math.PI * x / width) * Math.cos(time * n) * amplitude;
        });
        if (x === 0) tubeCtx.moveTo(x, height / 2 + totalY);
        else tubeCtx.lineTo(x, height / 2 + totalY);
    }
    tubeCtx.stroke();

    if (harmonics.length === 1) {
        const n = harmonics[0];
        tubeInfo.innerHTML = `Observe os <strong class="text-red-400">Nós</strong> e <strong class="text-green-400">Ventres</strong>.`;
        tubeCtx.fillStyle = '#4ade80';
        for (let i = 0; i <= n; i++) {
            tubeCtx.beginPath();
            tubeCtx.arc(i * (width / n), height / 2, 5, 0, 2 * Math.PI);
            tubeCtx.fill();
        }
        tubeCtx.fillStyle = '#ef4444';
        for (let i = 0; i < n; i++) {
            tubeCtx.beginPath();
            tubeCtx.arc((i + 0.5) * (width / n), height / 2, 5, 0, 2 * Math.PI);
            tubeCtx.fill();
        }
    } else {
        tubeInfo.textContent = "A superposição de ondas cria um padrão complexo.";
    }
}

function drawStandingWaveClosedTube(harmonics) {
    if (!closedTubeCanvas) return;
    const width = closedTubeCanvas.width;
    const height = closedTubeCanvas.height;
    const baseAmplitude = height / 3.5;
    closedTubeCtx.clearRect(0, 0, width, height);

    const tubeWallThickness = 8;
    const tubeInnerHeight = baseAmplitude * 2.2;
    closedTubeCtx.fillStyle = '#6b7280';
    closedTubeCtx.fillRect(0, (height / 2) - tubeInnerHeight - tubeWallThickness, width, tubeWallThickness);
    closedTubeCtx.fillRect(0, (height / 2) + tubeInnerHeight, width, tubeWallThickness);
    closedTubeCtx.fillRect(width - tubeWallThickness, (height / 2) - tubeInnerHeight - tubeWallThickness, tubeWallThickness, (tubeInnerHeight * 2) + (tubeWallThickness*2));

    closedTubeCtx.beginPath();
    closedTubeCtx.strokeStyle = '#c5a05b';
    closedTubeCtx.lineWidth = 2;
    for (let x = 0; x < width; x++) {
        let totalY = 0;
        harmonics.forEach(n => {
            const amplitude = baseAmplitude / n;
            totalY += Math.cos(n * Math.PI * x / (2 * width)) * Math.cos(time * n) * amplitude;
        });
        if (x === 0) closedTubeCtx.moveTo(x, height / 2 + totalY);
        else closedTubeCtx.lineTo(x, height / 2 + totalY);
    }
    closedTubeCtx.stroke();
    
    if (harmonics.length === 1) {
        const n = harmonics[0];
        closedTubeInfo.innerHTML = `Observe os <strong class="text-red-400">Nós</strong> e <strong class="text-green-400">Ventres</strong>.`;
        closedTubeCtx.fillStyle = '#4ade80';
        for (let i = 0; (2*i) < n; i++) {
            const x = (2 * i) * (width / n);
            closedTubeCtx.beginPath();
            closedTubeCtx.arc(x, height / 2, 5, 0, 2 * Math.PI);
            closedTubeCtx.fill();
        }
        closedTubeCtx.fillStyle = '#ef4444';
        for (let i = 0; (2*i + 1) <= n; i++) {
            const x = (2 * i + 1) * (width / n);
            closedTubeCtx.beginPath();
            closedTubeCtx.arc(x, height / 2, 5, 0, 2 * Math.PI);
            closedTubeCtx.fill();
        }
    } else {
        closedTubeInfo.textContent = "A superposição de ondas cria um padrão complexo.";
    }
}

function animateStandingWaves() {
    time += oscillationSpeed;
    drawStandingWaveString(activeStringHarmonics);
    drawStandingWaveTube(activeTubeHarmonics);
    drawStandingWaveClosedTube(activeClosedTubeHarmonics);
    
    if(isShofarPlaying) {
        drawShofarWave(shofarRecipe);
    }

    standingWaveAnimationId = requestAnimationFrame(animateStandingWaves);
}

function playHarmonicsSound(harmonics, fundamental) {
    if (!polySynth) return;
    
    const frequencies = harmonics.map(n => fundamental * n);

    polySynth.releaseAll();
    polySynth.triggerAttack(frequencies, Tone.now());
    setTimeout(() => {
        if (polySynth) polySynth.releaseAll();
    }, 700);
}

function setupHarmonicSelectors(container, activeHarmonicsArray) {
    if (!container) return;
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            await initializeAudio();
            const harmonic = parseInt(button.dataset.harmonic);
            button.classList.toggle('active');
            
            const index = activeHarmonicsArray.indexOf(harmonic);
            if (index > -1) {
                if (activeHarmonicsArray.length > 1) {
                    activeHarmonicsArray.splice(index, 1);
                } else {
                    button.classList.add('active');
                }
            } else {
                activeHarmonicsArray.push(harmonic);
            }
            playHarmonicsSound(activeHarmonicsArray, F0);
        });
    });
}

// --- SEÇÃO 5: ANALISADOR DO SHOFAR ---
const playShofarButton = document.getElementById('playShofarButton');
const analyzerCanvas = document.getElementById('analyzerCanvas');
const analyzerCtx = analyzerCanvas.getContext('2d');
const shofarWaveCanvas = document.getElementById('shofarWaveCanvas');
const shofarWaveCtx = shofarWaveCanvas.getContext('2d');

const shofarRecipe = [
    { harmonic: 1, amp: 1.0 },
    { harmonic: 3, amp: 0.6 },
    { harmonic: 5, amp: 0.3 },
    { harmonic: 7, amp: 0.15 }
];
let isShofarPlaying = false;

function drawAnalyzer(recipe) {
    if (!analyzerCanvas) return;
    const width = analyzerCanvas.width;
    const height = analyzerCanvas.height;
    const barWidth = width / (recipe.length * 2);
    analyzerCtx.clearRect(0, 0, width, height);
    
    recipe.forEach((item, index) => {
        const barHeight = item.amp * (height * 0.9);
        const x = (index * 2 + 0.5) * barWidth;
        const y = height - barHeight;

        analyzerCtx.fillStyle = '#c5a05b';
        analyzerCtx.fillRect(x, y, barWidth, barHeight);

        analyzerCtx.fillStyle = '#f0f0f0';
        analyzerCtx.textAlign = 'center';
        analyzerCtx.fillText(`${item.harmonic}º`, x + barWidth / 2, height - 5);
    });
}

function drawShofarWave(recipe) {
    if (!shofarWaveCanvas) return;
    const width = shofarWaveCanvas.width;
    const height = shofarWaveCanvas.height;
    const baseAmplitude = height / 4;
    shofarWaveCtx.clearRect(0, 0, width, height);
    shofarWaveCtx.beginPath();
    shofarWaveCtx.strokeStyle = 'rgba(255, 223, 186, 0.7)';
    shofarWaveCtx.lineWidth = 2;

    for (let x = 0; x < width; x++) {
        let totalY = 0;
        recipe.forEach(item => {
            const n = item.harmonic;
            const amplitude = baseAmplitude * item.amp;
            totalY += Math.cos(n * Math.PI * x / (2 * width)) * Math.cos(time * n) * amplitude;
        });
        if (x === 0) shofarWaveCtx.moveTo(x, height / 2 + totalY);
        else shofarWaveCtx.lineTo(x, height / 2 + totalY);
    }
    shofarWaveCtx.stroke();
}

playShofarButton?.addEventListener('click', async () => {
    await initializeAudio();
    if (!polySynth) return;

    const frequencies = shofarRecipe.map(item => F0 * item.harmonic);
    
    polySynth.releaseAll();
    polySynth.triggerAttackRelease(frequencies, '1.5s');
    
    drawAnalyzer(shofarRecipe);
    isShofarPlaying = true;
    setTimeout(() => {
        isShofarPlaying = false;
        if(shofarWaveCtx) {
            shofarWaveCtx.clearRect(0, 0, shofarWaveCanvas.width, shofarWaveCanvas.height);
        }
    }, 1500);
});


// --- CONFIGURAÇÃO INICIAL ---
window.addEventListener('resize', () => {
    resizeCanvas(canvas);
    resizeCanvas(stringCanvas);
    resizeCanvas(tubeCanvas);
    resizeCanvas(closedTubeCanvas);
    resizeCanvas(analyzerCanvas);
    resizeCanvas(shofarWaveCanvas);
});

setupHarmonicSelectors(stringHarmonicsContainer, activeStringHarmonics);
setupHarmonicSelectors(tubeHarmonicsContainer, activeTubeHarmonics);
setupHarmonicSelectors(closedTubeHarmonicsContainer, activeClosedTubeHarmonics);

oscillationSpeedSlider.addEventListener('input', (e) => {
    const speedValue = parseInt(e.target.value);
    oscillationSpeed = speedValue / 100;
    if (speedValue < 7) speedLabel.textContent = "Lenta";
    else if (speedValue < 14) speedLabel.textContent = "Média";
    else if (speedValue < 22) speedLabel.textContent = "Rápida";
    else speedLabel.textContent = "Extremo";
});

// Inicializa os canvas com o tamanho correto
resizeCanvas(canvas);
resizeCanvas(stringCanvas);
resizeCanvas(tubeCanvas);
resizeCanvas(closedTubeCanvas);
resizeCanvas(analyzerCanvas);
resizeCanvas(shofarWaveCanvas);

// Inicia a animação
animateStandingWaves();

