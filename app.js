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
      bingoData = JSON.parse(decodeURIComponent(atob(dataParam)));
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
        modalImgUrl.value = cell.img;
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

document.getElementById('sampleA').addEventListener('click', () => { modalImgUrl.value = 'https://unsplash.com'; });
document.getElementById('sampleB').addEventListener('click', () => { modalImgUrl.value = 'https://unsplash.com'; });
document.getElementById('btnModalCancel').addEventListener('click', () => editModal.classList.add('hidden'));

document.getElementById('btnModalSave').addEventListener('click', () => {
  bingoData[currentEditIndex].img = modalImgUrl.value.trim();
  bingoData[currentEditIndex].url = modalUrl.value.trim();
  renderBoard();
  editModal.classList.add('hidden');
});

document.getElementById('btnShare').addEventListener('click', () => {
  try {
    const serialized = btoa(encodeURIComponent(JSON.stringify(bingoData)));
    const shareUrl = window.location.origin + window.location.pathname + '?data=' + serialized;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("【大成功】読書ビンゴのURLをコピーしました！\n\nこのURLを別のタブやスマホに送れば、この配置のまま参加者として遊んでもらえます！");
    }).catch(() => {
      prompt("URLをコピーしてください：", shareUrl);
    });
  } catch (e) {
    alert("エラーが発生しました。データが大きすぎる可能性があります。");
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
