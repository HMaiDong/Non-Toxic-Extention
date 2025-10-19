let stopFlag = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startBlocking") {
    stopFlag = false;
    blockUsers();
  } else if (message.action === "stopBlocking") {
    stopFlag = true;
    console.log("🛑 Đã nhận lệnh dừng chặn!");
  }
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchList() {
  console.log("[STEP] Đang tải danh sách người dùng từ GitHub...");
  try {
    const res = await fetch("https://raw.githubusercontent.com/HMaiDong/LTN/refs/heads/main/toxic.txt");
    if (!res.ok) throw new Error("Không thể tải danh sách");
    const text = await res.text();
    const users = text.split("\n").map(x => x.trim().replace(/^@/, "")).filter(Boolean);
    console.log(`[OK] Đã tải ${users.length} username.`);
    return users;
  } catch (e) {
    console.error("❌ Lỗi tải danh sách:", e);
    return [];
  }
}

async function blockUsers() {
  const users = await fetchList();
  if (users.length === 0) return;

  for (let i = 0; i < users.length; i++) {
    if (stopFlag) {
      console.log("🛑 Dừng theo yêu cầu người dùng.");
      break;
    }

    const user = users[i];
    console.log(`\n[${i + 1}/${users.length}] Đang xử lý @${user}`);

    const tab = await new Promise(resolve => {
      chrome.tabs.create({ url: `https://www.tiktok.com/@${user}` }, resolve);
    });

    const pageLoaded = await waitForPageReady(tab.id, 20000);
    if (!pageLoaded) {
      console.warn(`⚠️ Trang @${user} không load được.`);
      chrome.tabs.remove(tab.id);
      continue;
    }

    const more = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: clickMoreButton
    });

    if (!more[0].result) {
      console.error("Không tìm thấy nút ba chấm.");
      chrome.tabs.remove(tab.id);
      continue;
    }

    await delay(2000);

    const block = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: clickBlockButton
    });

    if (!block[0].result) {
      console.error("Không tìm thấy nút Chặn.");
      chrome.tabs.remove(tab.id);
      continue;
    }

    await delay(2000);

    const confirm = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: clickConfirmButton
    });

    if (confirm[0].result) {
      console.log(`✅ Đã chặn @${user}`);
    } else {
      console.warn(`⚠️ Không tìm thấy nút xác nhận.`);
    }

    chrome.tabs.remove(tab.id);

    chrome.runtime.sendMessage({
      action: "updateProgress",
      percent: Math.round(((i + 1) / users.length) * 100)
    });

    await delay(1000);
  }

  chrome.runtime.sendMessage({ action: "done" });
  console.log("🎉 Hoàn tất chặn tất cả!");
}

// Chờ trang load
async function waitForPageReady(tabId, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => !!document.querySelector('button[data-e2e="user-more"]')
      });
      if (res[0].result) return true;
    } catch {}
    await delay(1000);
  }
  return false;
}

// Click nút ba chấm
function clickMoreButton() {
  const btn = document.querySelector('button[data-e2e="user-more"]');
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}

// Click nút "Chặn"
function clickBlockButton() {
  const items = document.querySelectorAll("p, div[data-e2e='user-block'], [role='menuitem']");
  for (const el of items) {
    const text = el.textContent.trim().toLowerCase();
    if (text === "chặn" || text === "block") {
      el.click();
      return true;
    }
  }
  return false;
}

// Click nút xác nhận
function clickConfirmButton() {
  const btn = document.querySelector('button[data-e2e="block-popup-block-btn"]');
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}