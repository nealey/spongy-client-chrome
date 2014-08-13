package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"bufio"
	"strconv"
	"strings"
	"net/http"
	"net/http/cgi"
	"time"
	"path"
)

type Handler struct {
	cgi.Handler
}

var ServerDir string

func ReadString(fn string) string {
	octets, err := ioutil.ReadFile(fn)
	if err != nil {
		log.Fatal(err)
	}
	return strings.TrimSpace(string(octets))
}

func tail(w http.ResponseWriter, pos int) {
	f, err := os.Open(path.Join(ServerDir, "log"))
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	
	for {
		printid := false
		
		_, err = f.Seek(int64(pos), 0)
		if err != nil {
			log.Fatal(err)
		}
		bf := bufio.NewScanner(f)
		for bf.Scan() {
			t := bf.Text()
			pos += len(t) + 1 // XXX: this breaks if we ever see \r\n
			fmt.Fprintf(w, "data: %s\n", t)
			printid = true
		}
		if printid {
			_, err = fmt.Fprintf(w, "id: %d\n\n", pos)
		}
		if err != nil {
			break
		}
		w.(http.Flusher).Flush()
		time.Sleep(350 * time.Millisecond)
	}
}

func handleCommand(w http.ResponseWriter, text string, target string) {
	fn := path.Join(ServerDir, fmt.Sprintf("outq/cgi.%d", time.Now().Unix()))
	f, err := os.Create(fn)
	if err != nil {
		fmt.Fprintln(w, "NO")
		fmt.Fprintln(w, err)
		return
	}
	defer f.Close()
	
	switch {
	case strings.HasPrefix(text, "/quote "):
		fmt.Fprintln(f, text[7:])
	case strings.HasPrefix(text, "/me "):
		fmt.Fprintf(f, "PRIVMSG %s :\001ACTION %s\001\n", target, text[4:])
	default:
		fmt.Fprintf(f, "PRIVMSG %s :%s\n", target, text)
	}

	fmt.Fprintln(w, "OK")
}


func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	BaseDir := "servers"
	DefaultDir := path.Join(BaseDir, "default")
	ServerDir = path.Join(BaseDir, r.FormValue("server"))
	
	if path.Dir(DefaultDir) != path.Dir(ServerDir) {
		ServerDir = DefaultDir
	}
	
	authtok := ReadString(path.Join(ServerDir, "authtok"))
	if r.FormValue("auth") != authtok {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintln(w, "NO")
		return
	}
	switch r.FormValue("type") {
	case "command":
		w.Header().Set("Content-Type", "text/plain")
		handleCommand(w, r.Form.Get("text"), r.FormValue("target"))
	default:
		w.Header().Set("Content-Type", "text/event-stream")
		id, _ := strconv.Atoi(os.Getenv("HTTP_LAST_EVENT_ID"))
		tail(w, id)
	}
}

func main() {
	h := Handler{}
	if err := cgi.Serve(h); err != nil {
		log.Fatal(err)
	}
}
