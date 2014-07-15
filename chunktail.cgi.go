package main

import (
	"fmt"
	"log"
	"os"
	"bufio"
	"strconv"
	"net/http"
	"net/http/cgi"
	"time"
)

type Handler struct {
	cgi.Handler
}


func tail(w http.ResponseWriter, pos int) {
	f, err := os.Open("/home/neale/bot/neale/log/log")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	
	
	_, err = f.Seek(int64(pos), 0)
	if err != nil {
		log.Fatal(err)
	}
	bf := bufio.NewScanner(f)
	for bf.Scan() {
		t := bf.Text()
		pos += len(t) + 1 // XXX: this breaks if we ever see \r\n
		fmt.Fprintf(w, "data: %s\n", t)
	}
	fmt.Fprintf(w, "id: %d\n\n", pos)
}

func handleCommand(w http.ResponseWriter, text string) {
	fn := fmt.Sprintf("/home/neale/bot/neale/outq/cgi.%d", time.Now().Unix())
	f, err := os.Create(fn)
	if err != nil {
		fmt.Fprintln(w, "NO")
		fmt.Fprintln(w, err)
		return
	}
	defer f.Close()
	fmt.Fprintf(f, "PRIVMSG #tron :%s\n", text)

	fmt.Fprintln(w, "OK")
}


func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.FormValue("type") {
	case "command":
		w.Header().Set("Content-Type", "text/plain")
		handleCommand(w, r.Form.Get("text"))
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

