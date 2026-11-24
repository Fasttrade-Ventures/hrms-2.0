"""BukuHR client sales deck. Sell only what is live. No statutory names."""

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
OUT = "/Users/intanlyeanna/Documents/Kerja Kerja Asyraf/BukuHR System/docs/sales/bukuhr-sales-deck.pptx"

QUIET = (
    "Do not name a competitor. Do not name a tax scheme, a bank, super, awards, "
    "or another payroll product. Do not say a country module is in progress. "
    "Do not promise multi-level approvals, a public jobs page, a learning system, "
    "a store app, e-signature, or single sign-on."
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
    prs.core_properties.title = "BukuHR sales deck"
    prs.core_properties.subject = "What to sell a client, from the live product"
    prs.core_properties.category = "Sales"
    blank = prs.slide_layouts[6]

    # 1 Cover
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    oval(s, 8.9, -2.55, 7.6, 7.6, MID)
    oval(s, 11.35, 4.55, 3.15, 3.15, HOVER)
    add_text(s, 0.85, 2.05, 8.5, 1.2, "BukuHR", 78, WHITE, DISPLAY, bold=True)
    rect(s, 0.9, 3.4, 1.35, 0.035, PALE)
    add_lines(
        s,
        0.85,
        3.68,
        8.2,
        1.2,
        [
            {"text": "People, time, talent, and pay", "size": 26, "color": SOFT, "after": 2},
            {"text": "in one system.", "size": 26, "color": SOFT},
        ],
    )
    page_mark(s, 1, PALE)
    notes(
        s,
        "Open with the name. This deck is the sell, about eight minutes, then the product.\n\n"
        + QUIET
        + "\n\nPrice stays off the screen. Only if they ask, and only after you know hosted or their own servers.",
    )

    # 2 The split
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    oval(s, -2.7, 4.55, 5.4, 5.4, SOFT)
    add_text(s, 0.85, 0.55, 11.2, 0.85, "The same work usually sits in different places.", 26, SECONDARY, SANS)
    for word, x, y in (("Records", 0.85, 2.2), ("Leave", 7.15, 2.2), ("Rosters", 0.85, 4.45), ("Reviews", 7.15, 4.45)):
        add_text(s, x, y, 5.2, 0.95, word, 54, DEEP, DISPLAY, bold=True)
        rect(s, x, y + 1.02, 0.62, 0.03, MID)
    page_mark(s, 2, MUTED)
    notes(s, "Ask which of the four is the most painful. Start the later demo there if they answer. " + QUIET)

    # 3 What we sell
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    rect(s, 0, 0, 5.15, 7.5, DEEP)
    oval(s, -2.4, -2.2, 4.2, 4.2, MID)
    add_text(s, 0.7, 1.85, 3.8, 0.35, "WHAT WE SELL", 13, PALE, SANS, bold=True, spacing=280)
    add_lines(
        s,
        0.65,
        2.35,
        4.1,
        1.7,
        [
            {"text": "One place", "size": 40, "color": WHITE, "font": DISPLAY, "bold": True, "after": 0},
            {"text": "for that work.", "size": 40, "color": WHITE, "font": DISPLAY, "bold": True},
        ],
    )
    add_text(s, 0.7, 4.55, 3.8, 1.2, "The employee, the manager, and HR already share it.", 18, SOFT, SANS)
    offers = [
        ("People", "Who works here"),
        ("Time", "Leave, attendance, rosters"),
        ("Talent", "Hiring, reviews, pulse"),
        ("Pay", "Runs and payslips"),
    ]
    for i, (word, line) in enumerate(offers):
        y = 0.85 + i * 1.5
        add_text(s, 5.7, y, 6.8, 0.6, word, 32, DEEP, DISPLAY, bold=True)
        add_text(s, 5.7, y + 0.58, 6.8, 0.35, line, 16, SECONDARY, SANS)
        if i < 3:
            rect(s, 5.7, y + 1.15, 6.6, 0.012, LINE)
    page_mark(s, 3, MUTED)
    notes(
        s,
        "Read the four words. Do not open a feature list yet.\n\n"
        "People, leave, attendance, documents, policies, and announcements are in every package. "
        "Payroll, overtime, claims, rosters, assets, and performance are Professional. "
        "Recruitment, analytics, the audit log, and the API are Enterprise.\n\n"
        + QUIET,
    )

    # 4 People
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.85, 0.48, 4, 0.3, "PEOPLE", 13, MID, SANS, bold=True, spacing=280)
    add_text(s, 0.85, 0.9, 10, 0.7, "Who works here.", 40, DEEP, DISPLAY, bold=True)
    people = [
        ("Directory", "Every person, in one list"),
        ("Organisation", "Branches, departments, positions"),
        ("Documents", "Files they can open themselves"),
        ("Policies", "A version they acknowledge"),
        ("Checklists", "When someone joins or leaves"),
        ("Letters", "Templates HR sends"),
    ]
    for i, (word, line) in enumerate(people):
        col, row = divmod(i, 3)
        x = 0.85 + col * 6.15
        y = 2.15 + row * 1.5
        add_text(s, x, y, 5.6, 0.5, word, 28, DEEP, DISPLAY, bold=True)
        add_text(s, x, y + 0.52, 5.4, 0.4, line, 16, SECONDARY, SANS)
    page_mark(s, 4, MUTED)
    notes(
        s,
        "This is the record. If they lean in, the demo opens the directory, then one person, then documents or a checklist.\n\n"
        "Checklists cover joining and leaving. There is no pre-day-one pack and no contract signature.\n\n"
        "Letters are templates. Do not call them e-sign.\n\n"
        + QUIET,
    )

    # 5 Time
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    rect(s, 0, 0, 0.16, 7.5, DEEP)
    add_text(s, 0.7, 0.48, 4, 0.3, "TIME", 13, MID, SANS, bold=True, spacing=280)
    add_text(s, 0.7, 0.9, 11, 0.7, "Asked for, then approved.", 40, DEEP, DISPLAY, bold=True)
    time_items = [
        ("01", "Leave"),
        ("02", "Attendance"),
        ("03", "Rosters"),
        ("04", "Claims"),
        ("05", "Overtime"),
        ("06", "Timesheets"),
    ]
    for i, (num, word) in enumerate(time_items):
        col = i % 3
        row = i // 3
        x = 0.7 + col * 4.15
        y = 2.35 + row * 2.05
        add_text(s, x, y, 1.2, 0.28, num, 13, MID, SANS, bold=True, spacing=160)
        add_text(s, x, y + 0.32, 3.8, 0.7, word, 32, DEEP, DISPLAY, bold=True)
    page_mark(s, 5, MUTED)
    notes(
        s,
        "The manager works from one inbox: leave, attendance, claims, overtime. It is one approver. "
        "Do not say multi-level, custom chains, or escalation.\n\n"
        "Clock-in can use a workplace boundary on Professional. Do not promise face capture. "
        "Do not promise an App Store or Play Store app. The employee uses the site.\n\n"
        "Rosters and blackout dates are Professional.\n\n"
        + QUIET,
    )

    # 6 Talent
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.8, 0.42, 4, 0.28, "TALENT", 13, MID, SANS, bold=True, spacing=280)
    talent = [
        ("Recruitment", "Requisitions and a candidate pipeline.", 0.8, 1.15),
        ("Performance", "Reviews and goals.", 6.95, 1.15),
        ("Pulse", "A short check on the team.", 0.8, 4.15),
        ("Assets", "Equipment on a person’s name.", 6.95, 4.15),
    ]
    for word, line, x, y in talent:
        add_text(s, x, y, 5.4, 0.7, word, 36, DEEP, DISPLAY, bold=True)
        rect(s, x, y + 0.82, 0.55, 0.028, MID)
        add_text(s, x, y + 1.05, 5.2, 0.7, line, 18, SECONDARY, SANS)
    rect(s, 6.55, 1.35, 0.012, 4.7, LINE)
    rect(s, 0.8, 3.85, 11.7, 0.012, LINE)
    page_mark(s, 6, MUTED)
    notes(
        s,
        "Recruitment is the internal hiring desk: a requisition, candidates, and an offer letter. "
        "It is not a public jobs site.\n\n"
        "Performance, pulse, and assets are Professional. Recruitment is Enterprise.\n\n"
        "If they ask about hiring, open a requisition and the pipeline. If they ask about reviews, open a cycle.\n\n"
        + QUIET,
    )

    # 7 Pay
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    oval(s, -3.2, -2.8, 6.2, 6.2, MID)
    add_text(s, 0.85, 0.55, 3, 0.3, "PAY", 13, PALE, SANS, bold=True, spacing=280)
    add_text(s, 0.8, 1.15, 11, 1.15, "Prepared here.", 60, WHITE, DISPLAY, bold=True)
    add_text(s, 0.85, 2.5, 9, 0.55, "The employee opens their own payslip.", 22, SOFT, SANS)
    for i, word in enumerate(("Pay runs", "Payslips", "Reports")):
        x = 0.85 + i * 4.0
        add_text(s, x, 4.15, 3.5, 0.35, f"0{i + 1}", 13, PALE, SANS, bold=True, spacing=140)
        add_text(s, x, 4.5, 3.6, 0.7, word, 32, WHITE, DISPLAY, bold=True)
    page_mark(s, 7, PALE)
    notes(
        s,
        "Show a pay run and a payslip only if they ask. Do not open statutory rules or year-end.\n\n"
        "Say the run and the payslip are prepared in BukuHR. Do not claim tax, super, or award calculation. "
        "Do not name a file format or another payroll product unless they name it first, and even then do not over-claim.\n\n"
        "Reports are in the product. Analytics and the audit log are Enterprise.\n\n"
        + QUIET,
    )

    # 8 Who
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.75, 0.4, 8, 0.55, "Five logins. One company.", 28, DEEP, DISPLAY, bold=True)
    roles = [
        ("Employee", "Leave, time, documents, payslip"),
        ("Manager", "One inbox, and their team"),
        ("HR", "People, time, talent, pay, reports"),
        ("Branch admin", "The site they are responsible for"),
        ("Director", "Reports, without the day-to-day"),
    ]
    for i, (role, does) in enumerate(roles):
        y = 1.25 + i * 1.08
        add_text(s, 0.75, y, 4.4, 0.7, role, 26, DEEP, DISPLAY, bold=True, anchor=MSO_ANCHOR.MIDDLE)
        add_text(s, 5.4, y, 7.1, 0.7, does, 18, SECONDARY, SANS, anchor=MSO_ANCHOR.MIDDLE)
        if i < len(roles) - 1:
            rect(s, 0.75, y + 0.78, 11.8, 0.012, LINE)
    page_mark(s, 8, MUTED)
    notes(
        s,
        "Most conversations only need Employee, Manager, and HR. Mention branch admin and director when there is more than one site.\n\n"
        "Announcements live in the same login. Mention them only if internal news comes up.\n\n"
        + QUIET,
    )

    # 9 Where to start
    s = prs.slides.add_slide(blank)
    set_bg(s, CREAM)
    add_text(s, 0.85, 0.42, 8, 0.3, "WHERE WE START", 13, MID, SANS, bold=True, spacing=240)
    add_text(s, 0.85, 0.82, 10, 0.65, "Tell us which one.", 36, DEEP, DISPLAY, bold=True)
    paths = [
        ("Records", "Directory, then one person"),
        ("Leave", "A request, then the manager inbox"),
        ("Rosters", "The roster, then clock-in"),
        ("Reviews", "A review cycle"),
        ("Hiring", "A requisition and the pipeline"),
        ("Pay", "A pay run, then a payslip"),
    ]
    for i, (word, line) in enumerate(paths):
        x = 0.85 + (i % 2) * 6.2
        y = 1.85 + (i // 2) * 1.6
        add_text(s, x, y, 5.5, 0.55, word, 28, DEEP, DISPLAY, bold=True)
        add_text(s, x, y + 0.58, 5.4, 0.4, line, 16, SECONDARY, SANS)
    page_mark(s, 9, MUTED)
    notes(
        s,
        "Use the word they used on slide 2. If they did not pick, go to the directory.\n\n"
        "Pay is last, and only the run and the payslip.\n\n"
        + QUIET,
    )

    # 10 Close
    s = prs.slides.add_slide(blank)
    set_bg(s, DEEP)
    oval(s, -3.1, 4.15, 6.4, 6.4, MID)
    add_text(s, 0.9, 1.45, 11, 0.4, "Next", 22, PALE, SANS)
    add_lines(
        s,
        0.85,
        2.35,
        11.5,
        2.1,
        [
            {"text": "Bring the one", "size": 54, "color": WHITE, "font": DISPLAY, "bold": True, "after": 0},
            {"text": "that hurts.", "size": 54, "color": WHITE, "font": DISPLAY, "bold": True},
        ],
    )
    rect(s, 0.9, 5.05, 1.35, 0.035, PALE)
    add_text(s, 0.9, 5.3, 9, 0.5, "We open it in BukuHR.", 22, SOFT, SANS)
    page_mark(s, 10, PALE)
    notes(
        s,
        "Stop talking and share the screen. Log in as HR. Start where they leaned in, otherwise the directory.\n\n"
        "Suggested order if they want the whole tour: directory, one employee, leave, attendance or a roster, "
        "recruitment, performance, then a pay run and a payslip.\n\n"
        "Price only if they ask. Hosted, before tax, first 10 people: Core RM 69, Professional RM 249, "
        "Enterprise RM 449 a month. Extra people are billed on top. "
        "Their own servers: RM 5,000 setup, then a yearly license, never below the package minimum. "
        "Do not put the table on screen unless they ask for a number. These figures are ringgit.\n\n"
        "Core is people, leave, attendance, documents, policies, and announcements.\n"
        "Professional adds payroll, overtime, claims, GPS clock-in, assets, and performance.\n"
        "Enterprise adds recruitment, analytics, the audit log, and the API.\n\n"
        + QUIET,
    )

    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
