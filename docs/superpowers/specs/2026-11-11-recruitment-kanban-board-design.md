# Recruitment pipeline board polish — design

**Date:** 11 Nov 2026  
**Status:** Approved (Approach B)  
**Route:** `/hr/recruitment/[requisitionId]`

## Goal

Make the requisition pipeline look like a proper hiring board: scannable columns, compact cards, Add candidate out of the way.

## Layout

- Keep page header, back link, hold/closed banner.
- Add candidate: collapsed panel; open by default only when the board has zero applications.
- Board: single horizontal scroll; columns `min-w-[240px]`.
- Column header: stage label + count badge (no heavy section cards).
- Empty column: muted “No candidates”.

## Cards

- Name → candidate detail; stage age; offer status chip when present.
- Actions (open req only): Advance to next stage only + Reject.
- Hired: keep draft-employee link.
- Hold/closed: no mutation buttons.

## Out of scope

Drag-and-drop, custom stages, candidate-detail redesign.
