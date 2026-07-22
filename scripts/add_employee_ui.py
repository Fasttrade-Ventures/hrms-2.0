#!/usr/bin/env python3
"""Add remaining employee UI frames to pencil-new.pen"""
import copy
import json
import random
import string
from pathlib import Path

PEN_PATH = Path(__file__).resolve().parent.parent / "pencil-new.pen"


def gid():
    return "".join(random.choices(string.ascii_letters + string.digits, k=6))


def remap_ids(obj):
    if isinstance(obj, dict):
        if "id" in obj and isinstance(obj["id"], str):
            obj["id"] = gid()
        for v in obj.values():
            remap_ids(v)
    elif isinstance(obj, list):
        for item in obj:
            remap_ids(item)


def find_by_name(node, name):
    if isinstance(node, dict):
        if node.get("name") == name:
            return node
        for v in node.values():
            r = find_by_name(v, name)
            if r:
                return r
    elif isinstance(node, list):
        for item in node:
            r = find_by_name(item, name)
            if r:
                return r
    return None


def find_all_by_name(node, name, out=None):
    out = out or []
    if isinstance(node, dict):
        if node.get("name") == name:
            out.append(node)
        for v in node.values():
            find_all_by_name(v, name, out)
    elif isinstance(node, list):
        for item in node:
            find_all_by_name(item, name, out)
    return out


def set_tab_active(tabs_frame, active_name):
    for tab in tabs_frame.get("children", []):
        label = find_by_name(tab, tab.get("name"))
        texts = [c for c in tab.get("children", []) if c.get("type") == "text"]
        indicators = [c for c in tab.get("children", []) if c.get("name") == "Indicator"]
        is_active = tab.get("name") == active_name
        for t in texts:
            t["fill"] = "$accent.primary" if is_active else "$foreground.muted"
            t["fontWeight"] = "600" if is_active else "500"
        if is_active and not indicators:
            tab["children"].append(
                {
                    "type": "frame",
                    "id": gid(),
                    "name": "Indicator",
                    "width": "fill_container",
                    "height": 2,
                    "fill": "$accent.primary",
                    "cornerRadius": 2,
                }
            )
        elif not is_active:
            tab["children"] = [c for c in tab.get("children", []) if c.get("name") != "Indicator"]


def detail_row(label, value):
    rid = gid()
    return {
        "type": "frame",
        "id": rid,
        "width": "fill_container",
        "stroke": "$border.primary",
        "strokeWidth": {"bottom": 1},
        "padding": [6, 0],
        "justifyContent": "space_between",
        "children": [
            {
                "type": "text",
                "id": gid(),
                "fill": "$foreground.muted",
                "content": label,
                "fontFamily": "$font.body",
                "fontSize": 12,
                "fontWeight": "normal",
            },
            {
                "type": "text",
                "id": gid(),
                "fill": "$foreground.primary",
                "content": value,
                "fontFamily": "$font.body",
                "fontSize": 13,
                "fontWeight": "600",
            },
        ],
    }


def timeline_step(title, subtitle, done=False):
    return {
        "type": "frame",
        "id": gid(),
        "width": "fill_container",
        "layout": "horizontal",
        "gap": 10,
        "padding": [4, 0],
        "alignItems": "center",
        "children": [
            {
                "type": "frame",
                "id": gid(),
                "width": 10,
                "height": 10,
                "fill": "$success" if done else "$border.primary",
                "cornerRadius": 5,
            },
            {
                "type": "frame",
                "id": gid(),
                "width": "fill_container",
                "layout": "vertical",
                "gap": 2,
                "children": [
                    {
                        "type": "text",
                        "id": gid(),
                        "fill": "$foreground.primary",
                        "content": title,
                        "fontFamily": "$font.body",
                        "fontSize": 13,
                        "fontWeight": "600",
                    },
                    {
                        "type": "text",
                        "id": gid(),
                        "fill": "$foreground.muted",
                        "content": subtitle,
                        "fontFamily": "$font.body",
                        "fontSize": 12,
                        "fontWeight": "normal",
                    },
                ],
            },
        ],
    }


def build_detail_card(card_title, status, rows, attachment=None):
    children = [
        {
            "type": "frame",
            "id": gid(),
            "width": "fill_container",
            "justifyContent": "space_between",
            "alignItems": "center",
            "children": [
                {
                    "type": "text",
                    "id": gid(),
                    "fill": "$foreground.primary",
                    "content": card_title,
                    "fontFamily": "$font.heading",
                    "fontSize": 16,
                    "fontWeight": "600",
                },
                {
                    "id": gid(),
                    "type": "ref",
                    "ref": "R8C3bp",
                    "name": "Status",
                    "descendants": {"Vucqf": {"content": status}},
                },
            ],
        }
    ]
    for label, value in rows:
        children.append(detail_row(label, value))
    if attachment:
        children.append(
            {
                "type": "frame",
                "id": gid(),
                "name": "Attachment",
                "width": "fill_container",
                "fill": "$surface.muted",
                "cornerRadius": 10,
                "gap": 8,
                "padding": 10,
                "alignItems": "center",
                "children": [
                    {
                        "type": "icon",
                        "id": gid(),
                        "width": 16,
                        "height": 16,
                        "icon": "paperclip",
                        "library": "lucide",
                        "fill": "$foreground.muted",
                    },
                    {
                        "type": "text",
                        "id": gid(),
                        "fill": "$foreground.primary",
                        "content": attachment,
                        "fontFamily": "$font.body",
                        "fontSize": 13,
                        "fontWeight": "500",
                    },
                    {
                        "type": "text",
                        "id": gid(),
                        "fill": "$accent.primary",
                        "content": "Download",
                        "fontFamily": "$font.body",
                        "fontSize": 12,
                        "fontWeight": "500",
                    },
                ],
            }
        )
    children.append(
        {
            "type": "frame",
            "id": gid(),
            "width": "fill_container",
            "gap": 8,
            "justifyContent": "end",
            "children": [
                {
                    "id": gid(),
                    "type": "ref",
                    "ref": "h5fFa",
                    "name": "Cancel Btn",
                    "width": 120,
                    "descendants": {
                        "ukHUJ": {"content": "Cancel request", "fill": "#DC2626"}
                    },
                }
            ],
        }
    )
    return {
        "type": "frame",
        "id": gid(),
        "name": "Detail",
        "width": "fill_container",
        "fill": "$surface.card",
        "cornerRadius": 16,
        "stroke": "$border.primary",
        "strokeWidth": 1,
        "layout": "vertical",
        "gap": 8,
        "padding": 16,
        "children": children,
    }


def build_timeline(steps):
    return {
        "type": "frame",
        "id": gid(),
        "name": "Timeline",
        "width": "fill_container",
        "fill": "$surface.card",
        "cornerRadius": 16,
        "stroke": "$border.primary",
        "strokeWidth": 1,
        "layout": "vertical",
        "gap": 8,
        "padding": 16,
        "children": [
            {
                "type": "text",
                "id": gid(),
                "fill": "$foreground.primary",
                "content": "Approval timeline",
                "fontFamily": "$font.heading",
                "fontSize": 14,
                "fontWeight": "600",
            },
            *[timeline_step(t, s, d) for t, s, d in steps],
        ],
    }


def build_request_detail(
    frame_id, name, x, y, page_title, back_label, sidebar_desc, card_title, status, rows, timeline_steps, attachment=None
):
    sidebar = copy.deepcopy(sidebar_desc)
    remap_ids(sidebar)
    return {
        "type": "frame",
        "id": frame_id,
        "x": x,
        "y": y,
        "name": name,
        "clip": True,
        "width": 1440,
        "height": 720,
        "fill": "$surface.primary",
        "children": [
            sidebar,
            {
                "type": "frame",
                "id": gid(),
                "name": "Main",
                "width": "fill_container",
                "height": "fill_container",
                "layout": "vertical",
                "children": [
                    {
                        "type": "frame",
                        "id": gid(),
                        "name": "Topbar",
                        "width": "fill_container",
                        "height": 64,
                        "fill": "$surface.card",
                        "stroke": "$border.primary",
                        "strokeWidth": {"bottom": 1},
                        "padding": [0, 32],
                        "justifyContent": "space_between",
                        "alignItems": "center",
                        "children": [
                            {
                                "type": "text",
                                "id": gid(),
                                "fill": "$foreground.primary",
                                "content": page_title,
                                "fontFamily": "$font.heading",
                                "fontSize": 18,
                                "fontWeight": "600",
                            },
                            {
                                "type": "text",
                                "id": gid(),
                                "fill": "$foreground.muted",
                                "content": "Thu, 16 Jul 2026",
                                "fontFamily": "$font.body",
                                "fontSize": 13,
                                "fontWeight": "normal",
                            },
                        ],
                    },
                    {
                        "type": "frame",
                        "id": gid(),
                        "name": "Content",
                        "width": "fill_container",
                        "height": "fill_container",
                        "layout": "vertical",
                        "gap": 10,
                        "padding": 16,
                        "alignItems": "start",
                        "children": [
                            {
                                "type": "frame",
                                "id": gid(),
                                "name": "Back",
                                "gap": 6,
                                "alignItems": "center",
                                "children": [
                                    {
                                        "type": "icon",
                                        "id": gid(),
                                        "width": 16,
                                        "height": 16,
                                        "icon": "arrow-left",
                                        "library": "lucide",
                                        "fill": "$accent.primary",
                                    },
                                    {
                                        "type": "text",
                                        "id": gid(),
                                        "fill": "$accent.primary",
                                        "content": back_label,
                                        "fontFamily": "$font.body",
                                        "fontSize": 13,
                                        "fontWeight": "500",
                                    },
                                ],
                            },
                            {
                                "type": "frame",
                                "id": gid(),
                                "name": "Body",
                                "width": "fill_container",
                                "gap": 12,
                                "alignItems": "start",
                                "children": [
                                    build_detail_card(card_title, status, rows, attachment),
                                    build_timeline(timeline_steps),
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    }


CLAIM_SIDEBAR = {
    "id": gid(),
    "type": "ref",
    "ref": "Y3FcoC",
    "name": "Sidebar",
    "height": "fill_container",
    "descendants": {
        "vKoz9": {
            "id": gid(),
            "type": "ref",
            "ref": "fDeUk",
            "name": "Dashboard",
            "width": "fill_container",
            "descendants": {"jQGpT": {"icon": "layout-dashboard"}, "nLujV": {"content": "Dashboard"}},
        },
        "xWMC3": {
            "id": gid(),
            "type": "ref",
            "ref": "mGXFg",
            "name": "Claims",
            "width": "fill_container",
            "descendants": {"G3SDjZ": {"icon": "receipt"}, "G2EYy": {"content": "Claims"}},
        },
    },
}

OT_SIDEBAR = {
    "id": gid(),
    "type": "ref",
    "ref": "Y3FcoC",
    "name": "Sidebar",
    "height": "fill_container",
    "descendants": {
        "vKoz9": {
            "id": gid(),
            "type": "ref",
            "ref": "fDeUk",
            "name": "Dashboard",
            "width": "fill_container",
            "descendants": {"jQGpT": {"icon": "layout-dashboard"}, "nLujV": {"content": "Dashboard"}},
        },
        "epB2L": {
            "id": gid(),
            "type": "ref",
            "ref": "mGXFg",
            "name": "Overtime",
            "width": "fill_container",
            "descendants": {"G3SDjZ": {"icon": "hourglass"}, "G2EYy": {"content": "Overtime"}},
        },
    },
}


def shell_bell():
    return {
        "type": "frame",
        "id": gid(),
        "name": "Shell/Bell",
        "reusable": True,
        "width": 36,
        "height": 36,
        "cornerRadius": 8,
        "justifyContent": "center",
        "alignItems": "center",
        "children": [
            {
                "type": "icon",
                "id": gid(),
                "width": 18,
                "height": 18,
                "icon": "bell",
                "library": "lucide",
                "fill": "$foreground.secondary",
            },
            {
                "type": "frame",
                "id": gid(),
                "name": "Badge",
                "width": 8,
                "height": 8,
                "fill": "$accent.primary",
                "cornerRadius": 999,
                "x": 22,
                "y": 6,
                "layoutPosition": "absolute",
            },
        ],
    }


def shell_user_menu():
    return {
        "type": "frame",
        "id": gid(),
        "name": "Shell/UserMenu",
        "reusable": True,
        "width": 220,
        "fill": "$surface.card",
        "cornerRadius": 12,
        "stroke": "$border.primary",
        "strokeWidth": 1,
        "layout": "vertical",
        "padding": 6,
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "#0F172A1A",
            "offset": {"x": 0, "y": 8},
            "blur": 24,
            "spread": -8,
        },
        "children": [
            {
                "type": "frame",
                "id": gid(),
                "width": "fill_container",
                "padding": [8, 10],
                "gap": 10,
                "alignItems": "center",
                "children": [
                    {"id": gid(), "type": "ref", "ref": "JIzdN", "name": "Avatar"},
                    {
                        "type": "frame",
                        "id": gid(),
                        "layout": "vertical",
                        "gap": 2,
                        "width": "fill_container",
                        "children": [
                            {
                                "type": "text",
                                "id": gid(),
                                "content": "Aisha Rahman",
                                "fill": "$foreground.primary",
                                "fontFamily": "$font.body",
                                "fontSize": 13,
                                "fontWeight": "600",
                            },
                            {
                                "type": "text",
                                "id": gid(),
                                "content": "aisha@company.com",
                                "fill": "$foreground.muted",
                                "fontFamily": "$font.body",
                                "fontSize": 11,
                            },
                        ],
                    },
                ],
            },
            {"type": "frame", "id": gid(), "width": "fill_container", "height": 1, "fill": "$border.primary"},
            *[
                {
                    "type": "frame",
                    "id": gid(),
                    "width": "fill_container",
                    "padding": [8, 10],
                    "gap": 8,
                    "alignItems": "center",
                    "children": [
                        {
                            "type": "icon",
                            "id": gid(),
                            "width": 16,
                            "height": 16,
                            "icon": icon,
                            "library": "lucide",
                            "fill": "$foreground.secondary",
                        },
                        {
                            "type": "text",
                            "id": gid(),
                            "content": label,
                            "fill": "$foreground.primary" if label != "Log out" else "$danger",
                            "fontFamily": "$font.body",
                            "fontSize": 13,
                            "fontWeight": "500",
                        },
                    ],
                }
                for icon, label in [
                    ("user", "Profile"),
                    ("key-round", "Change password"),
                    ("log-out", "Log out"),
                ]
            ],
        ],
    }


def shell_confirm():
    return {
        "type": "frame",
        "id": gid(),
        "name": "Shell/ConfirmDialog",
        "reusable": True,
        "width": 380,
        "fill": "$surface.card",
        "cornerRadius": 16,
        "stroke": "$border.primary",
        "strokeWidth": 1,
        "layout": "vertical",
        "gap": 12,
        "padding": 18,
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "#0F172A33",
            "offset": {"x": 0, "y": 12},
            "blur": 32,
            "spread": -8,
        },
        "children": [
            {
                "type": "text",
                "id": gid(),
                "content": "Cancel this request?",
                "fill": "$foreground.primary",
                "fontFamily": "$font.heading",
                "fontSize": 16,
                "fontWeight": "600",
            },
            {
                "type": "text",
                "id": gid(),
                "content": "This action cannot be undone. Your manager will no longer see this request.",
                "fill": "$foreground.muted",
                "fontFamily": "$font.body",
                "fontSize": 13,
                "textGrowth": "fixed-width",
                "width": "fill_container",
            },
            {
                "type": "frame",
                "id": gid(),
                "width": "fill_container",
                "gap": 8,
                "justifyContent": "end",
                "children": [
                    {
                        "id": gid(),
                        "type": "ref",
                        "ref": "h5fFa",
                        "width": 90,
                        "descendants": {"ukHUJ": {"content": "Keep"}},
                    },
                    {
                        "id": gid(),
                        "type": "ref",
                        "ref": "gtac0",
                        "width": 120,
                        "descendants": {"rkh3u": {"content": "Yes, cancel"}},
                    },
                ],
            },
        ],
    }


def shell_toast(success=True):
    return {
        "type": "frame",
        "id": gid(),
        "name": "Shell/Toast Success" if success else "Shell/Toast Error",
        "reusable": True,
        "width": 320,
        "fill": "$surface.card",
        "cornerRadius": 12,
        "stroke": "$border.primary",
        "strokeWidth": 1,
        "gap": 10,
        "padding": [12, 14],
        "alignItems": "center",
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "#0F172A14",
            "offset": {"x": 0, "y": 4},
            "blur": 16,
        },
        "children": [
            {
                "type": "icon",
                "id": gid(),
                "width": 18,
                "height": 18,
                "icon": "circle-check" if success else "circle-x",
                "library": "lucide",
                "fill": "$success" if success else "$danger",
            },
            {
                "type": "frame",
                "id": gid(),
                "layout": "vertical",
                "gap": 2,
                "width": "fill_container",
                "children": [
                    {
                        "type": "text",
                        "id": gid(),
                        "content": "Request submitted" if success else "Action failed",
                        "fill": "$foreground.primary",
                        "fontFamily": "$font.body",
                        "fontSize": 13,
                        "fontWeight": "600",
                    },
                    {
                        "type": "text",
                        "id": gid(),
                        "content": "Your claim is pending manager review."
                        if success
                        else "Please check your connection and try again.",
                        "fill": "$foreground.muted",
                        "fontFamily": "$font.body",
                        "fontSize": 12,
                    },
                ],
            },
        ],
    }


def shell_topbar_actions():
    return {
        "type": "frame",
        "id": gid(),
        "name": "Shell/Topbar Actions",
        "reusable": True,
        "gap": 8,
        "alignItems": "center",
        "children": [
            {"id": gid(), "type": "ref", "ref": "SHELL_BELL", "name": "Bell"},
            {
                "type": "frame",
                "id": gid(),
                "gap": 8,
                "padding": [4, 8],
                "cornerRadius": 8,
                "alignItems": "center",
                "children": [
                    {"id": gid(), "type": "ref", "ref": "JIzdN", "name": "Avatar"},
                    {
                        "type": "icon",
                        "id": gid(),
                        "width": 14,
                        "height": 14,
                        "icon": "chevron-down",
                        "library": "lucide",
                        "fill": "$foreground.muted",
                    },
                ],
            },
        ],
    }


def overlay_banner(title, message, tone="success"):
    colors = {
        "success": ("$success", "$accent.soft", "circle-check"),
        "warning": ("#D97706", "#FFFBEB", "map-pin-off"),
        "info": ("$accent.primary", "$accent.soft", "info"),
    }
    accent, bg, icon = colors.get(tone, colors["info"])
    return {
        "type": "frame",
        "id": gid(),
        "name": f"Overlay/{title}",
        "layoutPosition": "absolute",
        "x": 0,
        "y": 0,
        "width": 1192,
        "height": 1100,
        "fill": "#64748B55" if tone != "success" else "#64748B44",
        "layout": "vertical",
        "justifyContent": "center",
        "alignItems": "center",
        "children": [
            {
                "type": "frame",
                "id": gid(),
                "width": 400,
                "fill": "$surface.card",
                "cornerRadius": 16,
                "stroke": "$border.primary",
                "strokeWidth": 1,
                "layout": "vertical",
                "gap": 10,
                "padding": 20,
                "alignItems": "center",
                "effect": {
                    "type": "shadow",
                    "shadowType": "outer",
                    "color": "#0F172A33",
                    "offset": {"x": 0, "y": 12},
                    "blur": 32,
                    "spread": -8,
                },
                "children": [
                    {
                        "type": "frame",
                        "id": gid(),
                        "width": 48,
                        "height": 48,
                        "fill": bg,
                        "cornerRadius": 999,
                        "justifyContent": "center",
                        "alignItems": "center",
                        "children": [
                            {
                                "type": "icon",
                                "id": gid(),
                                "width": 24,
                                "height": 24,
                                "icon": icon,
                                "library": "lucide",
                                "fill": accent,
                            }
                        ],
                    },
                    {
                        "type": "text",
                        "id": gid(),
                        "content": title,
                        "fill": "$foreground.primary",
                        "fontFamily": "$font.heading",
                        "fontSize": 16,
                        "fontWeight": "600",
                    },
                    {
                        "type": "text",
                        "id": gid(),
                        "content": message,
                        "fill": "$foreground.muted",
                        "fontFamily": "$font.body",
                        "fontSize": 13,
                        "textGrowth": "fixed-width",
                        "width": "fill_container",
                        "textAlign": "center",
                    },
                    {
                        "id": gid(),
                        "type": "ref",
                        "ref": "gtac0",
                        "width": 140,
                        "descendants": {"rkh3u": {"content": "OK"}},
                    },
                ],
            }
        ],
    }


def make_empty_list_frame(name, x, y, page_title, sidebar_ref_desc, list_label):
    sid = gid()
    sidebar = copy.deepcopy(sidebar_ref_desc)
    remap_ids(sidebar)
    return {
        "type": "frame",
        "id": sid,
        "x": x,
        "y": y,
        "name": name,
        "clip": True,
        "width": 1440,
        "height": 720,
        "fill": "$surface.primary",
        "children": [
            sidebar,
            {
                "type": "frame",
                "id": gid(),
                "name": "Main",
                "width": "fill_container",
                "height": "fill_container",
                "layout": "vertical",
                "children": [
                    {
                        "type": "frame",
                        "id": gid(),
                        "name": "Topbar",
                        "width": "fill_container",
                        "height": 64,
                        "fill": "$surface.card",
                        "stroke": "$border.primary",
                        "strokeWidth": {"bottom": 1},
                        "padding": [0, 32],
                        "justifyContent": "space_between",
                        "alignItems": "center",
                        "children": [
                            {
                                "type": "text",
                                "id": gid(),
                                "content": page_title,
                                "fill": "$foreground.primary",
                                "fontFamily": "$font.heading",
                                "fontSize": 18,
                                "fontWeight": "600",
                            },
                            {
                                "type": "text",
                                "id": gid(),
                                "content": "Thu, 16 Jul 2026",
                                "fill": "$foreground.muted",
                                "fontFamily": "$font.body",
                                "fontSize": 13,
                            },
                        ],
                    },
                    {
                        "type": "frame",
                        "id": gid(),
                        "name": "Content",
                        "width": "fill_container",
                        "height": "fill_container",
                        "layout": "vertical",
                        "gap": 10,
                        "padding": 16,
                        "children": [
                            {
                                "type": "text",
                                "id": gid(),
                                "content": list_label,
                                "fill": "$foreground.muted",
                                "fontFamily": "$font.body",
                                "fontSize": 12,
                            },
                            {
                                "type": "frame",
                                "id": gid(),
                                "name": "List",
                                "width": "fill_container",
                                "fill": "$surface.card",
                                "cornerRadius": 16,
                                "stroke": "$border.primary",
                                "strokeWidth": 1,
                                "layout": "vertical",
                                "padding": 16,
                                "children": [
                                    {
                                        "id": gid(),
                                        "type": "ref",
                                        "ref": "uRsic",
                                        "name": "Empty",
                                        "width": "fill_container",
                                        "descendants": {
                                            "su0BS": {"icon": "inbox"},
                                            "ENFtk": {"content": "No records yet"},
                                            "g1CYiw": {
                                                "content": "New items will appear here once you submit."
                                            },
                                        },
                                    }
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    }


def configure_profile_clone(frame, active_tab, panel_name):
    tabs = find_by_name(frame, "Tabs")
    if tabs:
        set_tab_active(tabs, active_tab)
    for panel in find_all_by_name(frame, "Panel Personal") + find_all_by_name(frame, "Panel Address") + find_all_by_name(
        frame, "Panel Security"
    ) + find_all_by_name(frame, "Panel Emergency") + find_all_by_name(frame, "Panel Employment") + find_all_by_name(
        frame, "Panel Bank"
    ):
        panel["enabled"] = panel.get("name") == panel_name
        if panel.get("name") == panel_name:
            panel["width"] = "fill_container"
            panel["height"] = "fill_container"
            panel.pop("x", None)
            panel.pop("y", None)


def build_assets_page():
    cards = [
        ("MacBook Pro 14\"", "Laptop", "C02XL9ABCD", "12 Jan 2024"),
        ("iPhone 15", "Mobile", "F2LD9X0GHN", "03 Jun 2025"),
    ]
    asset_cards = []
    for name, cat, serial, issued in cards:
        asset_cards.append(
            {
                "type": "frame",
                "id": gid(),
                "width": "fill_container",
                "fill": "$surface.card",
                "cornerRadius": 16,
                "stroke": "$border.primary",
                "strokeWidth": 1,
                "layout": "vertical",
                "gap": 10,
                "padding": 16,
                "children": [
                    {
                        "type": "frame",
                        "id": gid(),
                        "width": "fill_container",
                        "gap": 12,
                        "alignItems": "center",
                        "children": [
                            {
                                "type": "frame",
                                "id": gid(),
                                "width": 40,
                                "height": 40,
                                "fill": "$accent.soft",
                                "cornerRadius": 10,
                                "justifyContent": "center",
                                "alignItems": "center",
                                "children": [
                                    {
                                        "type": "icon",
                                        "id": gid(),
                                        "width": 18,
                                        "height": 18,
                                        "icon": "laptop" if "Mac" in name else "smartphone",
                                        "library": "lucide",
                                        "fill": "$accent.primary",
                                    }
                                ],
                            },
                            {
                                "type": "frame",
                                "id": gid(),
                                "layout": "vertical",
                                "gap": 2,
                                "width": "fill_container",
                                "children": [
                                    {
                                        "type": "text",
                                        "id": gid(),
                                        "content": name,
                                        "fill": "$foreground.primary",
                                        "fontFamily": "$font.body",
                                        "fontSize": 14,
                                        "fontWeight": "600",
                                    },
                                    {
                                        "type": "text",
                                        "id": gid(),
                                        "content": cat,
                                        "fill": "$foreground.muted",
                                        "fontFamily": "$font.body",
                                        "fontSize": 12,
                                    },
                                ],
                            },
                        ],
                    },
                    detail_row("Serial", serial),
                    detail_row("Issued", issued),
                ],
            }
        )
    sidebar = {
        "id": gid(),
        "type": "ref",
        "ref": "Y3FcoC",
        "name": "Sidebar",
        "height": "fill_container",
        "descendants": {
            "vKoz9": {
                "id": gid(),
                "type": "ref",
                "ref": "fDeUk",
                "name": "Dashboard",
                "width": "fill_container",
                "descendants": {"jQGpT": {"icon": "layout-dashboard"}, "nLujV": {"content": "Dashboard"}},
            },
            "kjYf9": {
                "id": gid(),
                "type": "ref",
                "ref": "fDeUk",
                "name": "Profile",
                "width": "fill_container",
                "descendants": {"G3SDjZ": {"icon": "user"}, "G2EYy": {"content": "Profile"}},
            },
        },
    }
    return {
        "type": "frame",
        "id": "AstPg1",
        "x": 32935,
        "y": 1383,
        "name": "Employee / My Assets",
        "clip": True,
        "width": 1440,
        "height": 720,
        "fill": "$surface.primary",
        "children": [
            sidebar,
            {
                "type": "frame",
                "id": gid(),
                "name": "Main",
                "width": "fill_container",
                "height": "fill_container",
                "layout": "vertical",
                "children": [
                    {
                        "type": "frame",
                        "id": gid(),
                        "name": "Topbar",
                        "width": "fill_container",
                        "height": 64,
                        "fill": "$surface.card",
                        "stroke": "$border.primary",
                        "strokeWidth": {"bottom": 1},
                        "padding": [0, 32],
                        "justifyContent": "space_between",
                        "alignItems": "center",
                        "children": [
                            {
                                "type": "text",
                                "id": gid(),
                                "content": "My assets",
                                "fill": "$foreground.primary",
                                "fontFamily": "$font.heading",
                                "fontSize": 18,
                                "fontWeight": "600",
                            },
                            {
                                "type": "text",
                                "id": gid(),
                                "content": "Thu, 16 Jul 2026",
                                "fill": "$foreground.muted",
                                "fontFamily": "$font.body",
                                "fontSize": 13,
                            },
                        ],
                    },
                    {
                        "type": "frame",
                        "id": gid(),
                        "name": "Content",
                        "width": "fill_container",
                        "height": "fill_container",
                        "layout": "vertical",
                        "gap": 10,
                        "padding": 16,
                        "children": [
                            {
                                "type": "text",
                                "id": gid(),
                                "content": "Company property currently assigned to you.",
                                "fill": "$foreground.muted",
                                "fontFamily": "$font.body",
                                "fontSize": 13,
                            },
                            {
                                "type": "frame",
                                "id": gid(),
                                "width": "fill_container",
                                "gap": 12,
                                "children": asset_cards,
                            },
                        ],
                    },
                ],
            },
        ],
    }


def build_performance_page():
    history_rows = [
        ("H1 2026", "Submitted", "4 / 5", "Awaiting manager"),
        ("H2 2025", "Completed", "4 / 5", "Reviewed by Sarah Lim"),
    ]
    rows = []
    for period, status, rating, note in history_rows:
        rows.append(
            {
                "type": "frame",
                "id": gid(),
                "width": "fill_container",
                "padding": 10,
                "stroke": "$border.primary",
                "strokeWidth": {"bottom": 1},
                "alignItems": "center",
                "gap": 10,
                "children": [
                    {
                        "type": "frame",
                        "id": gid(),
                        "layout": "vertical",
                        "gap": 2,
                        "width": "fill_container",
                        "children": [
                            {
                                "type": "text",
                                "id": gid(),
                                "content": period,
                                "fill": "$foreground.primary",
                                "fontFamily": "$font.body",
                                "fontSize": 13,
                                "fontWeight": "600",
                            },
                            {
                                "type": "text",
                                "id": gid(),
                                "content": note,
                                "fill": "$foreground.muted",
                                "fontFamily": "$font.body",
                                "fontSize": 12,
                            },
                        ],
                    },
                    {
                        "id": gid(),
                        "type": "ref",
                        "ref": "R8C3bp",
                        "descendants": {"Vucqf": {"content": status}},
                    },
                    {
                        "type": "text",
                        "id": gid(),
                        "content": rating,
                        "fill": "$foreground.primary",
                        "fontFamily": "$font.body",
                        "fontSize": 13,
                        "fontWeight": "600",
                    },
                ],
            }
        )
    return {
        "type": "frame",
        "id": "PrfPg1",
        "x": 34455,
        "y": 1383,
        "name": "Employee / Performance",
        "clip": True,
        "width": 1440,
        "height": 960,
        "fill": "$surface.primary",
        "children": [
            {
                "id": gid(),
                "type": "ref",
                "ref": "Y3FcoC",
                "name": "Sidebar",
                "height": "fill_container",
                "descendants": {
                    "vKoz9": {
                        "id": gid(),
                        "type": "ref",
                        "ref": "fDeUk",
                        "name": "Dashboard",
                        "width": "fill_container",
                        "descendants": {"jQGpT": {"icon": "layout-dashboard"}, "nLujV": {"content": "Dashboard"}},
                    },
                    "kjYf9": {
                        "id": gid(),
                        "type": "ref",
                        "ref": "fDeUk",
                        "name": "Profile",
                        "width": "fill_container",
                        "descendants": {"G3SDjZ": {"icon": "user"}, "G2EYy": {"content": "Profile"}},
                    },
                },
            },
            {
                "type": "frame",
                "id": gid(),
                "name": "Main",
                "width": "fill_container",
                "height": "fill_container",
                "layout": "vertical",
                "children": [
                    {
                        "type": "frame",
                        "id": gid(),
                        "name": "Topbar",
                        "width": "fill_container",
                        "height": 64,
                        "fill": "$surface.card",
                        "stroke": "$border.primary",
                        "strokeWidth": {"bottom": 1},
                        "padding": [0, 32],
                        "justifyContent": "space_between",
                        "alignItems": "center",
                        "children": [
                            {
                                "type": "text",
                                "id": gid(),
                                "content": "Performance",
                                "fill": "$foreground.primary",
                                "fontFamily": "$font.heading",
                                "fontSize": 18,
                                "fontWeight": "600",
                            },
                            {
                                "id": gid(),
                                "type": "ref",
                                "ref": "gtac0",
                                "width": 150,
                                "descendants": {"rkh3u": {"content": "New self-review"}},
                            },
                        ],
                    },
                    {
                        "type": "frame",
                        "id": gid(),
                        "name": "Content",
                        "width": "fill_container",
                        "height": "fill_container",
                        "layout": "vertical",
                        "gap": 12,
                        "padding": 16,
                        "children": [
                            {
                                "type": "frame",
                                "id": gid(),
                                "width": "fill_container",
                                "fill": "$surface.card",
                                "cornerRadius": 16,
                                "stroke": "$border.primary",
                                "strokeWidth": 1,
                                "layout": "vertical",
                                "gap": 12,
                                "padding": 16,
                                "children": [
                                    {
                                        "type": "text",
                                        "id": gid(),
                                        "content": "Submit self-assessment",
                                        "fill": "$foreground.primary",
                                        "fontFamily": "$font.heading",
                                        "fontSize": 15,
                                        "fontWeight": "600",
                                    },
                                    {
                                        "type": "frame",
                                        "id": gid(),
                                        "width": "fill_container",
                                        "gap": 12,
                                        "children": [
                                            {
                                                "id": gid(),
                                                "type": "ref",
                                                "ref": "K3zyDt",
                                                "width": "fill_container",
                                                "descendants": {
                                                    "P94yWG": {"content": "Period start"},
                                                    "nZVtF": {"content": "01 Jan 2026"},
                                                },
                                            },
                                            {
                                                "id": gid(),
                                                "type": "ref",
                                                "ref": "K3zyDt",
                                                "width": "fill_container",
                                                "descendants": {
                                                    "P94yWG": {"content": "Period end"},
                                                    "nZVtF": {"content": "30 Jun 2026"},
                                                },
                                            },
                                        ],
                                    },
                                    {
                                        "id": gid(),
                                        "type": "ref",
                                        "ref": "AdLdJ",
                                        "width": 200,
                                        "descendants": {
                                            "P94yWG": {"content": "Self rating"},
                                            "nZVtF": {"content": "4 / 5"},
                                        },
                                    },
                                    {
                                        "id": gid(),
                                        "type": "ref",
                                        "ref": "l8j9Mq",
                                        "width": "fill_container",
                                        "descendants": {
                                            "P94yWG": {"content": "Comments"},
                                            "nZVtF": {"content": "Delivered key projects on time and supported team onboarding."},
                                        },
                                    },
                                    {
                                        "type": "frame",
                                        "id": gid(),
                                        "width": "fill_container",
                                        "justifyContent": "end",
                                        "children": [
                                            {
                                                "id": gid(),
                                                "type": "ref",
                                                "ref": "gtac0",
                                                "width": 130,
                                                "descendants": {"rkh3u": {"content": "Submit"}},
                                            }
                                        ],
                                    },
                                ],
                            },
                            {
                                "type": "frame",
                                "id": gid(),
                                "width": "fill_container",
                                "fill": "$surface.card",
                                "cornerRadius": 16,
                                "stroke": "$border.primary",
                                "strokeWidth": 1,
                                "layout": "vertical",
                                "padding": 16,
                                "gap": 8,
                                "children": [
                                    {
                                        "type": "text",
                                        "id": gid(),
                                        "content": "Appraisal history",
                                        "fill": "$foreground.primary",
                                        "fontFamily": "$font.heading",
                                        "fontSize": 15,
                                        "fontWeight": "600",
                                    },
                                    *rows,
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    }


def main():
    data = json.loads(PEN_PATH.read_text())
    children = data["children"]

    by_id = {c["id"]: c for c in children if "id" in c}

    # Remove placeholder frame if present
    for c in children:
        if c.get("id") == "bi8Au" and c.get("name") == "Frame":
            c["enabled"] = False

    claim_detail = build_request_detail(
        "ClmDet1",
        "Employee / Claim Request Detail",
        29895,
        1383,
        "Claim request",
        "Back to claims",
        CLAIM_SIDEBAR,
        "Travel claim",
        "Pending",
        [
            ("Category", "Transport"),
            ("Amount", "RM 128.50"),
            ("Receipt date", "10 Jul 2026"),
            ("Applied", "11 Jul 2026, 14:22"),
            ("Description", "Client visit — LRT + parking"),
            ("Approver", "Sarah Lim (Manager)"),
        ],
        [
            ("Submitted", "11 Jul 2026 · You", True),
            ("Manager review", "Waiting for Sarah Lim", False),
            ("Finance record", "After approval", False),
        ],
        attachment="receipt-12850.jpg",
    )

    ot_detail = build_request_detail(
        "OtDet01",
        "Employee / OT Request Detail",
        31415,
        1383,
        "Overtime request",
        "Back to overtime",
        OT_SIDEBAR,
        "Weekend OT",
        "Pending",
        [
            ("Date", "12 Jul 2026"),
            ("Hours", "4.0 hrs"),
            ("Rate", "1.5×"),
            ("Applied", "12 Jul 2026, 18:05"),
            ("Reason", "Month-end closing support"),
            ("Approver", "Sarah Lim (Manager)"),
        ],
        [
            ("Submitted", "12 Jul 2026 · You", True),
            ("Manager review", "Waiting for Sarah Lim", False),
            ("Payroll eligibility", "After approval", False),
        ],
    )

    children.extend([claim_detail, ot_detail])

    # Profile tab frames from OiN6s clone
    profile_src = copy.deepcopy(by_id["OiN6s"])
    profile_addr = copy.deepcopy(profile_src)
    remap_ids(profile_addr)
    profile_addr["id"] = "PrfAdr1"
    profile_addr["name"] = "Employee / Profile — Address"
    profile_addr["x"] = 6990
    profile_addr["y"] = 2200
    configure_profile_clone(profile_addr, "Address", "Panel Address")

    profile_sec = copy.deepcopy(profile_src)
    remap_ids(profile_sec)
    profile_sec["id"] = "PrfSec1"
    profile_sec["name"] = "Employee / Profile — Security"
    profile_sec["x"] = 8550
    profile_sec["y"] = 2200
    configure_profile_clone(profile_sec, "Security", "Panel Security")
    # Hide change password modal overlay on clones
    modal = find_by_name(profile_sec, "Change Password Modal")
    if modal:
        modal["enabled"] = False
    modal2 = find_by_name(profile_addr, "Change Password Modal")
    if modal2:
        modal2["enabled"] = False

    children.extend([profile_addr, profile_sec])

    # Shell components in Portal Components
    portal = by_id["b4QC0"]
    bell = shell_bell()
    bell_id = bell["id"]
    user_menu = shell_user_menu()
    confirm = shell_confirm()
    toast_ok = shell_toast(True)
    toast_err = shell_toast(False)
    portal["children"].extend([bell, user_menu, confirm, toast_ok, toast_err])

    topbar_actions = shell_topbar_actions()
    # fix bell ref after id known
    for ch in topbar_actions["children"]:
        if ch.get("name") == "Bell":
            ch["ref"] = bell_id
    portal["children"].append(topbar_actions)

    # Empty list handoff frames
    ann_sidebar = {
        "id": gid(),
        "type": "ref",
        "ref": "Y3FcoC",
        "name": "Sidebar",
        "height": "fill_container",
        "descendants": {
            "vKoz9": {
                "id": gid(),
                "type": "ref",
                "ref": "fDeUk",
                "name": "Dashboard",
                "width": "fill_container",
                "descendants": {"jQGpT": {"icon": "layout-dashboard"}, "nLujV": {"content": "Dashboard"}},
            },
            "deCM1": {
                "id": gid(),
                "type": "ref",
                "ref": "mGXFg",
                "name": "Announcements",
                "width": "fill_container",
                "descendants": {"G3SDjZ": {"icon": "megaphone"}, "G2EYy": {"content": "Announcements"}},
            },
        },
    }
    doc_sidebar = copy.deepcopy(by_id["gAG73"]["children"][0])
    remap_ids(doc_sidebar)

    empty_frames = [
        make_empty_list_frame(
            "Employee / Announcements — Empty",
            13070,
            2500,
            "Announcements",
            ann_sidebar,
            "Company news and notices",
        ),
        make_empty_list_frame(
            "Employee / Claims — Empty",
            8510,
            2500,
            "Claims",
            CLAIM_SIDEBAR,
            "Your claim history",
        ),
        make_empty_list_frame(
            "Employee / Documents — Empty",
            15841,
            2500,
            "Documents",
            doc_sidebar,
            "Uploaded documents",
        ),
        make_empty_list_frame(
            "Employee / Notifications — Empty",
            25335,
            2200,
            "Notifications",
            {
                "id": gid(),
                "type": "ref",
                "ref": "Y3FcoC",
                "name": "Sidebar",
                "height": "fill_container",
            },
            "Inbox",
        ),
    ]
    children.extend(empty_frames)

    # Attendance overlay frames
    att_src = copy.deepcopy(by_id["CDsdF"])
    overlays = [
        ("AttOk01", "Employee / Attendance — Clock Success", 3950, 2600, "Clocked in successfully", "Recorded at 09:02 · HQ Branch · GPS verified", "success"),
        ("AttGps1", "Employee / Attendance — GPS Denied", 5550, 2600, "Location required", "Enable GPS or move within the approved geofence to clock in.", "warning"),
        ("AttDup1", "Employee / Attendance — Already Clocked In", 7150, 2600, "Already clocked in", "You clocked in at 09:02. Clock out first before starting a new session.", "info"),
    ]
    for fid, fname, x, y, title, msg, tone in overlays:
        frame = copy.deepcopy(att_src)
        remap_ids(frame)
        frame["id"] = fid
        frame["name"] = fname
        frame["x"] = x
        frame["y"] = y
        frame["height"] = 720
        main = find_by_name(frame, "Main")
        if main:
            main["children"].append(overlay_banner(title, msg, tone))
        children.append(frame)

    children.append(build_assets_page())
    children.append(build_performance_page())

    PEN_PATH.write_text(json.dumps(data, indent=2))
    print(f"Updated {PEN_PATH}")


if __name__ == "__main__":
    main()
