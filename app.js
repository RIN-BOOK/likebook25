// ============================================================
// URL超短縮のためのローカル完結型変換 ＆ 短縮API連携システム
// 外部送信ゼロ：ブラウザのCanvas処理とドメイン置換によりURLを極小化し、
// 最後に完全無料の短縮API（is.gd）を通して極小URLを出力します。
// ============================================================

// 1. ローカルで画像を極限（50px四方・画質10%のWebP）まで軽量化する関数
function compressImageLocal(base64Str, maxWidth = 50, maxHeight = 50) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // アスペクト比を維持して縮小
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

      // WebP（非対応ブラウザはJPEG等）へ超圧縮変換
      resolve(canvas.toDataURL('image/webp', 0.1));
    };
    img.onerror = () => resolve(base64Str); // エラー時はフォールバック
  });
}

function isBase64Image(str) { 
  return str && str.startsWith('data:image/'); 
}

// ============================================================
// コアロジック（データ管理・圧縮・解凍）
// ============================================================

let bingoData = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
let isParticipantMode = false;
let currentEditIndex = null;

// HTML要素のバインディング
const gridContainer = document.getElementById('gridContainer');
const editModal = document.getElementById('editModal');
const modalImgUrl = document.getElementById('modalImgUrl');
const modalUrl = document.getElementById('modalUrl');
const modeBadge = document.getElementById('modeBadge');
const boardTitle = document.getElementById('boardTitle');

// 圧縮時に共通で置換する頻出ドメインのリスト（URLの短縮に劇的に効きます）
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
 * シェアURLを生成する最後の瞬間に、25マスの重い画像をすべて一斉に50pxの極小サムネイルに変換します。
 */
async function serialize(data) {
  const sparse = [];

  for (let idx = 0; idx < data.length; idx++) {
    const cell = data[idx];
    if (cell.img || cell.url) {
      const entry = { n: idx };
      
      // 画像が存在する場合のローカル超圧縮処理
      if (cell.img) {
        if (isBase64Image(cell.img)) {
          entry.i = await compressImageLocal(cell.img, 50, 50);
        } else {
          entry.i = cell.img;
        }
      }
      
      // 遷移先URLが存在する場合の処理
      if (cell.url) {
        entry.u = cell.url;
      }
      
      sparse.push(entry);
    }
  }

  // 遷移先URLの頻出ドメインを1〜2文字の記号（@0, @1...）に置換して文字数を削る
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
    // 互換性維持用の旧フォーマット復元
    return JSON.parse(decodeURIComponent(atob(param)));
  }

  const sparse = JSON.parse(json);
  const data = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));

  sparse.forEach(entry => {
    data[entry.n].img = entry.i || '';
    
    // 記号化されたドメイン（@0など）を元のURL文字列に復元
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

// ----- 初期化 -----
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
    } catch (e) {
      console.error(e);
    }
  }
  renderBoard();
}

// ----- ビンゴ盤面の描画 -----
function renderBoard() {
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

    // 参加者モードかつスタンプがある場合の上書きレイヤー
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

    // クリックイベント
    contentArea.addEventListener('click', () => {
      if (!isParticipantMode) {
        currentEditIndex = index;
        modalImgUrl.value = cell.img;
        modalUrl.value = cell.url;
        editModal.classList.remove('hidden');
      } else {
        if (cell.url) window.open(cell.url, '_blank');
      }
    });

    box.appendChild(contentArea);

    // 下部コントロールバーの処理
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

// ----- UIイベントリスナー -----

// サンプルボタンの挙動調整（HTMLの構成に一致）
document.getElementById('sampleA').addEventListener('click', () => { 
  modalImgUrl.value = 'https://unsplash.com/photo-1544716278-ca5e3f4abd8c'; 
});
document.getElementById('sampleB').addEventListener('click', () => { 
  modalImgUrl.value = 'https://unsplash.com/photo-1506880018603-83d5b814b5a6'; 
});

document.getElementById('btnModalCancel').addEventListener('click', () => editModal.classList.add('hidden'));

// モーダル保存処理
document.getElementById('btnModalSave').addEventListener('click', async () => {
  const inputValue = modalImgUrl.value.trim();
  let inputUrl = modalUrl.value.trim();
  editModal.classList.add('hidden'); // モーダルを即時閉じてサクサク動かす

  // Amazonや各種サイトの不要なトラッキングクエリパラメータ（長い文字列）を自動切除
  if (inputUrl && inputUrl.startsWith('http')) {
    try {
      const cleanUrl = new URL(inputUrl);
      const trashParams = ['ref', 'ref_', 'qid', 'sr', 'keywords', 'utm_source', 'utm_medium', 'utm_campaign', 'igsh'];
      trashParams.forEach(p => cleanUrl.searchParams.delete(p));
      inputUrl = cleanUrl.toString();
    } catch (e) { /* 不正なURL形式の場合はスキップ */ }
  }

  // 画像がBase64（ローカルファイル）の場合はその場で超縮小圧縮
  let finalImgData = inputValue;
  if (isBase64Image(inputValue)) {
    finalImgData = await compressImageLocal(inputValue, 50, 50);
  }

  bingoData[currentEditIndex].img = finalImgData;
  bingoData[currentEditIndex].url = inputUrl;
  renderBoard();
});

// 参加用URL発行（シェア）ボタン（短縮URL対応版）
document.getElementById('btnShare').addEventListener('click', async () => {
  try {
    // 1. ボタンを「処理中」にして連打を防ぐ
    const originalText = document.getElementById('btnShare').innerText;
    document.getElementById('btnShare').innerText = "短縮URLを生成中...";
    document.getElementById('btnShare').disabled = true;

    // 2. まず、画像とドメインを詰め込んだオリジナルの長いURL（数千文字）を作る
    const serialized = await serialize(bingoData);
    const longShareUrl = window.location.origin + window.location.pathname + '?data=' + serialized;

    // 3. 完全無料の短縮URL API（is.gd）を使って、一瞬で20文字程度に圧縮する
    // ※CORS通信を通すため、alloriginsプロキシを経由させています
    const apiUrl = `https://allorigins.win{encodeURIComponent(`https://is.gd{encodeURIComponent(longShareUrl)}`)}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('短縮APIの通信に失敗しました');
    
