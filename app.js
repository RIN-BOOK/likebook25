let nakami = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
let isSankaMode = false;
let currentEditIdx = null;

const tanaContainer = document.getElementById('tanaContainer');
const editMado = document.getElementById('editMado');
const madoImgUrl = document.getElementById('madoImgUrl');
const madoUrl = document.getElementById('madoUrl');
const modeBadge = document.getElementById('modeBadge');
const boardTitle = document.getElementById('boardTitle');

function init() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('p');
  if (dataParam) {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
      if (decompressed) {
        nakami = JSON.parse(decompressed);
        isSankaMode = true;
        modeBadge.innerText = "参加者プレイモード";
        modeBadge.style.background = "rgba(255, 183, 77, 0.2)";
        modeBadge.style.color = "#ffb74d";
        boardTitle.innerText = "読書ビンゴに挑戦中！";
        document.getElementById('btnShare').classList.add('hidden');
      }
    } catch (e) {
      console.error(e);
    }
  }
  hyojiTana();
}

function hyojiTana() {
  tanaContainer.innerHTML = '';
  nakami.forEach((cell, index) => {
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

    if (isSankaMode && cell.check) {
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
      if (!isSankaMode) {
        currentEditIdx = index;
        madoImgUrl.value = cell.img;
        madoUrl.value = cell.url;
        editMado.classList.remove('hidden');
      } else {
        if (cell.url) window.open(cell.url, '_blank');
      }
    });

    box.appendChild(contentArea);

    const controlBar = document.createElement('div');
    controlBar.className = "control-bar";
    
    if (!isSankaMode) {
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
        hyojiTana();
      });

      const btnX = document.createElement('button');
      btnX.className = "stamp-btn" + (cell.check === 'X' ? ' active-x' : '');
      btnX.innerText = "✕";
      btnX.addEventListener('click', (e) => {
        e.stopPropagation();
        cell.check = cell.check === 'X' ? '' : 'X';
        hyojiTana();
      });

      controlBar.appendChild(btnO);
      controlBar.appendChild(btnX);
    }

    box.appendChild(controlBar);
    tanaContainer.appendChild(box);
  });
}

document.getElementById('sampleA').addEventListener('click', () => { madoImgUrl.value = 'https://unsplash.com'; });
document.getElementById('sampleB').addEventListener('click', () => { madoImgUrl.value = 'https://unsplash.com'; });
document.getElementById('btnMadoCancel').addEventListener('click', () => editMado.classList.add('hidden'));

document.getElementById('btnMadoSave').addEventListener('click', () => {
  nakami[currentEditIdx].img = madoImgUrl.value.trim();
  nakami[currentEditIdx].url = madoUrl.value.trim();
  hyojiTana();
  editMado.classList.add('hidden');
});

document.getElementById('btnShare').addEventListener('click', () => {
  try {
    const rawString = JSON.stringify(nakami);
    const compressed = LZString.compressToEncodedURIComponent(rawString);
    const shareUrl = window.location.origin + window.location.pathname + '?p=' + compressed;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("【成功】読書ビンゴの圧縮URLをコピーしました！\n\n別のタブやスマホに貼り付けて開くと、画像を引き継いだまま参加者モードで遊べます！");
    }).catch(() => {
      prompt("URLをコピーしてください：", shareUrl);
    });
  } catch (e) {
    alert("エラーが発生しました。");
  }
});

// ②＆⑥：PNG画像として保存するダウンロード機能
document.getElementById('btnDownload').addEventListener('click', () => {
  const target = document.getElementById('captureArea');
  const dBtn = document.getElementById('btnDownload');
  dBtn.innerText = "⏳ 画像生成中...";
  
  html2canvas(target, {
    backgroundColor: '#3e2723', // 木目調に合わせた背景色
    useCORS: true, // ネット上の外部画像の読み込みを許可
    scale: 2 // 高画質書き出し
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = isSankaMode ? 'bingo-play-result.png' : 'my-reading-bingo.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => {
    console.error(err);
    alert("画像の出力に失敗しました。インターネット上の画像URLの暗号化制限による可能性があります。");
  }).finally(() => {
    dBtn.innerText = "PNG画像として出力";
  });
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm("ビンゴボードをリセットしますか？")) {
    nakami = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
    window.history.pushState({}, document.title, window.location.pathname);
    isSankaMode = false;
    modeBadge.innerText = "制作者モード";
    modeBadge.style.background = "rgba(99, 102, 241, 0.2)";
    modeBadge.style.color = "#a5b4fc";
    boardTitle.innerText = "MY BOOK BINGO";
    document.getElementById('btnShare').classList.remove('hidden');
    hyojiTana();
  }
});

init();
