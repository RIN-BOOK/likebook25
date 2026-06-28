// ============================================================
// 【完全版】画像とURLを「出力の直前」にローカルで一括超圧縮するロジック
// ============================================================

/**
 * bingoData → URL文字列（一括超圧縮）
 * 非同期（async）に変更し、シェアURLを生成する「最後の瞬間」に
 * 25マスの重いBase64画像をすべて一斉に50pxの超軽量サムネイルに変換します。
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
          // マスにセットされている生画像を、ここで強制的に縦横50px・画質10%の極小WebPに変換
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

// ----- 参加用URL発行（シェア）ボタンのイベントリスナー -----
// ※内部で await を使うため async 関数にアップデートします
document.getElementById('btnShare').addEventListener('click', async () => {
  try {
    // ユーザーに「圧縮処理中」であることを伝えるため、ボタンのテキストを変える
    const originalText = document.getElementById('btnShare').innerText;
    document.getElementById('btnShare').innerText = "URLを生成中...";
    document.getElementById('btnShare').disabled = true;

    // 非同期で25マスの画像とドメインを限界まで一括ローカル圧縮
    const serialized = await serialize(bingoData);
    const shareUrl = window.location.origin + window.location.pathname + '?data=' + serialized;
    
    // ボタンの状態を元に戻す
    document.getElementById('btnShare').innerText = originalText;
    document.getElementById('btnShare').disabled = false;

    // クリップボードへのコピー処理
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("【大成功】読書ビンゴのURLをコピーしました！\n\nローカル内で画像を極限まで圧縮したため、非常に短いURLになりました！");
    }).catch(() => {
      prompt("URLをコピーしてください：", shareUrl);
    });
  } catch (e) {
    console.error(e);
    alert("エラーが発生しました。データ構造が崩れている可能性があります。");
    // エラー時もボタンを戻す
    document.getElementById('btnShare').innerText = "参加用URLを発行";
    document.getElementById('btnShare').disabled = false;
  }
});
