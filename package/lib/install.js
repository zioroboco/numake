// @ts-check

const {
  NUMAKE_DEBUG,
  XDG_DATA_HOME,
} = process.env

import assert from "node:assert"
import child_process from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import url from "node:url"

/**
 * @param loggers {ReturnType<typeof import("./log.js").make_loggers>}
 * @returns {Promise<{ nu_bin: string, nu_version: string, numake_version: string }>}
 */
export async function install({ info }) {
  const package_dir = url.fileURLToPath(new URL("..", import.meta.url))
  const package_meta = JSON.parse(await fs.promises.readFile(path.join(package_dir, "package.json"), "utf8"))
  const [nu_version, numake_version] = package_meta["version"].split("-")
  info(`nushell version: ${nu_version}`)
  info(`numake version: ${numake_version}`)

  const data_dir = XDG_DATA_HOME ? path.join(XDG_DATA_HOME, "numake") : path.join(package_dir, ".cache")
  info(`data directory: ${data_dir}`)

  const bin_dir = path.join(data_dir, "versions", nu_version, "bin")
  const nu_bin = path.join(bin_dir, "nu")

  if (fs.existsSync(nu_bin)) {
    info(`found matching nushell version, skipping install`)
  } else {
    const platform = get_platform(process)
    info(`platform: ${platform}`)

    const store_dir = path.join(data_dir, "store")
    await fs.promises.mkdir(store_dir, { recursive: true })

    const nu_release = `nu-${nu_version}-${platform}`
    const nu_release_filename = `${nu_release}.tar.gz`
    info(`nushell release: ${nu_release}`)

    if (fs.existsSync(path.join(store_dir, nu_release_filename))) {
      info(`found release in store, skipping download`)
    } else {
      info(`release does not exist in store, downloading...`)
      await fetch(`https://github.com/nushell/nushell/releases/download/${nu_version}/${nu_release_filename}`)
        .then(response => response.arrayBuffer())
        .then(array_buffer => fs.promises.writeFile(path.join(store_dir, nu_release_filename), Buffer.from(array_buffer)))
    }

    info(`extracting nushell binary...`)
    await fs.promises.mkdir(bin_dir, { recursive: true })
    child_process.execSync(`tar -xzf ${nu_release_filename} -C ${bin_dir} --strip-components=1 ${nu_release}/nu`, { cwd: store_dir })
  }

  if (NUMAKE_DEBUG) {
    const reported_nushell_version = child_process.execSync(`${nu_bin} --version`).toString().trim()
    assert.equal(reported_nushell_version, nu_version, "reported nushell version did not match expected version")
  }

  return {
    nu_bin,
    nu_version,
    numake_version,
  }
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
