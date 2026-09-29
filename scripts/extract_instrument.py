#!/usr/bin/env python3
"""
Phase 0 extraction script — Becoming Like Jesus / Nearer to Him.

Walks the source .docx in document order (paragraphs and tables
interleaved, exactly as Word stores them) and extracts all 103 questions
into the instrument-1.0.json shape the content package's Zod schema
expects. This is the "script" half of the blueprint's Phase 0 (Section 5:
"Export all questions to structured JSON by script; have a human verify
103 IDs, category counts, source wording, anchor completeness, scripture
references, and special instructions against the PDF").

This script does NOT do the human-verification half. It marks every
question review_status: "pending" and the instrument content_status:
"extracted_pending_review" — a distinct, honest status from both
"placeholder" (fake text) and "human_verified" (Dave has signed off
against the PDF). Nothing here paraphrases, corrects, or invents
scripture or doctrine — every field is copied verbatim from the source
document's own text.
"""
import json
import re
import sys
from pathlib import Path

import docx
from docx.table import Table
from docx.text.paragraph import Paragraph

SRC = "/root/.claude/uploads/1ba7fe6f-18fd-574c-99ae-ccd4ba6c733c/9bec5a6f-1790713438353_Becoming_Like_Jesus_Beta_1.0.docx"
OUT = Path(__file__).resolve().parent / "nearertohim" / "packages" / "content" / "src" / "instrument-1.0.json"

CAT_HEADING_RE = re.compile(r"^(\d{1,2})\.\s+(.*)$")
ITEM_HEADING_RE = re.compile(r"^(\d{1,2})\.(\d{1,2})\s*-\s*(.*)$")
TIMEFRAME_RE = re.compile(r"^(During the past [^,]+,)\s*(.*)$", re.IGNORECASE)

INSTRUMENT_VERSION = "1.0"


def iter_body(doc):
    for child in doc.element.body.iterchildren():
        tag = child.tag.split("}")[-1]
        if tag == "p":
            yield ("p", Paragraph(child, doc))
        elif tag == "tbl":
            yield ("tbl", Table(child, doc))


def strip_label(text, label):
    # "Question: foo" -> "foo"; tolerant of curly/straight colon and extra spaces
    m = re.match(rf"^{re.escape(label)}\s*:\s*(.*)$", text, re.IGNORECASE)
    return m.group(1).strip() if m else text.strip()


def parse_scripture_refs(text):
    return [r.strip() for r in text.split(";") if r.strip()]


def main():
    doc = docx.Document(SRC)

    categories = []
    questions = []
    outro_lines = []
    in_outro = False

    current_cat_num = None
    current_cat_title = None
    current_cat_kind = None  # 'scale_1_7' | 'covenant_4state'

    pending_item = None  # dict being built for the current question
    state = "seek"  # seek | got_question | got_response_line | got_anchors | got_scripture | got_christ

    def flush_item():
        nonlocal pending_item
        if pending_item is not None:
            questions.append(pending_item)
        pending_item = None

    cat_item_counter = {}

    for kind, node in iter_body(doc):
        if kind == "p":
            style = node.style.name if node.style else ""
            text = node.text.strip()
            if not text:
                continue

            if "Now Set the Score Aside" in text and style == "Heading 1":
                in_outro = True
                outro_lines.append(text)
                continue
            elif "Beta 1.0 Feedback" in text and style == "Heading 1":
                in_outro = False
            elif in_outro:
                outro_lines.append(text)
                continue

            if style == "Heading 1":
                cat_match = CAT_HEADING_RE.match(text)
                if cat_match:
                    flush_item()
                    current_cat_num = cat_match.group(1)
                    current_cat_title = cat_match.group(2).strip()
                    current_cat_kind = "covenant_4state" if current_cat_num == "12" else "scale_1_7"
                    cat_item_counter[current_cat_num] = 0
                    categories.append(
                        {
                            "id": current_cat_num,
                            "instrument_version": INSTRUMENT_VERSION,
                            "order": int(current_cat_num),
                            "title": current_cat_title,
                            "intro": "",
                            "response_kind": current_cat_kind,
                            "item_count": 0,  # filled in after counting
                        }
                    )
                continue

            if style == "Heading 2":
                item_match = ITEM_HEADING_RE.match(text)
                if item_match:
                    flush_item()
                    cat_num, item_num, title = item_match.groups()
                    cat_item_counter[cat_num] = cat_item_counter.get(cat_num, 0) + 1
                    pending_item = {
                        "id": f"{cat_num}.{item_num}",
                        "instrument_version": INSTRUMENT_VERSION,
                        "category_id": cat_num,
                        "order": int(item_num),
                        "title": title.strip(),
                        "prompt": "",
                        "timeframe_text": "",
                        "scripture_references": [],
                        "christ_example": "",
                        "reflection_prompt": "",
                        "source_locator": f"docx heading: \"{text}\"",
                        "review_status": "pending",
                    }
                    if current_cat_kind == "scale_1_7":
                        pending_item["anchors"] = {}
                    else:
                        pending_item["covenant_choices"] = [
                            "NEEDS_ATTENTION",
                            "STRIVING_FAITHFULLY",
                            "DEEPLY_ROOTED",
                            "NOT_YET_APPLICABLE",
                        ]
                    state = "seek"
                continue

            if pending_item is None:
                continue  # front-matter / category intro text, not a question field

            low = text.lower()
            if low.startswith("question:"):
                full_prompt = strip_label(text, "Question")
                tf = TIMEFRAME_RE.match(full_prompt)
                if tf:
                    pending_item["timeframe_text"] = tf.group(1).strip()
                    pending_item["prompt"] = full_prompt  # keep full text verbatim as the prompt
                else:
                    pending_item["timeframe_text"] = ""
                    pending_item["prompt"] = full_prompt
            elif low.startswith("circle:") or low.startswith("response:"):
                pass  # response affordance line; response kind is already known from the category
            elif low.startswith("scripture foundation:"):
                pending_item["scripture_references"] = parse_scripture_refs(strip_label(text, "Scripture foundation"))
            elif low.startswith("christ example"):
                # label is "Christ example / teaching:"
                pending_item["christ_example"] = re.sub(
                    r"^Christ example\s*/\s*teaching\s*:\s*", "", text, flags=re.IGNORECASE
                ).strip()
            elif low.startswith("reflect:"):
                pending_item["reflection_prompt"] = strip_label(text, "Reflect")
            # "Optional note / impression:" and blank-line paragraphs are the printable
            # answer space — not content, intentionally not captured.

        elif kind == "tbl":
            if pending_item is None:
                continue  # this is the 1-7 legend table or the category-12 legend table, not per-item
            rows = [[c.text.strip() for c in row.cells] for row in node.rows]
            if current_cat_kind == "scale_1_7" and len(rows) == 3:
                anchors = {}
                for r in rows:
                    if len(r) >= 2 and r[0] in ("1", "4", "7"):
                        anchors[r[0]] = r[1]
                pending_item["anchors"] = anchors
            # category 12 has no per-item table (the 4-state legend appears once, before 12.1)

    flush_item()

    # Fill in item_count per category from actual extracted questions.
    counts = {}
    for q in questions:
        counts[q["category_id"]] = counts.get(q["category_id"], 0) + 1
    for c in categories:
        c["item_count"] = counts.get(c["id"], 0)

    item_count_by_category = {c["id"]: c["item_count"] for c in categories}

    instrument = {
        "id": "nearertohim",
        "version": INSTRUMENT_VERSION,
        "tradition_id": "lds",
        "status": "draft",
        "content_status": "extracted_pending_review",
        "source_file_fingerprint": None,
        "checksum_algorithm": "sha256",
        "item_count_by_category": item_count_by_category,
        "intro": (
            "The purpose of Becoming Like Jesus is to help us come more fully unto Jesus Christ, "
            "become more like Him, and help others come unto Him."
        ),
        "instructions": (
            "Do not answer according to what you believe, intend to do, or think a disciple should do. "
            "Think about specific experiences from the requested time period and answer according to what "
            "you actually thought, desired, said, and did. When possible, recall at least three recent "
            "examples. If responses varied, score the pattern rather than your best or worst moment."
        ),
        "disclaimer": (
            "This assessment is a tool for honest reflection, not an authoritative or complete measurement "
            "of discipleship, righteousness, worthiness, spiritual standing, or our relationship with God. "
            "Becoming Like Jesus is an independent, noncommercial personal discipleship project. It is not "
            "an official publication of, nor is it sponsored, endorsed, or approved by, The Church of Jesus "
            "Christ of Latter-day Saints."
        ),
        "scoring_policy_version": "1.0",
        "published_at": None,
        "outro": outro_lines,
        "categories": categories,
        "questions": questions,
    }

    OUT.write_text(json.dumps(instrument, indent=2) + "\n")

    total = len(questions)
    print(f"Wrote {OUT}")
    print(f"Categories: {len(categories)}, Questions: {total} (expected 103: {'OK' if total == 103 else 'MISMATCH'})")
    for c in categories:
        print(f"  {c['id']:>2}. {c['title'][:60]:60s} items={c['item_count']:2d} kind={c['response_kind']}")

    # Sanity checks that would matter to a human reviewer
    missing_anchor_items = [
        q["id"] for q in questions if "anchors" in q and (not q["anchors"] or set(q["anchors"].keys()) != {"1", "4", "7"})
    ]
    missing_scripture = [q["id"] for q in questions if not q["scripture_references"]]
    missing_prompt = [q["id"] for q in questions if not q["prompt"]]
    missing_reflect = [q["id"] for q in questions if not q["reflection_prompt"]]
    missing_christ = [q["id"] for q in questions if not q["christ_example"]]
    print("\nExtraction completeness check:")
    print(f"  items missing complete 1/4/7 anchors: {missing_anchor_items or 'none'}")
    print(f"  items missing scripture_references: {missing_scripture or 'none'}")
    print(f"  items missing prompt: {missing_prompt or 'none'}")
    print(f"  items missing reflection_prompt: {missing_reflect or 'none'}")
    print(f"  items missing christ_example: {missing_christ or 'none'}")


if __name__ == "__main__":
    main()
