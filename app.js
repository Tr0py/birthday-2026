/* ============================================================
   GIFT CONFIGURATION
   Edit names, hints, hashes, and content here.
   To generate a SHA-256 hash for a password, run in browser console:
     crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourpassword'))
       .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
   ============================================================ */
const GIFTS = [
  {
    name: '菌菇水',
    emoji: '🍄',
    hint: '小朋友最喜欢的什么东西呀',
    // password: "cici"
    hash: 'd1b50949dd70f017f7a18e2bc819a9334e918d7ee325055195edec438e9403b1',
    content: '🍄 给我们的小豆最喜欢的呲呲呀 这次要大份一点!'
  },
  {
    name: 'Colofactory',
    emoji: '🎨',
    hint: '开始的开始',
    // password: "colorfactory"
    hash: 'a53bb96506c9acb76ce100f5ff8da9f0d8f6146f508a3eee9c1b464371b32e3c',
    content: '🎨 梦开始的地方 <3'
  },
  {
    name: 'Dave the Diver',
    emoji: '🤿',
    hint: '如果有时间',
    // password: "kawaii"
    hash: '532593111807cdf8aaadf37aec820f908f74bf84b48e14fc9650cb750e3a7941',
    content: '🤿 一起去抓鱼开小店卖寿司吧~'
  },
  {
    name: 'LadyM',
    emoji: '🍰',
    hint: '好吃的',
    // password: "ladym"
    hash: '38bdd8bf5a331ed59c2d6a25b2b58630418019a9f40008137be2cb367b74c940',
    content: '🍰 豆喜欢的千层蛋糕!'
  },
  {
    name: '生日晚宴',
    emoji: '🍽️',
    hint: '和...好吃的？',
    // password: "mylove"
    hash: 'fac445f594a545116747701d3a307109432735698cabeebf65f09ac5d343d78b',
    content: '🍽️ 点击查看你的专属晚宴菜单！',
    link: 'menu.html'
  }
];

/* ============================================================
   PASSWORD VERIFICATION (SHA-256)
   ============================================================ */
async function sha256(message) {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

/* ============================================================
   RENDER GIFT CARDS
   ============================================================ */
function renderGifts() {
  const grid = document.getElementById('gifts-grid');
  GIFTS.forEach((gift, i) => {
    const card = document.createElement('div');
    card.className = 'gift-card fade-in';
    card.id = `gift-${i}`;
    card.innerHTML = `
      <div class="gift-card-inner">
        <div class="gift-card-front">
          <div class="gift-number">#${i + 1}</div>
          <div class="gift-mystery">?</div>
          <input type="password" placeholder="Password" data-index="${i}"
                 onkeydown="if(event.key==='Enter')verifyGift(${i})">
          <p class="hint">${gift.hint}</p>
          <p class="error-msg" id="error-${i}"></p>
        </div>
        <div class="gift-card-back">
          <div class="gift-reveal-emoji">${gift.emoji}</div>
          <h3>${gift.name}</h3>
          <p>${gift.content}</p>
          ${gift.link ? `<a href="${gift.link}" class="gift-link">查看 →</a>` : ''}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function verifyGift(index) {
  const input = document.querySelector(`input[data-index="${index}"]`);
  const password = input.value.trim();
  if (!password) return;

  const hash = await sha256(password);
  if (hash === GIFTS[index].hash) {
    const card = document.getElementById(`gift-${index}`);
    card.classList.add('unlocked');
    launchConfetti(80);
  } else {
    const errEl = document.getElementById(`error-${index}`);
    errEl.textContent = 'Hmm, that\'s not it. Try again!';
    input.value = '';
    setTimeout(() => { errEl.textContent = ''; }, 2000);
  }
}

/* ============================================================
   CONFETTI ENGINE (Canvas)
   ============================================================ */
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');
let confettiPieces = [];
let confettiRunning = false;

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

const CONFETTI_COLORS = ['#D4845A', '#E8B86D', '#C4887B', '#e74c3c', '#f39c12', '#8e44ad', '#2ecc71'];

function createPiece() {
  return {
    x: Math.random() * confettiCanvas.width,
    y: -10 - Math.random() * confettiCanvas.height * 0.5,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 4,
    rot: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 8,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    life: 1
  };
}

function launchConfetti(count = 60) {
  for (let i = 0; i < count; i++) {
    confettiPieces.push(createPiece());
  }
  if (!confettiRunning) {
    confettiRunning = true;
    animateConfetti();
  }
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.rotSpeed;
    p.vy += 0.04;
    p.life -= 0.003;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });

  confettiPieces = confettiPieces.filter(p => p.life > 0 && p.y < confettiCanvas.height + 20);

  if (confettiPieces.length > 0) {
    requestAnimationFrame(animateConfetti);
  } else {
    confettiRunning = false;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

/* ============================================================
   FLOATING BALLOONS & SPARKLES
   ============================================================ */
function createBalloons() {
  const emojis = ['🎈', '🎊', '✨', '🎀', '💫'];
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className = 'balloon';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDuration = (8 + Math.random() * 12) + 's';
    el.style.animationDelay = (Math.random() * 10) + 's';
    el.style.fontSize = (1.5 + Math.random() * 1.5) + 'rem';
    document.body.appendChild(el);
  }
}

/* ============================================================
   INTERSECTION OBSERVER (Scroll Fade-in)
   ============================================================ */
function setupFadeIn() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

/* ============================================================
   GALLERY LIGHTBOX
   ============================================================ */
function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  document.querySelectorAll('.gallery-grid img').forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.src;
      lightbox.classList.add('active');
    });
  });

  lightbox.addEventListener('click', () => {
    lightbox.classList.remove('active');
  });
}

/* ============================================================
   MUSIC TOGGLE
   ============================================================ */
function setupMusic() {
  const btn = document.getElementById('music-toggle');
  const audio = document.getElementById('bg-music');
  let playing = false;

  btn.addEventListener('click', () => {
    if (playing) {
      audio.pause();
      btn.textContent = '🔇';
    } else {
      audio.play();
      btn.textContent = '🔊';
    }
    playing = !playing;
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  renderGifts();
  setupFadeIn();
  setupLightbox();
  setupMusic();
  createBalloons();
  launchConfetti(100);
});
