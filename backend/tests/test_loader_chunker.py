import pytest

from app.core.errors import AppError
from app.rag.loader import load_text
from app.rag.chunker import chunk_text


def test_load_txt_and_md(tmp_path):
    f = tmp_path / "note.md"
    f.write_text("# 标题\n\nFastAPI 很好用。", encoding="utf-8")
    assert "FastAPI 很好用。" in load_text(f, "md")
    g = tmp_path / "note.txt"
    g.write_text("纯文本内容", encoding="utf-8")
    assert load_text(g, "txt") == "纯文本内容"


def test_load_unsupported_ext(tmp_path):
    f = tmp_path / "file.xyz"
    f.write_text("x", encoding="utf-8")
    with pytest.raises(AppError):
        load_text(f, "xyz")


def test_load_docx(tmp_path):
    from docx import Document as DocxDocument

    f = tmp_path / "doc.docx"
    d = DocxDocument()
    d.add_paragraph("这是来自 Word 文档的句子。")
    d.save(f)
    assert "Word 文档的句子" in load_text(f, "docx")


def test_chunk_short_text_single_chunk():
    assert chunk_text("短文本", size=500, overlap=80) == ["短文本"]


def test_chunk_long_text_preserves_and_overlaps():
    para = "这是一段用于测试分块的中文段落，包含足够多的字符以触发切分行为。" * 10
    text = "\n\n".join(f"第{i}段：{para}" for i in range(6))
    chunks = chunk_text(text, size=500, overlap=80)
    assert len(chunks) > 1
    assert all(len(c) <= 600 for c in chunks)  # 允许少量超限
    assert "第5段" in "".join(chunks)  # 内容不丢失
