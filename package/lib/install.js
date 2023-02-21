// @ts-check

const { NUMAKE_DEBUG } = process.env

import assert from "node:assert"
import child_process from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import url from "node:url"

/**
 * @param loggers {ReturnType<typeof import("./log.js").make_loggers>}
 * @returns {Promise<string>}
 */
export async function install({ info }) {
  const node_version = process.version.replace(/^v/, "")
  info(`node version: ${node_version}`)

  const package_dir = url.fileURLToPath(new URL("..", import.meta.url))
  info(`package directory: ${path.relative(process.cwd(), package_dir)}`)

  const package_meta = JSON.parse(await fs.promises.readFile(path.join(package_dir, "package.json"), "utf8"))
  const [nushell_version, numake_release] = package_meta["version"].split("-")
  info(`nushell version: ${nushell_version}`)
  info(`numake release: ${numake_release}`)

  const platform = get_platform(process)
  info(`platform: ${platform}`)

  const store_dir = path.join(package_dir, ".store")
  await fs.promises.mkdir(store_dir, { recursive: true })
  info(`store directory: ${path.relative(process.cwd(), store_dir)}`)

  const bin_dir = path.join(package_dir, ".bin")
  await fs.promises.mkdir(bin_dir, { recursive: true })
  info(`bin directory: ${path.relative(process.cwd(), bin_dir)}`)

  const nushell_release = `nu-${nushell_version}-${platform}`
  const nushell_release_filename = `${nushell_release}.tar.gz`
  info(`nushell release: ${nushell_release}`)

  if (fs.existsSync(path.join(store_dir, nushell_release_filename))) {
    info(`found nushell release archive, skipping download`)
  } else {
    info(`nushell release does not exist in store, downloading...`)
    const nushell_release_url = `https://github.com/nushell/nushell/releases/download/${nushell_version}/${nushell_release_filename}`

    info(`url: ${nushell_release_url}`)

    info(`downloading nushell...`)
    await fetch(nushell_release_url)
      .then(response => response.arrayBuffer())
      .then(array_buffer => fs.promises.writeFile(path.join(store_dir, nushell_release_filename), Buffer.from(array_buffer)))
  }

  if (fs.existsSync(path.join(store_dir, nushell_release, "nu"))) {
    info(`found nushell release binary, skipping extraction`)
  } else {
    info(`extracting nushell...`)
    child_process.execSync(`tar -xzf ${nushell_release_filename}`, { cwd: store_dir })
  }

  const nu_bin = path.join(bin_dir, "nu")
  child_process.execSync(`ln -sf ${path.join(store_dir, nushell_release, "nu")} ${nu_bin}`)

  if (NUMAKE_DEBUG) {
    const reported_nushell_version = child_process.execSync(`${nu_bin} --version`).toString().trim()
    assert.equal(reported_nushell_version, nushell_version, "reported nushell version did not match expected version")
  }

  return nu_bin
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

function is_musl() {
  const stderr = child_process.spawnSync("ldd", ["--version"]).stderr.toString()
  return stderr.indexOf("musl") > -1
}
