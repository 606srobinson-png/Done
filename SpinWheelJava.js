const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spin-btn');
const wheelSection = document.getElementById('wheel-section');
const resultSection = document.getElementById('result-section');
const prizeDisplay = document.getElementById('prize-display');
const codeDisplay = document.getElementById('code-display');
const countdownEl = document.getElementById('countdown');
const viewPrizeBtn = document.getElementById('view-prize-btn');
const backToWheelBtn = document.getElementById('back-to-wheel-btn');

const spinSound = document.getElementById('spin-sound');
const winSound = document.getElementById('win-sound');
const loseSound = document.getElementById('lose-sound');

// Mobile & Browser Audio Unlock Handler on first touch/click anywhere
document.addEventListener('pointerdown', () => {
    [spinSound, winSound, loseSound].forEach(sound => {
        if (sound) {
            sound.play().then(() => {
                sound.pause();
                sound.currentTime = 0;
            }).catch(() => {});
        }
    });
}, { once: true });

// Prize array matches the exact clockwise order in HTML
const prizes = ["30% OFF", "Better Luck Next Time", "40% OFF", "20% OFF", "10% OFF", "50% OFF"];
let isSpinning = false;
let currentRotation = 0;
let timerInterval = null;

const ENFORCE_ONE_TIME_SPIN = false; 

window.addEventListener('DOMContentLoaded', () => {
    if (ENFORCE_ONE_TIME_SPIN && localStorage.getItem('dfw_already_spun') === 'true') {
        spinBtn.textContent = "ALREADY SPUN";
        spinBtn.style.opacity = "0.6";
    }
});

// STRICT PROBABILITY MATH:
// Index 5 (50% OFF): 0.5% (Ultra Rare)
// Index 0 (30% OFF): 2% (Ultra Rare)
// Index 2 (40% OFF): 2% (Ultra Rare)
// Index 1 (Better Luck Next Time): 25.5% (Balanced)
// Index 3 (20% OFF): 35% (Most Frequent)
// Index 4 (10% OFF): 35% (Most Frequent)
function getWeightedWinningIndex() {
    const randomNum = Math.random() * 100;
    
    if (randomNum < 0.2) return 5;  // 50% OFF
    if (randomNum < 1) return 0;  // 30% OFF
    if (randomNum < 0.5) return 2;  // 40% OFF
    if (randomNum < 40)  return 1;  // Better Luck Next Time
    if (randomNum < 65)  return 3;  // 20% OFF
    return 4;                       // 10% OFF
}

function playAudioSafe(audioElement) {
    if (!audioElement) return;
    audioElement.currentTime = 0;
    audioElement.play().catch(e => console.log("Audio playback deferred/blocked:", e));
}

function spinWheel() {
    if (isSpinning) return;

    if (ENFORCE_ONE_TIME_SPIN && localStorage.getItem('dfw_already_spun') === 'true') {
        alert("You have already used your one-time spin!");
        return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    wheel.classList.add('spinning-glow');

    playAudioSafe(spinSound);

    const winningIndex = getWeightedWinningIndex();
    const degreesPerSlice = 360 / prizes.length; 

    const extraSpins = 360 * 7; 
    const targetSliceCenter = (winningIndex * degreesPerSlice) + (degreesPerSlice / 2);
    
    const normalizedCurrent = currentRotation % 360;
    const distanceToTarget = (360 - normalizedCurrent + (360 - targetSliceCenter)) % 360;
    const totalRotation = currentRotation + extraSpins + distanceToTarget;
    
    currentRotation = totalRotation;
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        spinBtn.disabled = false;
        wheel.classList.remove('spinning-glow');

        if (ENFORCE_ONE_TIME_SPIN) {
            localStorage.setItem('dfw_already_spun', 'true');
            spinBtn.textContent = "ALREADY SPUN";
            spinBtn.style.opacity = "0.6";
        }

        showResult(prizes[winningIndex]);
    }, 5500);
}

function showResult(prizeText) {
    wheelSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    prizeDisplay.textContent = prizeText;

    const winTitleEl = document.getElementById('win-title');

    if (prizeText === "Better Luck Next Time") {
        winTitleEl.textContent = "SO CLOSE!";
        winTitleEl.className = "result-title lose-style";
        document.querySelector('.timer-box').style.display = 'none';
        document.querySelector('.security-code').style.display = 'none';
        
        playAudioSafe(loseSound);
        return;
    }

    winTitleEl.textContent = "YOU WON!";
    winTitleEl.className = "result-title win-style";
    document.querySelector('.timer-box').style.display = 'block';
    document.querySelector('.security-code').style.display = 'block';

    const randomCode = 'DFW-' + Math.floor(1000 + Math.random() * 9000);
    codeDisplay.textContent = randomCode;

    const expiresAt = new Date().getTime() + 10 * 60 * 1000;
    const prizeData = {
        prize: prizeText,
        code: randomCode,
        expiresAt: expiresAt
    };
    localStorage.setItem('dfw_active_prize', JSON.stringify(prizeData));

    startCountdown(expiresAt);
    playAudioSafe(winSound);
    
    try { confetti({ particleCount: 160, spread: 95, origin: { y: 0.6 } }); } catch(e) {}
}

function startCountdown(expireTime) {
    if (timerInterval) clearInterval(timerInterval);

    function updateTimer() {
        const now = new Date().getTime();
        const distance = expireTime - now;

        if (distance < 0) {
            clearInterval(timerInterval);
            countdownEl.textContent = "EXPIRED";
            localStorage.removeItem('dfw_active_prize');
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        countdownEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

viewPrizeBtn.addEventListener('click', () => {
    const savedPrize = localStorage.getItem('dfw_active_prize');
    if (!savedPrize) {
        alert("No active prize found yet! Spin the wheel first.");
        return;
    }
    const prizeData = JSON.parse(savedPrize);
    wheelSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    prizeDisplay.textContent = prizeData.prize;
    codeDisplay.textContent = prizeData.code;
    
    if (prizeData.prize === "Better Luck Next Time") {
        document.getElementById('win-title').textContent = "SO CLOSE!";
        document.getElementById('win-title').className = "result-title lose-style";
        document.querySelector('.timer-box').style.display = 'none';
        document.querySelector('.security-code').style.display = 'none';
    } else {
        document.getElementById('win-title').textContent = "ACTIVE PRIZE";
        document.getElementById('win-title').className = "result-title win-style";
        document.querySelector('.timer-box').style.display = 'block';
        document.querySelector('.security-code').style.display = 'block';
        startCountdown(prizeData.expiresAt);
    }
});

spinBtn.addEventListener('click', spinWheel);

backToWheelBtn.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    wheelSection.classList.remove('hidden');
});