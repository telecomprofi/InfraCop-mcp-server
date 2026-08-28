import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/components/agents-page";

export const Route = createFileRoute("/agents")({ component: AgentsPage });
