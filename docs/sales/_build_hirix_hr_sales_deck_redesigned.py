"""Hirix HR sales deck — professional redesign. Content preserved; layouts art-directed."""

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

# Brand system (original greens preserved)
DEEP = RGBColor(0x1B, 0x3A, 0x28)
MID = RGBColor(0x2D, 0x5E, 0x3A)
ACCENT = RGBColor(0x3D, 0x7A, 0x4F)
CREAM = RGBColor(0xF7, 0xF5, 0xF0)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
INK = RGBColor(0x1A, 0x1F, 0x1C)
SECONDARY = RGBColor(0x4A, 0x5C, 0x52)
MUTED = RGBColor(0x6B, 0x7A, 0x72)
SOFT = RGBColor(0xE8, 0xEF, 0xEA)
LINE = RGBColor(0xD8, 0xD4, 0xCA)
PALE = RGBColor(0xB5, 0xCB, 0xBA)
MIST = RGBColor(0xF0, 0xF4, 0xF1)

DISPLAY = "Avenir Next"
SANS = "Helvetica Neue"
OUT = "/Users/intanlyeanna/Documents/Kerja Kerja Asyraf/BukuHR System/docs/sales/hirix-hr-sales-deck_REDESIGNED.pptx"

# Consistent margins (inches)
ML = 0.75
MR = 0.75
MT = 0.55
CONTENT_W = 13.333 - ML - MR

QUIET = (
    "Do not name competitors or put prices on screen. "
    "Do not promise public jobs boards, native apps, SSO, LMS, or a workflow builder. "
    "Brand on slides is Hirix HR only."
)


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


def add_text(
    slide,
    l,
    t,
    w,
    h,
    text,
    size,
    color,
    font=SANS,
    bold=False,
    align=PP_ALIGN.LEFT,
    anchor=MSO_ANCHOR.TOP,
    spacing=None,
):
    box = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    for m in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, m, Emu(0))
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
    for m in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, m, Emu(0))
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
            line.get("size", 16),
            line.get("color", INK),
            line.get("font", SANS),
            line.get("bold", False),
            line.get("spacing"),
        )
    return box


def shape(slide, kind, l, t, w, h, fill, line=None, line_pt=1.0):
    sh = slide.shapes.add_shape(kind, Inches(l), Inches(t), Inches(w), Inches(h))
    sh.fill.solid()
    sh.fill.fore_color.rgb = fill
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line
        sh.line.width = Pt(line_pt)
    sp_pr = sh._element.spPr
    effect = sp_pr.find(qn("a:effectLst"))
    if effect is not None:
        sp_pr.remove(effect)
    return sh


def rect(slide, l, t, w, h, fill, line=None):
    return shape(slide, MSO_SHAPE.RECTANGLE, l, t, w, h, fill, line)


def rounded(slide, l, t, w, h, fill, line=None, radius=0.08):
    sh = shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h, fill, line)
    try:
        sh.adjustments[0] = radius
    except Exception:
        pass
    return sh


def set_bg(slide, color):
    f = slide.background.fill
    f.solid()
    f.fore_color.rgb = color


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def page_mark(slide, n, total=13, on_dark=False):
    color = PALE if on_dark else MUTED
    add_text(
        slide,
        11.6,
        7.05,
        1.4,
        0.28,
        f"{n:02d} / {total:02d}",
        11,
        color,
        SANS,
        align=PP_ALIGN.RIGHT,
    )


def eyebrow(slide, l, t, text, color=MID):
    add_text(slide, l, t, 6, 0.28, text.upper(), 11, color, SANS, bold=True, spacing=220)


def hairline(slide, l, t, w, color=LINE):
    rect(slide, l, t, w, 0.01, color)


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    prs.core_properties.title = "Hirix HR — Sales Deck (Redesigned)"
    prs.core_properties.subject = "Professional redesign — content preserved"
    blank = prs.slide_layouts[6]

    # ─── 01 COVER (editorial dark) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    rect(s, 9.6, 0, 3.733, 7.5, MID)
    rect(s, 9.6, 0, 0.08, 7.5, ACCENT)
    add_text(s, ML, 1.55, 8.2, 0.35, "HIRIX HR", 14, PALE, SANS, bold=True, spacing=320)
    add_lines(
        s,
        ML,
        2.15,
        8.3,
        2.2,
        [
            {"text": "People, time, talent,", "size": 40, "color": WHITE, "font": DISPLAY, "bold": True, "after": 2},
            {"text": "and pay — one login.", "size": 40, "color": WHITE, "font": DISPLAY, "bold": True},
        ],
    )
    hairline(s, ML, 4.55, 2.0, ACCENT)
    add_text(s, ML, 4.85, 7.5, 0.4, "HR that runs with your team", 18, SOFT, SANS)
    add_text(s, ML, 6.55, 7, 0.35, "Client presentation", 13, PALE, SANS)
    add_text(s, 10.0, 3.1, 2.9, 1.4, "Hirix\nHR", 36, WHITE, DISPLAY, bold=True, align=PP_ALIGN.CENTER)
    page_mark(s, 1, on_dark=True)
    notes(
        s,
        "Open with Hirix HR. This deck is ~10–12 minutes, then a live demo.\n\n" + QUIET,
    )

    # ─── 02 PROBLEM (large-word grid, not cards) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    eyebrow(s, ML, MT, "The problem")
    add_text(
        s,
        ML,
        1.0,
        11.5,
        0.7,
        "The same work usually sits in different places.",
        32,
        INK,
        DISPLAY,
        bold=True,
    )
    problems = [
        ("01", "Records", "Scattered employee files and profiles"),
        ("02", "Leave", "Requests trapped in email and chat"),
        ("03", "Attendance", "Timesheets and rosters out of sync"),
        ("04", "Approvals & pay", "Decisions and payslips in separate tools"),
    ]
    for i, (num, title, sub) in enumerate(problems):
        col, row = i % 2, i // 2
        x = ML + col * 6.1
        y = 2.15 + row * 2.15
        hairline(s, x, y, 5.5, LINE)
        add_text(s, x, y + 0.25, 1.0, 0.3, num, 12, MID, SANS, bold=True, spacing=100)
        add_text(s, x, y + 0.65, 5.4, 0.55, title, 28, INK, DISPLAY, bold=True)
        add_text(s, x, y + 1.25, 5.4, 0.4, sub, 15, SECONDARY, SANS)
    page_mark(s, 2)
    notes(s, "Ask which of the four hurts most. Start the demo there.\n\n" + QUIET)

    # ─── 03 SOLUTION (split screen) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    rect(s, 0, 0, 5.4, 7.5, DEEP)
    eyebrow(s, 0.7, 1.9, "The answer", color=PALE)
    add_lines(
        s,
        0.65,
        2.4,
        4.3,
        1.8,
        [
            {"text": "One place", "size": 36, "color": WHITE, "font": DISPLAY, "bold": True, "after": 0},
            {"text": "for that work.", "size": 36, "color": WHITE, "font": DISPLAY, "bold": True},
        ],
    )
    add_text(
        s,
        0.7,
        4.6,
        4.2,
        1.4,
        "Employee, manager, and HR already share the same Hirix HR login.",
        16,
        SOFT,
        SANS,
    )
    pillars = [
        ("People", "Who works here"),
        ("Time", "Leave, attendance, rosters"),
        ("Talent", "Hiring, reviews, pulse"),
        ("Pay", "Runs and payslips"),
    ]
    for i, (title, sub) in enumerate(pillars):
        y = 0.85 + i * 1.5
        add_text(s, 6.0, y, 6.5, 0.5, title, 28, INK, DISPLAY, bold=True)
        add_text(s, 6.0, y + 0.5, 6.5, 0.35, sub, 16, SECONDARY, SANS)
        if i < 3:
            hairline(s, 6.0, y + 1.15, 6.3, LINE)
    page_mark(s, 3)
    notes(s, "Read the four pillars. Do not open a feature laundry list yet.\n\n" + QUIET)

    # ─── 04 WHO USES IT (horizontal role bands) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    eyebrow(s, ML, MT, "Who uses it")
    add_text(s, ML, 1.0, 11, 0.6, "Three portals. One company.", 34, INK, DISPLAY, bold=True)
    roles = [
        ("Employee", "Their leave, time, documents, payslip, and reviews", DEEP),
        ("Manager", "One approvals inbox, plus their team views", MID),
        ("HR", "People, time, talent, pay, and the organisation", ACCENT),
    ]
    for i, (role, desc, bar) in enumerate(roles):
        y = 2.0 + i * 1.5
        rect(s, ML, y, 0.12, 1.2, bar)
        rect(s, ML + 0.12, y, 11.7, 1.2, WHITE)
        hairline(s, ML + 0.12, y, 11.7, LINE)
        hairline(s, ML + 0.12, y + 1.19, 11.7, LINE)
        add_text(s, 1.2, y + 0.25, 3.5, 0.7, role, 26, INK, DISPLAY, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        add_text(s, 5.0, y + 0.25, 7.2, 0.7, desc, 17, SECONDARY, SANS, anchor=MSO_ANCHOR.MIDDLE)
    page_mark(s, 4)
    notes(
        s,
        "Most conversations only need these three. Branch admin and director exist for multi-site "
        "or leadership reporting — mention only if relevant.\n\n" + QUIET,
    )

    # ─── 05 PEOPLE (2×3 editorial list) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    eyebrow(s, ML, MT, "People")
    add_text(s, ML, 1.0, 10, 0.55, "Who works here.", 34, INK, DISPLAY, bold=True)
    people = [
        ("Directory", "Every person, in one list"),
        ("Organisation", "Branches, departments, managers"),
        ("Documents", "Files staff can open themselves"),
        ("Policies", "Publish, acknowledge, re-ack on new versions"),
        ("Checklists", "When someone joins or leaves"),
        ("Letters & news", "Templates, announcements, calendar"),
    ]
    for i, (title, sub) in enumerate(people):
        col, row = i % 2, i // 2
        x = ML + col * 6.15
        y = 1.95 + row * 1.55
        add_text(s, x, y, 5.7, 0.45, title, 22, INK, DISPLAY, bold=True)
        add_text(s, x, y + 0.5, 5.5, 0.4, sub, 15, SECONDARY, SANS)
        hairline(s, x, y + 1.1, 5.5, LINE)
    page_mark(s, 5)
    notes(
        s,
        "Demo: directory → one person → documents or checklist. Letters are merge templates, not e-sign.\n\n"
        + QUIET,
    )

    # ─── 06 TIME (numbered columns) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    rect(s, 0, 0, 0.14, 7.5, DEEP)
    eyebrow(s, ML, MT, "Time")
    add_text(s, ML, 1.0, 11, 0.55, "Asked for, then approved.", 34, INK, DISPLAY, bold=True)
    time_items = [
        ("01", "Leave", "Balances, half-day, attachments"),
        ("02", "Attendance", "Clock in/out, timesheet matrix"),
        ("03", "Rosters", "Shifts, grace, workplace boundary"),
        ("04", "Claims", "Receipt and manager review"),
        ("05", "Overtime", "Request and approve"),
        ("06", "Replacement", "Weekend/holiday credit as leave"),
    ]
    for i, (num, title, sub) in enumerate(time_items):
        col, row = i % 3, i // 3
        x = ML + col * 4.05
        y = 2.1 + row * 2.25
        add_text(s, x, y, 1.2, 0.3, num, 13, MID, SANS, bold=True, spacing=140)
        add_text(s, x, y + 0.4, 3.7, 0.5, title, 24, INK, DISPLAY, bold=True)
        add_text(s, x, y + 1.0, 3.6, 0.55, sub, 14, SECONDARY, SANS)
    page_mark(s, 6)
    notes(
        s,
        "Manager works from one inbox. Do not promise a workflow builder or native apps.\n\n" + QUIET,
    )

    # ─── 07 APPROVALS (statement + four rows) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    eyebrow(s, ML, MT, "Approvals")
    add_text(
        s,
        ML,
        1.0,
        11.5,
        0.7,
        "Managers clear work in one inbox.",
        32,
        INK,
        DISPLAY,
        bold=True,
    )
    points = [
        ("One inbox", "Leave, claims, attendance, overtime, replacement credit"),
        ("Team visibility", "Managers still see their people’s requests after action upstream"),
        ("Clear decisions", "Approve or reject with a note the employee can read"),
        ("Less chase", "Staff submit once; managers act; HR sees the organisation"),
    ]
    for i, (title, body) in enumerate(points):
        y = 2.05 + i * 1.1
        rect(s, ML, y, 0.08, 0.85, MID if i % 2 == 0 else ACCENT)
        add_text(s, 1.15, y + 0.1, 3.6, 0.65, title, 20, INK, DISPLAY, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        add_text(s, 5.0, y + 0.1, 7.5, 0.65, body, 16, SECONDARY, SANS, anchor=MSO_ANCHOR.MIDDLE)
        if i < 3:
            hairline(s, 1.15, y + 0.95, 11.3, LINE)
    page_mark(s, 7)
    notes(
        s,
        "Demo Approvals after a leave/claim. Do not oversell timeout escalation as a workflow product.\n\n"
        + QUIET,
    )

    # ─── 08 TALENT (2×2 editorial panels — light, not heavy cards) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    eyebrow(s, ML, MT, "Talent")
    add_text(s, ML, 0.95, 10, 0.45, "Hire, review, listen, equip.", 28, INK, DISPLAY, bold=True)
    talent = [
        ("Recruitment", "Requisitions, pipeline, offer letter, confirm hire."),
        ("Performance", "Cycles, self-appraisal, manager review, KPIs."),
        ("Pulse", "Short surveys the team can answer."),
        ("Assets", "Equipment on a person’s name."),
    ]
    for i, (title, body) in enumerate(talent):
        col, row = i % 2, i // 2
        x = ML + col * 6.15
        y = 1.85 + row * 2.4
        rect(s, x, y, 5.85, 2.1, MIST if (i % 2 == row % 2) else WHITE)
        hairline(s, x, y, 5.85, LINE)
        hairline(s, x, y + 2.09, 5.85, LINE)
        add_text(s, x + 0.4, y + 0.4, 5.0, 0.5, title, 24, INK, DISPLAY, bold=True)
        add_text(s, x + 0.4, y + 1.05, 5.0, 0.7, body, 16, SECONDARY, SANS)
    page_mark(s, 8)
    notes(
        s,
        "Recruitment is an internal hiring desk — not a public careers site. Signed file upload ≠ e-sign.\n\n"
        + QUIET,
    )

    # ─── 09 PAY (full-bleed dark, large statement) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    rect(s, 0, 6.35, 13.333, 1.15, MID)
    eyebrow(s, ML, 0.7, "Pay & records", color=PALE)
    add_text(s, ML, 1.35, 11, 0.9, "Prepared here.", 48, WHITE, DISPLAY, bold=True)
    add_text(
        s,
        ML,
        2.45,
        10.5,
        0.7,
        "Pay runs, payslips staff open themselves, reports, and an audit trail.",
        18,
        SOFT,
        SANS,
    )
    for i, label in enumerate(("Pay runs", "Payslips", "Reports", "Audit")):
        x = ML + i * 3.05
        add_text(s, x, 4.0, 2.8, 0.3, f"{i + 1:02d}", 12, PALE, SANS, bold=True, spacing=120)
        add_text(s, x, 4.4, 2.8, 0.55, label, 24, WHITE, DISPLAY, bold=True)
    add_text(
        s,
        ML,
        6.65,
        11.5,
        0.45,
        "Show a run and a payslip in the live product — keep statutory form codes off this slide.",
        13,
        SOFT,
        SANS,
    )
    page_mark(s, 9, on_dark=True)
    notes(
        s,
        "Pay run + payslip only if they ask. Do not claim award engines or foreign payroll filing.\n\n" + QUIET,
    )

    # ─── 10 JOURNEY (process timeline) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    eyebrow(s, ML, MT, "Day in the life")
    add_text(s, ML, 1.0, 11, 0.55, "From hire to payslip.", 34, INK, DISPLAY, bold=True)
    steps = [
        ("01", "Hire", "HR creates the person"),
        ("02", "Activate", "Staff set a password"),
        ("03", "Request", "Leave or claim submitted"),
        ("04", "Approve", "Manager clears the inbox"),
        ("05", "Pay", "Run locked, payslip ready"),
    ]
    # connector line
    rect(s, 1.35, 3.15, 10.6, 0.02, LINE)
    for i, (num, title, sub) in enumerate(steps):
        x = 0.55 + i * 2.5
        shape(s, MSO_SHAPE.OVAL, x + 0.85, 2.95, 0.42, 0.42, DEEP if i % 2 == 0 else MID)
        add_text(s, x, 3.65, 2.3, 0.3, num, 12, MID, SANS, bold=True, align=PP_ALIGN.CENTER, spacing=100)
        add_text(s, x, 4.05, 2.3, 0.45, title, 20, INK, DISPLAY, bold=True, align=PP_ALIGN.CENTER)
        add_text(s, x, 4.6, 2.3, 0.7, sub, 13, SECONDARY, SANS, align=PP_ALIGN.CENTER)
    page_mark(s, 10)
    notes(s, "Narrate the journey, then open the product at the step they care about.\n\n" + QUIET)

    # ─── 11 WHY (large left title + proof list) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    rect(s, 0, 0, 4.6, 7.5, DEEP)
    add_text(s, 0.65, 2.2, 3.5, 0.35, "WHY HIRIX HR", 12, PALE, SANS, bold=True, spacing=260)
    add_lines(
        s,
        0.6,
        2.75,
        3.6,
        2.2,
        [
            {"text": "Built to run,", "size": 30, "color": WHITE, "font": DISPLAY, "bold": True, "after": 2},
            {"text": "not only to", "size": 30, "color": WHITE, "font": DISPLAY, "bold": True, "after": 2},
            {"text": "present.", "size": 30, "color": WHITE, "font": DISPLAY, "bold": True},
        ],
    )
    why = [
        ("One system", "People, time, talent, and pay share the same record"),
        ("Role portals", "Employee, manager, and HR each get the right surface"),
        ("Live product", "Approvals, attendance matrix, reviews — usable today"),
        ("Team clarity", "Managers see their people; HR sees the organisation"),
        ("Ready for ops", "Documents, policies, calendar, reports, audit trail"),
    ]
    for i, (title, body) in enumerate(why):
        y = 0.7 + i * 1.2
        add_text(s, 5.15, y, 7.4, 0.4, title, 20, INK, DISPLAY, bold=True)
        add_text(s, 5.15, y + 0.4, 7.4, 0.4, body, 15, SECONDARY, SANS)
        if i < 4:
            hairline(s, 5.15, y + 0.95, 7.2, LINE)
    page_mark(s, 11)
    notes(s, "Keep this short. Move to the demo path.\n\n" + QUIET)

    # ─── 12 DEMO PATH (structured matrix) ───
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    eyebrow(s, ML, MT, "Demo path")
    add_text(s, ML, 1.0, 11, 0.55, "Tell us which one to open.", 32, INK, DISPLAY, bold=True)
    paths = [
        ("Records", "Directory, then one person"),
        ("Leave", "A request, then the manager inbox"),
        ("Attendance", "Matrix or roster, then clock-in"),
        ("Reviews", "A review cycle"),
        ("Hiring", "A requisition and the pipeline"),
        ("Pay", "A pay run, then a payslip"),
    ]
    for i, (title, body) in enumerate(paths):
        col, row = i % 3, i // 3
        x = ML + col * 4.05
        y = 2.05 + row * 2.25
        add_text(s, x, y, 3.7, 0.3, f"{i + 1:02d}", 12, MID, SANS, bold=True, spacing=120)
        add_text(s, x, y + 0.4, 3.7, 0.5, title, 22, INK, DISPLAY, bold=True)
        add_text(s, x, y + 1.0, 3.6, 0.55, body, 14, SECONDARY, SANS)
        hairline(s, x, y + 1.7, 3.5, LINE)
    page_mark(s, 12)
    notes(
        s,
        "Use the word from slide 2. Default: directory. Pay last — run + payslip only.\n\n" + QUIET,
    )

    # ─── 13 CLOSE ───
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    rect(s, 0, 0, 13.333, 0.12, ACCENT)
    add_text(s, ML, 1.6, 4, 0.35, "NEXT", 14, PALE, SANS, bold=True, spacing=280)
    add_lines(
        s,
        ML,
        2.2,
        11.5,
        1.8,
        [
            {"text": "Bring the one", "size": 44, "color": WHITE, "font": DISPLAY, "bold": True, "after": 2},
            {"text": "that hurts.", "size": 44, "color": WHITE, "font": DISPLAY, "bold": True},
        ],
    )
    hairline(s, ML, 4.4, 1.8, ACCENT)
    add_text(s, ML, 4.75, 10, 0.45, "We open it in Hirix HR.", 20, SOFT, SANS)
    add_text(s, ML, 5.4, 10, 0.4, "Continue to a live demo or discovery call.", 16, PALE, SANS)
    page_mark(s, 13, on_dark=True)
    notes(
        s,
        "Share screen. Start where they leaned in. No price table on this slide.\n\n" + QUIET,
    )

    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
