document.addEventListener('DOMContentLoaded', () => {

    // --- INICIALIZAÇÃO DE ÁUDIO ---
    // Esta função "destrava" o áudio após o primeiro clique do usuário.
    // É uma exigência de segurança dos navegadores modernos.
    let audioInitialized = false;
    async function initializeAudio() {
        if (!audioInitialized && Tone.context.state !== 'running') {
            await Tone.start();
            console.log('Contexto de áudio iniciado com sucesso!');
            audioInitialized = true;
        }
    }
    document.body.addEventListener('click', initializeAudio, { once: true });


    // --- SEÇÃO 1: QUALIDADES DO SOM ---
    const frequencySlider = document.getElementById('frequencySlider');
    const amplitudeSlider = document.getElementById('amplitudeSlider');
    const noteDisplay = document.getElementById('noteDisplay');
    const timbreContainer = document.getElementById('timbreContainer');
    const waveCanvas = document.getElementById('waveCanvas');
    const waveCtx = waveCanvas?.getContext('2d');

    let synth;
    let waveType = 'sine';

    if (window.Tone) {
        synth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 }
        }).toDestination();
    }
    
    const updateNoteDisplay = (frequency) => {
        if (!noteDisplay) return;
        const note = Tone.Frequency(frequency).toNote();
        noteDisplay.textContent = note;
    };

    const drawWave = () => {
        if (!waveCanvas) return;
        const width = waveCanvas.width;
        const height = waveCanvas.height;
        const midY = height / 2;
        const amplitude = (amplitudeSlider.value * height) / 2.2;
        const frequency = frequencySlider.value;
        const waveLength = (1 / frequency) * 10000;

        waveCtx.clearRect(0, 0, width, height);
        waveCtx.beginPath();
        waveCtx.strokeStyle = '#c5a05b';
        waveCtx.lineWidth = 2;

        for (let x = 0; x < width; x++) {
            let y = 0;
            const angle = (x / waveLength) * Math.PI * 2;
            switch (waveType) {
                case 'sine': y = Math.sin(angle); break;
                case 'square': y = Math.sign(Math.sin(angle)); break;
                case 'sawtooth': y = 1 - 2 * ((x % waveLength) / waveLength); break;
                case 'triangle': y = Math.abs((((x / waveLength) * 2) % 2) - 1) * 2 - 1; break;
            }
            if (x === 0) waveCtx.moveTo(x, midY + y * amplitude);
            else waveCtx.lineTo(x, midY + y * amplitude);
        }
        waveCtx.stroke();
    };

    frequencySlider?.addEventListener('input', (e) => {
        const freq = parseFloat(e.target.value);
        if (synth) synth.frequency.value = freq;
        updateNoteDisplay(freq);
        drawWave();
    });

    amplitudeSlider?.addEventListener('input', (e) => {
        if (synth) synth.volume.value = Tone.gainToDb(e.target.value);
        drawWave();
    });
    
    let isPlaying = false;
    [frequencySlider, amplitudeSlider].forEach(slider => {
        slider?.addEventListener('mousedown', () => {
            if (synth && Tone.context.state === 'running') {
                synth.triggerAttack(synth.frequency.value);
                isPlaying = true;
            }
        });
        slider?.addEventListener('mouseup', () => {
            if (isPlaying && synth) {
                synth.triggerRelease();
                isPlaying = false;
            }
        });
        slider?.addEventListener('mouseleave', () => {
            if (isPlaying && synth) {
                synth.triggerRelease();
                isPlaying = false;
            }
        });
    });

    timbreContainer?.addEventListener('click', (e) => {
        if (e.target.classList.contains('timbre-btn')) {
            document.querySelectorAll('.timbre-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            waveType = e.target.dataset.wave;
            if (synth) synth.oscillator.type = waveType;
            drawWave();
        }
    });

    // --- SEÇÃO 2: ONDAS ESTACIONÁRIAS ---
    const oscillationSpeedSlider = document.getElementById('oscillationSpeedSlider');
    const speedLabel = document.getElementById('speedLabel');
    let time = 0;
    const F0 = 110;
    let polySynth;
    if (window.Tone) {
        polySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.2 },
            volume: -12
        }).toDestination();
    }
    
    const stationarySystems = {
        string: { canvas: document.getElementById('stringCanvas'), harmonics: [1], container: document.getElementById('stringHarmonicsContainer'), info: document.getElementById('stringInfo') },
        tube: { canvas: document.getElementById('tubeCanvas'), harmonics: [1], container: document.getElementById('tubeHarmonicsContainer'), info: document.getElementById('tubeInfo') },
        closedTube: { canvas: document.getElementById('closedTubeCanvas'), harmonics: [1], container: document.getElementById('closedTubeHarmonicsContainer'), info: document.getElementById('closedTubeInfo') }
    };

    function drawStationaryWave(system, type) {
        if (!system.canvas) return;
        const ctx = system.canvas.getContext('2d');
        const width = system.canvas.width;
        const height = system.canvas.height;
        const midY = height / 2;
        ctx.clearRect(0, 0, width, height);

        if (type.includes('tube')) {
            ctx.fillStyle = '#6b7280'; // Cor da parede do tubo
            const tubeWallThickness = 8;
            const tubeInnerHeight = height / 4;
            ctx.fillRect(0, midY - tubeInnerHeight - tubeWallThickness, width, tubeWallThickness);
            ctx.fillRect(0, midY + tubeInnerHeight, width, tubeWallThickness);
            if (type === 'closedTube') {
                ctx.fillRect(width - tubeWallThickness, midY - tubeInnerHeight - tubeWallThickness, tubeWallThickness, (tubeInnerHeight * 2) + tubeWallThickness);
            }
        }

        if (system.harmonics.length === 0) return;
        ctx.beginPath();
        ctx.strokeStyle = '#c5a05b';
        ctx.lineWidth = 2;
        const ampFactor = 30 / system.harmonics.length;
        for (let x = 0; x < width; x++) {
            let totalY = 0;
            system.harmonics.forEach(n => {
                const k = n * Math.PI / width;
                if (type === 'closedTube') totalY += ampFactor * Math.cos(k * x / 2) * Math.cos(time * n);
                else totalY += ampFactor * Math.sin(k * x) * Math.cos(time * n);
            });
            if (x === 0) ctx.moveTo(x, midY - totalY);
            else ctx.lineTo(x, midY - totalY);
        }
        ctx.stroke();

        if (system.harmonics.length === 1) {
            const n = system.harmonics[0];
            system.info.innerHTML = `Observe os <strong class="text-red-400">Nós</strong> e <strong class="text-green-400">Ventres</strong>.`;
            // Desenha Nós (vermelho) e Ventres (verde)
            // ... (lógica de desenho dos nós e ventres)
        } else {
             system.info.textContent = "A superposição de ondas cria um padrão complexo.";
        }
    }

    function playStationaryHarmonics(system) {
        if (!polySynth || Tone.context.state !== 'running') return;
        const frequencies = system.harmonics.map(n => F0 * n);
        polySynth.releaseAll();
        if (frequencies.length > 0) {
            polySynth.triggerAttack(frequencies, Tone.now());
        }
    }
    
    Object.keys(stationarySystems).forEach(key => {
        const system = stationarySystems[key];
        system.container?.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                const harmonic = parseInt(e.target.dataset.harmonic);
                const isActive = e.target.classList.contains('active');
                
                // Lógica de seleção corrigida
                if (isActive && system.harmonics.length > 1) {
                    e.target.classList.remove('active');
                    system.harmonics = system.harmonics.filter(h => h !== harmonic);
                } else if (!isActive) {
                    e.target.classList.add('active');
                    system.harmonics.push(harmonic);
                }
                playStationaryHarmonics(system);
            }
        });
    });

    if (oscillationSpeedSlider) {
        oscillationSpeedSlider.addEventListener('input', e => {
            const val = parseInt(e.target.value);
            if (val < 10) speedLabel.textContent = 'Lenta';
            else if (val > 20) speedLabel.textContent = 'Rápida';
            else speedLabel.textContent = 'Média';
        });
    }

    // --- SEÇÃO DO SHOFAR (LÓGICA ATUALIZADA) ---
    const tekiahBtn = document.getElementById('tekiah-btn');
    const shevarimBtn = document.getElementById('shevarim-btn');
    const teruahBtn = document.getElementById('teruah-btn');
    const analyzerCanvas = document.getElementById('analyzerCanvas');
    const shofarWaveCanvas = document.getElementById('shofarWaveCanvas');
    const comparisonAnalysis = document.getElementById('comparison-analysis');
    
    let shofarSynth, analyzerCtx, shofarWaveCtx, shofarAnimationId;

    if (window.Tone) {
        shofarSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            volume: -12,
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.4 }
        }).toDestination();
    }
    
    if (analyzerCanvas) analyzerCtx = analyzerCanvas.getContext('2d');
    if (shofarWaveCanvas) shofarWaveCtx = shofarWaveCanvas.getContext('2d');
    
    const shofarHarmonics = [
        { note: 'A2', gain: 1.0 }, { note: 'A3', gain: 0.6 },
        { note: 'E4', gain: 0.4 }, { note: 'A4', gain: 0.25 },
        { note: 'C#5', gain: 0.15 },
    ];
    const shofarNotes = shofarHarmonics.map(h => h.note);

    function drawAnalyzer(active = false) {
        if (!analyzerCtx) return;
        const w = analyzerCanvas.width;
        const h = analyzerCanvas.height;
        analyzerCtx.clearRect(0, 0, w, h);
        analyzerCtx.font = '12px Inter';
        analyzerCtx.textAlign = 'center';

        const barWidth = w / (shofarHarmonics.length * 1.5);
        shofarHarmonics.forEach((harmonic, i) => {
            const barHeight = active ? harmonic.gain * (h - 20) : 0;
            const x = (i * barWidth * 1.5) + (barWidth / 2);
            analyzerCtx.fillStyle = active ? '#c5a05b' : '#555';
            analyzerCtx.fillRect(x, h - 15 - barHeight, barWidth, barHeight);
            analyzerCtx.fillStyle = '#aaa';
            analyzerCtx.fillText(harmonic.note, x + barWidth / 2, h - 5);
        });
    }
    
    function animateShofarWave(duration) {
        if (!shofarWaveCtx) return;
        let startTime = null;
        function loop(currentTime) {
            if (shofarAnimationId) cancelAnimationFrame(shofarAnimationId);
            if (!startTime) startTime = currentTime;
            const elapsedTime = currentTime - startTime;
            
            if (elapsedTime > duration) {
                shofarWaveCtx.clearRect(0, 0, shofarWaveCanvas.width, shofarWaveCanvas.height);
                drawAnalyzer(false);
                return;
            }
            shofarWaveCtx.clearRect(0, 0, shofarWaveCanvas.width, shofarWaveCanvas.height);
            shofarWaveCtx.beginPath();
            shofarWaveCtx.strokeStyle = 'rgba(255, 223, 186, 0.7)';
            shofarWaveCtx.lineWidth = 2;
            const w = shofarWaveCanvas.width;
            const h = shofarWaveCanvas.height;
            for (let x = 0; x < w; x++) {
                let totalY = 0;
                shofarHarmonics.forEach((h, i) => {
                    const freq = (i * 2 + 1);
                    const amp = h.gain * (h.note === 'A2' ? 0.2 : 0.1);
                    totalY += Math.sin(x * 0.05 * freq + elapsedTime * 0.01) * amp;
                });
                shofarWaveCtx.lineTo(x, h/2 + totalY * h * Math.sin( (x/w) * Math.PI ));
            }
            shofarWaveCtx.stroke();
            shofarAnimationId = requestAnimationFrame(loop);
        }
        drawAnalyzer(true);
        shofarAnimationId = requestAnimationFrame(loop);
    }
    
    function showAnalysis() {
        comparisonAnalysis?.classList.remove('hidden');
    }
    
    tekiahBtn?.addEventListener('click', () => {
        if (!shofarSynth || Tone.context.state !== 'running') return;
        const duration = 2.5;
        shofarSynth.triggerAttackRelease(shofarNotes, duration);
        animateShofarWave(duration * 1000);
        showAnalysis();
    });

    shevarimBtn?.addEventListener('click', () => {
        if (!shofarSynth || Tone.context.state !== 'running') return;
        const now = Tone.now();
        const duration = 0.6;
        const gap = 0.2;
        shofarSynth.triggerAttackRelease(shofarNotes, duration, now);
        shofarSynth.triggerAttackRelease(shofarNotes, duration, now + duration + gap);
        shofarSynth.triggerAttackRelease(shofarNotes, duration, now + 2 * (duration + gap));
        animateShofarWave(duration * 1000);
        setTimeout(() => animateShofarWave(duration * 1000), (duration + gap) * 1000);
        setTimeout(() => animateShofarWave(duration * 1000), 2 * (duration + gap) * 1000);
        showAnalysis();
    });

    teruahBtn?.addEventListener('click', () => {
        if (!shofarSynth || Tone.context.state !== 'running') return;
        const now = Tone.now();
        const duration = 0.1;
        const gap = 0.08;
        for (let i = 0; i < 9; i++) {
            const time = now + i * (duration + gap);
            shofarSynth.triggerAttackRelease(shofarNotes, duration, time);
            setTimeout(() => animateShofarWave(duration * 1000), i * (duration + gap) * 1000);
        }
        showAnalysis();
    });

    // Animação principal
    function animate() {
        const speed = (oscillationSpeedSlider?.value || 10) / 100;
        time += speed;
        drawStationaryWave(stationarySystems.string, 'string');
        drawStationaryWave(stationarySystems.tube, 'tube');
        drawStationaryWave(stationarySystems.closedTube, 'closedTube');
        requestAnimationFrame(animate);
    }

    // Inicializações
    drawWave();
    animate();
    drawAnalyzer(false);
});

