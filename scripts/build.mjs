import { build, context } from "esbuild"
import { watch as watchFs } from "node:fs"
import { cp, mkdir, rm } from "node:fs/promises"

const watch = process.argv.includes("--watch")

const copyStaticAssetsPlugin = {
	name: "copy-static-assets",
	setup(buildApi) {
		buildApi.onStart(async () => {
			await mkdir("dist", { recursive: true })
			await copyStaticAssets()
		})
	},
}

const sharedConfig = {
	entryPoints: [
		"src/background.js",
		"src/marks.js",
		"src/overlay.js",
		"src/stash.js",
		"src/settings.js",
	],
	bundle: true,
	format: "iife",
	platform: "browser",
	target: "chrome120",
	sourcemap: true,
	outdir: "dist",
	logLevel: "info",
	plugins: [copyStaticAssetsPlugin],
}

async function copyStaticAssets() {
	await cp("src/manifest.json", "dist/manifest.json")
	await cp("src/manager.html", "dist/manager.html")
	await cp("src/preview.html", "dist/preview.html")
	await cp("src/preview.js", "dist/preview.js")
	await cp("src/marks.html", "dist/marks.html")
	await cp("src/marks.css", "dist/marks.css")
	await cp("src/stash.html", "dist/stash.html")
	await cp("src/stash.css", "dist/stash.css")
	await cp("src/settings.html", "dist/settings.html")
	await cp("src/settings.css", "dist/settings.css")
	await cp("src/overlay.css", "dist/overlay.css")
}

async function prepareDist() {
	await rm("dist", { recursive: true, force: true })
	await mkdir("dist", { recursive: true })
	await copyStaticAssets()
}

function watchStaticAssets() {
	const files = [
		"src/manifest.json",
		"src/manager.html",
		"src/preview.html",
		"src/preview.js",
		"src/marks.html",
		"src/marks.css",
		"src/stash.html",
		"src/stash.css",
		"src/settings.html",
		"src/settings.css",
		"src/overlay.css",
	]

	files.forEach((file) => {
		watchFs(file, async () => {
			try {
				await copyStaticAssets()
				console.log(`Copied ${file} to dist/`)
			} catch (error) {
				console.error(`Failed to copy ${file}`, error)
			}
		})
	})
}

async function runBuild() {
	await prepareDist()

	if (watch) {
		const ctx = await context(sharedConfig)
		await ctx.watch()
		watchStaticAssets()
		console.log("Watching src/ and writing extension files to dist/")
		return
	}

	await build(sharedConfig)
}

runBuild().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
