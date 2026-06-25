let bingoData = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
let isParticipantMode = false;
let currentEditIndex = null;

const gridContainer = document.getElementById('gridContainer');
const editModal = document.getElementById('editModal');
const modalFile = document.getElementById('modalFile');
const modalImgUrl = document.getElementById('modalImgUrl');
const modalUrl = document.getElementById('modalUrl');
const modeBadge = document.getElementById('modeBadge');
const boardTitle = document.getElementById('boardTitle');

function init() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('p'); // 圧縮データ用のパラメータに変更
  
  if (dataParam) {
    try {
      // ★超強力なLz-String解凍処理を実行
      const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
      if (decompressed) {
        bingoData = JSON.parse(decompressed);
        isParticipantMode = true;
        modeBadge.innerText = "参加者プレイモード";
        modeBadge.style.background = "rgba(255, 183, 77, 0.2)";
        modeBadge.style.color = "#ffb74d";
        boardTitle.innerText = "読書ビンゴに挑戦中！";
        document.getElementById('btnShare').classList.add('hidden');
      }
    } catch (e) {
      console.error("データの解凍に失敗しました：", e);
    }
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
        modalFile.value = '';
        modalImgUrl.value = cell.img.startsWith('data:') ? '' : cell.img;
        modalUrl.value = cell.url;
        editModal.classList.remove('hidden');
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

document.getElementById('sampleA').addEventListener('click', () => { modalImgUrl.value = 'https://unsplash.com'; modalFile.value = ''; });
document.getElementById('sampleB').addEventListener('click', () => { modalImgUrl.value = 'https://unsplash.com'; modalFile.value = ''; });
document.getElementById('btnModalCancel').addEventListener('click', () => editModal.classList.add('hidden'));

document.getElementById('btnModalSave').addEventListener('click', () => {
  const file = modalFile.files[0];
  const netUrl = modalImgUrl.value.trim();
  const jumpUrl = modalUrl.value.trim();

  // ファイルが選ばれている場合はBase64化（本番時は要画像リサイズ推奨）
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      bingoData[currentEditIndex].img = e.target.result;
      bingoData[currentEditIndex].url = jumpUrl;
      renderBoard();
      editModal.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  } else {
    bingoData[currentEditIndex].img = netUrl;
    bingoData[currentEditIndex].url = jumpUrl;
    renderBoard();
    editModal.classList.add('hidden');
  }
});

document.getElementById('btnShare').addEventListener('click', () => {
  try {
    const rawString = JSON.stringify(bingoData);
    // ★超強力なLz-String圧縮処理を実行（URLに安全な文字に変換）
    const compressed = LZString.compressToEncodedURIComponent(rawString);
    const shareUrl = window.location.origin + window.location.pathname + '?p=' + compressed;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("【大成功】読書ビンゴの圧縮URLをコピーしました！\n\nGitHub Pages経由であれば、長さを大幅に削減したこのリンクのまま、他のタブやスマホで完全に画像付きで共有可能です！");
    }).catch(() => {
      prompt("URLをコピーしてください：", shareUrl);
    });
  } catch (e) {
    alert("エラーが発生しました。");
  }
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm("ビンゴボードをリセットしますか？")) {
    bingoData = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
    window.history.pushState({}, document.title, window.location.pathname);
    isParticipantMode = false;
    modeBadge.innerText = "制作者モード";
    modeBadge.style.background = "rgba(99, 102, 241, 0.2)";
    modeBadge.style.color = "#a5b4fc";
    boardTitle.innerText = "MY BOOK BINGO";
    document.getElementById('btnShare').classList.remove('hidden');
    renderBoard();
  }
});

init();
