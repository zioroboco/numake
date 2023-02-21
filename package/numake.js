#!/usr/bin/env node
// @ts-check

import { createRequire } from "node:module"
const require = createRequire(import.meta.url)

import assert from "node:assert"
import child_process from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

let DEBUG = Boolean(process.env.NUMAKE_DEBUG)
let LOGLEVEL = "warn"

if (DEBUG) {
  LOGLEVEL = "debug"
} else if (process.env.NUMAKE_LOGLEVEL) {
  LOGLEVEL = process.env.NUMAKE_LOGLEVEL
}

/** @type {typeof console.debug} */
let debug = () => { }
/** @type {typeof console.info} */
let info = () => { }
/** @type {typeof console.warn} */
let warn = () => { }
/** @type {typeof console.error} */
let error = () => { }

switch (LOGLEVEL) {
  case "debug":
    debug = console.debug
  case "info":
    info = console.info
  case "warn":
    warn = console.warn
  case "error":
    error = console.error
}

async function main() {
  info(`--- numake ---`)

  const node_version = process.version.replace(/^v/, "")
  info(`node version: ${node_version}`)

  const package_meta = JSON.parse(await fs.promises.readFile(require.resolve("./package.json"), "utf-8"))
  const [nushell_version, numake_release] = package_meta["version"].split("-")
  info(`nushell version: ${nushell_version}`)
  info(`numake release: ${numake_release}`)

  const platform = get_platform(process)
  info(`platform: ${platform}`)

  const numake_package_dir = path.relative(process.cwd(), fileURLToPath(new URL(".", import.meta.url)))
  const numake_store_dir = path.join(numake_package_dir, ".store")
  await fs.promises.mkdir(numake_store_dir, { recursive: true })
  info(`store directory: ${numake_store_dir}`)

  const numake_bin_dir = path.join(numake_package_dir, ".bin")
  await fs.promises.mkdir(numake_bin_dir, { recursive: true })
  info(`bin directory: ${numake_bin_dir}`)

  const nushell_release_name = `nu-${nushell_version}-${platform}`
  const nushell_release_filename = `${nushell_release_name}.tar.gz`
  info(`nushell release name: ${nushell_release_name}`)

  if (fs.existsSync(path.join(numake_store_dir, nushell_release_filename))) {
    info(`nushell release exists in store, skipping download`)
  } else {
    info(`nushell release does not exist in store, downloading...`)
    const nushell_release_url = `https://github.com/nushell/nushell/releases/download/${nushell_version}/${nushell_release_filename}`

    info(`nushell release: ${nushell_release_url}`)

    info(`downloading nushell...`)
    await fetch(nushell_release_url)
      .then(response => response.arrayBuffer())
      .then(array_buffer => fs.promises.writeFile(path.join(numake_store_dir, nushell_release_filename), Buffer.from(array_buffer)))

    info(`extracting nushell...`)
    child_process.exec(`tar -xzf ${nushell_release_filename}`, { cwd: numake_store_dir })

    info(`linking nushell...`)
    child_process.exec(`ln -s ${path.relative(numake_bin_dir, path.join(numake_store_dir, nushell_release_name, "nu"))} nu`, { cwd: numake_bin_dir })
  }

  const nu_bin = path.join(numake_bin_dir, "nu")
  if (DEBUG) assert.equal(nushell_version, child_process.execSync(`${nu_bin} --version`).toString().trim())
}

function is_musl() {
  const stderr = child_process.spawnSync("ldd", ["--version"]).stderr.toString()
  return stderr.indexOf("musl") > -1
}

/**
 * @param process {NodeJS.Process}
 * @returns {"aarch64-apple-darwin" | "aarch64-unknown-linux-gnu" | "x86_64-apple-darwin" | "x86_64-unknown-linux-gnu" | "x86_64-unknown-linux-musl"}
 */
function get_platform(process) {
  switch (process.platform) {
    case "darwin":
      return process.arch === "arm64"
        ? "aarch64-apple-darwin"
        : "x86_64-apple-darwin"
    case "linux":
      if (is_musl()) {
        return "x86_64-unknown-linux-musl"
      }
      return process.arch === "arm64"
        ? "aarch64-unknown-linux-gnu"
        : "x86_64-unknown-linux-gnu"
    default:
      throw new Error(`unsupported platform: ${process.platform}`)
  }
}

main().then(() => {
  info("done")
  process.exit(0)
}).catch((err) => {
  error(err)
  process.exit(1)
})
