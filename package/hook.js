#!/usr/bin/env node
// @ts-check

const { NUMAKE_DEBUG } = process.env

import { install } from "./lib/install.js"
import { make_loggers } from "./lib/log.js"

const log = make_loggers()

install(log).then(() => {
  process.exit(0)
}).catch((err) => {
  if (NUMAKE_DEBUG) log.error(err)
  process.exit(1)
})
