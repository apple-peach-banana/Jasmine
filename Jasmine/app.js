const canvas = document.getElementById("analysisCanvas");
const ctx = canvas.getContext("2d");

const mediaInput = document.getElementById("mediaInput");
const mediaMeta = document.getElementById("mediaMeta");
const iceDirection = document.getElementById("iceDirection");
const uploadModeBtn = document.getElementById("uploadModeBtn");
const cameraModeBtn = document.getElementById("cameraModeBtn");
const uploadPanel = document.getElementById("uploadPanel");
const cameraPanel = document.getElementById("cameraPanel");
const startCameraBtn = document.getElementById("startCameraBtn");
const capturePhotoBtn = document.getElementById("capturePhotoBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");
const cameraStatus = document.getElementById("cameraStatus");
const cameraPreview = document.getElementById("cameraPreview");
const hiddenVideo = document.getElementById("hiddenVideo");
const hiddenImage = document.getElementById("hiddenImage");
const videoControls = document.getElementById("videoControls");
const videoScrubber = document.getElementById("videoScrubber");
const playPauseBtn = document.getElementById("playPauseBtn");
const markReleaseBtn = document.getElementById("markReleaseBtn");
const markTargetBtn = document.getElementById("markTargetBtn");
const resetPointsBtn = document.getElementById("resetPointsBtn");
const downloadBtn = document.getElementById("downloadBtn");
const aimAdjustment = document.getElementById("aimAdjustment");
const absoluteAngle = document.getElementById("absoluteAngle");
const lineDistance = document.getElementById("lineDistance");
const coachingNote = document.getElementById("coachingNote");

const state = {
  mediaType: null,
  mediaUrl: null,
  mediaWidth: canvas.width,
  mediaHeight: canvas.height,
  renderBox: null,
  activeMarker: "release",
  releasePoint: null,
  targetPoint: null,
  isVideoPlaying: false,
  inputMode: "upload",
  cameraFacingMode: "environment",
  cameraStream: null,
};

const directionVectors = {
  up: { x: 0, y: -1, label: "up-ice" },
  down: { x: 0, y: 1, label: "down-ice" },
  left: { x: -1, y: 0, label: "left" },
  right: { x: 1, y: 0, label: "right" },
};

function resetReadout() {
  aimAdjustment.textContent = "Waiting for two points";
  absoluteAngle.textContent = "--";
  lineDistance.textContent = "--";
  coachingNote.textContent =
    "Upload or capture a frame, then mark the release and target to generate a shot line.";
}

function setActiveMarker(marker) {
  state.activeMarker = marker;
  markReleaseBtn.classList.toggle("is-active", marker === "release");
  markTargetBtn.classList.toggle("is-active", marker === "target");
}

function revokeCurrentUrl() {
  if (state.mediaUrl) {
    URL.revokeObjectURL(state.mediaUrl);
    state.mediaUrl = null;
  }
}

function stopPlaybackMedia() {
  hiddenVideo.pause();
  state.isVideoPlaying = false;
  playPauseBtn.textContent = "Play";
}

function clearPoints() {
  state.releasePoint = null;
  state.targetPoint = null;
  resetReadout();
  drawScene();
}

function setInputMode(mode) {
  const isCameraMode = mode === "camera";
  state.inputMode = mode;
  uploadModeBtn.classList.toggle("is-active", !isCameraMode);
  cameraModeBtn.classList.toggle("is-active", isCameraMode);
  uploadPanel.classList.toggle("hidden", isCameraMode);
  cameraPanel.classList.toggle("hidden", !isCameraMode);
  cameraPreview.classList.toggle("hidden", !isCameraMode || !state.cameraStream);
  canvas.classList.toggle("hidden", isCameraMode && Boolean(state.cameraStream));
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }

  cameraPreview.pause();
  cameraPreview.srcObject = null;
  cameraPreview.classList.add("hidden");

  if (state.inputMode === "camera") {
    canvas.classList.remove("hidden");
  }
}

function loadImage(file) {
  stopCamera();
  revokeCurrentUrl();
  const url = URL.createObjectURL(file);
  state.mediaUrl = url;
  state.mediaType = "image";
  hiddenImage.onload = () => {
    state.mediaWidth = hiddenImage.naturalWidth || canvas.width;
    state.mediaHeight = hiddenImage.naturalHeight || canvas.height;
    mediaMeta.textContent = `${file.name} • ${state.mediaWidth} x ${state.mediaHeight}`;
    videoControls.classList.add("hidden");
    stopPlaybackMedia();
    clearPoints();
  };
  hiddenImage.src = url;
}

function loadVideo(file) {
  stopCamera();
  revokeCurrentUrl();
  const url = URL.createObjectURL(file);
  state.mediaUrl = url;
  state.mediaType = "video";
  hiddenVideo.onloadedmetadata = () => {
    state.mediaWidth = hiddenVideo.videoWidth || canvas.width;
    state.mediaHeight = hiddenVideo.videoHeight || canvas.height;
    videoScrubber.value = 0;
    videoControls.classList.remove("hidden");
    mediaMeta.textContent = `${file.name} • ${state.mediaWidth} x ${state.mediaHeight} • ${hiddenVideo.duration.toFixed(1)}s`;
    clearPoints();
    hiddenVideo.currentTime = 0;
    drawScene();
  };
  hiddenVideo.src = url;
  hiddenVideo.load();
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = "This browser does not support camera access.";
    return;
  }

  stopPlaybackMedia();
  revokeCurrentUrl();

  if (state.cameraStream) {
    stopCamera();
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: state.cameraFacingMode } },
      audio: false,
    });

    state.cameraStream = stream;
    cameraPreview.srcObject = stream;
    await cameraPreview.play();
    cameraPreview.classList.remove("hidden");
    canvas.classList.add("hidden");
    cameraStatus.textContent =
      state.cameraFacingMode === "environment"
        ? "Rear camera live. Frame the shot from the athlete view, then capture."
        : "Front camera live. Flip back to the rear camera for real shot planning.";
  } catch (error) {
    cameraStatus.textContent =
      "Camera access was blocked or unavailable. Check browser permissions and try again.";
  }
}

function captureCameraFrame() {
  if (!state.cameraStream || !cameraPreview.videoWidth || !cameraPreview.videoHeight) {
    cameraStatus.textContent = "Start the camera before capturing a frame.";
    return;
  }

  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = cameraPreview.videoWidth;
  offscreenCanvas.height = cameraPreview.videoHeight;
  const offscreenContext = offscreenCanvas.getContext("2d");
  offscreenContext.drawImage(cameraPreview, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

  state.mediaType = "image";
  state.mediaWidth = offscreenCanvas.width;
  state.mediaHeight = offscreenCanvas.height;
  hiddenImage.src = offscreenCanvas.toDataURL("image/png");
  mediaMeta.textContent = `Live camera capture • ${state.mediaWidth} x ${state.mediaHeight}`;
  cameraStatus.textContent =
    "Photo captured. Tap the release point and the target point on the frame.";
  videoControls.classList.add("hidden");
  clearPoints();
  stopCamera();
}

function computeRenderBox() {
  const mediaAspect = state.mediaWidth / state.mediaHeight;
  const canvasAspect = canvas.width / canvas.height;

  let drawWidth = canvas.width;
  let drawHeight = canvas.height;
  let offsetX = 0;
  let offsetY = 0;

  if (mediaAspect > canvasAspect) {
    drawHeight = drawWidth / mediaAspect;
    offsetY = (canvas.height - drawHeight) / 2;
  } else {
    drawWidth = drawHeight * mediaAspect;
    offsetX = (canvas.width - drawWidth) / 2;
  }

  state.renderBox = { x: offsetX, y: offsetY, width: drawWidth, height: drawHeight };
}

function getDisplayedPointFromNative(point) {
  if (!point || !state.renderBox) {
    return null;
  }

  return {
    x: state.renderBox.x + (point.x / state.mediaWidth) * state.renderBox.width,
    y: state.renderBox.y + (point.y / state.mediaHeight) * state.renderBox.height,
  };
}

function getNativePointFromCanvas(x, y) {
  if (!state.renderBox) {
    return null;
  }

  const relativeX = (x - state.renderBox.x) / state.renderBox.width;
  const relativeY = (y - state.renderBox.y) / state.renderBox.height;

  if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
    return null;
  }

  return {
    x: relativeX * state.mediaWidth,
    y: relativeY * state.mediaHeight,
  };
}

function drawMarker(point, color, label) {
  if (!point) {
    return;
  }

  ctx.save();
  ctx.font = "16px Georgia";
  ctx.beginPath();
  ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.stroke();

  ctx.fillStyle = "rgba(24, 33, 38, 0.86)";
  ctx.fillRect(point.x + 18, point.y - 14, ctx.measureText(label).width + 18, 28);
  ctx.fillStyle = "#fffaf0";
  ctx.fillText(label, point.x + 28, point.y + 5);
  ctx.restore();
}

function drawGuideLine(release, target) {
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(208, 140, 0, 0.95)";
  ctx.beginPath();
  ctx.moveTo(release.x, release.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const angle = Math.atan2(target.y - release.y, target.x - release.x);
  const arrowLength = 24;
  ctx.beginPath();
  ctx.moveTo(target.x, target.y);
  ctx.lineTo(
    target.x - arrowLength * Math.cos(angle - Math.PI / 6),
    target.y - arrowLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.moveTo(target.x, target.y);
  ctx.lineTo(
    target.x - arrowLength * Math.cos(angle + Math.PI / 6),
    target.y - arrowLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.stroke();
  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  computeRenderBox();

  ctx.fillStyle = "#dce9ee";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.renderBox) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  if (state.mediaType === "image" && hiddenImage.src) {
    ctx.drawImage(
      hiddenImage,
      state.renderBox.x,
      state.renderBox.y,
      state.renderBox.width,
      state.renderBox.height,
    );
  } else if (state.mediaType === "video" && hiddenVideo.src) {
    ctx.drawImage(
      hiddenVideo,
      state.renderBox.x,
      state.renderBox.y,
      state.renderBox.width,
      state.renderBox.height,
    );
  } else {
    drawEmptyState();
    return;
  }

  const release = getDisplayedPointFromNative(state.releasePoint);
  const target = getDisplayedPointFromNative(state.targetPoint);

  if (release && target) {
    drawGuideLine(release, target);
  }

  drawMarker(release, "#f25f5c", "Release");
  drawMarker(target, "#247ba0", "Target");
}

function drawEmptyState() {
  ctx.save();
  ctx.fillStyle = "rgba(12, 124, 89, 0.12)";
  ctx.fillRect(80, 110, canvas.width - 160, canvas.height - 220);
  ctx.strokeStyle = "rgba(12, 124, 89, 0.28)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.strokeRect(80, 110, canvas.width - 160, canvas.height - 220);
  ctx.setLineDash([]);
  ctx.fillStyle = "#182126";
  ctx.font = "36px Georgia";
  ctx.fillText("Drop in a curling photo or start the camera", 140, canvas.height / 2 - 10);
  ctx.font = "22px Georgia";
  ctx.fillStyle = "#5d6a6b";
  ctx.fillText("Then mark the release point and scoring target.", 140, canvas.height / 2 + 34);
  ctx.restore();
}

function normalizeDegrees(angle) {
  let normalized = angle;
  while (normalized <= -180) normalized += 360;
  while (normalized > 180) normalized -= 360;
  return normalized;
}

function describeAdjustment(adjustment, directionLabel) {
  const magnitude = Math.abs(adjustment);

  if (magnitude < 0.2) {
    return `Play it nearly straight ${directionLabel}`;
  }

  const turn = adjustment > 0 ? "clockwise" : "counterclockwise";
  return `${magnitude.toFixed(1)}° ${turn} from straight ${directionLabel}`;
}

function updateReadout() {
  if (!state.releasePoint || !state.targetPoint) {
    resetReadout();
    return;
  }

  const dx = state.targetPoint.x - state.releasePoint.x;
  const dy = state.targetPoint.y - state.releasePoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const absolute = Math.atan2(dy, dx) * (180 / Math.PI);
  const selectedDirection = directionVectors[iceDirection.value];
  const directionAngle = Math.atan2(selectedDirection.y, selectedDirection.x) * (180 / Math.PI);
  const adjustment = normalizeDegrees(absolute - directionAngle);
  const lateral = Math.abs(adjustment);

  aimAdjustment.textContent = describeAdjustment(adjustment, selectedDirection.label);
  absoluteAngle.textContent = `${normalizeDegrees(absolute).toFixed(1)}° from frame x-axis`;
  lineDistance.textContent = `${distance.toFixed(0)} px`;

  coachingNote.textContent =
    lateral < 3
      ? "This looks like a nearly straight takeout or draw line from the chosen frame."
      : `The shot line rotates ${lateral.toFixed(1)}° from the straight ${selectedDirection.label} path, based on the frame geometry you marked.`;
}

function updateFromScrubber() {
  if (state.mediaType !== "video" || !Number.isFinite(hiddenVideo.duration)) {
    return;
  }

  const progress = Number(videoScrubber.value) / 1000;
  hiddenVideo.currentTime = hiddenVideo.duration * progress;
}

mediaInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  setInputMode("upload");

  if (file.type.startsWith("image/")) {
    loadImage(file);
  } else if (file.type.startsWith("video/")) {
    loadVideo(file);
  } else {
    mediaMeta.textContent = "Unsupported file type. Please choose an image or video.";
  }
});

uploadModeBtn.addEventListener("click", () => {
  setInputMode("upload");
  stopCamera();
});

cameraModeBtn.addEventListener("click", () => {
  setInputMode("camera");
  mediaMeta.textContent =
    "Camera mode ready. Start the camera, capture a rink photo, then mark the shot.";
  drawScene();
});

startCameraBtn.addEventListener("click", async () => {
  setInputMode("camera");
  await startCamera();
});

capturePhotoBtn.addEventListener("click", captureCameraFrame);

switchCameraBtn.addEventListener("click", async () => {
  state.cameraFacingMode = state.cameraFacingMode === "environment" ? "user" : "environment";
  if (state.cameraStream) {
    await startCamera();
  } else {
    cameraStatus.textContent =
      state.cameraFacingMode === "environment"
        ? "Rear camera selected. Start camera when ready."
        : "Front camera selected. Flip again for rear camera.";
  }
});

stopCameraBtn.addEventListener("click", () => {
  stopCamera();
  cameraStatus.textContent = "Camera stopped.";
});

markReleaseBtn.addEventListener("click", () => setActiveMarker("release"));
markTargetBtn.addEventListener("click", () => setActiveMarker("target"));
resetPointsBtn.addEventListener("click", clearPoints);

downloadBtn.addEventListener("click", () => {
  drawScene();
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "curl-angle-overlay.png";
  link.click();
});

iceDirection.addEventListener("change", updateReadout);

canvas.addEventListener("click", (event) => {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  const point = getNativePointFromCanvas(
    (event.clientX - bounds.left) * scaleX,
    (event.clientY - bounds.top) * scaleY,
  );

  if (!point) {
    return;
  }

  if (state.activeMarker === "release") {
    state.releasePoint = point;
  } else {
    state.targetPoint = point;
  }

  drawScene();
  updateReadout();
});

videoScrubber.addEventListener("input", () => {
  if (state.isVideoPlaying) {
    hiddenVideo.pause();
    state.isVideoPlaying = false;
    playPauseBtn.textContent = "Play";
  }
  updateFromScrubber();
});

playPauseBtn.addEventListener("click", async () => {
  if (state.mediaType !== "video") {
    return;
  }

  if (state.isVideoPlaying) {
    hiddenVideo.pause();
    state.isVideoPlaying = false;
    playPauseBtn.textContent = "Play";
  } else {
    await hiddenVideo.play();
    state.isVideoPlaying = true;
    playPauseBtn.textContent = "Pause";
  }
});

hiddenVideo.addEventListener("timeupdate", () => {
  if (Number.isFinite(hiddenVideo.duration) && hiddenVideo.duration > 0) {
    videoScrubber.value = Math.round((hiddenVideo.currentTime / hiddenVideo.duration) * 1000);
  }
  drawScene();
});

hiddenVideo.addEventListener("pause", () => {
  state.isVideoPlaying = false;
  playPauseBtn.textContent = "Play";
  drawScene();
});

hiddenVideo.addEventListener("seeked", drawScene);
hiddenImage.addEventListener("load", drawScene);
window.addEventListener("resize", drawScene);
window.addEventListener("beforeunload", stopCamera);

resetReadout();
setInputMode("upload");
drawScene();
