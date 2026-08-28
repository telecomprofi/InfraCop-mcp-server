import { createFileRoute } from "@tanstack/react-router";
import { PlaygroundPage } from "@/components/playground-page";

export const Route = createFileRoute("/playground")({ component: PlaygroundPage });
