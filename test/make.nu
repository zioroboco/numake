def test [argument: string] {
	if ($argument != "success") {
		error make {
			msg: "❌ fail"
		}
	}
	echo "✅ success"
}
