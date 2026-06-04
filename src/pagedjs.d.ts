declare module "pagedjs" {
  export class Previewer {
    constructor();
    preview(
      content: Node | string,
      stylesheets?: Array<string | Record<string, string>>,
      renderTo?: HTMLElement
    ): Promise<unknown>;
  }
}
