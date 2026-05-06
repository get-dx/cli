import { WorkflowRunEvent } from "./info.js";
import { Runtime } from "../../types.js";
import { renderRichText } from "../../renderers.js";
import * as ui from "../../ui.js";

export function renderWorkflowRunEvent(
  event: WorkflowRunEvent,
  runtime: Runtime,
): void {
  // TODO: make this look different for each event type
  renderRichText(
    [ui.p(`${ui.dim(event.occurred_at)} Received event: ${event.type}`)],
    { useStderr: true },
  );
}
