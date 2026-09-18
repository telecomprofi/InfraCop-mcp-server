import uuid

from infracop_mcp.chunking import chunk_markdown


SAMPLE = """# IaC

## Mandatory Resource tagging
Make sure you tag resources. This is mandatory.

## Mandatory Resource Naming convention
bckstg-be-prod-rds-db-001 must be shorter than 47 symbols.
"""


def test_h2_split_and_severity():
    chunks = chunk_markdown(filename="iac-terraform.md", markdown=SAMPLE, release="v1.0.0")
    assert len(chunks) >= 2
    headings = {c.heading for c in chunks}
    assert "Mandatory Resource tagging" in headings
    assert any(c.severity == "mandatory" for c in chunks)
    assert all(c.domain == "iac" for c in chunks)
    assert all(c.release == "v1.0.0" for c in chunks)
    for c in chunks:
        uuid.UUID(c.id)
