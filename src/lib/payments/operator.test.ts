import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ operator: vi.fn(), command: vi.fn(), invite: vi.fn(), refund: vi.fn() }));
vi.mock("./db", () => ({ operator: mocks.operator, command: mocks.command }));
vi.mock("./stripe", () => ({ invite: mocks.invite, refund: mocks.refund, validToken: () => false }));
vi.mock("./config", () => ({ paymentConfig: () => ({ origin: "http://localhost:3000" }) }));
import { POST as invite } from "@/app/api/consultation/payments/invite/route";
import { POST as refund } from "@/app/api/consultation/payments/refund/route";
import { POST as confirm } from "@/app/api/consultation/payments/confirm/route";
const bookingId = "da7606dc-51ef-4cb0-9918-18c8e20531aa";
const req = (data: object) => new Request("http://localhost:3000/api/consultation/payments", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify(data) });
beforeEach(() => { vi.clearAllMocks(); mocks.operator.mockRejectedValue(new Error("forbidden")); });
it.each([invite, refund, confirm])("denies privileged payment actions without verified operator identity", async (handler) => {
  expect((await handler(req({ bookingId }))).status).toBe(403);
  expect(mocks.invite).not.toHaveBeenCalled(); expect(mocks.refund).not.toHaveBeenCalled(); expect(mocks.command).not.toHaveBeenCalled();
});
it("requires explicit availability agreement to issue an invitation", async () => {
  mocks.operator.mockResolvedValue("verified-operator");
  expect((await invite(req({ bookingId, availabilityAgreed: false }))).status).toBe(400);
  mocks.invite.mockResolvedValue({ url: "http://localhost:3000/consultation/pay#token=synthetic" });
  expect((await invite(req({ bookingId, availabilityAgreed: true }))).status).toBe(201);
  expect(mocks.invite).toHaveBeenCalledWith(bookingId, "verified-operator");
});
it("uses verified identity for separate appointment confirmation, never a supplied actor", async () => {
  mocks.operator.mockResolvedValue("verified-operator"); mocks.command.mockResolvedValue({ bookingStatus: "confirmed" });
  expect((await confirm(req({ bookingId, appointmentConfirmed: true, actor: "spoofed" }))).status).toBe(400);
  expect((await confirm(req({ bookingId, appointmentConfirmed: true }))).status).toBe(200);
  expect(mocks.command).toHaveBeenCalledWith("confirm", bookingId, null, "verified-operator");
});
