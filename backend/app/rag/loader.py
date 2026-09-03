from pathlib import Path

from ..core.errors import AppError

SUPPORTED = {"txt", "md", "pdf", "docx"}


def load_text(path: Path, ext: str) -> str:
    ext = ext.lower().lstrip(".")
    if ext in ("txt", "md"):
        return path.read_text(encoding="utf-8", errors="ignore")
    if ext == "pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if ext == "docx":
        import docx

        d = docx.Document(str(path))
        return "\n".join(p.text for p in d.paragraphs)
    raise AppError(
        "unsupported_file",
        f"暂不支持 .{ext} 格式，请上传 txt / md / pdf / docx 文件",
        status=422,
    )
