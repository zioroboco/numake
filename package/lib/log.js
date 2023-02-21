// @ts-check

const { NUMAKE_DEBUG } = process.env

export function make_loggers(loglevel = "warn") {
	if (NUMAKE_DEBUG) {
		loglevel = "debug"
	}

	/** @type {typeof console.debug} */
	let debug = () => { }
	/** @type {typeof console.info} */
	let info = () => { }
	/** @type {typeof console.warn} */
	let warn = () => { }
	/** @type {typeof console.error} */
	let error = () => { }

	switch (loglevel) {
		case "debug":
			debug = console.debug
		case "info":
			info = console.info
		case "warn":
			warn = console.warn
		case "error":
			error = console.error
	}

	return {
		debug,
		info,
		warn,
		error,
	}
}
