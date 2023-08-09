import { Bunzel } from "../../index";

export const app = Bunzel.app("app", {
  entrypoints: ["./index.tsx"],
  outdir: "dist",
});
