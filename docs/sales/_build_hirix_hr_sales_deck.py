"""Hirix HR client sales deck. Deck brand only — product truth matches live HRMS. No prices on slides."""

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
HOVER = RGBColor(0x23, 0x4A, 0x2E)

DISPLAY = "Georgia"
SANS = "Calibri"
OUT = "/Users/intanlyeanna/Documents/Kerja Kerja Asyraf/BukuHR System/docs/sales/hirix-hr-sales-deck.pptx"

QUIET = (
    "Do not name a competitor. Do not put prices on screen. "
    "Do not promise a public jobs site, native store apps, SSO, a learning system, "
    "built-in e-signature, or a full workflow builder. "
    "Do not invent modules. Brand on slides is Hirix HR only."
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


def oval(slide, l, t, w, h, fill):
    return add_shape(slide, MSO_SHAPE.OVAL, l, t, w, h, fill)


def set_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def page_mark(slide, n, color):
    add_text(slide, 12.15, 7.08, 0.7, 0.24, f"{n:02d}", 12, color, SANS, align=PP_ALIGN.RIGHT)


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    prs.core_properties.title = "Hirix HR sales deck"
    prs.core_properties.subject = "Client sales deck — people, time, talent, pay"
    prs.core_properties.category = "Sales"
    blank = prs.slide_layouts[6]

    # 01 Title
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    oval(s, 8.9, -2.55, 7.6, 7.6, MID)
    oval(s, 11.35, 4.55, 3.15, 3.15, HOVER)
    add_text(s, 0.85, 1.95, 9.5, 1.1, "Hirix HR", 72, WHITE, DISPLAY, bold=True)
    rect(s, 0.9, 3.25, 1.35, 0.035, PALE)
    add_lines(
        s,
        0.85,
        3.55,
        8.5,
        1.4,
        [
            {"text": "People, time, talent, and pay", "size": 26, "color": SOFT, "after": 4},
            {"text": "— one login for your team.", "size": 26, "color": SOFT},
        ],
    )
    add_text(s, 0.85, 5.55, 8, 0.4, "HR that runs with your team", 16, PALE, SANS)
    page_mark(s, 1, PALE)
    notes(
        s,
        "Open with the name Hirix HR. This deck is ~10–12 minutes, then a live demo.\n\n"
        + QUIET
        + "\n\nKeep price off the screen unless they ask after the demo.",
    )

    # 02 Problem
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    oval(s, -2.7, 4.55, 5.4, 5.4, SOFT)
    add_text(s, 0.85, 0.5, 11, 0.35, "THE PROBLEM", 13, MID, SANS, bold=True, spacing=280)
    add_text(
        s,
        0.85,
        0.95,
        11.2,
        0.85,
        "The same work usually sits in different places.",
        28,
        DEEP,
        DISPLAY,
        bold=True,
    )
    for word, x, y in (
        ("Records", 0.85, 2.35),
        ("Leave", 7.15, 2.35),
        ("Attendance", 0.85, 4.55),
        ("Approvals & pay", 7.15, 4.55),
    ):
        add_text(s, x, y, 5.2, 0.85, word, 40, DEEP, DISPLAY, bold=True)
        rect(s, x, y + 0.95, 0.62, 0.03, MID)
    page_mark(s, 2, MUTED)
    notes(
        s,
        "Ask which of the four hurts most. Start the later demo there if they answer.\n\n" + QUIET,
    )

    # 03 Answer
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    rect(s, 0, 0, 5.15, 7.5, DEEP)
    oval(s, -2.4, -2.2, 4.2, 4.2, MID)
    add_text(s, 0.7, 1.7, 3.8, 0.35, "THE ANSWER", 13, PALE, SANS, bold=True, spacing=280)
    add_lines(
        s,
        0.65,
        2.2,
        4.1,
        1.8,
        [
            {"text": "One place", "size": 40, "color": WHITE, "font": DISPLAY, "bold": True, "after": 0},
            {"text": "for that work.", "size": 40, "color": WHITE, "font": DISPLAY, "bold": True},
        ],
    )
    add_text(
        s,
        0.7,
        4.45,
        3.8,
        1.3,
        "Employee, manager, and HR already share the same Hirix HR login.",
        17,
        SOFT,
        SANS,
    )
    offers = [
        ("People", "Who works here"),
        ("Time", "Leave, attendance, rosters"),
        ("Talent", "Hiring, reviews, pulse"),
        ("Pay", "Runs and payslips"),
    ]
    for i, (word, line) in enumerate(offers):
        y = 0.85 + i * 1.5
        add_text(s, 5.7, y, 6.8, 0.55, word, 30, DEEP, DISPLAY, bold=True)
        add_text(s, 5.7, y + 0.55, 6.8, 0.35, line, 16, SECONDARY, SANS)
        if i < 3:
            rect(s, 5.7, y + 1.15, 6.6, 0.012, LINE)
    page_mark(s, 3, MUTED)
    notes(
        s,
        "Read the four pillars. Do not open a feature laundry list yet.\n\n" + QUIET,
    )

    # 04 Who uses it
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.85, 0.45, 10, 0.3, "WHO USES IT", 13, MID, SANS, bold=True, spacing=280)
    add_text(s, 0.85, 0.9, 11, 0.65, "Three portals. One company.", 36, DEEP, DISPLAY, bold=True)
    roles = [
        ("Employee", "Their leave, time, documents, payslip, and reviews"),
        ("Manager", "One approvals inbox, plus their team views"),
        ("HR", "People, time, talent, pay, and the organisation"),
    ]
    for i, (role, does) in enumerate(roles):
        y = 2.0 + i * 1.45
        rect(s, 0.85, y, 11.6, 1.25, WHITE, LINE)
        add_text(s, 1.15, y + 0.28, 4.2, 0.7, role, 28, DEEP, DISPLAY, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        add_text(s, 5.5, y + 0.28, 6.5, 0.7, does, 18, SECONDARY, SANS, anchor=MSO_ANCHOR.MIDDLE)
    page_mark(s, 4, MUTED)
    notes(
        s,
        "Most conversations only need these three. Branch admin and director exist when there are multiple sites "
        "or leadership reporting — mention only if relevant.\n\n" + QUIET,
    )

    # 05 People
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.85, 0.45, 4, 0.3, "PEOPLE", 13, MID, SANS, bold=True, spacing=280)
    add_text(s, 0.85, 0.88, 10, 0.65, "Who works here.", 38, DEEP, DISPLAY, bold=True)
    people = [
        ("Directory", "Every person, in one list"),
        ("Organisation", "Branches, departments, managers"),
        ("Documents", "Files staff can open themselves"),
        ("Policies", "Publish, acknowledge, re-ack on new versions"),
        ("Checklists", "When someone joins or leaves"),
        ("Letters & news", "Templates, announcements, calendar"),
    ]
    for i, (word, line) in enumerate(people):
        col, row = divmod(i, 3)
        x = 0.85 + col * 6.15
        y = 2.05 + row * 1.5
        add_text(s, x, y, 5.6, 0.5, word, 26, DEEP, DISPLAY, bold=True)
        add_text(s, x, y + 0.5, 5.4, 0.45, line, 15, SECONDARY, SANS)
    page_mark(s, 5, MUTED)
    notes(
        s,
        "This is the record. Demo: directory → one person → documents or a checklist.\n"
        "Letters are templates with merge tags — not e-sign.\n\n" + QUIET,
    )

    # 06 Time
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    rect(s, 0, 0, 0.16, 7.5, DEEP)
    add_text(s, 0.7, 0.45, 4, 0.3, "TIME", 13, MID, SANS, bold=True, spacing=280)
    add_text(s, 0.7, 0.88, 11, 0.65, "Asked for, then approved.", 36, DEEP, DISPLAY, bold=True)
    time_items = [
        ("01", "Leave", "Balances, half-day, attachments"),
        ("02", "Attendance", "Clock in/out, timesheet matrix"),
        ("03", "Rosters", "Shifts, grace, workplace boundary"),
        ("04", "Claims", "Receipt and manager review"),
        ("05", "Overtime", "Request and approve"),
        ("06", "Replacement", "Weekend/holiday credit as leave"),
    ]
    for i, (num, word, line) in enumerate(time_items):
        col = i % 3
        row = i // 3
        x = 0.7 + col * 4.15
        y = 2.15 + row * 2.2
        add_text(s, x, y, 1.2, 0.28, num, 13, MID, SANS, bold=True, spacing=160)
        add_text(s, x, y + 0.32, 3.8, 0.55, word, 28, DEEP, DISPLAY, bold=True)
        add_text(s, x, y + 0.95, 3.7, 0.5, line, 14, SECONDARY, SANS)
    page_mark(s, 6, MUTED)
    notes(
        s,
        "Manager works from one inbox. Do not promise a drag-and-drop workflow builder.\n"
        "Do not lead with face capture or native apps. Employee uses the web app.\n\n" + QUIET,
    )

    # 07 Approvals
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.85, 0.45, 6, 0.3, "APPROVALS", 13, MID, SANS, bold=True, spacing=280)
    add_text(s, 0.85, 0.9, 11, 0.7, "Managers clear work in one inbox.", 34, DEEP, DISPLAY, bold=True)
    points = [
        ("One inbox", "Leave, claims, attendance, overtime, replacement credit"),
        ("Team visibility", "Managers still see their people’s requests after action upstream"),
        ("Clear decisions", "Approve or reject with a note the employee can read"),
        ("Less chase", "Staff submit once; managers act; HR sees the organisation"),
    ]
    for i, (word, line) in enumerate(points):
        y = 2.0 + i * 1.15
        add_text(s, 0.85, y, 4.5, 0.55, word, 24, DEEP, DISPLAY, bold=True)
        add_text(s, 5.5, y, 7.0, 0.7, line, 17, SECONDARY, SANS, anchor=MSO_ANCHOR.MIDDLE)
        if i < len(points) - 1:
            rect(s, 0.85, y + 0.85, 11.6, 0.012, LINE)
    page_mark(s, 7, MUTED)
    notes(
        s,
        "Demo the Approvals inbox after a leave or claim request.\n"
        "Do not claim a custom multi-step designer. Timeout escalation exists — do not oversell it as workflow automation.\n\n"
        + QUIET,
    )

    # 08 Talent
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.8, 0.42, 4, 0.28, "TALENT", 13, MID, SANS, bold=True, spacing=280)
    talent = [
        ("Recruitment", "Requisitions, pipeline, offer letter, confirm hire.", 0.8, 1.15),
        ("Performance", "Cycles, self-appraisal, manager review, KPIs.", 6.95, 1.15),
        ("Pulse", "Short surveys the team can answer.", 0.8, 4.15),
        ("Assets", "Equipment on a person’s name.", 6.95, 4.15),
    ]
    for word, line, x, y in talent:
        add_text(s, x, y, 5.4, 0.65, word, 32, DEEP, DISPLAY, bold=True)
        rect(s, x, y + 0.78, 0.55, 0.028, MID)
        add_text(s, x, y + 1.0, 5.2, 0.85, line, 17, SECONDARY, SANS)
    rect(s, 6.55, 1.35, 0.012, 4.7, LINE)
    rect(s, 0.8, 3.85, 11.7, 0.012, LINE)
    page_mark(s, 8, MUTED)
    notes(
        s,
        "Recruitment is an internal hiring desk — not a public careers site. "
        "Candidate can accept/reject and upload a signed file; no built-in e-sign.\n\n" + QUIET,
    )

    # 09 Pay
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    oval(s, -3.2, -2.8, 6.2, 6.2, MID)
    add_text(s, 0.85, 0.55, 3, 0.3, "PAY & RECORDS", 13, PALE, SANS, bold=True, spacing=280)
    add_text(s, 0.8, 1.15, 11, 1.0, "Prepared here.", 56, WHITE, DISPLAY, bold=True)
    add_text(
        s,
        0.85,
        2.4,
        10,
        0.55,
        "Pay runs, payslips staff open themselves, reports, and an audit trail.",
        20,
        SOFT,
        SANS,
    )
    for i, word in enumerate(("Pay runs", "Payslips", "Reports", "Audit")):
        x = 0.85 + i * 3.05
        add_text(s, x, 4.15, 2.9, 0.35, f"0{i + 1}", 13, PALE, SANS, bold=True, spacing=140)
        add_text(s, x, 4.5, 2.9, 0.7, word, 26, WHITE, DISPLAY, bold=True)
    page_mark(s, 9, PALE)
    notes(
        s,
        "Show a pay run and a payslip only if they ask. Keep statutory form codes off the slide "
        "unless the audience asks in the live demo.\n"
        "Do not claim award interpretation or another country’s payroll engine.\n\n" + QUIET,
    )

    # 10 Day in the life
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.85, 0.45, 8, 0.3, "DAY IN THE LIFE", 13, MID, SANS, bold=True, spacing=280)
    add_text(s, 0.85, 0.9, 11, 0.65, "From hire to payslip.", 36, DEEP, DISPLAY, bold=True)
    steps = [
        ("01", "Hire", "HR creates the person"),
        ("02", "Activate", "Staff set a password"),
        ("03", "Request", "Leave or claim submitted"),
        ("04", "Approve", "Manager clears the inbox"),
        ("05", "Pay", "Run locked, payslip ready"),
    ]
    for i, (num, word, line) in enumerate(steps):
        x = 0.7 + i * 2.5
        oval(s, x + 0.85, 2.35, 0.55, 0.55, MID if i % 2 == 0 else DEEP)
        add_text(s, x, 3.15, 2.3, 0.35, num, 13, MID, SANS, bold=True, spacing=120, align=PP_ALIGN.CENTER)
        add_text(s, x, 3.55, 2.3, 0.55, word, 22, DEEP, DISPLAY, bold=True, align=PP_ALIGN.CENTER)
        add_text(s, x, 4.2, 2.3, 0.7, line, 14, SECONDARY, SANS, align=PP_ALIGN.CENTER)
        if i < 4:
            rect(s, x + 2.15, 2.55, 0.55, 0.02, LINE)
    page_mark(s, 10, MUTED)
    notes(
        s,
        "Walk this journey verbally, then open the product at the step they care about.\n\n" + QUIET,
    )

    # 11 Why Hirix HR
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.85, 0.45, 8, 0.3, "WHY HIRIX HR", 13, MID, SANS, bold=True, spacing=280)
    add_text(s, 0.85, 0.9, 11, 0.65, "Built to run, not only to present.", 32, DEEP, DISPLAY, bold=True)
    why = [
        ("One system", "People, time, talent, and pay share the same record"),
        ("Role portals", "Employee, manager, and HR each get the right surface"),
        ("Live product", "Approvals, attendance matrix, reviews — usable today"),
        ("Team clarity", "Managers see their people; HR sees the organisation"),
        ("Ready for ops", "Documents, policies, calendar, reports, audit trail"),
    ]
    for i, (word, line) in enumerate(why):
        y = 1.85 + i * 0.95
        add_text(s, 0.85, y, 3.8, 0.55, word, 22, DEEP, DISPLAY, bold=True)
        add_text(s, 4.9, y, 7.5, 0.7, line, 17, SECONDARY, SANS, anchor=MSO_ANCHOR.MIDDLE)
    page_mark(s, 11, MUTED)
    notes(s, "Keep this short. Then move to the demo path.\n\n" + QUIET)

    # 12 Demo path
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.85, 0.42, 8, 0.3, "DEMO PATH", 13, MID, SANS, bold=True, spacing=240)
    add_text(s, 0.85, 0.82, 10, 0.6, "Tell us which one to open.", 34, DEEP, DISPLAY, bold=True)
    paths = [
        ("Records", "Directory, then one person"),
        ("Leave", "A request, then the manager inbox"),
        ("Attendance", "Matrix or roster, then clock-in"),
        ("Reviews", "A review cycle"),
        ("Hiring", "A requisition and the pipeline"),
        ("Pay", "A pay run, then a payslip"),
    ]
    for i, (word, line) in enumerate(paths):
        x = 0.85 + (i % 2) * 6.2
        y = 1.85 + (i // 2) * 1.55
        add_text(s, x, y, 5.5, 0.5, word, 26, DEEP, DISPLAY, bold=True)
        add_text(s, x, y + 0.55, 5.4, 0.4, line, 15, SECONDARY, SANS)
    page_mark(s, 12, MUTED)
    notes(
        s,
        "Use the word they used on slide 2. If they did not pick, start at the directory.\n"
        "Pay is last: run + payslip only.\n\n" + QUIET,
    )

    # 13 Next
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    oval(s, -3.1, 4.15, 6.4, 6.4, MID)
    add_text(s, 0.9, 1.35, 11, 0.4, "Next", 20, PALE, SANS)
    add_lines(
        s,
        0.85,
        2.15,
        11.5,
        2.0,
        [
            {"text": "Bring the one", "size": 50, "color": WHITE, "font": DISPLAY, "bold": True, "after": 0},
            {"text": "that hurts.", "size": 50, "color": WHITE, "font": DISPLAY, "bold": True},
        ],
    )
    rect(s, 0.9, 4.85, 1.35, 0.035, PALE)
    add_text(s, 0.9, 5.15, 10, 0.5, "We open it in Hirix HR.", 22, SOFT, SANS)
    add_text(s, 0.9, 5.85, 10, 0.4, "Continue to a live demo or discovery call.", 16, PALE, SANS)
    page_mark(s, 13, PALE)
    notes(
        s,
        "Stop talking and share the screen. Log in as HR. Start where they leaned in.\n"
        "Do not put a price table on this slide. If they ask for numbers, take it offline "
        "or after the demo with the commercial pack.\n\n" + QUIET,
    )

    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
