// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
const auth = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ browserClient: () => ({ auth }) }));
import { ResetPassword } from "./ResetPassword";
const cfg = { url: "http://localhost:54321", key: "synthetic", project: "dev" as const, google: false, email: true };
afterEach(cleanup); beforeEach(() => vi.clearAllMocks());
function setup(confirm = "synthetic-new-password") { render(<ResetPassword cfg={cfg} lang="en"/>); fireEvent.change(screen.getByLabelText("New password (12–128 characters)"), { target: { value: "synthetic-new-password" } }); fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirm } }); fireEvent.click(screen.getByText("Update password")); }
it("does not update or report success without a verified user", async () => { auth.getUser.mockResolvedValue({ data: { user: null }, error: null }); setup(); await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Could not update")); expect(auth.updateUser).not.toHaveBeenCalled(); });
it("rejects confirmation mismatch before a provider request", async () => { setup("different-test-password"); await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy()); expect(auth.getUser).not.toHaveBeenCalled(); });
it("updates via the provider before showing success and signing out", async () => { auth.getUser.mockResolvedValue({ data: { user: { id: "synthetic-user" } }, error: null }); auth.updateUser.mockResolvedValue({ error: null }); auth.signOut.mockResolvedValue({ error: null }); setup(); await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Password updated")); expect(auth.updateUser).toHaveBeenCalledWith({ password: "synthetic-new-password" }); expect(auth.signOut).toHaveBeenCalled(); });
