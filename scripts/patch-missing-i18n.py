#!/usr/bin/env python3
"""Patch elements that failed whitespace-sensitive replacement."""

import json
import re
from pathlib import Path

from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'scripts' / '.i18n-translation-cache.json'
SERVICE = ROOT / 'src/scripts/i18n/service-content.js'
TRANSLATOR = GoogleTranslator(source='sk', target='en')
CANDIDATE_TAGS = {'p', 'h3', 'h4', 'h5', 'th', 'td', 'li', 'span'}


def strip_frontmatter(text: str) -> str:
    if text.startswith('---'):
        parts = text.split('---', 2)
        if len(parts) >= 3:
            return parts[2]
    return text


def is_candidate(tag) -> bool:
    if tag.get('data-translate'):
        return False
    if tag.name not in CANDIDATE_TAGS:
        return False
    text = tag.get_text(strip=True)
    if len(text) < 2:
        return False
    if text in ('●', '•', '\u25cf'):
        return False
    if tag.name == 'span' and tag.parent and tag.parent.name == 'li':
        spans = tag.parent.find_all('span', recursive=False)
        if spans and tag is spans[0] and len(text) < 5:
            return False
    if tag.name == 'li':
        inner_spans = tag.find_all('span', recursive=False)
        if inner_spans and any(len(s.get_text(strip=True)) > 10 for s in inner_spans):
            return False
    return True


def prune_nested(candidates):
    out = []
    for tag in candidates:
        if any(tag is not other and other in tag.descendants for other in candidates if other is not tag):
            continue
        out.append(tag)
    return out


def needs_html(tag):
    return bool(tag.find('a') or tag.find('strong') or tag.find('em') or tag.find('br'))


def inner_html(tag):
    return ''.join(str(c) for c in tag.contents)


def translate(sk_text: str, cache: dict) -> str:
    key = f'plain::{sk_text}'
    if key in cache:
        return cache[key]
    out = TRANSLATOR.translate(sk_text) or sk_text
    cache[key] = out
    return out


def translate_html(html: str, cache: dict) -> str:
    key = f'html::{html}'
    if key in cache:
        return cache[key]
    soup = BeautifulSoup(f'<wrap>{html}</wrap>', 'html.parser')
    root = soup.find('wrap')
    for node in list(root.descendants):
        if not isinstance(node, str) and not hasattr(node, 'strip'):
            continue
        from bs4 import NavigableString

        if not isinstance(node, NavigableString):
            continue
        piece = str(node).strip()
        if not piece:
            continue
        ck = f'plain::{piece}'
        if ck not in cache:
            cache[ck] = TRANSLATOR.translate(piece) or piece
        node.replace_with(cache[ck])
    out = ''.join(str(c) for c in root.contents)
    cache[key] = out
    return out


def load_service_exports():
    text = SERVICE.read_text(encoding='utf-8')
    sk = {}
    en = {}
    for lang, target in [('sk', sk), ('en', en)]:
        block = re.search(rf'export const {lang} = \{{([\s\S]*?)\n\}};', text)
        if not block:
            continue
        for m in re.finditer(r'"([^"]+)":\s*("(?:\\.|[^"\\])*")', block.group(1)):
            target[m.group(1)] = json.loads(m.group(2))
    return sk, en


def save_service_exports(sk: dict, en: dict):
    lines = ['/** Auto-generated service page copy – do not edit by hand */', 'export const sk = {']
    for key in sorted(sk.keys()):
        lines.append(f'  {json.dumps(key, ensure_ascii=False)}: {json.dumps(sk[key], ensure_ascii=False)},')
    lines.append('};')
    lines.append('')
    lines.append('export const en = {')
    for key in sorted(en.keys()):
        lines.append(f'  {json.dumps(key, ensure_ascii=False)}: {json.dumps(en[key], ensure_ascii=False)},')
    lines.append('};')
    lines.append('')
    SERVICE.write_text('\n'.join(lines), encoding='utf-8')


def patch_by_text(raw: str, tag, key: str, html_mode: bool) -> str:
    needle = tag.get_text(strip=True)[:60]
    if not needle:
        return raw
    # Find opening tag with this text nearby
    pattern = rf'(<{tag.name}\b[^>]*>)([\s\S]*?{re.escape(needle[:30])}[\s\S]*?</{tag.name}>)'
    m = re.search(pattern, raw)
    if not m:
        return raw
    full = m.group(0)
    if 'data-translate=' in full:
        return raw
    opening = m.group(1)
    if 'data-translate=' in opening:
        return raw
    attrs = f' data-translate="{key}"'
    if html_mode:
        attrs += ' data-translate-html'
    new_opening = opening[:-1] + attrs + '>'
    new_full = new_opening + m.group(2)
    return raw.replace(full, new_full, 1)


def main():
    cache = json.loads(CACHE.read_text(encoding='utf-8')) if CACHE.exists() else {}
    sk_all, en_all = load_service_exports()
    counter = {'tk': 900, 'ek': 900, 'ko': 900}

    for rel, prefix in [
        ('src/pages/technicka-kontrola.astro', 'tk'),
        ('src/pages/emisna-kontrola.astro', 'ek'),
        ('src/pages/kontrola-originality.astro', 'ko'),
    ]:
        path = ROOT / rel
        raw = path.read_text(encoding='utf-8')
        soup = BeautifulSoup(strip_frontmatter(raw), 'html.parser')
        candidates = prune_nested([t for t in soup.find_all(CANDIDATE_TAGS) if is_candidate(t)])
        for tag in candidates:
            key = f'{prefix}-b-{counter[prefix]:04d}'
            counter[prefix] += 1
            html_mode = needs_html(tag)
            sk_val = inner_html(tag).strip() if html_mode else tag.get_text(strip=True)
            en_val = translate_html(sk_val, cache) if html_mode else translate(sk_val, cache)
            sk_all[key] = sk_val
            en_all[key] = en_val
            raw = patch_by_text(raw, tag, key, html_mode)
        path.write_text(raw, encoding='utf-8')
        print(rel, 'patched', len(candidates))

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding='utf-8')
    save_service_exports(sk_all, en_all)
    print('total keys', len(sk_all))


if __name__ == '__main__':
    main()
