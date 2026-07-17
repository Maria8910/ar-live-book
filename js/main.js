/*
 * main.js — AR Live Book
 * Логика управления AR-сценой: доступ к камере, обработка маркеров,
 * управление видео, перезапуск камеры.
 */

(function () {
  "use strict";

  // ===================== DOM references =====================
  const scene = document.getElementById("ar-scene");
  const statusText = document.getElementById("status-text");
  const statusBadge = document.getElementById("status-badge");
  const cameraError = document.getElementById("camera-error");
  const nftLoading = document.getElementById("nft-loading");
  const nftLoadingText = document.getElementById("nft-loading-text");
  const hintOverlay = document.getElementById("hint-overlay");
  const restartBtn = document.getElementById("restart-camera-btn");

  // ===================== Config =====================
  const MARKERS = [
    {
      id: "nft-marker-1",
      videoId: "video1",
      arVideoId: "ar-video-1",
      label: "image1",
    },
    {
      id: "nft-marker-2",
      videoId: "video2",
      arVideoId: "ar-video-2",
      label: "image2",
    },
    {
      id: "nft-marker-3",
      videoId: "video3",
      arVideoId: "ar-video-3",
      label: "image3",
    },
  ];

  const FADE_DURATION = 300; // ms

  // ===================== Helpers =====================

  function log(tag, msg) {
    console.log(`[AR Live Book] ${tag} — ${msg}`);
  }

  function setStatus(text, type) {
    statusText.textContent = text;
    statusBadge.className = `badge badge-${type}`;
  }

  function showEl(el) {
    el.classList.remove("hidden");
  }

  function hideEl(el) {
    el.classList.add("hidden");
  }

  function getVideoElement(videoId) {
    return document.getElementById(videoId);
  }

  function getArVideoElement(arVideoId) {
    return document.getElementById(arVideoId);
  }

  /**
   * Плавно меняем opacity у <a-video> через A-Frame animation.
   */
  function fadeArVideo(arVideoEl, targetOpacity, duration) {
    if (!arVideoEl) return;
    arVideoEl.setAttribute("animation__fade", {
      property: "opacity",
      to: targetOpacity,
      dur: duration,
      easing: "easeInOutQuad",
    });
    // Убираем анимацию после завершения, чтобы не мешать следующим вызовам
    arVideoEl.addEventListener(
      "animationcomplete__fade",
      () => {
        arVideoEl.removeAttribute("animation__fade");
      },
      { once: true }
    );
  }

  // ===================== Camera access =====================

  async function requestCameraAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      log("camera", "Access granted");
      return stream;
    } catch (err) {
      log("camera", `Error: ${err.name} — ${err.message}`);
      showEl(cameraError);
      setStatus("Камера недоступна", "error");
      return null;
    }
  }

  // ===================== Video playback =====================

  function playVideo(videoEl) {
    if (!videoEl) return;
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          log("video", `Playback started: ${videoEl.id}`);
        })
        .catch((err) => {
          log("video", `Play failed for ${videoEl.id}: ${err.message}`);
        });
    }
  }

  function stopVideo(videoEl) {
    if (!videoEl) return;
    videoEl.pause();
    videoEl.currentTime = 0;
    log("video", `Stopped & reset: ${videoEl.id}`);
  }

  // ===================== Marker event handlers =====================

  function setupMarkerEvents() {
    MARKERS.forEach((marker) => {
      const markerEl = document.getElementById(marker.id);
      if (!markerEl) {
        log("warn", `Marker element not found: ${marker.id}`);
        return;
      }

      // markerFound
      markerEl.addEventListener("markerFound", () => {
        log("event", `markerFound: ${marker.label}`);
        setStatus("Отслеживание", "tracking");
        hideEl(hintOverlay);

        const videoEl = getVideoElement(marker.videoId);
        const arVideoEl = getArVideoElement(marker.arVideoId);
        const debugOverlay = document.getElementById("debug-video-overlay");

        // --- DEBUG: показываем квадратное видео-окно ---
        if (debugOverlay) {
          debugOverlay.src = videoEl.src;
          debugOverlay.pause();
          debugOverlay.currentTime = 0;
          debugOverlay.play().catch(e => log("video", `overlay play error: ${e.message}`));
          debugOverlay.style.display = "block";
          log("video", `DEBUG overlay shown: ${marker.videoId}`);
        }

        // Прямо ставим opacity=1 без анимации
        if (arVideoEl) {
          arVideoEl.setAttribute("material", "opacity", 1);
          arVideoEl.setAttribute("visible", true);
          log("video", `Opacity set to 1: ${arVideoEl.id}`);
        }
        playVideo(videoEl);
      });

      // markerLost
      markerEl.addEventListener("markerLost", () => {
        log("event", `markerLost: ${marker.label}`);
        setStatus("AR готов", "ready");
        showEl(hintOverlay);

        const videoEl = getVideoElement(marker.videoId);
        const arVideoEl = getArVideoElement(marker.arVideoId);
        const debugOverlay = document.getElementById("debug-video-overlay");

        // Скрываем оверлей
        if (debugOverlay) {
          debugOverlay.pause();
          debugOverlay.src = "";
          debugOverlay.style.display = "none";
          log("video", `DEBUG overlay hidden`);
        }

        if (arVideoEl) {
          arVideoEl.setAttribute("material", "opacity", 0);
        }
        stopVideo(videoEl);
      });
    });
  }

  // ===================== NFT initialization =====================

  function setupNftLoading() {
    let loadedCount = 0;
    const total = MARKERS.length;

    // DEBUG: проверить что элементы вообще существуют
    MARKERS.forEach((marker) => {
      const el = document.getElementById(marker.id);
      log("nft-check", `${marker.id} exists=${!!el}, url=${el?.getAttribute('url') || 'N/A'}`);
      // Проверить, инициализирован ли компонент nft на элементе
      if (el) {
        log("nft-check", `  components: ${Object.keys(el.components || {}).join(', ') || 'none yet'}`);
      }
    });

    MARKERS.forEach((marker) => {
      const markerEl = document.getElementById(marker.id);
      if (!markerEl) return;

      markerEl.addEventListener("ar-nft-loaded", () => {
        loadedCount++;
        log("nft", `Descriptor loaded: ${marker.label} (${loadedCount}/${total})`);
        nftLoadingText.textContent = `Загрузка ${marker.label}… (${loadedCount}/${total})`;
        checkAllLoaded();
      });

      markerEl.addEventListener("ar-nft-error", (e) => {
        log("nft", `Descriptor error: ${marker.label} — detail: ${JSON.stringify(e.detail || {})}`);
        nftLoadingText.textContent = `Ошибка загрузки: ${marker.label}`;
      });
    });

    function checkAllLoaded() {
      if (loadedCount >= total) {
        setTimeout(() => {
          hideEl(nftLoading);
          setStatus("AR готов", "ready");
        }, 800);
      }
    }
  }

  // ===================== AR.js events =====================

  function setupSceneEvents() {
    scene.addEventListener("arjs-video-loaded", () => {
      log("event", "arjs-video-loaded");
    });

    scene.addEventListener("arReady", () => {
      log("event", "arReady");
      setStatus("AR готов", "ready");
    });

    scene.addEventListener("loaded", () => {
      log("event", "scene loaded");
    });
  }

  // ===================== Camera restart =====================

  async function restartCamera() {
    log("camera", "Restarting camera…");
    setStatus("Перезапуск камеры…", "loading");
    showEl(nftLoading);
    nftLoadingText.textContent = "Перезапуск камеры…";

    try {
      scene.stop();
    } catch (_) {
      // ignore if already stopped
    }

    const stream = await requestCameraAccess();
    if (!stream) return;

    window.location.reload();
  }

  // ===================== Init =====================

  async function init() {
    // Debug camera
    const debugVideo = document.getElementById("debug-camera");
    if (debugVideo) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          debugVideo.srcObject = stream;
          debugVideo.play();
          console.log("[AR Live Book] debug — камера отображается в углу");
        })
        .catch((err) => {
          console.warn("[AR Live Book] debug — не удалось показать камеру:", err);
        });
    }

    log("init", "Starting AR Live Book…");

    const stream = await requestCameraAccess();
    if (!stream) {
      log("init", "Camera access denied — stopping");
      return;
    }

    setupMarkerEvents();
    setupSceneEvents();
    setupNftLoading();

    setTimeout(() => {
      hideEl(nftLoading);
      setStatus("AR готов", "ready");
      showEl(hintOverlay);
    }, 6000);

    restartBtn.addEventListener("click", restartCamera);

    log("init", "Initialization complete");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
