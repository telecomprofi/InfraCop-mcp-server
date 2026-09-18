from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, asdict

SEVERITY_PATTERNS = [
    (re.compile(r"\b(MUST NOT|MUST|mandatory|forbidden|fails the|non-compliant)\b", re.I), "mandatory"),
    (re.compile(r"\b(SHOULD|recommended|optional, but good)\b", re.I), "recommended"),
    (re.compile(r"\b(MAY|optional)\b", re.I), "optional"),
]


@dataclass
class Chunk:
    id: str
    doc_id: str
    filename: str
    domain: str
    heading: str
    heading_path: list[str]
    severity: str
    rule_id: str
    content: str
    tokens: int
    release: str

    def payload(self) -> dict:
        data = asdict(self)
        data["text"] = self.content
        return data


def _slug(value: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return s[:48]


def _tokens(text: str) -> int:
    return max(1, round(len(text.split()) * 1.3))


def _severity(heading: str, body: str) -> str:
    blob = f"{heading}\n{body}"
    for pat, sev in SEVERITY_PATTERNS:
        if pat.search(blob):
            return sev
    if heading.lower().startswith("mandatory"):
        return "mandatory"
    return "recommended"


def _split_oversized(text: str, target: int = 450) -> list[str]:
    if _tokens(text) <= target:
        return [text]
    paras = re.split(r"\n{2,}", text)
    out: list[str] = []
    buf: list[str] = []
    for p in paras:
        trial = "\n\n".join([*buf, p])
        if buf and _tokens(trial) > target:
            out.append("\n\n".join(buf))
            buf = [p]
        else:
            buf.append(p)
    if buf:
        out.append("\n\n".join(buf))
    return out


def infer_domain(filename: str) -> str:
    name = filename.lower()
    if "cicd" in name or "ci-cd" in name:
        return "cicd"
    if "observ" in name:
        return "observability"
    if "security" in name:
        return "security"
    if "aws" in name:
        return "aws"
    return "iac"


def chunk_markdown(
    *,
    filename: str,
    markdown: str,
    release: str,
    title: str | None = None,
) -> list[Chunk]:
    """H2-aware splitter matching the operator-console chunker."""
    doc_id = filename.replace(".md", "")
    title = title or doc_id
    lines = markdown.split("\n")
    sections: list[tuple[str, list[str], list[str]]] = []
    heading, path, body = title, [title], []
    for line in lines:
        h2 = re.match(r"^##\s+(.+)$", line)
        if h2:
            if "".join(body).strip():
                sections.append((heading, path, body))
            heading = h2.group(1).strip()
            path = [title, heading]
            body = []
        else:
            body.append(line)
    if "".join(body).strip():
        sections.append((heading, path, body))

    chunks: list[Chunk] = []
    domain = infer_domain(filename)
    for heading, path, body_lines in sections:
        text = "\n".join(body_lines).strip()
        if not text:
            continue
        pieces = _split_oversized(text)
        for i, piece in enumerate(pieces):
            rule_id = f"{doc_id}.{_slug(heading)}" + (f".{i + 1}" if len(pieces) > 1 else "")
            raw_id = f"{release}:{rule_id}"
            chunks.append(
                Chunk(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, raw_id)),
                    doc_id=doc_id,
                    filename=filename,
                    domain=domain,
                    heading=heading,
                    heading_path=path,
                    severity=_severity(heading, piece),
                    rule_id=rule_id,
                    content=piece,
                    tokens=_tokens(piece),
                    release=release,
                )
            )
    return chunks
