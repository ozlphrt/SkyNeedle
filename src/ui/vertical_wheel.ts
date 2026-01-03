import type { AircraftSample } from "../data/mock_provider";

export class VerticalWheel {
  private readonly host: HTMLDivElement;
  private readonly root: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly items: HTMLDivElement[] = [];

  private readonly itemH = 26;
  private readonly visibleCount = 9; // must be odd-ish for a center focus feel
  private readonly updateEveryMs = 180;
  private lastUpdateMs = 0;

  private ordered: AircraftSample[] = [];
  private selectedIndex = 0;
  private selectedId: string | null = null;
  private onChangeCb: ((id: string | null) => void) | null = null;
  private onActivityCb: (() => void) | null = null;

  // Drag state
  private isDragging = false;
  private dragStartY = 0;
  private dragStartOffset = 0; // in item units (can be fractional)
  private offset = 0; // in item units (can be fractional)

  // Smooth snap
  private snapVelocity = 0;

  constructor(host: HTMLDivElement) {
    this.host = host;
    // IMPORTANT: keep host sized via `.wheel_host`. Create a child `.wheel` element
    // so `.wheel { width:100%; height:100% }` doesn't override the host to full-screen.
    this.root = document.createElement("div");
    this.root.className = "wheel";

    this.listEl = document.createElement("div");
    this.listEl.className = "wheel_list";

    const focus = document.createElement("div");
    focus.className = "wheel_focus_line";

    const mask = document.createElement("div");
    mask.className = "wheel_mask";

    this.root.append(this.listEl, focus, mask);
    this.host.appendChild(this.root);

    for (let i = 0; i < this.visibleCount; i++) {
      const el = document.createElement("div");
      el.className = "wheel_item";
      this.listEl.appendChild(el);
      this.items.push(el);
    }

    // Pointer drag (spin wheel)
    this.root.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.onActivityCb?.();
      this.isDragging = true;
      this.dragStartY = e.clientY;
      this.dragStartOffset = this.offset;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    });
    this.root.addEventListener("pointermove", (e) => {
      if (!this.isDragging) return;
      this.onActivityCb?.();
      const dy = e.clientY - this.dragStartY;
      const deltaItems = dy / this.itemH;
      this.offset = this.dragStartOffset + deltaItems;
      this.offset = clampFloat(
        this.offset,
        -0.5,
        Math.max(-0.5, this.ordered.length - 0.5)
      );
      this.snapVelocity = 0;

      // While dragging: behave like mouse wheel — commit selection as you cross rows.
      this.commitSelectionFromOffset();
    });
    const end = () => {
      this.isDragging = false;
      // Snap-to-selected happens automatically in update() when not dragging.
      // Ensure we commit once on release (in case no move occurred).
      this.commitSelectionFromOffset();
      this.onActivityCb?.();
    };
    this.root.addEventListener("pointerup", end);
    this.root.addEventListener("pointercancel", end);

    // Mouse wheel scroll
    this.root.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.onActivityCb?.();
        // Mapping: 1 notch ~ 1 item.
        const delta = Math.sign(e.deltaY) * 1;
        this.offset += delta;
        this.offset = clampFloat(
          this.offset,
          -0.5,
          Math.max(-0.5, this.ordered.length - 0.5)
        );
        // For wheel, treat each notch as an immediate commit.
        this.commitSelectionFromOffset();
      },
      { passive: false }
    );

    // Click/tap anywhere on the wheel counts as activity.
    this.root.addEventListener("click", () => this.onActivityCb?.());
  }

  onChange(cb: (id: string | null) => void) {
    this.onChangeCb = cb;
  }

  onActivity(cb: () => void) {
    this.onActivityCb = cb;
  }

  setSelectedId(id: string | null) {
    this.selectedId = id;
    if (!this.isDragging && this.ordered.length > 0 && id) {
      const idx = this.ordered.findIndex((a) => a.id === id);
      if (idx >= 0) {
        this.selectedIndex = idx;
      }
    }
  }

  update(samples: AircraftSample[], nowMs: number) {
    if (nowMs - this.lastUpdateMs >= this.updateEveryMs) {
      this.lastUpdateMs = nowMs;
      this.ordered = [...samples].sort((a, b) => {
        const da = a.positionEnuM.x * a.positionEnuM.x + a.positionEnuM.z * a.positionEnuM.z;
        const db = b.positionEnuM.x * b.positionEnuM.x + b.positionEnuM.z * b.positionEnuM.z;
        return da - db;
      });

      // Keep selection sticky by ID across resort.
      if (this.selectedId) {
        const idx = this.ordered.findIndex((a) => a.id === this.selectedId);
        if (idx >= 0) this.selectedIndex = idx;
      }

      // Clamp selection index to list length.
      this.selectedIndex = clampInt(this.selectedIndex, 0, Math.max(0, this.ordered.length - 1));
      // Keep scroll position coherent with selection.
      this.offset = clampFloat(this.offset, -0.5, Math.max(-0.5, this.ordered.length - 0.5));
    }

    // Snap to nearest item when not dragging.
    if (!this.isDragging) {
      const target = this.selectedIndex;
      // Critically damped-ish spring in item units.
      const dt = 1 / 60;
      const k = 48;
      const c = 14;
      const x = this.offset - target;
      const a = -k * x - c * this.snapVelocity;
      this.snapVelocity += a * dt;
      this.offset += this.snapVelocity * dt;

      // If close enough, settle.
      if (Math.abs(this.offset - target) < 0.001 && Math.abs(this.snapVelocity) < 0.001) {
        this.offset = target;
        this.snapVelocity = 0;
      }
    }

    // Highlight the nearest row to the current offset.
    const previewIndex = clampInt(
      Math.round(this.offset),
      0,
      Math.max(0, this.ordered.length - 1)
    );
    if (this.selectedId === null && this.ordered.length > 0) {
      this.selectedId = this.ordered[this.selectedIndex]?.id ?? null;
    }

    // Render visible window around selected index.
    const mid = Math.floor(this.visibleCount / 2);
    const frac = this.offset - previewIndex;
    // Move list so that selected is centered and fractional offset scrolls smoothly.
    this.listEl.style.transform = `translateY(calc(-50% + ${(-frac * this.itemH).toFixed(2)}px))`;

    for (let i = 0; i < this.visibleCount; i++) {
      const idx = previewIndex + (i - mid);
      const el = this.items[i];
      if (idx < 0 || idx >= this.ordered.length) {
        el.textContent = "";
        el.style.opacity = "0";
        el.classList.remove("is_active");
        continue;
      }
      const a = this.ordered[idx];
      el.textContent = a.callsign || a.id;
      el.style.opacity = idx === previewIndex ? "1" : "0.55";
      el.classList.toggle("is_active", idx === previewIndex);
    }
  }

  private commitSelectionFromOffset() {
    const n = this.ordered.length;
    if (n === 0) return;

    const idx = clampInt(Math.round(this.offset), 0, n - 1);
    if (idx === this.selectedIndex && this.selectedId) return;

    this.selectedIndex = idx;
    this.selectedId = this.ordered[idx]?.id ?? null;
    this.onChangeCb?.(this.selectedId);
  }
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clampFloat(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}


