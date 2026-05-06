import { WorkflowRunEvent } from "./info.js";
import * as ui from "../../ui.js";

export function workflowRunEventContent(event: WorkflowRunEvent): ui.Block {
  const ts = ui.dim(event.occurred_at);
  const message = formatEventMessage(event);
  return ui.p(`${ts} ${message}`, false);
}

function formatEventMessage(event: WorkflowRunEvent): string {
  const userName = event.user?.name ?? event.user?.email ?? "unknown user";

  switch (event.type) {
    case "WORKFLOW_TRIGGERED":
      return `Workflow run triggered by ${ui.bold(userName)}`;

    case "WORKFLOW_RUN_REQUESTED":
      return `Workflow run requested by ${ui.bold(userName)}`;

    case "APPROVERS_NOTIFIED":
      return "Approvers notified";

    case "APPROVAL_PERFORMED":
      return `Approved by ${ui.bold(userName)}`;

    case "REJECTION_PERFORMED":
      return `Rejected by ${ui.bold(userName)}`;

    case "HTTP_REQUEST_COMPLETED": {
      const method = event.data?.request?.method?.toUpperCase();
      const url = event.data?.request?.url;
      const status = event.data?.response?.status;
      const reqSummary = method && url ? ` ${ui.code(`${method} ${url}`)}` : "";
      const statusSummary = status ? ` → ${ui.code(String(status))}` : "";
      return `Sent HTTP request${reqSummary}${statusSummary}`;
    }

    case "POST_MESSAGE": {
      const text = event.message ?? "";
      const truncated = text.length > 120 ? text.slice(0, 120) + "…" : text;
      return truncated;
    }

    case "ADD_LINK": {
      const link = event.data?.link;
      if (link) {
        const label = link.label ? `${link.label}: ` : "";
        return `Added link ${label}${ui.link(link.url)}`;
      }
      return "Added a link";
    }

    case "CHANGE_STATUS": {
      const status = event.data?.status;
      return status
        ? `Status changed to ${ui.bold(status.toLowerCase())}`
        : "Status changed";
    }

    case "WORKFLOW_SUCCEEDED":
      return `${ui.success(ui.GLYPHS.CHECK)} Workflow run succeeded`;

    case "WORKFLOW_FAILED":
      return `${ui.error(ui.GLYPHS.ERROR)} Workflow run failed`;

    case "WORKFLOW_TIMEOUT":
      return `${ui.error(ui.GLYPHS.ERROR)} Workflow run timed out`;

    case "WORKFLOW_CANCELLED":
      return `${ui.warning(ui.GLYPHS.WARNING)} Workflow run cancelled by ${ui.bold(userName)}`;

    default:
      return `Event: ${(event as WorkflowRunEvent).type}`;
  }
}
