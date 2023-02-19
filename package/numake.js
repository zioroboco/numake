#!/usr/bin/env node
// @ts-check

async function main() {
  console.log("beep")
}

main().then(() => {
  console.log("done")
  process.exit(0)
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
