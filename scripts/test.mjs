import { build } from "esbuild"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"

async function run() {
	const dir = await mkdtemp(path.join(tmpdir(), "vim-tabs-tests-"))
	const outfile = path.join(dir, "tests.mjs")

	try {
		await build({
			entryPoints: ["tests/index.ts"],
			bundle: true,
			format: "esm",
			platform: "node",
			target: "node20",
			outfile,
			logLevel: "silent",
		})

		await new Promise((resolve, reject) => {
			const child = spawn(process.execPath, ["--test", outfile], {
				stdio: "inherit",
			})
			child.on("exit", (code) => {
				if (code === 0) resolve(undefined)
				else reject(new Error(`Tests failed with exit code ${code}`))
			})
			child.on("error", reject)
		})
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
}

run().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
