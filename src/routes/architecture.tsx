import { createFileRoute } from "@tanstack/react-router";
import { ArchitecturePage } from "@/components/architecture-page";

export const Route = createFileRoute("/architecture")({ component: ArchitecturePage });
