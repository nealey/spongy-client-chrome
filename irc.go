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
)

type Message struct {
	Command string
	FullSender string
	Sender string
	Forum string
	Args []string
	Text string
}

func (m Message) String() string {
	a := append([]string{m.FullSender}, m.Args...)
	args :=strings.Join(a, " ")
	return fmt.Sprintf("%s %s %s %s  %s", m.Command, m.Sender, m.Forum, args, m.Text)
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
		fmt.Println(v)
		fmt.Fprintln(conn, v)
	}
}

func parse(v string) (Message, error) {
	var m Message
	var parts []string
	var lhs string

	fmt.Println(v)
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
	switch (m.Command) {
	case "PRIVMSG", "NOTICE":
		n, u, _ := nuhost(parts[1])
		if u == "" {
			m.Forum = m.Sender
		} else {
			m.Forum = n
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
		m.FullSender = parts[1]
		m.Forum = m.FullSender
	}
		
	return m, nil
}

func dispatch(outq chan<- string, m Message) {
	log.Print(m.String())
	switch (m.Command) {
	case "PING":
		outq <- "PONG :" + m.Text
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "Usage: %s [OPTIONS] HOST:PORT\n", os.Args[0])
	flag.PrintDefaults()
}

func main() {
	dotls := flag.Bool("notls", true, "Disable TLS security")

	flag.Parse()
	if flag.NArg() != 1 {
		fmt.Fprintln(os.Stderr, "Error: must specify host")
		os.Exit(69)
	}

	conn, err := connect(flag.Arg(0), *dotls)
	if err != nil {
		log.Fatal(err)
	}

	inq := make(chan string)
	outq := make(chan string)
	go readLoop(conn, inq)
	go writeLoop(conn, outq)

	outq <- "NICK neale"
	outq <- "USER neale neale neale :neale"
	for v := range inq {
		p, err := parse(v)
		if err != nil {
			continue
		}
		dispatch(outq, p)
	}

	close(outq)
}
