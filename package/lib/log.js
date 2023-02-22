// @ts-check

const { NUMAKE_DEBUG } = process.env

export function make_loggers(loglevel = "warn") {
	if (NUMAKE_DEBUG) {
		loglevel = "info"
	}

	/** @type {typeof console.info} */
	let info = () => { }
	/** @type {typeof console.warn} */
	let warn = () => { }
	/** @type {typeof console.error} */
	let error = () => { }

	switch (loglevel) {
		case "info":
			info = console.debug
		case "warn":
			warn = console.warn
		case "error":
			error = console.error
	}

	return {
		info,
		warn,
		error,
	}
}
