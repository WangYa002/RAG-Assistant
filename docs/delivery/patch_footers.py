"""按 docx skill toc.md 规则后处理页脚域：
1. 移除封面节的空 <w:pgNumType/>
2. 罗马页码节页脚 instrText 加 PAGE \\* ROMAN，阿拉伯节加 PAGE \\* arabic（WPS 兼容）
通过 document.xml 中各 sectPr 的 footerReference r:id 与 pgNumType fmt 对应。
"""
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path


def main(docx_path: str) -> None:
    src = Path(docx_path)
    tmp = Path(tempfile.mkdtemp())
    with zipfile.ZipFile(src) as z:
        z.extractall(tmp)

    word = tmp / "word"
    doc_xml = (word / "document.xml").read_text(encoding="utf-8")
    doc_xml = doc_xml.replace("<w:pgNumType/>", "")

    rels = (word / "_rels" / "document.xml.rels").read_text(encoding="utf-8")
    rid_to_target = dict(re.findall(r'<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', rels))

    footer_fmt: dict[str, str] = {}
    for sect in re.findall(r"<w:sectPr.*?</w:sectPr>", doc_xml, flags=re.S):
        fmt_m = re.search(r'<w:pgNumType[^>]*w:fmt="([^"]+)"', sect)
        if not fmt_m:
            continue
        fmt = fmt_m.group(1)
        for rid in re.findall(r'<w:footerReference[^>]*r:id="([^"]+)"', sect):
            target = rid_to_target.get(rid, "")
            name = Path(target).name
            if name:
                footer_fmt[name] = "ROMAN" if "oman" in fmt or fmt.lower() == "upperroman" else "arabic"

    for name, fmt in footer_fmt.items():
        f = word / name
        if not f.exists():
            continue
        xml = f.read_text(encoding="utf-8")
        xml = re.sub(
            r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
            rf"\1 PAGE \\* {fmt} \\* MERGEFORMAT \2",
            xml,
        )
        f.write_text(xml, encoding="utf-8")
        print(f"patched {name} -> {fmt}")

    (word / "document.xml").write_text(doc_xml, encoding="utf-8")

    out = src.with_suffix(".tmp.docx")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(tmp.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(tmp).as_posix())
    shutil.move(str(out), str(src))
    shutil.rmtree(tmp)
    print("footers patched:", src)


if __name__ == "__main__":
    main(sys.argv[1])
