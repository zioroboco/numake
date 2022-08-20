# introduces a bee
def bee [
    name: string # the name of the bee
] {
    echo "🐝 — hello, my name is " $name "!" | str collect
}

# goes blep
def blep [] {
    echo 😛
}

def unhelpful [] {
    echo 🤷
}
