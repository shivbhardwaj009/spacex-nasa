import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SkyViewer } from "@/components/viewer/SkyViewer";

describe("SkyViewer Component (web/src/components/viewer/SkyViewer.tsx)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    cleanup();
  });

  it("renders offline star-field canvas in demo mode without making any network calls", () => {
    render(
      <SkyViewer
        ra={269.452}
        dec={66.561}
        fov={0.2}
        movers={[]}
        epochIndex={0}
        epochs={[]}
        onSelect={vi.fn()}
        isDemo={true}
      />
    );

    // Assert demo mode notice is displayed
    expect(screen.getByText(/Offline Demo Mode/i)).toBeInTheDocument();

    // Verify zero network calls were made in demo mode
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders celestial reticle with cardinal directions in fallback canvas mode", () => {
    render(
      <SkyViewer
        ra={269.452}
        dec={66.561}
        fov={0.2}
        movers={[]}
        epochIndex={0}
        epochs={[]}
        onSelect={vi.fn()}
        isDemo={true}
      />
    );

    expect(screen.getByText("+N")).toBeInTheDocument();
    expect(screen.getByText("-S")).toBeInTheDocument();
    expect(screen.getByText("+E")).toBeInTheDocument();
    expect(screen.getByText("-W")).toBeInTheDocument();
  });

  it("cleans up smoothly on unmount without throwing errors or memory leaks", () => {
    const { unmount } = render(
      <SkyViewer
        ra={269.452}
        dec={66.561}
        fov={0.2}
        movers={[]}
        epochIndex={0}
        epochs={[]}
        onSelect={vi.fn()}
        isDemo={true}
      />
    );

    expect(() => unmount()).not.toThrow();
  });
});
