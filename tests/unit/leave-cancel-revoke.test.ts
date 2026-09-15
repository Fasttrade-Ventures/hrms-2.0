import { describe, expect, it } from "vitest";

import { canTransition, isTerminal, transition } from "@hrms/domain";
import { formatNotificationMessage } from "../../apps/web/src/lib/notifications/types";
import { resolveNotificationHref } from "../../apps/web/src/lib/notifications/links";

describe("Leave cancel and revoke domain transitions", () => {
  it("allows transition from pending to cancelled via cancel event", () => {
    expect(canTransition("pending", "cancel")).toBe(true);
    expect(transition("pending", "cancel")).toBe("cancelled");
    expect(isTerminal("cancelled")).toBe(true);
  });

  it("allows transition from approved to revoked via revoke event", () => {
    expect(canTransition("approved", "revoke")).toBe(true);
    expect(transition("approved", "revoke")).toBe("revoked");
    expect(isTerminal("revoked")).toBe(true);
  });

  it("disallows invalid transitions", () => {
    // Approved cannot be cancelled directly (must be revoked)
    expect(canTransition("approved", "cancel")).toBe(false);
    expect(() => transition("approved", "cancel")).toThrow();

    // Cancelled and revoked are terminal states
    expect(canTransition("cancelled", "cancel")).toBe(false);
    expect(canTransition("cancelled", "revoke")).toBe(false);
    expect(canTransition("revoked", "cancel")).toBe(false);
    expect(canTransition("revoked", "revoke")).toBe(false);

    // Rejected cannot be cancelled or revoked
    expect(canTransition("rejected", "cancel")).toBe(false);
    expect(canTransition("rejected", "revoke")).toBe(false);
  });
});

describe("Leave cancel and revoke notifications", () => {
  it("formats notification message for approval.cancel", () => {
    const msgWithActor = formatNotificationMessage({
      id: "notif-1",
      template: "approval.cancel",
      payload: { requestType: "leave", actorName: "Ali Ahmad" },
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    expect(msgWithActor).toBe("Ali Ahmad cancelled their leave request.");

    const msgWithoutActor = formatNotificationMessage({
      id: "notif-2",
      template: "approval.cancel",
      payload: { requestType: "leave" },
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    expect(msgWithoutActor).toBe("Your leave request was cancelled.");
  });

  it("formats notification message for approval.revoke", () => {
    const msgWithActor = formatNotificationMessage({
      id: "notif-3",
      template: "approval.revoke",
      payload: { requestType: "leave", actorName: "Ali Ahmad" },
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    expect(msgWithActor).toBe("Ali Ahmad revoked their approved leave request.");

    const msgWithoutActor = formatNotificationMessage({
      id: "notif-4",
      template: "approval.revoke",
      payload: { requestType: "leave" },
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    expect(msgWithoutActor).toBe("Your leave request was revoked.");
  });

  it("resolves notification links for cancel and revoke", () => {
    const cancelRow = {
      id: "notif-cancel",
      template: "approval.cancel",
      payload: { requestType: "leave", sourceId: "leave-123" },
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    expect(resolveNotificationHref(cancelRow, "employee")).toBe("/employee/leave/leave-123");
    expect(resolveNotificationHref(cancelRow, "manager")).toBe("/manager/team-calendar");

    const revokeRow = {
      id: "notif-revoke",
      template: "approval.revoke",
      payload: { requestType: "leave", sourceId: "leave-456" },
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    expect(resolveNotificationHref(revokeRow, "employee")).toBe("/employee/leave/leave-456");
    expect(resolveNotificationHref(revokeRow, "manager")).toBe("/manager/team-calendar");
  });
});
