import Bun from "bun";
import { dirname } from "node:path";
import { Command } from "commander";

export namespace Bunzel {
  const genName = (name?: string) => name ?? Math.random().toString();

  interface BunzelJob {
    key: "bunzel-job";
    name: string;
    run(baseDir: string): Promise<Bun.BuildOutput>;
  }

  export function isBunzelJob(job: unknown): job is BunzelJob {
    return job instanceof Object && "key" in job && job.key === "bunzel-job";
  }

  export function app(name: string, config: Bun.BuildConfig): BunzelJob {
    return {
      key: "bunzel-job",
      name: genName(name),
      async run(baseDir): Promise<Bun.BuildOutput> {
        const cfg = {
          ...config,
          root: baseDir,
          entrypoints: config.entrypoints.map(
            (entrypoint) => `${baseDir}/${entrypoint}`
          ),
          outdir: `${baseDir}/${config.outdir}`,
        };

        const out = await Bun.build(cfg);

        if (!out.success) {
          console.log("Build failed!", this);
          console.log(out.logs, cfg);
          return out;
        }

        console.log("app output", out);
        console.log("config", cfg);

        for await (const output of out.outputs) {
          console.log(`Output: ${output.path}`);
          await Bun.write(output.path, output);
          const file = Bun.file(output.path);
          const text = await file.text();
          console.log(
            `file content ${output.path} >>>>`,
            text === "" ? "<EMPTY>" : text
          );
        }

        console.log("Done!", this);

        return out;
      },
    };
  }
}

if (import.meta.path === Bun.main) {
  const program = new Command();

  program
    .name("Bunzel")
    .description(
      "Bazel like builder for JavaScript and TypeScript built on top of Bun"
    )
    .version("0.0.0");

  program
    .command("build")
    .description("Build target")
    .argument("<string>", "path to target")
    .action(async (target, options) => {
      const workspaceRoot = dirname(import.meta.path);

      console.log("build", { target }, { options }, { wroot: workspaceRoot });

      const pathToPackage = `${workspaceRoot}/${target.replace("//", "")}`;
      const mod = await import(`${pathToPackage}/bunzel.ts`);

      for await (const [exprt, job] of Object.entries(mod)) {
        if (Bunzel.isBunzelJob(job)) {
          console.log(`Found ${exprt} in ${target} `, job);
          await job.run(pathToPackage);
        }
      }
    });

  program.parse();
}
