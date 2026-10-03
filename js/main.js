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
  const debugOverlay = document.getElementById("debug-overlay");

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
    {
      id: "nft-marker-4",
      videoId: "video4",
      arVideoId: "ar-video-4",
      label: "image4",
    },
    {
      id: "nft-marker-5",
      videoId: "video5",
      arVideoId: "ar-video-5",
      label: "image5",
    },
    {
      id: "nft-marker-6",
      videoId: "video6",
      arVideoId: "ar-video-6",
      label: "image6",
    },
    {
      id: "nft-marker-7",
      videoId: "video7",
      arVideoId: "ar-video-7",
      label: "image7",
    },
    {
      id: "nft-marker-8",
      videoId: "video8",
      arVideoId: "ar-video-8",
      label: "image8",
    },
    {
      id: "nft-marker-9",
      videoId: "video9",
      arVideoId: "ar-video-9",
      label: "image9",
    },
    {
      id: "nft-marker-10",
      videoId: "video10",
      arVideoId: "ar-video-10",
      label: "image10",
    },
    {
      id: "nft-marker-11",
      videoId: "video11",
      arVideoId: "ar-video-11",
      label: "image11",
    },
    {
      id: "nft-marker-12",
      videoId: "video12",
      arVideoId: "ar-video-12",
      label: "image12",
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
        debugOverlay.src = videoEl.src;
        debugOverlay.currentTime = 0;
        debugOverlay.style.display = "block";
        debugOverlay.play().catch(() => {});
      });

      // markerLost
      markerEl.addEventListener("markerLost", () => {
        log("event", `markerLost: ${marker.label}`);
        setStatus("AR готов", "ready");
        showEl(hintOverlay);

        debugOverlay.pause();
        debugOverlay.src = "";
        debugOverlay.style.display = "none";
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

    // Fix: convert relative NFT marker URLs to root-relative paths
    // This ensures Blob workers can resolve paths correctly
    MARKERS.forEach((marker) => {
      const markerEl = document.getElementById(marker.id);
      if (markerEl) {
        const currentUrl = markerEl.getAttribute("url");
        if (currentUrl && currentUrl.startsWith("./")) {
          const rootUrl = currentUrl.replace("./", "/");
          markerEl.setAttribute("url", rootUrl);
          log("init", `Fixed URL for ${marker.id}: ${rootUrl}`);
        }
      }
    });

    const stream = await requestCameraAccess();
    if (!stream) {
      log("init", "Camera access denied — stopping");
      return;
    }

    setupMarkerEvents();
    setupSceneEvents();
    setupNftLoading();

    // Fallback: send arjs-video-loaded when AR.js creates its video element
    // NFT workers wait for this event to start processing frames
    var checkArjsVideo = setInterval(function () {
      var vid = document.querySelector("#arjs-video");
      if (vid) {
        vid.addEventListener("loadeddata", function () {
          clearInterval(checkArjsVideo);
          window.dispatchEvent(new CustomEvent("arjs-video-loaded", {
            detail: { component: vid }
          }));
          log("event", "arjs-video-loaded (on loadeddata)");
        });
        // Also fire immediately if already loaded
        if (vid.readyState >= 2) {
          clearInterval(checkArjsVideo);
          window.dispatchEvent(new CustomEvent("arjs-video-loaded", {
            detail: { component: vid }
          }));
          log("event", "arjs-video-loaded (immediate dispatch)");
        }
      }
    }, 300);

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
