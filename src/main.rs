use std::env;
use std::error::Error;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{exit, Command, Output};

const MAKEFILE_NAME: &str = "make.nu";

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<_> = env::args().collect();

    let cwd = env::current_dir()?;
    let makefile = match find_makefile(&cwd) {
        Some(path) => path,
        None => {
            eprintln!("could not find {} file", &MAKEFILE_NAME);
            exit(1);
        }
    };

    if args.len() < 2 {
        return Err(From::from("no command given"));
    }

    if args[1] == "--list" {
        let result = list(&makefile)?;
        println!("Commands:\n{}", String::from_utf8(result.stdout)?);
        exit(0)
    }

    let result = run(&makefile, &args[1..].join(" "))?;

    if !result.status.success() {
        eprint!("{}", String::from_utf8(result.stderr)?);
        exit(result.status.code().unwrap_or(1));
    }

    print!("{}", String::from_utf8(result.stdout)?);

    Ok(())
}

fn run(makefile: &Path, cmd: &str) -> Result<Output, io::Error> {
    Command::new("nu")
        .args(["--env-config", makefile.to_str().unwrap()])
        .args(["-c", cmd])
        .output()
}

fn list(makefile: &Path) -> Result<Output, io::Error> {
    run(
        makefile,
        "help commands | where is_custom == true | format '    {name} # {usage}' | to text",
    )
}

fn find_makefile(starting_dir: &PathBuf) -> Option<PathBuf> {
    let mut path: PathBuf = starting_dir.into();
    loop {
        path.push(Path::new(MAKEFILE_NAME));
        if path.is_file() {
            break Some(path);
        }
        if !(path.pop() && path.pop()) {
            break None;
        }
    }
}
