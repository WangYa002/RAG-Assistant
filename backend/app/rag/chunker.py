def chunk_text(text: str, size: int = 500, overlap: int = 80) -> list[str]:
    """递归字符分块，中文标点优先切分；空文本返回空列表。"""
    if not text or not text.strip():
        return []
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""],
    )
    chunks = [c.strip() for c in splitter.split_text(text) if c.strip()]
    return chunks or [text.strip()]
