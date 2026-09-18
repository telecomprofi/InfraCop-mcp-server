from pathlib import Path

from infracop_mcp.embeddings import HashEmbeddings
from infracop_mcp.ingest import markdown_from_dir, process_webhook, valid_signature


def test_hash_embed_unit_and_stable():
    e = HashEmbeddings(dims=32)
    a = e.embed_query("mandatory tagging Owner CostCentre")
    b = e.embed_query("mandatory tagging Owner CostCentre")
    assert a == b
    assert len(a) == 32
    assert abs(sum(x * x for x in a) - 1) < 1e-6


def test_markdown_from_fixtures():
    root = Path(__file__).resolve().parents[1] / "fixtures"
    files = markdown_from_dir(root)
    names = [n for n, _ in files]
    assert "iac-terraform.md" in names
    assert any("Mandatory Resource tagging" in body for _, body in files)


def test_webhook_ping_and_empty_secret():
    status, payload = process_webhook({"X-GitHub-Event": "ping"}, b"{}")
    assert status == 200
    assert payload == {"pong": True}


def test_webhook_rejects_bad_signature(monkeypatch):
    from infracop_mcp import ingest as ingest_mod

    monkeypatch.setattr(ingest_mod.settings, "github_webhook_secret", "s3cret")
    status, payload = process_webhook({"x-hub-signature-256": "sha256=dead"}, b"{}")
    assert status == 401
    assert "error" in payload


def test_valid_signature_empty_secret_allows():
    assert valid_signature("", b"abc", "") is True
