      (async () => {
        const asciiChars = " .:-=+*#%@";
        const frameRate = 15;
        const scaleWidth = 160;
        const interval = Math.floor(1000 / frameRate);
        const videoElement = document.querySelector("video.original-video");
        const scaledVideo = document.querySelector("canvas.scaled-video");
        const asciiVideo = document.querySelector(".ascii-video");
        const topBar = document.querySelector(".top-bar");
        const topBarToggle = document.querySelector(".top-bar-toggle");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        }); // Request audio as well
        videoElement.srcObject = stream;
        try {
          videoElement.play();
        } catch (error) {
          console.error("Error playing video:", error);
        }
        const ctx = scaledVideo.getContext("2d"); // Removed willReadFrequently
        let recorder;
        let recordingChunks = [];

        function toggleTopBar() {
          if (topBar.classList.contains("collapsed")) {
            topBar.classList.remove("collapsed");
            topBarToggle.innerHTML = "▼";
          } else {
            topBar.classList.add("collapsed");
            topBarToggle.innerHTML = "▲";
          }
        }
        topBarToggle.addEventListener("click", toggleTopBar);

        function getBrightnessAdjustedChar(r, g, b, brightness) {
          let brightnessValue = (r + g + b) / 3; // Simple brightness calculation
          brightnessValue += brightness; // Apply brightness adjustment
          brightnessValue = Math.max(0, Math.min(255, brightnessValue)); // Clamp to 0-255
          const charIndex = Math.floor((brightnessValue / 255) * (asciiChars.length - 1));
          return asciiChars[charIndex];
        }

        function draw() {
          if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
            console.error("Video metadata not loaded yet. Skipping this frame.");
            setTimeout(draw, interval);
            return;
          }
          const scaleRatio = scaleWidth / videoElement.videoWidth;
          const scaledHeight = videoElement.videoHeight * scaleRatio;
          scaledVideo.width = scaleWidth;
          scaledVideo.height = scaledHeight;
          ctx.drawImage(videoElement, 0, 0, scaleWidth, scaledHeight);
          const imageData = ctx.getImageData(0, 0, scaledVideo.width, scaledVideo.height).data;
          let ascii = "";
          const brightness = parseInt(document.getElementById("brightness").value, 10);
          for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const char = getBrightnessAdjustedChar(r, g, b, brightness);
            ascii += char;
            if ((i / 4 + 1) % scaledVideo.width === 0) {
              ascii += "\n";
            }
          }
          asciiVideo.textContent = ascii;
          setTimeout(draw, interval);
        }
        document.getElementById("font-size").addEventListener("input", function() {
          asciiVideo.style.fontSize = this.value + "px";
          asciiVideo.style.lineHeight = (this.value - 2) + "px";
        });
        document.getElementById("foreground-color").addEventListener("change", function() {
          asciiVideo.style.color = this.value;
        });
        document.getElementById("background-color").addEventListener("change", function() {
          asciiVideo.style.backgroundColor = this.value;
        });
        document.getElementById("gradient-mode").addEventListener("change", function() {
          const selectedGradient = this.value;
          const asciiVideo = document.querySelector(".ascii-video");
          // Remove any existing gradient classes
          asciiVideo.className = asciiVideo.className.replace(/font-gradient-\\S+/g, "").trim();
          // Apply the selected gradient class, if not "none"
          if (selectedGradient !== "none") {
            asciiVideo.classList.add(selectedGradient);
          } else {
            asciiVideo.style.backgroundColor = document.getElementById("background-color").value;
            asciiVideo.style.color = document.getElementById("foreground-color").value;
          }
        });
        document.getElementById("color-cycle").addEventListener("change", function() {
          if (this.checked) {
            asciiVideo.classList.add("color-cycling");
          } else {
            document.body.style.animation = "none";
            asciiVideo.classList.remove("color-cycling");
            asciiVideo.style.color = document.getElementById("foreground-color").value;
          }
        });
        document.getElementById("color-cycle-bg").addEventListener("change", function() {
          if (this.checked) {
            asciiVideo.classList.add("color-cycling-bg");
          } else {
            document.body.style.animation = "none";
            asciiVideo.classList.remove("color-cycling-bg");
            asciiVideo.style.backgroundColor = document.getElementById("background-color").value;
          }
        });
        document.getElementById("save-ascii").addEventListener("click", function() {
          const snapshotScaleWidth = 80; // Adjusted width for the snapshot
          const snapshotCanvas = document.createElement("canvas");
          const snapshotCtx = snapshotCanvas.getContext("2d");
          snapshotCanvas.width = snapshotScaleWidth;
          snapshotCanvas.height = videoElement.videoHeight / (videoElement.videoWidth / snapshotScaleWidth);
          snapshotCtx.drawImage(
            videoElement,
            0,
            0,
            snapshotCanvas.width,
            snapshotCanvas.height
          );
          const imageData = snapshotCtx.getImageData(
            0,
            0,
            snapshotCanvas.width,
            snapshotCanvas.height
          ).data;
          let ascii = "";
          const brightness = parseInt(document.getElementById("brightness").value, 10);
          for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const char = getBrightnessAdjustedChar(r, g, b, brightness);
            ascii += char;
            if ((i / 4 + 1) % snapshotCanvas.width === 0) {
              ascii += "\n";
            }
          }
          const blob = new Blob([ascii], {
            type: "text/plain"
          });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "ascii-snapshot.txt";
          link.click();
        });
        document.getElementById("save-image").addEventListener("click", function() {
          html2canvas(asciiVideo).then((canvas) => {
            const link = document.createElement("a");
            link.download = "ascii-snapshot.png";
            link.href = canvas.toDataURL();
            link.click();
          });
        });
        let animationFrameId;
        let intervalId = null;
        document.getElementById("record-button").addEventListener("click", function() {
          const button = this;
          if (recorder && recorder.state === "recording") {
            recorder.stop();
            button.textContent = "Start Recording";
            button.classList.remove("recording");
            if (intervalId) {
              clearInterval(intervalId)
              intervalId = null
            }
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
            return;
          }
          const recordingCanvas = document.createElement("canvas");
          const asciiElement = document.querySelector(".ascii-video");
          recordingCanvas.width = asciiElement.offsetWidth;
          recordingCanvas.height = asciiElement.offsetHeight;
          const ctx = recordingCanvas.getContext("2d");
          // Get the audio track from the existing video stream
          const audioTracks = videoElement.srcObject.getAudioTracks();
          // Create a new media stream that includes both the canvas and audio track
          let combinedStream = recordingCanvas.captureStream(frameRate);
          if (audioTracks.length > 0) {
            audioTracks.forEach(track => {
              combinedStream.addTrack(track)
            })
          }
          recorder = new MediaRecorder(combinedStream, {
            mimeType: "video/webm"
          });
          let recordingChunks = [];
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordingChunks.push(event.data);
            }
          };
          recorder.onstop = () => {
            const blob = new Blob(recordingChunks, {
              type: "video/webm"
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "ascii-video.webm";
            link.click();
            URL.revokeObjectURL(url);
            recordingChunks = [];
          };
          const drawAsciiToCanvas = () => {
            const asciiElement = document.querySelector(".ascii-video"); // make sure this is always retrieved
            ctx.clearRect(0, 0, recordingCanvas.width, recordingCanvas.height); // Clear the canvas on each frame
            ctx.fillStyle = getComputedStyle(asciiElement).backgroundColor || 'black';
            ctx.fillRect(0, 0, recordingCanvas.width, recordingCanvas.height);
            ctx.fillStyle = getComputedStyle(asciiElement).color || 'white';
            ctx.font = `${getComputedStyle(asciiElement).fontSize} ${getComputedStyle(asciiElement).fontFamily}`;
            ctx.textBaseline = "top";
            const lines = asciiElement.textContent.split("\n");
            const lineHeight = parseInt(getComputedStyle(asciiElement).lineHeight, 10);
            lines.forEach((line, i) => {
              let x = 0;
              let gradient = null;
              if (asciiElement.classList.contains("font-gradient-red-blue")) {
                gradient = ctx.createLinearGradient(0, 0, recordingCanvas.width, 0);
                gradient.addColorStop(0, "red");
                gradient.addColorStop(1, "blue");
              } else if (asciiElement.classList.contains("font-gradient-green-yellow")) {
                gradient = ctx.createLinearGradient(0, 0, recordingCanvas.width, 0);
                gradient.addColorStop(0, "green");
                gradient.addColorStop(1, "yellow");
              } else if (asciiElement.classList.contains("font-gradient-purple-orange")) {
                gradient = ctx.createLinearGradient(0, 0, recordingCanvas.width, 0);
                gradient.addColorStop(0, "purple");
                gradient.addColorStop(1, "orange");
              } else if (asciiElement.classList.contains("font-gradient-blue-green")) {
                gradient = ctx.createLinearGradient(0, 0, recordingCanvas.width, 0);
                gradient.addColorStop(0, "blue");
                gradient.addColorStop(1, "green");
              } else if (asciiElement.classList.contains("font-gradient-reggae")) {
                gradient = ctx.createLinearGradient(0, 0, recordingCanvas.width, 0);
                gradient.addColorStop(0, "green");
                gradient.addColorStop(0.5, "yellow");
                gradient.addColorStop(1, "red");
              } else if (asciiElement.classList.contains("font-gradient-usa")) {
                gradient = ctx.createLinearGradient(0, 0, recordingCanvas.width, 0);
                gradient.addColorStop(0, "red");
                gradient.addColorStop(0.5, "white");
                gradient.addColorStop(1, "blue");
              }
              if (gradient) {
                ctx.fillStyle = gradient;
              } else {
                ctx.fillStyle = getComputedStyle(asciiElement).color || 'white';
              }
              ctx.fillText(line, x, i * lineHeight);
            });
            if (recorder && recorder.state === "recording") {
              animationFrameId = requestAnimationFrame(drawAsciiToCanvas);
            }
          };
          recorder.start();
          button.textContent = "Stop Recording";
          button.classList.add("recording");
          drawAsciiToCanvas();
        });
        const html2canvasScript = document.createElement("script");
        html2canvasScript.onload = () => {
          console.log("html2canvas loaded successfully");
          draw();
        };
        html2canvasScript.onerror = () => console.error("Failed to load html2canvas");
        html2canvasScript.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
        document.head.appendChild(html2canvasScript);
      })();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}


// install button stuff
document.addEventListener("DOMContentLoaded", () => {
  console.log("PWA Install Script Loaded");

  let installPrompt = null;
  const installButton = document.querySelector("#install");

  if (!installButton) {
    console.error("Install button (#install) not found in the DOM.");
    return;
  }

  // Listen for the beforeinstallprompt event
  window.addEventListener("beforeinstallprompt", (event) => {
    console.log("beforeinstallprompt event fired");
    event.preventDefault(); // Prevent the default mini-infobar
    installPrompt = event; // Save the event for triggering later
    installButton.removeAttribute("hidden"); 
    installButton.style.display = "block"; 
  });

  // Add click listener to the install button
  installButton.addEventListener("click", async () => {
    console.log("Install button clicked");
    if (!installPrompt) {
      console.warn("Install prompt event is not available.");
      return;
    }

    try {
      // Trigger the install prompt
      const result = await installPrompt.prompt();
      console.log(`Install prompt outcome: ${result.outcome}`);

      // Check the outcome of the prompt
      if (result.outcome === "accepted") {
        console.log("User accepted the PWA installation.");
      } else {
        console.log("User dismissed the PWA installation.");
      }
    } catch (error) {
      console.error("Error during install prompt:", error);
    } finally {
      // Disable the in-app install prompt after the event
      disableInAppInstallPrompt();
    }
  });

  // Function to disable the in-app install prompt
  function disableInAppInstallPrompt() {
    installPrompt = null; // Clear the saved event
    installButton.setAttribute("hidden", ""); 
    installButton.style.display = "none"; 
    console.log("Install button disabled after interaction.");
  }

  // Optional: Notify if the browser does not support the beforeinstallprompt event
  if (!("onbeforeinstallprompt" in window)) {
    console.warn("This browser does not support the 'beforeinstallprompt' event.");
  }
});
