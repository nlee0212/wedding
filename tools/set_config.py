#!/usr/bin/env python3
"""
청첩장 계좌번호 · 카카오 키 입력 도우미

  python3 tools/set_config.py

질문에 차례로 답하면 js/config.js 에 바로 반영됩니다.
- 그냥 Enter 를 누르면 지금 값을 그대로 둡니다.
- 계좌를 아예 빼고 싶으면 은행 이름에 '-' 를 입력하세요 (그 줄이 청첩장에서 사라짐).
- 저장 전에 바뀌는 내용을 보여 주고 한 번 더 확인합니다. 원본은 js/config.js.bak 으로 남깁니다.
"""
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, "..", "js", "config.js")

ACC_RE = re.compile(
    r'(\{ role: "(?P<role>[^"]*)", name: "(?P<name>[^"]*)", bank: ")(?P<bank>[^"]*)(", number: ")(?P<number>[^"]*)("[^}]*\},?)'
)
KAKAO_RE = re.compile(r'(  kakaoKey: ")([^"]*)(")')


def ask(label, current):
    shown = current if current else "(비어 있음)"
    try:
        v = input(f"  {label} [{shown}]: ").strip()
    except EOFError:
        v = ""
    return current if v == "" else v


def clean_number(v):
    # 띄어쓰기는 '-' 로, 그 외 숫자와 - 가 아닌 문자는 제거
    v = re.sub(r"\s+", "-", v.strip())
    return re.sub(r"-{2,}", "-", re.sub(r"[^0-9-]", "", v))


def main():
    src = open(CONFIG, encoding="utf-8").read()
    accounts = list(ACC_RE.finditer(src))
    if not accounts:
        sys.exit("config.js 에서 계좌 항목을 찾지 못했어요.")

    print("\n💳 계좌번호 입력 (Enter = 그대로, 은행에 '-' = 이 계좌 빼기)\n")
    replacements = []  # (start, end, new_text)
    changes = []
    side = "신랑측"
    for i, m in enumerate(accounts):
        if i == 3:
            side = "신부측"
        who = f"{side} {m['role']} {m['name']}"
        print(f"[{who}]")
        bank = ask("은행", "" if m["bank"].startswith("TEMP") else m["bank"])
        if bank == "-":
            replacements.append((m.start(), m.end(), ""))
            changes.append(f"  {who}: 삭제")
            continue
        if not bank:
            print("  → 그대로 둡니다.\n")
            continue
        number = ask("계좌번호", "" if m["number"].startswith("000-") else m["number"])
        number = clean_number(number)
        if not bank or not number:
            print("  → 은행이나 번호가 비어 있어서 이 계좌는 그대로 둡니다.\n")
            continue
        new = f'{m.group(1)}{bank}{m.group(5)}{number}{m.group(7)}'
        if new != m.group(0):
            replacements.append((m.start(), m.end(), new))
            changes.append(f"  {who}: {bank} {number}")
        print()

    km = KAKAO_RE.search(src)
    print("💬 카카오톡 공유 JavaScript 키 (없으면 Enter)")
    key = ask("kakaoKey", km.group(2) if km else "")
    if km and key != km.group(2):
        key = re.sub(r"[^0-9a-zA-Z]", "", key)
        replacements.append((km.start(), km.end(), f"{km.group(1)}{key}{km.group(3)}"))
        changes.append(f"  카카오 키: {key[:4]}…{key[-4:]}" if len(key) > 8 else f"  카카오 키: {key}")

    if not changes:
        print("\n바뀐 내용이 없어요. 종료합니다.")
        return

    print("\n바뀌는 내용:")
    print("\n".join(changes))
    try:
        ok = input("\n저장할까요? (y/n): ").strip().lower()
    except EOFError:
        ok = "n"
    if ok not in ("y", "yes", "ㅛ", "네", "응"):
        print("저장하지 않았어요.")
        return

    out = src
    for start, end, new in sorted(replacements, key=lambda r: r[0], reverse=True):
        # 줄을 통째로 지우는 경우 줄바꿈까지 정리
        if new == "":
            line_start = out.rfind("\n", 0, start) + 1
            line_end = out.find("\n", end)
            out = out[:line_start] + out[line_end + 1:]
        else:
            out = out[:start] + new + out[end:]
    shutil.copyfile(CONFIG, CONFIG + ".bak")
    open(CONFIG, "w", encoding="utf-8").write(out)
    print("✅ js/config.js 에 저장했어요. (원본: js/config.js.bak)")
    print("   브라우저에서 청첩장을 새로고침하면 바로 보여요.")


if __name__ == "__main__":
    main()
