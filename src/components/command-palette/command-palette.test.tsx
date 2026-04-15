import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardNav } from "./use-keyboard-nav";
import type { CommandItem } from "./types";

// --- useKeyboardNav tests ---

function makeItems(count: number): CommandItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i}`,
    group: "navigate" as const,
    keywords: [],
    onSelect: vi.fn(),
  }));
}

describe("useKeyboardNav", () => {
  it("starts at index 0", () => {
    const items = makeItems(3);
    const { result } = renderHook(() => useKeyboardNav(items));
    expect(result.current.highlightedIndex).toBe(0);
  });

  it("moves down on ArrowDown", () => {
    const items = makeItems(3);
    const { result } = renderHook(() => useKeyboardNav(items));
    act(() => {
      result.current.onKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.highlightedIndex).toBe(1);
  });

  it("wraps around on ArrowDown at end", () => {
    const items = makeItems(3);
    const { result } = renderHook(() => useKeyboardNav(items));
    act(() => {
      const event = { key: "ArrowDown", preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
      result.current.onKeyDown(event);
      result.current.onKeyDown(event);
      result.current.onKeyDown(event);
    });
    expect(result.current.highlightedIndex).toBe(0);
  });

  it("moves up on ArrowUp and wraps", () => {
    const items = makeItems(3);
    const { result } = renderHook(() => useKeyboardNav(items));
    act(() => {
      result.current.onKeyDown({
        key: "ArrowUp",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.highlightedIndex).toBe(2);
  });

  it("goes to end on End key", () => {
    const items = makeItems(5);
    const { result } = renderHook(() => useKeyboardNav(items));
    act(() => {
      result.current.onKeyDown({
        key: "End",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.highlightedIndex).toBe(4);
  });

  it("goes to start on Home key", () => {
    const items = makeItems(5);
    const { result } = renderHook(() => useKeyboardNav(items));
    act(() => {
      const event = { key: "ArrowDown", preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
      result.current.onKeyDown(event);
      result.current.onKeyDown(event);
    });
    expect(result.current.highlightedIndex).toBe(2);
    act(() => {
      result.current.onKeyDown({
        key: "Home",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.highlightedIndex).toBe(0);
  });

  it("calls onSelect of highlighted item on Enter", () => {
    const items = makeItems(3);
    const { result } = renderHook(() => useKeyboardNav(items));
    act(() => {
      result.current.onKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    act(() => {
      result.current.onKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(items[1].onSelect).toHaveBeenCalledOnce();
  });

  it("resets index when items change", () => {
    const items3 = makeItems(3);
    const items5 = makeItems(5);
    const { result, rerender } = renderHook(
      ({ items }) => useKeyboardNav(items),
      { initialProps: { items: items3 } }
    );
    act(() => {
      const event = { key: "ArrowDown", preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
      result.current.onKeyDown(event);
      result.current.onKeyDown(event);
    });
    expect(result.current.highlightedIndex).toBe(2);
    rerender({ items: items5 });
    expect(result.current.highlightedIndex).toBe(0);
  });
});

// --- useHotkey tests ---

describe("useHotkey", () => {
  it("fires callback on Cmd+K", async () => {
    const callback = vi.fn();

    // Import dynamically to avoid module-level side effects
    const { useHotkey } = await import("./use-hotkey");
    renderHook(() => useHotkey(callback));

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(callback).toHaveBeenCalledOnce();
  });

  it("fires callback on Ctrl+K", async () => {
    const callback = vi.fn();
    const { useHotkey } = await import("./use-hotkey");
    renderHook(() => useHotkey(callback));

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(callback).toHaveBeenCalledOnce();
  });

  it("fires callback on / when no input focused", async () => {
    const callback = vi.fn();
    const { useHotkey } = await import("./use-hotkey");
    renderHook(() => useHotkey(callback));

    fireEvent.keyDown(document, { key: "/" });
    expect(callback).toHaveBeenCalledOnce();
  });

  it("does NOT fire on / when input is focused", async () => {
    const callback = vi.fn();
    const { useHotkey } = await import("./use-hotkey");
    renderHook(() => useHotkey(callback));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: "/" });
    expect(callback).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("does NOT fire on / when textarea is focused", async () => {
    const callback = vi.fn();
    const { useHotkey } = await import("./use-hotkey");
    renderHook(() => useHotkey(callback));

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    fireEvent.keyDown(textarea, { key: "/" });
    expect(callback).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });
});
