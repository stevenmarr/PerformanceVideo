import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { appPathRewrite } from "@/lib/preview-path-prefix";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    rewrite: appPathRewrite(),
    defaultErrorComponent: AppErrorComponent,
  });
}
