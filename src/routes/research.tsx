import { createFileRoute } from "@tanstack/react-router";
import { ResearchPage } from "@/components/research-page";

export const Route = createFileRoute("/research")({ component: ResearchPage });
