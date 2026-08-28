import { createFileRoute } from "@tanstack/react-router";
import { BriefPage } from "@/components/brief-page";

export const Route = createFileRoute("/brief")({ component: BriefPage });
