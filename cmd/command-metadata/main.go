package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"

	"github.com/bishopfox/sliver/client/command"
	clientconsole "github.com/bishopfox/sliver/client/console"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

type option struct {
	Name        string `json:"name"`
	Short       string `json:"short,omitempty"`
	Type        string `json:"type"`
	Default     string `json:"default"`
	Description string `json:"description"`
}

type commandSpec struct {
	Path        string   `json:"path"`
	Usage       string   `json:"usage"`
	Summary     string   `json:"summary"`
	Aliases     []string `json:"aliases,omitempty"`
	Options     []option `json:"options,omitempty"`
	Subcommands []string `json:"subcommands,omitempty"`
}

func main() {
	outputFormat := flag.String("format", "json", "output format: json or js")
	flag.Parse()

	result, err := buildMetadata()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if *outputFormat == "js" {
		data, marshalErr := json.MarshalIndent(result, "", "  ")
		if marshalErr != nil {
			fmt.Fprintln(os.Stderr, marshalErr)
			os.Exit(1)
		}
		fmt.Printf("/* Generated from the locked Sliver Cobra command trees. */\n(function (root, metadata) {\n  if (typeof module === 'object' && module.exports) module.exports = metadata;\n  root.OfficialCommandMetadata = metadata;\n})(typeof globalThis !== 'undefined' ? globalThis : this, %s);\n", data)
		return
	}
	if *outputFormat != "json" {
		fmt.Fprintf(os.Stderr, "unsupported format %q\n", *outputFormat)
		os.Exit(2)
	}
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(result); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func buildMetadata() (map[string]map[string]commandSpec, error) {
	temporaryClientRoot, err := os.MkdirTemp("", "sliver-command-metadata-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(temporaryClientRoot)

	const clientRootEnvironment = "SLIVER_CLIENT_ROOT_DIR"
	previousClientRoot, hadClientRoot := os.LookupEnv(clientRootEnvironment)
	if err := os.Setenv(clientRootEnvironment, temporaryClientRoot); err != nil {
		return nil, err
	}
	defer func() {
		if hadClientRoot {
			_ = os.Setenv(clientRootEnvironment, previousClientRoot)
			return
		}
		_ = os.Unsetenv(clientRootEnvironment)
	}()

	// Some official command constructors print diagnostics while discovering local
	// extension manifests. Keep generated metadata deterministic and machine-readable.
	originalStdout := os.Stdout
	readPipe, writePipe, err := os.Pipe()
	if err != nil {
		return nil, err
	}
	os.Stdout = writePipe
	discarded := make(chan struct{})
	go func() {
		_, _ = io.Copy(io.Discard, readPipe)
		close(discarded)
	}()

	con := clientconsole.NewConsole(false)
	con.IsCLI = true
	result := map[string]map[string]commandSpec{
		"server": collect(command.ServerCommands(con, nil)()),
		"agent":  collect(command.SliverCommands(con)()),
	}
	os.Stdout = originalStdout
	_ = writePipe.Close()
	<-discarded
	_ = readPipe.Close()
	return result, nil
}

func collect(root *cobra.Command) map[string]commandSpec {
	result := map[string]commandSpec{}
	for _, cmd := range root.Commands() {
		walk(cmd, "", result)
	}
	return result
}

func walk(cmd *cobra.Command, parent string, result map[string]commandSpec) {
	name := cmd.Name()
	path := strings.TrimSpace(strings.Join([]string{parent, name}, " "))
	spec := commandSpec{Path: path, Usage: strings.TrimSpace(cmd.UseLine()), Summary: cmd.Short, Aliases: cmd.Aliases}
	cmd.NonInheritedFlags().VisitAll(func(flag *pflag.Flag) {
		spec.Options = append(spec.Options, option{
			Name: flag.Name, Short: flag.Shorthand, Type: normalizeType(flag.Value.Type()),
			Default: flag.DefValue, Description: flag.Usage,
		})
	})
	for _, child := range cmd.Commands() {
		if !child.Hidden {
			spec.Subcommands = append(spec.Subcommands, child.Name())
		}
	}
	sort.Strings(spec.Subcommands)
	result[path] = spec
	for _, child := range cmd.Commands() {
		if !child.Hidden {
			walk(child, path, result)
		}
	}
}

func normalizeType(valueType string) string {
	switch valueType {
	case "bool":
		return "bool"
	case "int", "int8", "int16", "int32", "int64":
		return "int"
	case "uint", "uint8", "uint16", "uint32", "uint64":
		return "uint"
	case "stringArray":
		return "stringArray"
	case "stringSlice":
		return "stringSlice"
	default:
		return "string"
	}
}
