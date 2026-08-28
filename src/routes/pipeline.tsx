import { createFileRoute } from "@tanstack/react-router";
import { PipelinePage } from "@/components/pipeline-page";

export const Route = createFileRoute("/pipeline")({ component: PipelinePage });
