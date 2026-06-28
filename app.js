// ============================================================
// 【完全修正版】読書ビンゴ コアシステム（app.js）
// ============================================================

// 1. ローカルで画像を極限（50px四方・画質10%のWebP）まで軽量化・クレンジングする関数
function compressImageLocal(base64Str, maxWidth = 50, maxHeight = 50) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/webp', 0.1));
    };
    img.onerror = () => resolve(base64Str);
  });
}

function isBase64Image(str) { 
  return str && str.startsWith('data:image/'); 
}

// 本物の画像ファイルかどうかをバイナリ構造でチェックする（ファイル偽装ウイルス対策）
function isValidImageBinary(base64Str) {
  try {
    const block = base64Str.split(';');
    if (block.length < 2) return false;
    const realBase64 = block[1].split(',')[1];
    
    const binaryString = atob(realBase64.slice(0, 16));
    const bytes = new Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    const isPNG  = hex.startsWith('89504E47');
    const isJPEG = hex.startsWith('FFD8FF');
    const isGIF  = hex.startsWith('47494638');
    const isWebP = hex.includes('57454250');
    
    return isPNG || isJPEG || isGIF || isWebP;
  } catch (e) {
    return false;
  }
}

// ============================================================
// データ・状態管理
// ============================================================

let bingoData = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
let isParticipantMode = false;
let currentEditIndex = null;

// HTML要素のキャッシュ
const gridContainer = document.getElementById('gridContainer');
const editModal = document.getElementById('editModal');
const modalImgUrl = document.getElementById('modalImgUrl');
const modalUrl = document.getElementById('modalUrl');
const modeBadge = document.getElementById('modeBadge');
const boardTitle = document.getElementById('boardTitle');

// 圧縮用ドメイン辞書
const DOMAIN_DICTIONARY = [
  'https://amazon.co.jp',
  'https://bookmeter.com',
  'https://unsplash.com',
  'https://calil.jp',
  'https://google.co.jp',
  'https://'
];

/**
 * bingoData → URL文字列（一括超圧縮）
 */
async function serialize(data) {
  const sparse = [];

  for (let idx = 0; idx < data.length; idx++) {
    const cell = data[idx];
    if (cell.img || cell.url) {
      const entry = { n: idx };
      
      if (cell.img) {
        if (isBase64Image(cell.img)) {
          entry.i = await compressImageLocal(cell.img, 50, 50);
        } else {
          entry.i = cell.img;
        }
      }
      
      if (cell.url) {
        entry.u = cell.url;
      }
      
      sparse.push(entry);
    }
  }

  const compressedSparse = sparse.map(entry => {
    const newEntry = { ...entry };
    if (newEntry.u) {
      for (let i = 0; i < DOMAIN_DICTIONARY.length; i++) {
        if (newEntry.u.startsWith(DOMAIN_DICTIONARY[i])) {
          newEntry.u = newEntry.u.replace(DOMAIN_DICTIONARY[i], `@${i}`);
          break;
        }
      }
    }
    return newEntry;
  });

  const json = JSON.stringify(compressedSparse);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * URL文字列 → bingoData（復元）
 */
function deserialize(param) {
  let json = LZString.decompressFromEncodedURIComponent(param);
  if (!json) {
    return JSON.parse(decodeURIComponent(atob(param)));
  }

  const sparse = JSON.parse(json);
  const data = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));

  sparse.forEach(entry => {
    data[entry.n].img = entry.i || '';
    
    if (entry.u) {
      let decodedUrl = entry.u;
      for (let i = 0; i < DOMAIN_DICTIONARY.length; i++) {
        if (decodedUrl.startsWith(`@${i}`)) {
          decodedUrl = decodedUrl.replace(`@${i}`, DOMAIN_DICTIONARY[i]);
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

// ----- ビンゴ盤面の描画（エラー回避ガード強化） -----
function renderBoard() {
  if (!gridContainer) return;
  gridContainer.innerHTML = '';
  
  bingoData.forEach((cell, index) => {
    const box = document.createElement('div');
    box.className = "bako";
    
    const contentArea = document.createElement('div');
    contentArea.className = "bako-img-area";
    
    if (cell.img) {
      const img = document.createElement('img');
      img.src = cell.img;
      contentArea.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = "placeholder";
      placeholder.innerText = "BOOK " + (index + 1);
      contentArea.appendChild(placeholder);
    }

    if (isParticipantMode && cell.check) {
      const overlay = document.createElement('div');
      overlay.className = "overlay-mark";
      if (cell.check === 'O') {
        overlay.innerHTML = '<span style="color:#ffb74d; border:3px solid #ffb74d; border-radius:50%; width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center;"></span>';
      } else if (cell.check === 'X') {
        overlay.innerHTML = '<span style="color:#ff5252;">✕</span>';
      }
      contentArea.appendChild(overlay);
    }

    contentArea.addEventListener('click', () => {
      if (!isParticipantMode) {
        currentEditIndex = index;
        if (modalImgUrl) modalImgUrl.value = cell.img;
        if (modalUrl) modalUrl.value = cell.url;
        if (editModal) editModal.classList.remove('hidden');
      } else {
        if (cell.url) window.open(cell.url, '_blank');
      }
    });

    box.appendChild(contentArea);

    const controlBar = document.createElement('div');
    controlBar.className = "control-bar";
    
    if (!isParticipantMode) {
      controlBar.innerHTML = cell.url 
        ? '<span class="status-ok">🔗 リンク有</span>' 
        : '<span class="status-none">未設定</span>';
    } else {
      const btnO = document.createElement('button');
      btnO.className = "stamp-btn" + (cell.check === 'O' ? ' active-o' : '');
      btnO.innerText = "◯";
      btnO.addEventListener('click', (e) => {
        e.stopPropagation();
        cell.check = cell.check === 'O' ? '' : 'O';
        renderBoard();
      });

      const btnX = document.createElement('button');
      btnX.className = "stamp-btn" + (cell.check === 'X' ? ' active-x' : '');
      btnX.innerText = "✕";
      btnX.addEventListener('click', (e) => {
        e.stopPropagation();
        cell.check = cell.check === 'X' ? '' : 'X';
        renderBoard();
      });

      controlBar.appendChild(btnO);
      controlBar.appendChild(btnX);
    }

    box.appendChild(controlBar);
    gridContainer.appendChild(box);
  });
}

// ----- 初期化（バグを修正し、盤面表示を最優先に） -----
function init() {
  // 1. 何はともあれ、まず最初に空の盤面を描画する（これで絶対に消えません）
  renderBoard();

  // 2. その後、URLパラメータを安全にチェックしてモードを切り替える
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('data');
  if (dataParam) {
    try {
      bingoData = deserialize(dataParam);
      isParticipantMode = true;
      
      // UI表示の切り替え（要素の存在チェック付き）
      if (modeBadge) {
        modeBadge.innerText = "参加者プレイモード";
        modeBadge.style.background = "rgba(255, 183, 77, 0.2)";
        modeBadge.style.color = "#ffb74d";
      }
      if (boardTitle) boardTitle.innerText = "読書ビンゴに挑戦中！";
      
      const btnShare = document.getElementById('btnShare');
      if (btnShare) btnShare.classList.add('hidden');
      
      // データが復元されたので、もう一度再描画する
      renderBoard();
    } catch (e) {
      console.error("データ復元エラー:", e);
    }
  }
}

// ============================================================
// UIイベントリスナー（安全ガード付き）
// ============================================================

const sampleA = document.getElementById('sampleA');
if (sampleA) {
  sampleA.addEventListener('click', () => { 
    if (modalImgUrl) modalImgUrl.value = 'https://unsplash.com/photo-1544716278-ca5e3f4abd8c'; 
  });
}

const sampleB = document.getElementById('sampleB');
if (sampleB) {
  sampleB.addEventListener('click', () => { 
    if (modalImgUrl) modalImgUrl.value = 'https://unsplash.com/photo-1506880018603-83d5b814b5a6'; 
  });
}

const btnModalCancel = document.getElementById('btnModalCancel');
if (btnModalCancel) {
  btnModalCancel.addEventListener('click', () => {
    if (editModal) editModal.classList.add('hidden');
  });
}

// モーダル保存
const btnModalSave = document.getElementById('btnModalSave');
if (btnModalSave) {
  btnModalSave.addEventListener('click', async () => {
    if (currentEditIndex === null) return;
    const inputValue = modalImgUrl ? modalImgUrl.value.trim() : '';
    let inputUrl = modalUrl ? modalUrl.value.trim() : '';

    if (inputUrl) {
      if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        alert('【セキュリティ警告】詳細リンク先は http:// または https:// から始まるアドレスを入力してください。');
        return; 
      }
    }

    if (inputUrl && inputUrl.startsWith('http')) {
      try {
        const cleanUrl = new URL(inputUrl);
        const trashParams = ['ref', 'ref_', 'qid', 'sr', 'keywords', 'utm_source', 'utm_medium', 'utm_campaign', 'igsh'];
        trashParams.forEach(p => cleanUrl.searchParams.delete(p));
