"""Rebuild the BukuHR demo opener as an abstract, editable PowerPoint."""

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

DEEP = RGBColor(0x1B, 0x3A, 0x28)
MID = RGBColor(0x2D, 0x5E, 0x3A)
CREAM = RGBColor(0xF5, 0xF3, 0xEE)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SECONDARY = RGBColor(0x4A, 0x6B, 0x52)
MUTED = RGBColor(0x55, 0x6B, 0x5C)
SOFT = RGBColor(0xE4, 0xED, 0xE6)
LINE = RGBColor(0xD5, 0xD0, 0xC4)
PALE = RGBColor(0xA8, 0xC4, 0xAE)
BAR = RGBColor(0xC9, 0xD5, 0xCB)

DISPLAY = "Georgia"
SANS = "Calibri"
OUT = "/Users/intanlyeanna/Documents/Kerja Kerja Asyraf/BukuHR System/docs/sales/bukuhr-demo-opener.pptx"


def force_font(run, name):
    r_pr = run._r.get_or_add_rPr()
    for tag in ("latin", "ea", "cs"):
        el = r_pr.find(qn(f"a:{tag}"))
        if el is None:
            el = etree.SubElement(r_pr, qn(f"a:{tag}"))
        el.set("typeface", name)


def style_run(run, text, size, color, font, bold=False, spacing=None):
    run.text = text
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.name = font
    run.font.italic = False
    force_font(run, font)
    if spacing is not None:
        run._r.get_or_add_rPr().set("spc", str(spacing))


def add_text(slide, l, t, w, h, text, size, color, font=SANS, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=None):
    box = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Emu(0)
    tf.margin_right = Emu(0)
    tf.margin_top = Emu(0)
    tf.margin_bottom = Emu(0)
    anchor_map = {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}
    tf._txBody.bodyPr.set("anchor", anchor_map[anchor])
    p = tf.paragraphs[0]
    p.alignment = align
    p.space_before = Pt(0)
    p.space_after = Pt(0)
    style_run(p.add_run(), text, size, color, font, bold, spacing)
    return box


def add_lines(slide, l, t, w, h, lines, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Emu(0)
    tf.margin_right = Emu(0)
    tf.margin_top = Emu(0)
    tf.margin_bottom = Emu(0)
    anchor_map = {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}
    tf._txBody.bodyPr.set("anchor", anchor_map[anchor])
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = line.get("align", align)
        p.space_before = Pt(line.get("before", 0))
        p.space_after = Pt(line.get("after", 0))
        style_run(
            p.add_run(),
            line["text"],
            line.get("size", 18),
            line.get("color", DEEP),
            line.get("font", SANS),
            line.get("bold", False),
            line.get("spacing"),
        )
    return box


def add_shape(slide, kind, l, t, w, h, fill, line=None, radius=None, line_pt=1.25):
    shape = slide.shapes.add_shape(kind, Inches(l), Inches(t), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(line_pt)
    if radius is not None:
        try:
            shape.adjustments[0] = radius
        except Exception:
            pass
    sp_pr = shape._element.spPr
    effect = sp_pr.find(qn("a:effectLst"))
    if effect is not None:
        sp_pr.remove(effect)
    return shape


def rect(slide, l, t, w, h, fill, line=None):
    return add_shape(slide, MSO_SHAPE.RECTANGLE, l, t, w, h, fill, line)


def round_rect(slide, l, t, w, h, fill, line=None, radius=0.12, line_pt=1.25):
    return add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h, fill, line, radius, line_pt)


def oval(slide, l, t, w, h, fill):
    return add_shape(slide, MSO_SHAPE.OVAL, l, t, w, h, fill)


def set_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def page_mark(slide, n, color):
    add_text(slide, 12.15, 7.08, 0.7, 0.24, f"0{n}", 12, color, SANS, align=PP_ALIGN.RIGHT)


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    prs.core_properties.title = "BukuHR demo opener"
    prs.core_properties.subject = "Short opener before a live BukuHR demo"
    prs.core_properties.category = "Sales"
    blank = prs.slide_layouts[6]

    # 1 Cover
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    oval(s, 8.9, -2.55, 7.6, 7.6, MID)
    oval(s, 11.35, 4.55, 3.15, 3.15, RGBColor(0x23, 0x4A, 0x2E))
    add_text(s, 0.85, 2.15, 8.5, 1.35, "BukuHR", 84, WHITE, DISPLAY, bold=True)
    rect(s, 0.9, 3.62, 1.35, 0.035, PALE)
    add_text(s, 0.85, 3.9, 7.6, 0.7, "People, time, talent, and pay in one system.", 24, SOFT, SANS)
    page_mark(s, 1, PALE)
    notes(
        s,
        "Open with the company name, then say you will show the product rather than walk through a long deck. About one minute on the slides, then log in.\n\n"
        "Do not mention Australia, a module still in progress, or Malaysian statutory schemes. Do not name a competitor.",
    )

    # 2 The split
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    oval(s, -2.7, 4.55, 5.4, 5.4, SOFT)
    add_text(s, 0.85, 0.55, 11, 0.7, "The same work usually sits in different places.", 26, SECONDARY, SANS)
    words = [("Records", 0.85, 2.15), ("Leave", 7.15, 2.15), ("Rosters", 0.85, 4.35), ("Reviews", 7.15, 4.35)]
    for word, x, y in words:
        add_text(s, x, y, 5.2, 1.05, word, 60, DEEP, DISPLAY, bold=True)
        rect(s, x, y + 1.05, 0.62, 0.03, MID)
    page_mark(s, 2, MUTED)
    notes(s, "Do not name a competitor. Ask which of the four is the most painful, then start the live demo on that one if they answer immediately. Otherwise continue.")

    # 3 The path
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 6.3, 0.42, 6.2, 0.4, "Then we stay in the product.", 16, SECONDARY, SANS, align=PP_ALIGN.RIGHT)
    path = [("01", "People", 0.9, 1.2), ("02", "Time", 3.85, 2.5), ("03", "Talent", 6.55, 3.8), ("04", "Pay", 9.2, 5.1)]
    for num, word, x, y in path:
        add_text(s, x, y, 1.2, 0.3, num, 13, MID, SANS, bold=True, spacing=180)
        add_text(s, x, y + 0.32, 3.4, 0.95, word, 54, DEEP, DISPLAY, bold=True)
    page_mark(s, 3, MUTED)
    notes(s, "Say the four words and stop. The next slide is the list if they want it on screen. Otherwise click straight into the directory.")

    # 4 What exists
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.8, 0.42, 4, 0.3, "TODAY", 13, MID, SANS, bold=True, spacing=280)
    columns = [
        ("People", ["Directory", "Organisation", "Documents", "Checklists"]),
        ("Time", ["Leave", "Attendance", "Rosters", "Claims"]),
        ("Talent", ["Recruitment", "Performance", "Pulse", "Assets"]),
    ]
    for i, (title, items) in enumerate(columns):
        x = 0.8 + i * 4.15
        add_text(s, x, 1.05, 3.6, 0.6, title, 32, DEEP, DISPLAY, bold=True)
        rect(s, x, 1.72, 0.5, 0.025, MID)
        add_lines(
            s,
            x,
            1.95,
            3.6,
            2.4,
            [{"text": item, "size": 18, "color": SECONDARY, "before": 0, "after": 10} for item in items],
        )
    rect(s, 0, 5.2, 13.333, 2.3, DEEP)
    add_text(s, 0.8, 5.48, 2, 0.28, "PAY", 12, PALE, SANS, bold=True, spacing=280)
    pay_words = ["Runs", "Payslips", "Reports", "Analytics"]
    for i, word in enumerate(pay_words):
        add_text(s, 0.8 + i * 1.85, 5.85, 1.75, 0.5, word, 20, WHITE, DISPLAY)
    add_text(s, 8.7, 5.48, 3.5, 0.28, "CONNECT", 12, PALE, SANS, bold=True, spacing=280)
    add_text(s, 8.7, 5.85, 2, 0.5, "API", 20, WHITE, DISPLAY)
    add_text(s, 10.5, 5.85, 2.2, 0.5, "Webhooks", 20, WHITE, DISPLAY)
    page_mark(s, 4, PALE)
    notes(
        s,
        "Read the group names, not every word.\n\n"
        "If they ask about recruitment, open a requisition and the candidate pipeline.\n"
        "If they ask about performance, open a review cycle.\n"
        "If they ask about pay, open a pay run and a payslip only. Do not open statutory rules or year-end.\n\n"
        "If they ask what else: letters, announcements, overtime, an audit log, and manager approvals in one inbox.\n\n"
        "Left off this slide on purpose: public job ads, e-signature, a native app store app, learning courses, and multi-step approval chains.",
    )

    # 5 Drawn product frame
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    oval(s, 9.4, 4.6, 4.8, 4.8, SOFT)
    add_text(s, 0.75, 2.05, 5.2, 1.15, "One place.", 64, DEEP, DISPLAY, bold=True)
    add_text(s, 0.78, 3.4, 4.8, 0.9, "Clock. Directory. Hiring.", 20, SECONDARY, SANS)

    wx, wy, ww, wh = 6.05, 1.05, 6.5, 5.35
    round_rect(s, wx + 0.16, wy + 0.16, ww, wh, DEEP, radius=0.08)
    round_rect(s, wx, wy, ww, wh, WHITE, LINE, radius=0.08, line_pt=1.0)
    for i, color in enumerate((LINE, MID, DEEP)):
        oval(s, wx + 0.28 + i * 0.24, wy + 0.22, 0.13, 0.13, color)
    rect(s, wx + 0.22, wy + 0.52, ww - 0.44, 0.012, LINE)

    cx, cy, cw, ch = wx + 0.28, wy + 0.74, 1.95, 2.55
    round_rect(s, cx, cy, cw, ch, DEEP, radius=0.1)
    add_text(s, cx + 0.16, cy + 0.28, cw - 0.28, 0.25, "TODAY", 11, PALE, SANS, bold=True, spacing=160)
    add_text(s, cx + 0.14, cy + 0.7, cw - 0.24, 0.7, "09:19", 32, WHITE, DISPLAY, bold=True)
    round_rect(s, cx + 0.16, cy + 1.7, 1.35, 0.4, WHITE, radius=0.5)
    add_text(s, cx + 0.16, cy + 1.78, 1.35, 0.28, "Clock in", 12, DEEP, SANS, bold=True, align=PP_ALIGN.CENTER)

    dx = wx + 2.45
    add_text(s, dx, cy + 0.08, 1.8, 0.32, "Directory", 14, DEEP, SANS, bold=True)
    for i in range(5):
        ry = cy + 0.58 + i * 0.68
        oval(s, dx, ry, 0.28, 0.28, SOFT)
        rect(s, dx + 0.42, ry + 0.04, 1.15 if i % 2 == 0 else 0.85, 0.07, BAR)
        rect(s, dx + 0.42, ry + 0.18, 0.7, 0.05, LINE)

    hx = wx + 4.45
    add_text(s, hx, cy + 0.08, 1.8, 0.32, "Hiring", 14, DEEP, SANS, bold=True)
    stages = [("New", 3), ("Talk", 2), ("Offer", 1)]
    for i, (label, count) in enumerate(stages):
        sx = hx + i * 0.64
        add_text(s, sx, cy + 0.52, 0.6, 0.24, label, 10, SECONDARY, SANS)
        for n in range(count):
            round_rect(s, sx, cy + 0.88 + n * 0.48, 0.52, 0.34, SOFT, radius=0.2)
    page_mark(s, 5, MUTED)
    notes(
        s,
        "This frame is a drawing, not a customer screen. No names and no pay figures.\n\n"
        "Use it only to show the shape of the product, then go live.",
    )

    # 6 Who uses it
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    rect(s, 0, 0, 0.16, 7.5, DEEP)
    roles = [
        ("Employee", "Leave, attendance, payslips, documents, reviews"),
        ("Manager", "Approvals and their team"),
        ("HR", "People, time, talent, pay, and reports"),
        ("Branch admin", "Their branch"),
        ("Director", "Reports and a payroll view"),
    ]
    for i, (role, does) in enumerate(roles):
        y = 0.55 + i * 1.28
        add_text(s, 0.7, y, 4.3, 0.6, role, 32, DEEP, DISPLAY, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        add_text(s, 5.3, y, 7.2, 0.6, does, 18, SECONDARY, SANS, anchor=MSO_ANCHOR.MIDDLE)
        if i < len(roles) - 1:
            rect(s, 0.7, y + 0.85, 11.8, 0.012, LINE)
    page_mark(s, 6, MUTED)
    notes(s, "Most demos only need Employee, Manager, and HR. Mention branch admin and director if the company has more than one site.")

    # 7 Handoff
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    oval(s, -3.1, 4.15, 6.4, 6.4, MID)
    add_text(s, 0.9, 1.85, 10, 0.5, "I’ll show this in", 24, PALE, SANS)
    add_text(s, 0.85, 2.4, 11, 1.25, "BukuHR now.", 68, WHITE, DISPLAY, bold=True)
    rect(s, 0.9, 3.85, 1.35, 0.035, PALE)
    add_text(s, 0.9, 4.15, 8, 0.5, "We start with the employee directory.", 22, SOFT, SANS)
    page_mark(s, 7, PALE)
    notes(
        s,
        "Share the screen and log in as HR.\n\n"
        "Suggested order: directory, one employee, leave, attendance or a roster, recruitment, performance, then a pay run and a payslip. Stop wherever they lean in.\n\n"
        "Do not open statutory rules or year-end.\n\n"
        "Only if they ask price. SaaS, before tax, for the first 10 employees: Core RM 69, Professional RM 249, Enterprise RM 449 a month. Extra employees are billed on top.\n"
        "Core is people, leave, attendance, documents, policies, and announcements.\n"
        "Professional adds payroll, overtime, claims, GPS clock-in, assets, and performance.\n"
        "Enterprise adds recruitment, analytics, the audit log, and the API.",
    )

    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
