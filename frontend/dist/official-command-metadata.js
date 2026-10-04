/* Generated from the locked Sliver Cobra command trees. */
(function (root, metadata) {
  if (typeof module === 'object' && module.exports) module.exports = metadata;
  root.OfficialCommandMetadata = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this, {
  "agent": {
    "ai": {
      "path": "ai",
      "usage": "ai",
      "summary": "Open the Sliver AI conversation TUI"
    },
    "aka": {
      "path": "aka",
      "usage": "aka",
      "summary": "Manage command aliases (aka's)",
      "subcommands": [
        "create",
        "delete"
      ]
    },
    "aka create": {
      "path": "aka create",
      "usage": "aka create \u003calias\u003e \u003ccommand\u003e [args...]",
      "summary": "Create a new command alias (aka)",
      "options": [
        {
          "name": "help",
          "short": "h",
          "type": "bool",
          "default": "false",
          "description": "help for create"
        }
      ]
    },
    "aka delete": {
      "path": "aka delete",
      "usage": "aka delete \u003calias\u003e",
      "summary": "Delete a command alias (aka)"
    },
    "backdoor": {
      "path": "backdoor",
      "usage": "backdoor [flags]",
      "summary": "Infect a remote file with a sliver shellcode",
      "options": [
        {
          "name": "profile",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "profile to use for service binary"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "background": {
      "path": "background",
      "usage": "background [flags]",
      "summary": "Background an active session",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "cat": {
      "path": "cat",
      "usage": "cat [flags]",
      "summary": "Dump file to stdout",
      "options": [
        {
          "name": "colorize-output",
          "short": "c",
          "type": "bool",
          "default": "false",
          "description": "colorize output"
        },
        {
          "name": "file-type",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "force a specific file type (binary/text) if looting (optional)"
        },
        {
          "name": "hex",
          "short": "x",
          "type": "bool",
          "default": "false",
          "description": "display as a hex dump"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "type",
          "short": "T",
          "type": "string",
          "default": "",
          "description": "force a specific loot type (file/cred) if looting (optional)"
        }
      ]
    },
    "cd": {
      "path": "cd",
      "usage": "cd [flags]",
      "summary": "Change directory",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "chmod": {
      "path": "chmod",
      "usage": "chmod [flags]",
      "summary": "Change permissions on a file or directory",
      "options": [
        {
          "name": "recursive",
          "short": "r",
          "type": "bool",
          "default": "false",
          "description": "recursively change permissions on files"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "chown": {
      "path": "chown",
      "usage": "chown [flags]",
      "summary": "Change owner on a file or directory",
      "options": [
        {
          "name": "recursive",
          "short": "r",
          "type": "bool",
          "default": "false",
          "description": "recursively change permissions on files"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "chtimes": {
      "path": "chtimes",
      "usage": "chtimes [flags]",
      "summary": "Change access and modification times on a file (timestomp)",
      "options": [
        {
          "name": "rfc1123",
          "type": "bool",
          "default": "false",
          "description": "interpret timestamps as RFC1123"
        },
        {
          "name": "rfc3339",
          "type": "bool",
          "default": "false",
          "description": "interpret timestamps as RFC3339"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "unix",
          "type": "bool",
          "default": "false",
          "description": "interpret timestamps as Unix seconds"
        },
        {
          "name": "unix-ms",
          "type": "bool",
          "default": "false",
          "description": "interpret timestamps as Unix milliseconds"
        }
      ]
    },
    "close": {
      "path": "close",
      "usage": "close [flags]",
      "summary": "Close an interactive session without killing the remote process",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "cp": {
      "path": "cp",
      "usage": "cp [flags]",
      "summary": "Copy a file",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "cursed": {
      "path": "cursed",
      "usage": "cursed",
      "summary": "Chrome/electron post-exploitation tool kit (∩｀-´)⊃━☆ﾟ.*･｡ﾟ",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "chrome",
        "console",
        "cookies",
        "edge",
        "electron",
        "rm",
        "screenshot"
      ]
    },
    "cursed chrome": {
      "path": "cursed chrome",
      "usage": "cursed chrome [flags]",
      "summary": "Automatically inject a Cursed Chrome payload into a remote Chrome extension",
      "options": [
        {
          "name": "exe",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "chrome/chromium browser executable path (blank string = auto)"
        },
        {
          "name": "headless",
          "short": "H",
          "type": "bool",
          "default": "false",
          "description": "start browser process in headless mode"
        },
        {
          "name": "keep-alive",
          "short": "k",
          "type": "bool",
          "default": "false",
          "description": "keeps browser alive after last browser window closes"
        },
        {
          "name": "payload",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "cursed chrome payload file path (.js)"
        },
        {
          "name": "remote-debugging-port",
          "short": "r",
          "type": "int",
          "default": "0",
          "description": "remote debugging tcp port (0 = random)"
        },
        {
          "name": "restore",
          "short": "R",
          "type": "bool",
          "default": "true",
          "description": "restore the user's session after process termination"
        },
        {
          "name": "user-data",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "user data directory (blank string = auto)"
        }
      ]
    },
    "cursed console": {
      "path": "cursed console",
      "usage": "cursed console [flags]",
      "summary": "Start a JavaScript console connected to a debug target",
      "options": [
        {
          "name": "remote-debugging-port",
          "short": "r",
          "type": "int",
          "default": "0",
          "description": "remote debugging tcp port (0 = random)`"
        }
      ]
    },
    "cursed cookies": {
      "path": "cursed cookies",
      "usage": "cursed cookies [flags]",
      "summary": "Dump all cookies from cursed process",
      "options": [
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "save to file"
        }
      ]
    },
    "cursed edge": {
      "path": "cursed edge",
      "usage": "cursed edge [flags]",
      "summary": "Automatically inject a Cursed Chrome payload into a remote Edge extension",
      "options": [
        {
          "name": "exe",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "edge browser executable path (blank string = auto)"
        },
        {
          "name": "headless",
          "short": "H",
          "type": "bool",
          "default": "false",
          "description": "start browser process in headless mode"
        },
        {
          "name": "keep-alive",
          "short": "k",
          "type": "bool",
          "default": "false",
          "description": "keeps browser alive after last browser window closes"
        },
        {
          "name": "payload",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "cursed chrome payload file path (.js)"
        },
        {
          "name": "remote-debugging-port",
          "short": "r",
          "type": "int",
          "default": "0",
          "description": "remote debugging tcp port (0 = random)"
        },
        {
          "name": "restore",
          "short": "R",
          "type": "bool",
          "default": "true",
          "description": "restore the user's session after process termination"
        },
        {
          "name": "user-data",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "user data directory (blank string = auto)"
        }
      ]
    },
    "cursed electron": {
      "path": "cursed electron",
      "usage": "cursed electron [flags]",
      "summary": "Curse a remote Electron application",
      "options": [
        {
          "name": "exe",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "remote electron executable absolute path"
        },
        {
          "name": "remote-debugging-port",
          "short": "r",
          "type": "int",
          "default": "0",
          "description": "remote debugging tcp port (0 = random)"
        }
      ]
    },
    "cursed rm": {
      "path": "cursed rm",
      "usage": "cursed rm [flags]",
      "summary": "Remove a Curse from a process",
      "options": [
        {
          "name": "kill",
          "short": "k",
          "type": "bool",
          "default": "false",
          "description": "kill the process after removing the curse"
        }
      ]
    },
    "cursed screenshot": {
      "path": "cursed screenshot",
      "usage": "cursed screenshot [flags]",
      "summary": "Take a screenshot of a cursed process debug target",
      "options": [
        {
          "name": "quality",
          "short": "q",
          "type": "int",
          "default": "100",
          "description": "screenshot quality (1 - 100)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "save to file"
        }
      ]
    },
    "dllhijack": {
      "path": "dllhijack",
      "usage": "dllhijack [flags]",
      "summary": "Plant a DLL for a hijack scenario",
      "options": [
        {
          "name": "file",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "Local path to the DLL to plant for the hijack"
        },
        {
          "name": "profile",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "Profile name to use as a base DLL"
        },
        {
          "name": "reference-file",
          "short": "R",
          "type": "string",
          "default": "",
          "description": "Path to the reference DLL on the local system"
        },
        {
          "name": "reference-path",
          "short": "r",
          "type": "string",
          "default": "",
          "description": "Path to the reference DLL on the remote system"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "docs": {
      "path": "docs",
      "usage": "docs",
      "summary": "Browse the embedded Sliver docs in a TUI"
    },
    "download": {
      "path": "download",
      "usage": "download [flags]",
      "summary": "Download a file",
      "options": [
        {
          "name": "file-type",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "force a specific file type (binary/text) if looting"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign the download if looting"
        },
        {
          "name": "recurse",
          "short": "r",
          "type": "bool",
          "default": "false",
          "description": "recursively download all files in a directory"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "type",
          "short": "T",
          "type": "string",
          "default": "",
          "description": "force a specific loot type (file/cred) if looting"
        }
      ]
    },
    "edit": {
      "path": "edit",
      "usage": "edit [flags]",
      "summary": "Edit a remote text file",
      "options": [
        {
          "name": "line-numbers",
          "type": "bool",
          "default": "false",
          "description": "show line numbers"
        },
        {
          "name": "syntax",
          "type": "string",
          "default": "",
          "description": "syntax highlighting lexer name (optional)"
        },
        {
          "name": "syntax-select",
          "type": "bool",
          "default": "false",
          "description": "prompt to select syntax highlighting lexer"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "env": {
      "path": "env",
      "usage": "env",
      "summary": "List environment variables",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "set",
        "unset"
      ]
    },
    "env set": {
      "path": "env set",
      "usage": "env set",
      "summary": "Set environment variables"
    },
    "env unset": {
      "path": "env unset",
      "usage": "env unset",
      "summary": "Clear environment variables"
    },
    "execute": {
      "path": "execute",
      "usage": "execute [flags]",
      "summary": "Execute a program on the remote system",
      "options": [
        {
          "name": "background",
          "type": "bool",
          "default": "false",
          "description": "start the process in the background and track it"
        },
        {
          "name": "env",
          "type": "stringArray",
          "default": "[]",
          "description": "set an environment variable for the child process (key=value)"
        },
        {
          "name": "env-inheritance",
          "type": "bool",
          "default": "false",
          "description": "inherit environment variables from the current process"
        },
        {
          "name": "hidden",
          "short": "H",
          "type": "bool",
          "default": "false",
          "description": "hide the window of the spawned process (Windows only)"
        },
        {
          "name": "ignore-stderr",
          "short": "S",
          "type": "bool",
          "default": "false",
          "description": "don't print STDERR output"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "output",
          "short": "o",
          "type": "bool",
          "default": "true",
          "description": "capture command output"
        },
        {
          "name": "ppid",
          "short": "P",
          "type": "uint",
          "default": "0",
          "description": "parent process id (optional, Windows only)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "save output to a file"
        },
        {
          "name": "stderr",
          "short": "E",
          "type": "string",
          "default": "",
          "description": "remote path to redirect STDERR to"
        },
        {
          "name": "stdout",
          "short": "O",
          "type": "string",
          "default": "",
          "description": "remote path to redirect STDOUT to"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "token",
          "short": "T",
          "type": "bool",
          "default": "false",
          "description": "execute command with current token (Windows only)"
        }
      ],
      "subcommands": [
        "children"
      ]
    },
    "execute children": {
      "path": "execute children",
      "usage": "execute children [flags]",
      "summary": "List tracked background execute child processes",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "execute-assembly": {
      "path": "execute-assembly",
      "usage": "execute-assembly [flags]",
      "summary": "Loads and executes a .NET assembly in a child process (Windows Only)",
      "options": [
        {
          "name": "amsi-bypass",
          "short": "M",
          "type": "bool",
          "default": "false",
          "description": "Bypass AMSI on Windows (only supported when used with --in-process)"
        },
        {
          "name": "app-domain",
          "short": "d",
          "type": "string",
          "default": "",
          "description": "AppDomain name to create for .NET assembly. Generated randomly if not set."
        },
        {
          "name": "arch",
          "short": "a",
          "type": "string",
          "default": "x84",
          "description": "Assembly target architecture: x86, x64, x84 (x86+x64)"
        },
        {
          "name": "class",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "Optional class name (required for .NET DLL)"
        },
        {
          "name": "etw-bypass",
          "short": "E",
          "type": "bool",
          "default": "false",
          "description": "Bypass ETW on Windows (only supported when used with --in-process)"
        },
        {
          "name": "in-process",
          "short": "i",
          "type": "bool",
          "default": "false",
          "description": "Run in the current sliver process"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "method",
          "short": "m",
          "type": "string",
          "default": "",
          "description": "Optional method (a method is required for a .NET DLL)"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "ppid",
          "short": "P",
          "type": "uint",
          "default": "0",
          "description": "parent process id (optional)"
        },
        {
          "name": "process",
          "short": "p",
          "type": "string",
          "default": "notepad.exe",
          "description": "hosting process to inject into"
        },
        {
          "name": "process-arguments",
          "short": "A",
          "type": "string",
          "default": "",
          "description": "arguments to pass to the hosting process"
        },
        {
          "name": "runtime",
          "short": "r",
          "type": "string",
          "default": "",
          "description": "Runtime to use for running the assembly (only supported when used with --in-process)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "save output to file"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "execute-shellcode": {
      "path": "execute-shellcode",
      "usage": "execute-shellcode [flags]",
      "summary": "Executes the given shellcode in the sliver process",
      "options": [
        {
          "name": "architecture",
          "short": "A",
          "type": "string",
          "default": "amd64",
          "description": "architecture of the shellcode: 386, amd64 (used with --shikata-ga-nai flag)"
        },
        {
          "name": "interactive",
          "short": "i",
          "type": "bool",
          "default": "false",
          "description": "Inject into a new process and interact with it"
        },
        {
          "name": "iterations",
          "short": "I",
          "type": "uint",
          "default": "1",
          "description": "number of encoding iterations (used with --shikata-ga-nai flag)"
        },
        {
          "name": "pid",
          "short": "p",
          "type": "uint",
          "default": "0",
          "description": "Pid of process to inject into (0 means injection into ourselves)"
        },
        {
          "name": "process",
          "short": "n",
          "type": "string",
          "default": "c:\\windows\\system32\\notepad.exe",
          "description": "Process to inject into when running in interactive mode"
        },
        {
          "name": "rwx-pages",
          "short": "r",
          "type": "bool",
          "default": "false",
          "description": "Use RWX permissions for memory pages"
        },
        {
          "name": "shellcode-bypass",
          "type": "uint",
          "default": "3",
          "description": "Shellcode bypass mode (Donut: 1=none, 2=abort, 3=continue) (windows PE input only)"
        },
        {
          "name": "shellcode-compress",
          "type": "bool",
          "default": "false",
          "description": "Enable shellcode compression (aPLib) (windows PE input only)"
        },
        {
          "name": "shellcode-entropy",
          "type": "uint",
          "default": "1",
          "description": "Shellcode entropy (Donut: 1=none, 2=random names, 3=random+encrypt) (windows PE input only)"
        },
        {
          "name": "shellcode-exitopt",
          "type": "uint",
          "default": "1",
          "description": "Shellcode exit option (Donut: 1=exit thread, 2=exit process, 3=block) (windows PE input only)"
        },
        {
          "name": "shellcode-headers",
          "type": "uint",
          "default": "1",
          "description": "Shellcode headers handling (Donut: 1=overwrite, 2=keep) (windows PE input only)"
        },
        {
          "name": "shellcode-oep",
          "type": "uint",
          "default": "0",
          "description": "Override original entry point (OEP) (Donut) (windows PE input only)"
        },
        {
          "name": "shellcode-thread",
          "type": "bool",
          "default": "false",
          "description": "Run unmanaged EXE entrypoint as a new thread (Donut) (windows PE input only)"
        },
        {
          "name": "shellcode-unicode",
          "type": "bool",
          "default": "false",
          "description": "Use Unicode command line for unmanaged DLL entrypoints (Donut) (windows PE input only)"
        },
        {
          "name": "shikata-ga-nai",
          "short": "S",
          "type": "bool",
          "default": "false",
          "description": "encode shellcode using shikata ga nai prior to execution"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "extensions": {
      "path": "extensions",
      "usage": "extensions",
      "summary": "Manage extensions",
      "subcommands": [
        "list"
      ]
    },
    "extensions list": {
      "path": "extensions list",
      "usage": "extensions list [flags]",
      "summary": "List extensions loaded in the current session",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "getgid": {
      "path": "getgid",
      "usage": "getgid [flags]",
      "summary": "Get session process GID",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "getpid": {
      "path": "getpid",
      "usage": "getpid [flags]",
      "summary": "Get session pid",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "getprivs": {
      "path": "getprivs",
      "usage": "getprivs [flags]",
      "summary": "Get current privileges (Windows only)",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "getsystem": {
      "path": "getsystem",
      "usage": "getsystem [flags]",
      "summary": "Spawns a new sliver session as the NT AUTHORITY\\SYSTEM user (Windows Only)",
      "options": [
        {
          "name": "process",
          "short": "p",
          "type": "string",
          "default": "spoolsv.exe",
          "description": "SYSTEM process to inject into"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "getuid": {
      "path": "getuid",
      "usage": "getuid [flags]",
      "summary": "Get session process UID",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "grep": {
      "path": "grep",
      "usage": "grep [flags]",
      "summary": "Search for strings that match a regex within a file or directory",
      "options": [
        {
          "name": "after",
          "short": "A",
          "type": "int",
          "default": "0",
          "description": "number of lines to print after a match (ignored if the file is binary)"
        },
        {
          "name": "before",
          "short": "B",
          "type": "int",
          "default": "0",
          "description": "number of lines to print before a match (ignored if the file is binary)"
        },
        {
          "name": "colorize-output",
          "short": "c",
          "type": "bool",
          "default": "false",
          "description": "colorize output"
        },
        {
          "name": "context",
          "short": "C",
          "type": "int",
          "default": "0",
          "description": "number of lines to print before and after a match (ignored if the file is binary), equivalent to -A x -B x"
        },
        {
          "name": "exact",
          "short": "e",
          "type": "bool",
          "default": "false",
          "description": "match the search term exactly"
        },
        {
          "name": "insensitive",
          "short": "i",
          "type": "bool",
          "default": "false",
          "description": "case-insensitive search"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot (loot is saved without formatting)"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "recursive",
          "short": "r",
          "type": "bool",
          "default": "false",
          "description": "search recursively"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "type",
          "short": "T",
          "type": "string",
          "default": "",
          "description": "force a specific loot type (file/cred) if looting (optional)"
        }
      ]
    },
    "head": {
      "path": "head",
      "usage": "head [flags]",
      "summary": "Grab the first number of bytes or lines from a file",
      "options": [
        {
          "name": "bytes",
          "short": "b",
          "type": "int",
          "default": "0",
          "description": "Grab the first number of bytes from the file"
        },
        {
          "name": "colorize-output",
          "short": "c",
          "type": "bool",
          "default": "false",
          "description": "colorize output"
        },
        {
          "name": "file-type",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "force a specific file type (binary/text) if looting (optional)"
        },
        {
          "name": "hex",
          "short": "x",
          "type": "bool",
          "default": "false",
          "description": "display as a hex dump"
        },
        {
          "name": "lines",
          "short": "l",
          "type": "int",
          "default": "10",
          "description": "Grab the first number of lines from the file"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "type",
          "short": "T",
          "type": "string",
          "default": "",
          "description": "force a specific loot type (file/cred) if looting (optional)"
        }
      ]
    },
    "help": {
      "path": "help",
      "usage": "help [command]",
      "summary": "Help about any command"
    },
    "hex-edit": {
      "path": "hex-edit",
      "usage": "hex-edit \u003cremote path\u003e [flags]",
      "summary": "Hex edit a remote file",
      "options": [
        {
          "name": "max-size",
          "type": "string",
          "default": "8MB",
          "description": "maximum file size to load (e.g. 8MB, 512KB)"
        },
        {
          "name": "offset",
          "type": "int",
          "default": "0",
          "description": "byte offset to jump to (decimal or 0x...)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "ifconfig": {
      "path": "ifconfig",
      "usage": "ifconfig [flags]",
      "summary": "View network interface configurations",
      "options": [
        {
          "name": "all",
          "short": "A",
          "type": "bool",
          "default": "false",
          "description": "show all network adapters (default only shows IPv4)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "impersonate": {
      "path": "impersonate",
      "usage": "impersonate [flags]",
      "summary": "Impersonate a logged in user.",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "30",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "info": {
      "path": "info",
      "usage": "info [flags]",
      "summary": "Get session info",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "interactive": {
      "path": "interactive",
      "usage": "interactive [flags]",
      "summary": "Task a beacon to open an interactive session (Beacon only)",
      "options": [
        {
          "name": "delay",
          "short": "d",
          "type": "string",
          "default": "0s",
          "description": "delay opening the session (after checkin) for a given period of time"
        },
        {
          "name": "dns",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "dns connection strings"
        },
        {
          "name": "http",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "http(s) connection strings"
        },
        {
          "name": "mtls",
          "short": "m",
          "type": "string",
          "default": "",
          "description": "mtls connection strings"
        },
        {
          "name": "named-pipe",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "namedpipe connection strings"
        },
        {
          "name": "tcp-pivot",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "tcppivot connection strings"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "wg",
          "short": "g",
          "type": "string",
          "default": "",
          "description": "wg connection strings"
        }
      ]
    },
    "kill": {
      "path": "kill",
      "usage": "kill [flags]",
      "summary": "Kill a session",
      "options": [
        {
          "name": "force",
          "short": "F",
          "type": "bool",
          "default": "false",
          "description": "Force kill,  does not clean up"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "ls": {
      "path": "ls",
      "usage": "ls [flags]",
      "summary": "List current directory",
      "options": [
        {
          "name": "modified",
          "short": "m",
          "type": "bool",
          "default": "false",
          "description": "sort by modified time"
        },
        {
          "name": "reverse",
          "short": "r",
          "type": "bool",
          "default": "false",
          "description": "reverse sort order"
        },
        {
          "name": "size",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "sort by size"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "make-token": {
      "path": "make-token",
      "usage": "make-token [flags]",
      "summary": "Create a new Logon Session with the specified credentials",
      "options": [
        {
          "name": "domain",
          "short": "d",
          "type": "string",
          "default": "",
          "description": "domain of the user to impersonate"
        },
        {
          "name": "logon-type",
          "short": "T",
          "type": "string",
          "default": "LOGON_NEW_CREDENTIALS",
          "description": "logon type to use"
        },
        {
          "name": "password",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "password of the user to impersonate"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "username",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "username of the user to impersonate"
        }
      ]
    },
    "memfiles": {
      "path": "memfiles",
      "usage": "memfiles",
      "summary": "List current memfiles",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "add",
        "rm"
      ]
    },
    "memfiles add": {
      "path": "memfiles add",
      "usage": "memfiles add",
      "summary": "Add a memfile"
    },
    "memfiles rm": {
      "path": "memfiles rm",
      "usage": "memfiles rm",
      "summary": "Remove a memfile"
    },
    "migrate": {
      "path": "migrate",
      "usage": "migrate [flags]",
      "summary": "Migrate into a remote process",
      "options": [
        {
          "name": "pid",
          "short": "p",
          "type": "uint",
          "default": "0",
          "description": "process id to migrate into"
        },
        {
          "name": "process-name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name of the process to migrate into"
        },
        {
          "name": "shellcode-encoder",
          "type": "string",
          "default": "",
          "description": "shellcode encoder to apply (optional; see `shellcode-encoders`)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "mkdir": {
      "path": "mkdir",
      "usage": "mkdir [flags]",
      "summary": "Make a directory",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "mount": {
      "path": "mount",
      "usage": "mount [flags]",
      "summary": "Get information on mounted filesystems",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "msf": {
      "path": "msf",
      "usage": "msf [flags]",
      "summary": "Execute an MSF payload in the current process",
      "options": [
        {
          "name": "encoder",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "msf encoder"
        },
        {
          "name": "iterations",
          "short": "i",
          "type": "int",
          "default": "1",
          "description": "iterations of the encoder"
        },
        {
          "name": "lhost",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "listen host"
        },
        {
          "name": "lport",
          "short": "l",
          "type": "int",
          "default": "4444",
          "description": "listen port"
        },
        {
          "name": "payload",
          "short": "m",
          "type": "string",
          "default": "meterpreter_reverse_https",
          "description": "msf payload"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "msf-inject": {
      "path": "msf-inject",
      "usage": "msf-inject [flags]",
      "summary": "Inject an MSF payload into a process",
      "options": [
        {
          "name": "encoder",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "msf encoder"
        },
        {
          "name": "iterations",
          "short": "i",
          "type": "int",
          "default": "1",
          "description": "iterations of the encoder"
        },
        {
          "name": "lhost",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "listen host"
        },
        {
          "name": "lport",
          "short": "l",
          "type": "int",
          "default": "4444",
          "description": "listen port"
        },
        {
          "name": "payload",
          "short": "m",
          "type": "string",
          "default": "meterpreter_reverse_https",
          "description": "msf payload"
        },
        {
          "name": "pid",
          "short": "p",
          "type": "int",
          "default": "-1",
          "description": "pid to inject into"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "mv": {
      "path": "mv",
      "usage": "mv [flags]",
      "summary": "Move or rename a file",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "netstat": {
      "path": "netstat",
      "usage": "netstat [flags]",
      "summary": "Print network connection information",
      "options": [
        {
          "name": "ip4",
          "short": "4",
          "type": "bool",
          "default": "true",
          "description": "display information about IPv4 sockets"
        },
        {
          "name": "ip6",
          "short": "6",
          "type": "bool",
          "default": "false",
          "description": "display information about IPv6 sockets"
        },
        {
          "name": "listen",
          "short": "l",
          "type": "bool",
          "default": "false",
          "description": "display information about listening sockets"
        },
        {
          "name": "numeric",
          "short": "n",
          "type": "bool",
          "default": "false",
          "description": "display numeric addresses (disable hostname resolution)"
        },
        {
          "name": "tcp",
          "short": "T",
          "type": "bool",
          "default": "true",
          "description": "display information about TCP sockets"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "udp",
          "short": "u",
          "type": "bool",
          "default": "false",
          "description": "display information about UDP sockets"
        }
      ]
    },
    "ping": {
      "path": "ping",
      "usage": "ping [flags]",
      "summary": "Send round trip message to implant (does not use ICMP)",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "pivots": {
      "path": "pivots",
      "usage": "pivots",
      "summary": "List pivots for active session",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "details",
        "graph",
        "named-pipe",
        "stop",
        "tcp"
      ]
    },
    "pivots details": {
      "path": "pivots details",
      "usage": "pivots details [flags]",
      "summary": "Get details of a pivot listener",
      "options": [
        {
          "name": "id",
          "short": "i",
          "type": "uint",
          "default": "0",
          "description": "id of the pivot listener to get details for"
        }
      ]
    },
    "pivots graph": {
      "path": "pivots graph",
      "usage": "pivots graph",
      "summary": "Get pivot listeners graph"
    },
    "pivots named-pipe": {
      "path": "pivots named-pipe",
      "usage": "pivots named-pipe [flags]",
      "summary": "Start a named pipe pivot listener",
      "options": [
        {
          "name": "allow-all",
          "short": "a",
          "type": "bool",
          "default": "false",
          "description": "allow all users to connect"
        },
        {
          "name": "bind",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "name of the named pipe to bind pivot listener"
        }
      ]
    },
    "pivots stop": {
      "path": "pivots stop",
      "usage": "pivots stop [flags]",
      "summary": "Stop a pivot listener",
      "options": [
        {
          "name": "id",
          "short": "i",
          "type": "uint",
          "default": "0",
          "description": "id of the pivot listener to stop"
        }
      ]
    },
    "pivots tcp": {
      "path": "pivots tcp",
      "usage": "pivots tcp [flags]",
      "summary": "Start a TCP pivot listener",
      "options": [
        {
          "name": "bind",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "remote interface to bind pivot listener"
        },
        {
          "name": "lport",
          "short": "l",
          "type": "uint",
          "default": "9898",
          "description": "tcp pivot listener port"
        }
      ]
    },
    "portfwd": {
      "path": "portfwd",
      "usage": "portfwd",
      "summary": "In-band TCP port forwarding",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "add",
        "rm"
      ]
    },
    "portfwd add": {
      "path": "portfwd add",
      "usage": "portfwd add [flags]",
      "summary": "Create a new port forwarding tunnel",
      "options": [
        {
          "name": "bind",
          "short": "b",
          "type": "string",
          "default": "127.0.0.1:8080",
          "description": "bind port forward to interface"
        },
        {
          "name": "keepalive",
          "short": "k",
          "type": "int",
          "default": "0",
          "description": "keepalive period in seconds (default 30s, -1 to disable)"
        },
        {
          "name": "remote",
          "short": "r",
          "type": "string",
          "default": "",
          "description": "remote target host:port (e.g., 10.0.0.1:445)"
        }
      ]
    },
    "portfwd rm": {
      "path": "portfwd rm",
      "usage": "portfwd rm [flags]",
      "summary": "Remove a port forwarding tunnel",
      "options": [
        {
          "name": "id",
          "short": "i",
          "type": "int",
          "default": "0",
          "description": "id of portfwd to remove"
        }
      ]
    },
    "procdump": {
      "path": "procdump",
      "usage": "procdump [flags]",
      "summary": "Dump process memory",
      "options": [
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "loot-name",
          "short": "N",
          "type": "string",
          "default": "",
          "description": "name to assign when adding the memory dump to the loot store (optional)"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "target process name"
        },
        {
          "name": "pid",
          "short": "p",
          "type": "int",
          "default": "-1",
          "description": "target pid"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "save to file (will overwrite if exists)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "ps": {
      "path": "ps",
      "usage": "ps [flags]",
      "summary": "List remote processes",
      "options": [
        {
          "name": "exe",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "filter based on executable name"
        },
        {
          "name": "full",
          "short": "f",
          "type": "bool",
          "default": "false",
          "description": "show full process metadata (owner, architecture, session information) -- may trigger EDR"
        },
        {
          "name": "overflow",
          "short": "O",
          "type": "bool",
          "default": "false",
          "description": "overflow terminal width (display truncated rows)"
        },
        {
          "name": "owner",
          "short": "o",
          "type": "string",
          "default": "",
          "description": "filter based on owner, must request full process metadata (-f)"
        },
        {
          "name": "pid",
          "short": "p",
          "type": "int",
          "default": "-1",
          "description": "filter based on pid"
        },
        {
          "name": "print-cmdline",
          "short": "c",
          "type": "bool",
          "default": "false",
          "description": "print command line arguments, must request full process metadata (-f)"
        },
        {
          "name": "skip-pages",
          "short": "S",
          "type": "int",
          "default": "0",
          "description": "skip the first n page(s)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "tree",
          "short": "T",
          "type": "bool",
          "default": "false",
          "description": "print process tree"
        }
      ]
    },
    "psexec": {
      "path": "psexec",
      "usage": "psexec [flags]",
      "summary": "Start a sliver service on a remote target",
      "options": [
        {
          "name": "binpath",
          "short": "b",
          "type": "string",
          "default": "c:\\windows\\temp",
          "description": "directory to which the executable will be uploaded"
        },
        {
          "name": "custom-exe",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "custom service executable to use instead of generating a new Sliver"
        },
        {
          "name": "profile",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "profile to use for service binary"
        },
        {
          "name": "service-description",
          "short": "d",
          "type": "string",
          "default": "Sliver implant",
          "description": "description of the service"
        },
        {
          "name": "service-name",
          "short": "s",
          "type": "string",
          "default": "Sliver",
          "description": "name that will be used to register the service"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "pwd": {
      "path": "pwd",
      "usage": "pwd [flags]",
      "summary": "Print working directory",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "reconfig": {
      "path": "reconfig",
      "usage": "reconfig [flags]",
      "summary": "Reconfigure the active beacon/session",
      "options": [
        {
          "name": "beacon-interval",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "beacon callback interval"
        },
        {
          "name": "beacon-jitter",
          "short": "j",
          "type": "string",
          "default": "",
          "description": "beacon callback jitter (random up to)"
        },
        {
          "name": "c2-uri",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "C2 URI to switch to"
        },
        {
          "name": "reconnect-interval",
          "short": "r",
          "type": "string",
          "default": "",
          "description": "reconnect interval for implant"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "registry": {
      "path": "registry",
      "usage": "registry",
      "summary": "Windows registry operations",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "create",
        "delete",
        "list-subkeys",
        "list-values",
        "read",
        "write"
      ]
    },
    "registry create": {
      "path": "registry create",
      "usage": "registry create [flags]",
      "summary": "Create a registry key",
      "options": [
        {
          "name": "hive",
          "short": "H",
          "type": "string",
          "default": "HKCU",
          "description": "registry hive"
        },
        {
          "name": "hostname",
          "short": "o",
          "type": "string",
          "default": "",
          "description": "remote host to write values to"
        }
      ]
    },
    "registry delete": {
      "path": "registry delete",
      "usage": "registry delete [flags]",
      "summary": "Remove a registry key",
      "options": [
        {
          "name": "hive",
          "short": "H",
          "type": "string",
          "default": "HKCU",
          "description": "registry hive"
        },
        {
          "name": "hostname",
          "short": "o",
          "type": "string",
          "default": "",
          "description": "remote host to remove value from"
        }
      ]
    },
    "registry list-subkeys": {
      "path": "registry list-subkeys",
      "usage": "registry list-subkeys [flags]",
      "summary": "List the sub keys under a registry key",
      "options": [
        {
          "name": "hive",
          "short": "H",
          "type": "string",
          "default": "HKCU",
          "description": "registry hive"
        },
        {
          "name": "hostname",
          "short": "o",
          "type": "string",
          "default": "",
          "description": "remote host to write values to"
        }
      ]
    },
    "registry list-values": {
      "path": "registry list-values",
      "usage": "registry list-values [flags]",
      "summary": "List the values for a registry key",
      "options": [
        {
          "name": "hive",
          "short": "H",
          "type": "string",
          "default": "HKCU",
          "description": "registry hive"
        },
        {
          "name": "hostname",
          "short": "o",
          "type": "string",
          "default": "",
          "description": "remote host to write values to"
        }
      ]
    },
    "registry read": {
      "path": "registry read",
      "usage": "registry read [flags]",
      "summary": "Read values from the Windows registry",
      "options": [
        {
          "name": "hive",
          "short": "H",
          "type": "string",
          "default": "HKCU",
          "description": "registry hive"
        },
        {
          "name": "hostname",
          "short": "o",
          "type": "string",
          "default": "",
          "description": "remote host to read values from"
        }
      ],
      "subcommands": [
        "hive"
      ]
    },
    "registry read hive": {
      "path": "registry read hive",
      "usage": "registry read hive [flags]",
      "summary": "Read a hive into a binary file",
      "options": [
        {
          "name": "hive",
          "short": "H",
          "type": "string",
          "default": "HKLM",
          "description": "root registry hive"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot (loot is saved without formatting)"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "location to store data, required if not looting"
        },
        {
          "name": "type",
          "short": "T",
          "type": "string",
          "default": "",
          "description": "force a specific loot type (file/cred) if looting (optional)"
        }
      ]
    },
    "registry write": {
      "path": "registry write",
      "usage": "registry write [flags]",
      "summary": "Write values to the Windows registry",
      "options": [
        {
          "name": "hive",
          "short": "H",
          "type": "string",
          "default": "HKCU",
          "description": "registry hive"
        },
        {
          "name": "hostname",
          "short": "o",
          "type": "string",
          "default": "",
          "description": "remote host to write values to"
        },
        {
          "name": "path",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "path to the binary file to write"
        },
        {
          "name": "type",
          "short": "T",
          "type": "string",
          "default": "string",
          "description": "type of the value to write (string, dword, qword, binary). If binary, you must provide a path to a file with --path"
        }
      ]
    },
    "rename": {
      "path": "rename",
      "usage": "rename [flags]",
      "summary": "Rename the active beacon/session",
      "options": [
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "change implant name to"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "rev2self": {
      "path": "rev2self",
      "usage": "rev2self [flags]",
      "summary": "Revert to self: lose stolen Windows token",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "30",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "rm": {
      "path": "rm",
      "usage": "rm [flags]",
      "summary": "Remove a file or directory",
      "options": [
        {
          "name": "force",
          "short": "F",
          "type": "bool",
          "default": "false",
          "description": "ignore safety and forcefully remove files"
        },
        {
          "name": "recursive",
          "short": "r",
          "type": "bool",
          "default": "false",
          "description": "recursively remove files"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "rportfwd": {
      "path": "rportfwd",
      "usage": "rportfwd",
      "summary": "reverse port forwardings",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "add",
        "rm"
      ]
    },
    "rportfwd add": {
      "path": "rportfwd add",
      "usage": "rportfwd add [flags]",
      "summary": "Add and start reverse port forwarding",
      "options": [
        {
          "name": "bind",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "bind address \u003cip\u003e:\u003cport\u003e for implants to listen on"
        },
        {
          "name": "keepalive",
          "short": "k",
          "type": "int",
          "default": "0",
          "description": "keepalive period in seconds (default 30s, -1 to disable)"
        },
        {
          "name": "remote",
          "short": "r",
          "type": "string",
          "default": "",
          "description": "remote address \u003cip\u003e:\u003cport\u003e connection is forwarded to"
        }
      ]
    },
    "rportfwd rm": {
      "path": "rportfwd rm",
      "usage": "rportfwd rm [flags]",
      "summary": "Stop and remove reverse port forwarding",
      "options": [
        {
          "name": "id",
          "short": "i",
          "type": "uint",
          "default": "0",
          "description": "id of portfwd to remove"
        }
      ]
    },
    "runas": {
      "path": "runas",
      "usage": "runas [flags]",
      "summary": "Run a new process in the context of the designated user (Windows Only)",
      "options": [
        {
          "name": "args",
          "short": "a",
          "type": "string",
          "default": "",
          "description": "arguments for the process"
        },
        {
          "name": "domain",
          "short": "d",
          "type": "string",
          "default": "",
          "description": "domain of the user"
        },
        {
          "name": "net-only",
          "short": "n",
          "type": "bool",
          "default": "false",
          "description": "use "
        },
        {
          "name": "password",
          "short": "P",
          "type": "string",
          "default": "",
          "description": "password of the user"
        },
        {
          "name": "process",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "process to start"
        },
        {
          "name": "show-window",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "\n\t\t\tLog on, but use the specified credentials on the network only. The new process uses the same token as the caller, but the system creates a new logon session within LSA, and the process uses the specified credentials as the default credentials."
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "30",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "username",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "user to impersonate"
        }
      ]
    },
    "screenshot": {
      "path": "screenshot",
      "usage": "screenshot [flags]",
      "summary": "Take a screenshot",
      "options": [
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "save to file (will overwrite if exists)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "services": {
      "path": "services",
      "usage": "services [flags]",
      "summary": "Service operations",
      "options": [
        {
          "name": "host",
          "short": "H",
          "type": "string",
          "default": "localhost",
          "description": "Hostname to retrieve service information from"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "info",
        "start",
        "stop"
      ]
    },
    "services info": {
      "path": "services info",
      "usage": "services info [flags]",
      "summary": "Get detailed information about a single service",
      "options": [
        {
          "name": "host",
          "short": "H",
          "type": "string",
          "default": "localhost",
          "description": "Hostname to retrieve service information from"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "services start": {
      "path": "services start",
      "usage": "services start [flags]",
      "summary": "Start a service on the local machine or a remote machine",
      "options": [
        {
          "name": "host",
          "short": "H",
          "type": "string",
          "default": "localhost",
          "description": "Hostname to start service on"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "services stop": {
      "path": "services stop",
      "usage": "services stop [flags]",
      "summary": "Stop a service on the local machine or a remote machine",
      "options": [
        {
          "name": "host",
          "short": "H",
          "type": "string",
          "default": "localhost",
          "description": "Hostname to stop service on"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "shell": {
      "path": "shell",
      "usage": "shell [flags]",
      "summary": "Start an interactive shell",
      "options": [
        {
          "name": "no-pty",
          "short": "y",
          "type": "bool",
          "default": "false",
          "description": "disable use of pty on macos/linux"
        },
        {
          "name": "shell-path",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "path to shell interpreter"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "attach",
        "kill",
        "ls"
      ]
    },
    "shell attach": {
      "path": "shell attach",
      "usage": "shell attach \u003cid\u003e [flags]",
      "summary": "Attach to a managed local shell tunnel",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "shell kill": {
      "path": "shell kill",
      "usage": "shell kill \u003cid\u003e [flags]",
      "summary": "Kill a managed shell and clean up remote process state",
      "options": [
        {
          "name": "force",
          "short": "F",
          "type": "bool",
          "default": "false",
          "description": "force process cleanup via terminate rpc"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "shell ls": {
      "path": "shell ls",
      "usage": "shell ls",
      "summary": "List managed local shell tunnels"
    },
    "sideload": {
      "path": "sideload",
      "usage": "sideload [flags]",
      "summary": "Load and execute a shared object (shared library/DLL) in a remote process",
      "options": [
        {
          "name": "entry-point",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "Entrypoint for the DLL (Windows only)"
        },
        {
          "name": "keep-alive",
          "short": "k",
          "type": "bool",
          "default": "false",
          "description": "don't terminate host process once the execution completes"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "ppid",
          "short": "P",
          "type": "uint",
          "default": "0",
          "description": "parent process id (optional)"
        },
        {
          "name": "process",
          "short": "p",
          "type": "string",
          "default": "c:\\windows\\system32\\notepad.exe",
          "description": "Path to process to host the shellcode"
        },
        {
          "name": "process-arguments",
          "short": "A",
          "type": "string",
          "default": "",
          "description": "arguments to pass to the hosting process"
        },
        {
          "name": "save",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "save output to file"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "unicode",
          "short": "w",
          "type": "bool",
          "default": "false",
          "description": "Command line is passed to unmanaged DLL function in UNICODE format. (default is ANSI)"
        }
      ]
    },
    "socks5": {
      "path": "socks5",
      "usage": "socks5",
      "summary": "In-band SOCKS5 Proxy",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "start",
        "stop"
      ]
    },
    "socks5 start": {
      "path": "socks5 start",
      "usage": "socks5 start [flags]",
      "summary": "Start an in-band SOCKS5 proxy",
      "options": [
        {
          "name": "host",
          "short": "H",
          "type": "string",
          "default": "127.0.0.1",
          "description": "Bind a Socks5 Host"
        },
        {
          "name": "port",
          "short": "P",
          "type": "string",
          "default": "1081",
          "description": "Bind a Socks5 Port"
        },
        {
          "name": "user",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "socks5 auth username (will generate random password)"
        }
      ]
    },
    "socks5 stop": {
      "path": "socks5 stop",
      "usage": "socks5 stop [flags]",
      "summary": "Stop a SOCKS5 proxy",
      "options": [
        {
          "name": "id",
          "short": "i",
          "type": "uint",
          "default": "0",
          "description": "id of portfwd to remove"
        }
      ]
    },
    "spawndll": {
      "path": "spawndll",
      "usage": "spawndll [flags]",
      "summary": "Load and execute a Reflective DLL in a remote process",
      "options": [
        {
          "name": "export",
          "short": "e",
          "type": "string",
          "default": "ReflectiveLoader",
          "description": "Entrypoint of the Reflective DLL"
        },
        {
          "name": "keep-alive",
          "short": "k",
          "type": "bool",
          "default": "false",
          "description": "don't terminate host process once the execution completes"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "ppid",
          "short": "P",
          "type": "uint",
          "default": "0",
          "description": "parent process id (optional)"
        },
        {
          "name": "process",
          "short": "p",
          "type": "string",
          "default": "c:\\windows\\system32\\notepad.exe",
          "description": "Path to process to host the shellcode"
        },
        {
          "name": "process-arguments",
          "short": "A",
          "type": "string",
          "default": "",
          "description": "arguments to pass to the hosting process"
        },
        {
          "name": "save",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "save output to file"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "ssh": {
      "path": "ssh",
      "usage": "ssh [flags]",
      "summary": "Run a SSH command on a remote host",
      "options": [
        {
          "name": "kerberos-config",
          "short": "c",
          "type": "string",
          "default": "/etc/krb5.conf",
          "description": "path to remote Kerberos config file"
        },
        {
          "name": "kerberos-keytab",
          "short": "k",
          "type": "string",
          "default": "",
          "description": "path to Kerberos keytab file"
        },
        {
          "name": "kerberos-realm",
          "short": "r",
          "type": "string",
          "default": "",
          "description": "Kerberos realm"
        },
        {
          "name": "login",
          "short": "l",
          "type": "string",
          "default": "",
          "description": "username to use to connect"
        },
        {
          "name": "password",
          "short": "P",
          "type": "string",
          "default": "",
          "description": "SSH user password"
        },
        {
          "name": "port",
          "short": "p",
          "type": "uint",
          "default": "22",
          "description": "SSH port"
        },
        {
          "name": "private-key",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "path to private key file"
        },
        {
          "name": "skip-loot",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "skip the prompt to use loot credentials"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "tail": {
      "path": "tail",
      "usage": "tail [flags]",
      "summary": "Grab the last number of bytes or lines from a file",
      "options": [
        {
          "name": "bytes",
          "short": "b",
          "type": "int",
          "default": "0",
          "description": "Grab the last number of bytes from the file"
        },
        {
          "name": "colorize-output",
          "short": "c",
          "type": "bool",
          "default": "false",
          "description": "colorize output"
        },
        {
          "name": "file-type",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "force a specific file type (binary/text) if looting (optional)"
        },
        {
          "name": "hex",
          "short": "x",
          "type": "bool",
          "default": "false",
          "description": "display as a hex dump"
        },
        {
          "name": "lines",
          "short": "l",
          "type": "int",
          "default": "10",
          "description": "Grab the last number of lines from the file"
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name to assign loot (optional)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "type",
          "short": "T",
          "type": "string",
          "default": "",
          "description": "force a specific loot type (file/cred) if looting (optional)"
        }
      ]
    },
    "tasks": {
      "path": "tasks",
      "usage": "tasks",
      "summary": "Beacon task management",
      "options": [
        {
          "name": "filter",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "filter based on task type (case-insensitive prefix matching)"
        },
        {
          "name": "overflow",
          "short": "O",
          "type": "bool",
          "default": "false",
          "description": "overflow terminal width (display truncated rows)"
        },
        {
          "name": "skip-pages",
          "short": "S",
          "type": "int",
          "default": "0",
          "description": "skip the first n page(s)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "cancel",
        "fetch"
      ]
    },
    "tasks cancel": {
      "path": "tasks cancel",
      "usage": "tasks cancel",
      "summary": "Cancel a pending beacon task"
    },
    "tasks fetch": {
      "path": "tasks fetch",
      "usage": "tasks fetch",
      "summary": "Fetch the details of a beacon task"
    },
    "terminate": {
      "path": "terminate",
      "usage": "terminate [flags]",
      "summary": "Terminate a process on the remote system",
      "options": [
        {
          "name": "force",
          "short": "F",
          "type": "bool",
          "default": "false",
          "description": "disregard safety and kill the PID"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "upload": {
      "path": "upload",
      "usage": "upload [flags]",
      "summary": "Upload a file",
      "options": [
        {
          "name": "ioc",
          "short": "i",
          "type": "bool",
          "default": "false",
          "description": "track uploaded file as an ioc"
        },
        {
          "name": "overwrite",
          "short": "o",
          "type": "bool",
          "default": "false",
          "description": "overwrite file if it exists"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "wasm": {
      "path": "wasm",
      "usage": "wasm [flags]",
      "summary": "Execute a Wasm Module Extension",
      "options": [
        {
          "name": "dir",
          "short": "d",
          "type": "string",
          "default": "",
          "description": "recursively include local directory in wasm module's /memfs (glob pattern)"
        },
        {
          "name": "file",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "include local file(s) in wasm module's /memfs (glob pattern) "
        },
        {
          "name": "loot",
          "short": "X",
          "type": "bool",
          "default": "false",
          "description": "save output as loot, incompatible with --pipe"
        },
        {
          "name": "pipe",
          "short": "P",
          "type": "bool",
          "default": "false",
          "description": "pipe module stdin/stdout/stderr to the current terminal (session only)"
        },
        {
          "name": "skip-registration",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "assume the extension is already registered"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "ls"
      ]
    },
    "wasm ls": {
      "path": "wasm ls",
      "usage": "wasm ls",
      "summary": "List registered wasm extensions with current session/beacon"
    },
    "wg-portfwd": {
      "path": "wg-portfwd",
      "usage": "wg-portfwd",
      "summary": "List ports forwarded by the WireGuard tun interface",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "add",
        "rm"
      ]
    },
    "wg-portfwd add": {
      "path": "wg-portfwd add",
      "usage": "wg-portfwd add [flags]",
      "summary": "Add a port forward from the WireGuard tun interface to a host on the target network",
      "options": [
        {
          "name": "bind",
          "short": "b",
          "type": "int",
          "default": "1080",
          "description": "port to listen on the WireGuard tun interface"
        },
        {
          "name": "remote",
          "short": "r",
          "type": "string",
          "default": "",
          "description": "remote target host:port (e.g., 10.0.0.1:445)"
        }
      ]
    },
    "wg-portfwd rm": {
      "path": "wg-portfwd rm",
      "usage": "wg-portfwd rm",
      "summary": "Remove a port forward from the WireGuard tun interface"
    },
    "wg-socks": {
      "path": "wg-socks",
      "usage": "wg-socks",
      "summary": "List socks servers listening on the WireGuard tun interface",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "start",
        "stop"
      ]
    },
    "wg-socks start": {
      "path": "wg-socks start",
      "usage": "wg-socks start [flags]",
      "summary": "Start a socks5 listener on the WireGuard tun interface",
      "options": [
        {
          "name": "bind",
          "short": "b",
          "type": "int",
          "default": "3090",
          "description": "port to listen on the WireGuard tun interface"
        }
      ]
    },
    "wg-socks stop": {
      "path": "wg-socks stop",
      "usage": "wg-socks stop",
      "summary": "Stop a socks5 listener on the WireGuard tun interface"
    },
    "whoami": {
      "path": "whoami",
      "usage": "whoami [flags]",
      "summary": "Get session user execution context",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    }
  },
  "server": {
    "ai": {
      "path": "ai",
      "usage": "ai",
      "summary": "Open the Sliver AI conversation TUI"
    },
    "aka": {
      "path": "aka",
      "usage": "aka",
      "summary": "Manage command aliases (aka's)",
      "subcommands": [
        "create",
        "delete"
      ]
    },
    "aka create": {
      "path": "aka create",
      "usage": "aka create \u003calias\u003e \u003ccommand\u003e [args...]",
      "summary": "Create a new command alias (aka)",
      "options": [
        {
          "name": "help",
          "short": "h",
          "type": "bool",
          "default": "false",
          "description": "help for create"
        }
      ]
    },
    "aka delete": {
      "path": "aka delete",
      "usage": "aka delete \u003calias\u003e",
      "summary": "Delete a command alias (aka)"
    },
    "aliases": {
      "path": "aliases",
      "usage": "aliases",
      "summary": "List current aliases",
      "subcommands": [
        "install",
        "load",
        "rm"
      ]
    },
    "aliases install": {
      "path": "aliases install",
      "usage": "aliases install [ALIAS]",
      "summary": "Install a command alias"
    },
    "aliases load": {
      "path": "aliases load",
      "usage": "aliases load [ALIAS]",
      "summary": "Load a command alias"
    },
    "aliases rm": {
      "path": "aliases rm",
      "usage": "aliases rm [ALIAS]",
      "summary": "Remove an alias"
    },
    "armory": {
      "path": "armory",
      "usage": "armory",
      "summary": "Automatically download and install extensions/aliases",
      "options": [
        {
          "name": "ignore-cache",
          "short": "c",
          "type": "bool",
          "default": "false",
          "description": "ignore metadata cache, force refresh"
        },
        {
          "name": "insecure",
          "short": "I",
          "type": "bool",
          "default": "false",
          "description": "skip tls certificate validation"
        },
        {
          "name": "proxy",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "specify a proxy url (e.g. http://localhost:8080)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "string",
          "default": "15m",
          "description": "download timeout"
        }
      ],
      "subcommands": [
        "add",
        "disable",
        "enable",
        "info",
        "install",
        "modify",
        "refresh",
        "reset",
        "rm",
        "save",
        "search",
        "update"
      ]
    },
    "armory add": {
      "path": "armory add",
      "usage": "armory add [flags]",
      "summary": "Add a new armory",
      "options": [
        {
          "name": "auth",
          "short": "a",
          "type": "string",
          "default": "",
          "description": "Authorization details / credentials for the armory"
        },
        {
          "name": "authcmd",
          "short": "x",
          "type": "string",
          "default": "",
          "description": "Local command to run for authorization to the armory"
        },
        {
          "name": "no-save",
          "short": "e",
          "type": "bool",
          "default": "false",
          "description": "Do not save this armory configuration to disk"
        },
        {
          "name": "pubkey",
          "short": "k",
          "type": "string",
          "default": "",
          "description": "The public key for the armory (required)"
        },
        {
          "name": "url",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "The URL of the armory index (required)"
        }
      ]
    },
    "armory disable": {
      "path": "armory disable",
      "usage": "armory disable",
      "summary": "Disable an armory"
    },
    "armory enable": {
      "path": "armory enable",
      "usage": "armory enable",
      "summary": "Enable an armory"
    },
    "armory info": {
      "path": "armory info",
      "usage": "armory info",
      "summary": "View configured armories or details about a specific armory or package"
    },
    "armory install": {
      "path": "armory install",
      "usage": "armory install [flags]",
      "summary": "Install an alias or extension",
      "options": [
        {
          "name": "armory",
          "short": "a",
          "type": "string",
          "default": "",
          "description": "name of armory to install package from"
        },
        {
          "name": "force",
          "short": "f",
          "type": "bool",
          "default": "false",
          "description": "force installation of package, overwriting the package if it exists"
        }
      ]
    },
    "armory modify": {
      "path": "armory modify",
      "usage": "armory modify [flags]",
      "summary": "Modify an armory configuration",
      "options": [
        {
          "name": "auth",
          "short": "a",
          "type": "string",
          "default": "",
          "description": "new authorization details / credentials for the armory"
        },
        {
          "name": "authcmd",
          "short": "x",
          "type": "string",
          "default": "",
          "description": "new local command to run for authorization to the armory"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "new name for the armory"
        },
        {
          "name": "no-save",
          "short": "e",
          "type": "bool",
          "default": "false",
          "description": "do not save armory configuration to armory configuration file"
        },
        {
          "name": "pubkey",
          "short": "k",
          "type": "string",
          "default": "",
          "description": "new public key for the armory"
        },
        {
          "name": "url",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "new URL for the armory"
        }
      ]
    },
    "armory refresh": {
      "path": "armory refresh",
      "usage": "armory refresh",
      "summary": "Refresh armory indexes"
    },
    "armory reset": {
      "path": "armory reset",
      "usage": "armory reset",
      "summary": "Reset armory configuration"
    },
    "armory rm": {
      "path": "armory rm",
      "usage": "armory rm",
      "summary": "Remove an armory"
    },
    "armory save": {
      "path": "armory save",
      "usage": "armory save",
      "summary": "Save the armory configuration to disk"
    },
    "armory search": {
      "path": "armory search",
      "usage": "armory search",
      "summary": "Search for aliases and extensions by name (regex)"
    },
    "armory update": {
      "path": "armory update",
      "usage": "armory update [flags]",
      "summary": "Update installed aliases and extensions",
      "options": [
        {
          "name": "armory",
          "short": "a",
          "type": "string",
          "default": "",
          "description": "name of armory to get updates from"
        }
      ]
    },
    "beacons": {
      "path": "beacons",
      "usage": "beacons [flags]",
      "summary": "Manage beacons",
      "options": [
        {
          "name": "filter",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "filter beacons by substring"
        },
        {
          "name": "filter-re",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "filter beacons by regular expression"
        },
        {
          "name": "force",
          "short": "F",
          "type": "bool",
          "default": "false",
          "description": "force killing the beacon"
        },
        {
          "name": "interact",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "interact with a beacon"
        },
        {
          "name": "kill",
          "short": "k",
          "type": "string",
          "default": "",
          "description": "kill the designated beacon"
        },
        {
          "name": "kill-all",
          "short": "K",
          "type": "bool",
          "default": "false",
          "description": "kill all beacons"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "prune",
        "rm",
        "watch"
      ]
    },
    "beacons prune": {
      "path": "beacons prune",
      "usage": "beacons prune [flags]",
      "summary": "Prune stale beacons automatically",
      "options": [
        {
          "name": "duration",
          "short": "d",
          "type": "string",
          "default": "1h",
          "description": "duration to prune beacons that have missed their last checkin"
        }
      ]
    },
    "beacons rm": {
      "path": "beacons rm",
      "usage": "beacons rm",
      "summary": "Remove a beacon"
    },
    "beacons watch": {
      "path": "beacons watch",
      "usage": "beacons watch",
      "summary": "Watch your beacons"
    },
    "builders": {
      "path": "builders",
      "usage": "builders [flags]",
      "summary": "List external builders",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "c2profiles": {
      "path": "c2profiles",
      "usage": "c2profiles",
      "summary": "Display C2 profile details",
      "options": [
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "default",
          "description": "HTTP C2 Profile to display"
        }
      ],
      "subcommands": [
        "export",
        "generate",
        "import"
      ]
    },
    "c2profiles export": {
      "path": "c2profiles export",
      "usage": "c2profiles export [flags]",
      "summary": "Export HTTP C2 profile",
      "options": [
        {
          "name": "file",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "Path to file to export C2 configuration to"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "default",
          "description": "HTTP C2 Profile name"
        }
      ]
    },
    "c2profiles generate": {
      "path": "c2profiles generate",
      "usage": "c2profiles generate [flags]",
      "summary": "Generate a C2 Profile from a list of urls",
      "options": [
        {
          "name": "file",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "Path to file containing URL list, /hello/there.txt one per line"
        },
        {
          "name": "import",
          "short": "i",
          "type": "bool",
          "default": "false",
          "description": "Import the generated profile after creation"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "HTTP C2 Profile name to save C2Profile as"
        },
        {
          "name": "template",
          "short": "t",
          "type": "string",
          "default": "default",
          "description": "HTTP C2 Profile to use as a template for the new profile"
        }
      ]
    },
    "c2profiles import": {
      "path": "c2profiles import",
      "usage": "c2profiles import [flags]",
      "summary": "Import HTTP C2 profile",
      "options": [
        {
          "name": "file",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "Path to C2 configuration file to import"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "default",
          "description": "HTTP C2 Profile name"
        },
        {
          "name": "overwrite",
          "short": "o",
          "type": "bool",
          "default": "false",
          "description": "Overwrite profile if it exists"
        }
      ]
    },
    "certificates": {
      "path": "certificates",
      "usage": "certificates [flags]",
      "summary": "Certificate management",
      "options": [
        {
          "name": "cn",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "Show certificate information for a provided common name"
        },
        {
          "name": "https",
          "short": "p",
          "type": "bool",
          "default": "false",
          "description": "Show HTTPS certificates"
        },
        {
          "name": "implant",
          "short": "i",
          "type": "bool",
          "default": "false",
          "description": "Show implant certificates"
        },
        {
          "name": "mtls",
          "short": "m",
          "type": "bool",
          "default": "false",
          "description": "Show MTLS certificates"
        },
        {
          "name": "server",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "Show server certificates"
        }
      ],
      "subcommands": [
        "authorities"
      ]
    },
    "certificates authorities": {
      "path": "certificates authorities",
      "usage": "certificates authorities",
      "summary": "List certificate authorities"
    },
    "clean": {
      "path": "clean",
      "usage": "clean",
      "summary": "Remove all profiles, beacons, sessions, implant builds and HTTP profiles (Builds and logs will still exist on disk in .sliver)"
    },
    "crack": {
      "path": "crack",
      "usage": "crack",
      "summary": "Crack: GPU password cracking",
      "options": [
        {
          "name": "attack-mode",
          "type": "string",
          "default": "",
          "description": "crack attack mode (straight, combination, bruteforce, hybrid-wordlist-mask, hybrid-mask-wordlist, association, no-attack, or numeric)"
        },
        {
          "name": "backend-devices",
          "type": "string",
          "default": "[]",
          "description": "backend device IDs"
        },
        {
          "name": "backend-ignore-cuda",
          "type": "bool",
          "default": "false",
          "description": "ignore CUDA backend"
        },
        {
          "name": "backend-ignore-hip",
          "type": "bool",
          "default": "false",
          "description": "ignore HIP backend"
        },
        {
          "name": "backend-ignore-metal",
          "type": "bool",
          "default": "false",
          "description": "ignore Metal backend"
        },
        {
          "name": "backend-ignore-opencl",
          "type": "bool",
          "default": "false",
          "description": "ignore OpenCL backend"
        },
        {
          "name": "backend-info",
          "type": "bool",
          "default": "false",
          "description": "show backend info"
        },
        {
          "name": "backend-vector-width",
          "type": "uint",
          "default": "0",
          "description": "backend vector width"
        },
        {
          "name": "benchmark",
          "type": "bool",
          "default": "false",
          "description": "run benchmark"
        },
        {
          "name": "benchmark-all",
          "type": "bool",
          "default": "false",
          "description": "run full benchmark"
        },
        {
          "name": "bitmap-max",
          "type": "uint",
          "default": "0",
          "description": "bitmap max"
        },
        {
          "name": "bitmap-min",
          "type": "uint",
          "default": "0",
          "description": "bitmap min"
        },
        {
          "name": "brain-client",
          "type": "bool",
          "default": "false",
          "description": "brain client mode"
        },
        {
          "name": "brain-client-features",
          "type": "string",
          "default": "",
          "description": "brain client features"
        },
        {
          "name": "brain-host",
          "type": "string",
          "default": "",
          "description": "brain host"
        },
        {
          "name": "brain-password",
          "type": "string",
          "default": "",
          "description": "brain password"
        },
        {
          "name": "brain-port",
          "type": "uint",
          "default": "0",
          "description": "brain port"
        },
        {
          "name": "brain-server",
          "type": "bool",
          "default": "false",
          "description": "brain server mode"
        },
        {
          "name": "brain-server-timer",
          "type": "uint",
          "default": "0",
          "description": "brain server timer"
        },
        {
          "name": "brain-session",
          "type": "string",
          "default": "",
          "description": "brain session"
        },
        {
          "name": "brain-session-whitelist",
          "type": "string",
          "default": "",
          "description": "brain session whitelist"
        },
        {
          "name": "cpu-affinity",
          "type": "string",
          "default": "[]",
          "description": "CPU affinity list"
        },
        {
          "name": "custom-charset1",
          "type": "string",
          "default": "",
          "description": "custom charset 1"
        },
        {
          "name": "custom-charset2",
          "type": "string",
          "default": "",
          "description": "custom charset 2"
        },
        {
          "name": "custom-charset3",
          "type": "string",
          "default": "",
          "description": "custom charset 3"
        },
        {
          "name": "custom-charset4",
          "type": "string",
          "default": "",
          "description": "custom charset 4"
        },
        {
          "name": "debug-mode",
          "type": "uint",
          "default": "0",
          "description": "debug mode mask"
        },
        {
          "name": "deprecated-check-disable",
          "type": "bool",
          "default": "false",
          "description": "disable deprecated check"
        },
        {
          "name": "encoding-from",
          "type": "string",
          "default": "",
          "description": "input encoding (iso-8859-15, utf-32le, or numeric)"
        },
        {
          "name": "encoding-to",
          "type": "string",
          "default": "",
          "description": "output encoding (iso-8859-15, utf-32le, or numeric)"
        },
        {
          "name": "force",
          "type": "bool",
          "default": "false",
          "description": "ignore warnings"
        },
        {
          "name": "generate-rules",
          "type": "uint",
          "default": "0",
          "description": "generate rules"
        },
        {
          "name": "generate-rules-fun-max",
          "type": "uint",
          "default": "0",
          "description": "generate rules function max"
        },
        {
          "name": "generate-rules-fun-min",
          "type": "uint",
          "default": "0",
          "description": "generate rules function min"
        },
        {
          "name": "generate-rules-func-sel",
          "type": "string",
          "default": "",
          "description": "generate rules function selection"
        },
        {
          "name": "generate-rules-seed",
          "type": "int",
          "default": "0",
          "description": "generate rules seed"
        },
        {
          "name": "hash",
          "type": "stringSlice",
          "default": "[]",
          "description": "hashes to crack (repeatable)"
        },
        {
          "name": "hash-info",
          "type": "bool",
          "default": "false",
          "description": "show hash information"
        },
        {
          "name": "hash-type",
          "type": "string",
          "default": "",
          "description": "hashcat hash type (number or enum name)"
        },
        {
          "name": "hccapx-message-pair",
          "type": "uint",
          "default": "0",
          "description": "hccapx message pair"
        },
        {
          "name": "hex-charset",
          "type": "bool",
          "default": "false",
          "description": "treat charset as hex"
        },
        {
          "name": "hex-salt",
          "type": "bool",
          "default": "false",
          "description": "treat salt as hex"
        },
        {
          "name": "hex-wordlist",
          "type": "bool",
          "default": "false",
          "description": "treat wordlist as hex"
        },
        {
          "name": "hook-threads",
          "type": "uint",
          "default": "0",
          "description": "hook threads"
        },
        {
          "name": "hwmon-disable",
          "type": "bool",
          "default": "false",
          "description": "disable hardware monitoring"
        },
        {
          "name": "hwmon-temp-abort",
          "type": "uint",
          "default": "0",
          "description": "hardware monitor temperature abort"
        },
        {
          "name": "identify",
          "type": "string",
          "default": "",
          "description": "identify hash"
        },
        {
          "name": "increment",
          "type": "bool",
          "default": "false",
          "description": "incremental mode"
        },
        {
          "name": "increment-max",
          "type": "uint",
          "default": "0",
          "description": "increment max"
        },
        {
          "name": "increment-min",
          "type": "uint",
          "default": "0",
          "description": "increment min"
        },
        {
          "name": "keep-guessing",
          "type": "bool",
          "default": "false",
          "description": "keep guessing"
        },
        {
          "name": "kernel-accel",
          "type": "uint",
          "default": "0",
          "description": "kernel acceleration"
        },
        {
          "name": "kernel-loops",
          "type": "uint",
          "default": "0",
          "description": "kernel loops"
        },
        {
          "name": "kernel-threads",
          "type": "uint",
          "default": "0",
          "description": "kernel threads"
        },
        {
          "name": "keyboard-layout-mapping",
          "type": "string",
          "default": "",
          "description": "keyboard layout mapping file or identifier"
        },
        {
          "name": "keyspace",
          "type": "bool",
          "default": "false",
          "description": "show keyspace"
        },
        {
          "name": "left",
          "type": "bool",
          "default": "false",
          "description": "show uncracked hashes"
        },
        {
          "name": "limit",
          "type": "uint",
          "default": "0",
          "description": "limit count"
        },
        {
          "name": "logfile-disable",
          "type": "bool",
          "default": "false",
          "description": "disable logfile"
        },
        {
          "name": "loopback",
          "type": "bool",
          "default": "false",
          "description": "use loopback mode"
        },
        {
          "name": "machine-readable",
          "type": "bool",
          "default": "false",
          "description": "machine readable output"
        },
        {
          "name": "markov-classic",
          "type": "bool",
          "default": "false",
          "description": "use classic markov"
        },
        {
          "name": "markov-disable",
          "type": "bool",
          "default": "false",
          "description": "disable markov mode"
        },
        {
          "name": "markov-hcstat2",
          "type": "string",
          "default": "",
          "description": "markov hcstat2 filename or identifier"
        },
        {
          "name": "markov-inverse",
          "type": "bool",
          "default": "false",
          "description": "use inverse markov"
        },
        {
          "name": "markov-threshold",
          "type": "uint",
          "default": "0",
          "description": "markov threshold"
        },
        {
          "name": "multiply-accel-disabled",
          "type": "bool",
          "default": "false",
          "description": "disable multiply accel"
        },
        {
          "name": "nonce-error-corrections",
          "type": "uint",
          "default": "0",
          "description": "nonce error corrections"
        },
        {
          "name": "opencl-device-types",
          "type": "string",
          "default": "[]",
          "description": "OpenCL device types"
        },
        {
          "name": "optimized-kernel-enable",
          "type": "bool",
          "default": "false",
          "description": "enable optimized kernels"
        },
        {
          "name": "outfile-autohex-disable",
          "type": "bool",
          "default": "false",
          "description": "disable outfile autohex"
        },
        {
          "name": "outfile-check-timer",
          "type": "uint",
          "default": "0",
          "description": "outfile check timer interval (seconds)"
        },
        {
          "name": "outfile-format",
          "type": "stringSlice",
          "default": "[]",
          "description": "outfile formats (hash-salt, plain, hex-plain, crack-pos, timestamp-absolute, timestamp-relative, or numeric)"
        },
        {
          "name": "potfile",
          "type": "string",
          "default": "",
          "description": "potfile path or identifier"
        },
        {
          "name": "potfile-disable",
          "type": "bool",
          "default": "false",
          "description": "disable potfile"
        },
        {
          "name": "progress-only",
          "type": "bool",
          "default": "false",
          "description": "show progress only"
        },
        {
          "name": "quiet",
          "type": "bool",
          "default": "false",
          "description": "quiet mode"
        },
        {
          "name": "remove",
          "type": "bool",
          "default": "false",
          "description": "remove cracked hashes"
        },
        {
          "name": "remove-timer",
          "type": "uint",
          "default": "0",
          "description": "remove timer interval (seconds)"
        },
        {
          "name": "restore",
          "type": "bool",
          "default": "false",
          "description": "restore session"
        },
        {
          "name": "restore-disable",
          "type": "bool",
          "default": "false",
          "description": "disable restore"
        },
        {
          "name": "restore-file",
          "type": "string",
          "default": "",
          "description": "restore file path or identifier"
        },
        {
          "name": "rules-file",
          "type": "string",
          "default": "",
          "description": "rules file path or identifier"
        },
        {
          "name": "runtime",
          "type": "uint",
          "default": "0",
          "description": "runtime in seconds"
        },
        {
          "name": "scrypt-tmto",
          "type": "uint",
          "default": "0",
          "description": "scrypt tmto"
        },
        {
          "name": "segment-size",
          "type": "uint",
          "default": "0",
          "description": "segment size"
        },
        {
          "name": "self-test-disable",
          "type": "bool",
          "default": "false",
          "description": "disable self-test"
        },
        {
          "name": "separator",
          "type": "string",
          "default": "",
          "description": "separator character"
        },
        {
          "name": "session",
          "type": "string",
          "default": "",
          "description": "session name"
        },
        {
          "name": "show",
          "type": "bool",
          "default": "false",
          "description": "show cracked hashes"
        },
        {
          "name": "skip",
          "type": "uint",
          "default": "0",
          "description": "skip count"
        },
        {
          "name": "slow-candidates",
          "type": "bool",
          "default": "false",
          "description": "slow candidates"
        },
        {
          "name": "speed-only",
          "type": "bool",
          "default": "false",
          "description": "show speed only"
        },
        {
          "name": "spin-damp",
          "type": "uint",
          "default": "0",
          "description": "spin damp"
        },
        {
          "name": "status",
          "type": "bool",
          "default": "false",
          "description": "enable status"
        },
        {
          "name": "status-json",
          "type": "bool",
          "default": "false",
          "description": "emit status in JSON"
        },
        {
          "name": "status-timer",
          "type": "uint",
          "default": "0",
          "description": "status timer interval (seconds)"
        },
        {
          "name": "stdin-timeout-abort",
          "type": "uint",
          "default": "0",
          "description": "abort after stdin timeout (seconds)"
        },
        {
          "name": "stdout",
          "type": "bool",
          "default": "false",
          "description": "stdout output"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "username",
          "type": "bool",
          "default": "false",
          "description": "enable username handling"
        },
        {
          "name": "wordlist-autohex-disable",
          "type": "bool",
          "default": "false",
          "description": "disable wordlist autohex"
        },
        {
          "name": "workload-profile",
          "type": "string",
          "default": "",
          "description": "workload profile (low, default, high, nightmare, or numeric)"
        }
      ],
      "subcommands": [
        "hcstat2",
        "rules",
        "stations",
        "wordlists"
      ]
    },
    "crack hcstat2": {
      "path": "crack hcstat2",
      "usage": "crack hcstat2",
      "summary": "Manage markov hcstat2 files",
      "subcommands": [
        "add",
        "rm"
      ]
    },
    "crack hcstat2 add": {
      "path": "crack hcstat2 add",
      "usage": "crack hcstat2 add [flags]",
      "summary": "Add a hcstat2 file",
      "options": [
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "hcstat2 name (blank = filename)"
        }
      ]
    },
    "crack hcstat2 rm": {
      "path": "crack hcstat2 rm",
      "usage": "crack hcstat2 rm",
      "summary": "Remove hcstat2 file"
    },
    "crack rules": {
      "path": "crack rules",
      "usage": "crack rules",
      "summary": "Manage rule files",
      "subcommands": [
        "add",
        "rm"
      ]
    },
    "crack rules add": {
      "path": "crack rules add",
      "usage": "crack rules add [flags]",
      "summary": "Add a rules file",
      "options": [
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "rules name (blank = filename)"
        }
      ]
    },
    "crack rules rm": {
      "path": "crack rules rm",
      "usage": "crack rules rm",
      "summary": "Remove rules"
    },
    "crack stations": {
      "path": "crack stations",
      "usage": "crack stations [flags]",
      "summary": "Manage crackstations",
      "options": [
        {
          "name": "show-benchmarks",
          "type": "bool",
          "default": "false",
          "description": "show benchmark rates for crackstations"
        }
      ]
    },
    "crack wordlists": {
      "path": "crack wordlists",
      "usage": "crack wordlists",
      "summary": "Manage wordlists",
      "subcommands": [
        "add",
        "rm"
      ]
    },
    "crack wordlists add": {
      "path": "crack wordlists add",
      "usage": "crack wordlists add [flags]",
      "summary": "Add a wordlist",
      "options": [
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "wordlist name (blank = filename)"
        }
      ]
    },
    "crack wordlists rm": {
      "path": "crack wordlists rm",
      "usage": "crack wordlists rm",
      "summary": "Remove a wordlist"
    },
    "creds": {
      "path": "creds",
      "usage": "creds",
      "summary": "Manage the database of credentials",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "add",
        "rm"
      ]
    },
    "creds add": {
      "path": "creds add",
      "usage": "creds add [flags]",
      "summary": "Add a credential to the database",
      "options": [
        {
          "name": "collection",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "name of collection"
        },
        {
          "name": "hash",
          "short": "P",
          "type": "string",
          "default": "",
          "description": "hash of the credential"
        },
        {
          "name": "hash-type",
          "short": "H",
          "type": "string",
          "default": "",
          "description": "hash type of the credential"
        },
        {
          "name": "plaintext",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "plaintext for the credential"
        },
        {
          "name": "username",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "username for the credential"
        }
      ],
      "subcommands": [
        "file"
      ]
    },
    "creds add file": {
      "path": "creds add file",
      "usage": "creds add file [flags]",
      "summary": "Add a credential to the database",
      "options": [
        {
          "name": "collection",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "name of collection"
        },
        {
          "name": "file-format",
          "short": "F",
          "type": "string",
          "default": "hash",
          "description": "file format of the credential file"
        },
        {
          "name": "hash-type",
          "short": "H",
          "type": "string",
          "default": "",
          "description": "hash type of the credential"
        }
      ]
    },
    "creds rm": {
      "path": "creds rm",
      "usage": "creds rm",
      "summary": "Remove a credential to the database"
    },
    "dns": {
      "path": "dns",
      "usage": "dns [flags]",
      "summary": "Start a DNS listener",
      "options": [
        {
          "name": "domains",
          "short": "d",
          "type": "string",
          "default": "",
          "description": "parent domain(s) to use for DNS c2"
        },
        {
          "name": "lhost",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "interface to bind server to"
        },
        {
          "name": "lport",
          "short": "l",
          "type": "uint",
          "default": "53",
          "description": "udp listen port"
        },
        {
          "name": "no-canaries",
          "short": "c",
          "type": "bool",
          "default": "false",
          "description": "disable dns canary detection"
        }
      ]
    },
    "docs": {
      "path": "docs",
      "usage": "docs",
      "summary": "Browse the embedded Sliver docs in a TUI"
    },
    "exit": {
      "path": "exit",
      "usage": "exit",
      "summary": "Exit the program"
    },
    "extensions": {
      "path": "extensions",
      "usage": "extensions",
      "summary": "Manage extensions",
      "subcommands": [
        "install",
        "load",
        "rm"
      ]
    },
    "extensions install": {
      "path": "extensions install",
      "usage": "extensions install",
      "summary": "Install an extension from a local directory or .tar.gz file"
    },
    "extensions load": {
      "path": "extensions load",
      "usage": "extensions load",
      "summary": "Temporarily load an extension from a local directory"
    },
    "extensions rm": {
      "path": "extensions rm",
      "usage": "extensions rm",
      "summary": "Remove an installed extension"
    },
    "generate": {
      "path": "generate",
      "usage": "generate [flags]",
      "summary": "Generate an implant binary",
      "options": [
        {
          "name": "all-protocols",
          "type": "bool",
          "default": "false",
          "description": "force include all transport protocols"
        },
        {
          "name": "arch",
          "short": "a",
          "type": "string",
          "default": "amd64",
          "description": "cpu architecture"
        },
        {
          "name": "c2profile",
          "short": "C",
          "type": "string",
          "default": "default",
          "description": "HTTP C2 profile to use"
        },
        {
          "name": "canary",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "canary domain(s)"
        },
        {
          "name": "debug",
          "short": "d",
          "type": "bool",
          "default": "false",
          "description": "enable debug features"
        },
        {
          "name": "debug-file",
          "short": "O",
          "type": "string",
          "default": "",
          "description": "path to debug output"
        },
        {
          "name": "dns",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "dns connection strings"
        },
        {
          "name": "donut-bypass",
          "type": "uint",
          "default": "3",
          "description": "Deprecated (use --shellcode-bypass)"
        },
        {
          "name": "donut-compress",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-compress)"
        },
        {
          "name": "donut-entropy",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-entropy)"
        },
        {
          "name": "donut-exitopt",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-exitopt)"
        },
        {
          "name": "donut-headers",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-headers)"
        },
        {
          "name": "donut-oep",
          "type": "uint",
          "default": "0",
          "description": "Deprecated (use --shellcode-oep)"
        },
        {
          "name": "donut-thread",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-thread)"
        },
        {
          "name": "donut-unicode",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-unicode)"
        },
        {
          "name": "evasion",
          "short": "e",
          "type": "bool",
          "default": "false",
          "description": "enable evasion features (e.g. overwrite user space hooks)"
        },
        {
          "name": "exports",
          "short": "v",
          "type": "string",
          "default": "StartW,VoidFunc,DllInstall,DllRegisterServer,DllUnregisterServer",
          "description": "comma separated list of exports to include in the binary"
        },
        {
          "name": "external-builder",
          "short": "E",
          "type": "bool",
          "default": "false",
          "description": "use an external builder"
        },
        {
          "name": "format",
          "short": "f",
          "type": "string",
          "default": "exe",
          "description": "Specifies the output formats, valid values are: 'exe', 'shared' (for dynamic libraries), 'service' (see: `psexec` for more info) and 'shellcode' (windows, darwin/arm64, linux/amd64, linux/arm64)"
        },
        {
          "name": "http",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "http(s) connection strings"
        },
        {
          "name": "include-dns",
          "type": "bool",
          "default": "false",
          "description": "force include dns transport"
        },
        {
          "name": "include-http",
          "type": "bool",
          "default": "false",
          "description": "force include http transport"
        },
        {
          "name": "include-mtls",
          "type": "bool",
          "default": "false",
          "description": "force include mtls transport"
        },
        {
          "name": "include-named-pipe",
          "type": "bool",
          "default": "false",
          "description": "force include named-pipe transport"
        },
        {
          "name": "include-tcp-pivot",
          "type": "bool",
          "default": "false",
          "description": "force include tcp-pivot transport"
        },
        {
          "name": "include-wg",
          "type": "bool",
          "default": "false",
          "description": "force include wireguard transport"
        },
        {
          "name": "key-exchange",
          "short": "X",
          "type": "uint",
          "default": "1337",
          "description": "wg key-exchange port"
        },
        {
          "name": "limit-datetime",
          "short": "w",
          "type": "string",
          "default": "",
          "description": "limit execution to before datetime"
        },
        {
          "name": "limit-domainjoined",
          "short": "x",
          "type": "bool",
          "default": "false",
          "description": "limit execution to domain joined machines"
        },
        {
          "name": "limit-fileexists",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "limit execution to hosts with this file in the filesystem"
        },
        {
          "name": "limit-hostname",
          "short": "z",
          "type": "string",
          "default": "",
          "description": "limit execution to specified hostname"
        },
        {
          "name": "limit-locale",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "limit execution to hosts that match this locale"
        },
        {
          "name": "limit-username",
          "short": "y",
          "type": "string",
          "default": "",
          "description": "limit execution to specified username"
        },
        {
          "name": "max-errors",
          "short": "k",
          "type": "uint",
          "default": "1000",
          "description": "max number of connection errors"
        },
        {
          "name": "mtls",
          "short": "m",
          "type": "string",
          "default": "",
          "description": "mtls connection strings"
        },
        {
          "name": "name",
          "short": "N",
          "type": "string",
          "default": "",
          "description": "agent name"
        },
        {
          "name": "named-pipe",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "named-pipe connection strings"
        },
        {
          "name": "netgo",
          "short": "q",
          "type": "bool",
          "default": "false",
          "description": "force the use of netgo"
        },
        {
          "name": "os",
          "short": "o",
          "type": "string",
          "default": "windows",
          "description": "operating system"
        },
        {
          "name": "poll-timeout",
          "short": "P",
          "type": "int",
          "default": "360",
          "description": "long poll request timeout"
        },
        {
          "name": "reconnect",
          "short": "j",
          "type": "int",
          "default": "60",
          "description": "attempt to reconnect every n second(s)"
        },
        {
          "name": "run-at-load",
          "short": "R",
          "type": "bool",
          "default": "false",
          "description": "run the implant entrypoint from DllMain/Constructor (shared library only)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "directory/file to the binary to"
        },
        {
          "name": "shellcode-bypass",
          "type": "uint",
          "default": "3",
          "description": "Shellcode bypass mode (Donut: 1=none, 2=abort, 3=continue) (windows shellcode only)"
        },
        {
          "name": "shellcode-compress",
          "type": "bool",
          "default": "false",
          "description": "Enable shellcode compression (aPLib) (windows, macOS, and Linux shellcode)"
        },
        {
          "name": "shellcode-encoder",
          "type": "string",
          "default": "",
          "description": "shellcode encoder to apply (optional; see `shellcode-encoders`)"
        },
        {
          "name": "shellcode-entropy",
          "type": "uint",
          "default": "1",
          "description": "Shellcode entropy (Donut: 1=none, 2=random names, 3=random+encrypt) (windows shellcode only)"
        },
        {
          "name": "shellcode-exitopt",
          "type": "uint",
          "default": "1",
          "description": "Shellcode exit option (Donut: 1=exit thread, 2=exit process, 3=block) (windows shellcode only)"
        },
        {
          "name": "shellcode-headers",
          "type": "uint",
          "default": "1",
          "description": "Shellcode headers handling (Donut: 1=overwrite, 2=keep) (windows shellcode only)"
        },
        {
          "name": "shellcode-oep",
          "type": "uint",
          "default": "0",
          "description": "Override original entry point (OEP) (Donut) (windows shellcode only)"
        },
        {
          "name": "shellcode-thread",
          "type": "bool",
          "default": "false",
          "description": "Run unmanaged EXE entrypoint as a new thread (Donut) (windows shellcode only)"
        },
        {
          "name": "shellcode-unicode",
          "type": "bool",
          "default": "false",
          "description": "Use Unicode command line for unmanaged DLL entrypoints (Donut) (windows shellcode only)"
        },
        {
          "name": "skip-symbols",
          "short": "l",
          "type": "bool",
          "default": "false",
          "description": "skip symbol obfuscation"
        },
        {
          "name": "spoof-metadata",
          "type": "bool",
          "default": "",
          "description": "spoof executable metadata (optional donor path)"
        },
        {
          "name": "strategy",
          "short": "Z",
          "type": "string",
          "default": "",
          "description": "specify a connection strategy (r = random, rd = random domain, s = sequential)"
        },
        {
          "name": "tcp-comms",
          "short": "T",
          "type": "uint",
          "default": "8888",
          "description": "wg c2 comms port"
        },
        {
          "name": "tcp-pivot",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "tcp-pivot connection strings"
        },
        {
          "name": "template",
          "short": "I",
          "type": "string",
          "default": "sliver",
          "description": "implant code template"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        },
        {
          "name": "traffic-encoders",
          "short": "A",
          "type": "string",
          "default": "",
          "description": "comma separated list of traffic encoders to enable"
        },
        {
          "name": "wg",
          "short": "g",
          "type": "string",
          "default": "",
          "description": "wg connection strings"
        }
      ],
      "subcommands": [
        "beacon",
        "info",
        "traffic-encoders"
      ]
    },
    "generate beacon": {
      "path": "generate beacon",
      "usage": "generate beacon [flags]",
      "summary": "Generate a beacon binary",
      "options": [
        {
          "name": "all-protocols",
          "type": "bool",
          "default": "false",
          "description": "force include all transport protocols"
        },
        {
          "name": "arch",
          "short": "a",
          "type": "string",
          "default": "amd64",
          "description": "cpu architecture"
        },
        {
          "name": "c2profile",
          "short": "C",
          "type": "string",
          "default": "default",
          "description": "HTTP C2 profile to use"
        },
        {
          "name": "canary",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "canary domain(s)"
        },
        {
          "name": "days",
          "short": "D",
          "type": "int",
          "default": "0",
          "description": "beacon interval days"
        },
        {
          "name": "debug",
          "short": "d",
          "type": "bool",
          "default": "false",
          "description": "enable debug features"
        },
        {
          "name": "debug-file",
          "short": "O",
          "type": "string",
          "default": "",
          "description": "path to debug output"
        },
        {
          "name": "dns",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "dns connection strings"
        },
        {
          "name": "donut-bypass",
          "type": "uint",
          "default": "3",
          "description": "Deprecated (use --shellcode-bypass)"
        },
        {
          "name": "donut-compress",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-compress)"
        },
        {
          "name": "donut-entropy",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-entropy)"
        },
        {
          "name": "donut-exitopt",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-exitopt)"
        },
        {
          "name": "donut-headers",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-headers)"
        },
        {
          "name": "donut-oep",
          "type": "uint",
          "default": "0",
          "description": "Deprecated (use --shellcode-oep)"
        },
        {
          "name": "donut-thread",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-thread)"
        },
        {
          "name": "donut-unicode",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-unicode)"
        },
        {
          "name": "evasion",
          "short": "e",
          "type": "bool",
          "default": "false",
          "description": "enable evasion features (e.g. overwrite user space hooks)"
        },
        {
          "name": "exports",
          "short": "v",
          "type": "string",
          "default": "StartW,VoidFunc,DllInstall,DllRegisterServer,DllUnregisterServer",
          "description": "comma separated list of exports to include in the binary"
        },
        {
          "name": "external-builder",
          "short": "E",
          "type": "bool",
          "default": "false",
          "description": "use an external builder"
        },
        {
          "name": "format",
          "short": "f",
          "type": "string",
          "default": "exe",
          "description": "Specifies the output formats, valid values are: 'exe', 'shared' (for dynamic libraries), 'service' (see: `psexec` for more info) and 'shellcode' (windows, darwin/arm64, linux/amd64, linux/arm64)"
        },
        {
          "name": "hours",
          "short": "H",
          "type": "int",
          "default": "0",
          "description": "beacon interval hours"
        },
        {
          "name": "http",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "http(s) connection strings"
        },
        {
          "name": "include-dns",
          "type": "bool",
          "default": "false",
          "description": "force include dns transport"
        },
        {
          "name": "include-http",
          "type": "bool",
          "default": "false",
          "description": "force include http transport"
        },
        {
          "name": "include-mtls",
          "type": "bool",
          "default": "false",
          "description": "force include mtls transport"
        },
        {
          "name": "include-named-pipe",
          "type": "bool",
          "default": "false",
          "description": "force include named-pipe transport"
        },
        {
          "name": "include-tcp-pivot",
          "type": "bool",
          "default": "false",
          "description": "force include tcp-pivot transport"
        },
        {
          "name": "include-wg",
          "type": "bool",
          "default": "false",
          "description": "force include wireguard transport"
        },
        {
          "name": "jitter",
          "short": "J",
          "type": "int",
          "default": "30",
          "description": "beacon interval jitter in seconds"
        },
        {
          "name": "key-exchange",
          "short": "X",
          "type": "uint",
          "default": "1337",
          "description": "wg key-exchange port"
        },
        {
          "name": "limit-datetime",
          "short": "w",
          "type": "string",
          "default": "",
          "description": "limit execution to before datetime"
        },
        {
          "name": "limit-domainjoined",
          "short": "x",
          "type": "bool",
          "default": "false",
          "description": "limit execution to domain joined machines"
        },
        {
          "name": "limit-fileexists",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "limit execution to hosts with this file in the filesystem"
        },
        {
          "name": "limit-hostname",
          "short": "z",
          "type": "string",
          "default": "",
          "description": "limit execution to specified hostname"
        },
        {
          "name": "limit-locale",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "limit execution to hosts that match this locale"
        },
        {
          "name": "limit-username",
          "short": "y",
          "type": "string",
          "default": "",
          "description": "limit execution to specified username"
        },
        {
          "name": "max-errors",
          "short": "k",
          "type": "uint",
          "default": "1000",
          "description": "max number of connection errors"
        },
        {
          "name": "minutes",
          "short": "M",
          "type": "int",
          "default": "0",
          "description": "beacon interval minutes"
        },
        {
          "name": "mtls",
          "short": "m",
          "type": "string",
          "default": "",
          "description": "mtls connection strings"
        },
        {
          "name": "name",
          "short": "N",
          "type": "string",
          "default": "",
          "description": "agent name"
        },
        {
          "name": "named-pipe",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "named-pipe connection strings"
        },
        {
          "name": "netgo",
          "short": "q",
          "type": "bool",
          "default": "false",
          "description": "force the use of netgo"
        },
        {
          "name": "os",
          "short": "o",
          "type": "string",
          "default": "windows",
          "description": "operating system"
        },
        {
          "name": "poll-timeout",
          "short": "P",
          "type": "int",
          "default": "360",
          "description": "long poll request timeout"
        },
        {
          "name": "reconnect",
          "short": "j",
          "type": "int",
          "default": "60",
          "description": "attempt to reconnect every n second(s)"
        },
        {
          "name": "run-at-load",
          "short": "R",
          "type": "bool",
          "default": "false",
          "description": "run the implant entrypoint from DllMain/Constructor (shared library only)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "directory/file to the binary to"
        },
        {
          "name": "seconds",
          "short": "S",
          "type": "int",
          "default": "60",
          "description": "beacon interval seconds"
        },
        {
          "name": "shellcode-bypass",
          "type": "uint",
          "default": "3",
          "description": "Shellcode bypass mode (Donut: 1=none, 2=abort, 3=continue) (windows shellcode only)"
        },
        {
          "name": "shellcode-compress",
          "type": "bool",
          "default": "false",
          "description": "Enable shellcode compression (aPLib) (windows, macOS, and Linux shellcode)"
        },
        {
          "name": "shellcode-encoder",
          "type": "string",
          "default": "",
          "description": "shellcode encoder to apply (optional; see `shellcode-encoders`)"
        },
        {
          "name": "shellcode-entropy",
          "type": "uint",
          "default": "1",
          "description": "Shellcode entropy (Donut: 1=none, 2=random names, 3=random+encrypt) (windows shellcode only)"
        },
        {
          "name": "shellcode-exitopt",
          "type": "uint",
          "default": "1",
          "description": "Shellcode exit option (Donut: 1=exit thread, 2=exit process, 3=block) (windows shellcode only)"
        },
        {
          "name": "shellcode-headers",
          "type": "uint",
          "default": "1",
          "description": "Shellcode headers handling (Donut: 1=overwrite, 2=keep) (windows shellcode only)"
        },
        {
          "name": "shellcode-oep",
          "type": "uint",
          "default": "0",
          "description": "Override original entry point (OEP) (Donut) (windows shellcode only)"
        },
        {
          "name": "shellcode-thread",
          "type": "bool",
          "default": "false",
          "description": "Run unmanaged EXE entrypoint as a new thread (Donut) (windows shellcode only)"
        },
        {
          "name": "shellcode-unicode",
          "type": "bool",
          "default": "false",
          "description": "Use Unicode command line for unmanaged DLL entrypoints (Donut) (windows shellcode only)"
        },
        {
          "name": "skip-symbols",
          "short": "l",
          "type": "bool",
          "default": "false",
          "description": "skip symbol obfuscation"
        },
        {
          "name": "spoof-metadata",
          "type": "bool",
          "default": "",
          "description": "spoof executable metadata (optional donor path)"
        },
        {
          "name": "strategy",
          "short": "Z",
          "type": "string",
          "default": "",
          "description": "specify a connection strategy (r = random, rd = random domain, s = sequential)"
        },
        {
          "name": "tcp-comms",
          "short": "T",
          "type": "uint",
          "default": "8888",
          "description": "wg c2 comms port"
        },
        {
          "name": "tcp-pivot",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "tcp-pivot connection strings"
        },
        {
          "name": "template",
          "short": "I",
          "type": "string",
          "default": "sliver",
          "description": "implant code template"
        },
        {
          "name": "traffic-encoders",
          "short": "A",
          "type": "string",
          "default": "",
          "description": "comma separated list of traffic encoders to enable"
        },
        {
          "name": "wg",
          "short": "g",
          "type": "string",
          "default": "",
          "description": "wg connection strings"
        }
      ]
    },
    "generate info": {
      "path": "generate info",
      "usage": "generate info",
      "summary": "Get information about the server's compiler"
    },
    "generate traffic-encoders": {
      "path": "generate traffic-encoders",
      "usage": "generate traffic-encoders",
      "summary": "Manage implant traffic encoders",
      "subcommands": [
        "add",
        "rm"
      ]
    },
    "generate traffic-encoders add": {
      "path": "generate traffic-encoders add",
      "usage": "generate traffic-encoders add [flags]",
      "summary": "Add a new traffic encoder to the server from the local file system",
      "options": [
        {
          "name": "skip-tests",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "skip testing the traffic encoder (not recommended)"
        }
      ]
    },
    "generate traffic-encoders rm": {
      "path": "generate traffic-encoders rm",
      "usage": "generate traffic-encoders rm",
      "summary": "Remove a traffic encoder from the server"
    },
    "help": {
      "path": "help",
      "usage": "help [command]",
      "summary": "Help about any command"
    },
    "hosts": {
      "path": "hosts",
      "usage": "hosts",
      "summary": "Manage the database of hosts",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "ioc",
        "rm"
      ]
    },
    "hosts ioc": {
      "path": "hosts ioc",
      "usage": "hosts ioc",
      "summary": "Manage tracked IOCs on a given host",
      "subcommands": [
        "rm"
      ]
    },
    "hosts ioc rm": {
      "path": "hosts ioc rm",
      "usage": "hosts ioc rm",
      "summary": "Delete IOCs from the database"
    },
    "hosts rm": {
      "path": "hosts rm",
      "usage": "hosts rm",
      "summary": "Remove a host from the database"
    },
    "http": {
      "path": "http",
      "usage": "http [flags]",
      "summary": "Start an HTTP listener",
      "options": [
        {
          "name": "disable-otp",
          "short": "D",
          "type": "bool",
          "default": "false",
          "description": "disable otp authentication"
        },
        {
          "name": "domain",
          "short": "d",
          "type": "string",
          "default": "",
          "description": "limit responses to specific domain"
        },
        {
          "name": "lhost",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "interface to bind server to"
        },
        {
          "name": "long-poll-jitter",
          "short": "J",
          "type": "string",
          "default": "2s",
          "description": "server-side long poll jitter"
        },
        {
          "name": "long-poll-timeout",
          "short": "T",
          "type": "string",
          "default": "1s",
          "description": "server-side long poll timeout"
        },
        {
          "name": "lport",
          "short": "l",
          "type": "uint",
          "default": "80",
          "description": "tcp listen port"
        },
        {
          "name": "website",
          "short": "w",
          "type": "string",
          "default": "",
          "description": "website name (see websites cmd)"
        }
      ]
    },
    "https": {
      "path": "https",
      "usage": "https [flags]",
      "summary": "Start an HTTPS listener",
      "options": [
        {
          "name": "cert",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "PEM encoded certificate file"
        },
        {
          "name": "disable-otp",
          "short": "D",
          "type": "bool",
          "default": "false",
          "description": "disable otp authentication"
        },
        {
          "name": "disable-randomized-jarm",
          "short": "E",
          "type": "bool",
          "default": "false",
          "description": "disable randomized jarm fingerprints"
        },
        {
          "name": "domain",
          "short": "d",
          "type": "string",
          "default": "",
          "description": "limit responses to specific domain"
        },
        {
          "name": "key",
          "short": "k",
          "type": "string",
          "default": "",
          "description": "PEM encoded private key file"
        },
        {
          "name": "lets-encrypt",
          "short": "e",
          "type": "bool",
          "default": "false",
          "description": "attempt to provision a let's encrypt certificate"
        },
        {
          "name": "lhost",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "interface to bind server to"
        },
        {
          "name": "long-poll-jitter",
          "short": "J",
          "type": "string",
          "default": "2s",
          "description": "server-side long poll jitter"
        },
        {
          "name": "long-poll-timeout",
          "short": "T",
          "type": "string",
          "default": "1s",
          "description": "server-side long poll timeout"
        },
        {
          "name": "lport",
          "short": "l",
          "type": "uint",
          "default": "443",
          "description": "tcp listen port"
        },
        {
          "name": "website",
          "short": "w",
          "type": "string",
          "default": "",
          "description": "website name (see websites cmd)"
        }
      ]
    },
    "implants": {
      "path": "implants",
      "usage": "implants [flags]",
      "summary": "List implant builds",
      "options": [
        {
          "name": "arch",
          "short": "a",
          "type": "string",
          "default": "",
          "description": "filter builds by cpu architecture"
        },
        {
          "name": "format",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "filter builds by artifact format"
        },
        {
          "name": "no-debug",
          "short": "d",
          "type": "bool",
          "default": "false",
          "description": "filter builds by debug flag"
        },
        {
          "name": "only-beacons",
          "short": "b",
          "type": "bool",
          "default": "false",
          "description": "filter beacons"
        },
        {
          "name": "only-sessions",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "filter interactive sessions"
        },
        {
          "name": "os",
          "short": "o",
          "type": "string",
          "default": "",
          "description": "filter builds by operating system"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "rm",
        "stage"
      ]
    },
    "implants rm": {
      "path": "implants rm",
      "usage": "implants rm",
      "summary": "Remove implant build"
    },
    "implants stage": {
      "path": "implants stage",
      "usage": "implants stage",
      "summary": "Serve a previously generated build"
    },
    "info": {
      "path": "info",
      "usage": "info [flags]",
      "summary": "Get info about session",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "jobs": {
      "path": "jobs",
      "usage": "jobs [flags]",
      "summary": "Job control",
      "options": [
        {
          "name": "kill",
          "short": "k",
          "type": "int",
          "default": "-1",
          "description": "kill a background job"
        },
        {
          "name": "kill-all",
          "short": "K",
          "type": "bool",
          "default": "false",
          "description": "kill all jobs"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "licenses": {
      "path": "licenses",
      "usage": "licenses",
      "summary": "Open source licenses"
    },
    "loot": {
      "path": "loot",
      "usage": "loot [flags]",
      "summary": "Manage the server's loot store",
      "options": [
        {
          "name": "filter",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "filter based on loot type"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "fetch",
        "local",
        "remote",
        "rename",
        "rm"
      ]
    },
    "loot fetch": {
      "path": "loot fetch",
      "usage": "loot fetch [flags]",
      "summary": "Fetch a piece of loot from the server's loot store",
      "options": [
        {
          "name": "filter",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "filter based on loot type"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "save loot to a local file"
        }
      ]
    },
    "loot local": {
      "path": "loot local",
      "usage": "loot local [flags]",
      "summary": "Add a local file to the server's loot store",
      "options": [
        {
          "name": "file-type",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "force a specific file type (binary/text)"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name of this piece of loot"
        },
        {
          "name": "type",
          "short": "T",
          "type": "string",
          "default": "",
          "description": "force a specific loot type (file/cred)"
        }
      ]
    },
    "loot remote": {
      "path": "loot remote",
      "usage": "loot remote [flags]",
      "summary": "Add a remote file from the current session to the server's loot store",
      "options": [
        {
          "name": "file-type",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "force a specific file type (binary/text)"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "name of this piece of loot"
        },
        {
          "name": "type",
          "short": "T",
          "type": "string",
          "default": "",
          "description": "force a specific loot type (file/cred)"
        }
      ]
    },
    "loot rename": {
      "path": "loot rename",
      "usage": "loot rename",
      "summary": "Re-name a piece of existing loot"
    },
    "loot rm": {
      "path": "loot rm",
      "usage": "loot rm [flags]",
      "summary": "Remove a piece of loot from the server's loot store",
      "options": [
        {
          "name": "filter",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "filter based on loot type"
        }
      ]
    },
    "mcp": {
      "path": "mcp",
      "usage": "mcp",
      "summary": "Manage the MCP server",
      "subcommands": [
        "console",
        "start",
        "stop"
      ]
    },
    "mcp console": {
      "path": "mcp console",
      "usage": "mcp console [flags]",
      "summary": "Open an MCP console session",
      "aliases": [
        "repl"
      ],
      "options": [
        {
          "name": "auth-token",
          "type": "string",
          "default": "",
          "description": "MCP auth token (defaults to the local mcp.yaml token)"
        },
        {
          "name": "transport",
          "type": "string",
          "default": "sse",
          "description": "mcp transport (http or sse)"
        },
        {
          "name": "url",
          "type": "string",
          "default": "",
          "description": "mcp server URL (defaults to local server settings)"
        }
      ]
    },
    "mcp start": {
      "path": "mcp start",
      "usage": "mcp start [flags]",
      "summary": "Start the MCP server",
      "options": [
        {
          "name": "listen",
          "type": "string",
          "default": "127.0.0.1:8080",
          "description": "listen address for the MCP server"
        },
        {
          "name": "name",
          "type": "string",
          "default": "Sliver MCP",
          "description": "server name for MCP initialize"
        },
        {
          "name": "transport",
          "type": "string",
          "default": "sse",
          "description": "mcp transport (http or sse)"
        },
        {
          "name": "version",
          "type": "string",
          "default": "devel",
          "description": "server version for MCP initialize"
        }
      ]
    },
    "mcp stop": {
      "path": "mcp stop",
      "usage": "mcp stop",
      "summary": "Stop the MCP server"
    },
    "monitor": {
      "path": "monitor",
      "usage": "monitor",
      "summary": "Monitor threat intel platforms for Sliver implants",
      "subcommands": [
        "start",
        "stop"
      ]
    },
    "monitor start": {
      "path": "monitor start",
      "usage": "monitor start",
      "summary": "Start the monitoring loops"
    },
    "monitor stop": {
      "path": "monitor stop",
      "usage": "monitor stop",
      "summary": "Stop the monitoring loops"
    },
    "mtls": {
      "path": "mtls",
      "usage": "mtls [flags]",
      "summary": "Start an mTLS listener",
      "options": [
        {
          "name": "lhost",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "interface to bind server to"
        },
        {
          "name": "lport",
          "short": "l",
          "type": "uint",
          "default": "8888",
          "description": "tcp listen port"
        }
      ]
    },
    "operators": {
      "path": "operators",
      "usage": "operators [flags]",
      "summary": "Manage operators",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "profiles": {
      "path": "profiles",
      "usage": "profiles",
      "summary": "List existing profiles",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "generate",
        "info",
        "new",
        "rm",
        "stage"
      ]
    },
    "profiles generate": {
      "path": "profiles generate",
      "usage": "profiles generate [flags]",
      "summary": "Generate implant from a profile",
      "options": [
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "Implant name"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "directory/file to the binary to"
        },
        {
          "name": "shellcode-encoder",
          "type": "string",
          "default": "",
          "description": "shellcode encoder to apply (optional; see `shellcode-encoders`)"
        }
      ]
    },
    "profiles info": {
      "path": "profiles info",
      "usage": "profiles info",
      "summary": "Details about a profile"
    },
    "profiles new": {
      "path": "profiles new",
      "usage": "profiles new [flags]",
      "summary": "Create a new implant profile (interactive session)",
      "options": [
        {
          "name": "all-protocols",
          "type": "bool",
          "default": "false",
          "description": "force include all transport protocols"
        },
        {
          "name": "arch",
          "short": "a",
          "type": "string",
          "default": "amd64",
          "description": "cpu architecture"
        },
        {
          "name": "c2profile",
          "short": "C",
          "type": "string",
          "default": "default",
          "description": "HTTP C2 profile to use"
        },
        {
          "name": "canary",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "canary domain(s)"
        },
        {
          "name": "debug",
          "short": "d",
          "type": "bool",
          "default": "false",
          "description": "enable debug features"
        },
        {
          "name": "debug-file",
          "short": "O",
          "type": "string",
          "default": "",
          "description": "path to debug output"
        },
        {
          "name": "dns",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "dns connection strings"
        },
        {
          "name": "donut-bypass",
          "type": "uint",
          "default": "3",
          "description": "Deprecated (use --shellcode-bypass)"
        },
        {
          "name": "donut-compress",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-compress)"
        },
        {
          "name": "donut-entropy",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-entropy)"
        },
        {
          "name": "donut-exitopt",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-exitopt)"
        },
        {
          "name": "donut-headers",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-headers)"
        },
        {
          "name": "donut-oep",
          "type": "uint",
          "default": "0",
          "description": "Deprecated (use --shellcode-oep)"
        },
        {
          "name": "donut-thread",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-thread)"
        },
        {
          "name": "donut-unicode",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-unicode)"
        },
        {
          "name": "evasion",
          "short": "e",
          "type": "bool",
          "default": "false",
          "description": "enable evasion features (e.g. overwrite user space hooks)"
        },
        {
          "name": "exports",
          "short": "v",
          "type": "string",
          "default": "StartW,VoidFunc,DllInstall,DllRegisterServer,DllUnregisterServer",
          "description": "comma separated list of exports to include in the binary"
        },
        {
          "name": "external-builder",
          "short": "E",
          "type": "bool",
          "default": "false",
          "description": "use an external builder"
        },
        {
          "name": "format",
          "short": "f",
          "type": "string",
          "default": "exe",
          "description": "Specifies the output formats, valid values are: 'exe', 'shared' (for dynamic libraries), 'service' (see: `psexec` for more info) and 'shellcode' (windows, darwin/arm64, linux/amd64, linux/arm64)"
        },
        {
          "name": "http",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "http(s) connection strings"
        },
        {
          "name": "include-dns",
          "type": "bool",
          "default": "false",
          "description": "force include dns transport"
        },
        {
          "name": "include-http",
          "type": "bool",
          "default": "false",
          "description": "force include http transport"
        },
        {
          "name": "include-mtls",
          "type": "bool",
          "default": "false",
          "description": "force include mtls transport"
        },
        {
          "name": "include-named-pipe",
          "type": "bool",
          "default": "false",
          "description": "force include named-pipe transport"
        },
        {
          "name": "include-tcp-pivot",
          "type": "bool",
          "default": "false",
          "description": "force include tcp-pivot transport"
        },
        {
          "name": "include-wg",
          "type": "bool",
          "default": "false",
          "description": "force include wireguard transport"
        },
        {
          "name": "key-exchange",
          "short": "X",
          "type": "uint",
          "default": "1337",
          "description": "wg key-exchange port"
        },
        {
          "name": "limit-datetime",
          "short": "w",
          "type": "string",
          "default": "",
          "description": "limit execution to before datetime"
        },
        {
          "name": "limit-domainjoined",
          "short": "x",
          "type": "bool",
          "default": "false",
          "description": "limit execution to domain joined machines"
        },
        {
          "name": "limit-fileexists",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "limit execution to hosts with this file in the filesystem"
        },
        {
          "name": "limit-hostname",
          "short": "z",
          "type": "string",
          "default": "",
          "description": "limit execution to specified hostname"
        },
        {
          "name": "limit-locale",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "limit execution to hosts that match this locale"
        },
        {
          "name": "limit-username",
          "short": "y",
          "type": "string",
          "default": "",
          "description": "limit execution to specified username"
        },
        {
          "name": "max-errors",
          "short": "k",
          "type": "uint",
          "default": "1000",
          "description": "max number of connection errors"
        },
        {
          "name": "mtls",
          "short": "m",
          "type": "string",
          "default": "",
          "description": "mtls connection strings"
        },
        {
          "name": "name",
          "short": "N",
          "type": "string",
          "default": "",
          "description": "agent name"
        },
        {
          "name": "named-pipe",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "named-pipe connection strings"
        },
        {
          "name": "netgo",
          "short": "q",
          "type": "bool",
          "default": "false",
          "description": "force the use of netgo"
        },
        {
          "name": "os",
          "short": "o",
          "type": "string",
          "default": "windows",
          "description": "operating system"
        },
        {
          "name": "poll-timeout",
          "short": "P",
          "type": "int",
          "default": "360",
          "description": "long poll request timeout"
        },
        {
          "name": "reconnect",
          "short": "j",
          "type": "int",
          "default": "60",
          "description": "attempt to reconnect every n second(s)"
        },
        {
          "name": "run-at-load",
          "short": "R",
          "type": "bool",
          "default": "false",
          "description": "run the implant entrypoint from DllMain/Constructor (shared library only)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "directory/file to the binary to"
        },
        {
          "name": "shellcode-bypass",
          "type": "uint",
          "default": "3",
          "description": "Shellcode bypass mode (Donut: 1=none, 2=abort, 3=continue) (windows shellcode only)"
        },
        {
          "name": "shellcode-compress",
          "type": "bool",
          "default": "false",
          "description": "Enable shellcode compression (aPLib) (windows, macOS, and Linux shellcode)"
        },
        {
          "name": "shellcode-encoder",
          "type": "string",
          "default": "",
          "description": "shellcode encoder to apply (optional; see `shellcode-encoders`)"
        },
        {
          "name": "shellcode-entropy",
          "type": "uint",
          "default": "1",
          "description": "Shellcode entropy (Donut: 1=none, 2=random names, 3=random+encrypt) (windows shellcode only)"
        },
        {
          "name": "shellcode-exitopt",
          "type": "uint",
          "default": "1",
          "description": "Shellcode exit option (Donut: 1=exit thread, 2=exit process, 3=block) (windows shellcode only)"
        },
        {
          "name": "shellcode-headers",
          "type": "uint",
          "default": "1",
          "description": "Shellcode headers handling (Donut: 1=overwrite, 2=keep) (windows shellcode only)"
        },
        {
          "name": "shellcode-oep",
          "type": "uint",
          "default": "0",
          "description": "Override original entry point (OEP) (Donut) (windows shellcode only)"
        },
        {
          "name": "shellcode-thread",
          "type": "bool",
          "default": "false",
          "description": "Run unmanaged EXE entrypoint as a new thread (Donut) (windows shellcode only)"
        },
        {
          "name": "shellcode-unicode",
          "type": "bool",
          "default": "false",
          "description": "Use Unicode command line for unmanaged DLL entrypoints (Donut) (windows shellcode only)"
        },
        {
          "name": "skip-symbols",
          "short": "l",
          "type": "bool",
          "default": "false",
          "description": "skip symbol obfuscation"
        },
        {
          "name": "spoof-metadata",
          "type": "bool",
          "default": "",
          "description": "spoof executable metadata (optional donor path)"
        },
        {
          "name": "strategy",
          "short": "Z",
          "type": "string",
          "default": "",
          "description": "specify a connection strategy (r = random, rd = random domain, s = sequential)"
        },
        {
          "name": "tcp-comms",
          "short": "T",
          "type": "uint",
          "default": "8888",
          "description": "wg c2 comms port"
        },
        {
          "name": "tcp-pivot",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "tcp-pivot connection strings"
        },
        {
          "name": "template",
          "short": "I",
          "type": "string",
          "default": "sliver",
          "description": "implant code template"
        },
        {
          "name": "traffic-encoders",
          "short": "A",
          "type": "string",
          "default": "",
          "description": "comma separated list of traffic encoders to enable"
        },
        {
          "name": "wg",
          "short": "g",
          "type": "string",
          "default": "",
          "description": "wg connection strings"
        }
      ],
      "subcommands": [
        "beacon"
      ]
    },
    "profiles new beacon": {
      "path": "profiles new beacon",
      "usage": "profiles new beacon [flags]",
      "summary": "Create a new implant profile (beacon)",
      "options": [
        {
          "name": "all-protocols",
          "type": "bool",
          "default": "false",
          "description": "force include all transport protocols"
        },
        {
          "name": "arch",
          "short": "a",
          "type": "string",
          "default": "amd64",
          "description": "cpu architecture"
        },
        {
          "name": "c2profile",
          "short": "C",
          "type": "string",
          "default": "default",
          "description": "HTTP C2 profile to use"
        },
        {
          "name": "canary",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "canary domain(s)"
        },
        {
          "name": "days",
          "short": "D",
          "type": "int",
          "default": "0",
          "description": "beacon interval days"
        },
        {
          "name": "debug",
          "short": "d",
          "type": "bool",
          "default": "false",
          "description": "enable debug features"
        },
        {
          "name": "debug-file",
          "short": "O",
          "type": "string",
          "default": "",
          "description": "path to debug output"
        },
        {
          "name": "dns",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "dns connection strings"
        },
        {
          "name": "donut-bypass",
          "type": "uint",
          "default": "3",
          "description": "Deprecated (use --shellcode-bypass)"
        },
        {
          "name": "donut-compress",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-compress)"
        },
        {
          "name": "donut-entropy",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-entropy)"
        },
        {
          "name": "donut-exitopt",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-exitopt)"
        },
        {
          "name": "donut-headers",
          "type": "uint",
          "default": "1",
          "description": "Deprecated (use --shellcode-headers)"
        },
        {
          "name": "donut-oep",
          "type": "uint",
          "default": "0",
          "description": "Deprecated (use --shellcode-oep)"
        },
        {
          "name": "donut-thread",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-thread)"
        },
        {
          "name": "donut-unicode",
          "type": "bool",
          "default": "false",
          "description": "Deprecated (use --shellcode-unicode)"
        },
        {
          "name": "evasion",
          "short": "e",
          "type": "bool",
          "default": "false",
          "description": "enable evasion features (e.g. overwrite user space hooks)"
        },
        {
          "name": "exports",
          "short": "v",
          "type": "string",
          "default": "StartW,VoidFunc,DllInstall,DllRegisterServer,DllUnregisterServer",
          "description": "comma separated list of exports to include in the binary"
        },
        {
          "name": "external-builder",
          "short": "E",
          "type": "bool",
          "default": "false",
          "description": "use an external builder"
        },
        {
          "name": "format",
          "short": "f",
          "type": "string",
          "default": "exe",
          "description": "Specifies the output formats, valid values are: 'exe', 'shared' (for dynamic libraries), 'service' (see: `psexec` for more info) and 'shellcode' (windows, darwin/arm64, linux/amd64, linux/arm64)"
        },
        {
          "name": "hours",
          "short": "H",
          "type": "int",
          "default": "0",
          "description": "beacon interval hours"
        },
        {
          "name": "http",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "http(s) connection strings"
        },
        {
          "name": "include-dns",
          "type": "bool",
          "default": "false",
          "description": "force include dns transport"
        },
        {
          "name": "include-http",
          "type": "bool",
          "default": "false",
          "description": "force include http transport"
        },
        {
          "name": "include-mtls",
          "type": "bool",
          "default": "false",
          "description": "force include mtls transport"
        },
        {
          "name": "include-named-pipe",
          "type": "bool",
          "default": "false",
          "description": "force include named-pipe transport"
        },
        {
          "name": "include-tcp-pivot",
          "type": "bool",
          "default": "false",
          "description": "force include tcp-pivot transport"
        },
        {
          "name": "include-wg",
          "type": "bool",
          "default": "false",
          "description": "force include wireguard transport"
        },
        {
          "name": "jitter",
          "short": "J",
          "type": "int",
          "default": "30",
          "description": "beacon interval jitter in seconds"
        },
        {
          "name": "key-exchange",
          "short": "X",
          "type": "uint",
          "default": "1337",
          "description": "wg key-exchange port"
        },
        {
          "name": "limit-datetime",
          "short": "w",
          "type": "string",
          "default": "",
          "description": "limit execution to before datetime"
        },
        {
          "name": "limit-domainjoined",
          "short": "x",
          "type": "bool",
          "default": "false",
          "description": "limit execution to domain joined machines"
        },
        {
          "name": "limit-fileexists",
          "short": "F",
          "type": "string",
          "default": "",
          "description": "limit execution to hosts with this file in the filesystem"
        },
        {
          "name": "limit-hostname",
          "short": "z",
          "type": "string",
          "default": "",
          "description": "limit execution to specified hostname"
        },
        {
          "name": "limit-locale",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "limit execution to hosts that match this locale"
        },
        {
          "name": "limit-username",
          "short": "y",
          "type": "string",
          "default": "",
          "description": "limit execution to specified username"
        },
        {
          "name": "max-errors",
          "short": "k",
          "type": "uint",
          "default": "1000",
          "description": "max number of connection errors"
        },
        {
          "name": "minutes",
          "short": "M",
          "type": "int",
          "default": "0",
          "description": "beacon interval minutes"
        },
        {
          "name": "mtls",
          "short": "m",
          "type": "string",
          "default": "",
          "description": "mtls connection strings"
        },
        {
          "name": "name",
          "short": "N",
          "type": "string",
          "default": "",
          "description": "agent name"
        },
        {
          "name": "named-pipe",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "named-pipe connection strings"
        },
        {
          "name": "netgo",
          "short": "q",
          "type": "bool",
          "default": "false",
          "description": "force the use of netgo"
        },
        {
          "name": "os",
          "short": "o",
          "type": "string",
          "default": "windows",
          "description": "operating system"
        },
        {
          "name": "poll-timeout",
          "short": "P",
          "type": "int",
          "default": "360",
          "description": "long poll request timeout"
        },
        {
          "name": "reconnect",
          "short": "j",
          "type": "int",
          "default": "60",
          "description": "attempt to reconnect every n second(s)"
        },
        {
          "name": "run-at-load",
          "short": "R",
          "type": "bool",
          "default": "false",
          "description": "run the implant entrypoint from DllMain/Constructor (shared library only)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "directory/file to the binary to"
        },
        {
          "name": "seconds",
          "short": "S",
          "type": "int",
          "default": "60",
          "description": "beacon interval seconds"
        },
        {
          "name": "shellcode-bypass",
          "type": "uint",
          "default": "3",
          "description": "Shellcode bypass mode (Donut: 1=none, 2=abort, 3=continue) (windows shellcode only)"
        },
        {
          "name": "shellcode-compress",
          "type": "bool",
          "default": "false",
          "description": "Enable shellcode compression (aPLib) (windows, macOS, and Linux shellcode)"
        },
        {
          "name": "shellcode-encoder",
          "type": "string",
          "default": "",
          "description": "shellcode encoder to apply (optional; see `shellcode-encoders`)"
        },
        {
          "name": "shellcode-entropy",
          "type": "uint",
          "default": "1",
          "description": "Shellcode entropy (Donut: 1=none, 2=random names, 3=random+encrypt) (windows shellcode only)"
        },
        {
          "name": "shellcode-exitopt",
          "type": "uint",
          "default": "1",
          "description": "Shellcode exit option (Donut: 1=exit thread, 2=exit process, 3=block) (windows shellcode only)"
        },
        {
          "name": "shellcode-headers",
          "type": "uint",
          "default": "1",
          "description": "Shellcode headers handling (Donut: 1=overwrite, 2=keep) (windows shellcode only)"
        },
        {
          "name": "shellcode-oep",
          "type": "uint",
          "default": "0",
          "description": "Override original entry point (OEP) (Donut) (windows shellcode only)"
        },
        {
          "name": "shellcode-thread",
          "type": "bool",
          "default": "false",
          "description": "Run unmanaged EXE entrypoint as a new thread (Donut) (windows shellcode only)"
        },
        {
          "name": "shellcode-unicode",
          "type": "bool",
          "default": "false",
          "description": "Use Unicode command line for unmanaged DLL entrypoints (Donut) (windows shellcode only)"
        },
        {
          "name": "skip-symbols",
          "short": "l",
          "type": "bool",
          "default": "false",
          "description": "skip symbol obfuscation"
        },
        {
          "name": "spoof-metadata",
          "type": "bool",
          "default": "",
          "description": "spoof executable metadata (optional donor path)"
        },
        {
          "name": "strategy",
          "short": "Z",
          "type": "string",
          "default": "",
          "description": "specify a connection strategy (r = random, rd = random domain, s = sequential)"
        },
        {
          "name": "tcp-comms",
          "short": "T",
          "type": "uint",
          "default": "8888",
          "description": "wg c2 comms port"
        },
        {
          "name": "tcp-pivot",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "tcp-pivot connection strings"
        },
        {
          "name": "template",
          "short": "I",
          "type": "string",
          "default": "sliver",
          "description": "implant code template"
        },
        {
          "name": "traffic-encoders",
          "short": "A",
          "type": "string",
          "default": "",
          "description": "comma separated list of traffic encoders to enable"
        },
        {
          "name": "wg",
          "short": "g",
          "type": "string",
          "default": "",
          "description": "wg connection strings"
        }
      ]
    },
    "profiles rm": {
      "path": "profiles rm",
      "usage": "profiles rm",
      "summary": "Remove a profile"
    },
    "profiles stage": {
      "path": "profiles stage",
      "usage": "profiles stage [flags]",
      "summary": "Generate implant from a profile and encode or encrypt it",
      "options": [
        {
          "name": "aes-encrypt-iv",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "AES Encryption IV"
        },
        {
          "name": "aes-encrypt-key",
          "short": "k",
          "type": "string",
          "default": "",
          "description": "AES Encryption Key"
        },
        {
          "name": "compress",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "Compress stage (zlib, gzip, deflate9 or deflate)"
        },
        {
          "name": "name",
          "short": "n",
          "type": "string",
          "default": "",
          "description": "Implant name"
        },
        {
          "name": "prepend-size",
          "short": "p",
          "type": "bool",
          "default": "false",
          "description": "Prepend stage size"
        },
        {
          "name": "rc4-encrypt-key",
          "short": "r",
          "type": "string",
          "default": "",
          "description": "RC4 encryption key"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "directory/file to the binary to"
        }
      ]
    },
    "reaction": {
      "path": "reaction",
      "usage": "reaction",
      "summary": "Manage automatic reactions to events",
      "subcommands": [
        "reload",
        "save",
        "set",
        "unset"
      ]
    },
    "reaction reload": {
      "path": "reaction reload",
      "usage": "reaction reload",
      "summary": "Reload reactions from disk, replaces the running configuration"
    },
    "reaction save": {
      "path": "reaction save",
      "usage": "reaction save",
      "summary": "Save current reactions to disk"
    },
    "reaction set": {
      "path": "reaction set",
      "usage": "reaction set [flags]",
      "summary": "Set a reaction to an event",
      "options": [
        {
          "name": "event",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "specify the event type to react to"
        }
      ]
    },
    "reaction unset": {
      "path": "reaction unset",
      "usage": "reaction unset [flags]",
      "summary": "Unset an existing reaction",
      "options": [
        {
          "name": "id",
          "short": "i",
          "type": "int",
          "default": "0",
          "description": "the id of the reaction to remove"
        }
      ]
    },
    "regenerate": {
      "path": "regenerate",
      "usage": "regenerate [flags]",
      "summary": "Regenerate an implant",
      "options": [
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "directory/file to the binary to"
        }
      ]
    },
    "sessions": {
      "path": "sessions",
      "usage": "sessions [flags]",
      "summary": "Session management",
      "options": [
        {
          "name": "clean",
          "short": "C",
          "type": "bool",
          "default": "false",
          "description": "clean out any sessions marked as [DEAD]"
        },
        {
          "name": "filter",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "filter sessions by substring"
        },
        {
          "name": "filter-re",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "filter sessions by regular expression"
        },
        {
          "name": "force",
          "short": "F",
          "type": "bool",
          "default": "false",
          "description": "force session action without waiting for results"
        },
        {
          "name": "interact",
          "short": "i",
          "type": "string",
          "default": "",
          "description": "interact with a session"
        },
        {
          "name": "kill",
          "short": "k",
          "type": "string",
          "default": "",
          "description": "kill the designated session"
        },
        {
          "name": "kill-all",
          "short": "K",
          "type": "bool",
          "default": "false",
          "description": "kill all the sessions"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "prune"
      ]
    },
    "sessions prune": {
      "path": "sessions prune",
      "usage": "sessions prune [flags]",
      "summary": "Kill all stale/dead sessions",
      "options": [
        {
          "name": "force",
          "short": "F",
          "type": "bool",
          "default": "false",
          "description": "Force the killing of stale/dead sessions"
        }
      ]
    },
    "settings": {
      "path": "settings",
      "usage": "settings [flags]",
      "summary": "Manage client settings",
      "options": [
        {
          "name": "show",
          "type": "bool",
          "default": "false",
          "description": "Show current settings without prompting"
        }
      ],
      "subcommands": [
        "always-overflow",
        "autoadult",
        "beacon-autoresults",
        "console-logs",
        "readline",
        "save",
        "small-terminal",
        "tables",
        "user-connect"
      ]
    },
    "settings always-overflow": {
      "path": "settings always-overflow",
      "usage": "settings always-overflow",
      "summary": "Disable table pagination"
    },
    "settings autoadult": {
      "path": "settings autoadult",
      "usage": "settings autoadult",
      "summary": "Automatically accept OPSEC warnings"
    },
    "settings beacon-autoresults": {
      "path": "settings beacon-autoresults",
      "usage": "settings beacon-autoresults",
      "summary": "Automatically display beacon task results when completed"
    },
    "settings console-logs": {
      "path": "settings console-logs",
      "usage": "settings console-logs",
      "summary": "Log console output (toggle)"
    },
    "settings readline": {
      "path": "settings readline",
      "usage": "settings readline",
      "summary": "Manipulate readline options, keymaps and bindings",
      "subcommands": [
        "bind",
        "set"
      ]
    },
    "settings readline bind": {
      "path": "settings readline bind",
      "usage": "settings readline bind [flags]",
      "summary": "Display or modify readline key bindings",
      "options": [
        {
          "name": "app",
          "short": "A",
          "type": "string",
          "default": "",
          "description": "Optional application name (if empty/not used, the current app)"
        },
        {
          "name": "binds",
          "short": "P",
          "type": "bool",
          "default": "false",
          "description": "List function names and bindings"
        },
        {
          "name": "binds-rc",
          "short": "p",
          "type": "bool",
          "default": "false",
          "description": "List functions and bindings in a form that can be reused as input"
        },
        {
          "name": "changed",
          "short": "c",
          "type": "bool",
          "default": "false",
          "description": "Only export options modified since app start: maybe not needed, since no use for it"
        },
        {
          "name": "file",
          "short": "f",
          "type": "string",
          "default": "",
          "description": "Read key bindings from FILENAME"
        },
        {
          "name": "keymap",
          "short": "m",
          "type": "string",
          "default": "",
          "description": "Specify the keymap"
        },
        {
          "name": "lib",
          "short": "L",
          "type": "bool",
          "default": "false",
          "description": "Like 'app', but export options/binds for all apps using this specific library"
        },
        {
          "name": "list",
          "short": "l",
          "type": "bool",
          "default": "false",
          "description": "List names of functions"
        },
        {
          "name": "macros",
          "short": "S",
          "type": "bool",
          "default": "false",
          "description": "List key sequences that invoke macros and their values"
        },
        {
          "name": "macros-rc",
          "short": "s",
          "type": "bool",
          "default": "false",
          "description": "List key sequences that invoke macros and their values in a form that can be reused as input"
        },
        {
          "name": "query",
          "short": "q",
          "type": "string",
          "default": "",
          "description": "Query about which keys invoke the named function"
        },
        {
          "name": "remove",
          "short": "r",
          "type": "string",
          "default": "",
          "description": "Remove the bindings for KEYSEQ"
        },
        {
          "name": "self-insert",
          "short": "I",
          "type": "bool",
          "default": "false",
          "description": "If exporting bind sequences, also include the sequences mapped to self-insert"
        },
        {
          "name": "unbind",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "Unbind all keys which are bound to the named function"
        },
        {
          "name": "vars",
          "short": "V",
          "type": "bool",
          "default": "false",
          "description": "List variables names and values"
        },
        {
          "name": "vars-rc",
          "short": "v",
          "type": "bool",
          "default": "false",
          "description": "List variables names and values in a form that can be reused as input"
        }
      ]
    },
    "settings readline set": {
      "path": "settings readline set",
      "usage": "settings readline set",
      "summary": "Manipulate readline global options"
    },
    "settings save": {
      "path": "settings save",
      "usage": "settings save",
      "summary": "Save the current settings to disk"
    },
    "settings small-terminal": {
      "path": "settings small-terminal",
      "usage": "settings small-terminal",
      "summary": "Set the small terminal width"
    },
    "settings tables": {
      "path": "settings tables",
      "usage": "settings tables",
      "summary": "Modify tables setting (style)"
    },
    "settings user-connect": {
      "path": "settings user-connect",
      "usage": "settings user-connect",
      "summary": "Enable user connections/disconnections (can be very verbose when they use CLI)"
    },
    "shellcode-encoders": {
      "path": "shellcode-encoders",
      "usage": "shellcode-encoders [flags]",
      "summary": "List supported shellcode encoders",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "encode"
      ]
    },
    "shellcode-encoders encode": {
      "path": "shellcode-encoders encode",
      "usage": "shellcode-encoders encode \u003cshellcode file\u003e... [flags]",
      "summary": "Encode shellcode using server encoders",
      "options": [
        {
          "name": "arch",
          "short": "a",
          "type": "string",
          "default": "amd64",
          "description": "architecture of the shellcode"
        },
        {
          "name": "bad-chars",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "hex encoded bad characters to avoid (e.g. 0001)"
        },
        {
          "name": "encoder",
          "short": "e",
          "type": "string",
          "default": "",
          "description": "encoder to use (shikata_ga_nai, xor, xor_dynamic)"
        },
        {
          "name": "iterations",
          "short": "i",
          "type": "int",
          "default": "1",
          "description": "number of encoding iterations"
        },
        {
          "name": "output",
          "short": "o",
          "type": "string",
          "default": "",
          "description": "output file (or directory when encoding multiple files)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "shikata-ga-nai": {
      "path": "shikata-ga-nai",
      "usage": "shikata-ga-nai [flags]",
      "summary": "Polymorphic binary shellcode encoder (ノ ゜Д゜)ノ ︵ 仕方がない",
      "options": [
        {
          "name": "arch",
          "short": "a",
          "type": "string",
          "default": "amd64",
          "description": "architecture of shellcode"
        },
        {
          "name": "bad-chars",
          "short": "b",
          "type": "string",
          "default": "",
          "description": "hex encoded bad characters to avoid (e.g. 0001)"
        },
        {
          "name": "iterations",
          "short": "i",
          "type": "int",
          "default": "1",
          "description": "number of iterations"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "save output to local file"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "socks5": {
      "path": "socks5",
      "usage": "socks5",
      "summary": "In-band SOCKS5 Proxy",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "stop"
      ]
    },
    "socks5 stop": {
      "path": "socks5 stop",
      "usage": "socks5 stop [flags]",
      "summary": "Stop a SOCKS5 proxy",
      "options": [
        {
          "name": "id",
          "short": "i",
          "type": "uint",
          "default": "0",
          "description": "id of portfwd to remove"
        }
      ]
    },
    "stage-listener": {
      "path": "stage-listener",
      "usage": "stage-listener [flags]",
      "summary": "Start a stager listener",
      "options": [
        {
          "name": "aes-encrypt-iv",
          "type": "string",
          "default": "",
          "description": "encrypt stage with AES encryption iv"
        },
        {
          "name": "aes-encrypt-key",
          "type": "string",
          "default": "",
          "description": "encrypt stage with AES encryption key"
        },
        {
          "name": "cert",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "path to PEM encoded certificate file (HTTPS only)"
        },
        {
          "name": "compress",
          "short": "C",
          "type": "string",
          "default": "none",
          "description": "compress the stage before encrypting (zlib, gzip, deflate9, none)"
        },
        {
          "name": "key",
          "short": "k",
          "type": "string",
          "default": "",
          "description": "path to PEM encoded private key file (HTTPS only)"
        },
        {
          "name": "lets-encrypt",
          "short": "e",
          "type": "bool",
          "default": "false",
          "description": "attempt to provision a let's encrypt certificate (HTTPS only)"
        },
        {
          "name": "prepend-size",
          "short": "P",
          "type": "bool",
          "default": "false",
          "description": "prepend the size of the stage to the payload (to use with MSF stagers)"
        },
        {
          "name": "profile",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "implant profile name to link with the listener"
        },
        {
          "name": "rc4-encrypt-key",
          "type": "string",
          "default": "",
          "description": "encrypt stage with RC4 encryption key"
        },
        {
          "name": "url",
          "short": "u",
          "type": "string",
          "default": "",
          "description": "URL to which the stager will call back to"
        }
      ]
    },
    "taskmany": {
      "path": "taskmany",
      "usage": "taskmany",
      "summary": "Task many beacons or sessions"
    },
    "update": {
      "path": "update",
      "usage": "update [flags]",
      "summary": "Check for updates",
      "options": [
        {
          "name": "force",
          "type": "bool",
          "default": "false",
          "description": "skip version comparison and download the latest release"
        },
        {
          "name": "insecure",
          "short": "I",
          "type": "bool",
          "default": "false",
          "description": "skip tls certificate validation"
        },
        {
          "name": "prereleases",
          "short": "P",
          "type": "bool",
          "default": "false",
          "description": "include pre-released (unstable) versions"
        },
        {
          "name": "proxy",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "specify a proxy url (e.g. http://localhost:8080)"
        },
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "save downloaded files to specific directory (default downloads dir)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "use": {
      "path": "use",
      "usage": "use",
      "summary": "Switch the active session or beacon",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "beacons",
        "sessions"
      ]
    },
    "use beacons": {
      "path": "use beacons",
      "usage": "use beacons",
      "summary": "Switch the active beacon"
    },
    "use sessions": {
      "path": "use sessions",
      "usage": "use sessions",
      "summary": "Switch the active session"
    },
    "version": {
      "path": "version",
      "usage": "version [flags]",
      "summary": "Display version information",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    },
    "websites": {
      "path": "websites",
      "usage": "websites",
      "summary": "Host static content (used with HTTP C2)",
      "options": [
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ],
      "subcommands": [
        "add-content",
        "content-type",
        "list",
        "rm",
        "rm-content",
        "show"
      ]
    },
    "websites add-content": {
      "path": "websites add-content",
      "usage": "websites add-content [flags]",
      "summary": "Add content to a website",
      "options": [
        {
          "name": "content",
          "short": "c",
          "type": "string",
          "default": "",
          "description": "local file path/dir (must use --recursive for dir)"
        },
        {
          "name": "content-type",
          "short": "m",
          "type": "string",
          "default": "",
          "description": "mime content-type (if blank use file ext.)"
        },
        {
          "name": "recursive",
          "short": "r",
          "type": "bool",
          "default": "false",
          "description": "recursively add/rm content"
        },
        {
          "name": "web-path",
          "short": "p",
          "type": "string",
          "default": "/",
          "description": "http path to host file at"
        },
        {
          "name": "website",
          "short": "w",
          "type": "string",
          "default": "",
          "description": "website name"
        }
      ]
    },
    "websites content-type": {
      "path": "websites content-type",
      "usage": "websites content-type [flags]",
      "summary": "Update a path's content-type",
      "options": [
        {
          "name": "content-type",
          "short": "m",
          "type": "string",
          "default": "",
          "description": "mime content-type (if blank use file ext.)"
        },
        {
          "name": "web-path",
          "short": "p",
          "type": "string",
          "default": "/",
          "description": "http path to host file at"
        },
        {
          "name": "website",
          "short": "w",
          "type": "string",
          "default": "",
          "description": "website name"
        }
      ]
    },
    "websites list": {
      "path": "websites list",
      "usage": "websites list",
      "summary": "List configured websites"
    },
    "websites rm": {
      "path": "websites rm",
      "usage": "websites rm [name]",
      "summary": "Remove an entire website and all of its contents"
    },
    "websites rm-content": {
      "path": "websites rm-content",
      "usage": "websites rm-content [flags]",
      "summary": "Remove specific content from a website",
      "options": [
        {
          "name": "recursive",
          "short": "r",
          "type": "bool",
          "default": "false",
          "description": "recursively add/rm content"
        },
        {
          "name": "web-path",
          "short": "p",
          "type": "string",
          "default": "",
          "description": "http path to host file at"
        },
        {
          "name": "website",
          "short": "w",
          "type": "string",
          "default": "",
          "description": "website name"
        }
      ]
    },
    "websites show": {
      "path": "websites show",
      "usage": "websites show [name]",
      "summary": "Show contents of a website"
    },
    "wg": {
      "path": "wg",
      "usage": "wg [flags]",
      "summary": "Start a WireGuard listener",
      "options": [
        {
          "name": "key-port",
          "short": "x",
          "type": "uint",
          "default": "1337",
          "description": "virtual tun interface key exchange port"
        },
        {
          "name": "lhost",
          "short": "L",
          "type": "string",
          "default": "",
          "description": "interface to bind server to"
        },
        {
          "name": "lport",
          "short": "l",
          "type": "uint",
          "default": "53",
          "description": "udp listen port"
        },
        {
          "name": "nport",
          "short": "n",
          "type": "uint",
          "default": "8888",
          "description": "virtual tun interface listen port"
        }
      ]
    },
    "wg-config": {
      "path": "wg-config",
      "usage": "wg-config [flags]",
      "summary": "Generate a new WireGuard client config",
      "options": [
        {
          "name": "save",
          "short": "s",
          "type": "string",
          "default": "",
          "description": "save configuration to file (.conf)"
        },
        {
          "name": "timeout",
          "short": "t",
          "type": "int",
          "default": "60",
          "description": "grpc timeout in seconds"
        }
      ]
    }
  }
});
