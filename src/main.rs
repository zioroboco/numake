use std::env;
use std::error::Error;
use std::fmt::Write as FmtWrite;
use std::fs::File;
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{exit, Command, ExitStatus, Output};
use tempdir::TempDir;

const MAKEFILE_NAME: &str = "make.nu";

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<_> = env::args().collect();

    let cwd = env::current_dir()?;
    let makefile = match find_makefile(&cwd) {
        Some(path) => path,
        None => {
            eprintln!("Could not find {} file", &MAKEFILE_NAME);
            exit(1);
        }
    };

    if args.len() < 2 || args[1] == "--list" {
        let result = list(&makefile)?;
        if !result.stderr.is_empty() {
            eprintln!("{}", String::from_utf8(result.stderr)?);
            exit(1);
        }
        println!("Commands:\n{}", String::from_utf8(result.stdout)?);
        println!("Run '<command> --help' for more information.");
        exit(0)
    }

    if args[1] == "--interactive" {
        let status = interactive(&makefile)?;
        exit(status.code().unwrap_or(1))
    }

    let result = run(&makefile, &args[1..].join(" "))?;

    if !result.status.success() {
        eprint!("{}", String::from_utf8(result.stderr)?);
        exit(result.status.code().unwrap_or(1));
    }

    println!("{}", String::from_utf8(result.stdout)?);

    Ok(())
}

fn run(makefile: &Path, cmd: &str) -> Result<Output, io::Error> {
    Command::new("nu")
        .args(["--env-config", makefile.to_str().unwrap()])
        .args(["-c", cmd])
        .output()
}

static BLUE: &str = "\x1b[34m";
static GREEN: &str = "\x1b[32m";
static GREY: &str = "\x1b[90m";
static RESET: &str = "\x1b[0m";

fn interactive(makefile: &Path) -> Result<ExitStatus, io::Error> {
    let temp_dir = TempDir::new("numake")?;
    let temp_env_path = temp_dir.path().join("env.nu");

    let mut temp_env_data = String::new();

    let makefile_dir = makefile.parent().unwrap();
    let makefile_dir_basename = makefile_dir.file_name().unwrap();

    let _ = write!(
        temp_env_data,
        r#"
            let-env PROMPT_COMMAND_RIGHT = {{""}}
            let-env PROMPT_COMMAND = {{
                [
                    "{green}(numake){reset} {blue}",
                    (
                        ["{makefile_dir_basename}", ($env.PWD | path relative-to {makefile_dir})]
                        | where {{ |it| $it != "" }}
                        | str collect "/"
                    ),
                    "{reset} ",
                ] | str collect
            }}
        "#,
        makefile_dir_basename = makefile_dir_basename.to_str().unwrap(),
        makefile_dir = makefile_dir.to_str().unwrap(),
        blue = BLUE,
        green = GREEN,
        reset = RESET,
    );

    let mut makefile_content = File::open(makefile)?;
    makefile_content.read_to_string(&mut temp_env_data)?;

    let mut temp_file = File::create(&temp_env_path)?;
    write!(temp_file, "{}", temp_env_data)?;

    let status = Command::new("nu")
        .args(["--env-config", temp_env_path.to_str().unwrap()])
        .spawn()?
        .wait();

    drop(temp_file);
    temp_dir.close()?;

    status
}

fn list(makefile: &Path) -> Result<Output, io::Error> {
    run(
        makefile,
        &format!(
            r#"
                help commands
                | where command_type == custom
                | each {{
                    |row| {{
                        name: $row.name,
                        usage: (
                            if $row.usage != "" {{
                                [" # ", ($row.usage | str replace "\n.*" "")] | str collect
                            }}
                        )
                    }}
                }}
                | format "    {{name}}{grey}{{usage}}{reset}"
                | to text
            "#,
            grey = GREY,
            reset = RESET
        ),
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
