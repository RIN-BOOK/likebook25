let bingoData = Array.from({ length: 25 }, () => ({ img: '', url: '', check: '' }));
let isParticipantMode = false;
let currentEditIndex = null;

// DOM要素の取得
const gridContainer = document.getElementById('gridContainer');
const editModal = document.getElementById('editModal');
// ...（省略）

function init() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('p');
  if (dataParam) {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
      if (decompressed) {
        bingoData = JSON.parse(decompressed);
        isParticipantMode = true;
        // ...（UIを参加者モードに変更）
      }
    } catch (e) {
      console.error(e);
    }
  }
  renderBoard();
}

// 盤面描画機能
function renderBoard() {
  // ...（略）
}

// ...（モーダル表示・データ保存ロジック）

// ★匿名自動短縮リンク生成機能の組み込み
document.getElementById('btnShare').addEventListener('click', () => {
  const btn = document.getElementById('btnShare');
  btn.innerText = "⏳ リンクを短縮中...";
  btn.disabled = true;

  try {
    const rawString = JSON.stringify(bingoData);
    const compressed = LZString.compressToEncodedURIComponent(rawString);
    const longUrl = window.location.origin + window.location.pathname + '?p=' + compressed;
    
    // 会員登録・キー不要の「is.gd」短縮APIへ非同期で接続！
    fetch(`https://is.gd{encodeURIComponent(longUrl)}`)
    .then(res => res.json())
    .then(data => {
      let finalUrl = data.shorturl || longUrl;
      navigator.clipboard.writeText(finalUrl).then(() => {
        alert("【大成功】超短縮URLを発行しました：\n" + finalUrl);
      });
    })
    .catch(() => {
      // 通信エラー時は長めのURLをフォールバック
      navigator.clipboard.writeText(longUrl);
      alert("短縮通信に失敗したため、通常の共有リンクをコピーしました。");
    })
    .finally(() => {
      btn.innerText = "参加用URLを発行";
      btn.disabled = false;
    });
  } catch (e) {
    // ...（エラー処理）
  }
});

// ...（リセット機能）

init();
