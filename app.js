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
  const dataParam = params.get('p'); // 短縮化に伴いパラメータ名を「p」に統一
  const oldParam = params.get('data'); // 以前の形式も受け取れるよう互換性を保持
  const targetParam = dataParam || oldParam;

  if (targetParam) {
    try {
      // LZ-Stringで圧縮されたデータを安全に解凍・復元
      const decompressed = LZString.decompressFromEncodedURIComponent(targetParam);
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
      console.error("データの読み込みに失敗しました：", e);
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

// ★匿名自動URL超短縮機能の組み込み
document.getElementById('btnShare').addEventListener('click', () => {
  const shareBtn = document.getElementById('btnShare');
  shareBtn.innerText = "⏳ リンクを短縮中...";
  shareBtn.disabled = true;

  try {
    const rawString = JSON.stringify(bingoData);
    const compressed = LZString.compressToEncodedURIComponent(rawString);
    const longUrl = window.location.origin + window.location.pathname + '?p=' + compressed;
    
    // 会員登録不要の「is.gd」短縮APIへ裏側で非同期通信を実行！
    fetch(`https://is.gd{encodeURIComponent(longUrl)}`)
    .then(res => res.json())
    .then(data => {
      // 成功したら短縮URL、失敗したら元の長いURLをフォールバック
      let finalUrl = data.shorturl || longUrl;
      
      // クリップボードへ確実にコピー（最古のブラウザから最新スマホまで対応する古典的確実命令）
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = finalUrl;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextArea);
      
      alert("【大成功】誰にでも送れる超短縮URLを発行しました！\n\nクリップボードにコピーしたため、このままSNSやLINEに貼り付けられます：\n" + finalUrl);
    })
    .catch(err => {
      console.error(err);
      // 通信エラーが起きた場合は通常の長いURLをコピー
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = longUrl;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextArea);
      alert("URLの短縮通信に失敗したため、通常の共有リンクをコピーしました。このままでも共有は可能です。");
    })
    .finally(() => {
      shareBtn.innerText = "参加用URLを発行";
      shareBtn.disabled = false;
    });
  } catch (error) {
    alert("エラーが発生しました。");
    shareBtn.innerText = "参加用URLを発行";
    shareBtn.disabled = false;
  }
});

init();

