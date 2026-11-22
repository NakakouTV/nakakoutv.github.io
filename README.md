# ナカコウの作品集

GitHub Pages 用の静的サイト。工作机のパソコンから、ScratchとYouTubeの制作物、GitHubのコード・資料、プロフィール、相互リンクを開けます。公開時の入口は `index.html`、`page_2.html`、`page.html` です。

## 手元で表示する

このフォルダーで `python -m http.server 8018 --bind 127.0.0.1` を実行し、ブラウザーで [ホーム](http://127.0.0.1:8018/index.html) を開きます。通常の表示にはパッケージのインストールやビルドは不要です。グラフィックライブラリを使う開発環境は `npm ci`、`npm run dev` で起動できます。

## 内容を更新する

- `works-data.json` は作品のタイトル、公式サムネイル、説明、閲覧数・再生数、取得日、チャンネル実績、およびGitHubの資料リンクを保持します。取得した画像は `assets/works/` に置きます。
- `build_site.py` はプロフィールや相互リンクなどの掲載内容と `desktop.html` のテンプレートから、公開用HTMLを生成します。更新後は `python build_site.py` を実行してください。
- Scratchは公開53作品の閲覧数上位6作と、以前から掲載している2作。YouTubeは「動画」タブの人気順上位5本です。閲覧数と再生数は取得時点の値です。GitHubウィンドウは表示時にも公開APIを参照し、通信できない場合は同梱の一覧と資料リンクを表示します。

## 画面の構成

- 通常表示は `bench-world.js` のリアルタイム3Dです。`bench-optics.js` は描画バッファーの解像度でシーンを合成し、発光部の周りの光だけをぼかします。OSはモニターの投影座標に合わせて配置します。画面をドラッグすると机の周囲を回り、金庫を選ぶと同じシーンで寄って観察できます。配色は [CYBERPUNK / NEON CITY](https://lospec.com/palette-list/cyberpunk-neon-city) を使っています。
- 金庫は040版の組立メッシュを `art/export_safe.py` でWeb向けに書き出したものです。追加作品は `bench-world.js` 内の台座とモデルの配置を起点に追加できます。以下のBlenderレンダーは静止表示用です。
- `bench-lab.js` はリフトの開口部を含む天板、補助モニター、ホログラム、工具と台座を生成します。左の透過パネルに視点の角度、右モニターと天板にリフトの状態を表示します。開口部か「リフトを収納／上げる」でカプセルを昇降できます。

- 工作机・CRT・計測器・歯車機構は同じBlenderシーンに配置しています。壁の図面、基板の配線、計測器の目盛り、窓外の街並みはPythonで作図し、模型の面に貼っています。トゥーン材質と輪郭の強調、網点、限定色への変換で、横長・正方形・縦長の3構図を仕上げます。
- `desk-renderer.js` は各カメラの投影からOS、オシロスコープ、時計、歯車の位置を決めます。波形の上段は基準信号、下段は入力の履歴です。時計は端末の時刻を表示します。歯車の往復動作には、17・10・9枚の歯数に合わせて回した同じ3Dモデルの15コマを使います。
- `assets/wallpaper.js` はモチモチスライムの一つ目とブロック地形をモチーフにしたオリジナルのアニメーションです。形状をWebGLで描画し、跳躍に合わせて体形と影を変えます。静止版は `assets/wallpaper.webp` です。
- アプリとタスクバーは `desktop.js` と `desktop.css` で実装しています。操作音はタスクバーで有効にできます。動きはOSの設定に追従し、メニューからも停止できます。Escで作品情報から一覧、ウィンドウから机へ戻れます。JavaScript無効時は作品集を通常のHTMLとして読めます。

## 造形と映像の参考

- 測定器の画面と操作系、基板の端子列とICの配置を決める際には、実機の資料を参照しています。[Tektronix 465の説明書](https://www.tek.com/en/manual/465-instruction-manual)・[Arduino UNO R3の基板図](https://content.arduino.cc/assets/A000066-full-pinout.pdf)
- 筐体と分離キーボードの構成は [DEC VT220の実機資料](https://www.computinghistory.org.uk/det/70526/Digital-VT220/) を参照。筐体とOSの色は、機械やピクセルアートのために作られた [ENDESGA 64](https://lospec.com/palette-list/endesga-64) から選定しました。
- 前景の配線、明るい筐体と橙色の操作部の明度差は [『肆足歩行』](https://youtu.be/GPr_cM7Nyzk)、影を網点で表現する方法は [KATAKATA](https://x.com/Toarukanshiin/status/2120415920761999378)、情報の密度とピクセル文字は [ICONIC](https://iconicllc.jp/) を参照しました。
- 作品名と媒体を手がかりに探せる構成は [THAの作品一覧](https://tha.jp/works) を参照しました。掲載画像はナカコウの既存画像、各公式作品のサムネイル、本サイト用に制作した画像です。

## 机の造形や図柄を編集する

Blender 5.3と、Pillow・NumPyを利用できるPythonを使います。中間画像は `dist/workshop/`、配信用のWebPと投影座標は `assets/` に出力されます。

```sh
python art/bench_prints.py
blender -b --factory-startup -P art/workshop.py
python art/print_finish.py
python build_site.py
```

機材の配置は `art/workshop.py`、リールやノギス、スライムの造形は `art/bench_details.py`、図面や街並みは `art/bench_prints.py` で編集できます。
