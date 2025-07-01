document.addEventListener('DOMContentLoaded', function() {

    // --- HTML'deki Elementleri Seçme ---
    const dino = document.getElementById('dino');
    const obstacle = document.getElementById('obstacle');
    const oyunBilgisiEkrani = document.getElementById('oyun-bilgisi');
    const gunSayaciEkrani = document.getElementById('gun-sayaci');
    const bossAlani = document.getElementById('boss-alani');
    const notificationArea = document.getElementById('notification-area');
    const particleContainer = document.getElementById('particle-container');
    const restartButton = document.getElementById('restart-button');
    const introOverlay = document.getElementById('intro-overlay');
    const startGameButton = document.getElementById('start-game-button');
    const backgroundEffect = document.getElementById('background-effect');
    const gameUI = document.getElementById('game-ui');
    const gameContainer = document.querySelector('.game-container');

    // --- Oyun Değişkenleri ---
    let bakiye = 22500;
    let atlananKartSayisi = 0;
    let oyunAktif = false;
    let bossSavasinda = false;
    let kartPuanlandi = false;
    let mevcutBossSira = 0;
    let aktifBoss = null;
    const GEREKEN_TOPLAM_ATLAYIS = 40;
    let bossYakalanmaTimer = null;
    let oyunDongusu = null;

    // --- Boss Bilgileri ---
    const bosslar = [
        { ad: "Manav", borc: 2000, gorsel: 'manav.png' },
        { ad: "Kasap", borc: 3000, gorsel: 'kasap.png' },
        { ad: "Bakkal", borc: 5000, gorsel: 'bakkal.png' },
        { ad: "Enişte", borc: 10000, gorsel: 'eniste.png' }
    ];

    // --- Ana Fonksiyonlar ---
    function guncelleEkrani() {
        const gunOrani = 30 / GEREKEN_TOPLAM_ATLAYIS;
        let kalanGun = 30 - Math.floor(atlananKartSayisi * gunOrani);
        if (kalanGun < 0) kalanGun = 0;
        oyunBilgisiEkrani.children[0].textContent = `Bakiye: ${bakiye.toFixed(2)} TL`;
        gunSayaciEkrani.textContent = ` | Kalan Gün: ${kalanGun}`;
    }

    function gosterMesaj(mesaj, renk = '#ffffff', sure = 2000) {
        const mesajElementi = document.createElement('p');
        mesajElementi.textContent = mesaj;
        mesajElementi.className = 'notification-text';
        mesajElementi.style.color = renk;
        notificationArea.innerHTML = '';
        notificationArea.appendChild(mesajElementi);
        setTimeout(() => { if (notificationArea.contains(mesajElementi)) { notificationArea.removeChild(mesajElementi); } }, sure);
    }

    function jump() {
        if (!dino.classList.contains('jump-animation') && oyunAktif) {
            dino.classList.add('jump-animation');
            setTimeout(() => { dino.classList.remove('jump-animation'); }, 600);
        }
    }

    function oyunuBitir(kazandinMi, yakalanmaMi = false) {
        oyunAktif = false;
        clearTimeout(bossYakalanmaTimer);
        clearInterval(oyunDongusu);
        obstacle.style.animationPlayState = 'paused';
        backgroundEffect.style.animationPlayState = 'paused';
        
        // Eğer yakalanma ile oyun bittiyse, önce boss'un yapışma animasyonu çalışsın
        if (yakalanmaMi) {
            const bossEl = document.getElementById('boss');
            if (bossEl) {
                bossEl.style.transition = 'left 0.2s ease-in';
                bossEl.style.left = (dino.offsetLeft + 10) + 'px';
            }
            // Animasyon bittikten sonra mesajı göster ve butonu çıkar
            setTimeout(() => {
                gosterMesaj("YAKALANDIN!", '#ff4d4d', 5000);
                restartButton.style.display = 'block';
            }, 300);
        } else {
            // Diğer bitiş senaryoları (iflas veya zafer)
            restartButton.style.display = 'block';
            if (kazandinMi) {
                gosterMesaj("MAAŞ GÜNÜ!", '#4CAF50', 5000);
            } else {
                gosterMesaj("İFLAS ETTİN!", '#ff4d4d', 5000);
            }
        }
    }

    function bossuGetir() {
        if (mevcutBossSira >= bosslar.length) return;
        bossSavasinda = true;
        const bossSablonu = bosslar[mevcutBossSira];
        aktifBoss = { ...bossSablonu };
        dino.classList.add('dino-boss-position');
        obstacle.style.display = 'none';
        gosterMesaj(`${aktifBoss.ad} Geliyor!`, '#ffc107');
        const bossElementi = document.createElement('div');
        bossElementi.id = 'boss';
        bossElementi.style.backgroundImage = `url('${aktifBoss.gorsel}')`;
        bossAlani.appendChild(bossElementi);
        setTimeout(() => { bossElementi.classList.add('boss-active-position'); }, 500);

        // DÜZELTME: Yakalanma sayacını SADECE boss savaşı başladığında bir kere ayarlıyoruz.
        // Zıplama eylemi bu sayacı sıfırlayacak.
        setBossTimer();
    }
    
    // YENİ: Zamanlayıcıyı ayarlayan ayrı bir fonksiyon (daha temiz)
    function setBossTimer() {
        // Önce eski zamanlayıcıyı her zaman temizle
        clearTimeout(bossYakalanmaTimer);
        // Yeni zamanlayıcıyı ayarla
        bossYakalanmaTimer = setTimeout(() => {
            oyunuBitir(false, true); // Yakalanarak oyunu bitir
        }, 1000); // 1 saniye
    }

    function createParticle(type) {
        const particle = document.createElement('div');
        particle.className = `particle ${type}`;
        const randomX = (Math.random() - 0.5) * 250;
        const randomY = (Math.random() * 80) + 20;
        const randomRot = (Math.random() - 0.5) * 720;
        particle.style.setProperty('--end-x', randomX + 'px');
        particle.style.setProperty('--end-y', randomY + 'px');
        particle.style.setProperty('--end-rot', randomRot + 'deg');
        particle.style.left = (dino.offsetLeft + 20) + 'px';
        particle.style.top = (dino.offsetTop + 40) + 'px';
        particleContainer.appendChild(particle);
        setTimeout(() => { particle.remove(); }, 1000);
    }

    // Hem zıplama hem tıklama için ortak eylem fonksiyonu
    function handlePlayerAction() {
        if (!oyunAktif) return;
        jump();
        if (bossSavasinda) {
            setBossTimer(); // Her zıpladığında yakalanma sayacını sıfırla ve yeniden başlat
            let odemeMiktari = 50;
            if (bakiye >= odemeMiktari && aktifBoss.borc > 0) {
                bakiye -= odemeMiktari;
                aktifBoss.borc -= odemeMiktari;
                guncelleEkrani();
                createParticle('banknote');

                if (aktifBoss.borc <= 0) {
                    bossSavasinda = false;
                    clearTimeout(bossYakalanmaTimer);
                    mevcutBossSira++;
                    gosterMesaj("Borç Ödendi!", '#4CAF50');
                    bossAlani.innerHTML = '';
                    dino.classList.remove('dino-boss-position');
                    obstacle.style.display = 'block';
                    if (mevcutBossSira >= bosslar.length) {
                        oyunuBitir(true);
                    }
                }
            } else if (bakiye < odemeMiktari) {
                gosterMesaj("Yetersiz Bakiye! Ay sonu gelmedi dostum", '#ff4d4d');
            }
        }
    }

    function oyunuBaslat() {
        introOverlay.style.opacity = '0';
        setTimeout(() => { introOverlay.style.display = 'none'; }, 500);
        gameUI.style.visibility = 'visible';
        obstacle.classList.remove('paused-animation');
        backgroundEffect.classList.remove('paused-animation');
        oyunAktif = true;
        gosterMesaj("Maaş Yattı: 22500 TL", '#4CAF50');
        guncelleEkrani();
        oyunDongusu = setInterval(function() {
            if (!oyunAktif) return;
            let dinoTop = parseInt(window.getComputedStyle(dino).getPropertyValue('top'));
            let obstacleLeft = parseInt(window.getComputedStyle(obstacle).getPropertyValue('left'));
            if (obstacleLeft < 110 && obstacleLeft > 50 && dinoTop >= 170) {
                bakiye -= 500;
                createParticle('coin');
                guncelleEkrani();
                gosterMesaj("-500 TL Ceza!", '#ff4d4d', 1000);
                obstacle.style.display = 'none';
                setTimeout(() => { obstacle.style.display = 'block'; }, 500);
                if (bakiye < 0) { oyunuBitir(false); }
            }
            if (obstacleLeft < 50 && !kartPuanlandi) {
                kartPuanlandi = true;
                if (!bossSavasinda) {
                    atlananKartSayisi++;
                    guncelleEkrani();
                    if (atlananKartSayisi > 0 && atlananKartSayisi % 10 === 0) {
                        bossuGetir();
                    }
                }
            }
        }, 20);
    }

    // --- Olay Dinleyicileri ---
    obstacle.addEventListener('animationiteration', () => {
        kartPuanlandi = false;
    });
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space') {
            handlePlayerAction();
        }
    });
    gameContainer.addEventListener('click', handlePlayerAction);
    restartButton.addEventListener('click', function() {
        location.reload();
    });
    startGameButton.addEventListener('click', oyunuBaslat);

});
