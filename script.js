document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o contexto de áudio após interação do usuário
    let audioInitialized = false;
    document.body.addEventListener('click', () => {
        if (!audioInitialized && Tone.context.state !== 'running') {
            Tone.start();
            console.log('Audio context started');
            audioInitialized = true;
        }
    }, { once: true });

    // --- SEÇÃO 1: QUALIDADES DO SOM ---
    const frequencySlider = document.getElementById('frequency');
    const amplitudeSlider = document.getElementById('amplitude');
    const noteDisplay = document.getElementById('note-display');
    const waveButtons = {
        sine: document.getElementById('sine-wave'),
        square: document.getElementById('square-wave'),
        sawtooth: document.getElementById('sawtooth-wave'),
        triangle: document.getElementById('triangle-wave'),
    };
    const soundWaveCanvas = document.getElementById('sound-wave-canvas');
    const s_ctx = soundWaveCanvas.getContext('2d');

    const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 }
    }).toDestination();

    let waveType = 'sine';

    function updateNoteDisplay(frequency) {
        const note = Tone.Frequency(frequency).toNote();
        noteDisplay.textContent = note;
    }

    function drawSoundWave() {
        s_ctx.clearRect(0, 0, soundWaveCanvas.width, soundWaveCanvas.height);
        s_ctx.beginPath();
        s_ctx.strokeStyle = '#D4AF37';
        s_ctx.lineWidth = 2;

        const width = soundWaveCanvas.width;
        const height = soundWaveCanvas.height;
        const midY = height / 2;
        const amplitude = (amplitudeSlider.value * height) / 2.2;
        const frequency = frequencySlider.value;
        const waveLength = (1 / frequency) * 10000;

        for (let x = 0; x < width; x++) {
            let y = 0;
            const angle = (x / waveLength) * Math.PI * 2;
            switch (waveType) {
                case 'sine':
                    y = Math.sin(angle);
                    break;
                case 'square':
                    y = Math.sign(Math.sin(angle));
                    break;
                case 'sawtooth':
                    y = 1 - 2 * ( (x % waveLength) / waveLength );
                    break;
                case 'triangle':
                    y = Math.abs( ( ( (x / waveLength) * 2) % 2) - 1) * 2 - 1;
                    break;
            }
            s_ctx.lineTo(x, midY + y * amplitude);
        }
        s_ctx.stroke();
    }

    frequencySlider.addEventListener('input', () => {
        const freq = frequencySlider.value;
        synth.frequency.value = freq;
        updateNoteDisplay(freq);
        drawSoundWave();
    });

    amplitudeSlider.addEventListener('input', () => {
        synth.volume.value = Tone.gainToDb(amplitudeSlider.value);
        drawSoundWave();
    });

    Object.entries(waveButtons).forEach(([type, button]) => {
        button.addEventListener('click', () => {
            Object.values(waveButtons).forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            waveType = type;
            synth.oscillator.type = type;
            drawSoundWave();
        });
    });
    
    // Play a note when interacting with sliders
    let isPlaying = false;
    [frequencySlider, amplitudeSlider].forEach(slider => {
        slider.addEventListener('mousedown', () => {
             if (Tone.context.state === 'running') {
                synth.triggerAttack(synth.frequency.value);
                isPlaying = true;
            }
        });
         slider.addEventListener('mouseup', () => {
            if(isPlaying) {
                synth.triggerRelease();
                isPlaying = false;
            }
        });
        slider.addEventListener('mouseleave', () => {
            if(isPlaying) {
                synth.triggerRelease();
                isPlaying = false;
            }
        });
    });


    // --- SEÇÃO 2: ONDAS ESTACIONÁRIAS ---
    const speedSlider = document.getElementById('oscillation-speed');
    const harmonicButtons = document.querySelectorAll('.harmonic-btn');

    const canvases = {
        string: document.getElementById('string-wave-canvas'),
        'open-open': document.getElementById('open-open-tube-canvas'),
        'open-closed': document.getElementById('open-closed-tube-canvas'),
    };

    const contexts = {
        string: canvases.string.getContext('2d'),
        'open-open': canvases['open-open'].getContext('2d'),
        'open-closed': canvases['open-closed'].getContext('2d'),
    };

    let activeHarmonics = {
        string: [], 'open-open': [], 'open-closed': []
    };

    let time = 0;
    const polySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.2 }
    }).toDestination();
    const fundamental = 110; // A2

    function playHarmonics(system) {
        polySynth.releaseAll();
        const harmonicsToPlay = activeHarmonics[system].map(h => {
             const freq = fundamental * h;
             return Tone.Frequency(freq).toNote();
        });
        if(harmonicsToPlay.length > 0 && Tone.context.state === 'running') {
             polySynth.triggerAttack(harmonicsToPlay);
        }
    }
    
    harmonicButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            const system = button.dataset.system;
            const harmonic = parseInt(button.dataset.harmonic);
            
            const index = activeHarmonics[system].indexOf(harmonic);
            if (index > -1) {
                activeHarmonics[system].splice(index, 1);
            } else {
                activeHarmonics[system].push(harmonic);
            }
            playHarmonics(system);
        });
    });

    function drawStationaryWave(ctx, canvas, harmonics, isString = true, isOpenClosed = false) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width;
        const h = canvas.height;
        const midY = h / 2;
        
        // Desenha o tubo se não for corda
        if (!isString) {
            ctx.fillStyle = '#444';
            ctx.fillRect(0, midY - 30, w, 5);
            ctx.fillRect(0, midY + 30, w, 5);
            if (isOpenClosed) {
                ctx.fillRect(w - 5, midY - 30, 5, 65);
            }
        }

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#D4AF37';
        
        if (harmonics.length === 0) return;

        for (let x = 0; x < w; x++) {
            let totalY = 0;
            const amplitude = 25 / harmonics.length;
            harmonics.forEach(n => {
                const k = (n * Math.PI) / w;
                if (isOpenClosed) { // Harmônicos ímpares para tubo aberto-fechado
                    totalY += amplitude * Math.cos(k * x) * Math.sin(time * n);
                } else { // Corda e tubo aberto-aberto
                    totalY += amplitude * Math.sin(k * x) * Math.cos(time * n);
                }
            });
            ctx.lineTo(x, midY - totalY);
        }
        ctx.stroke();

        // Desenha nós e ventres se apenas um harmônico estiver ativo
        if (harmonics.length === 1) {
            const n = harmonics[0];
            // Nós (vermelho)
            ctx.fillStyle = '#FF4136';
            for (let i = 0; i <= n; i++) {
                 if (isString || (!isString && !isOpenClosed)) {
                    if (i < n) ctx.fillRect((i * w) / n - 2, midY - 2, 4, 4);
                 } else if (isOpenClosed) {
                     if (i > 0) ctx.fillRect(((2*i-1)*w)/(2*n) -2, midY - 2, 4,4);
                 }
            }
            // Ventres (verde)
            ctx.fillStyle = '#2ECC40';
            for (let i = 0; i < n; i++) {
                if (isString || (!isString && !isOpenClosed)) {
                     ctx.fillRect(((2 * i + 1) * w) / (2 * n) - 2, midY - 2, 4, 4);
                } else if (isOpenClosed) {
                    ctx.fillRect((i*w)/n -2, midY - 2, 4, 4);
                }
            }
        }
    }
    
    function animate() {
        const speed = speedSlider.value / 100;
        time += speed;
        drawStationaryWave(contexts.string, canvases.string, activeHarmonics.string, true, false);
        drawStationaryWave(contexts['open-open'], canvases['open-open'], activeHarmonics['open-open'], false, false);
        drawStationaryWave(contexts['open-closed'], canvases['open-closed'], activeHarmonics['open-closed'], false, true);
        requestAnimationFrame(animate);
    }
    
    // --- SEÇÃO 3: FÍSICA DO SHOFAR ---
    const tekiahBtn = document.getElementById('tekiah-btn');
    const shevarimBtn = document.getElementById('shevarim-btn');
    const teruahBtn = document.getElementById('teruah-btn');
    const shofarWaveGroup = document.getElementById('shofar-wave-group');
    const shofarAnalyserCanvas = document.getElementById('shofar-analyser-canvas');
    const a_ctx = shofarAnalyserCanvas.getContext('2d');
    const comparisonAnalysis = document.getElementById('comparison-analysis');

    const shofarSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        volume: -12,
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.4 }
    }).toDestination();

    const shofarHarmonics = [
        { note: 'A2', gain: 1.0 },    // Fundamental (1º)
        { note: 'A3', gain: 0.6 },    // 3º harmônico (aproximado)
        { note: 'E4', gain: 0.4 },    // 5º harmônico (aproximado)
        { note: 'A4', gain: 0.25 },   // 7º harmônico (aproximado)
        { note: 'C#5', gain: 0.15 },  // 9º harmônico (aproximado)
    ];
    const shofarNotes = shofarHarmonics.map(h => h.note);

    function drawAnalyser(active = false) {
        const w = shofarAnalyserCanvas.width;
        const h = shofarAnalyserCanvas.height;
        a_ctx.clearRect(0, 0, w, h);
        a_ctx.fillStyle = '#555';
        a_ctx.font = '12px Inter';
        a_ctx.textAlign = 'center';

        const barWidth = w / (shofarHarmonics.length * 1.5);
        shofarHarmonics.forEach((harmonic, i) => {
            const barHeight = active ? harmonic.gain * (h - 20) : 0;
            const x = (i * barWidth * 1.5) + (barWidth / 2);
            a_ctx.fillStyle = active ? '#D4AF37' : '#555';
            a_ctx.fillRect(x, h - 15 - barHeight, barWidth, barHeight);
            a_ctx.fillStyle = '#aaa';
            a_ctx.fillText(harmonic.note, x + barWidth / 2, h - 5);
        });
    }

    let shofarAnimationId;
    function animateShofarWave(duration) {
        let startTime = null;
        function loop(currentTime) {
            if (!startTime) startTime = currentTime;
            const elapsedTime = currentTime - startTime;
            
            if (elapsedTime > duration) {
                shofarWaveGroup.style.display = 'none';
                drawAnalyser(false);
                cancelAnimationFrame(shofarAnimationId);
                return;
            }

            const path = `M 40 50 C 60 40, 100 40, 120 45 S 150 ${45 + Math.sin(elapsedTime * 0.1) * 5}, 170 50`;
            shofarWaveGroup.innerHTML = `<path d="${path}" stroke="#FFF" stroke-width="2" fill="none" />`;
            shofarAnimationId = requestAnimationFrame(loop);
        }
        shofarWaveGroup.style.display = 'block';
        drawAnalyser(true);
        shofarAnimationId = requestAnimationFrame(loop);
    }
    
    function showAnalysis() {
        comparisonAnalysis.style.display = 'block';
    }
    
    tekiahBtn.addEventListener('click', () => {
        if (Tone.context.state !== 'running') return;
        const duration = 2; // 2 segundos
        shofarSynth.triggerAttackRelease(shofarNotes, duration);
        animateShofarWave(duration * 1000);
        showAnalysis();
    });

    shevarimBtn.addEventListener('click', () => {
        if (Tone.context.state !== 'running') return;
        const now = Tone.now();
        const duration = 0.5;
        shofarSynth.triggerAttackRelease(shofarNotes, duration, now);
        shofarSynth.triggerAttackRelease(shofarNotes, duration, now + 0.7);
        shofarSynth.triggerAttackRelease(shofarNotes, duration, now + 1.4);
        
        animateShofarWave(duration * 1000);
        setTimeout(() => animateShofarWave(duration * 1000), 700);
        setTimeout(() => animateShofarWave(duration * 1000), 1400);
        showAnalysis();
    });

    teruahBtn.addEventListener('click', () => {
        if (Tone.context.state !== 'running') return;
        const now = Tone.now();
        const duration = 0.1;
        for (let i = 0; i < 9; i++) {
            const time = now + i * 0.15;
            shofarSynth.triggerAttackRelease(shofarNotes, duration, time);
            setTimeout(() => animateShofarWave(duration * 1000), i * 150);
        }
        showAnalysis();
    });

    // Inicializa desenhos
    drawSoundWave();
    animate();
    drawAnalyser(false);
});
