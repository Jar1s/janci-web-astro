#!/usr/bin/env python3
"""Wire data-translate on TK/EK/KO pages and generate i18n content modules."""

from __future__ import annotations

import json
import re
import time
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString
from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'scripts' / '.i18n-translation-cache.json'
PAGES = [
    ('src/pages/technicka-kontrola.astro', 'tk'),
    ('src/pages/emisna-kontrola.astro', 'ek'),
    ('src/pages/kontrola-originality.astro', 'ko'),
]
CANDIDATE_TAGS = {'p', 'h3', 'h4', 'h5', 'th', 'td', 'li', 'span'}
CHUNK = 4200


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


def needs_html_attr(tag) -> bool:
    return bool(tag.find('a') or tag.find('strong') or tag.find('em') or tag.find('br'))


def inner_html(tag) -> str:
    return ''.join(str(c) for c in tag.contents)


def load_cache() -> dict:
    if CACHE.exists():
        return json.loads(CACHE.read_text(encoding='utf-8'))
    return {}


def save_cache(cache: dict) -> None:
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding='utf-8')


def translate_plain(text: str, translator: GoogleTranslator, cache: dict) -> str:
    key = f'plain::{text}'
    if key in cache:
        return cache[key]
    if len(text) <= CHUNK:
        out = translator.translate(text)
    else:
        parts = []
        buf = ''
        for sentence in re.split(r'(?<=[.!?])\s+', text):
            if len(buf) + len(sentence) > CHUNK and buf:
                parts.append(translator.translate(buf))
                time.sleep(0.15)
                buf = sentence
            else:
                buf = f'{buf} {sentence}'.strip()
        if buf:
            parts.append(translator.translate(buf))
        out = ' '.join(parts)
    cache[key] = out
    time.sleep(0.12)
    return out


def translate_html_fragment(html: str, translator: GoogleTranslator, cache: dict) -> str:
    key = f'html::{html}'
    if key in cache:
        return cache[key]

    wrapped = BeautifulSoup(f'<wrap>{html}</wrap>', 'html.parser')
    root = wrapped.find('wrap')
    if root is None:
        return html

    for node in list(root.descendants):
        if not isinstance(node, NavigableString):
            continue
        piece = str(node).strip()
        if not piece:
            continue
        ck = f'plain::{piece}'
        if ck in cache:
            node.replace_with(cache[ck])
            continue
        try:
            translated = translator.translate(piece)
        except Exception:
            translated = piece
        if not translated:
            translated = piece
        cache[ck] = translated
        node.replace_with(translated)
        time.sleep(0.1)

    out = ''.join(str(c) for c in root.contents)
    cache[key] = out
    return out


def inject_attrs(tag_str: str, key: str, html_mode: bool) -> str:
    m = re.match(r'(<[a-zA-Z0-9]+[^>]*)(>)', tag_str)
    if not m:
        return tag_str
    opening, close = m.group(1), m.group(2)
    if 'data-translate=' in opening:
        return tag_str
    attrs = f' data-translate="{key}"'
    if html_mode:
        attrs += ' data-translate-html'
    return f'{opening}{attrs}{close}{tag_str[len(m.group(0)) :]}'


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def write_module(path: Path, sk: dict, en: dict) -> None:
    lines = ['/** Auto-generated service page copy – do not edit by hand */', 'export const sk = {']
    for key in sorted(sk.keys()):
        lines.append(f'  {js_string(key)}: {js_string(sk[key])},')
    lines.append('};')
    lines.append('')
    lines.append('export const en = {')
    for key in sorted(en.keys()):
        lines.append(f'  {js_string(key)}: {js_string(en[key])},')
    lines.append('};')
    lines.append('')
    path.write_text('\n'.join(lines), encoding='utf-8')


def process_page(rel_path: str, prefix: str, translator: GoogleTranslator, cache: dict):
    path = ROOT / rel_path
    raw = path.read_text(encoding='utf-8')
    soup = BeautifulSoup(strip_frontmatter(raw), 'html.parser')
    candidates = prune_nested([t for t in soup.find_all(CANDIDATE_TAGS) if is_candidate(t)])

    sk_entries: dict[str, str] = {}
    en_entries: dict[str, str] = {}
    replacements: list[tuple[str, str]] = []

    for idx, tag in enumerate(candidates):
        key = f'{prefix}-b-{idx:04d}'
        tag_str = str(tag)
        html_mode = needs_html_attr(tag)
        if html_mode:
            sk_val = inner_html(tag).strip()
            en_val = translate_html_fragment(sk_val, translator, cache)
        else:
            sk_val = tag.get_text(strip=True)
            en_val = translate_plain(sk_val, translator, cache)

        sk_entries[key] = sk_val if html_mode else sk_val
        en_entries[key] = en_val

        new_tag_str = inject_attrs(tag_str, key, html_mode)
        if new_tag_str != tag_str:
            replacements.append((tag_str, new_tag_str))

    updated = raw
    for old, new in replacements:
        if old not in updated:
            print(f'WARN missing fragment in {rel_path}: {old[:80]}...')
            continue
        updated = updated.replace(old, new, 1)

    path.write_text(updated, encoding='utf-8')
    return sk_entries, en_entries


def main():
    cache = load_cache()
    translator = GoogleTranslator(source='sk', target='en')

    all_sk: dict[str, str] = {}
    all_en: dict[str, str] = {}

    for rel, prefix in PAGES:
        print(f'Processing {rel}...')
        sk, en = process_page(rel, prefix, translator, cache)
        all_sk.update(sk)
        all_en.update(en)
        print(f'  {len(sk)} keys')

    save_cache(cache)

    out = ROOT / 'src/scripts/i18n/service-content.js'
    write_module(out, all_sk, all_en)
    print(f'Wrote {out} ({len(all_sk)} keys)')


if __name__ == '__main__':
    main()
