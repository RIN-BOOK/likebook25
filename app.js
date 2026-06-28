// ============================================================
// ローカルで画像を極限まで圧縮・軽量化する関数（前回同様）
// ============================================================
function compressImageLocal(base64Str, maxWidth = 60, maxHeight = 60) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
      } else {
        if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/webp', 0.1));
    };
    img.onerror = () => resolve(base64Str);
  });
}

function isBase64Image(str) { return str && str.startsWith('data:image/'); }

// ============================================================
// 【新機能】URLと画像をまとめて最終圧縮・解凍するロジック
// ============================================================

/**
 * bingoData → URL文字列（超圧縮版）
 */
function serialize(data) {
  // ① データのスパース化（空マス除外）とキー短縮
  const sparse = data.reduce((acc, cell, idx) => {
    if (cell.img || cell.url) {
      const entry = { n: idx };
      if (cell.img) entry.i = cell.img;
      if (cell.url) entry.u = cell.url;
      acc.push(entry);
    }
    return acc;
  }, []);

  // ② 重複ドメインを辞書化してURL文字列を圧縮する（ハフマン符号化風ロジック）
  // 頻出するURLのプレフィックス（例: "https://amazon.co.jp" 等）を抽出
  const urls = sparse.map(e => e.u).filter(Boolean);
  const prefixes = ['https://amazon.co.jp', 'https://bookmeter.com', 'https://unsplash.com', 'https://'];
  
  // 各マスの中の文字列を置換
  const compressedSparse = sparse.map(entry => {
    const newEntry = { ...entry };
    if (newEntry.u) {
      for (let i = 0; i < prefixes.length; i++) {
        if (newEntry.u.startsWith(prefixes[i])) {
          // 例: "https://amazon.co.jpdp/..." → "@0/dp/..." に置換
          newEntry.u = newEntry.u.replace(prefixes[i], `@${i}`);
          break;
        }
      }
    }
    return newEntry;
  });

  // ③ JSON化して最後に LZString で超圧縮
  const json = JSON.stringify(compressedSparse);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * URL文字列 → bingoData（解凍版）
 */
function deserialize(param) {
  let json = LZString.decompressFromEncodedURIComponent(param);
  if (!json) {
    // 旧フォーマットの互換性維持
    return JSON.parse(decodeURIComponent(atob(param)));
  }

  const sparse = JSON.parse(json);
  const data = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
  const prefixes = ['https://amazon.co.jp', 'https://bookmeter.com', 'https://unsplash.com', 'https://'];

  sparse.forEach(entry => {
    data[entry.n].img = entry.i || '';
    
    if (entry.u) {
      let decodedUrl = entry.u;
      // 置換されたショートカット（例: @0）を元のURLドメインに復元
      for (let i = 0; i < prefixes.length; i++) {
        if (decodedUrl.startsWith(`@${i}`)) {
          decodedUrl = decodedUrl.replace(`@${i}`, prefixes[i]);
          break;
        }
      }
      data[entry.n].url = decodedUrl;
    } else {
      data[entry.n].url = '';
    }
  });
  return data;
}

// ============================================================
// 既存システム（イベント・描画・初期化）
// ============================================================

let bingoData = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
let isParticipantMode = false;
let currentEditIndex = null;

const gridContainer = document.getElementById('gridContainer');
const editModal = document.getElementById('editModal');
const modalImgUrl = document.getElementById('modalImgUrl');
const modalUrl = document.getElementById('modalUrl');
const modeBadge = document.getElementById('modeBadge');
const boardTitle = document.getElementById('boardTitle');

function init() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('data');
  if (dataParam) {
    try {
      bingoData = deserialize(dataParam);
      isParticipantMode = true;
      modeBadge.innerText = "参加者プレイモード";
      modeBadge.style.background = "rgba(255, 183, 77, 0.2)";
      modeBadge.style.color = "#ffb74d";
      boardTitle.innerText = "読書ビンゴに挑戦中！";
      document.getElementById('btnShare').classList.add('hidden');
    } catch (e) { console.error(e); }
  }
  renderBoard();
}

function renderBoard() {
  gridContainer.innerHTML = '';
  bingoData.forEach((cell, index) => {
    const box = document.createElement('div');
    box.className = "bako";
    const contentArea = document.createElement('div');
    contentArea.className = "bako-img-area";
    
    if (cell.img) {
      const img = document.createElement('img'); img.src = cell.img; contentArea.appendChild(img);
    } else {
      const placeholder = document.createElement('div'); placeholder.className = "placeholder"; placeholder.innerText = "BOOK " + (index + 1); contentArea.appendChild(placeholder);
    }

    if (isParticipantMode && cell.check) {
      const overlay = document.createElement('div'); overlay.className = "overlay-mark";
      if (cell.check === 'O') overlay.innerHTML = '<span style="color:#ffb74d; border:3px solid #ffb74d; border-radius:50%; width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center;"></span>';
      else if (cell.check === 'X') overlay.innerHTML = '<span style="color:#ff5252;">✕</span>';
      contentArea.appendChild(overlay);
    }

    contentArea.addEventListener('click', () => {
      if (!isParticipantMode) {
        currentEditIndex = index; modalImgUrl.value = cell.img; modalUrl.value = cell.url; editModal.classList.remove('hidden');
      } else {
        if (cell.url) window.open(cell.url, '_blank');
      }
    });
    box.appendChild(contentArea);

    const controlBar = document.createElement('div');
    controlBar.className = "control-bar";
    if (!isParticipantMode) {
      controlBar.innerHTML = cell.url ? '<span class="status-ok">🔗 リンク有</span>' : '<span class="status-none">未設定</span>';
    } else {
      const btnO = document.createElement('button'); btnO.className = "stamp-btn" + (cell.check === 'O' ? ' active-o' : ''); btnO.innerText = "◯";
      btnO.addEventListener('click', (e) => { e.stopPropagation(); cell.check = cell.check === 'O' ? '' : 'O'; renderBoard(); });
      const btnX = document.createElement('button'); btnX.className = "stamp-btn" + (cell.check === 'X' ? ' active-x' : ''); btnX.innerText = "✕";
      btnX.addEventListener('click', (e) => { e.stopPropagation(); cell.check = cell.check === 'X' ? '' : 'X'; renderBoard(); });
      controlBar.appendChild(btnO); controlBar.appendChild(btnX);
    }
    box.appendChild(controlBar);
    gridContainer.appendChild(box);
  });
}

// ----- イベント -----
document.getElementById('sampleA').addEventListener('click', () => { modalImgUrl.value = 'https://unsplash.com'; });
document.getElementById('sampleB').addEventListener('click', () => { modalImgUrl.value = 'https://unsplash.com'; });
document.getElementById('btnModalCancel').addEventListener('click', () => editModal.classList.add('hidden'));

document.getElementById('btnModalSave').addEventListener('click', async () => {
  const inputValue = modalImgUrl.value.trim();
  let inputUrl = modalUrl.value.trim();
  editModal.classList.add('hidden');

  // 【追加】遷移先URLの不要なパラメータ（トラッキング用の長いゴミ）をクレンジング
  if (inputUrl && inputUrl.startsWith('http')) {
    try {
      const cleanUrl = new URL(inputUrl);
      // Amazonの一般的な不要パラメータやトラッキング用パラメータを自動削除
      const trashParams = ['ref', 'ref_', 'qid', 'sr', 'keywords', 'utm_source', 'utm_medium', 'utm_campaign'];
      trashParams.forEach(p => cleanUrl.searchParams.delete(p));
      inputUrl = cleanUrl.toString();
    } catch (e) { /* 不正なURL形式の場合はそのまま通す */ }
  }

  let finalImgData = inputValue;
  if (isBase64Image(inputValue)) {
    finalImgData = await compressImageLocal(inputValue, 50, 50); // さらに極小の50pxに変更して容量削減
  }

  bingoData[currentEditIndex].img = finalImgData;
  bingoData[currentEditIndex].url = inputUrl;
  renderBoard();
});

// シェアボタン
document.getElementById('btnShare').addEventListener('click', () => {
  try {
    const serialized = serialize(bingoData);
    const shareUrl = window.location.origin + window.location.pathname + '?data=' + serialized;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("【大成功】読書ビンゴのURLをコピーしました！\n\n画像と長いリンクの両方を極限まで圧縮したため、URLが短く安全になりました。");
    }).catch(() => { prompt("URLをコピーしてください：", shareUrl); });
  } catch (e) { alert("エラーが発生しました。データが大きすぎる可能性があります。"); }
});

// リセットボタン
document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm("ビンゴボードをリセットしますか？")) {
    bingoData = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
    window.history.pushState({}, document.title, window.location.pathname);
    isParticipantMode = false;
    modeBadge.innerText = "制作者モード"; modeBadge.style.background = "rgba(99, 102, 241, 0.2)"; modeBadge.style.color = "#a5b4fc"; boardTitle.innerText = "MY BOOK BINGO";
    document.getElementById('btnShare').classList.remove('hidden');
    renderBoard();
  }
});

init();
