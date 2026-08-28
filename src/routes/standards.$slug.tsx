import { createFileRoute } from "@tanstack/react-router";
import { StandardDetail } from "@/components/standard-detail";

export const Route = createFileRoute("/standards/$slug")({
  component: StandardDetail,
});
