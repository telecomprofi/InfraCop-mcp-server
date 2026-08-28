import { createFileRoute } from "@tanstack/react-router";
import { InspectorPage } from "@/components/inspector-page";

export const Route = createFileRoute("/inspector")({ component: InspectorPage });
