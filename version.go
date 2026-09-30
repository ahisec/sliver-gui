package main

import "runtime/debug"

// Build metadata. These are overridden at build time via -ldflags, e.g.:
//
//	wails build -tags webkit2_41 -ldflags "\
//	  -X main.Version=$(git describe --tags --always) \
//	  -X main.GitCommit=$(git rev-parse --short HEAD) \
//	  -X main.BuildDate=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
//
// Left as sensible defaults for `go run` / untagged dev builds.
var (
	// Version is the semantic version of this GUI (e.g. "v1.0.0").
	Version = "dev"
	// GitCommit is the short commit hash the binary was built from.
	GitCommit = "unknown"
	// BuildDate is the UTC build timestamp (RFC3339).
	BuildDate = "unknown"
)

// BuildInfo is returned to the frontend for display in the About/title bar.
type BuildInfo struct {
	Version      string             `json:"version"`
	GitCommit    string             `json:"gitCommit"`
	BuildDate    string             `json:"buildDate"`
	Dependencies DependencyVersions `json:"dependencies"`
}

// DependencyVersions identifies the client-side libraries compiled into the
// GUI. The Sliver value is not the connected Teamserver version.
type DependencyVersions struct {
	Wails    string `json:"wails"`
	Sliver   string `json:"sliver"`
	Protobuf string `json:"protobuf"`
}

func dependencyVersion(info *debug.BuildInfo, path string) string {
	if info == nil {
		return "unknown"
	}
	for _, dependency := range info.Deps {
		if dependency.Path != path {
			continue
		}
		if dependency.Replace != nil && dependency.Replace.Version != "" {
			return dependency.Replace.Version
		}
		if dependency.Version != "" {
			return dependency.Version
		}
		return "unknown"
	}
	return "unknown"
}

func buildDependencyVersions(info *debug.BuildInfo) DependencyVersions {
	return DependencyVersions{
		Wails:    dependencyVersion(info, "github.com/wailsapp/wails/v2"),
		Sliver:   dependencyVersion(info, "github.com/bishopfox/sliver"),
		Protobuf: dependencyVersion(info, "google.golang.org/protobuf"),
	}
}

// AppVersion exposes build metadata to the frontend (bound as
// window.go.main.App.AppVersion).
func (a *App) AppVersion() BuildInfo {
	info, _ := debug.ReadBuildInfo()
	return BuildInfo{
		Version: Version, GitCommit: GitCommit, BuildDate: BuildDate,
		Dependencies: buildDependencyVersions(info),
	}
}
