use std::env;
use std::error::Error;
use std::path::{Path, PathBuf};
use std::process::{exit, Command};

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

    let result = Command::new("nu")
        .args(["--env-config", makefile.to_str().unwrap()])
        .args(["-c", &args[1..].join(" ")])
        .output()
        .unwrap();

    println!("{}", String::from_utf8(result.stdout)?);

    Ok(())
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
