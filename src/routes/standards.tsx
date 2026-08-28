import { createFileRoute } from "@tanstack/react-router";
import { StandardsPage } from "@/components/standards-page";

export const Route = createFileRoute("/standards")({ component: StandardsPage });
