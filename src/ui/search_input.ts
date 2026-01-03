export class SearchInput {
  private readonly input: HTMLInputElement;
  private readonly status: HTMLDivElement;
  private readonly onSubmit: (query: string) => void;

  constructor(params: { input: HTMLInputElement; status: HTMLDivElement; onSubmit: (query: string) => void }) {
    this.input = params.input;
    this.status = params.status;
    this.onSubmit = params.onSubmit;

    this.input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      const query = this.input.value.trim();
      if (!query) return;

      this.onSubmit(query);
    });
  }

  setStatus(text: string, state: "idle" | "active" | "error" = "idle") {
    this.status.textContent = text;
    this.status.dataset.state = state;
  }
}


