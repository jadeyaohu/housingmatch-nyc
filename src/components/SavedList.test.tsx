// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
afterEach(cleanup);
vi.mock("@/lib/supabase/browser", () => ({ browserClient: () => ({}) }));
import { SavedList, type SavedItem } from "./SavedList";

const cfg = { url: "https://x", key: "k", project: "dev", google: false, email: true } as const;
const item = (id: string, state: SavedItem["state"], daysLeft: number | null): SavedItem => ({ id, name: id, where: "", deadline: "2026-11-12", daysLeft, state, url: null });

describe("SavedList", () => {
  it("warns when saved homes close within 7 days", () => {
    render(<SavedList cfg={cfg} lang="zh" items={[item("a", "closing", 3), item("b", "open", 30)]} />);
    expect(screen.getByTestId("closing-banner").textContent).toContain("有 1 个将在 7 天内截止");
    expect(screen.getByTestId("saved-a").textContent).toContain("还有 3 天截止");
  });
  it("no banner when nothing is closing soon", () => {
    render(<SavedList cfg={cfg} lang="en" items={[item("b", "open", 30)]} />);
    expect(screen.queryByTestId("closing-banner")).toBeNull();
  });
});
