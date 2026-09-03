def upload_md(client, name="demo.md", content="# 标题\n\n" + "这是用于测试上传解析与分块入库的中文段落。" * 30):
    return client.post(
        "/api/documents/upload",
        files={"file": (name, content.encode("utf-8"), "text/markdown")},
    )


def test_upload_list_delete(client):
    res = upload_md(client)
    assert res.status_code == 200
    doc = res.json()
    assert doc["status"] == "ready"
    assert doc["chunk_count"] > 0

    listed = client.get("/api/documents").json()
    assert any(d["id"] == doc["id"] for d in listed)

    assert client.delete(f"/api/documents/{doc['id']}").status_code == 200
    assert client.get("/api/documents").json() == []


def test_upload_unsupported_type(client):
    res = client.post(
        "/api/documents/upload",
        files={"file": ("a.xyz", b"data", "application/octet-stream")},
    )
    assert res.status_code == 422
    assert "code" in res.json()


def test_rebuild_index(client):
    upload_md(client)
    res = client.post("/api/index/rebuild")
    assert res.status_code == 200
    assert res.json()["chunks"] > 0
