#!/usr/bin/env python3
"""PDF -> Markdown 转换（PyMuPDF / fitz 引擎）。

与纯前端 pdfjs 坐标猜测不同，本脚本利用 PDF 内的真实矢量线段
（page.find_tables）识别表格结构，对复杂/混合版面稳健得多。
同时提取文本块（跳过落在表格区域内的）与位图图片。

用法:
  pymupdf_to_md.py <input.pdf> <output_dir>
      output_dir 下生成 output.md 与 media/（图片）
  pymupdf_to_md.py --selftest
      生成含表格的测试 PDF 并验证表格提取，打印结果后退出
"""
import os
import sys

import fitz


def _inside_any(x0: float, y0: float, x1: float, y1: float, rects) -> bool:
    """判断文本块矩形是否落在任一表格 bbox 内（容差 2pt）。"""
    for r in rects:
        if x0 >= r.x0 - 2 and y0 >= r.y0 - 2 and x1 <= r.x1 + 2 and y1 <= r.y1 + 2:
            return True
    return False


def pdf_to_markdown(pdf_path: str, out_dir: str) -> str:
    os.makedirs(out_dir, exist_ok=True)
    media_dir = os.path.join(out_dir, "media")
    os.makedirs(media_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    parts: list[str] = []
    img_idx = 0

    for pno in range(doc.page_count):
        page = doc.load_page(pno)
        tables = page.find_tables()
        table_rects = [fitz.Rect(t.bbox) for t in tables.tables]

        # 文本块（跳过图片块与落在表格内的块，表格单独处理）
        for b in page.get_text("blocks"):
            if len(b) < 7:
                continue
            x0, y0, x1, y1, text, _no, btype = b[0:7]
            text = text.strip()
            if not text:
                continue
            if btype == 1:  # 图片块
                continue
            if _inside_any(x0, y0, x1, y1, table_rects):
                continue
            parts.append(text)

        # 表格：直接输出 GFM 表格
        for t in tables.tables:
            try:
                md = t.to_markdown()
            except Exception:
                md = ""
            if md.strip():
                parts.append(md.strip())

        # 位图图片
        for img in page.get_images(full=True):
            xref = img[0]
            try:
                base = doc.extract_image(xref)
            except Exception:
                continue
            data = base.get("image")
            ext = base.get("ext", "png")
            if not data:
                continue
            img_idx += 1
            fname = f"image-{img_idx}.{ext}"
            with open(os.path.join(media_dir, fname), "wb") as f:
                f.write(data)
            parts.append(f"![{fname}](media/{fname})")

        if pno < doc.page_count - 1:
            parts.append("\n---\n")

    md = "\n\n".join(parts).strip()
    with open(os.path.join(out_dir, "output.md"), "w", encoding="utf-8") as f:
        f.write(md)
    doc.close()
    return md


def _selftest() -> None:
    import tempfile

    # 构造含 3 列 2 行表格的测试 PDF
    doc = fitz.open()
    page = doc.new_page()
    lines = [
        (50, 100, 350, 100), (50, 150, 350, 150), (50, 200, 350, 200),  # 横线
        (50, 100, 50, 200), (150, 100, 150, 200),
        (250, 100, 250, 200), (350, 100, 350, 200),  # 竖线
    ]
    for (x0, y0, x1, y1) in lines:
        page.draw_line((x0, y0), (x1, y1), color=(0, 0, 0), width=1)
    # 注：手工构造 PDF 用 fontfile 插入中文会缺 ToUnicode，提取为占位符 "··"，
    # 故自测用 ASCII 内容验证表格提取逻辑（真实中文 PDF 带 ToUnicode 可正常提取）。
    cells = [
        (60, 112, "Name"), (160, 112, "Age"), (260, 112, "City"),
        (60, 162, "Alice"), (160, 162, "28"), (260, 162, "Beijing"),
    ]
    for (x, y, txt) in cells:
        page.insert_text((x, y), txt, fontsize=11)
    tmp_pdf = tempfile.mktemp(suffix=".pdf")
    doc.save(tmp_pdf)
    doc.close()

    out = tempfile.mkdtemp()
    md = pdf_to_markdown(tmp_pdf, out)
    print("=== 自测 MD 输出 ===")
    print(md)
    ok = "|" in md and "---" in md and "Name" in md and "Alice" in md and "Beijing" in md
    print("\n=== 表格提取正确 ===", ok)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        _selftest()
    elif len(sys.argv) >= 3:
        pdf_to_markdown(sys.argv[1], sys.argv[2])
    else:
        print("usage: pymupdf_to_md.py <input.pdf> <output_dir> | --selftest", file=sys.stderr)
        sys.exit(1)
