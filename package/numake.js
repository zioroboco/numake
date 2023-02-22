#!/usr/bin/env node
// @ts-check

const { NUMAKE_DEBUG } = process.env

import child_process from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import { install } from "./lib/install.js"
import { make_loggers } from "./lib/log.js"

const log = make_loggers()
const { info, error } = log

const MAKEFILE_NAME = "make.nu"

async function main() {
  info(`--- numake ---`)

  const nushell = await install(log)

  const project_path = findup_or_else(MAKEFILE_NAME)
  const makefile_path = path.join(project_path, MAKEFILE_NAME)
  info(`located makefile: ${path.relative(process.cwd(), makefile_path)}`)

  const [_node, _numake, first, ...rest] = process.argv
  const cmd = [first, ...rest].join(" ")
  info(`running command: ${cmd}`)

  child_process.execSync(`${nushell.bin} --env-config=${makefile_path} -c "${cmd}"`, { cwd: project_path, stdio: "inherit" })
}

/**
 * @param target {string}
 * @returns {string}
 */
function findup_or_else(target, cwd = process.cwd()) {
  if (cwd === "/") {
    throw new Error(`could not locate file ${target} from ${process.cwd()}`)
  }

  const contains_target = fs.readdirSync(cwd, { withFileTypes: true })
    .some(dirent => dirent.isFile() && dirent.name === target)

  if (contains_target) {
    return cwd
  } else {
    return findup_or_else(target, path.resolve(cwd, ".."))
  }
}

main().then(() => {
  info("done")
  process.exit(0)
}).catch((err) => {
  if (NUMAKE_DEBUG) error(err)
  process.exit(1)
})
