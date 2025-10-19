document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");

  startBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "startBlocking" });
    window.close();
  });

  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopBlocking" });
    window.close();
  });
});