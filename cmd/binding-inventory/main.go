package main

import (
	"bytes"
	"flag"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type method struct {
	Name      string
	File      string
	Line      int
	Signature string
	Category  string
}

func main() {
	out := flag.String("out", "docs/WAILS_BINDINGS.md", "output Markdown file")
	flag.Parse()
	methods, err := collect(".")
	if err != nil {
		panic(err)
	}
	var b strings.Builder
	b.WriteString("# Wails 绑定方法清单\n\n")
	b.WriteString("> 由 `go run ./cmd/binding-inventory` 从 `App` 的导出方法生成。此清单描述客户端绑定，不代表每个方法都直接对应一个 Sliver RPC。\n\n")
	fmt.Fprintf(&b, "共 **%d** 个导出方法。分类为静态启发式结果，审查具体行为时应以源码为准。\n\n", len(methods))
	b.WriteString("| 方法 | 分类 | 源码 | 签名 |\n|---|---|---|---|\n")
	for _, item := range methods {
		fmt.Fprintf(&b, "| `%s` | %s | `%s:%d` | `%s` |\n", item.Name, item.Category, filepath.ToSlash(item.File), item.Line, strings.ReplaceAll(item.Signature, "|", "\\|"))
	}
	if err := os.WriteFile(*out, []byte(b.String()), 0o644); err != nil {
		panic(err)
	}
}

func collect(root string) ([]method, error) {
	fset := token.NewFileSet()
	entries, err := filepath.Glob(filepath.Join(root, "*.go"))
	if err != nil {
		return nil, err
	}
	var result []method
	for _, path := range entries {
		if strings.HasSuffix(path, "_test.go") {
			continue
		}
		file, err := parser.ParseFile(fset, path, nil, 0)
		if err != nil {
			return nil, err
		}
		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Recv == nil || !fn.Name.IsExported() || !isAppReceiver(fn.Recv) {
				continue
			}
			var sig bytes.Buffer
			copy := *fn.Type
			copy.Func = token.NoPos
			if err := format.Node(&sig, fset, &copy); err != nil {
				return nil, err
			}
			pos := fset.Position(fn.Pos())
			result = append(result, method{
				Name: fn.Name.Name, File: filepath.Base(path), Line: pos.Line,
				Signature: strings.TrimPrefix(sig.String(), "func"), Category: category(path, fn.Name.Name),
			})
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

func isAppReceiver(fields *ast.FieldList) bool {
	if len(fields.List) != 1 {
		return false
	}
	t := fields.List[0].Type
	if star, ok := t.(*ast.StarExpr); ok {
		t = star.X
	}
	id, ok := t.(*ast.Ident)
	return ok && id.Name == "App"
}

func category(path, name string) string {
	base := filepath.Base(path)
	switch base {
	case "config_store.go", "version.go", "audit.go", "panels.go":
		return "客户端本地辅助"
	case "compatibility.go":
		return "兼容性聚合"
	case "armory.go":
		return "外部内容/本地安装"
	case "scripts.go":
		return "客户端工作流编排"
	case "shell.go":
		return "Sliver 隧道/RPC"
	}
	if strings.Contains(name, "Pick") || strings.Contains(name, "Download") || strings.Contains(name, "Upload") {
		return "RPC 与本地文件系统"
	}
	return "Sliver RPC/客户端封装"
}
