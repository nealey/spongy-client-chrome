package main

import (
	"bufio"
	"crypto/tls"
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"strings"
	"time"
)

type Message struct {
	Command    string
	FullSender string
	Sender     string
	Forum      string
	Args       []string
	Text       string
}

var running bool = true
var logq chan Message

func isChannel(s string) bool {
	switch s[0] {
	case '#', '&', '!', '+', '.', '-':
		return true
	default:
		return false
	}
}

func (m Message) String() string {
	args := strings.Join(m.Args, " ")
	return fmt.Sprintf("%s %s %s %s %s :%s", m.FullSender, m.Command, m.Sender, m.Forum, args, m.Text)
}

func logLoop() {
	logf, err := os.OpenFile("log", os.O_WRONLY|os.O_APPEND|os.O_CREATE, 0666)
	if err != nil {
		log.Fatal(err)
	}
	defer logf.Close()
	for m := range logq {
		fmt.Fprintf(logf, "%d %s\n", time.Now().Unix(), m.String())
	}
}

func nuhost(s string) (string, string, string) {
	var parts []string

	parts = strings.SplitN(s, "!", 2)
	if len(parts) == 1 {
		return s, "", ""
	}
	n := parts[0]
	parts = strings.SplitN(parts[1], "@", 2)
	if len(parts) == 1 {
		return s, "", ""
	}
	return n, parts[0], parts[1]
}

func connect(host string, dotls bool) (net.Conn, error) {
	if dotls {
		config := &tls.Config{
			InsecureSkipVerify: true,
		}
		return tls.Dial("tcp", host, config)
	} else {
		return net.Dial("tcp", host)
	}
}

func readLoop(conn net.Conn, inq chan<- string) {
	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		inq <- scanner.Text()
	}
	close(inq)
}

func writeLoop(conn net.Conn, outq <-chan string) {
	for v := range outq {
		m, _ := parse(v)
		logq <- m
		fmt.Fprintln(conn, v)
	}
}

func parse(v string) (Message, error) {
	var m Message
	var parts []string
	var lhs string

	parts = strings.SplitN(v, " :", 2)
	if len(parts) == 2 {
		lhs = parts[0]
		m.Text = parts[1]
	} else {
		lhs = v
		m.Text = ""
	}

	m.FullSender = "."
	m.Forum = "."
	m.Sender = "."

	parts = strings.Split(lhs, " ")
	if parts[0][0] == ':' {
		m.FullSender = parts[0][1:]
		parts = parts[1:]

		n, u, _ := nuhost(m.FullSender)
		if u != "" {
			m.Sender = n
		}
	}

	m.Command = strings.ToUpper(parts[0])
	switch m.Command {
	case "PRIVMSG", "NOTICE":
		if isChannel(parts[1]) {
			m.Forum = parts[1]
		} else {
			m.Forum = m.Sender
		}
	case "PART", "MODE", "TOPIC", "KICK":
		m.Forum = parts[1]
	case "JOIN":
		if len(parts) == 1 {
			m.Forum = m.Text
			m.Text = ""
		} else {
			m.Forum = parts[1]
		}
	case "INVITE":
		if m.Text != "" {
			m.Forum = m.Text
			m.Text = ""
		} else {
			m.Forum = parts[2]
		}
	case "NICK":
		if len(parts) > 1 {
			m.Sender = parts[1]
		} else {
			m.Sender = m.Text
			m.Text = ""
		}
		m.Forum = m.Sender
	}

	return m, nil
}

func dispatch(outq chan<- string, m Message) {
	logq <- m
	switch m.Command {
	case "PING":
		outq <- "PONG :" + m.Text
	}
}

func handleInfile(path string, outq chan<- string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	os.Remove(path)
	inf := bufio.NewScanner(f)
	for inf.Scan() {
		txt := inf.Text()
		outq <- txt
	}
}

func monitorDirectory(dirname string, dir *os.File, outq chan<- string) {
	latest := time.Unix(0, 0)
	for running {
		fi, err := dir.Stat()
		if err != nil {
			break
		}
		current := fi.ModTime()
		if current.After(latest) {
			latest = current
			dn, _ := dir.Readdirnames(0)
			for _, fn := range dn {
				path := dirname + string(os.PathSeparator) + fn
				handleInfile(path, outq)
			}
			_, _ = dir.Seek(0, 0)
		}
		time.Sleep(500 * time.Millisecond)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "Usage: %s [OPTIONS] HOST:PORT\n", os.Args[0])
	flag.PrintDefaults()
}

func main() {
	dotls := flag.Bool("notls", true, "Disable TLS security")
	outqdir := flag.String("outq", "outq", "Output queue directory")

	flag.Parse()
	if flag.NArg() != 1 {
		fmt.Fprintln(os.Stderr, "Error: must specify host")
		os.Exit(69)
	}

	dir, err := os.Open(*outqdir)
	if err != nil {
		log.Fatal(err)
	}
	defer dir.Close()

	conn, err := connect(flag.Arg(0), *dotls)
	if err != nil {
		log.Fatal(err)
	}

	inq := make(chan string)
	outq := make(chan string)
	logq = make(chan Message)
	go logLoop()
	go readLoop(conn, inq)
	go writeLoop(conn, outq)
	go monitorDirectory(*outqdir, dir, outq)

	outq <- "NICK neale"
	outq <- "USER neale neale neale :neale"
	for v := range inq {
		p, err := parse(v)
		if err != nil {
			continue
		}
		dispatch(outq, p)
	}

	running = false

	close(outq)
	close(logq)
	close(inq)
}
