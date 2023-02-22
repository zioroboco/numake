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

  const { nu_bin, nu_version, numake_version } = await install(log)

  const project_path = findup_or_else(MAKEFILE_NAME)
  const makefile_path = path.join(project_path, MAKEFILE_NAME)
  info(`located makefile: ${path.relative(process.cwd(), makefile_path)}`)

  const [_node, _numake, first, ...rest] = process.argv
  const cmd = [first, ...rest].join(" ")
  info(`running command: ${cmd}`)

  if (first === "--version" || first === "-v") {
    process.stdout.write(`${nu_version}-${numake_version}`)
    return
  }

  if (first === "--list" || first === "-l") {
    process.stdout.write("commands:\n")
    child_process.execSync(`${nu_bin} --env-config=${makefile_path} -c '${nu_list}'`, { cwd: project_path, stdio: "inherit" })
    process.stdout.write(`${colour.grey}help: <command> --help${colour.reset}`)
    return
  }

  child_process.execSync(`${nu_bin} --env-config=${makefile_path} -c '${cmd}'`, { cwd: project_path, stdio: "inherit" })
}

const colour = {
  reset: "\x1b[0m",
  grey: "\x1b[90m",
}

const nu_list = `
  help commands
    | where command_type == custom
    | each {
      |row| {
        name: $row.name,
        usage: (
          if $row.usage != "" {
            [" # ", ($row.usage | str replace "\n.*" "")] | str collect
          }
        )
      }
    }
    | format $"    {name}${colour.grey}{usage}${colour.reset}"
    | to text
`

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
