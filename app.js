// ----- 参加用URL発行（シェア）ボタンのイベントリスナー（短縮URL完全対応版） -----
document.getElementById('btnShare').addEventListener('click', async () => {
  try {
    // 1. ボタンを「処理中」にして連打を防ぐ
    const originalText = document.getElementById('btnShare').innerText;
    document.getElementById('btnShare').innerText = "短縮URLを生成中...";
    document.getElementById('btnShare').disabled = true;

    // 2. まず、画像とドメインを詰め込んだオリジナルの長いURL（数千文字）を作る
    const serialized = await serialize(bingoData);
    const longShareUrl = window.location.origin + window.location.pathname + '?data=' + serialized;
    
    console.log("圧縮前のオリジナルURL長さ:", longShareUrl.length);

    // 3. 完全無料の短縮URL API（is.gd）を使って、一瞬で20文字程度に圧縮する
    // ※GitHub Pagesからの通信(CORS)を通すため、alloriginsプロキシを経由させています
    const apiUrl = `https://allorigins.win{encodeURIComponent(`https://is.gd{encodeURIComponent(longShareUrl)}`)}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('短縮APIの通信に失敗しました');
    
    const proxyData = await response.json();
    const resultData = JSON.parse(proxyData.contents); // プロキシ内のJSONをパージ
    
    let finalUrl = longShareUrl;

    if (resultData && resultData.shorturl) {
      // 成功すれば、一瞬で「https://is.gd」のような超短いURLになります！
      finalUrl = resultData.shorturl;
    } else if (resultData && resultData.errormessage) {
      console.warn("APIエラー（URLが長すぎる等）:", resultData.errormessage);
    }

    // 4. ボタンの状態を元に戻す
    document.getElementById('btnShare').innerText = originalText;
    document.getElementById('btnShare').disabled = false;

    // 5. クリップボードへのコピー処理
    navigator.clipboard.writeText(finalUrl).then(() => {
      alert(`【大成功】読書ビンゴの短縮URLをコピーしました！\n\n生成されたURL：\n${finalUrl}\n\nこのURLだけで、画像もリンクもすべて友達に共有できます！`);
    }).catch(() => {
      prompt("URLをコピーしてください：", finalUrl);
    });

  } catch (e) {
    console.error("短縮エラー:", e);
    alert("短縮URLの生成に失敗したため、通常のURL（長い状態）でコピーを試みます。");
    
    // フォールバック：APIが落ちていた場合は、前回のローカル圧縮URLをそのまま渡す
    try {
      const serialized = await serialize(bingoData);
      const fallbackUrl = window.location.origin + window.location.pathname + '?data=' + serialized;
      navigator.clipboard.writeText(fallbackUrl).then(() => {
        alert("通常のURLをコピーしました。");
      }).catch(() => {
        prompt("URLをコピーしてください：", fallbackUrl);
      });
    } catch(err) {
      alert("エラーが発生しました。");
    }

    document.getElementById('btnShare').innerText = "参加用URLを発行";
    document.getElementById('btnShare').disabled = false;
  }
});
