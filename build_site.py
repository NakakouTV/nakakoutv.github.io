"""Build the three original GitHub Pages URLs from the same portfolio archive."""
from pathlib import Path
from html import escape
import json

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / "works-data.json").read_text(encoding="utf-8"))
camera = json.loads((ROOT / "assets/bench-cameras.json").read_text(encoding="utf-8"))
items = data["items"]
apps = {"works": "制作物", "github": "GitHub", "profile": "プロフィール", "links": "相互リンク"}
glyphs = {
    "works": "M2 5h6l2 2h11v13H2z M5 3h7l2 2h5v1H9L7 4H5z",
    "github": "M3 3h18v18H3z M5 7v12h14V7z M7 9l4 3-4 3v-2l2-1-2-1z M12 15h5v2h-5z",
    "profile": "M2 4h20v16H2z M4 7v11h16V7z M7 8h4v4H7z M6 13h6v3H6z M14 9h4v2h-4z M14 13h3v2h-3z",
    "links": "M3 8h9v3H5v6h6v-3h3v5H2V8z M10 4h12v11H12v-3h7V7h-6v3h-3z",
    "menu": "M2 2h8v8H2z M13 2h8v8h-8z M2 13h8v8H2z M13 13h8v8h-8z",
    "sound": "M3 9h4l6-5v16l-6-5H3z M15 8h2v8h-2z M19 5h2v14h-2z",
    "weather": "M5 1h2v3H5z M1 5h3v2H1z M5 5h5v5H5z M9 11h2V8h6v3h3v3h2v6H4v-7h5z M6 15v3h14v-3h-2v-2h-3v-3h-2v3h-3v2z",
    "zoom": "M2 2h8v2H4v6H2z M14 2h8v8h-2V4h-6z M2 14h2v6h6v2H2z M20 14h2v8h-8v-2h6z",
}
letters = {"n":["00000","00000","11110","11011","11011","11011","11011"],
           "a":["00000","00000","01110","00011","01111","11011","01111"],
           "k":["11000","11000","11011","11110","11100","11110","11011"],
           "o":["00000","00000","01110","11011","11011","11011","01110"],
           "u":["00000","00000","11011","11011","11011","11011","01111"]}
word = " ".join(f"M{j*6+x} {y}h1v1h-1z" for j,c in enumerate("nakakou") for y,row in enumerate(letters[c]) for x,b in enumerate(row) if b=="1")
symbols = ''.join(f'<symbol id="icon-{k}" viewBox="0 0 24 24"><path fill-rule="evenodd" d="{v}"/></symbol>' for k,v in glyphs.items())
symbols += f'<symbol id="wordmark" viewBox="0 0 41 8"><path d="{word}"/></symbol>'

def icon(name):
    return f'<svg class="ico" aria-hidden="true"><use href="#icon-{name}"/></svg>'

def link(url, label):
    return f'<a href="{escape(url, quote=True)}" target="_blank" rel="noopener">{escape(label)} ↗</a>'

def section(key, title, body, cls=""):
    return f'<section id="{key}" data-title="{escape(title, quote=True)}" class="pane {cls}"><h2 class="fallback-title">{escape(title)}</h2>{body}</section>'

def metric(item):
    return f"{item['views']:,} 回" + ("閲覧" if item['category']=="Scratch" else "再生")

notes = {
    "516590726": "三角形を塗りつぶしてブロックを描画。移動ブロックの慣性や面ごとの色を扱い、草ブロック、ファイヤーバー、マグマ弾を追加。日本の傾向1位を記録しました。" + link("https://scratch.coach/segment/mochi-mochi-slime/", "Scratchコーチの紹介記事"),
    "517100829": "三角形の塗りつぶしと回転行列を使った3D描画。 " + link("https://wepress.web-magazine.jp/2021/11/22/20211122/", "ウェプレスの紹介記事") + " · " + link("https://zenn.dev/teba_eleven/articles/6195055d28ba86", "Zennの紹介記事"),
    "667093962": "t9decodeさんのイントロコンテストで同率優勝。",
    "PkOeKdcEXws": link("https://scratch.mit.edu/projects/1030515703/", "動画で紹介したゲーム"),
}
def tile(item):
    tags = ' '.join(item.get("tags", [item["category"]]))
    return f'''<a class="work-tile" data-tags="{tags}" href="#work-{item["id"]}">
    <img alt="" loading="lazy" width="480" height="320" src="{escape(item["thumbnail"])}"><span>
    <small>{item["category"]}　·　{metric(item)}</small><strong>{escape(item["title"])}</strong></span></a>'''

def work_detail(item):
    extra = ''.join(f'<details><summary>{label}</summary><div class="source-text">{escape(item[k])}</div></details>'
                    for k,label in [("description","公開ページの説明"),("instructions","使い方")] if item.get(k))
    record = notes.get(item['id'], "")
    body = f'''<a class="back" href="#works">‹ 制作物に戻る</a><div class="detail-layout"><div class="work-art"><img src="{escape(item["thumbnail"])}" loading="lazy" alt="{escape(item["title"])}"></div>
    <div class="work-copy"><small>{item['category']}　/　{item['published']}</small><h3>{escape(item["title"])}</h3>
    <p>{escape(item['summary'])}</p><p class="meta">{metric(item)}　·　{item['checked']} 確認</p>
    <div class="action">{link(item['url'], 'Scratchで遊ぶ' if item['category']=='Scratch' else 'YouTubeで見る')}</div></div></div>
    {f'<p class="record">{record}</p>' if record else ''}{extra}'''
    return section("work-"+item["id"], "作品情報", body)

gallery = [
    ("page_1/016c00e47f90e2877e4273df0db6aeeb.jpg","モチモチスライム 6 の制作中画面","https://twitter.com/nakakoutv/status/1554438152232009728"),
    ("page_1/7f7175b888b8eaed7d74878eae8a88c2.jpg","モチモチスライム 5","https://scratch.mit.edu/projects/618491769/"),
    ("page_1/29f798114ddddf51f103ef2405814920.jpg","LEGOのからくり金庫","https://www.youtube.com/watch?v=u8Qch5U5AzY"),
    ("page_1/7cde31ddde3f6300ba40fdcb47525c20.jpg","LEGOの制作記録","https://twitter.com/nakakoutv/status/1566061813283753984"),
    ("page_1/2ed24cfe7927b1334ddc5f0bc3f5a340.jpg","3Dイントロの制作記録","https://scratch.mit.edu/projects/667093962/"),
    ("page_1/20c1e2ce34dbfdb8687ed39ebde2c1ff.jpg","イントロコンテストの記録","https://scratch.mit.edu/projects/667093962/"),
]
filters = ''.join(f'<button data-filter="{k}" aria-pressed="{str(k=="all").lower()}">{label}</button>'
                  for k,label in [("all","すべて"),("Scratch","Scratch"),("YouTube","YouTube"),("LEGO","LEGO")])
works = section("works", "制作物", f'''<div class="filter-row"><div class="types" aria-label="作品の種類">{filters}</div>
    <input id="work-search" type="search" aria-label="作品名で検索" placeholder="作品名で検索">
    <span id="result-count" aria-live="polite">{len(items)} 件</span></div>
    <p id="empty-results" hidden>一致する作品がありません。</p><div class="work-grid">'''+''.join(map(tile,items))+'</div><div class="archive-end"><a href="#archive">過去の制作記録 ›</a>'+link("https://www.youtube.com/playlist?list=PLGsy0trdyVxPHYGXSMuSeQD43Hzv5YYoN","3D Minecraft 解説動画集")+'</div>')
archive = section("archive", "制作記録", '<a class="back" href="#works">‹ 制作物に戻る</a><div class="work-grid">'+''.join(f'<a class="work-tile" href="{url}" target="_blank" rel="noopener"><img src="{img}" alt="" loading="lazy"><strong>{title} ↗</strong></a>' for img,title,url in gallery)+'</div>')
repo_list = []
for repo in data['repositories']:
    files = " ".join(link(f["url"],f["label"]) for f in repo["files"])
    repo_list.append(f'<article class="repo"><small>{escape(repo["language"] or "")}</small><h3>{link(repo["html_url"],repo["name"])}</h3><p>{escape(repo["description"] or "")}</p><div class="file-links">{files}</div></article>')
github = section('github','GitHub','<div class="repo-list">'+''.join(repo_list)+'</div><div class="archive-end">'+link('https://github.com/NakakouTV?tab=repositories','GitHubの公開リポジトリ一覧')+f'<small>{data["repositories_checked"]} 確認</small></div>')
ch = data['channel']
social = "　".join(link(u,n) for n,u in [('Scratch','https://scratch.mit.edu/users/nakakouTV/'),('YouTube',ch['url']),('GitHub','https://github.com/NakakouTV'),('X','https://x.com/nakakoutv')])
profile = section('profile','プロフィール',f'''<div class="profile-head"><img src="862e42a0e183c0f94fc2ebb448783c47.jpg" alt="ナカコウのアイコン"><div><small>@nakakouTV</small><h3>ナカコウ</h3><p>LEGOとプログラミングが趣味の大学4年生。Scratch歴11年。</p></div></div><p>Scratch、Unity、C#、HTML / CSS、JavaScript、Python</p><h3>YouTube</h3><dl class="metrics"><div><dt>登録者</dt><dd>約{ch['subscribers']:,}<small> 人</small></dd></div><div><dt>公開動画</dt><dd>{ch['videos']}<small> 本</small></dd></div><div><dt>総再生</dt><dd>{ch['views']:,}<small> 回</small></dd></div></dl><small>{ch['checked']} 確認</small><div class="archive-end">{social}</div>''')
friends = [('1998氏','https://1998ky262.github.io/'),('haru-ymth','https://haruymth.github.io/'),('kobakoo','https://www.kobakoo.com/')]
links = section('links', '相互リンク', '<div class="friends">'+''.join(f'<a href="{url}" target="_blank" rel="noopener"><strong>{name}</strong><span>{url.split("//")[1].rstrip("/")}</span><b>↗</b></a>' for name,url in friends)+'</div><p>相互リンクのご連絡は '+link('https://x.com/nakakoutv','XのDM')+' へ。</p>')
menu = ''.join(f'<a href="#{key}">{icon(key)}<span>{name}</span></a>' for key,name in apps.items())
picks = {"516590726": ("Scratch・3Dアクション", "モチモチスライム 4"),
         "PkOeKdcEXws": ("YouTube・制作解説", "Scratchで3Dゲームを作ってみた")}
portfolio_picks = []
by_id = {item["id"]: item for item in items}
for key, (category, name) in picks.items():
    item = by_id[key]
    portfolio_picks.append(f'''<a href="#work-{key}">
      <img src="{escape(item['thumbnail'])}" alt="" width="96" height="60">
      <span><small>{category}</small><strong>{name}</strong></span></a>''')
template = (ROOT / "desktop.html").read_text(encoding="utf-8")
for path,entry in [("index.html",""),("page.html","links"),("page_2.html","works")]:
    page = template
    # The direct URLs also put their own content first in the script-free document.
    panes = {"works":works, "links":links, "profile":profile, "github":github}
    content = sorted(panes, key=lambda key: key != (entry or "works"))
    replacements = dict(title=apps.get(entry,"ナカコウの作品集"),entry=entry,symbols=symbols,
                        camera=escape(json.dumps(camera),quote=True),shortcuts=menu,menu=menu,
                        content=''.join(panes[k] for k in content)+archive+''.join(map(work_detail,items)),
                        portfolioPicks=''.join(portfolio_picks))
    for key,name in [("menuIcon","menu"),("soundIcon","sound"),("zoomIcon","zoom"),("weatherIcon","weather")]:
        replacements[key]=icon(name)
    for key,value in replacements.items():
        page=page.replace("{{"+key+"}}",value)
    (ROOT/path).write_text("\n".join(line.rstrip() for line in page.splitlines())+"\n", encoding="utf-8")
