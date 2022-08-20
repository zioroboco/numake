use std::env;
use std::error::Error;
use std::process::Command;

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<_> = env::args().collect();

    if args.len() < 2 {
        return Err(From::from("no command given"));
    }

    let result = Command::new("nu")
        .args([
            "--env-config",
            env::current_dir()?.join("make.nu").to_str().unwrap(),
        ])
        .args(["-c", &args[1..].join(" ")])
        .output()
        .unwrap();

    println!("{}", String::from_utf8(result.stdout)?);

    Ok(())
}
