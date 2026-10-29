#!/usr/bin/env python3
"""Собирает index.html + css + js в один файл и раскладывает три варианта:
dist/NetTrainer.html (открывается двойным кликом), dist/artifact.html (claude.ai) и docs/ — приложение для GitHub Pages."""
import hashlib
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Только для приложения: манифест, иконки и режим «на весь экран» на iPhone
PWA_HEAD = '''<meta name="description" content="CCNA course in English, Russian and Hebrew, a network simulator and training tasks.">
<meta name="theme-color" content="#f7f7f7">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="NetTrainer">
<meta name="apple-mobile-web-app-status-bar-style" content="default">'''


def build_site(html):
    """docs/ целиком создаётся заново при каждой сборке — руками там ничего не правим."""
    site = ROOT / 'docs'
    if site.exists():
        shutil.rmtree(site)
    (site / 'icons').mkdir(parents=True)
    page = html.replace('<title>NetTrainer</title>', '<title>NetTrainer</title>\n' + PWA_HEAD, 1)
    assert PWA_HEAD in page, 'не нашёл <title> для вставки манифеста'
    (site / 'index.html').write_text(page, encoding='utf-8')
    (site / 'manifest.webmanifest').write_bytes((ROOT / 'pwa' / 'manifest.webmanifest').read_bytes())
    for icon in sorted((ROOT / 'pwa' / 'icons').glob('*.png')):
        shutil.copy(icon, site / 'icons' / icon.name)
    # версия = хэш содержимого: без изменений сборка даёт ту же версию, и приложение не просит обновиться зря
    digest = hashlib.sha256()
    for f in sorted(p for p in site.rglob('*') if p.is_file()):
        digest.update(f.relative_to(site).as_posix().encode())
        digest.update(f.read_bytes())
    version = digest.hexdigest()[:12]
    sw = (ROOT / 'pwa' / 'sw.js').read_text(encoding='utf-8').replace('__VERSION__', version)
    (site / 'sw.js').write_text(sw, encoding='utf-8')
    (site / '.nojekyll').write_text('', encoding='utf-8')  # GitHub Pages отдаёт файлы как есть
    size = (site / 'index.html').stat().st_size // 1024
    print(f'{site}/ — приложение, версия {version}, index.html {size} KB')


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')

    def inline_css(m):
        css = (ROOT / m.group(1)).read_text(encoding='utf-8')
        return '<style>\n' + css + '\n</style>'

    def inline_js(m):
        js = (ROOT / m.group(1)).read_text(encoding='utf-8')
        return '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>'

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
    out = ROOT / 'dist' / 'NetTrainer.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding='utf-8')
    print(f'{out} — {out.stat().st_size // 1024} KB')

    # Вариант для публикации по ссылке (claude.ai Artifact): обёртку <html>/<head>/<body> добавляет сам хостинг.
    page = re.sub(r'<!doctype html>\s*|</?html[^>]*>\s*|</?head>\s*|</?body>\s*|<meta [^>]*>\s*', '', html, flags=re.I)
    art = ROOT / 'dist' / 'artifact.html'
    art.write_text(page, encoding='utf-8')
    print(f'{art} — {art.stat().st_size // 1024} KB')

    build_site(html)


if __name__ == '__main__':
    main()
